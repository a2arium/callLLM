import { ModelInfo } from '../../interfaces/UniversalInterfaces';
import { TokenCalculator } from '../models/TokenCalculator';

/**
 * Represents a chunk of data after splitting
 * Used when data needs to be processed in multiple parts due to token limits
 */
export type DataChunk = {
    content: any;              // The actual content of the chunk
    tokenCount: number;        // Number of tokens in this chunk
    chunkIndex: number;        // Position of this chunk in the sequence (0-based)
    totalChunks: number;       // Total number of chunks the data was split into
};

/**
 * Handles splitting large data into smaller chunks based on token limits
 * Ensures that each chunk fits within the model's token constraints while maintaining data integrity
 */
export class DataSplitter {
    constructor(private tokenCalculator: TokenCalculator) { }

    /**
     * Determines if data needs to be split and performs splitting if necessary
     * @param message - The main message to be sent
     * @param data - The data to potentially split (can be string, array, or object)
     * @param endingMessage - Optional message to append after the data
     * @param modelInfo - Information about the model's capabilities and limits
     * @param maxResponseTokens - Maximum tokens allowed for the model's response
     * @returns Array of DataChunks, either single chunk if splitting not needed or multiple chunks
     */
    public splitIfNeeded({
        message,
        data,
        endingMessage,
        modelInfo,
        maxResponseTokens
    }: {
        message: string;
        data?: any;
        endingMessage?: string;
        modelInfo: ModelInfo;
        maxResponseTokens: number;
    }): DataChunk[] {
        if (!data) {
            return [{ content: data, tokenCount: 0, chunkIndex: 0, totalChunks: 1 }];
        }

        // Calculate available tokens for data by subtracting other components
        const messageTokens = this.tokenCalculator.calculateTokens(message);
        const endingTokens = endingMessage ? this.tokenCalculator.calculateTokens(endingMessage) : 0;
        const overheadTokens = 50; // Reserve tokens for system messages and formatting

        const availableTokens = modelInfo.maxRequestTokens - messageTokens - endingTokens - maxResponseTokens - overheadTokens;

        // Check if data fits in available tokens without splitting
        const dataString = typeof data === 'object' ? JSON.stringify(data, null, 2) : data.toString();
        const dataTokens = this.tokenCalculator.calculateTokens(dataString);

        if (dataTokens <= availableTokens) {
            return [{
                content: data,
                tokenCount: dataTokens,
                chunkIndex: 0,
                totalChunks: 1
            }];
        }

        // Choose appropriate splitting strategy based on data type
        if (typeof data === 'string') {
            return this.splitStringData(data, availableTokens);
        }
        if (Array.isArray(data)) {
            return this.splitArrayData(data, availableTokens);
        }
        return this.splitObjectData(data, availableTokens);
    }

    /**
     * Splits string data into chunks by paragraphs
     * Tries to maintain semantic coherence by splitting on paragraph boundaries
     */
    private splitStringData(data: string, maxTokens: number): DataChunk[] {
        const chunks: DataChunk[] = [];
        let currentChunk = '';
        let currentTokens = 0;

        // Split by paragraphs to maintain readability
        const paragraphs = data.split('\n\n');

        for (const paragraph of paragraphs) {
            const paragraphTokens = this.tokenCalculator.calculateTokens(paragraph);

            // Try to add paragraph to current chunk
            if (currentTokens + paragraphTokens <= maxTokens) {
                currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
                currentTokens += paragraphTokens;
            } else {
                // Save current chunk and start a new one
                if (currentChunk) {
                    chunks.push({
                        content: currentChunk,
                        tokenCount: currentTokens,
                        chunkIndex: chunks.length,
                        totalChunks: 0 // Updated later
                    });
                }
                currentChunk = paragraph;
                currentTokens = paragraphTokens;
            }
        }

        // Add the last chunk if there is one
        if (currentChunk) {
            chunks.push({
                content: currentChunk,
                tokenCount: currentTokens,
                chunkIndex: chunks.length,
                totalChunks: 0
            });
        }

        // Update totalChunks in all chunks
        return chunks.map(chunk => ({
            ...chunk,
            totalChunks: chunks.length
        }));
    }

    /**
     * Splits array data into chunks while keeping array items intact
     * Ensures each chunk is a valid array containing complete items
     */
    private splitArrayData(data: any[], maxTokens: number): DataChunk[] {
        const chunks: DataChunk[] = [];
        let currentChunk: any[] = [];
        let currentTokens = 0;

        for (const item of data) {
            const itemString = JSON.stringify(item);
            const itemTokens = this.tokenCalculator.calculateTokens(itemString);

            // Try to add item to current chunk
            if (currentTokens + itemTokens <= maxTokens) {
                currentChunk.push(item);
                currentTokens += itemTokens;
            } else {
                // Save current chunk and start a new one
                if (currentChunk.length > 0) {
                    chunks.push({
                        content: currentChunk,
                        tokenCount: currentTokens,
                        chunkIndex: chunks.length,
                        totalChunks: 0
                    });
                }
                currentChunk = [item];
                currentTokens = itemTokens;
            }
        }

        // Add the last chunk if there is one
        if (currentChunk.length > 0) {
            chunks.push({
                content: currentChunk,
                tokenCount: currentTokens,
                chunkIndex: chunks.length,
                totalChunks: 0
            });
        }

        return chunks.map(chunk => ({
            ...chunk,
            totalChunks: chunks.length
        }));
    }

    /**
     * Splits object data into chunks while maintaining property relationships
     * Ensures each chunk is a valid object with complete key-value pairs
     */
    private splitObjectData(data: Record<string, any>, maxTokens: number): DataChunk[] {
        const entries = Object.entries(data);
        const chunks: DataChunk[] = [];
        let currentChunk: Record<string, any> = {};
        let currentTokens = 0;

        for (const [key, value] of entries) {
            const entryString = JSON.stringify({ [key]: value });
            const entryTokens = this.tokenCalculator.calculateTokens(entryString);

            // Try to add property to current chunk
            if (currentTokens + entryTokens <= maxTokens) {
                currentChunk[key] = value;
                currentTokens += entryTokens;
            } else {
                // Save current chunk and start a new one
                if (Object.keys(currentChunk).length > 0) {
                    chunks.push({
                        content: currentChunk,
                        tokenCount: currentTokens,
                        chunkIndex: chunks.length,
                        totalChunks: 0
                    });
                }
                currentChunk = { [key]: value };
                currentTokens = entryTokens;
            }
        }

        // Add the last chunk if there is one
        if (Object.keys(currentChunk).length > 0) {
            chunks.push({
                content: currentChunk,
                tokenCount: currentTokens,
                chunkIndex: chunks.length,
                totalChunks: 0
            });
        }

        return chunks.map(chunk => ({
            ...chunk,
            totalChunks: chunks.length
        }));
    }
} 