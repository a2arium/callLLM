import { TokenCalculator } from '../models/TokenCalculator';
import { ResponseProcessor } from '../processors/ResponseProcessor';
import { UsageCallback } from '../../interfaces/UsageInterfaces';
import { logger } from '../../utils/logger';
import { UniversalChatParams, UniversalStreamResponse, UniversalChatResponse, ModelInfo, FinishReason, UniversalMessage } from '../../interfaces/UniversalInterfaces';
import { StreamPipeline } from './StreamPipeline';
import { UsageTrackingProcessor } from './processors/UsageTrackingProcessor';
import { ContentAccumulator } from './processors/ContentAccumulator';
import { UsageTracker } from '../telemetry/UsageTracker';
import { z } from 'zod';
import { SchemaValidator, SchemaValidationError } from '../schema/SchemaValidator';
import { StreamChunk } from './types';
import { ToolController } from '../tools/ToolController';
import { ToolOrchestrator } from '../tools/ToolOrchestrator';
import { ToolCall } from '../../types/tooling';
import { HistoryManager } from '../history/HistoryManager';
import { IStreamProcessor } from './types';
import { StreamHistoryProcessor } from './processors/StreamHistoryProcessor';
import { StreamingService } from './StreamingService';

export class StreamHandler {
    private readonly tokenCalculator: TokenCalculator;
    private readonly responseProcessor: ResponseProcessor;
    private readonly usageTracker: UsageTracker;
    private readonly callerId?: string;
    private readonly toolController?: ToolController;
    private readonly toolOrchestrator?: ToolOrchestrator;
    private readonly historyManager: HistoryManager;
    private readonly historyProcessor: StreamHistoryProcessor;
    private readonly streamingService?: StreamingService;

    constructor(
        tokenCalculator: TokenCalculator,
        historyManager: HistoryManager,
        responseProcessor: ResponseProcessor = new ResponseProcessor(),
        usageCallback?: UsageCallback,
        callerId?: string,
        toolController?: ToolController,
        toolOrchestrator?: ToolOrchestrator,
        streamingService?: StreamingService
    ) {
        this.tokenCalculator = tokenCalculator;
        this.responseProcessor = responseProcessor;
        this.usageTracker = new UsageTracker(tokenCalculator, usageCallback, callerId);
        this.callerId = callerId;
        this.toolController = toolController;
        this.toolOrchestrator = toolOrchestrator;
        this.historyManager = historyManager;
        this.historyProcessor = new StreamHistoryProcessor(this.historyManager);
        this.streamingService = streamingService;

        logger.setConfig({
            level: process.env.LOG_LEVEL as any || 'info',
            prefix: 'StreamHandler'
        });
        logger.debug('Initialized StreamHandler', { callerId });
    }

    /**
     * Processes a stream of responses with schema validation and content accumulation.
     * Usage tracking is now handled by the UsageTrackingProcessor in the pipeline.
     */
    public async *processStream<T extends z.ZodType | undefined = undefined>(
        stream: AsyncIterable<UniversalStreamResponse>,
        params: UniversalChatParams,
        inputTokens: number,
        modelInfo: ModelInfo
    ): AsyncGenerator<UniversalStreamResponse<T extends z.ZodType ? z.infer<T> : unknown>> {
        const log = logger.createLogger({ prefix: 'StreamHandler.processStream' });

        const startTime = Date.now();
        log.debug('Starting stream processing', {
            inputTokens,
            jsonMode: params.settings?.responseFormat === 'json',
            hasSchema: Boolean(params.settings?.jsonSchema),
            callerId: params.callerId || this.callerId,
            isStreamModeEnabled: params.settings?.stream === true,
            toolsEnabled: Boolean(params.settings?.tools?.length),
            modelName: modelInfo.name
        });

        // Create the content accumulator
        const contentAccumulator = new ContentAccumulator();

        // Create the usage processor
        const usageProcessor = this.usageTracker.createStreamProcessor(
            inputTokens,
            modelInfo,
            {
                inputCachedTokens: params.inputCachedTokens,
                callerId: params.callerId || this.callerId,
                tokenBatchSize: 100 // Set the batch size for usage callbacks
            }
        );

        // Build the pipeline with processors
        const pipelineProcessors: IStreamProcessor[] = [
            contentAccumulator,
            usageProcessor
        ];

        // Add history processor to pipeline
        log.debug('Adding history processor to stream pipeline');
        pipelineProcessors.push(this.historyProcessor);

        const pipeline = new StreamPipeline(pipelineProcessors);

        // Convert the UniversalStreamResponse to StreamChunk for processing
        const streamChunks = this.convertToStreamChunks(stream);

        // Process through the pipeline
        const processedStream = pipeline.processStream(streamChunks);

        try {
            const schema = params.settings?.jsonSchema?.schema as T;
            const isJsonMode = params.settings?.responseFormat === 'json';

            let chunkCount = 0;
            let hasExecutedTools = false;
            let currentMessages: UniversalMessage[] = params.messages ? [...params.messages] : [];

            // Process the chunks after they've gone through the pipeline
            for await (const chunk of processedStream) {
                log.debug('Chunk before processing:', JSON.stringify(chunk, null, 2));
                chunkCount++;

                // Map tool calls from StreamChunk format to UniversalStreamResponse format
                const toolCalls = chunk.toolCalls?.map(call => ({
                    name: call.name,
                    arguments: call.arguments || {},
                    id: (call as any).id
                }));

                // Create a universal response from the processed chunk
                const response: UniversalStreamResponse<T extends z.ZodType ? z.infer<T> : unknown> = {
                    content: chunk.content || '',
                    role: 'assistant',
                    isComplete: chunk.isComplete || false,
                    toolCalls,
                    metadata: {
                        ...chunk.metadata,
                        processInfo: {
                            currentChunk: chunkCount,
                            totalChunks: 0 // Will be updated when stream completes
                        }
                    }
                };

                // Process tool calls if they are complete and we have toolController
                if (chunk.isComplete &&
                    this.toolController &&
                    this.toolOrchestrator &&
                    (
                        // Check both finishReason metadata and actual presence of tool calls
                        chunk.metadata?.finishReason === FinishReason.TOOL_CALLS ||
                        (chunk.toolCalls && chunk.toolCalls.length > 0) ||
                        contentAccumulator.getCompletedToolCalls().length > 0
                    ) &&
                    !hasExecutedTools) {

                    log.debug('Tool calls detected, processing with ToolOrchestrator.processToolCalls');
                    hasExecutedTools = true;

                    // Get completed tool calls
                    const completedToolCalls = contentAccumulator.getCompletedToolCalls();

                    if (completedToolCalls.length > 0) {
                        // Add the current response as an assistant message
                        const assistantMessage: UniversalMessage = {
                            role: 'assistant',
                            content: contentAccumulator.getAccumulatedContent(),
                            toolCalls: completedToolCalls.map(call => ({
                                id: call.id || `call_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                                name: call.name,
                                arguments: call.arguments || {}
                            }))
                        };

                        yield {
                            ...assistantMessage,
                            isComplete: false
                        };

                        // Process each tool call
                        log.debug(`Processing ${completedToolCalls.length} tool calls`);

                        const { requiresResubmission } = await this.toolOrchestrator?.processToolCalls(response);
                        if (!requiresResubmission) return; // If no need to submit tool calls, return

                        // Get updated history for creating a continuation stream
                        const updatedMessages = this.historyManager.getHistoricalMessages();

                        log.debug('Creating continuation stream with updated history', {
                            messagesCount: updatedMessages.length
                        });

                        // Extract system message
                        const systemMessage = params.messages?.find(m => m.role === 'system')?.content || '';

                        try {
                            // Make sure we have streamingService before using it
                            if (!this.streamingService) {
                                throw new Error("StreamingService not available for creating continuation stream");
                            }

                            // Create a new stream using StreamingService with updated history
                            const continuationStream = await this.streamingService.createStream(
                                {
                                    messages: updatedMessages,
                                    settings: {
                                        ...params.settings,
                                        stream: true,
                                        tools: undefined, // No tools in the continuation
                                        toolChoice: undefined
                                    }
                                },
                                modelInfo.name,
                                systemMessage
                            );

                            // Forward the stream chunks to the client
                            log.debug('Starting to process continuation stream chunks');
                            let forwardedChunks = 0;

                            for await (const chunk of continuationStream) {
                                log.debug('Forwarding continuation chunk', {
                                    chunkNumber: ++forwardedChunks,
                                    hasContent: Boolean(chunk.content),
                                    contentLength: chunk.content?.length || 0,
                                    isComplete: chunk.isComplete
                                });

                                yield {
                                    ...chunk,
                                    contentObject: null as any
                                };

                                if (chunk.isComplete) {
                                    // Add the final response to history
                                    if (chunk.content) {
                                        this.historyManager.addMessage('assistant', chunk.content);
                                    }

                                    log.debug('Continuation stream complete', {
                                        totalChunks: forwardedChunks
                                    });
                                }
                            }
                        } catch (error) {
                            log.error('Error in continuation stream:', error);
                            yield {
                                role: 'assistant',
                                content: `Error generating response: ${error instanceof Error ? error.message : String(error)}`,
                                isComplete: true
                            };
                        }

                        // We've handled the full stream, so return
                        return;
                    }
                }

                // Add the accumulated content when complete
                if (chunk.isComplete) {
                    const accumulatedContent = contentAccumulator.getAccumulatedContent();
                    response.contentText = accumulatedContent;

                    // // If the finish reason is tool_calls, ensure we include all completed tool calls
                    // const finishReason = chunk.metadata?.finishReason;
                    // if (finishReason === FinishReason.TOOL_CALLS) {
                    //     log.debug('Finish reason is TOOL_CALLS, retrieving completed tool calls');
                    //     const completedToolCalls = contentAccumulator.getCompletedToolCalls();

                    //     if (completedToolCalls.length > 0) {
                    //         log.debug('Retrieved completed tool calls', { count: completedToolCalls.length });

                    //         // Update or create the toolCalls array in the response
                    //         response.toolCalls = completedToolCalls.map(call => ({
                    //             name: call.name,
                    //             arguments: call.arguments || {},
                    //             id: (call as any).id
                    //         }));
                    //     }
                    // }

                    // Handle JSON validation and parsing
                    if (isJsonMode && schema) {
                        try {
                            // Parse and validate JSON content
                            const formattedResponse = {
                                content: accumulatedContent,
                                role: 'assistant'
                            };

                            // Use SchemaValidator directly since ResponseProcessor doesn't have validateJsonResponse
                            const parsedJson = SchemaValidator.validate(
                                JSON.parse(accumulatedContent),
                                schema
                            );

                            response.contentObject = parsedJson as any;
                        } catch (error) {
                            log.warn('JSON validation failed', { error });
                            if (response.metadata) {
                                response.metadata.validationErrors =
                                    error instanceof SchemaValidationError
                                        ? error.validationErrors
                                        : [{ message: String(error), path: '' }];
                            }
                        }
                    }

                    // Update total chunks info
                    if (response.metadata?.processInfo) {
                        response.metadata.processInfo.totalChunks = chunkCount;
                    }

                    log.debug('Stream processing complete', {
                        processingTimeMs: Date.now() - startTime,
                        totalChunks: chunkCount
                    });

                }

                yield response;
            }
        } catch (error: unknown) {
            log.error('Error in stream processing', { error });
            throw error;
        }
    }

    /**
     * Converts a UniversalStreamResponse stream to StreamChunk stream
     * for processing by our stream processors
     * It just proxies for now, but could be extended to add additional processing
     * @param stream - The UniversalStreamResponse stream to convert
     * @returns An AsyncIterable of StreamChunk objects
     */
    private async *convertToStreamChunks(
        stream: AsyncIterable<UniversalStreamResponse>
    ): AsyncIterable<StreamChunk> {
        for await (const chunk of stream) {
            yield chunk as StreamChunk;
        }
    }
} 