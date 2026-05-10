import type { LLMProvider } from '../../interfaces/LLMProvider.ts';
import type { AdapterConfig } from '../../adapters/base/baseAdapter.ts';
import type { AdapterConstructor } from '../../adapters/types.ts';
import { ProviderNotFoundError } from '../../adapters/types.ts';
import { adapterRegistry, type RegisteredProviders } from '../../adapters/index.ts';

export type ProviderInterfaceName =
    | 'chatCall'
    | 'streamCall'
    | 'imageCall'
    | 'videoCall'
    | 'embeddingCall'
    | 'audioCall';

export type ProviderPoolInterfaceSupport = {
    chatCall: boolean;
    streamCall: boolean;
    imageCall: boolean;
    videoCall: boolean;
    embeddingCall: boolean;
    audioCall: boolean;
};

export type ProviderPoolOptions = {
    apiKey?: string;
    providerApiKeys?: Partial<Record<RegisteredProviders, string>>;
    adapterConstructors?: Map<string, AdapterConstructor>;
};

export class ProviderPool {
    private readonly providers = new Map<RegisteredProviders, LLMProvider>();
    private readonly providerScope: RegisteredProviders[];
    private readonly constructors: Map<string, AdapterConstructor>;
    private readonly apiKey?: string;
    private readonly providerApiKeys: Partial<Record<RegisteredProviders, string>>;

    constructor(
        providerScope: RegisteredProviders | RegisteredProviders[],
        options: ProviderPoolOptions = {}
    ) {
        this.constructors = options.adapterConstructors ?? adapterRegistry;
        this.providerScope = this.normalizeProviderScope(providerScope);
        this.apiKey = options.apiKey;
        this.providerApiKeys = options.providerApiKeys ?? {};
    }

    public getProviderScope(): RegisteredProviders[] {
        return [...this.providerScope];
    }

    public getInitializedProviders(): RegisteredProviders[] {
        return Array.from(this.providers.keys());
    }

    public hasProvider(provider: RegisteredProviders): boolean {
        return this.providerScope.includes(provider);
    }

    public getProvider(provider: RegisteredProviders): LLMProvider {
        this.assertProviderInScope(provider);

        const existing = this.providers.get(provider);
        if (existing) {
            return existing;
        }

        const AdapterClass = this.constructors.get(provider);
        if (!AdapterClass) {
            throw new ProviderNotFoundError(provider);
        }

        const instance = new AdapterClass(this.createConfig(provider));
        this.providers.set(provider, instance);
        return instance;
    }

    public supports(provider: RegisteredProviders, interfaceName: ProviderInterfaceName): boolean {
        const providerInstance = this.getProvider(provider) as unknown as Record<string, unknown>;
        return typeof providerInstance[interfaceName] === 'function';
    }

    public getInterfaceSupport(provider: RegisteredProviders): ProviderPoolInterfaceSupport {
        const providerInstance = this.getProvider(provider) as unknown as Record<string, unknown>;
        return {
            chatCall: typeof providerInstance.chatCall === 'function',
            streamCall: typeof providerInstance.streamCall === 'function',
            imageCall: typeof providerInstance.imageCall === 'function',
            videoCall: typeof providerInstance.videoCall === 'function',
            embeddingCall: typeof providerInstance.embeddingCall === 'function',
            audioCall: typeof providerInstance.audioCall === 'function'
        };
    }

    public clear(): void {
        this.providers.clear();
    }

    private normalizeProviderScope(providerScope: RegisteredProviders | RegisteredProviders[]): RegisteredProviders[] {
        const providers = Array.isArray(providerScope) ? providerScope : [providerScope];
        if (providers.length === 0) {
            throw new ProviderNotFoundError('');
        }

        const normalized: RegisteredProviders[] = [];
        for (const provider of providers) {
            if (!this.constructors.has(provider)) {
                throw new ProviderNotFoundError(provider);
            }
            if (!normalized.includes(provider)) {
                normalized.push(provider);
            }
        }
        return normalized;
    }

    private assertProviderInScope(provider: RegisteredProviders): void {
        if (!this.providerScope.includes(provider)) {
            throw new ProviderNotFoundError(provider);
        }
    }

    private createConfig(provider: RegisteredProviders): Partial<AdapterConfig> {
        const apiKey = this.providerApiKeys[provider] ?? this.apiKey;
        return apiKey ? { apiKey } : {};
    }
}
