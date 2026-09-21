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
 * Fail closed unless a structured-output request yielded one decisional native
 * text item. Must run before JSON.parse and before tool orchestration.
 *
 * Selection is phase-aware: OpenAI labels an assistant message as intermediate
 * commentary or the final answer, so `commentary` items are never decisional and
 * repeated `final_answer` items resolve to the last one in native output order.
 * Item bodies are never compared — selection ignores text equality.
 *
 * Providers without phase provenance keep the 0.5.3/0.5.4 cardinality rule.
 */
export function throwIfMultipleStructuredOutputs(
    response: UniversalChatResponse,
    params: Pick<UniversalChatParams, 'jsonSchema' | 'responseFormat'>
): void {
    if (!isStructuredOutputRequest(params)) return;
    const provenance = response.metadata?.outputTextProvenance;
    if (!provenance) return;

    const total = provenance.outputTextCount;
    const fail = (
        reason: 'multiple_structured_outputs' | 'missing_final_output',
        message: string
    ): never => {
        throw new StructuredOutputError({
            reason,
            message,
            response,
            outputTextProvenance: provenance
        });
    };

    const hasPhaseCounts =
        provenance.finalAnswerCount !== undefined
        || provenance.commentaryCount !== undefined
        || provenance.unphasedCount !== undefined;

    if (!hasPhaseCounts) {
        if (total <= 1) return;
        fail(
            'multiple_structured_outputs',
            `Structured output failed: expected exactly one native output_text item, got ${total}`
        );
    }

    // Mixed text-plus-tools phase semantics are not yet specified; never let a
    // phase-aware selection execute tools in a case 0.5.3 would have stopped.
    if (total > 1 && (response.toolCalls?.length ?? 0) > 0) {
        fail(
            'multiple_structured_outputs',
            `Structured output failed: ${total} native output_text items alongside `
            + `${response.toolCalls!.length} function call(s)`
        );
    }

    if (total === 0) return;

    const finalAnswerCount = provenance.finalAnswerCount ?? 0;
    const commentaryCount = provenance.commentaryCount ?? 0;
    const unphasedCount = provenance.unphasedCount ?? 0;

    if (finalAnswerCount > 0) {
        if (unphasedCount > 0) {
            fail(
                'multiple_structured_outputs',
                `Structured output failed: ${finalAnswerCount} final_answer item(s) coexist with `
                + `${unphasedCount} output_text item(s) of unknown phase`
            );
        }
        // Commentary items alongside a final answer are intermediate, not decisional.
        // Repeated final_answer items resolve to the last one in native order.
        return;
    }

    if (unphasedCount === 0) {
        fail(
            'missing_final_output',
            `Structured output failed: ${commentaryCount} commentary output_text item(s) and no final_answer item`
        );
    }

    // Legacy shape: a lone item that carries no phase label at all.
    if (unphasedCount === 1 && total === 1) return;

    fail(
        'multiple_structured_outputs',
        `Structured output failed: ${unphasedCount} output_text item(s) of unknown phase`
        + (commentaryCount > 0 ? ` alongside ${commentaryCount} commentary item(s)` : '')
        + ' and no final_answer item'
    );
}
