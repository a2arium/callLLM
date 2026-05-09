export class GeminiAdapterError extends Error {
    constructor(message: string, public cause?: unknown) {
        super(message);
        this.name = 'GeminiAdapterError';
    }
}

export class GeminiAuthError extends GeminiAdapterError {
    constructor(message = 'Invalid API key or authentication error', cause?: unknown) {
        super(message, cause);
        this.name = 'GeminiAuthError';
    }
}

export class GeminiRateLimitError extends GeminiAdapterError {
    constructor(message = 'Rate limit exceeded', cause?: unknown) {
        super(message, cause);
        this.name = 'GeminiRateLimitError';
    }
}

export class GeminiNetworkError extends GeminiAdapterError {
    constructor(message = 'Network error occurred', cause?: unknown) {
        super(message, cause);
        this.name = 'GeminiNetworkError';
    }
}

export class GeminiValidationError extends GeminiAdapterError {
    constructor(message = 'Validation error', cause?: unknown) {
        super(message, cause);
        this.name = 'GeminiValidationError';
    }
}

export const mapGeminiError = (error: unknown): GeminiAdapterError => {
    try {
        const err = error as Record<string, unknown>;
        const status = (err?.status ?? err?.statusCode ?? (err?.response as Record<string, unknown>)?.status) as number | undefined;
        const message = (err?.message ?? 'Unknown Gemini error') as string;

        if (status === 401 || status === 403) return new GeminiAuthError(message, error);
        if (status === 429) return new GeminiRateLimitError(message, error);
        if (status === 503) return new GeminiRateLimitError(message, error);
        if (status && status >= 500) return new GeminiAdapterError(message, error);
        if (status && status >= 400 && status < 500) return new GeminiValidationError(message, error);
        if (message?.toLowerCase().includes('timeout') || message?.toLowerCase().includes('network') || message?.toLowerCase().includes('econnrefused')) {
            return new GeminiNetworkError(message, error);
        }
        return new GeminiAdapterError(message, error);
    } catch {
        return new GeminiAdapterError('Unknown error occurred');
    }
};
