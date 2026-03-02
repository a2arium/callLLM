import type { ModelInfo, JSONSchemaDefinition, UniversalMessage } from '../../interfaces/UniversalInterfaces.ts';
import { TokenCalculator } from '../models/TokenCalculator.ts';
import { DataSplitter } from './DataSplitter.ts';
import { logger } from '../../utils/logger.ts';

export class RequestProcessor {
    private tokenCalculator: TokenCalculator;
    private dataSplitter: DataSplitter;

    constructor() {
        this.tokenCalculator = new TokenCalculator();
        this.dataSplitter = new DataSplitter(this.tokenCalculator);
    }

    public async processRequest({
        message,
        data,
        endingMessage,
        model,
        maxResponseTokens,
        maxCharsPerChunk,
        jsonSchema,
        historicalMessages,
        historyMode
    }: {
        message: string;
        data?: any;
        endingMessage?: string;
        model: ModelInfo;
        maxResponseTokens?: number;
        maxCharsPerChunk?: number;
        jsonSchema?: { name?: string; schema: JSONSchemaDefinition };
        historicalMessages?: UniversalMessage[];
        historyMode?: string;
    }): Promise<string[]> {
        const log = logger.createLogger({ prefix: 'RequestProcessor.processRequest' });
        log.debug('Processing request', {
            message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
            messageLength: message.length,
            dataType: typeof data,
            dataLength: typeof data === 'string' ? data.length : Array.isArray(data) ? data.length : typeof data === 'object' && data !== null ? Object.keys(data).length : undefined,
            endingMessage: endingMessage?.substring(0, 50) + (endingMessage && endingMessage.length > 50 ? '...' : ''),
            endingMessageLength: endingMessage?.length || 0,
            maxCharsPerChunk,
            maxResponseTokens,
            modelName: model.name,
            modelMaxRequestTokens: model.maxRequestTokens
        });

        // If no data or null data
        if (data === undefined || data === null) {
            // Filter out the current message from historicalMessages if it's the last one
            // This prevents double-counting the message as both "context" and "data to split"
            let contextMessages = historicalMessages;
            if (historicalMessages && historicalMessages.length > 0) {
                const lastMsg = historicalMessages[historicalMessages.length - 1];
                if (lastMsg.role === 'user' && lastMsg.content === message) {
                    contextMessages = historicalMessages.slice(0, -1);
                }
            }

            // Calculate if the message itself needs splitting
            const messageTokens = this.tokenCalculator.calculateTokens(message);
            const endingTokens = endingMessage ? this.tokenCalculator.calculateTokens(endingMessage) : 0;
            const contextTokens = contextMessages ? this.tokenCalculator.calculateTotalTokens(contextMessages) : 0;
            const overhead = 500; // Conservative overhead for protocol/system message

            // Check if message exceeds safe limits (using 90% of maxRequestTokens as safety margin like DataSplitter)
            // We must subtract contextTokens here to get the true available space
            // Ensure safeLimit is at least a small positive value to avoid premature splitting for tiny models
            const responseTokens = (maxResponseTokens || model.maxResponseTokens || 1000);
            const dynamicOverhead = Math.min(overhead, Math.floor(model.maxRequestTokens * 0.1));
            const safeLimit = Math.max(
                100, // Absolute minimum of 100 tokens for the message itself
                (model.maxRequestTokens * 0.9) - responseTokens - dynamicOverhead - contextTokens
            );

            if (messageTokens + endingTokens > safeLimit) {
                log.info(`Message exceeds token limit (${messageTokens + endingTokens} > ${Math.floor(safeLimit)}), splitting into chunks...`, {
                    messageTokens,
                    safeLimit,
                    contextTokens,
                    maxRequestTokens: model.maxRequestTokens
                });

                // Treat the message as data to be split
                // We pass an empty message string so DataSplitter calculates available space correctly based on the 'data' (which is our message)
                const chunks = await this.dataSplitter.splitIfNeeded({
                    message: '', // No prefix for the chunks
                    data: message, // The message becomes the data
                    endingMessage,
                    modelInfo: model,
                    maxResponseTokens: maxResponseTokens || model.maxResponseTokens,
                    maxCharsPerChunk,
                    jsonSchema,
                    historicalMessages: contextMessages, // Pass the context WITHOUT the current message
                    historyMode
                });

                log.info(`Split large message into ${chunks.length} chunks`, { count: chunks.length });

                // Convert chunks to messages
                return chunks.map((chunk, index) => {
                    const chunkContent = typeof chunk.content === 'object'
                        ? JSON.stringify(chunk.content, null, 2)
                        : String(chunk.content);

                    // Direct construction to avoid leading newlines that createMessage would add if message is empty
                    let result = chunkContent;
                    if (endingMessage) {
                        result += '\n\n' + endingMessage;
                    }
                    return result;
                });
            }

            log.debug('No data provided and message fits, returning single message');
            return [this.createMessage(message, undefined, endingMessage)];
        }

        log.debug('Data provided, calling DataSplitter.splitIfNeeded');

        // Use DataSplitter to split the data if needed
        const chunks = await this.dataSplitter.splitIfNeeded({
            message,
            data,
            endingMessage,
            modelInfo: model,
            maxResponseTokens: maxResponseTokens || model.maxResponseTokens,
            maxCharsPerChunk,
            jsonSchema,
            historicalMessages,
            historyMode
        });

        if (chunks.length > 1) {
            log.info(`Data split into ${chunks.length} chunks`, { chunkCount: chunks.length });
        }

        log.debug('DataSplitter returned chunks', {
            chunkCount: chunks.length,
            chunkSizes: chunks.map(c => ({
                index: c.chunkIndex,
                tokenCount: c.tokenCount,
                contentLength: typeof c.content === 'string' ? c.content.length : JSON.stringify(c.content).length,
                contentType: c.metadata?.contentType
            }))
        });

        // Convert chunks to messages
        const messages = chunks.map((chunk, index) => {
            const dataString = typeof chunk.content === 'object'
                ? JSON.stringify(chunk.content, null, 2)
                : String(chunk.content);
            const createdMessage = this.createMessage(message, dataString, endingMessage);
            log.debug(`Created message for chunk ${index}`, {
                chunkIndex: chunk.chunkIndex,
                messageLength: createdMessage.length,
                dataStringLength: dataString.length,
                messagePreview: createdMessage.substring(0, 100) + (createdMessage.length > 100 ? '...' : '')
            });
            return createdMessage;
        });

        log.debug('Request processing completed', {
            inputDataLength: typeof data === 'string' ? data.length : JSON.stringify(data).length,
            chunksCreated: chunks.length,
            messagesCreated: messages.length,
            totalMessageLength: messages.reduce((sum, msg) => sum + msg.length, 0)
        });

        return messages;
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