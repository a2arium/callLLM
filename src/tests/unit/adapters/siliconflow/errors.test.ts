import {
    mapSiliconFlowError,
    SiliconFlowAdapterError,
    SiliconFlowAuthError,
    SiliconFlowNetworkError,
    SiliconFlowRateLimitError,
    SiliconFlowServiceError,
    SiliconFlowValidationError
} from '@/adapters/siliconflow/errors.ts';

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
    });
});
