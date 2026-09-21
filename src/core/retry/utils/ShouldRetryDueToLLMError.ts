import { logger } from '../../../utils/logger.ts';
import { classifyRetryFailure } from '../classifyRetryFailure.ts';

export {
    RETRYABLE_STATUS_CODES,
    isRetryableStatusCode,
    isNetworkError
} from './networkErrors.ts';

/**
 * Determines if an LLM error should trigger a retry (legacy boolean predicate).
 * Prefer classified RetryManager + resolveRetryPolicy for class-scoped ceilings.
 */
export function shouldRetryDueToLLMError(error: unknown): boolean {
    const log = logger.createLogger({ prefix: 'shouldRetryDueToLLMError' });

    if (!error) return false;

    const classification = classifyRetryFailure(error);
    if (classification.retryClass) {
        log.debug(`Classified as ${classification.retryClass}: ${classification.reason ?? error}`);
        return true;
    }

    if (error instanceof Error) {
        log.debug(`Error not retryable: ${error.message}`);
    }

    return false;
}
