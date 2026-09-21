import { describe, expect, it } from '@jest/globals';
import { classifyRetryFailure } from '../../../../core/retry/classifyRetryFailure.ts';
import { StructuredOutputError } from '../../../../core/processors/StructuredOutputError.ts';
import { LLMAbortError, LLMTimeoutError } from '../../../../core/execution/errors.ts';
import { ProviderTransportError } from '../../../../core/retry/ProviderTransportError.ts';
import { FinishReason } from '../../../../interfaces/UniversalInterfaces.ts';

describe('classifyRetryFailure', () => {
  it('never retries cancellation errors', () => {
    expect(classifyRetryFailure(new LLMAbortError()).retryClass).toBeUndefined();
    expect(classifyRetryFailure(new LLMTimeoutError(1000)).retryClass).toBeUndefined();
  });

  it('classifies StructuredOutputError as structuredOutput', () => {
    const err = new StructuredOutputError({
      reason: 'schema_validation',
      response: {
        content: '{}',
        role: 'assistant',
        metadata: { finishReason: FinishReason.STOP }
      }
    });
    const c = classifyRetryFailure(err);
    expect(c.retryClass).toBe('structuredOutput');
    expect(c.reason).toBe('schema_validation');
  });

  it('classifies content-triggered messages as content', () => {
    const c = classifyRetryFailure(new Error('Response content triggered retry: empty'));
    expect(c.retryClass).toBe('content');
  });

  it('classifies DNS ENOTFOUND as transport clear miss', () => {
    const c = classifyRetryFailure(new Error('getaddrinfo ENOTFOUND api.openai.com'));
    expect(c.retryClass).toBe('transport');
    expect(c.usageAmbiguous).toBe(false);
    expect(c.costUnresolved).toBe(false);
    expect(c.reason).toBe('dns_or_unreachable');
  });

  it('classifies timeout as transport with usageAmbiguous', () => {
    const c = classifyRetryFailure(new Error('Request timeout after 30000ms'));
    expect(c.retryClass).toBe('transport');
    expect(c.usageAmbiguous).toBe(true);
    expect(c.costUnresolved).toBe(true);
  });

  it('classifies HTTP 503 as transport', () => {
    const err = new Error('Service Unavailable') as Error & { status: number };
    err.status = 503;
    const c = classifyRetryFailure(err);
    expect(c.retryClass).toBe('transport');
    expect(c.statusCode).toBe(503);
  });

  it('preserves ProviderTransportError fields', () => {
    const err = new ProviderTransportError({
      message: 'down',
      usageAmbiguous: true,
      costUnresolved: true,
      reason: 'timeout_or_disconnect'
    });
    const c = classifyRetryFailure(err);
    expect(c.retryClass).toBe('transport');
    expect(c.usageAmbiguous).toBe(true);
    expect(c.reason).toBe('timeout_or_disconnect');
  });
});
