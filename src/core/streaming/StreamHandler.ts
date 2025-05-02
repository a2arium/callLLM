import { TokenCalculator } from '../models/TokenCalculator';
import { ResponseProcessor } from '../processors/ResponseProcessor';
import { UsageCallback } from '../../interfaces/UsageInterfaces';
import { logger } from '../../utils/logger';
import { UniversalChatParams, UniversalStreamResponse, UniversalChatResponse, ModelInfo, FinishReason, UniversalMessage } from '../../interfaces/UniversalInterfaces';
import { StreamPipeline } from './StreamPipeline';
import { UsageTrackingProcessor } from './processors/UsageTrackingProcessor';
import { ContentAccumulator } from './processors/ContentAccumulator';
import { ReasoningProcessor } from './processors/ReasoningProcessor';
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
    private readonly usageCallback?: UsageCallback;
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
        this.usageCallback = usageCallback;
        this.usageTracker = new UsageTracker(tokenCalculator, usageCallback, callerId);
        this.callerId = callerId;
        this.toolController = toolController;
        this.toolOrchestrator = toolOrchestrator;
        this.historyManager = historyManager;
        this.historyProcessor = new StreamHistoryProcessor(this.historyManager);
        this.streamingService = streamingService;

        const log = logger.createLogger({
            level: process.env.LOG_LEVEL as any || 'info',
            prefix: 'StreamHandler.constructor'
        });
        log.debug('Initialized StreamHandler', { callerId });
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

        // Extract call-specific tools for later use
        const callSpecificTools = params.tools;

        const startTime = Date.now();
        log.debug('Starting stream processing', {
            inputTokens,
            jsonMode: params.responseFormat === 'json',
            hasSchema: Boolean(params.jsonSchema),
            callerId: params.callerId || this.callerId,
            toolsEnabled: Boolean(params.tools?.length),
            modelName: modelInfo.name
        });

        // Determine JSON mode behavior
        const isJsonRequested = params.responseFormat === 'json' || params.jsonSchema;
        const hasNativeJsonSupport = typeof modelInfo.capabilities?.output?.text === 'object' &&
            modelInfo.capabilities.output.text.textOutputFormats?.includes('json');
        const jsonMode = params.settings?.jsonMode ?? 'fallback';

        // Log JSON mode configuration
        log.info('[StreamHandler] Using JSON mode:', {
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

        // Initialize reasoning processor
        const reasoningProcessor = new ReasoningProcessor();

        // Build the pipeline with processors
        const pipelineProcessors: IStreamProcessor[] = [contentAccumulator, reasoningProcessor];
        // Determine batch size: if we have a usage callback, default to 100 if not provided, otherwise 0
        const effectiveBatchSize = this.usageCallback
            ? (params.usageBatchSize !== undefined ? params.usageBatchSize : 100)
            : 0;
        if (effectiveBatchSize > 0) {
            const usageProcessor = this.usageTracker.createStreamProcessor(
                inputTokens,
                modelInfo,
                {
                    inputCachedTokens: params.inputCachedTokens,
                    callerId: params.callerId || this.callerId,
                    tokenBatchSize: effectiveBatchSize
                }
            );
            pipelineProcessors.push(usageProcessor);
        }

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
            // Track first-time flags
            let firstContentEmitted = false;
            let firstReasoningEmitted = false;
            let hasExecutedTools = false;
            let currentMessages: UniversalMessage[] = params.messages ? [...params.messages] : [];

            // Process the chunks after they've gone through the pipeline
            for await (const chunk of processedStream) {
                // Determine first-content and first-reasoning flags
                const isFirstContentChunk = !firstContentEmitted && Boolean(chunk.content);
                if (isFirstContentChunk) firstContentEmitted = true;
                const isFirstReasoningChunk = !firstReasoningEmitted && Boolean((chunk as any).reasoning);
                if (isFirstReasoningChunk) firstReasoningEmitted = true;

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
                    reasoning: (chunk as any).reasoning,
                    role: 'assistant',
                    isComplete: chunk.isComplete || false,
                    isFirstContentChunk,
                    isFirstReasoningChunk,
                    toolCalls,
                    metadata: {
                        ...chunk.metadata,
                        processInfo: {
                            currentChunk: chunkCount,
                            totalChunks: 0 // Will be updated when stream completes
                        }
                    }
                };

                // Use dedicated processor's accumulated reasoning
                response.reasoningText = reasoningProcessor.getAccumulatedReasoning();

                // Process tool calls if they are complete and we have toolController
                if (chunk.isComplete &&
                    this.toolController &&
                    this.toolOrchestrator &&
                    (
                        // Rely on the finishReason OR the presence of toolCalls on the yielded chunk
                        chunk.metadata?.finishReason === FinishReason.TOOL_CALLS ||
                        (chunk.toolCalls && chunk.toolCalls.length > 0)
                    ) &&
                    !hasExecutedTools) {

                    log.debug('Tool calls detected, processing with ToolOrchestrator.processToolCalls');

                    // Get completed tool calls directly from the chunk OR the content accumulator if not present
                    const completedToolCalls = chunk.toolCalls || contentAccumulator.getCompletedToolCalls() || [];
                    log.debug(`Processing ${completedToolCalls.length} tool calls`, {
                        chunkHasToolCalls: !!chunk.toolCalls,
                        chunkToolCallsCount: chunk.toolCalls?.length || 0,
                        accumulatorToolCallsCount: contentAccumulator.getCompletedToolCalls()?.length || 0,
                        finishReason: chunk.metadata?.finishReason
                    });

                    if (completedToolCalls.length > 0) {
                        log.debug(`Found ${completedToolCalls.length} completed tool calls to process:`,
                            completedToolCalls.map(call => ({ id: call.id, name: call.name })));
                        hasExecutedTools = true; // Mark as executed only if we found tools to process

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
                                { toolCalls: mappedToolCalls }
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
                            toolCallsResponse,
                            callSpecificTools
                        );

                        // If we have StreamingService, continue the stream with tool results
                        if (toolCallsResult.requiresResubmission && this.streamingService) {
                            // Create continuation messages
                            const toolMessages = this.historyManager.getLastMessages(5) || []; // Using existing method instead of getToolResultMessages, ensuring it's always an array

                            // Get all tool names that have been called
                            const toolNames = completedToolCalls
                                .map(call => call.name)
                                .filter(Boolean)
                                .join(', ');

                            // Create continuation messages with a system instruction that mentions all tools
                            const systemInstructionMessage: UniversalMessage = {
                                role: 'system',
                                content: `You have already called the following tools and received their results: ${toolNames}. Do not call these tools again for the same information. Use the information you have to complete your response.`
                            };

                            // Add the continuation to the stream
                            const continuationParams: UniversalChatParams = {
                                ...params,
                                messages: [...currentMessages, assistantMessage, ...(Array.isArray(toolMessages) ? toolMessages : []), systemInstructionMessage]
                            };

                            const continuationStream = await this.streamingService.createStream(
                                continuationParams,
                                params.model
                            );

                            // Reset hasExecutedTools so we can process more tools if needed
                            hasExecutedTools = false;

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
                    // Get the accumulated content *before* potential pollution by the final chunk's content
                    // We rely on the accumulator instance passed to the pipeline having the final state.
                    const cleanAccumulatedContent = contentAccumulator.getAccumulatedContent();
                    response.contentText = cleanAccumulatedContent; // Use the clean version here too

                    // Handle JSON validation and parsing
                    if (isJsonRequested && schema) {
                        try {
                            // For prompt injection or force-prompt mode, use ResponseProcessor
                            if (usePromptInjection) {
                                log.info('Using prompt enhancement for JSON handling');
                                const validatedResponse = await this.responseProcessor.validateResponse({
                                    content: cleanAccumulatedContent, // Use clean content
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
                                    log.debug('Validating accumulated JSON content:', {
                                        contentLength: cleanAccumulatedContent.length, // Log clean length
                                        contentPreview: cleanAccumulatedContent.slice(0, 100) + (cleanAccumulatedContent.length > 100 ? '...' : '')
                                    });

                                    // Parse the clean accumulated content directly from the accumulator
                                    const parsedContent = JSON.parse(cleanAccumulatedContent); // <--- Use clean content

                                    log.debug('Successfully parsed JSON, now validating against schema');
                                    // Then validate against the schema
                                    const parsedJson = SchemaValidator.validate(
                                        parsedContent,
                                        schema
                                    );

                                    log.debug('Schema validation passed successfully');
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
