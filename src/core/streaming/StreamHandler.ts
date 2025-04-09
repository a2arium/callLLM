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
            jsonMode: params.responseFormat === 'json',
            hasSchema: Boolean(params.jsonSchema),
            callerId: params.callerId || this.callerId,
            isStreamModeEnabled: params.settings?.stream === true,
            toolsEnabled: Boolean(params.tools?.length),
            modelName: modelInfo.name
        });

        // Determine JSON mode behavior
        const isJsonRequested = params.responseFormat === 'json' || params.jsonSchema;
        const hasNativeJsonSupport = modelInfo.capabilities?.jsonMode;
        const jsonMode = params.settings?.jsonMode ?? 'fallback';

        // Log JSON mode configuration
        console.log('[StreamHandler] Using JSON mode:', {
            mode: jsonMode,
            hasNativeSupport: hasNativeJsonSupport,
            isJsonRequested,
            modelName: modelInfo.name,
            schemaProvided: Boolean(params.jsonSchema)
        });

        // Determine if we should use prompt injection based on jsonMode setting
        const usePromptInjection = jsonMode === 'force-prompt' ||
            (jsonMode === 'fallback' && !hasNativeJsonSupport);

        // Get schema if available
        const schema = params.jsonSchema?.schema;

        // Initialize content accumulator
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
            let chunkCount = 0;
            let hasExecutedTools = false;
            let currentMessages: UniversalMessage[] = params.messages ? [...params.messages] : [];

            // Process the chunks after they've gone through the pipeline
            for await (const chunk of processedStream) {
                log.debug('Chunk before processing:', JSON.stringify(chunk, null, 2));
                chunkCount++;

                // Map tool calls from StreamChunk format to UniversalStreamResponse format
                const toolCalls = chunk.toolCalls?.map(call => {
                    if ('function' in call) {
                        return {
                            id: call.id ?? `call_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                            function: call.function
                        };
                    }
                    return {
                        id: call.id ?? `call_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                        name: call.name,
                        arguments: call.arguments ?? {}
                    };
                }) as ToolCall[] | undefined;

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
                        // Properly cast the completed tool calls
                        const mappedToolCalls = completedToolCalls.map(call => {
                            if ('function' in call) {
                                return {
                                    id: call.id ?? `call_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                                    type: 'function' as const,
                                    function: {
                                        name: typeof call.function === 'object' && call.function && 'name' in call.function
                                            ? String(call.function.name)
                                            : 'unknown',
                                        arguments: typeof call.function === 'object' && call.function && 'arguments' in call.function
                                            ? String(call.function.arguments)
                                            : '{}'
                                    }
                                };
                            }
                            return {
                                id: call.id ?? `call_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                                name: call.name,
                                arguments: call.arguments ?? {}
                            };
                        }) as ToolCall[];

                        const assistantMessage: UniversalMessage = {
                            role: 'assistant',
                            content: contentAccumulator.getAccumulatedContent(),
                            toolCalls: mappedToolCalls
                        };

                        // Add the message to the history manager to maintain conversation context
                        if (this.historyManager) {
                            this.historyManager.addMessage(
                                assistantMessage.role,
                                assistantMessage.content,
                                { toolCalls: assistantMessage.toolCalls }
                            );
                        }

                        yield {
                            ...assistantMessage,
                            isComplete: false,
                            toolCalls: assistantMessage.toolCalls
                        } as UniversalStreamResponse<T extends z.ZodType ? z.infer<T> : unknown>;

                        // Process tool calls - fixing argument count and callback types
                        const toolCallsResponse: UniversalChatResponse<unknown> = {
                            content: '',
                            role: 'assistant',
                            toolCalls: completedToolCalls
                        };

                        const toolCallsResult = await this.toolOrchestrator.processToolCalls(
                            toolCallsResponse
                        );

                        // If we have StreamingService, continue the stream with tool results
                        if (toolCallsResult.requiresResubmission && this.streamingService) {
                            // Create continuation messages
                            const toolMessages = this.historyManager.getLastMessages(5) || []; // Using existing method instead of getToolResultMessages, ensuring it's always an array

                            // Add the continuation to the stream
                            const continuationParams: UniversalChatParams = {
                                ...params,
                                messages: [...currentMessages, assistantMessage, ...(Array.isArray(toolMessages) ? toolMessages : [])]
                            };

                            const continuationStream = await this.streamingService.createStream(
                                continuationParams,
                                params.model
                            );

                            // Process the continuation stream
                            if (continuationStream) {
                                for await (const continuationChunk of continuationStream) {
                                    yield continuationChunk as UniversalStreamResponse<T extends z.ZodType ? z.infer<T> : unknown>;
                                }
                            }
                        } else if (toolCallsResult.requiresResubmission && !this.streamingService) {
                            // Handle case where StreamingService is not available
                            const errorMsg = 'StreamingService not available for tool call continuation';
                            log.error(errorMsg);

                            yield {
                                role: 'assistant',
                                content: `Error: ${errorMsg}. Tool results cannot be processed further.`,
                                isComplete: true,
                                metadata: {
                                    error: errorMsg,
                                    finishReason: FinishReason.ERROR
                                }
                            } as UniversalStreamResponse<T extends z.ZodType ? z.infer<T> : unknown>;
                        }

                        // Skip yielding the completed chunk since we've already handled it
                        continue;
                    }
                }

                // Add the accumulated content when complete
                if (chunk.isComplete) {
                    const accumulatedContent = contentAccumulator.getAccumulatedContent();
                    response.contentText = accumulatedContent;

                    // Handle JSON validation and parsing
                    if (isJsonRequested && schema) {
                        try {
                            // For prompt injection or force-prompt mode, use ResponseProcessor
                            if (usePromptInjection) {
                                log.info('Using prompt enhancement for JSON handling');
                                const validatedResponse = await this.responseProcessor.validateResponse({
                                    content: accumulatedContent,
                                    role: 'assistant'
                                }, {
                                    model: params.model,
                                    messages: [],
                                    jsonSchema: params.jsonSchema,
                                    responseFormat: 'json'
                                }, modelInfo, { usePromptInjection: true });

                                response.contentObject = validatedResponse.contentObject as any;

                                // Make sure validation errors are included in the metadata
                                if (validatedResponse.metadata?.validationErrors) {
                                    response.metadata = response.metadata || {};
                                    response.metadata.validationErrors = validatedResponse.metadata.validationErrors;
                                    log.warn('JSON validation errors:', validatedResponse.metadata.validationErrors);
                                }
                            } else {
                                log.info('Using native JSON mode');
                                // For native JSON mode, use direct schema validation
                                try {
                                    const parsedContent = JSON.parse(accumulatedContent);
                                    const parsedJson = SchemaValidator.validate(
                                        parsedContent,
                                        schema
                                    );
                                    response.contentObject = parsedJson as any;
                                } catch (validationError: unknown) {
                                    log.warn('JSON validation error in native mode:', validationError);
                                    response.metadata = response.metadata || {};

                                    if (validationError instanceof SchemaValidationError) {
                                        response.metadata.validationErrors = validationError.validationErrors.map(err => ({
                                            message: err.message,
                                            path: Array.isArray(err.path) ? err.path : [err.path]
                                        }));
                                    } else {
                                        // Improved handling of non-SchemaValidationError types
                                        response.metadata.validationErrors = [{
                                            message: validationError instanceof Error
                                                ? validationError.message
                                                : String(validationError),
                                            path: [''] // Default path when specific path isn't available
                                        }];
                                    }

                                    response.metadata.finishReason = FinishReason.CONTENT_FILTER;
                                }
                            }
                        } catch (error: unknown) {
                            log.warn('JSON validation failed', { error });
                            response.metadata = response.metadata || {};

                            // Handle different error types consistently
                            if (error instanceof SchemaValidationError) {
                                response.metadata.validationErrors = error.validationErrors.map(err => ({
                                    message: err.message,
                                    path: Array.isArray(err.path) ? err.path : [err.path]
                                }));
                            } else {
                                response.metadata.validationErrors = [{
                                    message: error instanceof Error
                                        ? error.message
                                        : String(error),
                                    path: ['']
                                }];
                            }

                            response.metadata.finishReason = FinishReason.CONTENT_FILTER;
                        }
                    }

                    // Update total chunks info
                    if (response.metadata?.processInfo) {
                        response.metadata.processInfo.totalChunks = chunkCount;
                    }

                    log.debug('Stream processing complete', {
                        processingTimeMs: Date.now() - startTime,
                        totalChunks: chunkCount,
                        isJsonPromptInjection: usePromptInjection,
                        hasValidationErrors: Boolean(response.metadata?.validationErrors)
                    });
                }

                yield response;
            }

            // Update metrics
            const totalTime = Date.now() - startTime;
            log.debug('Stream processing completed', {
                chunkCount,
                totalTimeMs: totalTime,
                model: modelInfo.name
            });
        } catch (error) {
            log.error('Error in stream processing:', error);
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