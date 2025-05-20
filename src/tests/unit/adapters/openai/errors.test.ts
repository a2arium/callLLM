import {
    OpenAIResponseAdapterError,
    OpenAIResponseValidationError,
    OpenAIResponseRateLimitError,
    OpenAIResponseAuthError,
    OpenAIResponseNetworkError,
    mapProviderError
} from '../../../../adapters/openai/errors.js';

describe('OpenAI Errors', () => {
    describe('OpenAIResponseAdapterError', () => {
        it('should create a basic error with message', () => {
            const error = new OpenAIResponseAdapterError('Test error');
            expect(error.message).toBe('Test error');
            expect(error.name).toBe('OpenAIResponseAdapterError');
            expect(error.cause).toBeUndefined();
        });

        it('should capture cause error when provided', () => {
            const cause = new Error('Cause message');
            const error = new OpenAIResponseAdapterError('Test error', cause);
            expect(error.message).toBe('Test error: Cause message');
            expect(error.name).toBe('OpenAIResponseAdapterError');
            expect(error.cause).toBe(cause);
        });
    });

    describe('OpenAIResponseValidationError', () => {
        it('should create a validation error with message', () => {
            const error = new OpenAIResponseValidationError('Invalid param');
            expect(error.message).toBe('Invalid param');
            expect(error.name).toBe('OpenAIResponseValidationError');
        });
    });

    describe('OpenAIResponseRateLimitError', () => {
        it('should create a rate limit error with message', () => {
            const error = new OpenAIResponseRateLimitError('Rate limited');
            expect(error.message).toBe('Rate limited');
            expect(error.name).toBe('OpenAIResponseRateLimitError');
            expect(error.retryAfter).toBeUndefined();
        });

        it('should store retryAfter when provided', () => {
            const error = new OpenAIResponseRateLimitError('Rate limited', 30);
            expect(error.message).toBe('Rate limited');
            expect(error.retryAfter).toBe(30);
        });
    });

    describe('OpenAIResponseAuthError', () => {
        it('should create an auth error with message', () => {
            const error = new OpenAIResponseAuthError('Invalid API key');
            expect(error.message).toBe('Invalid API key');
            expect(error.name).toBe('OpenAIResponseAuthError');
        });
    });

    describe('OpenAIResponseNetworkError', () => {
        it('should create a network error with message', () => {
            const error = new OpenAIResponseNetworkError('Connection failed');
            expect(error.message).toBe('Connection failed');
            expect(error.name).toBe('OpenAIResponseNetworkError');
            expect(error.cause).toBeUndefined();
        });

        it('should capture cause error when provided', () => {
            const cause = new Error('Connection refused');
            const error = new OpenAIResponseNetworkError('Connection failed', cause);
            expect(error.message).toBe('Connection failed: Connection refused');
            expect(error.name).toBe('OpenAIResponseNetworkError');
            expect(error.cause).toBe(cause);
        });
    });

    describe('mapProviderError', () => {
        it('should map error containing API key to AuthError', () => {
            const originalError = new Error('Invalid API key provided');
            const mappedError = mapProviderError(originalError);
            expect(mappedError).toBeInstanceOf(OpenAIResponseAuthError);
        });

        it('should map error containing rate limit to RateLimitError', () => {
            const originalError = new Error('rate limit exceeded');
            const mappedError = mapProviderError(originalError);
            expect(mappedError).toBeInstanceOf(OpenAIResponseRateLimitError);
        });

        it('should map network errors correctly', () => {
            const networkErrors = [
                new Error('network error occurred'),
                new Error('ECONNREFUSED'),
                new Error('timeout exceeded')
            ];

            networkErrors.forEach(err => {
                const mappedError = mapProviderError(err);
                expect(mappedError).toBeInstanceOf(OpenAIResponseNetworkError);
                expect(mappedError.cause).toBe(err);
            });
        });

        it('should map validation errors correctly', () => {
            const validationErrors = [
                new Error('validation failed'),
                new Error('invalid parameter')
            ];

            validationErrors.forEach(err => {
                const mappedError = mapProviderError(err);
                expect(mappedError).toBeInstanceOf(OpenAIResponseValidationError);
            });
        });

        it('should wrap other Error instances with OpenAIResponseAdapterError', () => {
            const originalError = new Error('Some other error');
            const mappedError = mapProviderError(originalError);
            expect(mappedError).toBeInstanceOf(OpenAIResponseAdapterError);
            expect(mappedError.message).toBe('Some other error: Some other error');
            expect(mappedError.cause).toBe(originalError);
        });

        it('should handle non-Error values', () => {
            const nonErrors = [
                undefined,
                null,
                'string error',
                123,
                { message: 'error object' }
            ];

            nonErrors.forEach(val => {
                const mappedError = mapProviderError(val);
                expect(mappedError).toBeInstanceOf(OpenAIResponseAdapterError);
                expect(mappedError.message).toBe('Unknown error occurred');
            });
        });
    });
}); 