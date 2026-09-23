import {
    mapSiliconFlowError,
    SiliconFlowAdapterError,
    SiliconFlowAuthError,
    SiliconFlowNetworkError,
    SiliconFlowRateLimitError,
    SiliconFlowServiceError,
    SiliconFlowValidationError
} from '@/adapters/siliconflow/errors.ts';
import { classifyRetryFailure } from '@/core/retry/classifyRetryFailure.ts';
import { shouldRetryDueToLLMError } from '@/core/retry/utils/ShouldRetryDueToLLMError.ts';

describe('SiliconFlow errors', () => {
    it.each([
        [{ status: 401, message: 'Invalid token' }, SiliconFlowAuthError],
        [{ status: 400, message: 'Bad parameters' }, SiliconFlowValidationError],
        [{ status: 503, message: 'Overloaded' }, SiliconFlowServiceError],
        [new Error('network timeout'), SiliconFlowNetworkError],
        [new Error('other'), SiliconFlowAdapterError]
    ])('maps %p to the expected error class', (input, ExpectedError) => {
        expect(mapSiliconFlowError(input)).toBeInstanceOf(ExpectedError);
    });

    it('preserves retry-after seconds for rate limits', () => {
        const error = mapSiliconFlowError({
            status: 429,
            message: 'TPM limit reached',
            headers: { 'retry-after': '12' }
        });

        expect(error).toBeInstanceOf(SiliconFlowRateLimitError);
        expect((error as SiliconFlowRateLimitError).retryAfter).toBe(12);
        expect(error.status).toBe(429);
    });

    it('preserves HTTP status on mapped service errors so retries can classify', () => {
        const error = mapSiliconFlowError({
            status: 503,
            message: 'Service temporarily unavailable. Please try again shortly.'
        });

        expect(error).toBeInstanceOf(SiliconFlowServiceError);
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
