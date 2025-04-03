import { LLMProvider } from '../../interfaces/LLMProvider';
import { AdapterConfig } from '../../adapters/base/baseAdapter';
import { adapterRegistry, RegisteredProviders } from '../../adapters/index';
import { ProviderNotFoundError } from '../../adapters/types';

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

    public switchProvider(providerName: RegisteredProviders, apiKey?: string): void {
        this.provider = this.createProvider(providerName, apiKey);
        this.currentProviderName = providerName;
    }

    public getCurrentProviderName(): RegisteredProviders {
        return this.currentProviderName as RegisteredProviders;
    }
} 