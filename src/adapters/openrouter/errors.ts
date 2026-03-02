export class OpenRouterAdapterError extends Error {
    constructor(message: string, public cause?: unknown) {
        super(message);
        this.name = 'OpenRouterAdapterError';
    }
}

export function mapOpenRouterError(error: any): Error {
    const status = error?.statusCode || error?.status || error?.response?.status;
    const message = error?.message || error?.error?.message || 'Unknown OpenRouter error';

    if (status === 401 || status === 403) {
        return new OpenRouterAdapterError(`Authentication error: ${message}`, error);
    }
    if (status === 429) {
        return new OpenRouterAdapterError(`Rate limit exceeded: ${message}`, error);
    }
    if (status === 400) {
        return new OpenRouterAdapterError(`Bad request: ${message}`, error);
    }
    if (status === 402) {
        return new OpenRouterAdapterError(`Insufficient credits: ${message}`, error);
    }
    if (status === 503) {
        return new OpenRouterAdapterError(`Model unavailable: ${message}`, error);
    }
    if (status >= 500) {
        return new OpenRouterAdapterError(`Internal server error: ${message}`, error);
    }
    if (error?.name === 'ENOTFOUND' || error?.name === 'ETIMEDOUT') {
        return new OpenRouterAdapterError(`Network error: ${message}`, error);
    }

    return new OpenRouterAdapterError(message, error);
}
