import { TokenCalculator } from '../models/TokenCalculator';
import { logger } from '../../utils/logger';
// DataSplitter might not be used if RequestProcessor handles splitting
// import { DataSplitter } from '../processors/DataSplitter';
import {
    JSONSchemaDefinition,
    ResponseFormat,
    UniversalChatParams,
    UniversalChatResponse,
    UniversalChatSettings,
    UniversalMessage,
    UniversalStreamResponse
} from '../../interfaces/UniversalInterfaces';
import { ChatController } from '../chat/ChatController';
// Use StreamControllerInterface or StreamController based on what's passed
import { StreamController } from '../streaming/StreamController';
import { HistoryManager } from '../history/HistoryManager';
import { toMessageParts } from '../../interfaces/UniversalInterfaces';
import type { ToolDefinition } from '../../types/tooling';

/**
 * Error thrown when chunk iteration limit is exceeded
 */
export class ChunkIterationLimitError extends Error {
    constructor(maxIterations: number) {
        super(`Chunk iteration limit of ${maxIterations} exceeded`);
        this.name = "ChunkIterationLimitError";
    }
}

/**
 * Processing parameters for streamChunks and processChunks
 * Includes all the parameters needed for both methods
 */
export type ChunkProcessingParams = {
    model: string;
    historicalMessages?: UniversalMessage[]; // Base history before chunk processing starts
    settings?: UniversalChatSettings;
    jsonSchema?: { name?: string; schema: JSONSchemaDefinition };
    responseFormat?: ResponseFormat;
    tools?: ToolDefinition[];
    callerId?: string; // Add callerId for usage tracking
    maxCharsPerChunk?: number; // New: max characters per chunk
};

/**
 * ChunkController processes data chunks (text/JSON) that exceed context limits.
 * It interacts with ChatController/StreamController for each chunk.
 */
export class ChunkController {
    private iterationCount: number = 0;
    private maxIterations: number;

    constructor(
        private tokenCalculator: TokenCalculator, // Needed for token calculations
        private chatController: ChatController,
        private streamController: StreamController, // Or StreamControllerInterface
        private historyManager: HistoryManager, // Main history manager (might not be directly needed here)
        maxIterations: number = 20
    ) {
        this.maxIterations = maxIterations;
        const log = logger.createLogger({
            level: process.env.LOG_LEVEL as any || 'info',
            prefix: 'ChunkController.constructor'
        });
        log.debug(`Initialized with maxIterations: ${maxIterations}`);
    }

    /**
     * Processes chunked messages for non-streaming responses.
     */
    async processChunks(
        messages: string[],
        params: ChunkProcessingParams
    ): Promise<UniversalChatResponse[]> {
        this.resetIterationCount();
        const responses: UniversalChatResponse[] = [];
        const chunkProcessingHistory = new HistoryManager(); // Temp history for this sequence
        let currentSystemMessage = ''; // Track system message for the sequence

        // Initialize temp history with provided base historical messages
        if (params.historicalMessages) {
            const systemMsg = params.historicalMessages.find((m: UniversalMessage) => m.role === 'system');
            if (systemMsg) {
                const parts = toMessageParts(systemMsg.content);
                currentSystemMessage = systemMsg.content;
                chunkProcessingHistory.updateSystemMessage(currentSystemMessage, false); // Set system message
                // Add back non-system messages
                params.historicalMessages.filter((m: UniversalMessage) => m.role !== 'system')
                    .forEach(m => chunkProcessingHistory.addMessage(m.role, m.content, m));
            } else {
                chunkProcessingHistory.setHistoricalMessages(params.historicalMessages);
            }
        }

        for (const chunkContent of messages) {
            if (this.iterationCount >= this.maxIterations) {
                logger.warn(`Chunk iteration limit exceeded: ${this.maxIterations}`);
                throw new ChunkIterationLimitError(this.maxIterations);
            }
            this.iterationCount++;

            chunkProcessingHistory.addMessage('user', chunkContent);

            // Construct parameters for ChatController.execute
            // Assuming ChatController.execute accepts UniversalChatParams
            const chatParams: UniversalChatParams = {
                model: params.model,
                messages: this.getMessagesFromHistory(chunkProcessingHistory), // Includes system message if present in history
                settings: params.settings,
                jsonSchema: params.jsonSchema,
                responseFormat: params.responseFormat,
                tools: params.tools,
                // Add callerId if needed by ChatController
                // callerId: this.callerId // Assuming callerId is accessible or passed down
            };

            // Call execute with the full UniversalChatParams object
            const response = await this.chatController.execute(chatParams);

            // Check if response exists before accessing properties
            if (response) {
                // Update temporary history - Safely access content
                if (response.content) { // Check if content exists and is not null/undefined
                    chunkProcessingHistory.addMessage('assistant', response.content);
                } else if (response.toolCalls && response.toolCalls.length > 0) {
                    // If no content but tool calls exist, add an empty assistant message with tool calls
                    chunkProcessingHistory.addMessage('assistant', '', { toolCalls: response.toolCalls });
                }
                // If neither content nor tool calls exist, we might not add anything to history, or add an empty message depending on desired behavior.
                // Current logic implicitly does nothing in that case.

                responses.push(response);
            } else {
                // Handle the case where chatController.execute returns undefined/null
                logger.warn('ChatController.execute returned no response for a chunk');
                // Depending on desired behavior, you might push a placeholder or skip
            }
        }
        return responses;
    }

    /**
     * Asynchronously streams responses from multiple text chunks as a single stream
     * This method is part of the refactoring effort to unify code paths between 
     * single-chunk and multi-chunk processing.
     * 
     * IMPLEMENTATION NOTE:
     * This creates a synthetic stream from chunk responses to maintain consistent behavior
     * with the direct streaming path. Future improvements could include real-time streaming
     * of each chunk as it's processed.
     * 
     * Key benefits:
     * - Caller code doesn't need to branch based on chunk count
     * - Consistent callerId propagation for usage tracking
     * - Identical parameter handling for all calls
     * - Unified history management 
     * 
     * @param chunks Array of text chunks to process
     * @param params Processing parameters
     * @returns An AsyncGenerator yielding stream responses
     */
    async *streamChunks(
        messages: string[],
        params: ChunkProcessingParams
    ): AsyncIterable<UniversalStreamResponse> {
        this.resetIterationCount();
        const chunkProcessingHistory = new HistoryManager(); // Temp history
        const totalChunks = messages.length;
        let currentSystemMessage = ''; // Track system message

        // Initialize temp history
        if (params.historicalMessages) {
            const systemMsg = params.historicalMessages.find((m: UniversalMessage) => m.role === 'system');
            if (systemMsg) {
                const parts = toMessageParts(systemMsg.content);
                currentSystemMessage = systemMsg.content;
                chunkProcessingHistory.updateSystemMessage(currentSystemMessage, false);
                params.historicalMessages.filter((m: UniversalMessage) => m.role !== 'system')
                    .forEach(m => chunkProcessingHistory.addMessage(m.role, m.content, m));
            } else {
                chunkProcessingHistory.setHistoricalMessages(params.historicalMessages);
            }
        }

        for (let i = 0; i < messages.length; i++) {
            const chunkContent = messages[i];
            if (this.iterationCount >= this.maxIterations) {
                logger.warn(`Chunk iteration limit exceeded: ${this.maxIterations}`);
                throw new ChunkIterationLimitError(this.maxIterations);
            }
            this.iterationCount++;

            chunkProcessingHistory.addMessage('user', chunkContent);

            // Construct parameters for streamController.createStream
            const streamParams: UniversalChatParams = {
                model: params.model,
                messages: this.getMessagesFromHistory(chunkProcessingHistory), // Includes system msg
                settings: params.settings,
                jsonSchema: params.jsonSchema,
                responseFormat: params.responseFormat,
                tools: params.tools,
            };

            // Calculate input tokens using the correct method name
            const inputTokens = await this.tokenCalculator.calculateTotalTokens(streamParams.messages);
            // const inputTokens = 0; // Assuming streamController handles calculation

            const chunkStream = await this.streamController.createStream(
                params.model,
                streamParams,
                inputTokens
            );

            let finalChunkData: UniversalStreamResponse | null = null;

            for await (const chunk of chunkStream) {
                chunk.metadata = { ...chunk.metadata, processInfo: { currentChunk: i + 1, totalChunks } };
                if (chunk.isComplete) finalChunkData = chunk;
                yield chunk;
            }

            // Update temporary history - Safely access contentText
            if (finalChunkData) {
                if (finalChunkData.contentText) { // Check if contentText exists
                    chunkProcessingHistory.addMessage('assistant', finalChunkData.contentText);
                } else if (finalChunkData.toolCalls && finalChunkData.toolCalls.length > 0) {
                    // If no content but tool calls exist, add an empty assistant message with tool calls
                    chunkProcessingHistory.addMessage('assistant', '', { toolCalls: finalChunkData.toolCalls });
                }
                // Consider if an empty message should be added if neither content nor tool calls are present in the final chunk
            } else {
                // Handle case where the stream finished without a final data chunk
                logger.debug('Stream finished without a final chunk containing content or tool calls.');
            }
        }
    }

    // Helper to get messages including system message from HistoryManager instance
    private getMessagesFromHistory(history: HistoryManager): UniversalMessage[] {
        const historyMsgs = history.getHistoricalMessages() || [];
        // Attempt to find system message within the history
        const systemMsg = historyMsgs.find((m: UniversalMessage) => m.role === 'system');
        if (systemMsg) {
            // If found, return all messages (assuming getHistoricalMessages includes it)
            return historyMsgs;
        } else {
            // If not found (perhaps cleared or never set), prepend a default or tracked one
            // Using a default here, but could use a class member if needed
            return [{ role: 'system', content: 'You are a helpful assistant.' }, ...historyMsgs];
        }
    }

    resetIterationCount(): void {
        this.iterationCount = 0;
    }
} 