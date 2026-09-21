import type { ModelCapabilities, ModelInfo } from '../src/interfaces/UniversalInterfaces.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS_URL = 'https://ai-gateway.vercel.sh/v1/models';

type VercelModelPricing = {
    input?: string;
    output?: string;
    input_cache_read?: string;
    input_cache_write?: string;
    image?: string;
    web_search?: string;
};

type VercelModelType = 'language' | 'embedding' | 'reranking' | 'image' | 'video' | 'evaluation' | string;

type VercelApiModel = {
    id: string;
    object?: string;
    created?: number;
    released?: number;
    owned_by?: string;
    name?: string;
    description?: string;
    context_window?: number;
    max_tokens?: number;
    type?: VercelModelType;
    tags?: string[];
    supported_parameters?: string[];
    pricing?: VercelModelPricing;
};

type VercelModelsResponse = {
    object?: string;
    data: VercelApiModel[];
};

function parsePerTokenPrice(value: string | undefined): number | undefined {
    if (value === undefined || value === '') return undefined;
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return undefined;
    return parsed * 1_000_000;
}

function parseFlatPrice(value: string | undefined): number | undefined {
    if (value === undefined || value === '') return undefined;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function hasTag(tags: string[] | undefined, tag: string): boolean {
    return tags?.includes(tag) === true;
}

function hasParam(params: string[] | undefined, param: string): boolean {
    return params?.includes(param) === true;
}

function mapCapabilities(model: VercelApiModel): ModelCapabilities {
    const tags = model.tags ?? [];
    const params = model.supported_parameters ?? [];
    const type = model.type ?? 'language';

    if (type === 'embedding') {
        return {
            streaming: false,
            toolCalls: false,
            reasoning: false,
            embeddings: true,
            input: { text: true },
            output: { text: false }
        };
    }

    if (type === 'reranking') {
        return {
            streaming: false,
            toolCalls: false,
            reasoning: false,
            reranking: { documentTypes: ['text'] },
            input: { text: true },
            output: { text: false }
        };
    }

    // Gateway marks System One / Jev models as type "evaluation".
    // Also allowlist typesafe-ai/jev* if type is ever omitted from the catalog.
    const isEvaluation = type === 'evaluation'
        || /^typesafe-ai\/jev/i.test(model.id);
    if (isEvaluation) {
        return {
            streaming: false,
            toolCalls: false,
            reasoning: false,
            evaluation: { questionTypes: ['boolean', 'choice', 'score'] },
            input: { text: true },
            output: { text: false }
        };
    }

    if (type === 'image') {
        const supportsMaskedEdit = /^openai\/gpt-image/i.test(model.id);
        return {
            streaming: false,
            toolCalls: false,
            reasoning: false,
            input: { text: true, image: true },
            output: {
                text: false,
                image: {
                    generate: true,
                    edit: true,
                    ...(supportsMaskedEdit ? { editWithMask: true } : {})
                }
            }
        };
    }

    if (type === 'video') {
        return {
            streaming: false,
            toolCalls: false,
            reasoning: false,
            input: { text: true },
            output: {
                text: false,
                video: true
            }
        };
    }

    // Voice / realtime / incomplete catalog entries often have zero token limits.
    // Do not advertise them as selectable chat models.
    const hasUsableContext = (model.context_window ?? 0) > 0 && (model.max_tokens ?? 0) > 0;
    const looksLikeVoice = hasTag(tags, 'voice')
        || hasTag(tags, 'audio')
        || /voice|realtime|speech/i.test(model.id);

    if (!hasUsableContext || looksLikeVoice) {
        return {
            streaming: false,
            toolCalls: false,
            reasoning: false,
            audio: looksLikeVoice || undefined,
            input: { text: true },
            output: { text: false }
        };
    }

    const supportsTools = hasTag(tags, 'tool-use') || hasParam(params, 'tools');
    const supportsReasoning = hasTag(tags, 'reasoning')
        || hasParam(params, 'reasoning')
        || hasParam(params, 'include_reasoning');
    const supportsVision = hasTag(tags, 'vision') || hasTag(tags, 'file-input');
    const supportsStructured = hasParam(params, 'structured_outputs')
        || hasParam(params, 'response_format');
    const supportsJson = supportsStructured || hasParam(params, 'response_format');

    return {
        streaming: true,
        toolCalls: supportsTools,
        parallelToolCalls: hasParam(params, 'parallel_tool_calls'),
        reasoning: supportsReasoning,
        input: {
            text: true,
            image: supportsVision || undefined
        },
        output: {
            text: {
                textOutputFormats: supportsJson ? ['text', 'json'] : ['text'],
                structuredOutputs: supportsStructured
            }
        }
    };
}

function mapModel(model: VercelApiModel): ModelInfo {
    const inputPrice = parsePerTokenPrice(model.pricing?.input) ?? 0;
    const outputPrice = parsePerTokenPrice(model.pricing?.output) ?? 0;
    const cachedPrice = parsePerTokenPrice(model.pricing?.input_cache_read);
    const imagePrice = parseFlatPrice(model.pricing?.image);

    const info: ModelInfo = {
        name: model.id,
        maxRequestTokens: model.context_window ?? 0,
        maxResponseTokens: model.max_tokens ?? 0,
        inputPricePerMillion: inputPrice,
        outputPricePerMillion: outputPrice,
        capabilities: mapCapabilities(model),
        characteristics: {
            qualityIndex: 50,
            outputSpeed: 50,
            firstTokenLatency: 1000
        }
    };

    if (cachedPrice !== undefined) {
        info.inputCachedPricePerMillion = cachedPrice;
    }
    if (imagePrice !== undefined) {
        info.imagePricePerImage = imagePrice;
    }
    if (model.type === 'reranking' && inputPrice > 0) {
        info.rerankPricing = {
            unit: 'token',
            price: inputPrice,
            per: 1_000_000
        };
    }

    // Video/image-only models may have zero token limits; ModelManager allows that
    // when output.video is set and text is not, or for standalone audio. For image
    // models with zero tokens, set a sentinel so validation passes.
    const caps = info.capabilities;
    const isImageOnly = Boolean(caps?.output && typeof caps.output === 'object'
        && caps.output.image
        && !caps.output.text);
    if (isImageOnly && info.maxRequestTokens === 0 && info.maxResponseTokens === 0) {
        info.maxRequestTokens = 1;
        info.maxResponseTokens = 0;
    }

    return info;
}

async function fetchModels(): Promise<void> {
    console.log('Fetching models from Vercel AI Gateway...');

    const headers: Record<string, string> = {
        Accept: 'application/json'
    };
    const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
    if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(MODELS_URL, { headers });
    if (!response.ok) {
        throw new Error(`Failed to fetch Vercel models: HTTP ${response.status} ${response.statusText}`);
    }

    const payload = await response.json() as VercelModelsResponse;
    if (!Array.isArray(payload.data)) {
        throw new Error('Vercel AI Gateway returned an invalid models response');
    }

    console.log(`Fetched ${payload.data.length} models.`);

    const modelInfos = payload.data.map(mapModel);
    const outputContent = `import type { ModelInfo } from '../../interfaces/UniversalInterfaces.ts';

/**
 * Automatically generated model list from Vercel AI Gateway API.
 * This file is managed by the scripts/fetch-vercel-models.ts script.
 * Last updated: ${new Date().toISOString()}
 */
export const defaultModels: ModelInfo[] = ${JSON.stringify(modelInfos, null, 4)};
`;

    const outputPath = path.resolve(__dirname, '../src/adapters/vercel/models.ts');
    fs.writeFileSync(outputPath, outputContent, 'utf8');
    console.log(`Successfully updated ${modelInfos.length} models in: ${outputPath}`);
}

fetchModels().catch(error => {
    console.error('Failed to fetch Vercel models:', error);
    process.exit(1);
});
