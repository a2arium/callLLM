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
            return Math.ceil(text.length / 4); // Rough approximation
        }
    }

    public calculateTotalTokens(messages: { role: string; content: string }[]): number {
        return messages.reduce((total, message) => {
            return total + this.calculateTokens(message.content);
        }, 0);
    }
} 