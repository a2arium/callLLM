import type { ModelInfo } from '../../interfaces/UniversalInterfaces.ts';
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
        maxCharsPerChunk
    }: {
        message: string;
        data?: any;
        endingMessage?: string;
        model: ModelInfo;
        maxResponseTokens?: number;
        maxCharsPerChunk?: number;
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

        // If no data or null data, return single message
        if (data === undefined || data === null) {
            log.debug('No data provided, returning single message');
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
            maxCharsPerChunk
        });

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