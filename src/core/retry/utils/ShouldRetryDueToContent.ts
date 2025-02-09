export const FORBIDDEN_PHRASES: string[] = [
    "I cannot assist with that",
    "I cannot provide that information",
    "I cannot provide this information"
];

/**
 * Checks whether the response content triggers a retry.
 * If the response is short (<= threshold) and includes any forbidden phrase (case-insensitive), returns true.
 *
 * @param response - The response content to check.
 * @param threshold - The maximum length (in symbols) for which to check the forbidden phrases. Defaults to 200.
 * @returns true if a forbidden phrase is found in a short response, false otherwise.
 */
export function shouldRetryDueToContent(response: string, threshold: number = 200): boolean {
    if (response.length <= threshold) {
        const lowerCaseResponse = response.toLowerCase();
        return FORBIDDEN_PHRASES.some(phrase => lowerCaseResponse.includes(phrase.toLowerCase()));
    }
    return false;
} 