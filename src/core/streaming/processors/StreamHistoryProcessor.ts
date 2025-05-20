import { IStreamProcessor, StreamChunk } from '../types.js';
import { HistoryManager } from '../../history/HistoryManager.js';
import { logger } from '../../../utils/logger.js';

/**
 * Stream processor that captures response history
 * Implements the IStreamProcessor interface so it can be added to a StreamPipeline
 */
export class StreamHistoryProcessor implements IStreamProcessor {
    private historyManager: HistoryManager;

    /**
     * Creates a new StreamHistoryProcessor
     * @param historyManager The history manager to use for storing responses
     */
    constructor(historyManager: HistoryManager) {
        this.historyManager = historyManager;
        const log = logger.createLogger({
            level: process.env.LOG_LEVEL as any || 'debug',
            prefix: 'StreamHistoryProcessor.constructor'
        });
        log.debug('Initialized StreamHistoryProcessor');
    }

    /**
     * Processes a stream, tracking chunks in the history manager
     * @param stream The stream to process
     * @returns The original stream with history tracking
     */
    async *processStream(stream: AsyncIterable<StreamChunk>): AsyncIterable<StreamChunk> {
        const log = logger.createLogger({ prefix: 'StreamHistoryProcessor.processStream' });
        log.debug('Starting history processing of stream');

        let finalContent = '';

        for await (const chunk of stream) {
            // Accumulate content for complete message
            if (chunk.content) {
                finalContent += chunk.content;
            }

            // Save to history if this is the final chunk
            if (chunk.isComplete) {
                log.debug('Captured complete response in history: ', finalContent);

                // Skip adding the message to history if it contains tool calls
                // Tool calls will be handled by the special tool call handling code in StreamHandler
                const hasTool = chunk.toolCalls !== undefined && chunk.toolCalls.length > 0;
                const isToolCall = chunk.metadata?.finishReason === 'tool_calls';

                if (!(hasTool || isToolCall)) {
                    this.historyManager.captureStreamResponse(
                        finalContent,
                        true
                    );
                }
            }

            // Forward the chunk unmodified
            yield chunk;
        }
    }
} 