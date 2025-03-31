import { ModelInfo } from '../../interfaces/UniversalInterfaces';

export const defaultModels: ModelInfo[] = [
    {
        name: 'gpt-4o',
        maxRequestTokens: 128000,
        maxResponseTokens: 4096,
        inputPricePerMillion: 5.0,
        outputPricePerMillion: 15.0,
        capabilities: {
            streaming: true,
            toolCalls: true,
            parallelToolCalls: true,
            jsonMode: true,
            systemMessages: true,
            temperature: true,
        },
        characteristics: {
            qualityIndex: 95,
            outputSpeed: 30,
            firstTokenLatency: 500,
        },
    },
    {
        name: "gpt-4o-mini",
        inputPricePerMillion: 0.15,
        inputCachedPricePerMillion: 0.075,
        outputPricePerMillion: 0.60,
        maxRequestTokens: 128000,
        maxResponseTokens: 16384,
        tokenizationModel: "gpt-4",
        characteristics: {
            qualityIndex: 73,
            outputSpeed: 183.8,
            firstTokenLatency: 730 // latency in ms
        },
        capabilities: {
            toolCalls: true,
            jsonMode: true,
        }
    },
    {
        name: 'o1-preview',
        maxRequestTokens: 128000,
        maxResponseTokens: 4096,
        inputPricePerMillion: 15.0,
        outputPricePerMillion: 75.0,
        capabilities: {
            streaming: true,
            toolCalls: true,
            parallelToolCalls: true,
            jsonMode: true,
            systemMessages: true,
            temperature: true,
        },
        characteristics: {
            qualityIndex: 98,
            outputSpeed: 25,
            firstTokenLatency: 600,
        },
    },
    {
        name: 'o1-mini',
        maxRequestTokens: 128000,
        maxResponseTokens: 4096,
        inputPricePerMillion: 5.0,
        outputPricePerMillion: 25.0,
        capabilities: {
            streaming: true,
            toolCalls: true,
            parallelToolCalls: true,
            jsonMode: true,
            systemMessages: true,
            temperature: true,
        },
        characteristics: {
            qualityIndex: 90,
            outputSpeed: 40,
            firstTokenLatency: 450,
        },
    },
]; 