import type { ModelInfo } from '../../interfaces/UniversalInterfaces.ts';

export const defaultModels: ModelInfo[] = [
    {
        name: 'gpt-oss-120b',
        inputPricePerMillion: 0.35,
        outputPricePerMillion: 0.75,
        maxRequestTokens: 131000,
        maxResponseTokens: 8000,
        capabilities: {
            streaming: true,
            toolCalls: { nonStreaming: true, streamingMode: 'none', parallel: false },
            parallelToolCalls: false,
            batchProcessing: false,
            reasoning: true,
            input: { text: true },
            output: { text: { textOutputFormats: ['text', 'json'] } },
        },
        characteristics: {
            qualityIndex: 85,
            outputSpeed: 3000,
            firstTokenLatency: 200
        }
    },
    {
        name: 'llama-4-scout-17b-16e-instruct',
        inputPricePerMillion: 0.65,
        outputPricePerMillion: 0.85,
        maxRequestTokens: 32000,
        maxResponseTokens: 8000,
        capabilities: {
            streaming: true,
            toolCalls: { nonStreaming: true, streamingMode: 'none', parallel: true },
            parallelToolCalls: true,
            batchProcessing: false,
            reasoning: false,
            input: { text: true },
            output: { text: { textOutputFormats: ['text', 'json'] } },
        },
        characteristics: {
            qualityIndex: 70,
            outputSpeed: 2600,
            firstTokenLatency: 220
        }
    },
    {
        name: 'llama3.1-8b',
        inputPricePerMillion: 0.10,
        outputPricePerMillion: 0.10,
        maxRequestTokens: 32000,
        maxResponseTokens: 8000,
        capabilities: {
            streaming: true,
            toolCalls: { nonStreaming: true, streamingMode: 'none', parallel: false },
            parallelToolCalls: false,
            batchProcessing: false,
            reasoning: false,
            input: { text: true },
            output: { text: { textOutputFormats: ['text', 'json'] } },
        },
        characteristics: {
            qualityIndex: 60,
            outputSpeed: 2200,
            firstTokenLatency: 220
        }
    },
    {
        name: 'llama-3.3-70b',
        inputPricePerMillion: 0.85,
        outputPricePerMillion: 1.20,
        maxRequestTokens: 128000,
        maxResponseTokens: 8000,
        capabilities: {
            streaming: true,
            toolCalls: { nonStreaming: true, streamingMode: 'none', parallel: true },
            parallelToolCalls: true,
            batchProcessing: false,
            reasoning: false,
            input: { text: true },
            output: { text: { textOutputFormats: ['text', 'json'] } },
        },
        characteristics: {
            qualityIndex: 80,
            outputSpeed: 2100,
            firstTokenLatency: 230
        }
    },
    {
        name: 'qwen-3-32b',
        inputPricePerMillion: 0.40,
        outputPricePerMillion: 0.80,
        maxRequestTokens: 128000,
        maxResponseTokens: 8000,
        capabilities: {
            streaming: true,
            toolCalls: { nonStreaming: true, streamingMode: 'none', parallel: false },
            parallelToolCalls: false,
            batchProcessing: false,
            reasoning: true,
            input: { text: true },
            output: { text: { textOutputFormats: ['text', 'json'] } },
        },
        characteristics: {
            qualityIndex: 78,
            outputSpeed: 2600,
            firstTokenLatency: 220
        }
    },
    {
        name: 'qwen-3-235b-a22b-instruct-2507',
        inputPricePerMillion: 0.60,
        outputPricePerMillion: 1.20,
        maxRequestTokens: 131000,
        maxResponseTokens: 8000,
        capabilities: {
            streaming: true,
            toolCalls: { nonStreaming: true, streamingMode: 'none', parallel: false },
            parallelToolCalls: false,
            batchProcessing: false,
            reasoning: false,
            input: { text: true },
            output: { text: { textOutputFormats: ['text', 'json'] } },
        },
        characteristics: {
            qualityIndex: 86,
            outputSpeed: 1400,
            firstTokenLatency: 260
        }
    },
    {
        name: 'qwen-3-235b-a22b-thinking-2507',
        inputPricePerMillion: 0.60,
        outputPricePerMillion: 2.90,
        maxRequestTokens: 128000,
        maxResponseTokens: 64000,
        capabilities: {
            streaming: true,
            toolCalls: { nonStreaming: true, streamingMode: 'none', parallel: false },
            parallelToolCalls: false,
            batchProcessing: false,
            reasoning: true,
            input: { text: true },
            output: { text: { textOutputFormats: ['text', 'json'] } },
        },
        characteristics: {
            qualityIndex: 90,
            outputSpeed: 1700,
            firstTokenLatency: 280
        }
    },
    {
        name: 'qwen-3-coder-480b',
        inputPricePerMillion: 2.00,
        outputPricePerMillion: 2.00,
        maxRequestTokens: 128000,
        maxResponseTokens: 8000,
        capabilities: {
            streaming: true,
            toolCalls: { nonStreaming: true, streamingMode: 'onComplete', parallel: true },
            parallelToolCalls: true,
            batchProcessing: false,
            reasoning: false,
            input: { text: true },
            output: { text: { textOutputFormats: ['text', 'json'] } },
        },
        characteristics: {
            qualityIndex: 88,
            outputSpeed: 2000,
            firstTokenLatency: 260
        }
    },
];


