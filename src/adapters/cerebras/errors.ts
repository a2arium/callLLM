export class CerebrasAdapterError extends Error {
    constructor(message: string, public cause?: unknown) {
        super(message);
        this.name = 'CerebrasAdapterError';
    }
}

export class CerebrasAuthError extends CerebrasAdapterError {
    constructor(message = 'Invalid API key or authentication error', cause?: unknown) {
        super(message, cause);
        this.name = 'CerebrasAuthError';
    }
}

export class CerebrasRateLimitError extends CerebrasAdapterError {
    constructor(message = 'Rate limit exceeded', cause?: unknown) {
        super(message, cause);
        this.name = 'CerebrasRateLimitError';
    }
}

export class CerebrasNetworkError extends CerebrasAdapterError {
    constructor(message = 'Network error occurred', cause?: unknown) {
        super(message, cause);
        this.name = 'CerebrasNetworkError';
    }
}

export class CerebrasValidationError extends CerebrasAdapterError {
    constructor(message = 'Validation error', cause?: unknown) {
        super(message, cause);
        this.name = 'CerebrasValidationError';
    }
}

export const mapCerebrasError = (error: unknown): CerebrasAdapterError => {
    try {
        // The SDK throws subclasses of APIError with status codes
        const anyErr: any = error as any;
        const status = anyErr?.status || anyErr?.statusCode || anyErr?.response?.status;
        const msg = anyErr?.message || 'Unknown Cerebras error';
        if (status === 401) return new CerebrasAuthError(msg, error);
        if (status === 429) return new CerebrasRateLimitError(msg, error);
        if (status >= 500) return new CerebrasAdapterError(msg, error);
        if (status && status >= 400 && status < 500) return new CerebrasValidationError(msg, error);
        if (msg?.toLowerCase().includes('timeout') || msg?.toLowerCase().includes('network')) return new CerebrasNetworkError(msg, error);
        return new CerebrasAdapterError(msg, error);
    } catch {
        return new CerebrasAdapterError('Unknown error occurred');
    }
};


