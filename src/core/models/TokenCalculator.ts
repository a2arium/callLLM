import type { Usage } from '../../interfaces/UniversalInterfaces.ts';
import { encoding_for_model, type TiktokenModel } from '@dqbd/tiktoken';

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
        imageOutputPricePerMillion?: number,
        videoSeconds?: number,
        videoPricePerSecond?: number,
        generatedImages?: number,
        imagePricePerImage?: number
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

        // Total input cost
        const totalInputCost = regularInputCost + cachedInputCost + imageInputCost;

        // Calculate output and reasoning costs
        const outputCost = (outputTokens * outputPricePerMillion) / 1_000_000;
        const outputReasoningCost = (outputReasoningTokens * outputPricePerMillion) / 1_000_000;

        // Calculate image output costs (token-based)
        const imageOutputCost = (imageOutputTokens && imageOutputPricePerMillion)
            ? (imageOutputTokens * imageOutputPricePerMillion) / 1_000_000
            : 0;

        // Calculate video output costs (time-based)
        const videoCost = (videoSeconds && videoPricePerSecond)
            ? videoSeconds * videoPricePerSecond
            : 0;

        // Calculate per-image generation costs
        const generatedImagesCost = (generatedImages && imagePricePerImage)
            ? generatedImages * imagePricePerImage
            : 0;

        // Total output cost
        const totalOutputCost = outputCost + outputReasoningCost + imageOutputCost + videoCost + generatedImagesCost;

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
                image: imageOutputCost + generatedImagesCost,
                video: videoCost
            },
            total: totalCost
        };
    }

    /**
     * Calculates an estimate of the number of tokens in a given text string.
     * 
     * @param text The text to count tokens for
     * @param tokenizer Optional tokenizer model ID (e.g. 'gpt-4', 'cl100k_base')
     * @returns Estimated token count
     */
    private static encoder: any;
    private static currentTokenizer: string | undefined;

    public calculateTokens(text: string, tokenizer?: string): number {
        const targetTokenizer = tokenizer || 'gpt-4';

        try {
            // Re-initialize encoder if the requested tokenizer is different from cached
            if (!TokenCalculator.encoder || TokenCalculator.currentTokenizer !== targetTokenizer) {
                if (TokenCalculator.encoder && typeof TokenCalculator.encoder.free === 'function') {
                    try { TokenCalculator.encoder.free(); } catch (e) { /* ignore */ }
                }

                // Try to load the specific tokenizer, fallback to gpt-4 if it fails or is unknown
                try {
                    TokenCalculator.encoder = encoding_for_model(targetTokenizer as TiktokenModel);
                    TokenCalculator.currentTokenizer = targetTokenizer;
                } catch (e) {
                    // Fallback to gpt-4 if specific model encoding not found
                    if (targetTokenizer !== 'gpt-4') {
                        TokenCalculator.encoder = encoding_for_model('gpt-4');
                        TokenCalculator.currentTokenizer = 'gpt-4';
                    } else {
                        throw e;
                    }
                }
            }
            const tokens = TokenCalculator.encoder.encode(text);
            return tokens.length;
        } catch (error) {
            console.warn(`Failed to calculate tokens using ${targetTokenizer}, using heuristic:`, error);
            // More accurate approximation:
            // 1. Count characters
            // 2. Add extra tokens for whitespace and special characters
            // 3. Add extra tokens for JSON structure if the text looks like JSON
            const charCount = text.length;
            const whitespaceCount = (text.match(/\s/g) || []).length;
            const specialCharCount = (text.match(/[^a-zA-Z0-9\s]/g) || []).length;
            const isJson = text.trim().startsWith('{') || text.trim().startsWith('[');
            const isHtml = text.trim().startsWith('<') && text.trim().endsWith('>');
            const jsonTokens = isJson ? Math.ceil(text.split(/[{}\[\],]/).length) : 0;

            // Use a more realistic estimate:
            // - For HTML/dense code, 3-4 chars per token is typical.
            // - For English, 4 chars per token is typical.
            const baseRatio = isHtml ? 3.5 : 4;
            const newlineCount = (text.match(/\n/g) || []).length;

            return Math.ceil(charCount / baseRatio) + (isJson ? jsonTokens : Math.ceil(specialCharCount / 2)) + newlineCount;
        }
    }

    /**
     * Clears the cached encoder. Useful for testing.
     */
    public static clearCache(): void {
        if (TokenCalculator.encoder && typeof TokenCalculator.encoder.free === 'function') {
            try {
                TokenCalculator.encoder.free();
            } catch (e) {
                // Ignore errors during free
            }
        }
        TokenCalculator.encoder = undefined;
        TokenCalculator.currentTokenizer = undefined;
    }

    public calculateTotalTokens(messages: { role: string; content: string }[], tokenizer?: string): number {
        return messages.reduce((total, message) => {
            return total + this.calculateTokens(message.content, tokenizer);
        }, 0);
    }
} 