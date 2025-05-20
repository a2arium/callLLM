import { Usage } from '../../interfaces/UniversalInterfaces.js';
import { encoding_for_model } from '@dqbd/tiktoken';

export class TokenCalculator {
    constructor() { }

    public calculateUsage(
        inputTokens: number,
        outputTokens: number,
        inputPricePerMillion: number,
        outputPricePerMillion: number,
        inputCachedTokens: number = 0,
        inputCachedPricePerMillion?: number,
        outputReasoningTokens: number = 0,
        imageInputTokens?: number,
        imageOutputTokens?: number,
        imageInputPricePerMillion?: number,
        imageOutputPricePerMillion?: number
    ): Usage['costs'] {
        // Calculate non-cached input tokens
        const nonCachedInputTokens = (inputCachedTokens && inputCachedPricePerMillion)
            ? inputTokens - inputCachedTokens
            : inputTokens;

        // Calculate input costs
        const regularInputCost = (nonCachedInputTokens * inputPricePerMillion) / 1_000_000;
        const cachedInputCost = (inputCachedTokens && inputCachedPricePerMillion)
            ? (inputCachedTokens * inputCachedPricePerMillion) / 1_000_000
            : 0;

        // Calculate image input costs if provided
        const imageInputCost = (imageInputTokens && imageInputPricePerMillion)
            ? (imageInputTokens * imageInputPricePerMillion) / 1_000_000
            : 0;

        // Total input cost should include regular, cached, and image costs
        const totalInputCost = regularInputCost + cachedInputCost + imageInputCost;

        // Calculate output and reasoning costs
        const outputCost = (outputTokens * outputPricePerMillion) / 1_000_000;
        const outputReasoningCost = (outputReasoningTokens * outputPricePerMillion) / 1_000_000;

        // Calculate image output costs if provided
        const imageOutputCost = (imageOutputTokens && imageOutputPricePerMillion)
            ? (imageOutputTokens * imageOutputPricePerMillion) / 1_000_000
            : 0;

        // Total output cost includes regular output, reasoning, and image output costs
        const totalOutputCost = outputCost + outputReasoningCost + imageOutputCost;

        // Calculate total cost
        const totalCost = totalInputCost + totalOutputCost;

        return {
            input: {
                total: totalInputCost, // Include regular, cached and image input costs
                cached: cachedInputCost,
            },
            output: {
                total: totalOutputCost,
                reasoning: outputReasoningCost,
                image: imageOutputCost,
            },
            total: totalCost
        };
    }

    /**
     * Calculates an estimate of the number of tokens in a given text string.
     * 
     * !!! IMPORTANT - TOKEN COUNT USAGE POLICY !!!
     * 
     * This method should ONLY be used in the following scenarios:
     * 1. For PRE-API CALL estimation when planning request budgets
     * 2. When truncating messages before sending to stay within context limits
     * 3. As a FALLBACK when the API does NOT return token counts
     * 4. For local debugging/testing when API calls aren't made
     * 
     * You MUST ALWAYS use the actual token counts returned by the API when available:
     * - The API's token count is the source of truth for billing
     * - Different models tokenize differently; our estimates may be inaccurate
     * - The API may update tokenization rules without notice
     * - Using estimated counts when actual counts are available can lead to:
     *   - Inaccurate usage tracking
     *   - Incorrect cost calculations
     *   - Misleading analytics
     * 
     * Implementation Note: This method uses tiktoken for GPT-4 when available,
     * but falls back to a heuristic approximation method if tiktoken fails.
     * Neither approach guarantees 100% accuracy compared to the API's count.
     * 
     * @param text The text to count tokens for
     * @returns Estimated token count
     */
    public calculateTokens(text: string): number {
        try {
            const enc = encoding_for_model('gpt-4');
            const tokens = enc.encode(text);
            enc.free();
            return tokens.length;
        } catch (error) {
            console.warn('Failed to calculate tokens, using approximate count:', error);
            // More accurate approximation:
            // 1. Count characters
            // 2. Add extra tokens for whitespace and special characters
            // 3. Add extra tokens for JSON structure if the text looks like JSON
            const charCount = text.length;
            const whitespaceCount = (text.match(/\s/g) || []).length;
            const specialCharCount = (text.match(/[^a-zA-Z0-9\s]/g) || []).length;
            const isJson = text.trim().startsWith('{') || text.trim().startsWith('[');
            const jsonTokens = isJson ? Math.ceil(text.split(/[{}\[\],]/).length) : 0;

            // Use a more conservative estimate:
            // - Divide by 2 instead of 4 for char count
            // - Double the special char count
            // - Add extra tokens for newlines
            const newlineCount = (text.match(/\n/g) || []).length;
            return Math.ceil(charCount / 2) + whitespaceCount + (specialCharCount * 2) + jsonTokens + newlineCount;
        }
    }

    public calculateTotalTokens(messages: { role: string; content: string }[]): number {
        return messages.reduce((total, message) => {
            return total + this.calculateTokens(message.content);
        }, 0);
    }
} 