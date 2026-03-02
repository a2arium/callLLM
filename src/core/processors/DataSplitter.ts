import type { ModelInfo, JSONSchemaDefinition, UniversalMessage } from '../../interfaces/UniversalInterfaces.ts';
import { TokenCalculator } from '../models/TokenCalculator.ts';
import { RecursiveObjectSplitter } from './RecursiveObjectSplitter.ts';
import { StringSplitter } from './StringSplitter.ts';
import { MarkdownSplitter } from './MarkdownSplitter.ts';
import { SchemaFormatter } from '../schema/SchemaFormatter.ts';
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
    metadata?: {
        // Enhanced metadata for hierarchical content
        hierarchicalInfo?: HierarchicalChunkInfo;
        contentType?: 'text' | 'markdown' | 'json' | 'array';
        preservedElements?: ('table' | 'codeBlock' | 'list' | 'blockquote')[];
    };
};

/**
 * Hierarchical information for markdown chunks
 */
export type HierarchicalChunkInfo = {
    sectionPath: string[];     // Path from root: ["Recipe Book", "Recipe 1", "Ingredients"]
    headingDepth: number;      // Depth of the current section (1-6 for h1-h6)
    headingTitle: string;      // Title of the current section
    parentSections: string[];  // Array of parent section titles for context
    isCompleteSection: boolean; // Whether this chunk contains a complete semantic unit
};

/**
 * Handles splitting large data into smaller chunks based on token limits
 * Ensures that each chunk fits within the model's token constraints while maintaining data integrity
 */
export class DataSplitter {
    private stringSplitter: StringSplitter;
    private markdownSplitter: MarkdownSplitter;

    constructor(private tokenCalculator: TokenCalculator) {
        this.stringSplitter = new StringSplitter(tokenCalculator);
        this.markdownSplitter = new MarkdownSplitter(tokenCalculator);
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
        maxCharsPerChunk,
        jsonSchema,
        historicalMessages,
        historyMode
    }: {
        message: string;
        data?: any;
        endingMessage?: string;
        modelInfo: ModelInfo;
        maxResponseTokens?: number;
        maxCharsPerChunk?: number;
        jsonSchema?: { name?: string; schema: JSONSchemaDefinition };
        historicalMessages?: UniversalMessage[];
        historyMode?: string;
    }): Promise<DataChunk[]> {
        const log = logger.createLogger({ prefix: 'DataSplitter.splitIfNeeded' });
        log.debug('Called with', {
            dataType: typeof data,
            dataLength: typeof data === 'string' ? data.length : Array.isArray(data) ? data.length : typeof data === 'object' && data !== null ? Object.keys(data).length : undefined,
            maxCharsPerChunk,
            messageLength: message.length,
            endingMessageLength: endingMessage?.length || 0,
            maxRequestTokens: modelInfo.maxRequestTokens,
            maxResponseTokens
        });

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
            log.debug('Returning single chunk for primitive/empty data', { tokenCount });
            return [{
                content,
                tokenCount,
                chunkIndex: 0,
                totalChunks: 1
            }];
        }

        const messageTokens = this.tokenCalculator.calculateTokens(message);
        const endingTokens = endingMessage ? this.tokenCalculator.calculateTokens(endingMessage) : 0;

        // Calculate tokens for schema, instructions, and historical messages
        let contextTokens = 0;

        // 1. JSON Schema tokens if present
        if (jsonSchema) {
            try {
                const schemaStr = SchemaFormatter.schemaToString(jsonSchema.schema);

                // Also account for the instruction text that PromptEnhancer adds
                const instructionOverhead = 200; // conservative buffer for instructions
                contextTokens += this.tokenCalculator.calculateTokens(schemaStr) + instructionOverhead;
            } catch (err) {
                // If schema parsing fails, use a large fallback
                contextTokens += 500;
            }
        }

        // 2. Historical messages tokens (e.g. System message)
        if (historicalMessages && historicalMessages.length > 0) {
            contextTokens += this.tokenCalculator.calculateTotalTokens(historicalMessages);

            // EMERGENCY DIAGNOSTIC LOG for history content sizes
            log.info('Historical Messages Breakdown', {
                count: historicalMessages.length,
                messages: historicalMessages.map(m => ({
                    role: m.role,
                    contentLength: typeof m.content === 'string' ? m.content.length : (Array.isArray(m.content) ? 'array:' + (m.content as any).length : JSON.stringify(m.content).length),
                    contentSnippet: typeof m.content === 'string' ? m.content.substring(0, 50) : 'obj/array',
                    hasArrayContent: Array.isArray(m.content)
                }))
            });
        }

        // EMERGENCY DIAGNOSTIC LOG
        if (process.env.LOG_LEVEL === 'debug') {
            console.log(`[DIAGNOSTIC] DataSplitter.availableTokens input:`, {
                modelName: modelInfo.name,
                maxRequestTokens: modelInfo.maxRequestTokens,
                maxResponseTokens: maxResponseTokens,
                messageTokens,
                endingTokens,
                contextTokens
            });
        }

        // Adaptive safety margin based on model context size. 
        // Larger models allow for smaller margins (less impact from tokenizer mismatch).
        let CAUTION_FACTOR = 0.90; // Default 10% safety margin
        if (modelInfo.maxRequestTokens > 100000) {
            CAUTION_FACTOR = 0.98; // 2% margin for large models
        } else if (modelInfo.maxRequestTokens >= 10000) {
            CAUTION_FACTOR = 0.95; // 5% margin for mid-sized models
        }

        // Smarter available tokens calculation. 
        // We don't want to sacrifice too much of the input window for a theoretical 
        // response size that might never be reached, especially in small context models.
        let responseBuffer = maxResponseTokens || 1000;
        const maxResponseRatio = (maxResponseTokens || 1000) / modelInfo.maxRequestTokens;
        if (maxResponseRatio > 0.3) {
            // If response is >30% of window, cap the buffer at 1500 tokens 
            // for the sake of larger input chunks.
            responseBuffer = Math.max(1000, Math.min(maxResponseTokens || 1000, 1500));
        }

        const overheadTokens = 150;
        const effectiveWindow = Math.floor(modelInfo.maxRequestTokens * CAUTION_FACTOR);
        let availableTokens = Math.max(1, effectiveWindow - messageTokens - endingTokens - responseBuffer - overheadTokens - contextTokens);

        // Check if data fits without splitting
        const dataString = typeof data === 'object' ? JSON.stringify(data) : data.toString();
        const dataTokens = this.tokenCalculator.calculateTokens(dataString);

        log.info('Token and char analysis', {
            messageTokens,
            endingTokens,
            contextTokens,
            overheadTokens,
            maxRequestTokens: modelInfo.maxRequestTokens,
            maxResponseTokens: responseBuffer,
            availableTokens,
            dataTokens,
            dataStringLength: dataString.length,
            maxCharsPerChunk: maxCharsPerChunk || 'unlimited',
            fitsInTokens: dataTokens <= availableTokens,
            fitsInChars: !maxCharsPerChunk || dataString.length <= maxCharsPerChunk,
            willSplit: !(dataTokens <= availableTokens && (!maxCharsPerChunk || dataString.length <= maxCharsPerChunk)),
            historicalMessageCount: historicalMessages?.length || 0,
            historyMode: historyMode || 'unknown'
        });

        if (dataTokens <= availableTokens && (!maxCharsPerChunk || dataString.length <= maxCharsPerChunk)) {
            log.debug('Data fits in one chunk, returning single chunk');

            // For single chunks, only add basic content type without expensive parsing
            let metadata: DataChunk['metadata'] = undefined;
            if (typeof data === 'string') {
                // Only do basic content type detection, not full hierarchical parsing
                metadata = {
                    contentType: this.isMarkdownContent(data) ? 'markdown' as const : 'text' as const
                };
            } else if (Array.isArray(data)) {
                metadata = { contentType: 'array' as const };
            } else if (typeof data === 'object' && data !== null) {
                metadata = { contentType: 'json' as const };
            }

            return [{
                content: data,
                tokenCount: dataTokens,
                chunkIndex: 0,
                totalChunks: 1,
                metadata
            }];
        }

        log.info('Data needs to be split, determining strategy', {
            dataType: typeof data,
            isString: typeof data === 'string',
            isArray: Array.isArray(data),
            isObject: typeof data === 'object' && !Array.isArray(data)
        });

        // Choose splitting strategy
        let result: DataChunk[];
        if (typeof data === 'string') {
            // Check if the string appears to be markdown
            if (this.isMarkdownContent(data)) {
                log.debug('Detected markdown content, using hierarchical splitting');
                result = await this.markdownSplitter.split(data, availableTokens, maxCharsPerChunk);
            } else {
                log.debug('Using string splitter for text content');
                result = this.stringSplitter.split(data, availableTokens, { maxCharsPerChunk }).map((chunk, index, arr) => ({
                    content: chunk,
                    tokenCount: this.tokenCalculator.calculateTokens(chunk),
                    chunkIndex: index,
                    totalChunks: arr.length,
                    metadata: {
                        contentType: 'text' as const
                    }
                }));
            }
        } else if (Array.isArray(data)) {
            log.debug('Using array splitter for array data');
            result = this.splitArrayData(data, availableTokens, maxCharsPerChunk);
        } else {
            log.debug('Using object splitter for object data');
            result = this.splitObjectData(data, availableTokens, maxCharsPerChunk);
        }

        log.debug('Splitting completed', {
            chunkCount: result.length,
            chunkLengths: result.map(c => typeof c.content === 'string' ? c.content.length : JSON.stringify(c.content).length),
            chunkTokenCounts: result.map(c => c.tokenCount),
            totalTokens: result.reduce((sum, c) => sum + c.tokenCount, 0)
        });

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
            totalChunks: splitObjects.length,
            metadata: {
                contentType: 'json' as const
            }
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
                    totalChunks: 0,
                    metadata: {
                        contentType: 'array' as const
                    }
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
                totalChunks: 0,
                metadata: {
                    contentType: 'array' as const
                }
            });
        }

        return chunks.map(chunk => ({
            ...chunk,
            totalChunks: chunks.length
        }));
    }

    private isMarkdownContent(content: string): boolean {
        const log = logger.createLogger({ prefix: 'DataSplitter.isMarkdownContent' });

        // Simple heuristics to detect if content is likely markdown
        const markdownPatterns = [
            /^#{1,6}\s+.+$/m,           // Headers (# ## ### etc.)
            /^\*{1,3}[^*\n]+\*{1,3}/m,  // Bold/italic
            /^```[\s\S]*?```/m,         // Code blocks
            /^\s*\*\s+.+$/m,            // Unordered lists
            /^\s*\d+\.\s+.+$/m,         // Ordered lists
            /^\s*>\s+.+$/m,             // Blockquotes
            /\[.+\]\(.+\)/,             // Links
            /^\|.+\|$/m,                // Tables
            /^---+$/m,                  // Horizontal rules
        ];

        const patternNames = [
            'Headers',
            'Bold/italic',
            'Code blocks',
            'Unordered lists',
            'Ordered lists',
            'Blockquotes',
            'Links',
            'Tables',
            'Horizontal rules'
        ];

        // If content has multiple markdown patterns, likely markdown
        const foundPatterns = markdownPatterns.map((pattern, index) => ({
            name: patternNames[index],
            found: pattern.test(content)
        }));

        const patternMatches = foundPatterns.filter(p => p.found).length;
        const isMarkdown = patternMatches >= 2;

        log.debug('Markdown detection analysis', {
            contentLength: content.length,
            contentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
            foundPatterns: foundPatterns.filter(p => p.found).map(p => p.name),
            totalPatternMatches: patternMatches,
            isMarkdown,
            threshold: 2
        });

        return isMarkdown; // Require at least 2 patterns to be confident
    }
} 