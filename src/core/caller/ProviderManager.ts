import type { LLMProvider, LLMProviderImage, LLMProviderEmbedding, ImageOp, ImageCallParams } from '../../interfaces/LLMProvider.ts';
import type { AdapterConfig } from '../../adapters/base/baseAdapter.ts';
import { adapterRegistry, type RegisteredProviders } from '../../adapters/index.ts';
import { ProviderNotFoundError } from '../../adapters/types.ts';
import type { UniversalChatResponse, EmbeddingParams, EmbeddingResponse } from '../../interfaces/UniversalInterfaces.ts';

export class ProviderManager {
    private provider: LLMProvider;
    private currentProviderName: string;

    constructor(providerName: RegisteredProviders, apiKey?: string) {
        this.provider = this.createProvider(providerName, apiKey);
        this.currentProviderName = providerName;
    }

    private createProvider(providerName: string, apiKey?: string): LLMProvider {
        const config: Partial<AdapterConfig> = apiKey ? { apiKey } : {};

        const AdapterClass = adapterRegistry.get(providerName);
        if (!AdapterClass) {
            throw new ProviderNotFoundError(providerName);
        }

        return new AdapterClass(config);
    }

    public getProvider(): LLMProvider {
        return this.provider;
    }

    /**
     * Type guard to check if the provider implements the LLMProviderImage interface
     * @returns true if the provider implements LLMProviderImage, false otherwise
     */
    public supportsImageGeneration(): boolean {
        // Check if the provider has the imageCall method
        return 'imageCall' in this.provider;
    }

    /**
     * Attempts to access the image generation capabilities of the current provider
     * @returns The provider cast to LLMProviderImage if it supports image generation, or null if not
     */
    public getImageProvider(): LLMProviderImage | null {
        // Use the type guard to check if the provider implements the LLMProviderImage interface
        if (this.supportsImageGeneration()) {
            return this.provider as unknown as LLMProviderImage;
        }
        return null;
    }

    /**
     * Executes an image operation using the current provider if it supports image generation
     * @param model The model to use for image generation
     * @param op The image operation to perform
     * @param params Parameters for the image operation
     * @returns A Promise resolving to the image generation response
     * @throws Error if the provider doesn't support image generation
     */
    public async callImageOperation(model: string, op: ImageOp, params: ImageCallParams): Promise<UniversalChatResponse> {
        const imageProvider = this.getImageProvider();
        if (!imageProvider) {
            throw new Error(`Provider '${this.currentProviderName}' does not support image generation`);
        }

        return imageProvider.imageCall(model, op, params);
    }

    /**
     * Type guard to check if the provider implements the LLMProviderEmbedding interface
     * @returns true if the provider implements LLMProviderEmbedding, false otherwise
     */
    public supportsEmbeddings(): boolean {
        // Check if the provider has the embeddingCall method
        return 'embeddingCall' in this.provider;
    }

    /**
     * Attempts to access the embedding capabilities of the current provider
     * @returns The provider cast to LLMProviderEmbedding if it supports embeddings, or null if not
     */
    public getEmbeddingProvider(): LLMProviderEmbedding | null {
        // Use the type guard to check if the provider implements the LLMProviderEmbedding interface
        if (this.supportsEmbeddings()) {
            return this.provider as unknown as LLMProviderEmbedding;
        }
        return null;
    }

    /**
     * Executes an embedding operation using the current provider if it supports embeddings
     * @param model The model to use for embedding generation
     * @param params Parameters for the embedding operation
     * @returns A Promise resolving to the embedding response
     * @throws Error if the provider doesn't support embeddings
     */
    public async callEmbeddingOperation(model: string, params: EmbeddingParams): Promise<EmbeddingResponse> {
        const embeddingProvider = this.getEmbeddingProvider();
        if (!embeddingProvider) {
            throw new Error(`Provider '${this.currentProviderName}' does not support embedding generation`);
        }

        return embeddingProvider.embeddingCall(model, params);
    }

    public switchProvider(providerName: RegisteredProviders, apiKey?: string): void {
        this.provider = this.createProvider(providerName, apiKey);
        this.currentProviderName = providerName;
    }

    public getCurrentProviderName(): RegisteredProviders {
        return this.currentProviderName as RegisteredProviders;
    }
} 