import { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse } from '../../interfaces/UniversalInterfaces.js';
import { LLMProvider } from '../../interfaces/LLMProvider.js';

export class AdapterError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AdapterError';
    }
}

export type AdapterConfig = {
    apiKey: string;
    baseUrl?: string;
    organization?: string;
};

export abstract class BaseAdapter implements LLMProvider {
    protected config: AdapterConfig;

    constructor(config: AdapterConfig) {
        this.validateConfig(config);
        this.config = config;
    }

    abstract chatCall(model: string, params: UniversalChatParams): Promise<UniversalChatResponse>;
    abstract streamCall(model: string, params: UniversalChatParams): Promise<AsyncIterable<UniversalStreamResponse>>;
    abstract convertToProviderParams(model: string, params: UniversalChatParams): unknown;
    abstract convertFromProviderResponse(response: unknown): UniversalChatResponse;
    abstract convertFromProviderStreamResponse(response: unknown): UniversalStreamResponse;

    protected validateConfig(config: AdapterConfig): void {
        if (!config.apiKey) {
            throw new AdapterError('API key is required');
        }
    }
} 