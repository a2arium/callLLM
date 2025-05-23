import { logger } from '../../../utils/logger.ts';

/**
 * List of HTTP status codes that should trigger a retry
 */
export const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/**
 * Determines if a status code should trigger a retry
 * @param statusCode The HTTP status code to check
 * @returns True if the status code should trigger a retry
 */
export function isRetryableStatusCode(statusCode: number): boolean {
    return RETRYABLE_STATUS_CODES.includes(statusCode);
}

/**
 * Determines if an error is network-related and should trigger a retry
 * @param error The error to check
 * @returns True if the error is network-related
 */
export function isNetworkError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('network') ||
        message.includes('connection') ||
        message.includes('socket') ||
        message.includes('econnreset') ||
        message.includes('timeout') ||
        message.includes('timed out');
}

/**
 * Determines if an LLM error should trigger a retry
 * 
 * This function examines errors from LLM API calls to determine if they
 * should trigger a retry, based on status codes and error messages.
 * 
 * @param error The error object from an LLM API call
 * @returns True if the error should trigger a retry
 */
export function shouldRetryDueToLLMError(error: unknown): boolean {
    const log = logger.createLogger({ prefix: 'shouldRetryDueToLLMError' });

    if (!error) return false;

    // Handle status code in error objects from different providers
    if (error instanceof Error) {
        // Extract status code if present in the error
        let statusCode: number | undefined;

        // Handle OpenAI-style errors
        if ('status' in error && typeof (error as any).status === 'number') {
            statusCode = (error as any).status;
            log.debug(`Found status code ${statusCode} in error object`);
        }

        // Handle error messages that contain status codes
        const matches = error.message.match(/(\d{3})/);
        if (matches && matches[1]) {
            statusCode = parseInt(matches[1], 10);
            log.debug(`Extracted status code ${statusCode} from error message`);
        }

        // Check if status code is retryable
        if (statusCode && isRetryableStatusCode(statusCode)) {
            log.debug(`Status code ${statusCode} is retryable`);
            return true;
        }

        // Check for content-triggered retry (already handled in separate function,
        // but included here for completeness)
        if (error.message === "Response content triggered retry") {
            log.debug(`Found content-triggered retry message`);
            return true;
        }

        // Check for network errors
        if (isNetworkError(error)) {
            log.debug(`Detected network error: ${error.message}`);
            return true;
        }

        log.debug(`Error not retryable: ${error.message}`);
    }

    return false;
} 