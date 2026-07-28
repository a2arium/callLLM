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
    return typeof message === 'string' ? message : 'Unknown SiliconFlow error';
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

export class SiliconFlowAdapterError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
        super(message);
        this.name = 'SiliconFlowAdapterError';
    }
}

export class SiliconFlowAuthError extends SiliconFlowAdapterError {
    constructor(message: string, cause?: unknown) {
        super(message, cause);
        this.name = 'SiliconFlowAuthError';
    }
}

export class SiliconFlowRateLimitError extends SiliconFlowAdapterError {
    constructor(message: string, public readonly retryAfter?: number, cause?: unknown) {
        super(message, cause);
        this.name = 'SiliconFlowRateLimitError';
    }
}

export class SiliconFlowValidationError extends SiliconFlowAdapterError {
    constructor(message: string, cause?: unknown) {
        super(message, cause);
        this.name = 'SiliconFlowValidationError';
    }
}

export class SiliconFlowNetworkError extends SiliconFlowAdapterError {
    constructor(message: string, cause?: unknown) {
        super(message, cause);
        this.name = 'SiliconFlowNetworkError';
    }
}

export class SiliconFlowServiceError extends SiliconFlowAdapterError {
    constructor(message: string, cause?: unknown) {
        super(message, cause);
        this.name = 'SiliconFlowServiceError';
    }
}

export const mapSiliconFlowError = (error: unknown): SiliconFlowAdapterError => {
    if (error instanceof SiliconFlowAdapterError) return error;

    const status = getStatus(error);
    const message = getMessage(error);
    const lower = message.toLowerCase();

    if (status === 401 || status === 403 || lower.includes('invalid token') || lower.includes('api key')) {
        return new SiliconFlowAuthError(`Authentication error: ${message}`, error);
    }
    if (status === 429 || lower.includes('rate limit') || lower.includes('tpm limit')) {
        return new SiliconFlowRateLimitError(
            `Rate limit exceeded: ${message}`,
            getRetryAfter(error),
            error
        );
    }
    if (status === 400 || status === 404 || lower.includes('model does not exist')) {
        return new SiliconFlowValidationError(`Invalid request: ${message}`, error);
    }
    if (
        lower.includes('econnrefused') ||
        lower.includes('enotfound') ||
        lower.includes('network') ||
        lower.includes('timeout') ||
        lower.includes('timed out')
    ) {
        return new SiliconFlowNetworkError(`Network error: ${message}`, error);
    }
    if (status !== undefined && status >= 500) {
        return new SiliconFlowServiceError(`SiliconFlow service error: ${message}`, error);
    }
    return new SiliconFlowAdapterError(message, error);
};
