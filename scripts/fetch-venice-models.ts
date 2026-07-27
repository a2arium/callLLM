import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import type { ModelCapabilities, ModelInfo } from '../src/interfaces/UniversalInterfaces.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://api.venice.ai/api/v1';
const MODEL_TYPES = ['text', 'image', 'embedding'] as const;
type VeniceModelType = (typeof MODEL_TYPES)[number];

type UsdPrice = { usd?: number; diem?: number };

type VenicePricing = {
    input?: UsdPrice;
    output?: UsdPrice;
    cache_input?: UsdPrice;
    /** Flat per-image generation price */
    generation?: UsdPrice;
    per_image?: UsdPrice;
    image?: UsdPrice;
    /** Resolution-tiered per-image prices, e.g. { "1K": { usd }, "2K": { usd } } */
    resolutions?: Record<string, UsdPrice>;
};

function imagePricePerImage(pricing: VenicePricing): number | undefined {
    const flat = usd(pricing.generation) ?? usd(pricing.per_image) ?? usd(pricing.image);
    if (flat !== undefined) return flat;

    const resolutions = pricing.resolutions;
    if (!resolutions) return undefined;

    // Prefer 1K / default tier, otherwise the cheapest listed resolution.
    const preferred = usd(resolutions['1K']) ?? usd(resolutions['default']);
    if (preferred !== undefined) return preferred;

    const prices = Object.values(resolutions)
        .map(usd)
        .filter((n): n is number => n !== undefined);
    return prices.length ? Math.min(...prices) : undefined;
}

type VeniceCapabilities = {
    supportsFunctionCalling?: boolean;
    supportsVision?: boolean;
    supportsReasoning?: boolean;
    supportsReasoningEffort?: boolean;
    supportsResponseSchema?: boolean;
    supportsAudioInput?: boolean;
    supportsVideoInput?: boolean;
    supportsMultipleImages?: boolean;
    supportsWebSearch?: boolean;
};

type VeniceModelSpec = {
    availableContextTokens?: number;
    maxCompletionTokens?: number;
    maxInputTokens?: number;
    embeddingDimensions?: number | number[];
    supportsCustomDimensions?: boolean;
    name?: string;
    description?: string;
    traits?: string[];
    pricing?: VenicePricing;
    capabilities?: VeniceCapabilities;
    constraints?: Record<string, unknown>;
};

type VeniceModel = {
    id: string;
    type: VeniceModelType | string;
    object?: string;
    owned_by?: string;
    context_length?: number;
    model_spec?: VeniceModelSpec;
};

type VeniceModelsResponse = {
    data: VeniceModel[];
    object?: string;
    type?: string;
};

function usd(price: UsdPrice | undefined): number | undefined {
    if (!price || typeof price.usd !== 'number') return undefined;
    return price.usd;
}

function isUncensored(model: VeniceModel): boolean {
    const id = model.id.toLowerCase();
    const traits = model.model_spec?.traits ?? [];
    return (
        id.includes('uncensored') ||
        traits.includes('most_uncensored') ||
        traits.some(t => t.toLowerCase().includes('uncensored'))
    );
}

function mapTextModel(model: VeniceModel): ModelInfo {
    const spec = model.model_spec ?? {};
    const caps = spec.capabilities ?? {};
    const pricing = spec.pricing ?? {};

    const formats: Array<'text' | 'json'> = caps.supportsResponseSchema
        ? ['text', 'json']
        : ['text'];

    const capabilities: ModelCapabilities = {
        streaming: true,
        toolCalls: Boolean(caps.supportsFunctionCalling),
        reasoning: Boolean(caps.supportsReasoning),
        input: {
            text: true,
            ...(caps.supportsVision ? { image: true as const } : {}),
            ...(caps.supportsAudioInput ? { audio: true as const } : {}),
        },
        output: {
            text: {
                textOutputFormats: formats,
                structuredOutputs: Boolean(caps.supportsResponseSchema),
            },
        },
    };

    const info: ModelInfo = {
        name: model.id,
        isUncensored: isUncensored(model) || undefined,
        maxRequestTokens: model.context_length ?? spec.availableContextTokens ?? 0,
        maxResponseTokens: spec.maxCompletionTokens ?? 0,
        inputPricePerMillion: usd(pricing.input) ?? 0,
        outputPricePerMillion: usd(pricing.output) ?? 0,
        capabilities,
        characteristics: {
            qualityIndex: 50,
            outputSpeed: 50,
            firstTokenLatency: 1000,
        },
    };

    const cached = usd(pricing.cache_input);
    if (cached !== undefined) {
        info.inputCachedPricePerMillion = cached;
    }

    return info;
}

function mapImageModel(model: VeniceModel): ModelInfo {
    const spec = model.model_spec ?? {};
    const pricing = spec.pricing ?? {};
    const perImage = imagePricePerImage(pricing);

    const info: ModelInfo = {
        name: model.id,
        isUncensored: isUncensored(model) || undefined,
        maxRequestTokens: model.context_length ?? spec.availableContextTokens ?? 1000,
        maxResponseTokens: 0,
        inputPricePerMillion: usd(pricing.input) ?? 0,
        outputPricePerMillion: usd(pricing.output) ?? 0,
        capabilities: {
            input: { text: true },
            output: {
                text: false,
                image: { generate: true, size: '1024x1024' },
            },
        },
        characteristics: {
            qualityIndex: 50,
            outputSpeed: 1,
            firstTokenLatency: 5000,
        },
    };

    if (perImage !== undefined) {
        info.imagePricePerImage = perImage;
    }

    return info;
}

function mapEmbeddingModel(model: VeniceModel): ModelInfo {
    const spec = model.model_spec ?? {};
    const pricing = spec.pricing ?? {};
    const maxInput = spec.maxInputTokens ?? model.context_length ?? spec.availableContextTokens ?? 8192;

    let dimensions: number[] | undefined;
    if (typeof spec.embeddingDimensions === 'number') {
        dimensions = [spec.embeddingDimensions];
    } else if (Array.isArray(spec.embeddingDimensions)) {
        dimensions = spec.embeddingDimensions;
    }

    return {
        name: model.id,
        isUncensored: isUncensored(model) || undefined,
        maxRequestTokens: maxInput,
        maxResponseTokens: 0,
        inputPricePerMillion: usd(pricing.input) ?? 0,
        outputPricePerMillion: usd(pricing.output) ?? 0,
        capabilities: {
            embeddings: {
                maxInputLength: maxInput,
                ...(dimensions ? { dimensions } : {}),
                ...(dimensions?.length === 1 ? { defaultDimensions: dimensions[0] } : {}),
            },
            input: { text: true },
            output: { text: false },
        },
        characteristics: {
            qualityIndex: 50,
            outputSpeed: 0,
            firstTokenLatency: 200,
        },
    };
}

function mapModel(model: VeniceModel): ModelInfo {
    switch (model.type) {
        case 'image':
            return mapImageModel(model);
        case 'embedding':
            return mapEmbeddingModel(model);
        case 'text':
        default:
            return mapTextModel(model);
    }
}

async function fetchModelsByType(apiKey: string, type: VeniceModelType): Promise<VeniceModel[]> {
    const url = `${BASE_URL}/models?type=${type}`;
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Venice models?type=${type} failed: ${response.status} ${response.statusText}\n${body}`);
    }

    const json = (await response.json()) as VeniceModelsResponse;
    return (json.data ?? []).map(m => ({ ...m, type: m.type || type }));
}

async function main() {
    const dryRun = process.argv.includes('--dry-run');
    const apiKey = process.env.VENICE_API_KEY;

    if (!apiKey) {
        console.error('Error: VENICE_API_KEY environment variable is not set.');
        process.exit(1);
    }

    console.log('Fetching models from Venice...');

    const byType: Record<VeniceModelType, VeniceModel[]> = {
        text: [],
        image: [],
        embedding: [],
    };

    for (const type of MODEL_TYPES) {
        const models = await fetchModelsByType(apiKey, type);
        byType[type] = models;
        console.log(`  ${type}: ${models.length}`);
    }

    const all = MODEL_TYPES.flatMap(t => byType[t]);
    console.log(`Fetched ${all.length} models total.`);

    const modelInfos = all.map(mapModel);

    if (dryRun) {
        console.log('--dry-run: skipping write');
        console.log('Sample:', JSON.stringify(modelInfos.slice(0, 2), null, 2));
        return;
    }

    const outputContent = `import type { ModelInfo } from '../../interfaces/UniversalInterfaces.ts';

/**
 * Automatically generated model list from Venice API.
 * This file is managed by the scripts/fetch-venice-models.ts script.
 * Last updated: ${new Date().toISOString()}
 */
export const defaultModels: ModelInfo[] = ${JSON.stringify(modelInfos, null, 4)};
`;

    const outputPath = path.resolve(__dirname, '../src/adapters/venice/models.ts');
    fs.writeFileSync(outputPath, outputContent, 'utf8');
    console.log(`Successfully updated ${modelInfos.length} models in: ${outputPath}`);
}

main().catch(error => {
    console.error('Failed to fetch models:', error);
    process.exit(1);
});
