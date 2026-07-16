import { jest } from '@jest/globals';
import { CallExecutionContext, validateTimeoutMs } from '../../../../../src/core/execution/CallExecutionContext.ts';
import { LLMAbortError, LLMTimeoutError } from '../../../../../src/core/execution/errors.ts';

describe('CallExecutionContext', () => {
  afterEach(() => jest.useRealTimers());

  test.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2_147_483_648])(
    'rejects invalid timeout %p',
    (timeoutMs) => expect(() => validateTimeoutMs(timeoutMs)).toThrow(RangeError)
  );

  test('accepts the documented timeout bounds', () => {
    expect(() => validateTimeoutMs(1)).not.toThrow();
    expect(() => validateTimeoutMs(2_147_483_647)).not.toThrow();
  });

  test('preserves a pre-aborted external reason as the cause', () => {
    const controller = new AbortController();
    const reason = new Error('stop');
    controller.abort(reason);
    const context = new CallExecutionContext({ signal: controller.signal });

    try {
      context.throwIfAborted();
      throw new Error('expected cancellation');
    } catch (error) {
      expect(error).toBeInstanceOf(LLMAbortError);
      expect((error as LLMAbortError).cause).toBe(reason);
      expect((error as LLMAbortError).code).toBe('LLM_ABORTED');
    }
  });

  test('rejects a pending operation with a typed timeout error', async () => {
    jest.useFakeTimers();
    const context = new CallExecutionContext({ timeoutMs: 25 });
    const pending = context.awaitOrAbort(new Promise<never>(() => undefined));
    const assertion = expect(pending).rejects.toMatchObject({
      name: 'LLMTimeoutError', code: 'LLM_TIMEOUT', timeoutMs: 25
    });

    await jest.advanceTimersByTimeAsync(25);
    await assertion;
    expect(context.reason).toBe('timeout');
  });

  test('uses the first cancellation source', async () => {
    jest.useFakeTimers();
    const controller = new AbortController();
    const context = new CallExecutionContext({ signal: controller.signal, timeoutMs: 50 });
    controller.abort('external');
    await jest.advanceTimersByTimeAsync(100);

    expect(() => context.throwIfAborted()).toThrow(LLMAbortError);
    expect(() => context.throwIfAborted()).not.toThrow(LLMTimeoutError);
    expect(context.reason).toBe('cancelled');
  });

  test('commit synchronously wins over a later deadline', async () => {
    jest.useFakeTimers();
    const context = new CallExecutionContext({ timeoutMs: 10 });
    context.beginCommit();
    await jest.advanceTimersByTimeAsync(20);
    expect(() => context.throwIfAborted()).not.toThrow();
    context.complete();
    expect(context.reason).toBe('completed');
  });

  test('observes a late rejection after the public wait is aborted', async () => {
    const controller = new AbortController();
    let rejectLate!: (error: Error) => void;
    const operation = new Promise<never>((_resolve, reject) => { rejectLate = reject; });
    const context = new CallExecutionContext({ signal: controller.signal });
    const waiting = context.awaitOrAbort(operation);
    controller.abort();

    await expect(waiting).rejects.toBeInstanceOf(LLMAbortError);
    rejectLate(new Error('late failure'));
    await Promise.resolve();
  });
});
