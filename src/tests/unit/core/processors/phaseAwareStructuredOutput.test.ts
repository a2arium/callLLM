import { describe, expect, it } from '@jest/globals';
import { ResponseProcessor } from '../../../../../src/core/processors/ResponseProcessor.ts';
import { StructuredOutputError } from '../../../../../src/core/processors/StructuredOutputError.ts';
import { throwIfMultipleStructuredOutputs } from '../../../../../src/core/processors/assertSingleStructuredOutput.ts';
import { resolveRetryPolicy } from '../../../../../src/core/retry/resolveRetryPolicy.ts';
import { shouldRetryDueToLLMError } from '../../../../../src/core/retry/utils/ShouldRetryDueToLLMError.ts';
import {
  FinishReason,
  type ModelInfo,
  type OutputTextItemSummary,
  type OutputTextProvenance,
  type ToolCall,
  type UniversalChatParams,
  type UniversalChatResponse
} from '../../../../../src/interfaces/UniversalInterfaces.ts';
import { z } from 'zod';

const modelInfo: ModelInfo = {
  name: 'test-model',
  inputPricePerMillion: 0.01,
  outputPricePerMillion: 0.02,
  maxRequestTokens: 4000,
  maxResponseTokens: 1000,
  characteristics: { qualityIndex: 80, outputSpeed: 20, firstTokenLatency: 500 }
};

const usage = {
  tokens: {
    input: { total: 12, cached: 0 },
    output: { total: 34, reasoning: 0 },
    total: 46
  }
};

const schema = z.object({ action: z.string() });

function jsonParams(): UniversalChatParams {
  return {
    messages: [{ role: 'user', content: 'decide' }],
    model: 'test-model',
    responseFormat: 'json',
    jsonSchema: { name: 'Decision', schema }
  };
}

type PhaseLabel = 'commentary' | 'final_answer' | null | undefined;

/** Mirrors the OpenAI converter projection for a native message item. */
function item(index: number, phase: PhaseLabel, length = 20): OutputTextItemSummary {
  return {
    outputIndex: index,
    contentIndex: 0,
    sha256: `hash_${index}`,
    length,
    itemId: `msg_${index}`,
    itemType: 'message',
    role: 'assistant',
    status: 'completed',
    ...(phase !== undefined ? { phase } : {}),
    contentType: 'output_text'
  };
}

function provenanceFor(
  phases: PhaseLabel[],
  decisionalIndex?: number
): OutputTextProvenance {
  const items = phases.map((phase, index) => item(index, phase));
  return {
    outputTextCount: items.length,
    responseId: 'resp_phase',
    items,
    finalAnswerCount: phases.filter(p => p === 'final_answer').length,
    commentaryCount: phases.filter(p => p === 'commentary').length,
    unphasedCount: phases.filter(p => p === undefined || p === null).length,
    ...(decisionalIndex !== undefined
      ? {
        decisionalItem: {
          outputIndex: decisionalIndex,
          contentIndex: 0,
          ...(phases[decisionalIndex] !== undefined ? { phase: phases[decisionalIndex] } : {})
        }
      }
      : {})
  };
}

function responseWith(
  provenance: OutputTextProvenance,
  content: string,
  extra: Partial<UniversalChatResponse> = {}
): UniversalChatResponse {
  return {
    content,
    role: 'assistant',
    ...extra,
    metadata: {
      finishReason: FinishReason.STOP,
      providerStatus: 'completed',
      model: 'gpt-5.4-mini-2026-03-17',
      usage,
      outputTextProvenance: provenance,
      ...(extra.metadata || {})
    }
  };
}

describe('phase-aware structured output selection', () => {
  const processor = new ResponseProcessor();
  const finalBody = '{"action":"answer"}';

  it('parses only the final_answer item when commentary bodies differ', async () => {
    const provenance = provenanceFor(['commentary', 'final_answer'], 1);
    provenance.items[0].sha256 = 'hash_commentary';
    const result = await processor.validateResponse(
      responseWith(provenance, finalBody),
      jsonParams(),
      modelInfo
    );

    expect(result.contentObject).toEqual({ action: 'answer' });
    expect(result.metadata?.usage).toEqual(usage);
    expect(result.metadata?.outputTextProvenance?.outputTextCount).toBe(2);
    expect(result.metadata?.outputTextProvenance?.items.map(i => i.phase))
      .toEqual(['commentary', 'final_answer']);
  });

  it('parses the final_answer item when commentary is byte-identical', async () => {
    // Identical hashes: selection must not depend on body equality.
    const provenance = provenanceFor(['commentary', 'final_answer'], 1);
    provenance.items[0].sha256 = provenance.items[1].sha256;
    provenance.items[0].length = provenance.items[1].length;

    const result = await processor.validateResponse(
      responseWith(provenance, finalBody),
      jsonParams(),
      modelInfo
    );

    expect(result.contentObject).toEqual({ action: 'answer' });
  });

  it('fails closed with multiple_structured_outputs on two final_answer items', async () => {
    await expect(processor.validateResponse(
      responseWith(provenanceFor(['final_answer', 'final_answer']), ''),
      jsonParams(),
      modelInfo
    )).rejects.toMatchObject({
      name: 'StructuredOutputError',
      reason: 'multiple_structured_outputs'
    });
  });

  it('fails closed with multiple_structured_outputs on two byte-identical final_answer items', async () => {
    const provenance = provenanceFor(['final_answer', 'final_answer']);
    provenance.items[1].sha256 = provenance.items[0].sha256;

    const err = await processor.validateResponse(responseWith(provenance, ''), jsonParams(), modelInfo)
      .then(() => null, (e: unknown) => e);

    expect((err as StructuredOutputError).reason).toBe('multiple_structured_outputs');
  });

  it('fails with missing_final_output when only commentary items exist', async () => {
    await expect(processor.validateResponse(
      responseWith(provenanceFor(['commentary', 'commentary']), ''),
      jsonParams(),
      modelInfo
    )).rejects.toMatchObject({
      name: 'StructuredOutputError',
      reason: 'missing_final_output'
    });
  });

  it('fails with missing_final_output for a lone commentary item', async () => {
    await expect(processor.validateResponse(
      responseWith(provenanceFor(['commentary']), 'thinking out loud'),
      jsonParams(),
      modelInfo
    )).rejects.toMatchObject({ reason: 'missing_final_output' });
  });

  it('keeps the legacy single-item path for one absent-phase item', async () => {
    const result = await processor.validateResponse(
      responseWith(provenanceFor([undefined], 0), finalBody),
      jsonParams(),
      modelInfo
    );

    expect(result.contentObject).toEqual({ action: 'answer' });
  });

  it('keeps the legacy single-item path for one null-phase item', async () => {
    const result = await processor.validateResponse(
      responseWith(provenanceFor([null], 0), finalBody),
      jsonParams(),
      modelInfo
    );

    expect(result.contentObject).toEqual({ action: 'answer' });
  });

  it('keeps fail-closed behavior for two absent-phase items', async () => {
    await expect(processor.validateResponse(
      responseWith(provenanceFor([undefined, undefined]), ''),
      jsonParams(),
      modelInfo
    )).rejects.toMatchObject({ reason: 'multiple_structured_outputs' });
  });

  it('fails closed when a final_answer coexists with an absent-phase item', async () => {
    const err = await processor.validateResponse(
      responseWith(provenanceFor(['final_answer', undefined]), ''),
      jsonParams(),
      modelInfo
    ).then(() => null, (e: unknown) => e);

    const soe = err as StructuredOutputError;
    expect(soe.reason).toBe('multiple_structured_outputs');
    expect(soe.message).toContain('unknown phase');
  });

  it('fails closed when commentary coexists with an absent-phase item and no final answer', async () => {
    await expect(processor.validateResponse(
      responseWith(provenanceFor(['commentary', undefined]), ''),
      jsonParams(),
      modelInfo
    )).rejects.toMatchObject({ reason: 'multiple_structured_outputs' });
  });

  it('keeps refusal precedence over phase selection', async () => {
    const response = responseWith(provenanceFor(['commentary', 'final_answer'], 1), finalBody, {
      metadata: { refusal: { message: 'I cannot help with that.' } }
    });

    await expect(processor.validateResponse(response, jsonParams(), modelInfo))
      .rejects.toMatchObject({ reason: 'refusal' });
  });

  it('keeps max_output_tokens precedence when no content was projected', async () => {
    const response = responseWith(provenanceFor(['commentary', 'commentary']), '', {
      metadata: { finishReason: FinishReason.LENGTH, incompleteReason: 'max_output_tokens' }
    });

    await expect(processor.validateResponse(response, jsonParams(), modelInfo))
      .rejects.toMatchObject({ reason: 'max_output_tokens' });
  });

  it('leaves one text item plus a function call untouched', () => {
    const toolCalls: ToolCall[] = [{ id: 'call_1', name: 'echo', arguments: { value: 'x' } }];
    const response = responseWith(provenanceFor(['final_answer'], 0), 'calling', { toolCalls });

    expect(() => throwIfMultipleStructuredOutputs(response, jsonParams())).not.toThrow();
  });

  it('stays fail closed for multiple text items alongside tools, regardless of phase', () => {
    const toolCalls: ToolCall[] = [{ id: 'call_1', name: 'echo', arguments: { value: 'x' } }];
    const response = responseWith(provenanceFor(['commentary', 'final_answer'], 1), 'x', { toolCalls });

    expect(() => throwIfMultipleStructuredOutputs(response, jsonParams()))
      .toThrow(/function call/);
    const err = (() => {
      try {
        throwIfMultipleStructuredOutputs(response, jsonParams());
        return null;
      } catch (e) {
        return e as StructuredOutputError;
      }
    })();
    expect(err?.reason).toBe('multiple_structured_outputs');
  });

  it('applies the legacy cardinality rule when provenance has no phase counts', () => {
    const legacy: OutputTextProvenance = {
      outputTextCount: 2,
      responseId: 'resp_legacy',
      items: [
        { outputIndex: 0, contentIndex: 0, sha256: 'a', length: 5 },
        { outputIndex: 1, contentIndex: 0, sha256: 'a', length: 5 }
      ]
    };

    expect(() => throwIfMultipleStructuredOutputs(responseWith(legacy, ''), jsonParams()))
      .toThrow(/got 2/);
    expect(() => throwIfMultipleStructuredOutputs(
      responseWith({ outputTextCount: 1, items: [{ outputIndex: 0, contentIndex: 0, sha256: 'a', length: 5 }] }, 'x'),
      jsonParams()
    )).not.toThrow();
  });

  it('ignores non-structured requests entirely', () => {
    const response = responseWith(provenanceFor(['commentary', 'commentary']), '');
    expect(() => throwIfMultipleStructuredOutputs(response, {})).not.toThrow();
  });

  it('preserves provider accountability fields on a phase failure', () => {
    const provenance = provenanceFor(['final_answer', 'final_answer']);
    const response = responseWith(provenance, '');

    const err = (() => {
      try {
        throwIfMultipleStructuredOutputs(response, jsonParams());
        return null;
      } catch (e) {
        return e as StructuredOutputError;
      }
    })();

    expect(err?.usage).toEqual(usage);
    expect(err?.nativeStatus).toBe('completed');
    expect(err?.model).toBe('gpt-5.4-mini-2026-03-17');
    expect(err?.outputTextProvenance?.responseId).toBe('resp_phase');
    expect(err?.outputTextProvenance?.items.map(i => i.itemId)).toEqual(['msg_0', 'msg_1']);
    expect(err?.outputTextProvenance?.finalAnswerCount).toBe(2);
  });

  it('classifies missing_final_output as a retryable structured-output reason', () => {
    const policy = resolveRetryPolicy({ maxRetries: 2 });
    expect(policy.structuredOutput.retryReasons).toContain('missing_final_output');
    expect(shouldRetryDueToLLMError(new StructuredOutputError({ reason: 'missing_final_output' }))).toBe(true);
  });
});
