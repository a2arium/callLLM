import { logger } from '../../../utils/logger';

// Initialize logger for this module
const log = logger.createLogger({ prefix: 'ShouldRetryDueToContent', level: process.env.LOG_LEVEL as any || 'info' });

export const FORBIDDEN_PHRASES: string[] = [
    "I cannot assist with that",
    "I cannot provide that information",
    "I cannot provide this information"
];

type ResponseWithToolCalls = {
    content: string | null;
    toolCalls?: Array<{
        name: string;
        arguments: Record<string, unknown>;
    }>;
};

/**
 * Checks whether a string content looks like valid JSON
 * @param content - The string content to check
 * @returns true if the content looks like valid JSON
 */
function isLikelyJSON(content: string): boolean {
    const trimmed = content.trim();
    // Check if it starts with { and ends with }
    return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'));
}

/**
 * Checks whether the response content triggers a retry.
 * If the response has tool calls, it's considered valid regardless of content.
 * If the response is JSON, it's considered valid regardless of length.
 * Otherwise, checks if content is empty/null or contains forbidden phrases.
 *
 * @param response - The response to check, can be a string or a full response object
 * @param threshold - The maximum length (in symbols) for which to check the forbidden phrases. Defaults to 200.
 * @returns true if a retry is needed, false otherwise
 */
export function shouldRetryDueToContent(response: string | ResponseWithToolCalls | null | undefined, threshold: number = 200): boolean {
    log.debug('Checking response:', JSON.stringify(response, null, 2));

    // Handle null/undefined
    if (response === null || response === undefined) {
        log.debug('Response is null/undefined, triggering retry');
        return true;
    }

    // Handle string input (backwards compatibility)
    if (typeof response === 'string') {
        const trimmedContent = response.trim();

        // Empty strings need special handling - they might be valid in some contexts (like tool calls)
        // but we can't determine that from just the string
        if (trimmedContent === '') {
            log.debug('String content is empty, triggering retry');
            return true;
        }

        // If it looks like JSON, don't apply the length threshold
        if (isLikelyJSON(trimmedContent)) {
            log.debug('Response looks like JSON, not triggering retry');
            return false;
        }

        if (trimmedContent.length < threshold) {
            log.debug('String content is too short, triggering retry');
            return true;
        }

        const lowerCaseResponse = response.toLowerCase();
        const hasBlockingPhrase = FORBIDDEN_PHRASES.some(phrase => lowerCaseResponse.includes(phrase.toLowerCase()));
        if (hasBlockingPhrase) {
            log.debug('Found blocking phrase in string content:', response);
            return true;
        }
        return false;
    }

    // Handle response object - must have content property at minimum
    if (!('content' in response)) {
        log.debug('Response object missing content property, triggering retry');
        return true;
    }

    // If we have tool calls, the response is valid regardless of content
    if (response.toolCalls && response.toolCalls.length > 0) {
        log.debug('Response has tool calls, not triggering retry');
        return false;
    }

    // No tool calls, check content
    const trimmedContent = response.content?.trim() ?? '';

    // If it looks like JSON, don't apply the length threshold
    if (isLikelyJSON(trimmedContent)) {
        log.debug('Response looks like JSON, not triggering retry');
        return false;
    }

    // If we have a valid response after tool execution, don't retry
    if (trimmedContent && !FORBIDDEN_PHRASES.some(phrase => trimmedContent.toLowerCase().includes(phrase.toLowerCase()))) {
        log.debug('Response after tool execution is valid');
        return false;
    }

    // For other cases, check content length
    if (!trimmedContent || trimmedContent.length < threshold) {
        log.debug('Response content is empty or too short, triggering retry');
        return true;
    }

    const lowerCaseContent = trimmedContent.toLowerCase();
    const hasBlockingPhrase = FORBIDDEN_PHRASES.some(phrase => lowerCaseContent.includes(phrase.toLowerCase()));
    if (hasBlockingPhrase) {
        log.debug('Found blocking phrase in response content:', trimmedContent);
        return true;
    }

    log.debug('Response is valid');
    return false;
} 