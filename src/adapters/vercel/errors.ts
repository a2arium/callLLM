type ErrorRecord = Record<string, unknown>;

const asRecord = (value: unknown): ErrorRecord | undefined =>
    value !== null && typeof value === 'object' ? value as ErrorRecord : undefined;

const getStatus = (error: unknown): number | undefined => {
    const record = asRecord(error);
    const response = asRecord(record?.response);
    const status = record?.status ?? record?.statusCode ?? response?.status;
    return typeof status === 'number' ? status : undefined;
};

const getMessage = (error: unknown): string => {
    if (error instanceof Error && error.message) return error.message;
    const record = asRecord(error);
    const nestedError = asRecord(record?.error);
    const message = record?.message ?? nestedError?.message;
    return typeof message === 'string' ? message : 'Unknown Vercel AI Gateway error';
};

const getRetryAfter = (error: unknown): number | undefined => {
    const record = asRecord(error);
    const headers = asRecord(record?.headers) ?? asRecord(asRecord(record?.response)?.headers);
    const raw = headers?.['retry-after'];
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
        const seconds = Number(raw);
        return Number.isFinite(seconds) ? seconds : undefined;
    }
    return undefined;
};

export class VercelAdapterError extends Error {
    constructor(
        message: string,
        public readonly cause?: unknown,
        public readonly status?: number
    ) {
        super(message);
        this.name = 'VercelAdapterError';
    }
}

export class VercelAuthError extends VercelAdapterError {
    constructor(message: string, cause?: unknown, status?: number) {
        super(message, cause, status);
        this.name = 'VercelAuthError';
    }
}

export class VercelRateLimitError extends VercelAdapterError {
    constructor(
        message: string,
        public readonly retryAfter?: number,
        cause?: unknown,
        status?: number
    ) {
        super(message, cause, status);
        this.name = 'VercelRateLimitError';
    }
}

export class VercelValidationError extends VercelAdapterError {
    constructor(message: string, cause?: unknown, status?: number) {
        super(message, cause, status);
        this.name = 'VercelValidationError';
    }
}

export class VercelNetworkError extends VercelAdapterError {
    constructor(message: string, cause?: unknown, status?: number) {
        super(message, cause, status);
        this.name = 'VercelNetworkError';
    }
}

export class VercelServiceError extends VercelAdapterError {
    constructor(message: string, cause?: unknown, status?: number) {
        super(message, cause, status);
        this.name = 'VercelServiceError';
    }
}

export const mapVercelError = (error: unknown): VercelAdapterError => {
    if (error instanceof VercelAdapterError) return error;

    const status = getStatus(error);
    const message = getMessage(error);
    const lower = message.toLowerCase();

    if (status === 401 || status === 403 || lower.includes('invalid token') || lower.includes('api key')) {
        return new VercelAuthError(`Authentication error: ${message}`, error, status);
    }
    if (status === 429 || lower.includes('rate limit') || lower.includes('tpm limit')) {
        return new VercelRateLimitError(
            `Rate limit exceeded: ${message}`,
            getRetryAfter(error),
            error,
            status
        );
    }
    if (status === 400 || status === 404 || lower.includes('model does not exist')) {
        return new VercelValidationError(`Invalid request: ${message}`, error, status);
    }
    if (
        lower.includes('econnrefused') ||
        lower.includes('enotfound') ||
        lower.includes('network') ||
        lower.includes('timeout') ||
        lower.includes('timed out')
    ) {
        return new VercelNetworkError(`Network error: ${message}`, error, status);
    }
    if (status !== undefined && status >= 500) {
        return new VercelServiceError(`Vercel AI Gateway service error: ${message}`, error, status);
    }
    return new VercelAdapterError(message, error, status);
};
