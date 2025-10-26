import { jest } from '@jest/globals';
import {
    shouldRetryDueToLLMError,
    isRetryableStatusCode,
    isNetworkError,
    RETRYABLE_STATUS_CODES
} from '../../../../../core/retry/utils/ShouldRetryDueToLLMError.ts';

describe('ShouldRetryDueToLLMError', () => {
    describe('isRetryableStatusCode', () => {
        test('should return true for retryable status codes', () => {
            RETRYABLE_STATUS_CODES.forEach(code => {
                expect(isRetryableStatusCode(code)).toBe(true);
            });
        });

        test('should return false for non-retryable status codes', () => {
            const nonRetryableCodes = [200, 201, 400, 401, 403, 404, 422];
            nonRetryableCodes.forEach(code => {
                expect(isRetryableStatusCode(code)).toBe(false);
            });
        });
    });

    describe('isNetworkError', () => {
        test('should detect premature close errors', () => {
            const prematureCloseError = new Error('Invalid response body while trying to fetch: Premature close');
            expect(isNetworkError(prematureCloseError)).toBe(true);
        });

        test('should detect various network errors', () => {
            const networkErrors = [
                'network error occurred',
                'connection refused',
                'socket timeout',
                'ECONNRESET',
                'request timeout',
                'connection timed out',
                'fetch failed',
                'ECONNREFUSED',
                'ENOTFOUND',
                'EHOSTUNREACH',
                'ENETUNREACH',
                'request aborted',
                'stream error',
                'Request timeout'
            ];

            networkErrors.forEach(message => {
                const error = new Error(message);
                expect(isNetworkError(error)).toBe(true);
            });
        });

        test('should not classify non-network errors as network errors', () => {
            const nonNetworkErrors = [
                'Invalid API key',
                'Rate limit exceeded',
                'Model not found',
                'Invalid request format',
                'Authentication failed'
            ];

            nonNetworkErrors.forEach(message => {
                const error = new Error(message);
                expect(isNetworkError(error)).toBe(false);
            });
        });

        test('should be case insensitive', () => {
            const errors = [
                new Error('NETWORK ERROR'),
                new Error('Connection REFUSED'),
                new Error('PREMATURE CLOSE'),
                new Error('FETCH FAILED')
            ];

            errors.forEach(error => {
                expect(isNetworkError(error)).toBe(true);
            });
        });
    });

    describe('shouldRetryDueToLLMError', () => {
        test('should return false for null or undefined errors', () => {
            expect(shouldRetryDueToLLMError(null)).toBe(false);
            expect(shouldRetryDueToLLMError(undefined)).toBe(false);
        });

        test('should retry for retryable status codes', () => {
            RETRYABLE_STATUS_CODES.forEach(statusCode => {
                const error = new Error(`API error ${statusCode}`) as any;
                error.status = statusCode;
                expect(shouldRetryDueToLLMError(error)).toBe(true);
            });
        });

        test('should retry for status codes extracted from error messages', () => {
            const error = new Error('Request failed with status 429');
            expect(shouldRetryDueToLLMError(error)).toBe(true);
        });

        test('should not retry for non-retryable status codes', () => {
            const nonRetryableCodes = [200, 400, 401, 403, 404, 422];
            nonRetryableCodes.forEach(statusCode => {
                const error = new Error(`API error ${statusCode}`) as any;
                error.status = statusCode;
                expect(shouldRetryDueToLLMError(error)).toBe(false);
            });
        });

        test('should retry for content-triggered retry errors', () => {
            const error = new Error('Response content triggered retry');
            expect(shouldRetryDueToLLMError(error)).toBe(true);
        });

        test('should retry for content-triggered retry errors with content snippet', () => {
            const error = new Error('Response content triggered retry. First 255 chars: Lorem ipsum dolor sit amet...');
            expect(shouldRetryDueToLLMError(error)).toBe(true);
        });

        test('should retry for network errors including premature close', () => {
            const networkErrors = [
                'Invalid response body while trying to fetch https://api.openai.com/v1/responses: Premature close',
                'network timeout',
                'connection refused',
                'ECONNRESET',
                'fetch failed',
                'request aborted',
                'stream error'
            ];

            networkErrors.forEach(message => {
                const error = new Error(message);
                expect(shouldRetryDueToLLMError(error)).toBe(true);
            });
        });

        test('should not retry for non-network API errors', () => {
            const apiErrors = [
                'Invalid API key',
                'Model not found',
                'Invalid request format',
                'Authentication failed',
                'Content policy violation'
            ];

            apiErrors.forEach(message => {
                const error = new Error(message);
                expect(shouldRetryDueToLLMError(error)).toBe(false);
            });
        });

        test('should handle the exact error from user report', () => {
            // This is the exact error pattern from the user's report
            const error = new Error('Invalid response body while trying to fetch https://api.openai.com/v1/responses: Premature close') as any;
            error.type = 'system';
            error.errno = 'ERR_STREAM_PREMATURE_CLOSE';
            error.code = 'ERR_STREAM_PREMATURE_CLOSE';

            expect(shouldRetryDueToLLMError(error)).toBe(true);
        });

        test('should handle error objects without status', () => {
            const error = new Error('Some generic error');
            expect(shouldRetryDueToLLMError(error)).toBe(false);
        });

        test('should handle error objects with invalid status', () => {
            const error = new Error('Some error') as any;
            error.status = 'not-a-number';
            expect(shouldRetryDueToLLMError(error)).toBe(false);
        });
    });
}); 