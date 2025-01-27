import { ModelInfo } from '../../interfaces/UniversalInterfaces';
import { TokenCalculator } from '../models/TokenCalculator';
import { RecursiveObjectSplitter } from './RecursiveObjectSplitter';
import { StringSplitter } from './StringSplitter';

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
        console.log('Initializing DataSplitter...');
        this.stringSplitter = new StringSplitter(tokenCalculator);
        console.log('DataSplitter initialized');
    }

    /**
     * Determines if data needs to be split and performs splitting if necessary
     */
    public async splitIfNeeded({
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
    }): Promise<DataChunk[]> {
        console.log('\nStarting data split operation...');
        console.log(`Data type: ${typeof data}`);
        console.log(`Model max tokens: ${modelInfo.maxRequestTokens}`);
        console.log(`Max response tokens: ${maxResponseTokens}`);

        // Handle undefined, null, and primitive types
        if (data === undefined || data === null ||
            typeof data === 'number' ||
            typeof data === 'boolean' ||
            (Array.isArray(data) && data.length === 0) ||
            (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0)) {
            console.log('Handling primitive or empty data type');
            const content = data === undefined ? undefined :
                data === null ? null :
                    Array.isArray(data) ? [] :
                        typeof data === 'object' ? {} :
                            data;
            const tokenCount = content === undefined ? 0 : this.tokenCalculator.calculateTokens(JSON.stringify(content));
            console.log(`Token count for primitive data: ${tokenCount}`);
            return [{
                content,
                tokenCount,
                chunkIndex: 0,
                totalChunks: 1
            }];
        }

        // Calculate available tokens
        console.log('\nCalculating available tokens...');
        const messageTokens = this.tokenCalculator.calculateTokens(message);
        const endingTokens = endingMessage ? this.tokenCalculator.calculateTokens(endingMessage) : 0;
        const overheadTokens = 50;

        console.log(`Message tokens: ${messageTokens}`);
        console.log(`Ending message tokens: ${endingTokens}`);
        console.log(`Overhead tokens: ${overheadTokens}`);

        const availableTokens = Math.max(1, modelInfo.maxRequestTokens - messageTokens - endingTokens - maxResponseTokens - overheadTokens);
        console.log(`Available tokens for data: ${availableTokens}`);

        // Check if data fits without splitting
        const dataString = typeof data === 'object' ? JSON.stringify(data) : data.toString();
        const dataTokens = this.tokenCalculator.calculateTokens(dataString);
        console.log(`Total data tokens: ${dataTokens}`);

        if (dataTokens <= availableTokens) {
            console.log('Data fits without splitting');
            return [{
                content: data,
                tokenCount: dataTokens,
                chunkIndex: 0,
                totalChunks: 1
            }];
        }

        console.log('\nData requires splitting...');
        // Choose splitting strategy
        if (typeof data === 'string') {
            console.log('Using string splitting strategy');
            const { chunks } = this.stringSplitter.split(data, availableTokens);
            console.log(`String split into ${chunks.length} chunks`);
            return chunks.map((chunk, index) => ({
                content: chunk,
                tokenCount: this.tokenCalculator.calculateTokens(chunk),
                chunkIndex: index,
                totalChunks: chunks.length
            }));
        }
        if (Array.isArray(data)) {
            console.log('Using array splitting strategy');
            return this.splitArrayData(data, availableTokens);
        }
        console.log('Using object splitting strategy');
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