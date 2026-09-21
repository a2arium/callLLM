import type {
    UniversalChatParams,
    UniversalChatResponse
} from '../../interfaces/UniversalInterfaces.ts';
import { StructuredOutputError } from './StructuredOutputError.ts';

/** True when the request requires structured JSON (schema or json response format). */
export function isStructuredOutputRequest(
    params: Pick<UniversalChatParams, 'jsonSchema' | 'responseFormat'>
): boolean {
    if (params.jsonSchema) return true;
    if (params.responseFormat === 'json') return true;
    if (
        params.responseFormat
        && typeof params.responseFormat === 'object'
        && params.responseFormat.type === 'json_object'
    ) {
        return true;
    }
    return false;
}

/**
 * Fail closed when a structured-output request received more than one native
 * output_text item. Must run before JSON.parse and before tool orchestration.
 */
export function throwIfMultipleStructuredOutputs(
    response: UniversalChatResponse,
    params: Pick<UniversalChatParams, 'jsonSchema' | 'responseFormat'>
): void {
    if (!isStructuredOutputRequest(params)) return;
    const provenance = response.metadata?.outputTextProvenance;
    if (!provenance || provenance.outputTextCount <= 1) return;

    throw new StructuredOutputError({
        reason: 'multiple_structured_outputs',
        message: `Structured output failed: expected exactly one native output_text item, got ${provenance.outputTextCount}`,
        response,
        outputTextProvenance: provenance
    });
}
