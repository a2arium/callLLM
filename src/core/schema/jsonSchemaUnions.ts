import type { ModelInfo } from '../../interfaces/UniversalInterfaces.ts';

export type JsonSchemaUnionsMode = 'anyOf' | 'flatten';

/**
 * Resolve how property-level anyOf/oneOf should be represented for native structured outputs.
 * Defaults to 'flatten' when unset so unknown/custom models stay on the safer rewrite path.
 */
export function getJsonSchemaUnions(modelInfo?: ModelInfo | null): JsonSchemaUnionsMode {
    const text = modelInfo?.capabilities?.output?.text;
    if (typeof text === 'object' && text.jsonSchemaUnions === 'anyOf') {
        return 'anyOf';
    }
    if (typeof text === 'object' && text.jsonSchemaUnions === 'flatten') {
        return 'flatten';
    }
    return 'flatten';
}
