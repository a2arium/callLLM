import { LLMProvider } from '../../interfaces/LLMProvider';
import { OpenAIAdapter } from '../../adapters/openai-completion/adapter';
import { OpenAIResponseAdapter } from '../../adapters/openai/adapter';
import { SupportedProviders } from '../types';
import { AdapterConfig } from '../../adapters/base/baseAdapter';

export class ProviderManager {
    private provider: LLMProvider;

    constructor(providerName: SupportedProviders, apiKey?: string) {
        this.provider = this.createProvider(providerName, apiKey);
    }

    private createProvider(providerName: SupportedProviders, apiKey?: string): LLMProvider {
        const config: Partial<AdapterConfig> = apiKey ? { apiKey } : {};

        switch (providerName) {
            case 'openai-completion':
                return new OpenAIAdapter(config);
            case 'openai':
                return new OpenAIResponseAdapter(config);
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
            return 'openai-completion';
        } else if (this.provider instanceof OpenAIResponseAdapter) {
            return 'openai';
        }
        // Add other provider checks when implemented
        throw new Error('Unknown provider type');
    }
}

export { SupportedProviders }; 