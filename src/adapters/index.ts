import { OpenAIResponseAdapter } from './openai/adapter';
import type { AdapterConstructor } from './types';
import { ProviderNotFoundError } from './types';

/**
 * Central registry of all available adapters
 * To add a new adapter:
 * 1. Import the adapter class
 * 2. Add an entry to this registry with the desired provider name
 */
const ADAPTER_REGISTRY = {
    'openai': OpenAIResponseAdapter as AdapterConstructor,
} as const;

export const adapterRegistry = new Map<string, AdapterConstructor>(
    Object.entries(ADAPTER_REGISTRY)
);

/**
 * Type representing all registered provider names
 */
export type RegisteredProviders = keyof typeof ADAPTER_REGISTRY;

/**
 * Get all registered provider names
 */
export const getRegisteredProviders = (): string[] => Array.from(adapterRegistry.keys());

/**
 * Check if a provider is registered
 */
export const isProviderRegistered = (providerName: string): boolean => adapterRegistry.has(providerName);

/**
 * Get an adapter constructor by provider name
 * @throws {ProviderNotFoundError} if provider is not found
 */
export const getAdapterConstructor = (providerName: string): AdapterConstructor => {
    const AdapterClass = adapterRegistry.get(providerName);
    if (!AdapterClass) {
        throw new ProviderNotFoundError(providerName);
    }
    return AdapterClass;
}; 