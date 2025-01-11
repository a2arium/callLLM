import { LLMProvider } from '../../interfaces/LLMProvider';
import { OpenAIAdapter } from '../../adapters/openai/OpenAIAdapter';
import { SupportedProviders } from '../types';

export class ProviderManager {
    private provider: LLMProvider;

    constructor(providerName: SupportedProviders, apiKey?: string) {
        this.provider = this.createProvider(providerName, apiKey);
    }

    private createProvider(providerName: SupportedProviders, apiKey?: string): LLMProvider {
        switch (providerName) {
            case 'openai':
                return new OpenAIAdapter(apiKey);
            default:
                throw new Error(`Provider ${providerName} is not supported yet`);
        }
    }

    public getProvider(): LLMProvider {
        return this.provider;
    }

    public switchProvider(providerName: SupportedProviders, apiKey?: string): void {
        this.provider = this.createProvider(providerName, apiKey);
    }

    public getCurrentProviderName(): SupportedProviders {
        if (this.provider instanceof OpenAIAdapter) {
            return 'openai';
        }
        // Add other provider checks when implemented
        throw new Error('Unknown provider type');
    }
}

export { SupportedProviders }; 