import type { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse, EmbeddingParams, EmbeddingResponse } from '../../interfaces/UniversalInterfaces.ts';
import type { LLMProvider } from '../../interfaces/LLMProvider.ts';

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

    /**
     * Optional embedding support. Providers that support embeddings should implement this.
     */
    embeddingCall?(model: string, params: EmbeddingParams): Promise<EmbeddingResponse>;

    /**
     * Convert embedding parameters to provider-specific format.
     * Should be implemented by providers that support embeddings.
     */
    convertToProviderEmbeddingParams?(model: string, params: EmbeddingParams): unknown;

    /**
     * Convert provider embedding response to universal format.
     * Should be implemented by providers that support embeddings.
     */
    convertFromProviderEmbeddingResponse?(response: unknown): EmbeddingResponse;

    protected validateConfig(config: AdapterConfig): void {
        if (!config.apiKey) {
            throw new AdapterError('API key is required');
        }
    }
} 