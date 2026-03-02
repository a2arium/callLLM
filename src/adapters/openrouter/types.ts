import type { CallModelInput } from '@openrouter/sdk';

/**
 * The shape of OpenRouter provider-specific options that can be passed 
 * through `settings.providerOptions.openrouter`.
 */
export interface OpenRouterProviderOptions {
    /** Provider routing preferences */
    provider?: {
        allowFallbacks?: boolean;
        requireParameters?: boolean;
        dataCollection?: 'allow' | 'deny';
        order?: string[];
        only?: string[];
        ignore?: string[];
        quantizations?: string[];
        sort?: string;
    };
    /** Response transforms to apply */
    transforms?: string[];
    /** Model fallback list */
    models?: string[];
    /** Route type (e.g., 'fallback') */
    route?: string;
}

/**
 * The full set of params we construct for callModel,
 * which is a subset of CallModelInput.
 */
export type OpenRouterCallParams = CallModelInput;
