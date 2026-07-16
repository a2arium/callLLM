export class LLMAbortError extends Error {
    public readonly code = 'LLM_ABORTED' as const;
    public readonly cause?: unknown;

    constructor(message = 'LLM operation was aborted', options?: { cause?: unknown }) {
        super(message);
        this.name = 'LLMAbortError';
        this.cause = options?.cause;
    }
}

export class LLMTimeoutError extends Error {
    public readonly code = 'LLM_TIMEOUT' as const;
    public readonly timeoutMs: number;
    public readonly cause?: unknown;

    constructor(timeoutMs: number, options?: { cause?: unknown }) {
        super(`LLM operation timed out after ${timeoutMs}ms`);
        this.name = 'LLMTimeoutError';
        this.timeoutMs = timeoutMs;
        this.cause = options?.cause;
    }
}

export function isLLMCancellationError(error: unknown): error is LLMAbortError | LLMTimeoutError {
    return error instanceof LLMAbortError || error instanceof LLMTimeoutError;
}

export function resolveLLMCancellationError(
    error: unknown,
    signal?: AbortSignal
): LLMAbortError | LLMTimeoutError | undefined {
    if (isLLMCancellationError(error)) return error;
    if (!signal?.aborted) return undefined;
    if (isLLMCancellationError(signal.reason)) return signal.reason;
    return new LLMAbortError('LLM operation was aborted', { cause: signal.reason ?? error });
}
