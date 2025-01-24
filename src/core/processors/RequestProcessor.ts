import { ModelInfo } from '../../interfaces/UniversalInterfaces';
import { TokenCalculator } from '../models/TokenCalculator';

export class RequestProcessor {
    private tokenCalculator: TokenCalculator;

    constructor() {
        this.tokenCalculator = new TokenCalculator();
    }

    public processRequest({
        message,
        data,
        endingMessage,
        model,
        maxResponseTokens
    }: {
        message: string;
        data?: any;
        endingMessage?: string;
        model: ModelInfo;
        maxResponseTokens?: number;
    }): string[] {
        // Calculate token limits
        const maxTokens = model.maxRequestTokens;
        const messageTokens = this.tokenCalculator.calculateTokens(message);
        const endingMessageTokens = endingMessage ? this.tokenCalculator.calculateTokens(endingMessage) : 0;
        const reservedTokens = messageTokens + endingMessageTokens + (maxResponseTokens || model.maxResponseTokens);
        const availableTokens = maxTokens - reservedTokens;

        // If no data, return single message
        if (data === undefined) {
            return [this.createMessage(message, undefined, endingMessage)];
        }

        // Handle data based on type
        if (typeof data === 'object' && data !== null) {
            // For objects/arrays, try to split by properties
            if (Array.isArray(data)) {
                return this.splitArray(message, data, endingMessage, availableTokens);
            } else {
                return this.splitObject(message, data, endingMessage, availableTokens);
            }
        } else {
            // For primitive types, convert to string and split by lines
            const dataString = data.toString();
            return this.splitText(message, dataString, endingMessage, availableTokens);
        }
    }

    private splitArray(message: string, data: any[], endingMessage: string | undefined, availableTokens: number): string[] {
        const chunks: string[] = [];
        let currentChunk: any[] = [];
        let currentTokens = 0;

        for (const item of data) {
            const itemString = JSON.stringify(item, null, 2);
            const itemTokens = this.tokenCalculator.calculateTokens(itemString);

            if (currentTokens + itemTokens > availableTokens && currentChunk.length > 0) {
                // Current chunk is full, create message and start new chunk
                const chunkString = JSON.stringify(currentChunk, null, 2);
                chunks.push(this.createMessage(message, chunkString, endingMessage));
                currentChunk = [];
                currentTokens = 0;
            }

            currentChunk.push(item);
            currentTokens += itemTokens;
        }

        // Add remaining items
        if (currentChunk.length > 0) {
            const chunkString = JSON.stringify(currentChunk, null, 2);
            chunks.push(this.createMessage(message, chunkString, endingMessage));
        }

        return chunks;
    }

    private splitObject(message: string, data: Record<string, any>, endingMessage: string | undefined, availableTokens: number): string[] {
        const chunks: string[] = [];
        let currentChunk: Record<string, any> = {};
        let currentTokens = 0;

        for (const [key, value] of Object.entries(data)) {
            const entryString = `"${key}":${JSON.stringify(value, null, 2)}`;
            const entryTokens = this.tokenCalculator.calculateTokens(entryString);

            if (currentTokens + entryTokens > availableTokens && Object.keys(currentChunk).length > 0) {
                // Current chunk is full, create message and start new chunk
                const chunkString = JSON.stringify(currentChunk, null, 2);
                chunks.push(this.createMessage(message, chunkString, endingMessage));
                currentChunk = {};
                currentTokens = 0;
            }

            currentChunk[key] = value;
            currentTokens += entryTokens;
        }

        // Add remaining properties
        if (Object.keys(currentChunk).length > 0) {
            const chunkString = JSON.stringify(currentChunk, null, 2);
            chunks.push(this.createMessage(message, chunkString, endingMessage));
        }

        return chunks;
    }

    private splitText(message: string, text: string, endingMessage: string | undefined, availableTokens: number): string[] {
        // If text fits in available tokens, return single message
        if (this.tokenCalculator.calculateTokens(text) <= availableTokens) {
            return [this.createMessage(message, text, endingMessage)];
        }

        // Split by lines for better context preservation
        const chunks: string[] = [];
        let currentChunk = '';
        let currentTokens = 0;

        const lines = text.split('\n');
        for (const line of lines) {
            const lineTokens = this.tokenCalculator.calculateTokens(line + '\n');
            if (currentTokens + lineTokens > availableTokens && currentChunk) {
                // Current chunk is full, start a new one
                chunks.push(this.createMessage(message, currentChunk.trim(), endingMessage));
                currentChunk = '';
                currentTokens = 0;
            }
            currentChunk += line + '\n';
            currentTokens += lineTokens;
        }

        // Add final chunk if any
        if (currentChunk) {
            chunks.push(this.createMessage(message, currentChunk.trim(), endingMessage));
        }

        return chunks;
    }

    private createMessage(message: string, data: string | undefined, endingMessage?: string): string {
        let result = message;
        if (data) {
            result += '\n\n' + data;
        }
        if (endingMessage) {
            result += '\n\n' + endingMessage;
        }
        return result;
    }
} 