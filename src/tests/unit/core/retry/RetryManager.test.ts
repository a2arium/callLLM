import { jest } from '@jest/globals';
import { RetryManager } from '../../../../../src/core/retry/RetryManager.ts';
import type { RetryConfig } from '../../../../../src/core/retry/RetryManager.ts';
import { LLMAbortError } from '../../../../../src/core/execution/errors.ts';

describe('RetryManager', () => {
  it('does not start an operation when already aborted', async () => {
    const controller = new AbortController();
    controller.abort('cancelled');
    const operation = jest.fn<() => Promise<string>>().mockResolvedValue('unused');
    const retryManager = new RetryManager({ maxRetries: 3 });

    await expect(retryManager.executeWithRetry(operation, () => true, { signal: controller.signal }))
      .rejects.toBeInstanceOf(LLMAbortError);
    expect(operation).not.toHaveBeenCalled();
  });

  it('aborts during retry backoff without another attempt', async () => {
    jest.useFakeTimers();
    const controller = new AbortController();
    const operation = jest.fn<() => Promise<string>>().mockRejectedValue(new Error('retry me'));
    const retryManager = new RetryManager({ baseDelay: 100, maxRetries: 3 });
    const result = retryManager.executeWithRetry(operation, () => true, { signal: controller.signal });

    await Promise.resolve();
    controller.abort();
    await expect(result).rejects.toBeInstanceOf(LLMAbortError);
    expect(operation).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    delete process.env.NODE_ENV;
  });

  it('should succeed without retry if the operation resolves on the first attempt', async () => {
    const config: RetryConfig = { baseDelay: 100, maxRetries: 3 };
    const retryManager = new RetryManager(config);
    const operation = jest.fn().mockResolvedValue('success' as unknown as never);

    const result = await retryManager.executeWithRetry(operation as any, () => true);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry and eventually succeed', async () => {
    const config: RetryConfig = { baseDelay: 100, maxRetries: 3 };
    const retryManager = new RetryManager(config);
    const operation = jest.fn()
    operation.
      mockRejectedValueOnce(new Error('fail 1') as unknown as never).
      mockRejectedValueOnce(new Error('fail 2') as unknown as never).
      mockResolvedValue('success' as unknown as never);

    jest.useFakeTimers({ legacyFakeTimers: false });

    const promise = retryManager.executeWithRetry(operation as any, () => true);

    // Expected delays: 200ms for first retry and 400ms for second retry.
    await jest.advanceTimersByTimeAsync(600);
    jest.runAllTimers();

    const result = await promise;
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);

    jest.useRealTimers();
  });

  it('should throw an error after exhausting all retries', async () => {
    const config: RetryConfig = { baseDelay: 100, maxRetries: 2 };
    const retryManager = new RetryManager(config);
    const operation = jest.fn().mockRejectedValue(new Error('persistent error') as unknown as never);
    // (No fake timers are used; in test, baseDelay is overridden to 1, so delays are minimal)
    // Log NODE_ENV to verify we are in test mode
    console.log('NODE_ENV in test:', process.env.NODE_ENV);
    const promise = retryManager.executeWithRetry(operation as any, () => true);
    // Optionally, wait a little longer than the expected total delay (e.g. 10ms)
    await new Promise((resolve) => setTimeout(resolve, 10));
    await expect(promise).rejects.toThrow(/Failed after 2 retries. Last error: persistent error/);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should not retry if the provided shouldRetry returns false', async () => {
    const config: RetryConfig = { baseDelay: 100, maxRetries: 3 };
    const retryManager = new RetryManager(config);
    const operation = jest.fn().mockRejectedValue(new Error('non-retry error') as unknown as never);

    await expect(
      retryManager.executeWithRetry(operation as any, (): boolean => false)
    ).rejects.toThrow('non-retry error');

    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should use the production baseDelay when NODE_ENV is not "test"', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const config: RetryConfig = { baseDelay: 100, maxRetries: 1 };
    const retryManager = new RetryManager(config);
    const operation = jest.fn().
      mockRejectedValueOnce(new Error('oops') as unknown as never).
      mockResolvedValue('success' as unknown as never);

    jest.useFakeTimers({ legacyFakeTimers: false });
    const timeoutSpy = jest.spyOn(global, 'setTimeout');

    const promise = retryManager.executeWithRetry(operation as any, () => true);

    // Advance through first retry delay (100 * 2^1 = 200ms)
    await jest.advanceTimersByTimeAsync(200);
    await jest.runAllTimersAsync();

    // Wait for promise to resolve
    await promise;

    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 200);
    timeoutSpy.mockRestore();
    jest.useRealTimers();
    process.env.NODE_ENV = originalEnv;
  });

  it('should throw error message correctly when last error is not an instance of Error', async () => {
    const config: RetryConfig = { baseDelay: 100, maxRetries: 2 };
    const retryManager = new RetryManager(config);
    // Throw a primitive error (a string);
    const operation = jest.fn().mockRejectedValue("primitive error" as unknown as never);
    const shouldRetry = () => true;

    try {
      await retryManager.executeWithRetry(operation as any, shouldRetry);
    } catch (err) {
      expect((err as Error).message).toContain("Failed after 2 retries. Last error: primitive error");
    }
  }, 10000); // Increase timeout to 10 seconds

  it('should exit when attempts exceed maxRetries', async () => {
    const config: RetryConfig = { maxRetries: 0 }; // Allow only 1 attempt
    const retryManager = new RetryManager(config);
    const operation = jest.fn().mockRejectedValue(new Error('error') as unknown as never);

    await expect(retryManager.executeWithRetry(operation as any, () => true)).
      rejects.toThrow(/Failed after 0 retries/);
    expect(operation).toHaveBeenCalledTimes(1);
  }, 10000); // Increase timeout to 10 seconds
});

describe('RetryManager Logging', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    delete process.env.NODE_ENV;
  });

  it('should log each retry attempt', async () => {
    // Create a spy to monitor calls to console.log.
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

    const config: RetryConfig = { baseDelay: 100, maxRetries: 3 };
    const retryManager = new RetryManager(config);
    const operation = jest.fn()
    operation.
      mockRejectedValueOnce(new Error('fail 1') as unknown as never).
      mockRejectedValueOnce(new Error('fail 2') as unknown as never).
      mockResolvedValue('success' as unknown as never);

    jest.useFakeTimers({ legacyFakeTimers: false });

    const promise = retryManager.executeWithRetry(operation as any, () => true);

    // In test environment, baseDelay is overridden to 1.
    // Expected delays: first retry: 2ms, second retry: 4ms ~ total 6ms.
    await jest.advanceTimersByTimeAsync(10);
    jest.runAllTimers();

    const result = await promise;
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);

    // Check that log messages have been output for each attempt with retry reason.
    expect(logSpy).toHaveBeenCalledWith('RetryManager: Attempt 2 - Reason: fail 1');
    expect(logSpy).toHaveBeenCalledWith('RetryManager: Attempt 3 - Reason: fail 2');

    logSpy.mockRestore();
    jest.useRealTimers();
  });
});

describe('RetryManager classified policy', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  it('retries transport twice but returns schema_validation on first SO failure when SO ceiling is 0', async () => {
    const { resolveRetryPolicy } = await import('../../../../../src/core/retry/resolveRetryPolicy.ts');
    const { StructuredOutputError } = await import('../../../../../src/core/processors/StructuredOutputError.ts');
    const { ProviderTransportError } = await import('../../../../../src/core/retry/ProviderTransportError.ts');

    const policy = resolveRetryPolicy({
      retryPolicy: {
        transport: { maxRetries: 2 },
        structuredOutput: { maxRetries: 0 },
        content: { maxRetries: 0 }
      }
    });
    const retryManager = new RetryManager();
    const events: Array<{ retryClass: string }> = [];
    let calls = 0;
    const operation = jest.fn(async () => {
      calls++;
      if (calls <= 2) {
        throw new Error('getaddrinfo ENOTFOUND api.openai.com');
      }
      throw new StructuredOutputError({
        reason: 'schema_validation',
        response: { content: '{"a":1}', role: 'assistant' }
      });
    });

    try {
      await retryManager.executeWithRetry(operation, {
        policy,
        operationId: 'op-1',
        onRetryAttempt: (e) => events.push({ retryClass: e.retryClass })
      });
      throw new Error('expected reject');
    } catch (err) {
      expect(err).toBeInstanceOf(StructuredOutputError);
      expect((err as InstanceType<typeof StructuredOutputError>).reason).toBe('schema_validation');
      expect((err as InstanceType<typeof StructuredOutputError>).retryHistory.length).toBe(2);
    }

    expect(operation).toHaveBeenCalledTimes(3); // 2 DNS + 1 schema
    expect(events.every((e) => e.retryClass === 'transport')).toBe(true);
    expect(ProviderTransportError).toBeDefined();
  });

  it('retries schema once but returns connection failure immediately when transport ceiling is 0', async () => {
    const { resolveRetryPolicy } = await import('../../../../../src/core/retry/resolveRetryPolicy.ts');
    const { StructuredOutputError } = await import('../../../../../src/core/processors/StructuredOutputError.ts');
    const { isProviderTransportError } = await import('../../../../../src/core/retry/ProviderTransportError.ts');

    const policy = resolveRetryPolicy({
      retryPolicy: {
        transport: { maxRetries: 0 },
        structuredOutput: { maxRetries: 1 },
        content: { maxRetries: 0 }
      }
    });
    const retryManager = new RetryManager();
    let calls = 0;
    const operation = jest.fn(async () => {
      calls++;
      if (calls === 1) {
        throw new StructuredOutputError({
          reason: 'schema_validation',
          response: { content: '{}', role: 'assistant' }
        });
      }
      throw new Error('getaddrinfo ENOTFOUND api.openai.com');
    });

    // First failure is SO — one retry allowed, second attempt hits DNS with transport 0
    try {
      await retryManager.executeWithRetry(operation, { policy, operationId: 'op-2' });
      throw new Error('expected reject');
    } catch (err) {
      expect(isProviderTransportError(err)).toBe(true);
    }

    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('honors maxRetries 0 legacy shared ceiling with no retry', async () => {
    const { resolveRetryPolicy } = await import('../../../../../src/core/retry/resolveRetryPolicy.ts');
    const policy = resolveRetryPolicy({ maxRetries: 0 });
    const retryManager = new RetryManager();
    const operation = jest.fn(async () => {
      throw new Error('getaddrinfo ENOTFOUND api.openai.com');
    });

    await expect(
      retryManager.executeWithRetry(operation, { policy, operationId: 'op-0' })
    ).rejects.toThrow(/Failed after 0 retries|without retrying/);

    expect(operation).toHaveBeenCalledTimes(1);
  });
});
