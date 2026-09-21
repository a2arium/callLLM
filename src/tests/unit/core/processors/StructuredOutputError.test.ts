import { describe, expect, it } from '@jest/globals';
import { ResponseProcessor } from '../../../../../src/core/processors/ResponseProcessor.ts';
import { StructuredOutputError } from '../../../../../src/core/processors/StructuredOutputError.ts';
import { RetryManager } from '../../../../../src/core/retry/RetryManager.ts';
import { shouldRetryDueToLLMError } from '../../../../../src/core/retry/utils/ShouldRetryDueToLLMError.ts';
import {
  FinishReason,
  type ModelInfo,
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
  characteristics: {
    qualityIndex: 80,
    outputSpeed: 20,
    firstTokenLatency: 500
  }
};

const usage = {
  tokens: {
    input: { total: 12, cached: 0 },
    output: { total: 34, reasoning: 0 },
    total: 46
  }
};

function jsonParams(schema?: z.ZodType): UniversalChatParams {
  return {
    messages: [{ role: 'user', content: 'test' }],
    model: 'test-model',
    responseFormat: 'json',
    ...(schema ? { jsonSchema: { schema } } : {})
  };
}

describe('StructuredOutputError provenance', () => {
  const processor = new ResponseProcessor();

  it('classifies refusal with native refusal text and usage', async () => {
    const response: UniversalChatResponse = {
      content: '',
      role: 'assistant',
      metadata: {
        finishReason: FinishReason.CONTENT_FILTER,
        providerStatus: 'completed',
        model: 'gpt-4o',
        usage,
        refusal: { message: 'I cannot fulfill that request.' }
      }
    };

    await expect(processor.validateResponse(response, jsonParams(), modelInfo)).rejects.toMatchObject({
      name: 'StructuredOutputError',
      reason: 'refusal',
      refusal: { message: 'I cannot fulfill that request.' },
      model: 'gpt-4o',
      usage,
      nativeStatus: 'completed'
    });
  });

  it('classifies empty max_output_tokens incomplete as distinct typed error', async () => {
    const response: UniversalChatResponse = {
      content: '',
      role: 'assistant',
      metadata: {
        finishReason: FinishReason.LENGTH,
        providerStatus: 'incomplete',
        incompleteReason: 'max_output_tokens',
        model: 'gpt-4o',
        usage
      }
    };

    await expect(processor.validateResponse(response, jsonParams(), modelInfo)).rejects.toMatchObject({
      name: 'StructuredOutputError',
      reason: 'max_output_tokens',
      finishReason: FinishReason.LENGTH,
      incompleteReason: 'max_output_tokens',
      model: 'gpt-4o',
      usage
    });
  });

  it('classifies plaintext under JSON contract as non_json with bounded content', async () => {
    const response: UniversalChatResponse = {
      content: 'Sure, here is the answer in prose.',
      role: 'assistant',
      metadata: {
        finishReason: FinishReason.STOP,
        providerStatus: 'completed',
        model: 'gpt-4o',
        usage
      }
    };

    const err = await processor.validateResponse(response, jsonParams(), modelInfo).then(
      () => null,
      (e: unknown) => e
    );

    expect(err).toBeInstanceOf(StructuredOutputError);
    const soe = err as StructuredOutputError;
    expect(soe.reason).toBe('non_json');
    expect(soe.rawContent).toBe('Sure, here is the answer in prose.');
    expect(soe.usage).toEqual(usage);
    expect(soe.model).toBe('gpt-4o');
  });

  it('classifies malformed JSON distinctly from plaintext', async () => {
    const response: UniversalChatResponse = {
      content: '{ "name": ',
      role: 'assistant',
      metadata: {
        finishReason: FinishReason.STOP,
        model: 'gpt-4o',
        usage
      }
    };

    await expect(processor.validateResponse(response, jsonParams(), modelInfo)).rejects.toMatchObject({
      name: 'StructuredOutputError',
      reason: 'json_parse',
      usage,
      model: 'gpt-4o'
    });
  });

  it('classifies schema-invalid JSON distinctly from parse failures', async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number()
    });
    const response: UniversalChatResponse = {
      content: JSON.stringify({ name: 'test' }),
      role: 'assistant',
      metadata: {
        finishReason: FinishReason.STOP,
        model: 'gpt-4o',
        usage
      }
    };

    const err = await processor.validateResponse(response, jsonParams(schema), modelInfo).then(
      () => null,
      (e: unknown) => e
    );

    expect(err).toBeInstanceOf(StructuredOutputError);
    const soe = err as StructuredOutputError;
    expect(soe.reason).toBe('schema_validation');
    expect(soe.usage).toEqual(usage);
    expect(soe.validationErrors?.length).toBeGreaterThan(0);
  });

  it('leaves valid structured JSON and contentObject unchanged', async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number()
    });
    const payload = { name: 'ok', age: 42 };
    const response: UniversalChatResponse = {
      content: JSON.stringify(payload),
      role: 'assistant',
      metadata: { finishReason: FinishReason.STOP, usage }
    };

    const result = await processor.validateResponse(response, jsonParams(schema), modelInfo);
    expect(result.contentObject).toEqual(payload);
    expect(result.metadata?.usage).toEqual(usage);
  });

  it('fails closed with multiple_structured_outputs before contentObject is set', async () => {
    const provenance = {
      outputTextCount: 2,
      responseId: 'resp_dup',
      items: [
        { outputIndex: 0, contentIndex: 0, sha256: 'aaa', length: 10 },
        { outputIndex: 1, contentIndex: 0, sha256: 'aaa', length: 10 }
      ]
    };
    const response: UniversalChatResponse = {
      content: '',
      role: 'assistant',
      metadata: {
        finishReason: FinishReason.STOP,
        providerStatus: 'completed',
        model: 'gpt-4o',
        usage,
        outputTextProvenance: provenance
      }
    };

    await expect(processor.validateResponse(response, jsonParams(z.object({ a: z.number() })), modelInfo))
      .rejects.toMatchObject({
        name: 'StructuredOutputError',
        reason: 'multiple_structured_outputs',
        outputTextProvenance: provenance,
        model: 'gpt-4o',
        usage
      });
  });

  it('still classifies refusal when a single output_text item is present with refusal', async () => {
    const response: UniversalChatResponse = {
      content: '{"ok":true}',
      role: 'assistant',
      metadata: {
        finishReason: FinishReason.CONTENT_FILTER,
        providerStatus: 'completed',
        model: 'gpt-4o',
        usage,
        refusal: { message: 'nope' },
        outputTextProvenance: {
          outputTextCount: 1,
          items: [{ outputIndex: 0, contentIndex: 1, sha256: 'bbb', length: 11 }]
        }
      }
    };

    await expect(processor.validateResponse(response, jsonParams(), modelInfo)).rejects.toMatchObject({
      reason: 'refusal'
    });
  });

  it('parses single-item structured output normally', async () => {
    const response: UniversalChatResponse = {
      content: '{"a":1}',
      role: 'assistant',
      metadata: {
        finishReason: FinishReason.STOP,
        model: 'gpt-4o',
        usage,
        outputTextProvenance: {
          outputTextCount: 1,
          items: [{ outputIndex: 0, contentIndex: 0, sha256: 'ccc', length: 7 }]
        }
      }
    };

    const result = await processor.validateResponse(response, jsonParams(z.object({ a: z.number() })), modelInfo);
    expect(result.contentObject).toEqual({ a: 1 });
  });
});

describe('RetryManager StructuredOutputError preservation', () => {
  it('preserves StructuredOutputError fields when maxRetries is 0', async () => {
    const retryManager = new RetryManager({ maxRetries: 0, baseDelay: 1 });
    const original = new StructuredOutputError({
      reason: 'non_json',
      response: {
        content: 'plaintext',
        role: 'assistant',
        metadata: {
          finishReason: FinishReason.STOP,
          model: 'gpt-4o',
          usage,
          providerStatus: 'completed'
        }
      }
    });

    expect(shouldRetryDueToLLMError(original)).toBe(true);

    try {
      await retryManager.executeWithRetry(async () => {
        throw original;
      }, shouldRetryDueToLLMError);
      throw new Error('expected reject');
    } catch (err) {
      expect(err).toBeInstanceOf(StructuredOutputError);
      const soe = err as StructuredOutputError;
      expect(soe.reason).toBe('non_json');
      expect(soe.usage).toEqual(usage);
      expect(soe.model).toBe('gpt-4o');
      expect(soe.rawContent).toBe('plaintext');
      expect(soe.message).toContain('Failed after 0 retries');
      expect(soe.cause).toBe(original);
    }
  });

  it('preserves typed fields through classified policy terminal wrap', async () => {
    const { resolveRetryPolicy } = await import('../../../../../src/core/retry/resolveRetryPolicy.ts');
    const policy = resolveRetryPolicy({
      retryPolicy: { structuredOutput: { maxRetries: 0 }, transport: { maxRetries: 0 }, content: { maxRetries: 0 } }
    });
    const retryManager = new RetryManager();
    const original = new StructuredOutputError({
      reason: 'non_json',
      response: {
        content: 'plaintext',
        role: 'assistant',
        metadata: { finishReason: FinishReason.STOP, model: 'gpt-4o', usage }
      }
    });

    try {
      await retryManager.executeWithRetry(async () => {
        throw original;
      }, { policy, operationId: 'soe-1' });
      throw new Error('expected reject');
    } catch (err) {
      expect(err).toBeInstanceOf(StructuredOutputError);
      const soe = err as StructuredOutputError;
      expect(soe.reason).toBe('non_json');
      expect(soe.usage).toEqual(usage);
      expect(soe.retryHistory).toEqual([]);
    }
  });
});
