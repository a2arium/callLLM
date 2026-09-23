import {
    mapVercelError,
    VercelAdapterError,
    VercelAuthError,
    VercelNetworkError,
    VercelRateLimitError,
    VercelServiceError,
    VercelValidationError
} from '@/adapters/vercel/errors.ts';
import { classifyRetryFailure } from '@/core/retry/classifyRetryFailure.ts';
import { shouldRetryDueToLLMError } from '@/core/retry/utils/ShouldRetryDueToLLMError.ts';

describe('Vercel errors', () => {
    it.each([
        [{ status: 401, message: 'Invalid token' }, VercelAuthError],
        [{ status: 400, message: 'Bad parameters' }, VercelValidationError],
        [{ status: 503, message: 'Overloaded' }, VercelServiceError],
        [new Error('network timeout'), VercelNetworkError],
        [new Error('other'), VercelAdapterError]
    ])('maps %p to the expected error class', (input, ExpectedError) => {
        expect(mapVercelError(input)).toBeInstanceOf(ExpectedError);
    });

    it('preserves retry-after seconds for rate limits', () => {
        const error = mapVercelError({
            status: 429,
            message: 'TPM limit reached',
            headers: { 'retry-after': '12' }
        });

        expect(error).toBeInstanceOf(VercelRateLimitError);
        expect((error as VercelRateLimitError).retryAfter).toBe(12);
        expect(error.status).toBe(429);
    });

    it('preserves HTTP status on mapped service errors so retries can classify', () => {
        const error = mapVercelError({
            status: 503,
            message: 'Service temporarily unavailable. Please try again shortly.'
        });

        expect(error).toBeInstanceOf(VercelServiceError);
        expect(error.status).toBe(503);
        expect(error.message).not.toMatch(/\b503\b/);
        expect(classifyRetryFailure(error)).toMatchObject({
            retryClass: 'transport',
            reason: 'http_503',
            statusCode: 503
        });
        expect(shouldRetryDueToLLMError(error)).toBe(true);
    });
});
