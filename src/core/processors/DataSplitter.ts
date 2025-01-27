import { ModelInfo } from '../../interfaces/UniversalInterfaces';
import { TokenCalculator } from '../models/TokenCalculator';
import { RecursiveObjectSplitter } from './RecursiveObjectSplitter';

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
        // Handle undefined, null, and primitive types
        if (data === undefined || data === null ||
            typeof data === 'number' ||
            typeof data === 'boolean' ||
            (Array.isArray(data) && data.length === 0) ||
            (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0)) {
            const content = data === undefined ? undefined :
                data === null ? null :
                    Array.isArray(data) ? [] :
                        typeof data === 'object' ? {} :
                            data;
            const tokenCount = content === undefined ? 0 : this.tokenCalculator.calculateTokens(JSON.stringify(content));
            return [{
                content,
                tokenCount,
                chunkIndex: 0,
                totalChunks: 1
            }];
        }

        // Calculate available tokens for data by subtracting other components
        const messageTokens = this.tokenCalculator.calculateTokens(message);
        const endingTokens = endingMessage ? this.tokenCalculator.calculateTokens(endingMessage) : 0;
        const overheadTokens = 50; // Reserve tokens for system messages and formatting

        // Ensure we have at least 1 token available to prevent invalid splitting
        const availableTokens = Math.max(1, modelInfo.maxRequestTokens - messageTokens - endingTokens - maxResponseTokens - overheadTokens);

        // Check if data fits in available tokens without splitting
        const dataString = typeof data === 'object' ? JSON.stringify(data) : data.toString();
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
     * Splits object data into chunks while maintaining property relationships
     * Ensures each chunk is a valid object with complete key-value pairs
     */
    private splitObjectData(data: any, maxTokens: number): DataChunk[] {
        // Create a RecursiveObjectSplitter with maxTokens as the chunk size
        const splitter = new RecursiveObjectSplitter(maxTokens, maxTokens - 50);
        const splitObjects = splitter.split(data);

        // Convert split objects to DataChunks
        return splitObjects.map((obj, index) => ({
            content: obj,
            tokenCount: this.tokenCalculator.calculateTokens(JSON.stringify(obj)),
            chunkIndex: index,
            totalChunks: splitObjects.length
        }));
    }

    private splitStringData(data: string, maxTokens: number): DataChunk[] {
        const chunks: DataChunk[] = [];
        let remaining = data;

        while (remaining.length > 0) {
            const chunkSize = Math.min(maxTokens, remaining.length);
            const chunk = remaining.slice(0, chunkSize);
            chunks.push({
                content: chunk,
                tokenCount: this.tokenCalculator.calculateTokens(chunk),
                chunkIndex: chunks.length,
                totalChunks: 0
            });
            remaining = remaining.slice(chunkSize);
        }

        return chunks.map(chunk => ({
            ...chunk,
            totalChunks: chunks.length
        }));
    }

    private splitArrayData(data: any[], maxTokens: number): DataChunk[] {
        const chunks: DataChunk[] = [];
        let currentChunk: any[] = [];
        let currentTokens = this.tokenCalculator.calculateTokens('[]');

        for (const item of data) {
            const itemString = JSON.stringify(item);
            const itemTokens = this.tokenCalculator.calculateTokens(itemString);

            if (currentTokens + itemTokens > maxTokens && currentChunk.length > 0) {
                chunks.push({
                    content: currentChunk,
                    tokenCount: currentTokens,
                    chunkIndex: chunks.length,
                    totalChunks: 0
                });
                currentChunk = [];
                currentTokens = this.tokenCalculator.calculateTokens('[]');
            }

            currentChunk.push(item);
            currentTokens = this.tokenCalculator.calculateTokens(JSON.stringify(currentChunk));
        }

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
} 