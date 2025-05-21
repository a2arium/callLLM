import { jest } from '@jest/globals';
import { RetryManager, RetryConfig } from '../../../../../src/core/retry/RetryManager.js';

describe('RetryManager', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    delete process.env.NODE_ENV;
  });

  it('should succeed without retry if the operation resolves on the first attempt', async () => {
    const config: RetryConfig = { baseDelay: 100, maxRetries: 3 };
    const retryManager = new RetryManager(config);
    const operation = jest.fn().mockResolvedValue('success');

    const result = await retryManager.executeWithRetry(operation, () => true);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry and eventually succeed', async () => {
    const config: RetryConfig = { baseDelay: 100, maxRetries: 3 };
    const retryManager = new RetryManager(config);
    const operation = jest.fn()
    operation.
    mockRejectedValueOnce(new Error('fail 1')).
    mockRejectedValueOnce(new Error('fail 2')).
    mockResolvedValue('success');

    jest.useFakeTimers({ legacyFakeTimers: false });

    const promise = retryManager.executeWithRetry(operation, () => true);

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
    const operation = jest.fn().mockRejectedValue(new Error('persistent error'));
    // (No fake timers are used; in test, baseDelay is overridden to 1, so delays are minimal)
    // Log NODE_ENV to verify we are in test mode
    console.log('NODE_ENV in test:', process.env.NODE_ENV);
    const promise = retryManager.executeWithRetry(operation, () => true);
    // Optionally, wait a little longer than the expected total delay (e.g. 10ms)
    await new Promise((resolve) => setTimeout(resolve, 10));
    await expect(promise).rejects.toThrow('Failed after 2 retries. Last error: persistent error');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should not retry if the provided shouldRetry returns false', async () => {
    const config: RetryConfig = { baseDelay: 100, maxRetries: 3 };
    const retryManager = new RetryManager(config);
    const operation = jest.fn().mockRejectedValue(new Error('non-retry error'));

    await expect(
      retryManager.executeWithRetry(operation, (): boolean => false)
    ).rejects.toThrow('non-retry error');

    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should use the production baseDelay when NODE_ENV is not "test"', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const config: RetryConfig = { baseDelay: 100, maxRetries: 1 };
    const retryManager = new RetryManager(config);
    const operation = jest.fn().
    mockRejectedValueOnce(new Error('oops')).
    mockResolvedValue('success');

    jest.useFakeTimers({ legacyFakeTimers: false });
    const timeoutSpy = jest.spyOn(global, 'setTimeout');

    const promise = retryManager.executeWithRetry(operation, () => true);

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
    const operation = jest.fn().mockRejectedValue("primitive error");
    const shouldRetry = () => true;

    try {
      await retryManager.executeWithRetry(operation, shouldRetry);
    } catch (err) {
      expect(err).toEqual(new Error("Failed after 2 retries. Last error: primitive error"));
    }
  }, 10000); // Increase timeout to 10 seconds

  it('should exit when attempts exceed maxRetries', async () => {
    const config: RetryConfig = { maxRetries: 0 }; // Allow only 1 attempt
    const retryManager = new RetryManager(config);
    const operation = jest.fn().mockRejectedValue(new Error('error'));

    await expect(retryManager.executeWithRetry(operation, () => true)).
    rejects.toThrow('Failed after 0 retries');
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
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const config: RetryConfig = { baseDelay: 100, maxRetries: 3 };
    const retryManager = new RetryManager(config);
    const operation = jest.fn()
    operation.
    mockRejectedValueOnce(new Error('fail 1')).
    mockRejectedValueOnce(new Error('fail 2')).
    mockResolvedValue('success');

    jest.useFakeTimers({ legacyFakeTimers: false });

    const promise = retryManager.executeWithRetry(operation, () => true);

    // In test environment, baseDelay is overridden to 1.
    // Expected delays: first retry: 2ms, second retry: 4ms ~ total 6ms.
    await jest.advanceTimersByTimeAsync(10);
    jest.runAllTimers();

    const result = await promise;
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);

    // Check that log messages have been output for each attempt.
    expect(logSpy).toHaveBeenCalledWith('RetryManager: Attempt 2');
    expect(logSpy).toHaveBeenCalledWith('RetryManager: Attempt 3');

    logSpy.mockRestore();
    jest.useRealTimers();
  });
});