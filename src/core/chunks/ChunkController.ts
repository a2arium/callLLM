import { TokenCalculator } from '../models/TokenCalculator.ts';
import { logger } from '../../utils/logger.ts';
// DataSplitter might not be used if RequestProcessor handles splitting
// import { DataSplitter } from '../processors/DataSplitter.ts';
import type {
    JSONSchemaDefinition,
    ResponseFormat,
    UniversalChatParams,
    UniversalChatResponse,
    UniversalChatSettings,
    UniversalMessage,
    UniversalStreamResponse,
    HistoryMode
} from '../../interfaces/UniversalInterfaces.ts';
import { ChatController } from '../chat/ChatController.ts';
// Use StreamControllerInterface or StreamController based on what's passed
import { StreamController } from '../streaming/StreamController.ts';
import { HistoryManager } from '../history/HistoryManager.ts';
import { toMessageParts } from '../../interfaces/UniversalInterfaces.ts';
import type { ToolDefinition } from '../../types/tooling.ts';
import type { ProviderExecutionContext } from '../caller/ProviderExecution.ts';

/**
 * Error thrown when chunk iteration limit is exceeded
 */
export class ChunkIterationLimitError extends Error {
    public readonly maxIterations: number;

    constructor(maxIterations: number) {
        super(`Chunk iteration limit of ${maxIterations} exceeded`);
        this.name = "ChunkIterationLimitError";
        this.maxIterations = maxIterations;

        // Ensure the error is JSON serializable
        Object.defineProperty(this, 'toJSON', {
            value: () => ({
                name: this.name,
                message: this.message,
                maxIterations: this.maxIterations,
                stack: this.stack
            }),
            enumerable: false
        });
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
    historyMode?: HistoryMode; // New: history mode for chunk processing
    maxIterations?: number; // New: max iterations for this sequence
    maxParallelRequests?: number; // New: max parallel requests (batch size)
    execution?: ProviderExecutionContext;
};

/**
 * ChunkController processes data chunks (text/JSON) that exceed context limits.
 * It interacts with ChatController/StreamController for each chunk.
 */
export class ChunkController {
    private iterationCount: number = 0;
    private maxIterations: number;
    private tokenCalculator: TokenCalculator;
    private chatController: ChatController;
    private streamController: StreamController;
    private historyManager: HistoryManager;

    constructor(
        tokenCalculator: TokenCalculator,
        chatController: ChatController,
        streamController: StreamController,
        historyManager: HistoryManager,
        maxIterations: number = 70 // Reverted default to 70
    ) {
        this.tokenCalculator = tokenCalculator;
        this.chatController = chatController;
        this.streamController = streamController;
        this.historyManager = historyManager;
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
        const log = logger.createLogger({ prefix: 'ChunkController.processChunks' });
        log.debug('Starting chunk processing', {
            messageCount: messages.length,
            maxIterations: this.maxIterations,
            currentIteration: this.iterationCount,
            maxCharsPerChunk: params.maxCharsPerChunk
        });

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
                chunkProcessingHistory.setMessages(params.historicalMessages);
            }
        }

        if (messages.length > 1) {
            log.info(`Processing ${messages.length} sequential chunks...`);
        }

        let chunkIndex = 0;
        for (const chunkContent of messages) {
            chunkIndex++;
            if (messages.length > 1) {
                log.info(`Processing chunk ${chunkIndex}/${messages.length}...`);
            }
            log.debug('Processing chunk', {
                chunkIndex: this.iterationCount + 1,
                maxIterations: this.maxIterations,
                chunkLength: chunkContent.length,
                chunkPreview: chunkContent.substring(0, 100) + (chunkContent.length > 100 ? '...' : '')
            });

            const effectiveMaxIterations = params.maxIterations ?? this.maxIterations;

            if (this.iterationCount >= effectiveMaxIterations) {
                log.warn(`Chunk iteration limit exceeded: ${effectiveMaxIterations}`, {
                    currentIteration: this.iterationCount,
                    totalChunks: messages.length,
                    processedChunks: responses.length
                });
                throw new ChunkIterationLimitError(effectiveMaxIterations);
            }
            this.iterationCount++;

            log.debug('Incremented iteration count', {
                currentIteration: this.iterationCount,
                maxIterations: this.maxIterations,
                remaining: this.maxIterations - this.iterationCount
            });

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

            log.debug('Calling ChatController.execute', {
                iteration: this.iterationCount,
                messageCount: chatParams.messages.length,
                hasJsonSchema: Boolean(params.jsonSchema),
                hasTools: Boolean(params.tools && params.tools.length > 0)
            });

            // Call execute with the full UniversalChatParams object
            const response = params.execution
                ? await this.chatController.execute(chatParams, params.execution)
                : await this.chatController.execute(chatParams);

            log.debug('Received response from ChatController', {
                iteration: this.iterationCount,
                hasContent: Boolean(response?.content),
                contentLength: response?.content?.length || 0,
                hasToolCalls: Boolean(response?.toolCalls && response.toolCalls.length > 0),
                toolCallCount: response?.toolCalls?.length || 0
            });

            // If stateless, clear history for next chunk (except system message)
            if (params.historyMode === 'stateless') {
                log.debug('Stateless mode: clearing history for next chunk');
                chunkProcessingHistory.setMessages([]);
                if (currentSystemMessage) {
                    chunkProcessingHistory.updateSystemMessage(currentSystemMessage, false);
                }
            } else if (response) {
                // Update temporary history - Safely access content
                if (response.content) { // Check if content exists and is not null/undefined
                    chunkProcessingHistory.addMessage('assistant', response.content);
                } else if (response.toolCalls && response.toolCalls.length > 0) {
                    // If no content but tool calls exist, add an empty assistant message with tool calls
                    chunkProcessingHistory.addMessage('assistant', '', { toolCalls: response.toolCalls });
                }
            }

            if (response) {
                responses.push(response);
            } else {
                // Handle the case where chatController.execute returns undefined/null
                log.warn('ChatController.execute returned no response for a chunk', {
                    iteration: this.iterationCount,
                    chunkLength: chunkContent.length
                });
                // Depending on desired behavior, you might push a placeholder or skip
            }
        }

        log.debug('Chunk processing completed', {
            totalIterations: this.iterationCount,
            maxIterations: this.maxIterations,
            responseCount: responses.length,
            totalChunks: messages.length
        });

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
                chunkProcessingHistory.setMessages(params.historicalMessages);
            }
        }

        for (let i = 0; i < messages.length; i++) {
            const chunkContent = messages[i];
            const effectiveMaxIterations = params.maxIterations ?? this.maxIterations;

            if (this.iterationCount >= effectiveMaxIterations) {
                logger.warn(`Chunk iteration limit exceeded: ${effectiveMaxIterations}`);
                throw new ChunkIterationLimitError(effectiveMaxIterations);
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

            const chunkStream = params.execution
                ? await this.streamController.createStream(
                    params.model,
                    streamParams,
                    inputTokens,
                    params.execution
                )
                : await this.streamController.createStream(
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

            // If stateless, clear history for next chunk (except system message)
            if (params.historyMode === 'stateless') {
                chunkProcessingHistory.setMessages([]);
                if (currentSystemMessage) {
                    chunkProcessingHistory.updateSystemMessage(currentSystemMessage, false);
                }
            } else if (finalChunkData) {
                // Update temporary history - Safely access contentText
                if (finalChunkData.contentText) { // Check if contentText exists
                    chunkProcessingHistory.addMessage('assistant', finalChunkData.contentText);
                } else if (finalChunkData.toolCalls && finalChunkData.toolCalls.length > 0) {
                    // If no content but tool calls exist, add an empty assistant message with tool calls
                    chunkProcessingHistory.addMessage('assistant', '', { toolCalls: finalChunkData.toolCalls });
                }
            } else {
                // Handle case where the stream finished without a final data chunk
                logger.debug('Stream finished without a final chunk containing content or tool calls.');
            }
        }
    }

    // Helper to get messages including system message from HistoryManager instance
    private getMessagesFromHistory(history: HistoryManager): UniversalMessage[] {
        const historyMsgs = history.getMessages() || [];
        // Attempt to find system message within the history
        const systemMsg = historyMsgs.find((m: UniversalMessage) => m.role === 'system');
        if (systemMsg) {
            // If found, return all messages (assuming getMessages includes it)
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

    /**
     * Processes chunked messages in PARALLEL for non-streaming responses.
     * This is much faster than sequential processing but may use more resources.
     */
    async processChunksParallel(
        messages: (string | UniversalMessage)[],
        params: ChunkProcessingParams
    ): Promise<UniversalChatResponse[]> {
        this.resetIterationCount();
        const log = logger.createLogger({ prefix: 'ChunkController.processChunksParallel' });
        log.debug('Starting parallel chunk processing', {
            messageCount: messages.length,
            maxIterations: this.maxIterations,
            maxCharsPerChunk: params.maxCharsPerChunk,
            maxParallelRequests: params.maxParallelRequests
        });

        // Check iteration limit upfront
        const effectiveMaxIterations = params.maxIterations ?? this.maxIterations;
        if (messages.length > effectiveMaxIterations) {
            log.warn(`Chunk count exceeds iteration limit: ${messages.length} > ${effectiveMaxIterations}`);
            throw new ChunkIterationLimitError(effectiveMaxIterations);
        }

        const maxParallelRequests = params.maxParallelRequests ?? 8; // Default batch size 8
        const results: UniversalChatResponse[] = new Array(messages.length);

        const totalChunks = messages.length;
        if (totalChunks > 1) {
            log.info(`Processing ${totalChunks} parallel chunks in batches of ${maxParallelRequests}...`);
        }

        for (let i = 0; i < totalChunks; i += maxParallelRequests) {
            const batch = messages.slice(i, i + maxParallelRequests);
            const batchNum = Math.floor(i / maxParallelRequests) + 1;
            const totalBatches = Math.ceil(totalChunks / maxParallelRequests);

            if (totalChunks > maxParallelRequests) {
                log.info(`Processing batch ${batchNum}/${totalBatches} (${batch.length} chunks)...`);
            }

            const batchPromises = batch.map(async (chunkContent, relativeIndex) => {
                const globalIndex = i + relativeIndex;
                const chunkLog = logger.createLogger({ prefix: `ChunkController.processChunksParallel.chunk${globalIndex + 1}` });

                // Create a separate history manager for this chunk
                const chunkHistory = new HistoryManager();

                // Optimization: In parallel mode, we ONLY send the system message.
                // Sending full history with every parallel chunk duplicates the history tokens
                // across all requests, often exceeding the context window (400 Bad Request).
                if (params.historicalMessages) {
                    const systemMsg = params.historicalMessages.find((m: UniversalMessage) => m.role === 'system');
                    if (systemMsg) {
                        chunkHistory.addMessage('system', systemMsg.content, systemMsg);
                    }
                }

                // Add the specific chunk message
                if (typeof chunkContent === 'string') {
                    chunkHistory.addMessage('user', chunkContent);
                } else {
                    chunkHistory.addMessage(chunkContent.role, chunkContent.content, chunkContent);
                }

                // Prepare chat params for this chunk
                const chunkChatParams: UniversalChatParams = {
                    model: params.model,
                    messages: chunkHistory.getMessages(),
                    settings: params.settings,
                    jsonSchema: params.jsonSchema,
                    responseFormat: params.responseFormat,
                    tools: params.tools
                };

                try {
                    const response = params.execution
                        ? await this.chatController.execute(chunkChatParams, params.execution)
                        : await this.chatController.execute(chunkChatParams);

                    // Store result in the correct position
                    results[globalIndex] = response;

                    chunkLog.debug(`Chunk ${globalIndex + 1}/${messages.length} completed`);
                    return response;
                } catch (error) {
                    chunkLog.error(`Error processing chunk ${globalIndex + 1}`, { error });
                    throw error; // Re-throw to fail the batch/process
                }
            });

            // Wait for the current batch to complete
            await Promise.all(batchPromises);
        }

        // Update iteration count to reflect actual work done
        this.iterationCount = messages.length;

        if (messages.length > 1) {
            log.info(`Parallel chunk processing completed. Total chunks: ${messages.length}`);
        }

        log.debug('Parallel chunk processing completed', {
            totalChunks: messages.length,
            responseCount: results.length
        });

        // Filter out any undefined results (though strict error handling above prevents gaps)
        return results.filter(Boolean);
    }
} 
