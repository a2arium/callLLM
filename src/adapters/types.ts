import type { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse } from '../interfaces/UniversalInterfaces';
import type { StreamChunk } from '../core/streaming/types';
import { BaseAdapter } from './base/baseAdapter';
import type { AdapterConfig } from './base/baseAdapter';

/**
 * Base type for provider-specific parameters
 */
export type ProviderSpecificParams = Record<string, unknown>;

/**
 * Base type for provider-specific responses
 */
export type ProviderSpecificResponse = Record<string, unknown>;

/**
 * Base type for provider-specific stream chunks
 */
export type ProviderSpecificStream = AsyncIterable<unknown>;

/**
 * Provider adapter interface for converting between universal and provider-specific formats.
 * 
 * This adapter follows the Adapter pattern to translate between our universal interfaces
 * and provider-specific APIs. The adapter should be stateless and only handle format conversion,
 * with no business logic.
 */
export type ProviderAdapter = {
    /**
     * Converts universal chat parameters to provider-specific format
     * @param params The universal parameters
     * @returns The provider-specific parameters
     */
    convertToProviderParams: <T extends ProviderSpecificParams>(
        params: UniversalChatParams
    ) => T;

    /**
     * Converts a provider-specific response to universal format
     * @param response The provider-specific response
     * @returns The universal response
     */
    convertFromProviderResponse: <T extends ProviderSpecificResponse>(
        response: T
    ) => UniversalChatResponse;

    /**
     * Converts a provider-specific stream to universal format
     * @param stream The provider-specific stream
     * @returns An async iterable of universal stream chunks
     */
    convertProviderStream: <T extends ProviderSpecificStream>(
        stream: T
    ) => AsyncIterable<StreamChunk>;

    /**
     * Maps a provider-specific error to a universal error format
     * @param error The provider-specific error
     * @returns A standardized error object
     */
    mapProviderError: (error: unknown) => Error;
};

/**
 * Type for adapter class constructor that can be registered in the adapter registry
 */
export type AdapterConstructor = new (config: Partial<AdapterConfig>) => BaseAdapter;

/**
 * Type for an entry in the adapter registry
 */
export type AdapterEntry = {
    name: string;
    AdapterClass: AdapterConstructor;
};

/**
 * Error thrown when a requested provider is not found in the registry
 */
export class ProviderNotFoundError extends Error {
    constructor(providerName: string) {
        super(`Provider "${providerName}" not found in registry`);
        this.name = 'ProviderNotFoundError';
    }
} 