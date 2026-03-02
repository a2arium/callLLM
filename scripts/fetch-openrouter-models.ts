import { OpenRouter } from "@openrouter/sdk";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchModels() {
    console.log('Fetching models from OpenRouter...');

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.error('Error: OPENROUTER_API_KEY environment variable is not set.');
        process.exit(1);
    }

    const sdk = new OpenRouter({ apiKey });

    try {
        const response = await sdk.models.list();
        const result = response.data;
        console.log(`Fetched ${result.length} models.`);

        const modelInfos = result.map(m => {
            // pricing is in USD per token. Convert to USD per million tokens.
            const inputPrice = parseFloat(m.pricing.prompt) * 1_000_000;
            const outputPrice = parseFloat(m.pricing.completion) * 1_000_000;

            // Map capabilities
            const supportedParams = m.supportedParameters || [];
            const inputModalities = m.architecture?.inputModalities || [];

            const caps = {
                streaming: true,
                toolCalls: supportedParams.includes('tools'),
                parallelToolCalls: supportedParams.includes('parallel_tool_calls'),
                reasoning: supportedParams.includes('include_reasoning') || supportedParams.includes('reasoning'),
                input: {
                    text: true as const,
                    image: inputModalities.includes('image') ? true : undefined
                },
                output: {
                    text: {
                        textOutputFormats: ['text' as const, supportedParams.includes('response_format') ? 'json' as const : undefined].filter((x): x is 'text' | 'json' => x !== undefined),
                        structuredOutputs: supportedParams.includes('structured_outputs')
                    }
                }
            };

            // Determine uncensored status
            // If top provider is not moderated, we can consider it uncensored/less restricted
            const isUncensored = m.topProvider?.isModerated === false;

            // Map tokenizer
            // OpenRouter doesn't always provide this, but when they do, it's in architecture
            let tokenizer = m.architecture?.tokenizer?.name; // e.g. 'cl100k_base' might be hidden here

            // Map specific pricing if available
            // OpenRouter 'request' pricing is per-request, not usually per-token.
            // Image/Video pricing is often not explicitly separated in standard fields yet,
            // but we'll map what we can finding in public pricing if it exists in future SDK versions
            // For now, we leave image/video pricing undefined unless we find a specific source.

            return {
                name: m.id,
                canonicalSlug: m.canonicalSlug || undefined,
                isUncensored,
                maxRequestTokens: m.contextLength || 0,
                maxResponseTokens: m.topProvider?.maxCompletionTokens || m.perRequestLimits?.completionTokens || 0,
                inputPricePerMillion: inputPrice,
                outputPricePerMillion: outputPrice,
                tokenizationModel: tokenizer,
                // Placeholder for future mapping if OpenRouter adds explicit fields
                imageInputPricePerMillion: undefined,
                imageOutputPricePerMillion: undefined,

                capabilities: caps,
                characteristics: {
                    qualityIndex: 50, // Default baseline
                    outputSpeed: 50,  // Default baseline
                    firstTokenLatency: 1000 // Default baseline
                }
            };
        });

        const outputContent = `import type { ModelInfo } from '../../interfaces/UniversalInterfaces.ts';

/**
 * Automatically generated model list from OpenRouter API.
 * This file is managed by the scripts/fetch-openrouter-models.ts script.
 * Last updated: ${new Date().toISOString()}
 */
export const defaultModels: ModelInfo[] = ${JSON.stringify(modelInfos, null, 4)};
`;

        const outputPath = path.resolve(__dirname, '../src/adapters/openrouter/models.ts');
        fs.writeFileSync(outputPath, outputContent, 'utf8');
        console.log(`Successfully updated ${modelInfos.length} models in: ${outputPath}`);

    } catch (error) {
        console.error('Failed to fetch models:', error);
        process.exit(1);
    }
}

fetchModels();
