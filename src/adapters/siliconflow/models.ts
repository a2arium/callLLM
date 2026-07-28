import type { ModelInfo } from '../../interfaces/UniversalInterfaces.ts';

export const defaultModels: ModelInfo[] = [
    {
        name: 'deepseek-ai/DeepSeek-V3.2',
        canonicalSlug: 'deepseek-v3.2',
        inputPricePerMillion: 0.27,
        inputCachedPricePerMillion: 0.135,
        outputPricePerMillion: 0.42,
        maxRequestTokens: 163840,
        maxResponseTokens: 163840,
        capabilities: {
            streaming: true,
            toolCalls: { nonStreaming: true, streamingMode: 'deltas', parallel: false },
            parallelToolCalls: false,
            batchProcessing: false,
            reasoning: true,
            input: { text: true },
            output: {
                text: {
                    textOutputFormats: ['text', 'json'],
                    structuredOutputs: false
                }
            }
        },
        characteristics: {
            qualityIndex: 92,
            outputSpeed: 45,
            firstTokenLatency: 550
        }
    },
    {
        name: 'Qwen/Qwen3-Coder-30B-A3B-Instruct',
        canonicalSlug: 'qwen3-coder-30b-a3b-instruct',
        inputPricePerMillion: 0.07,
        outputPricePerMillion: 0.28,
        maxRequestTokens: 131072,
        maxResponseTokens: 8192,
        capabilities: {
            streaming: true,
            toolCalls: { nonStreaming: true, streamingMode: 'deltas', parallel: false },
            parallelToolCalls: false,
            batchProcessing: false,
            reasoning: false,
            input: { text: true },
            output: {
                text: {
                    textOutputFormats: ['text', 'json'],
                    structuredOutputs: false
                }
            }
        },
        characteristics: {
            qualityIndex: 84,
            outputSpeed: 75,
            firstTokenLatency: 400
        }
    },
    {
        name: 'Qwen/Qwen3-14B',
        canonicalSlug: 'qwen3-14b',
        inputPricePerMillion: 0.07,
        outputPricePerMillion: 0.28,
        maxRequestTokens: 131072,
        maxResponseTokens: 8192,
        capabilities: {
            streaming: true,
            toolCalls: { nonStreaming: true, streamingMode: 'deltas', parallel: false },
            parallelToolCalls: false,
            batchProcessing: false,
            reasoning: true,
            input: { text: true },
            output: {
                text: {
                    textOutputFormats: ['text', 'json'],
                    structuredOutputs: false
                }
            }
        },
        characteristics: {
            qualityIndex: 78,
            outputSpeed: 90,
            firstTokenLatency: 350
        }
    },
    {
        name: 'openai/gpt-oss-120b',
        canonicalSlug: 'gpt-oss-120b',
        inputPricePerMillion: 0.05,
        outputPricePerMillion: 0.45,
        maxRequestTokens: 131072,
        maxResponseTokens: 8192,
        capabilities: {
            streaming: true,
            toolCalls: { nonStreaming: true, streamingMode: 'deltas', parallel: true },
            parallelToolCalls: true,
            batchProcessing: false,
            reasoning: true,
            input: { text: true },
            output: {
                text: {
                    textOutputFormats: ['text', 'json'],
                    structuredOutputs: false
                }
            }
        },
        characteristics: {
            qualityIndex: 86,
            outputSpeed: 55,
            firstTokenLatency: 500
        }
    },
    {
        name: 'Qwen/Qwen3-Reranker-0.6B',
        canonicalSlug: 'qwen3-reranker-0.6b',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0,
        rerankPricing: { unit: 'token', price: 0.01, per: 1_000_000 },
        maxRequestTokens: 32768,
        maxResponseTokens: 0,
        capabilities: {
            streaming: false,
            reranking: { documentTypes: ['text'], maxTotalTokens: 32768 },
            input: { text: true },
            output: { text: false }
        },
        characteristics: { qualityIndex: 75, outputSpeed: 0, firstTokenLatency: 0 }
    },
    {
        name: 'Qwen/Qwen3-Reranker-4B',
        canonicalSlug: 'qwen3-reranker-4b',
        inputPricePerMillion: 0.02,
        outputPricePerMillion: 0,
        rerankPricing: { unit: 'token', price: 0.02, per: 1_000_000 },
        maxRequestTokens: 32768,
        maxResponseTokens: 0,
        capabilities: {
            streaming: false,
            reranking: { documentTypes: ['text'], maxTotalTokens: 32768 },
            input: { text: true },
            output: { text: false }
        },
        characteristics: { qualityIndex: 86, outputSpeed: 0, firstTokenLatency: 0 }
    },
    {
        name: 'Qwen/Qwen3-Reranker-8B',
        canonicalSlug: 'qwen3-reranker-8b',
        inputPricePerMillion: 0.04,
        outputPricePerMillion: 0,
        rerankPricing: { unit: 'token', price: 0.04, per: 1_000_000 },
        maxRequestTokens: 32768,
        maxResponseTokens: 0,
        capabilities: {
            streaming: false,
            reranking: { documentTypes: ['text'], maxTotalTokens: 32768 },
            input: { text: true },
            output: { text: false }
        },
        characteristics: { qualityIndex: 93, outputSpeed: 0, firstTokenLatency: 0 }
    }
];
