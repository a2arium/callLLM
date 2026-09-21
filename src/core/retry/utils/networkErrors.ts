/**
 * List of HTTP status codes that should trigger a transport retry
 */
export const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/**
 * Determines if a status code should trigger a retry
 */
export function isRetryableStatusCode(statusCode: number, allowed?: number[]): boolean {
    return (allowed ?? RETRYABLE_STATUS_CODES).includes(statusCode);
}

/**
 * Determines if an error is network-related and should trigger a retry
 */
export function isNetworkError(error: Error): boolean {
    const message = error.message.toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ');
    return message.includes('network') ||
        message.includes('connection') ||
        message.includes('socket') ||
        message.includes('econnreset') ||
        message.includes('timeout') ||
        message.includes('timed out') ||
        message.includes('premature close') ||
        message.includes('fetch') ||
        message.includes('econnrefused') ||
        message.includes('enotfound') ||
        message.includes('ehostunreach') ||
        message.includes('enetunreach') ||
        message.includes('aborted') ||
        message.includes('stream') ||
        message.includes('request timeout');
}
