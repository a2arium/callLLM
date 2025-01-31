import { ModelInfo } from '../../interfaces/UniversalInterfaces';

export const defaultModels: ModelInfo[] = [
    {
        name: "gpt-4o",
        inputPricePerMillion: 2.5,
        inputCachedPricePerMillion: 1.25,
        outputPricePerMillion: 10.0,
        maxRequestTokens: 128000,
        maxResponseTokens: 16384,
        tokenizationModel: "gpt-4",
        characteristics: {
            qualityIndex: 78,
            outputSpeed: 109.3,
            firstTokenLatency: 720 // latency in ms
        },
        capabilities: {
            toolCalls: true,
            parallelToolCalls: true,
            batchProcessing: true,
            jsonMode: true
        }
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
            parallelToolCalls: true,
            batchProcessing: true,
            jsonMode: true
        }
    },
    {
        name: "o1",
        inputPricePerMillion: 15.00,
        inputCachedPricePerMillion: 7.50,
        outputPricePerMillion: 60.00,
        maxRequestTokens: 200000,
        maxResponseTokens: 100000,
        tokenizationModel: "gpt-4",
        characteristics: {
            qualityIndex: 85,
            outputSpeed: 151.2,
            firstTokenLatency: 22490 // latency in ms
        },
        capabilities: {
            streaming: true,
            toolCalls: false,
            parallelToolCalls: false,
            batchProcessing: false,
            systemMessages: false,
            temperature: false,
            jsonMode: true
        }
    },
    {
        name: "o1-mini",
        inputPricePerMillion: 3.00,
        inputCachedPricePerMillion: 1.50,
        outputPricePerMillion: 12.00,
        maxRequestTokens: 128000,
        maxResponseTokens: 65536,
        tokenizationModel: "gpt-4",
        characteristics: {
            qualityIndex: 82,
            outputSpeed: 212.1,
            firstTokenLatency: 10890 // latency in ms
        },
        capabilities: {
            streaming: true,
            toolCalls: false,
            parallelToolCalls: false,
            batchProcessing: false,
            systemMessages: false,
            temperature: false,
            jsonMode: true
        }
    }
];