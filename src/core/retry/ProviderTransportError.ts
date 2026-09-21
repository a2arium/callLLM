import type {
    RetryAttemptEvent,
    RetryFailureClass,
    RetryStructuredOutputReason,
    Usage
} from '../../interfaces/UniversalInterfaces.ts';

export type ProviderTransportErrorOptions = {
    message: string;
    cause?: unknown;
    statusCode?: number;
    reason?: string;
    requestId?: string;
    responseId?: string;
    usage?: Usage;
    usageAmbiguous?: boolean;
    costUnresolved?: boolean;
    retryHistory?: RetryAttemptEvent[];
};

/**
 * Typed terminal (or intermediate) transport failure.
 * Distinct from structured-output / model failures so callers can account for
 * clear misses vs usage-ambiguous timeouts.
 */
export class ProviderTransportError extends Error {
    public readonly name = 'ProviderTransportError';
    public readonly code = 'PROVIDER_TRANSPORT_ERROR' as const;
    public readonly retryClass: RetryFailureClass = 'transport';
    public readonly statusCode?: number;
    public readonly reason?: string;
    public readonly requestId?: string;
    public readonly responseId?: string;
    public readonly usage?: Usage;
    public readonly usageAmbiguous: boolean;
    public readonly costUnresolved: boolean;
    public readonly retryHistory: RetryAttemptEvent[];
    public readonly cause?: unknown;

    constructor(options: ProviderTransportErrorOptions) {
        super(options.message);
        this.cause = options.cause;
        this.statusCode = options.statusCode;
        this.reason = options.reason;
        this.requestId = options.requestId;
        this.responseId = options.responseId;
        this.usage = options.usage;
        this.usageAmbiguous = options.usageAmbiguous ?? false;
        this.costUnresolved = options.costUnresolved ?? false;
        this.retryHistory = options.retryHistory ?? [];
        Object.setPrototypeOf(this, new.target.prototype);
    }

    withMessage(message: string, retryHistory?: RetryAttemptEvent[]): ProviderTransportError {
        return new ProviderTransportError({
            message,
            cause: this,
            statusCode: this.statusCode,
            reason: this.reason,
            requestId: this.requestId,
            responseId: this.responseId,
            usage: this.usage,
            usageAmbiguous: this.usageAmbiguous,
            costUnresolved: this.costUnresolved,
            retryHistory: retryHistory ?? this.retryHistory
        });
    }
}

export function isProviderTransportError(error: unknown): error is ProviderTransportError {
    return error instanceof ProviderTransportError;
}

/** Narrow helper for callers that only need the structured-output reason union. */
export type { RetryStructuredOutputReason };
