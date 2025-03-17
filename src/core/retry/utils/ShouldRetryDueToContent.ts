import { logger } from '../../../utils/logger';

// Initialize logger for this module
logger.setConfig({ prefix: 'ShouldRetryDueToContent', level: process.env.LOG_LEVEL as any || 'info' });

export const FORBIDDEN_PHRASES: string[] = [
    "I cannot assist with that",
    "I cannot provide that information",
    "I cannot provide this information"
];

type ResponseWithToolCalls = {
    content: string;
    toolCalls?: Array<{
        name: string;
        arguments: Record<string, unknown>;
    }>;
};

/**
 * Checks whether the response content triggers a retry.
 * If the response has tool calls, it's considered valid regardless of content.
 * Otherwise, checks if content is empty/null or contains forbidden phrases.
 *
 * @param response - The response to check, can be a string or a full response object
 * @param threshold - The maximum length (in symbols) for which to check the forbidden phrases. Defaults to 200.
 * @returns true if a retry is needed, false otherwise
 */
export function shouldRetryDueToContent(response: string | ResponseWithToolCalls | null | undefined, threshold: number = 200): boolean {
    logger.debug('[ShouldRetryDueToContent] Checking response:', JSON.stringify(response, null, 2));

    // Handle null/undefined
    if (!response) {
        logger.debug('Response is null/undefined, triggering retry');
        return true;
    }

    // Handle string input (backwards compatibility)
    if (typeof response === 'string') {
        const trimmedContent = response.trim();
        if (!trimmedContent || trimmedContent.length < threshold) {
            logger.debug('String content is empty or too short, triggering retry');
            return true;
        }

        const lowerCaseResponse = response.toLowerCase();
        const hasBlockingPhrase = FORBIDDEN_PHRASES.some(phrase => lowerCaseResponse.includes(phrase.toLowerCase()));
        if (hasBlockingPhrase) {
            logger.debug('Found blocking phrase in string content:', response);
            return true;
        }
        return false;
    }

    // Handle response object
    // If we have tool calls, the response is valid regardless of content
    if (response.toolCalls?.length) {
        logger.debug('Response has tool calls, not triggering retry');
        return false;
    }

    // No tool calls, check content
    const trimmedContent = response.content.trim();

    // If we have a valid response after tool execution, don't retry
    if (trimmedContent && !FORBIDDEN_PHRASES.some(phrase => trimmedContent.toLowerCase().includes(phrase.toLowerCase()))) {
        logger.debug('Response after tool execution is valid');
        return false;
    }

    // For other cases, check content length
    if (!trimmedContent || trimmedContent.length < threshold) {
        logger.debug('Response content is empty or too short, triggering retry');
        return true;
    }

    const lowerCaseContent = trimmedContent.toLowerCase();
    const hasBlockingPhrase = FORBIDDEN_PHRASES.some(phrase => lowerCaseContent.includes(phrase.toLowerCase()));
    if (hasBlockingPhrase) {
        logger.debug('Found blocking phrase in response content:', trimmedContent);
        return true;
    }

    logger.debug('Response is valid');
    return false;
} 