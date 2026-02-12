export class VeniceAdapterError extends Error {
    constructor(message: string, public cause?: unknown) {
        super(message);
        this.name = 'VeniceAdapterError';
    }
}

export function mapVeniceError(error: any): Error {
    const status = error?.status || error?.response?.status;
    const message = error?.message || error?.error?.message || 'Unknown Venice error';

    if (status === 401 || status === 403) {
        return new VeniceAdapterError(`Authentication error: ${message}`, error);
    }
    if (status === 429) {
        return new VeniceAdapterError(`Rate limit exceeded: ${message}`, error);
    }
    if (status === 400) {
        return new VeniceAdapterError(`Bad request: ${message}`, error);
    }
    if (status >= 500) {
        return new VeniceAdapterError(`Internal server error: ${message}`, error);
    }
    if (error?.name === 'ENOTFOUND' || error?.name === 'ETIMEDOUT') {
        return new VeniceAdapterError(`Network error: ${message}`, error);
    }

    return new VeniceAdapterError(message, error);
}
