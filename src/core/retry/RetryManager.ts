import type { LLMExecutionControl } from '../../interfaces/ExecutionInterfaces.ts';
import type { RetryAttemptEvent } from '../../interfaces/UniversalInterfaces.ts';
import { LLMAbortError, isLLMCancellationError } from '../execution/errors.ts';
import { isStructuredOutputError } from '../processors/StructuredOutputError.ts';
import { classifyRetryFailure } from './classifyRetryFailure.ts';
import {
    isProviderTransportError,
    ProviderTransportError
} from './ProviderTransportError.ts';
import type { ResolvedRetryPolicy } from './resolveRetryPolicy.ts';
import type { RetryStructuredOutputReason } from '../../interfaces/UniversalInterfaces.ts';

/**
 * Legacy ctor config for callers that still use the boolean-predicate overload
 * (MCP, image adapters, older tests).
 */
export type RetryConfig = {
    baseDelay?: number;
    maxRetries?: number;
    retryableStatusCodes?: number[];
};

export type ClassifiedRetryOptions = {
    policy: ResolvedRetryPolicy;
    operationId: string;
    onRetryAttempt?: (event: RetryAttemptEvent) => void;
    control?: LLMExecutionControl;
};

/**
 * RetryManager executes an async operation with either:
 * - legacy flat maxRetries + boolean shouldRetry predicate, or
 * - class-scoped ceilings from {@link ResolvedRetryPolicy}.
 */
export class RetryManager {
    constructor(private config: RetryConfig = {}) { }

    async executeWithRetry<T>(
        operation: () => Promise<T>,
        shouldRetry: (error: unknown) => boolean,
        control?: LLMExecutionControl
    ): Promise<T>;
    async executeWithRetry<T>(
        operation: () => Promise<T>,
        options: ClassifiedRetryOptions
    ): Promise<T>;
    async executeWithRetry<T>(
        operation: () => Promise<T>,
        shouldRetryOrOptions: ((error: unknown) => boolean) | ClassifiedRetryOptions,
        control?: LLMExecutionControl
    ): Promise<T> {
        if (typeof shouldRetryOrOptions === 'function') {
            return this.executeLegacy(operation, shouldRetryOrOptions, control);
        }
        return this.executeClassified(operation, shouldRetryOrOptions);
    }

    private async executeLegacy<T>(
        operation: () => Promise<T>,
        shouldRetry: (error: unknown) => boolean,
        control?: LLMExecutionControl
    ): Promise<T> {
        let attempt = 0;
        let lastError: unknown;
        const maxRetries = this.config.maxRetries ?? 3;

        while (attempt <= maxRetries) {
            try {
                throwIfAborted(control?.signal);
                if (attempt > 0) {
                    let retryReason = 'Unknown reason';
                    if (lastError instanceof Error) {
                        retryReason = lastError.message;
                    } else if (typeof lastError === 'string') {
                        retryReason = lastError;
                    }
                    console.log(`RetryManager: Attempt ${attempt + 1} - Reason: ${retryReason}`);
                }
                return await operation();
            } catch (error) {
                if (isLLMCancellationError(error) || control?.signal?.aborted) {
                    throw cancellationReason(control?.signal, error);
                }
                lastError = error;
                if (!shouldRetry(error)) break;

                attempt++;
                const baseDelay = process.env.NODE_ENV === 'test' ? 1 : (this.config.baseDelay ?? 1000);
                const delay = baseDelay * Math.pow(2, attempt);
                await abortableDelay(delay, control?.signal);
            }
        }

        throwTerminal(lastError, attempt);
    }

    private async executeClassified<T>(
        operation: () => Promise<T>,
        options: ClassifiedRetryOptions
    ): Promise<T> {
        const { policy, operationId, onRetryAttempt, control } = options;
        const counters = {
            transport: 0,
            structuredOutput: 0,
            content: 0
        };
        const retryHistory: RetryAttemptEvent[] = [];
        let attemptIndex = 0;
        let lastError: unknown;
        let lastClassification = classifyRetryFailure(undefined);

        // Loop until success or no class has remaining budget for the failure.
        // Ceiling N means N retries after the first try for that class.
        for (; ;) {
            try {
                throwIfAborted(control?.signal);
                if (attemptIndex > 0) {
                    let retryReason = 'Unknown reason';
                    if (lastError instanceof Error) {
                        retryReason = lastError.message;
                    } else if (typeof lastError === 'string') {
                        retryReason = lastError;
                    }
                    console.log(`RetryManager: Attempt ${attemptIndex + 1} - Reason: ${retryReason}`);
                }
                return await operation();
            } catch (error) {
                if (isLLMCancellationError(error) || control?.signal?.aborted) {
                    throw cancellationReason(control?.signal, error);
                }

                lastError = error;
                lastClassification = classifyRetryFailure(error, {
                    retryableStatusCodes: policy.transport.retryableStatusCodes
                });

                const retryClass = lastClassification.retryClass;
                if (!retryClass) {
                    break;
                }

                if (retryClass === 'structuredOutput') {
                    const reason = lastClassification.reason as RetryStructuredOutputReason | undefined;
                    if (
                        reason &&
                        !policy.structuredOutput.retryReasons.includes(reason)
                    ) {
                        break;
                    }
                    if (counters.structuredOutput >= policy.structuredOutput.maxRetries) {
                        break;
                    }
                } else if (retryClass === 'content') {
                    if (!policy.content.enabled || counters.content >= policy.content.maxRetries) {
                        break;
                    }
                } else if (retryClass === 'transport') {
                    if (counters.transport >= policy.transport.maxRetries) {
                        break;
                    }
                }

                counters[retryClass]++;
                const baseDelay =
                    process.env.NODE_ENV === 'test' ? 1 : policy.transport.baseDelayMs;
                const delay = baseDelay * Math.pow(2, counters[retryClass]);

                const event: RetryAttemptEvent = {
                    operationId,
                    attemptIndex,
                    retryClass,
                    reason: lastClassification.reason,
                    statusCode: lastClassification.statusCode,
                    requestId: lastClassification.requestId,
                    responseId: lastClassification.responseId,
                    delayMs: delay,
                    usage: lastClassification.usage,
                    usageAmbiguous: lastClassification.usageAmbiguous,
                    costUnresolved: lastClassification.costUnresolved
                };
                retryHistory.push(event);
                onRetryAttempt?.(event);

                attemptIndex++;
                await abortableDelay(delay, control?.signal);
            }
        }

        throwClassifiedTerminal(lastError, lastClassification, retryHistory, attemptIndex);
    }
}

function throwTerminal(lastError: unknown, attempt: number): never {
    if (isStructuredOutputError(lastError)) {
        if (attempt === 0) {
            throw lastError.withMessage(
                `Operation failed without retrying (non-retryable error). Error: ${lastError.message}`
            );
        }
        throw lastError.withMessage(
            `Failed after ${attempt - 1} retries. Last error: ${lastError.message}. (Hint: Increase 'maxRetries' in settings if needed)`
        );
    }
    if (attempt === 0) {
        throw new Error(
            `Operation failed without retrying (non-retryable error). Error: ${(lastError instanceof Error) ? lastError.message : lastError}`
        );
    }
    throw new Error(
        `Failed after ${attempt - 1} retries. Last error: ${(lastError instanceof Error) ? lastError.message : lastError}. (Hint: Increase 'maxRetries' in settings if needed)`
    );
}

function throwClassifiedTerminal(
    lastError: unknown,
    classification: ReturnType<typeof classifyRetryFailure>,
    retryHistory: RetryAttemptEvent[],
    attemptIndex: number
): never {
    const retriesAttempted = retryHistory.length;
    const hint = 'Hint: Increase class ceilings in settings.retryPolicy (or legacy maxRetries) if needed';

    if (isStructuredOutputError(lastError)) {
        const message =
            retriesAttempted === 0
                ? `Operation failed without retrying (non-retryable error). Error: ${lastError.message}`
                : `Failed after ${retriesAttempted} retries. Last error: ${lastError.message}. (${hint})`;
        throw lastError.withMessage(message, retryHistory);
    }

    if (isProviderTransportError(lastError) || classification.retryClass === 'transport') {
        const base = isProviderTransportError(lastError)
            ? lastError
            : new ProviderTransportError({
                message: lastError instanceof Error ? lastError.message : String(lastError),
                cause: lastError,
                statusCode: classification.statusCode,
                reason: classification.reason,
                requestId: classification.requestId,
                responseId: classification.responseId,
                usage: classification.usage,
                usageAmbiguous: classification.usageAmbiguous,
                costUnresolved: classification.costUnresolved
            });
        const message =
            retriesAttempted === 0
                ? `Operation failed without retrying (non-retryable error). Error: ${base.message}`
                : `Failed after ${retriesAttempted} retries. Last error: ${base.message}. (${hint})`;
        throw base.withMessage(message, retryHistory);
    }

    if (retriesAttempted === 0) {
        throw new Error(
            `Operation failed without retrying (non-retryable error). Error: ${(lastError instanceof Error) ? lastError.message : lastError}`
        );
    }
    throw new Error(
        `Failed after ${retriesAttempted} retries. Last error: ${(lastError instanceof Error) ? lastError.message : lastError}. (${hint})`
    );
}

function cancellationReason(signal?: AbortSignal, fallback?: unknown): Error {
    if (isLLMCancellationError(signal?.reason)) return signal.reason;
    if (isLLMCancellationError(fallback)) return fallback;
    return new LLMAbortError('LLM operation was aborted', { cause: signal?.reason ?? fallback });
}

function throwIfAborted(signal?: AbortSignal): void {
    if (signal?.aborted) throw cancellationReason(signal);
}

function abortableDelay(delay: number, signal?: AbortSignal): Promise<void> {
    throwIfAborted(signal);
    if (!signal) return new Promise(resolve => setTimeout(resolve, delay));

    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            signal.removeEventListener('abort', onAbort);
            resolve();
        }, delay);
        const onAbort = (): void => {
            clearTimeout(timer);
            signal.removeEventListener('abort', onAbort);
            reject(cancellationReason(signal));
        };
        signal.addEventListener('abort', onAbort, { once: true });
    });
}
