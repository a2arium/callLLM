import { logger } from '../../../utils/logger.ts';

// Initialize logger for this module
const log = logger.createLogger({ prefix: 'ShouldRetryDueToContent', level: process.env.LOG_LEVEL as any || 'info' });

export const FORBIDDEN_PHRASES: string[] = [
    "I cannot assist with that",
    "I cannot provide that information",
    "I cannot provide this information",
    "Invalid prompt",
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

export type ContentRetryResult = {
    shouldRetry: boolean;
    reason?: string;
};

/**
 * Checks whether the response content triggers a retry.
 * If the response has tool calls, it's considered valid regardless of content.
 * If the response is JSON, it's considered valid regardless of length.
 * Otherwise, checks if content is empty/null or contains forbidden phrases.
 *
 * @param response - The response to check, can be a string or a full response object
 * @param threshold - The maximum length (in symbols) for which to check the forbidden phrases. Defaults to 200.
 * @returns Object indicating if retry is needed and the reason
 */
export function shouldRetryDueToContent(response: string | ResponseWithToolCalls | null | undefined, threshold: number = 200): ContentRetryResult {
    log.debug('Checking response:', JSON.stringify(response, null, 2));

    // Handle null/undefined
    if (response === null || response === undefined) {
        log.debug('Response is null/undefined, triggering retry');
        return { shouldRetry: true, reason: 'Response is null or undefined' };
    }

    // Handle string input (backwards compatibility)
    if (typeof response === 'string') {
        const trimmedContent = response.trim();

        // Empty strings need special handling - they might be valid in some contexts (like tool calls)
        // but we can't determine that from just the string
        if (trimmedContent === '') {
            log.debug('String content is empty, triggering retry');
            return { shouldRetry: true, reason: 'Response content is empty' };
        }

        // If it looks like JSON, don't apply the length threshold
        if (isLikelyJSON(trimmedContent)) {
            log.debug('Response looks like JSON, not triggering retry');
            return { shouldRetry: false };
        }

        const lowerCaseResponse = response.toLowerCase();
        const hasBlockingPhrase = FORBIDDEN_PHRASES.some(phrase => lowerCaseResponse.includes(phrase.toLowerCase()));
        if (trimmedContent.length < threshold) {
            log.debug('String content is too short, triggering retry');
            const lengthReason = `Response content is too short (${trimmedContent.length} < ${threshold})`;
            if (hasBlockingPhrase) {
                return { shouldRetry: true, reason: `Response contains a forbidden phrase; ${lengthReason}` };
            }
            return { shouldRetry: true, reason: lengthReason };
        }

        // Skip forbidden phrase check for long responses
        if (response.length > 1000) {
            return { shouldRetry: false };
        }

        if (hasBlockingPhrase) {
            log.debug('Found blocking phrase in string content:', response);
            return { shouldRetry: true, reason: 'Response contains a forbidden phrase' };
        }
        return { shouldRetry: false };
    }

    // Handle response object - must have content property at minimum
    if (!('content' in response)) {
        log.debug('Response object missing content property, triggering retry');
        return { shouldRetry: true, reason: 'Response object missing content property' };
    }

    // If model indicates tool_calls finish reason, do not retry based on content
    // This allows the tool orchestration loop to proceed without spurious retries
    try {
        const meta: any = (response as any).metadata;
        const finishReason = meta?.finishReason || meta?.finish_reason;
        if (finishReason === 'tool_calls') {
            log.debug('Finish reason is tool_calls, not triggering retry');
            return { shouldRetry: false };
        }
    } catch {
        // ignore metadata parsing errors
    }

    // If we have tool calls, the response is valid regardless of content
    if (response.toolCalls && response.toolCalls.length > 0) {
        log.debug('Response has tool calls, not triggering retry');
        return { shouldRetry: false };
    }

    // No tool calls, check content
    const trimmedContent = response.content?.trim() ?? '';

    // If it looks like JSON, don't apply the length threshold
    if (isLikelyJSON(trimmedContent)) {
        log.debug('Response looks like JSON, not triggering retry');
        return { shouldRetry: false };
    }

    const lowerCaseContent = trimmedContent.toLowerCase();
    const hasBlockingPhrase = FORBIDDEN_PHRASES.some(phrase => lowerCaseContent.includes(phrase.toLowerCase()));

    if (hasBlockingPhrase) {
        log.debug('Found blocking phrase in response content:', trimmedContent);
        const lengthReason = !trimmedContent
            ? 'Response content is empty'
            : trimmedContent.length < threshold
                ? `Response content is too short (${trimmedContent.length} < ${threshold})`
                : undefined;

        const reason = lengthReason
            ? `Response contains a forbidden phrase; ${lengthReason}`
            : 'Response contains a forbidden phrase';

        return { shouldRetry: true, reason };
    }

    if (trimmedContent) {
        log.debug('Response after tool execution is valid');
        return { shouldRetry: false };
    }

    if (!trimmedContent || trimmedContent.length < threshold) {
        log.debug('Response content is empty or too short, triggering retry');
        return { shouldRetry: true, reason: !trimmedContent ? 'Response content is empty' : `Response content is too short (${trimmedContent.length} < ${threshold})` };
    }

    log.debug('Response is valid');
    return { shouldRetry: false };
}
