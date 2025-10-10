import type { RegisteredProviders } from '../src/adapters/index.ts';

export const providerEnv: Record<string, { apiKeyEnv: string }> = {
    openai: { apiKeyEnv: 'OPENAI_API_KEY' }
    // Extend as new providers are added
};

export function resolveApiKey(provider: RegisteredProviders): string | undefined {
    const conf = providerEnv[provider as string];
    return conf ? process.env[conf.apiKeyEnv] : undefined;
}


