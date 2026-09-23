import type { RetryAttemptEvent } from '../../interfaces/UniversalInterfaces.ts';

export type ProviderHttpErrorOptions = {
    message: string;
    cause?: unknown;
    /** HTTP status when the provider returned a response (e.g. 400). */
    status?: number;
    /**
     * Provider/SDK error code when supplied (e.g. OpenAI `invalid_request_error`).
     * Distinct from this class's stable discriminant {@link ProviderHttpError.code}.
     */
    providerCode?: string;
    /** Normalized request identity (`requestId` or SDK `request_id`). */
    requestId?: string;
    responseId?: string;
    retryHistory?: RetryAttemptEvent[];
};

/**
 * Terminal wrapper for provider failures that are not retried under the active policy
 * (notably non-retryable HTTP such as 400) and are not structured-output failures.
 *
 * Public contract:
 * - Remains non-retryable; {@link classifyRetryFailure} does not assign a retry class.
 * - Does **not** relabel the failure as transport (`ProviderTransportError`).
 * - Preserves `cause` (the original thrown value) and copies usable `status`,
 *   `providerCode`, and `requestId` when supplied on the original or classification.
 * - Exposes `retryHistory` (often `[]` when the failure was rejected on the first try).
 * - Does not invent usage or infer zero charge from HTTP status.
 */
export class ProviderHttpError extends Error {
    public readonly name = 'ProviderHttpError';
    /** Stable type discriminant (not the provider's API error code). */
    public readonly code = 'PROVIDER_HTTP_ERROR' as const;
    public readonly status?: number;
    /** Alias of {@link status} for callers that read `statusCode`. */
    public readonly statusCode?: number;
    public readonly providerCode?: string;
    public readonly requestId?: string;
    public readonly responseId?: string;
    public readonly retryHistory: RetryAttemptEvent[];
    public readonly cause?: unknown;

    constructor(options: ProviderHttpErrorOptions) {
        super(options.message);
        this.cause = options.cause;
        this.status = options.status;
        this.statusCode = options.status;
        this.providerCode = options.providerCode;
        this.requestId = options.requestId;
        this.responseId = options.responseId;
        this.retryHistory = options.retryHistory ?? [];
        Object.setPrototypeOf(this, new.target.prototype);
    }

    withMessage(message: string, retryHistory?: RetryAttemptEvent[]): ProviderHttpError {
        return new ProviderHttpError({
            message,
            cause: this,
            status: this.status,
            providerCode: this.providerCode,
            requestId: this.requestId,
            responseId: this.responseId,
            retryHistory: retryHistory ?? this.retryHistory
        });
    }
}

export function isProviderHttpError(error: unknown): error is ProviderHttpError {
    return error instanceof ProviderHttpError;
}
