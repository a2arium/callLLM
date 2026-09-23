import { AdapterError } from '../base/baseAdapter.ts';

/**
 * Bounded SDK identity fields copied onto adapter wrappers.
 * Does not retain response bodies or header bags.
 */
export type OpenAIAdapterProviderIdentity = {
    status?: number;
    providerCode?: string;
    requestId?: string;
};

function readSdkIdentity(cause: Error): OpenAIAdapterProviderIdentity {
    const src = cause as Error & {
        status?: unknown;
        code?: unknown;
        requestID?: unknown;
        requestId?: unknown;
        request_id?: unknown;
    };
    const status = typeof src.status === 'number' ? src.status : undefined;
    const providerCode = typeof src.code === 'string' ? src.code : undefined;
    const requestId =
        typeof src.requestID === 'string'
            ? src.requestID
            : typeof src.requestId === 'string'
              ? src.requestId
              : typeof src.request_id === 'string'
                ? src.request_id
                : undefined;
    return { status, providerCode, requestId };
}

/**
 * Attach the original SDK/provider error as `cause` and copy bounded identity
 * fields (`status`, provider `code` → `providerCode`, `requestID`/`requestId`/`request_id`).
 * Does not log or retain unrestricted request/response bodies or headers.
 */
export function attachSdkCause<T extends OpenAIResponseAdapterError>(
    target: T,
    cause: Error
): T {
    target.cause = cause;
    const identity = readSdkIdentity(cause);
    if (identity.status !== undefined) {
        target.status = identity.status;
    }
    if (identity.providerCode !== undefined) {
        target.providerCode = identity.providerCode;
    }
    if (identity.requestId !== undefined) {
        target.requestId = identity.requestId;
    }
    return target;
}

export class OpenAIResponseAdapterError extends AdapterError {
    cause?: Error;
    status?: number;
    providerCode?: string;
    requestId?: string;

    constructor(message: string, cause?: Error) {
        super(message);
        this.name = 'OpenAIResponseAdapterError';

        // Capture the cause for better error handling
        if (cause) {
            attachSdkCause(this, cause);
            // Append the original error message for clarity on generic wraps
            this.message = `${message}: ${cause.message}`;
        }
    }
}

export class OpenAIResponseValidationError extends OpenAIResponseAdapterError {
    constructor(message: string, cause?: Error) {
        // Avoid double-appending the SDK message (chatCall already passes error.message).
        super(message);
        this.name = 'OpenAIResponseValidationError';
        if (cause) {
            attachSdkCause(this, cause);
        }
    }
}

export class OpenAIResponseRateLimitError extends OpenAIResponseAdapterError {
    constructor(message: string, retryAfter?: number, cause?: Error) {
        super(message);
        this.name = 'OpenAIResponseRateLimitError';
        this.retryAfter = retryAfter;
        if (cause) {
            attachSdkCause(this, cause);
        }
    }

    retryAfter?: number;
}

export class OpenAIResponseAuthError extends OpenAIResponseAdapterError {
    constructor(message: string, cause?: Error) {
        super(message);
        this.name = 'OpenAIResponseAuthError';
        if (cause) {
            attachSdkCause(this, cause);
        }
    }
}

export class OpenAIResponseNetworkError extends OpenAIResponseAdapterError {
    constructor(message: string, cause?: Error) {
        super(message);
        this.name = 'OpenAIResponseNetworkError';
        if (cause) {
            // Keep historical message append for network wraps.
            this.message = `${message}: ${cause.message}`;
            attachSdkCause(this, cause);
        }
    }
}

/**
 * Error thrown when the OpenAI service fails with a 5xx error
 */
export class OpenAIResponseServiceError extends OpenAIResponseAdapterError {
    constructor(message: string, cause?: Error) {
        super(message);
        this.name = 'OpenAIResponseServiceError';
        if (cause) {
            this.message = `${message}: ${cause.message}`;
            attachSdkCause(this, cause);
        }
    }
}

// Helper function to map provider-specific errors to our custom error types
export const mapProviderError = (error: unknown): OpenAIResponseAdapterError => {
    // Basic implementation to be expanded in later phases
    if (error instanceof Error) {
        const errorMessage = error.message;

        // Handle API errors based on message patterns or specific error types
        if (errorMessage.includes('API key')) {
            return new OpenAIResponseAuthError('Invalid API key or authentication error', error);
        } else if (errorMessage.includes('rate limit')) {
            return new OpenAIResponseRateLimitError('Rate limit exceeded', undefined, error);
        } else if (errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout')) {
            return new OpenAIResponseNetworkError('Network error occurred', error);
        } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
            return new OpenAIResponseValidationError(errorMessage, error);
        }

        // Default case: wrap the original error
        return new OpenAIResponseAdapterError(errorMessage, error);
    }

    // If the error is not an Error instance
    return new OpenAIResponseAdapterError('Unknown error occurred');
};
