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
        // Check recursion depth for objects
        if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
            const depth = this.calculateObjectDepth(data);
            if (depth > this.MAX_RECURSION_DEPTH) {
                // For objects at the boundary, try to split them
                try {
                    const messageTokens = this.tokenCalculator.calculateTokens(message);
                    const endingTokens = endingMessage ? this.tokenCalculator.calculateTokens(endingMessage) : 0;
                    const overheadTokens = 50;
                    const availableTokens = Math.max(1, modelInfo.maxRequestTokens - messageTokens - endingTokens - maxResponseTokens - overheadTokens);
                    const chunks = this.splitObjectData(data, availableTokens, this.MAX_RECURSION_DEPTH - 1);
                    if (chunks.length > 0) {
                        return chunks;
                    }
                } catch {
                    // If splitting fails, then throw the recursion depth error
                    throw new Error('Maximum object recursion depth exceeded');
                }
            }
        }

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

        for (const item of data) {
            const itemString = JSON.stringify(item);
            const itemTokens = this.tokenCalculator.calculateTokens(itemString);
            const arrayOverhead = this.tokenCalculator.calculateTokens('[]');
            const commaTokens = currentChunk.length > 0 ? this.tokenCalculator.calculateTokens(',') : 0;

            // If a single item is too large to fit in a chunk by itself
            if (itemTokens + arrayOverhead > maxTokens) {
                // Save current chunk if not empty
                if (currentChunk.length > 0) {
                    chunks.push(this.createArrayChunk(currentChunk, currentTokens, chunks.length));
                    currentChunk = [];
                    currentTokens = this.tokenCalculator.calculateTokens('[]');
                }

                // Create a single chunk for this large item
                chunks.push(this.createArrayChunk([item], itemTokens + arrayOverhead, chunks.length));
                continue;
            }

            // If adding this item would exceed the token limit, create a new chunk
            if (currentChunk.length > 0 && currentTokens + itemTokens + commaTokens > maxTokens) {
                chunks.push(this.createArrayChunk(currentChunk, currentTokens, chunks.length));
                currentChunk = [];
                currentTokens = this.tokenCalculator.calculateTokens('[]');
            }

            // Add item to current chunk
            currentChunk.push(item);
            currentTokens = this.tokenCalculator.calculateTokens(JSON.stringify(currentChunk));
        }

        // Add the last chunk if there is one
        if (currentChunk.length > 0) {
            chunks.push(this.createArrayChunk(currentChunk, currentTokens, chunks.length));
        }

        return this.finalizeChunks(chunks);
    }

    /**
     * Splits object data into chunks while maintaining property relationships
     * Ensures each chunk is a valid object with complete key-value pairs
     */
    private splitObjectData(data: any, maxTokens: number, depth: number = 0): DataChunk[] {
        if (depth > this.MAX_RECURSION_DEPTH) {
            throw new Error('Maximum object recursion depth exceeded');
        }

        const chunks: DataChunk[] = [];
        const entries = Object.entries(data);
        let currentChunk: Record<string, any> = {};
        let currentTokens = this.tokenCalculator.calculateTokens('{}');

        for (const [key, value] of entries) {
            const itemString = JSON.stringify({ [key]: value });
            const itemTokens = this.tokenCalculator.calculateTokens(itemString);

            // If a single key-value pair is too large to fit in a chunk by itself
            if (itemTokens > maxTokens) {
                // Save current chunk if not empty
                if (Object.keys(currentChunk).length > 0) {
                    chunks.push(this.createObjectChunk(currentChunk, currentTokens, chunks.length));
                    currentChunk = {};
                    currentTokens = this.tokenCalculator.calculateTokens('{}');
                }

                // If the value is an object or array, try to split it recursively
                if (typeof value === 'object' && value !== null) {
                    const subChunks = Array.isArray(value) ?
                        this.splitArrayData(value, maxTokens) :
                        this.splitObjectData(value, maxTokens, depth + 1);

                    for (const subChunk of subChunks) {
                        chunks.push(this.createObjectChunk({ [key]: subChunk.content }, subChunk.tokenCount, chunks.length));
                    }
                } else {
                    // For primitive values that are too large, create a single chunk
                    chunks.push(this.createObjectChunk({ [key]: value }, itemTokens, chunks.length));
                }
                continue;
            }

            // Check if adding this item would exceed the token limit
            if (currentTokens + itemTokens > maxTokens) {
                chunks.push(this.createObjectChunk(currentChunk, currentTokens, chunks.length));
                currentChunk = {};
                currentTokens = this.tokenCalculator.calculateTokens('{}');
            }

            currentChunk[key] = value;
            currentTokens = this.tokenCalculator.calculateTokens(JSON.stringify(currentChunk));
        }

        // Add the last chunk if there is one
        if (Object.keys(currentChunk).length > 0) {
            chunks.push(this.createObjectChunk(currentChunk, currentTokens, chunks.length));
        }

        return this.finalizeChunks(chunks);
    }

    /**
     * Splits a single line into chunks based on token limits
     */
    private splitLine(line: string, maxTokens: number): DataChunk[] {
        const chunks: DataChunk[] = [];
        const hasSpaces = line.includes(' ');
        let remaining = line;

        // For very small strings with spaces, split on spaces
        if (maxTokens <= 2 && hasSpaces) {
            const words = remaining.split(' ');
            return this.finalizeChunks(words.map((word, index) => ({
                content: word,
                tokenCount: 1,
                chunkIndex: index,
                totalChunks: 0
            })));
        }

        // For strings with spaces, split on word boundaries
        if (hasSpaces) {
            const words = remaining.split(' ');
            let currentChunk = '';
            let currentTokens = 0;

            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                const wordTokens = this.tokenCalculator.calculateTokens(word);

                if (currentTokens + wordTokens <= maxTokens) {
                    currentChunk += (currentChunk ? ' ' : '') + word;
                    currentTokens += wordTokens;
                } else {
                    if (currentChunk) {
                        chunks.push({
                            content: currentChunk,
                            tokenCount: currentTokens,
                            chunkIndex: chunks.length,
                            totalChunks: 0
                        });
                    }
                    currentChunk = word;
                    currentTokens = wordTokens;
                }
            }

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

        // For strings without spaces, use binary search for character-by-character splitting
        while (remaining.length > 0) {
            const remainingTokens = this.tokenCalculator.calculateTokens(remaining);
            if (remainingTokens <= maxTokens) {
                chunks.push({
                    content: remaining,
                    tokenCount: remainingTokens,
                    chunkIndex: chunks.length,
                    totalChunks: 0
                });
                break;
            }

            // For very small token limits, split character by character
            if (maxTokens <= 2) {
                chunks.push({
                    content: remaining[0],
                    tokenCount: 1,
                    chunkIndex: chunks.length,
                    totalChunks: 0
                });
                remaining = remaining.slice(1);
                continue;
            }

            // Binary search for the split point
            let left = 1;
            let right = remaining.length;
            let bestSplit = 1;

            while (left <= right) {
                const mid = Math.floor((left + right) / 2);
                const chunk = remaining.slice(0, mid);
                const tokens = this.tokenCalculator.calculateTokens(chunk);

                if (tokens <= maxTokens) {
                    bestSplit = mid;
                    left = mid + 1;
                } else {
                    right = mid - 1;
                }
            }

            const finalChunk = remaining.slice(0, bestSplit);
            chunks.push({
                content: finalChunk,
                tokenCount: this.tokenCalculator.calculateTokens(finalChunk),
                chunkIndex: chunks.length,
                totalChunks: 0
            });
            remaining = remaining.slice(bestSplit);
        }

        return this.finalizeChunks(chunks);
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
     * Creates a chunk from an object with proper token counting
     */
    private createObjectChunk(content: Record<string, any>, tokenCount: number, chunkIndex: number): DataChunk {
        return {
            content,
            tokenCount,
            chunkIndex,
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