import type { ModelInfo } from '../../interfaces/UniversalInterfaces.ts';

/**
 * Venice Model Collection
 * Based on API data as of Feb 2026.
 */
export const defaultModels: ModelInfo[] = [
    // --- TEXT & REASONING MODELS ---
    {
        name: 'venice-uncensored',
        maxRequestTokens: 32768,
        maxResponseTokens: 4096,
        inputPricePerMillion: 0.20,
        outputPricePerMillion: 0.90,
        capabilities: {
            streaming: true,
            toolCalls: true,
            input: { text: true },
            output: { text: { textOutputFormats: ['text', 'json'], structuredOutputs: false } }
        },
        characteristics: { qualityIndex: 65, outputSpeed: 80, firstTokenLatency: 800 },
    },
    {
        name: 'claude-opus-4-6',
        maxRequestTokens: 1000000,
        maxResponseTokens: 128000,
        inputPricePerMillion: 6.00,
        outputPricePerMillion: 30.00,
        capabilities: {
            streaming: true,
            toolCalls: true,
            parallelToolCalls: true,
            input: { text: true, image: true },
            output: { text: { textOutputFormats: ['text', 'json'], structuredOutputs: false } }
        },
        characteristics: { qualityIndex: 98, outputSpeed: 40, firstTokenLatency: 2000 },
    },
    {
        name: 'claude-sonnet-45',
        maxRequestTokens: 198000,
        maxResponseTokens: 32000,
        inputPricePerMillion: 3.75,
        outputPricePerMillion: 18.75,
        capabilities: {
            streaming: true,
            toolCalls: true,
            parallelToolCalls: true,
            input: { text: true, image: true },
            output: { text: { textOutputFormats: ['text', 'json'], structuredOutputs: false } }
        },
        characteristics: { qualityIndex: 90, outputSpeed: 60, firstTokenLatency: 1200 },
    },
    {
        name: 'openai-gpt-52',
        maxRequestTokens: 256000,
        maxResponseTokens: 128000,
        inputPricePerMillion: 2.19,
        outputPricePerMillion: 17.50,
        capabilities: {
            streaming: true,
            toolCalls: true,
            parallelToolCalls: true,
            reasoning: true,
            input: { text: true, image: true },
            output: { text: { textOutputFormats: ['text', 'json'], structuredOutputs: false } }
        },
        characteristics: { qualityIndex: 95, outputSpeed: 50, firstTokenLatency: 1500 },
    },
    {
        name: 'deepseek-v3.2',
        maxRequestTokens: 160000,
        maxResponseTokens: 8192,
        inputPricePerMillion: 0.40,
        outputPricePerMillion: 1.00,
        capabilities: {
            streaming: true,
            toolCalls: true,
            reasoning: true,
            input: { text: true },
            output: { text: { textOutputFormats: ['text'], structuredOutputs: false } }
        },
        characteristics: { qualityIndex: 85, outputSpeed: 120, firstTokenLatency: 600 },
    },
    {
        name: 'kimi-k2-thinking',
        maxRequestTokens: 256000,
        maxResponseTokens: 32000,
        inputPricePerMillion: 0.75,
        outputPricePerMillion: 3.20,
        capabilities: {
            streaming: true,
            toolCalls: true,
            reasoning: true,
            input: { text: true },
            output: { text: { textOutputFormats: ['text', 'json'], structuredOutputs: false } }
        },
        characteristics: { qualityIndex: 88, outputSpeed: 30, firstTokenLatency: 2500 },
    },
    {
        name: 'qwen3-235b-a22b-thinking-2507',
        maxRequestTokens: 128000,
        maxResponseTokens: 32000,
        inputPricePerMillion: 0.45,
        outputPricePerMillion: 3.50,
        capabilities: {
            streaming: true,
            toolCalls: true,
            reasoning: true,
            input: { text: true },
            output: { text: { textOutputFormats: ['text', 'json'], structuredOutputs: false } }
        },
        characteristics: { qualityIndex: 90, outputSpeed: 35, firstTokenLatency: 2000 },
    },
    {
        name: 'qwen3-coder-480b-a35b-instruct',
        maxRequestTokens: 256000,
        maxResponseTokens: 32000,
        inputPricePerMillion: 0.75,
        outputPricePerMillion: 3.00,
        capabilities: {
            streaming: true,
            toolCalls: true,
            input: { text: true },
            output: { text: { textOutputFormats: ['text', 'json'], structuredOutputs: false } }
        },
        characteristics: { qualityIndex: 92, outputSpeed: 45, firstTokenLatency: 1800 },
    },
    {
        name: 'llama-3.3-70b',
        maxRequestTokens: 128000,
        maxResponseTokens: 8192,
        inputPricePerMillion: 0.70,
        outputPricePerMillion: 2.80,
        capabilities: {
            streaming: true,
            toolCalls: true,
            input: { text: true },
            output: { text: { textOutputFormats: ['text'], structuredOutputs: false } }
        },
        characteristics: { qualityIndex: 75, outputSpeed: 60, firstTokenLatency: 1000 },
    },
    {
        name: 'zai-org-glm-4.7',
        maxRequestTokens: 198000,
        maxResponseTokens: 32000,
        inputPricePerMillion: 0.55,
        outputPricePerMillion: 2.65,
        capabilities: {
            streaming: true,
            toolCalls: true,
            input: { text: true, image: true },
            output: { text: { textOutputFormats: ['text', 'json'], structuredOutputs: false } }
        },
        characteristics: { qualityIndex: 82, outputSpeed: 80, firstTokenLatency: 900 },
    },
    {
        name: 'zai-org-glm-4.7-flash',
        maxRequestTokens: 128000,
        maxResponseTokens: 8192,
        inputPricePerMillion: 0.13,
        outputPricePerMillion: 0.50,
        capabilities: {
            streaming: true,
            toolCalls: true,
            input: { text: true, image: true },
            output: { text: { textOutputFormats: ['text'], structuredOutputs: false } }
        },
        characteristics: { qualityIndex: 78, outputSpeed: 150, firstTokenLatency: 400 },
    },
    {
        name: 'mistral-31-24b',
        maxRequestTokens: 128000,
        maxResponseTokens: 8192,
        inputPricePerMillion: 0.50,
        outputPricePerMillion: 2.00,
        capabilities: {
            streaming: true,
            toolCalls: true,
            input: { text: true },
            output: { text: { textOutputFormats: ['text', 'json'], structuredOutputs: false } }
        },
        characteristics: { qualityIndex: 72, outputSpeed: 100, firstTokenLatency: 600 },
    },
    {
        name: 'qwen3-4b',
        maxRequestTokens: 32000,
        maxResponseTokens: 4096,
        inputPricePerMillion: 0.05,
        outputPricePerMillion: 0.15,
        capabilities: {
            streaming: true,
            toolCalls: true,
            input: { text: true },
            output: { text: { textOutputFormats: ['text', 'json'], structuredOutputs: false } }
        },
        characteristics: { qualityIndex: 50, outputSpeed: 200, firstTokenLatency: 300 },
    },
    {
        name: 'grok-41-fast',
        maxRequestTokens: 256000,
        maxResponseTokens: 16384,
        inputPricePerMillion: 0.50,
        outputPricePerMillion: 1.25,
        capabilities: {
            streaming: true,
            toolCalls: true,
            input: { text: true },
            output: { text: { textOutputFormats: ['text', 'json'], structuredOutputs: false } }
        },
        characteristics: { qualityIndex: 85, outputSpeed: 140, firstTokenLatency: 500 },
    },

    // --- VISION & MULTIMODAL ---
    {
        name: 'qwen3-vl-235b-a22b',
        maxRequestTokens: 256000,
        maxResponseTokens: 32000,
        inputPricePerMillion: 0.25,
        outputPricePerMillion: 1.50,
        capabilities: {
            streaming: true,
            toolCalls: true,
            input: { text: true, image: true },
            output: { text: { textOutputFormats: ['text', 'json'], structuredOutputs: false } }
        },
        characteristics: { qualityIndex: 88, outputSpeed: 70, firstTokenLatency: 1000 },
    },

    // --- IMAGE GENERATION MODELS ---
    // Note: These models represent single-turn image generation. 
    // They are listed here for manager awareness/pricing, though usually invoked via separate logic if using Responses API.
    {
        name: 'venice-sd35',
        maxRequestTokens: 1000,
        maxResponseTokens: 0,
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        capabilities: {
            input: { text: true },
            output: {
                text: false,
                image: { generate: true, size: '1024x1024' }
            }
        },
        characteristics: { qualityIndex: 70, outputSpeed: 1, firstTokenLatency: 5000 },
    },
    {
        name: 'flux-2-pro',
        maxRequestTokens: 1000,
        maxResponseTokens: 0,
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        capabilities: {
            input: { text: true },
            output: {
                text: false,
                image: { generate: true, size: '1024x1024' }
            }
        },
        characteristics: { qualityIndex: 90, outputSpeed: 1, firstTokenLatency: 8000 },
    },
    {
        name: 'z-image-turbo',
        maxRequestTokens: 1000,
        maxResponseTokens: 0,
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        capabilities: {
            input: { text: true },
            output: {
                text: false,
                image: { generate: true, size: '1024x1024' }
            }
        },
        characteristics: { qualityIndex: 60, outputSpeed: 1, firstTokenLatency: 2000 },
    },

    // --- EMBEDDING MODELS ---
    {
        name: 'text-embedding-bge-m3',
        maxRequestTokens: 8192,
        maxResponseTokens: 0,
        inputPricePerMillion: 0.15,
        outputPricePerMillion: 0.60,
        capabilities: {
            embeddings: { maxInputLength: 8192, dimensions: [1024] },
            input: { text: true },
            output: { text: false }
        },
        characteristics: { qualityIndex: 80, outputSpeed: 0, firstTokenLatency: 200 },
    }
];
