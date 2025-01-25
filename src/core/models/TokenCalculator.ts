import { Usage } from '../../interfaces/UniversalInterfaces';
import { encoding_for_model } from '@dqbd/tiktoken';

export class TokenCalculator {
    constructor() { }

    public calculateUsage(
        inputTokens: number,
        outputTokens: number,
        inputPricePerMillion: number,
        outputPricePerMillion: number
    ): { inputCost: number; outputCost: number; totalCost: number } {
        const inputCost = (inputTokens * inputPricePerMillion) / 1_000_000;
        const outputCost = (outputTokens * outputPricePerMillion) / 1_000_000;
        return {
            inputCost,
            outputCost,
            totalCost: inputCost + outputCost
        };
    }

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