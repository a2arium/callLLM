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
    private readonly MAX_RECURSION_DEPTH = 5;

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
        // For single-line text, use optimized line splitting
        if (data.indexOf('\n') === -1 && data.indexOf('\n\n') === -1) {
            return this.splitLine(data, maxTokens);
        }

        const chunks: DataChunk[] = [];
        let currentChunk = '';
        let currentTokens = 0;

        // Split by paragraphs first
        const paragraphs = data.split('\n\n');

        for (const paragraph of paragraphs) {
            const paragraphTokens = this.tokenCalculator.calculateTokens(paragraph);

            // If a single paragraph is too large, split it into lines
            if (paragraphTokens > maxTokens) {
                // Save current chunk if not empty
                if (currentTokens > 0) {
                    chunks.push({
                        content: currentChunk,
                        tokenCount: currentTokens,
                        chunkIndex: chunks.length,
                        totalChunks: 0
                    });
                    currentChunk = '';
                    currentTokens = 0;
                }

                const lines = paragraph.split('\n');
                for (const line of lines) {
                    const lineTokens = this.tokenCalculator.calculateTokens(line);

                    // If a single line is too large, split it into smaller chunks
                    if (lineTokens > maxTokens) {
                        // Save current chunk if not empty
                        if (currentTokens > 0) {
                            chunks.push({
                                content: currentChunk,
                                tokenCount: currentTokens,
                                chunkIndex: chunks.length,
                                totalChunks: 0
                            });
                            currentChunk = '';
                            currentTokens = 0;
                        }

                        // Split the line using optimized method
                        const lineChunks = this.splitLine(line, maxTokens);
                        chunks.push(...lineChunks);
                    } else {
                        // Line fits within token limit
                        if (currentTokens + lineTokens > maxTokens) {
                            chunks.push({
                                content: currentChunk,
                                tokenCount: currentTokens,
                                chunkIndex: chunks.length,
                                totalChunks: 0
                            });
                            currentChunk = line;
                            currentTokens = lineTokens;
                        } else {
                            currentChunk += (currentChunk ? '\n' : '') + line;
                            currentTokens = this.tokenCalculator.calculateTokens(currentChunk);
                        }
                    }
                }
            } else {
                // Paragraph fits within token limit
                if (currentTokens + paragraphTokens > maxTokens) {
                    chunks.push({
                        content: currentChunk,
                        tokenCount: currentTokens,
                        chunkIndex: chunks.length,
                        totalChunks: 0
                    });
                    currentChunk = paragraph;
                    currentTokens = paragraphTokens;
                } else {
                    currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
                    currentTokens = this.tokenCalculator.calculateTokens(currentChunk);
                }
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

        return this.finalizeChunks(chunks);
    }

    /**
     * Splits array data into chunks while keeping array items intact
     * Ensures each chunk is a valid array containing complete items
     */
    private splitArrayData(data: any[], maxTokens: number): DataChunk[] {
        const chunks: DataChunk[] = [];
        let currentChunk: any[] = [];
        let currentTokens = this.tokenCalculator.calculateTokens('[]');
        const commaOverhead = this.tokenCalculator.calculateTokens(',\n  ');

        for (const item of data) {
            const itemString = typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item);
            const singleItemArrayStr = JSON.stringify([item], null, 2);
            const singleItemArrayTokens = this.tokenCalculator.calculateTokens(singleItemArrayStr);

            // Check if single-item array exceeds maxTokens
            if (singleItemArrayTokens > maxTokens) {
                // Save current chunk if not empty
                if (currentChunk.length > 0) {
                    const chunkString = JSON.stringify(currentChunk, null, 2);
                    chunks.push(this.createArrayChunk(currentChunk, this.tokenCalculator.calculateTokens(chunkString), chunks.length));
                    currentChunk = [];
                    currentTokens = this.tokenCalculator.calculateTokens('[]');
                }

                // Split the item itself
                const itemChunks = this.splitIfNeeded({
                    message: '',
                    data: item,
                    modelInfo: {
                        maxRequestTokens: maxTokens,
                        name: 'array-item-split',
                        inputPricePerMillion: 0,
                        outputPricePerMillion: 0,
                        maxResponseTokens: 0,
                        characteristics: { qualityIndex: 0, outputSpeed: 0, firstTokenLatency: 0 }
                    },
                    maxResponseTokens: 0
                });

                // Add each sub-chunk as a separate array chunk
                for (const chunk of itemChunks) {
                    chunks.push(this.createArrayChunk([chunk.content], chunk.tokenCount + 2, chunks.length));
                }
                continue;
            }

            const itemTokens = this.tokenCalculator.calculateTokens(itemString) +
                (currentChunk.length > 0 ? commaOverhead : 0);

            // Start a new chunk if this item would exceed maxTokens
            if (currentChunk.length > 0 && (currentTokens + itemTokens > maxTokens)) {
                const chunkString = JSON.stringify(currentChunk, null, 2);
                chunks.push(this.createArrayChunk(currentChunk, this.tokenCalculator.calculateTokens(chunkString), chunks.length));
                currentChunk = [];
                currentTokens = this.tokenCalculator.calculateTokens('[]');
            }

            // Add item to current chunk
            currentChunk.push(item);
            const newChunkString = JSON.stringify(currentChunk, null, 2);
            currentTokens = this.tokenCalculator.calculateTokens(newChunkString);
        }

        // Add the last chunk if there is one
        if (currentChunk.length > 0) {
            const chunkString = JSON.stringify(currentChunk, null, 2);
            chunks.push(this.createArrayChunk(currentChunk, this.tokenCalculator.calculateTokens(chunkString), chunks.length));
        }

        return this.finalizeChunks(chunks);
    }

    /**
     * Splits object data into chunks while maintaining property relationships
     * Ensures each chunk is a valid object with complete key-value pairs
     */
    private calculateObjectDepth(obj: any): number {
        if (typeof obj !== 'object' || obj === null) {
            return 0;
        }
        let maxDepth = 1;
        for (const value of Object.values(obj)) {
            if (typeof value === 'object' && value !== null) {
                maxDepth = Math.max(maxDepth, 1 + this.calculateObjectDepth(value));
            }
        }
        return maxDepth;
    }

    private splitObjectData(data: Record<string, any>, maxTokens: number, depth = 0): DataChunk[] {
        // Calculate actual depth of the object
        const actualDepth = this.calculateObjectDepth(data);
        if (actualDepth > this.MAX_RECURSION_DEPTH) {
            throw new Error('Maximum object recursion depth exceeded');
        }

        // If at max depth, return as single chunk
        if (depth === this.MAX_RECURSION_DEPTH || actualDepth === this.MAX_RECURSION_DEPTH) {
            const stringified = JSON.stringify(data, null, 2);
            const tokenCount = Math.min(maxTokens, this.tokenCalculator.calculateTokens(stringified));
            return [{
                content: data,
                tokenCount,
                chunkIndex: 0,
                totalChunks: 1
            }];
        }

        const chunks: DataChunk[] = [];
        let currentChunk: Record<string, any> = {};
        let currentTokens = this.tokenCalculator.calculateTokens('{}');
        const commaOverhead = this.tokenCalculator.calculateTokens(',\n  ');

        for (const [key, value] of Object.entries(data)) {
            const entryString = `"${key}":${typeof value === 'object' ? JSON.stringify(value, null, 2) : JSON.stringify(value)}`;
            const entryTokens = this.tokenCalculator.calculateTokens(entryString) +
                (Object.keys(currentChunk).length > 0 ? commaOverhead : 0);

            // If a single property is too large, split it recursively
            if (entryTokens > maxTokens - this.tokenCalculator.calculateTokens('{}')) {
                // Save current chunk if not empty
                if (Object.keys(currentChunk).length > 0) {
                    chunks.push({
                        content: currentChunk,
                        tokenCount: currentTokens,
                        chunkIndex: chunks.length,
                        totalChunks: 0
                    });
                    currentChunk = {};
                    currentTokens = this.tokenCalculator.calculateTokens('{}');
                }

                // Split the large property value with increased depth
                const valueChunks = this.splitIfNeeded({
                    message: '',
                    data: value,
                    modelInfo: {
                        maxRequestTokens: maxTokens,
                        name: 'recursive-splitter',
                        inputPricePerMillion: 0,
                        outputPricePerMillion: 0,
                        maxResponseTokens: maxTokens,
                        characteristics: {
                            qualityIndex: 0,
                            outputSpeed: 0,
                            firstTokenLatency: 0
                        }
                    },
                    maxResponseTokens: 0
                });

                // Add each chunk as a separate object with the same key
                for (const chunk of valueChunks) {
                    const chunkObj = { [key]: chunk.content };
                    const chunkTokens = Math.min(maxTokens, this.tokenCalculator.calculateTokens(JSON.stringify(chunkObj, null, 2)));
                    chunks.push({
                        content: chunkObj,
                        tokenCount: chunkTokens,
                        chunkIndex: chunks.length,
                        totalChunks: 0
                    });
                }
            } else if (currentTokens + entryTokens > maxTokens) {
                // Current chunk is full, save it and start a new one
                chunks.push({
                    content: currentChunk,
                    tokenCount: currentTokens,
                    chunkIndex: chunks.length,
                    totalChunks: 0
                });
                currentChunk = { [key]: value };
                currentTokens = this.tokenCalculator.calculateTokens(JSON.stringify(currentChunk, null, 2));
            } else {
                // Add property to current chunk
                currentChunk[key] = value;
                currentTokens = this.tokenCalculator.calculateTokens(JSON.stringify(currentChunk, null, 2));
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

        return this.finalizeChunks(chunks);
    }

    /**
     * Finds the optimal split index for a string based on token limits using binary search
     */
    private findSplitIndex(str: string, maxTokens: number): number {
        let low = 0;
        let high = str.length;
        let best = 0;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const tokens = this.tokenCalculator.calculateTokens(str.slice(0, mid));

            if (tokens <= maxTokens) {
                best = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return best;
    }

    /**
     * Splits a single line into chunks based on token limits
     */
    private splitLine(line: string, maxTokens: number): DataChunk[] {
        const chunks: DataChunk[] = [];
        let remaining = line;

        while (remaining.length > 0) {
            let splitAt = this.findSplitIndex(remaining, maxTokens);
            // Ensure we make progress even if no valid split found
            if (splitAt === 0) splitAt = 1;

            const chunk = remaining.slice(0, splitAt);
            chunks.push({
                content: chunk,
                tokenCount: this.tokenCalculator.calculateTokens(chunk),
                chunkIndex: chunks.length,
                totalChunks: 0
            });
            remaining = remaining.slice(splitAt);
        }
        return chunks;
    }

    /**
     * Creates a chunk from an array with proper token counting
     */
    private createArrayChunk(items: any[], tokenCount: number, index: number): DataChunk {
        return {
            content: items,
            tokenCount,
            chunkIndex: index,
            totalChunks: 0
        };
    }

    /**
     * Finalizes chunks by updating their totalChunks count
     */
    private finalizeChunks(chunks: DataChunk[]): DataChunk[] {
        return chunks.map(chunk => ({
            ...chunk,
            totalChunks: chunks.length
        }));
    }
} 