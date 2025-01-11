import { ModelInfo } from '../../interfaces/UniversalInterfaces';

export const mockModels: ModelInfo[] = [
    {
        name: "mock-model-1",
        inputPricePerMillion: 30.0,
        outputPricePerMillion: 60.0,
        maxRequestTokens: 8192,
        maxResponseTokens: 4096,
        tokenizationModel: "mock-tokenizer",
        jsonMode: true,
        characteristics: {
            qualityIndex: 95,
            outputSpeed: 15,
            firstTokenLatency: 2000
        }
    },
    {
        name: "mock-model-2",
        inputPricePerMillion: 15.0,
        outputPricePerMillion: 30.0,
        maxRequestTokens: 16384,
        maxResponseTokens: 8192,
        tokenizationModel: "mock-tokenizer",
        jsonMode: true,
        characteristics: {
            qualityIndex: 85,
            outputSpeed: 25,
            firstTokenLatency: 1000
        }
    },
    {
        name: "mock-model-3",
        inputPricePerMillion: 45.0,
        outputPricePerMillion: 90.0,
        maxRequestTokens: 32768,
        maxResponseTokens: 16384,
        tokenizationModel: "mock-tokenizer",
        jsonMode: true,
        characteristics: {
            qualityIndex: 100,
            outputSpeed: 10,
            firstTokenLatency: 2500
        }
    },
    {
        name: "edge-case-model",
        inputPricePerMillion: 5.0,
        outputPricePerMillion: 10.0,
        maxRequestTokens: 4096,
        maxResponseTokens: 2048,
        tokenizationModel: "mock-tokenizer",
        jsonMode: true,
        characteristics: {
            qualityIndex: 65,
            outputSpeed: 150,
            firstTokenLatency: 100
        }
    }
]; 