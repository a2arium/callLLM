import { resolveRetryPolicy } from '../../../../core/retry/resolveRetryPolicy.ts';
import { describe, expect, it } from '@jest/globals';

describe('resolveRetryPolicy', () => {
  it('maps legacy maxRetries to all class ceilings', () => {
    const policy = resolveRetryPolicy({ maxRetries: 2 });
    expect(policy.transport.maxRetries).toBe(2);
    expect(policy.structuredOutput.maxRetries).toBe(2);
    expect(policy.content.maxRetries).toBe(2);
    expect(policy.content.enabled).toBe(true);
    expect(policy.structuredOutput.retryReasons).toContain('schema_validation');
  });

  it('defaults legacy maxRetries to 3 when settings omitted', () => {
    const policy = resolveRetryPolicy(undefined);
    expect(policy.transport.maxRetries).toBe(3);
    expect(policy.structuredOutput.maxRetries).toBe(3);
    expect(policy.content.maxRetries).toBe(3);
  });

  it('zeros omitted classes when retryPolicy is set', () => {
    const policy = resolveRetryPolicy({
      maxRetries: 5,
      retryPolicy: {
        transport: { maxRetries: 2, baseDelayMs: 50 }
      }
    });
    expect(policy.transport.maxRetries).toBe(2);
    expect(policy.transport.baseDelayMs).toBe(50);
    expect(policy.structuredOutput.maxRetries).toBe(0);
    expect(policy.content.maxRetries).toBe(0);
  });

  it('honors structuredOutput.retryReasons allow-list', () => {
    const policy = resolveRetryPolicy({
      retryPolicy: {
        structuredOutput: {
          maxRetries: 1,
          retryReasons: ['json_parse', 'schema_validation']
        }
      }
    });
    expect(policy.structuredOutput.maxRetries).toBe(1);
    expect(policy.structuredOutput.retryReasons).toEqual(['json_parse', 'schema_validation']);
  });

  it('disables content when shouldRetryDueToContent is false', () => {
    const policy = resolveRetryPolicy({
      maxRetries: 3,
      shouldRetryDueToContent: false,
      retryPolicy: { content: { maxRetries: 5 } }
    });
    expect(policy.content.maxRetries).toBe(5);
    expect(policy.content.enabled).toBe(false);
  });
});
