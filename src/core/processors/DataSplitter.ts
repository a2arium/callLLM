import type { ModelInfo } from '../../interfaces/UniversalInterfaces.ts';
import { TokenCalculator } from '../models/TokenCalculator.ts';
import { RecursiveObjectSplitter } from './RecursiveObjectSplitter.ts';
import { StringSplitter } from './StringSplitter.ts';
import { logger } from '../../utils/logger.ts';

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
    private stringSplitter: StringSplitter;

    constructor(private tokenCalculator: TokenCalculator) {
        this.stringSplitter = new StringSplitter(tokenCalculator);
    }

    /**
     * Determines if data needs to be split and performs splitting if necessary
     */
    public async splitIfNeeded({
        message,
        data,
        endingMessage,
        modelInfo,
        maxResponseTokens,
        maxCharsPerChunk
    }: {
        message: string;
        data?: any;
        endingMessage?: string;
        modelInfo: ModelInfo;
        maxResponseTokens: number;
        maxCharsPerChunk?: number;
    }): Promise<DataChunk[]> {
        const log = logger.createLogger({ prefix: 'DataSplitter.splitIfNeeded' });
        log.debug('Called with', { dataType: typeof data, dataLength: typeof data === 'string' ? data.length : Array.isArray(data) ? data.length : typeof data === 'object' && data !== null ? Object.keys(data).length : undefined, maxCharsPerChunk });
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

        // Calculate available tokens
        const messageTokens = this.tokenCalculator.calculateTokens(message);
        const endingTokens = endingMessage ? this.tokenCalculator.calculateTokens(endingMessage) : 0;
        const overheadTokens = 50;

        const availableTokens = Math.max(1, modelInfo.maxRequestTokens - messageTokens - endingTokens - maxResponseTokens - overheadTokens);

        // Check if data fits without splitting
        const dataString = typeof data === 'object' ? JSON.stringify(data) : data.toString();
        const dataTokens = this.tokenCalculator.calculateTokens(dataString);

        log.debug('Token and char info', { messageTokens, endingTokens, availableTokens, dataTokens, dataStringLength: dataString.length });

        if (dataTokens <= availableTokens && (!maxCharsPerChunk || dataString.length <= maxCharsPerChunk)) {
            log.debug('Data fits in one chunk, returning single chunk');
            return [{
                content: data,
                tokenCount: dataTokens,
                chunkIndex: 0,
                totalChunks: 1
            }];
        }

        // Choose splitting strategy
        let result: DataChunk[];
        if (typeof data === 'string') {
            result = this.stringSplitter.split(data, availableTokens, { maxCharsPerChunk }).map((chunk, index, arr) => ({
                content: chunk,
                tokenCount: this.tokenCalculator.calculateTokens(chunk),
                chunkIndex: index,
                totalChunks: arr.length
            }));
        } else if (Array.isArray(data)) {
            result = this.splitArrayData(data, availableTokens, maxCharsPerChunk);
        } else {
            result = this.splitObjectData(data, availableTokens, maxCharsPerChunk);
        }
        log.debug('Returning chunks', { chunkCount: result.length, chunkLengths: result.map(c => typeof c.content === 'string' ? c.content.length : undefined) });
        return result;
    }

    /**
     * Splits object data into chunks while maintaining property relationships
     * Ensures each chunk is a valid object with complete key-value pairs
     */
    private splitObjectData(data: any, maxTokens: number, maxCharsPerChunk?: number): DataChunk[] {
        const splitter = new RecursiveObjectSplitter(maxTokens, maxTokens - 50, maxCharsPerChunk);
        const splitObjects = splitter.split(data);

        return splitObjects.map((obj, index) => ({
            content: obj,
            tokenCount: this.tokenCalculator.calculateTokens(JSON.stringify(obj)),
            chunkIndex: index,
            totalChunks: splitObjects.length
        }));
    }

    private splitArrayData(data: any[], maxTokens: number, maxCharsPerChunk?: number): DataChunk[] {
        const chunks: DataChunk[] = [];
        let currentChunk: any[] = [];
        let currentTokens = this.tokenCalculator.calculateTokens('[]');
        let currentChars = 2; // '[]'

        for (const item of data) {
            const itemString = JSON.stringify(item);
            const itemTokens = this.tokenCalculator.calculateTokens(itemString);
            const itemChars = itemString.length + (currentChunk.length > 0 ? 1 : 0); // comma if not first

            if ((currentTokens + itemTokens > maxTokens || (maxCharsPerChunk && currentChars + itemChars > maxCharsPerChunk)) && currentChunk.length > 0) {
                chunks.push({
                    content: currentChunk,
                    tokenCount: currentTokens,
                    chunkIndex: chunks.length,
                    totalChunks: 0
                });
                currentChunk = [];
                currentTokens = this.tokenCalculator.calculateTokens('[]');
                currentChars = 2;
            }

            currentChunk.push(item);
            currentTokens = this.tokenCalculator.calculateTokens(JSON.stringify(currentChunk));
            currentChars = JSON.stringify(currentChunk).length;
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