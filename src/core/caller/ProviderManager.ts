import type { LLMProvider, LLMProviderImage, ImageOp, ImageCallParams } from '../../interfaces/LLMProvider.ts';
import type { AdapterConfig } from '../../adapters/base/baseAdapter.ts';
import { adapterRegistry, type RegisteredProviders } from '../../adapters/index.ts';
import { ProviderNotFoundError } from '../../adapters/types.ts';
import type { UniversalChatResponse } from '../../interfaces/UniversalInterfaces.ts';

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

    public switchProvider(providerName: RegisteredProviders, apiKey?: string): void {
        this.provider = this.createProvider(providerName, apiKey);
        this.currentProviderName = providerName;
    }

    public getCurrentProviderName(): RegisteredProviders {
        return this.currentProviderName as RegisteredProviders;
    }
} 