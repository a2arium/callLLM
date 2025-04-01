import { AdapterError } from '../base/baseAdapter';

export class OpenAIResponseAdapterError extends AdapterError {
    cause?: Error;

    constructor(message: string, cause?: Error) {
        super(message);
        this.name = 'OpenAIResponseAdapterError';

        // Capture the cause for better error handling
        if (cause) {
            this.cause = cause;
            // Append the original error message for clarity
            this.message = `${message}: ${cause.message}`;
        }
    }
}

export class OpenAIResponseValidationError extends OpenAIResponseAdapterError {
    constructor(message: string) {
        super(message);
        this.name = 'OpenAIResponseValidationError';
    }
}

export class OpenAIResponseRateLimitError extends OpenAIResponseAdapterError {
    constructor(message: string, retryAfter?: number) {
        super(message);
        this.name = 'OpenAIResponseRateLimitError';
        this.retryAfter = retryAfter;
    }

    retryAfter?: number;
}

export class OpenAIResponseAuthError extends OpenAIResponseAdapterError {
    constructor(message: string) {
        super(message);
        this.name = 'OpenAIResponseAuthError';
    }
}

export class OpenAIResponseNetworkError extends OpenAIResponseAdapterError {
    constructor(message: string, cause?: Error) {
        super(message, cause);
        this.name = 'OpenAIResponseNetworkError';
    }
}

// Helper function to map provider-specific errors to our custom error types
export const mapProviderError = (error: unknown): OpenAIResponseAdapterError => {
    // Basic implementation to be expanded in later phases
    if (error instanceof Error) {
        const errorMessage = error.message;

        // Handle API errors based on message patterns or specific error types
        if (errorMessage.includes('API key')) {
            return new OpenAIResponseAuthError('Invalid API key or authentication error');
        } else if (errorMessage.includes('rate limit')) {
            return new OpenAIResponseRateLimitError('Rate limit exceeded');
        } else if (errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout')) {
            return new OpenAIResponseNetworkError('Network error occurred', error);
        } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
            return new OpenAIResponseValidationError(errorMessage);
        }

        // Default case: wrap the original error
        return new OpenAIResponseAdapterError(errorMessage, error);
    }

    // If the error is not an Error instance
    return new OpenAIResponseAdapterError('Unknown error occurred');
}; 