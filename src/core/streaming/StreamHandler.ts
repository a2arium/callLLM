import { TokenCalculator } from '../models/TokenCalculator';
import { ResponseProcessor } from '../processors/ResponseProcessor';
import { UsageCallback } from '../../interfaces/UsageInterfaces';
import { logger } from '../../utils/logger';
import { UniversalChatParams, UniversalStreamResponse, UniversalChatResponse, ModelInfo, FinishReason, UniversalMessage } from '../../interfaces/UniversalInterfaces';
import { StreamPipeline } from './StreamPipeline';
import { ContentAccumulator } from './processors/ContentAccumulator';
import { UsageTracker } from '../telemetry/UsageTracker';
import { z } from 'zod';
import { SchemaValidator, SchemaValidationError } from '../schema/SchemaValidator';
import { StreamChunk } from './types';
import { ToolController } from '../tools/ToolController';
import { ToolOrchestrator } from '../tools/ToolOrchestrator';
import { ToolCall } from '../../types/tooling';

export class StreamHandler {
    private readonly tokenCalculator: TokenCalculator;
    private readonly responseProcessor: ResponseProcessor;
    private readonly usageTracker: UsageTracker;
    private readonly callerId?: string;
    private readonly toolController?: ToolController;
    private readonly toolOrchestrator?: ToolOrchestrator;

    constructor(
        tokenCalculator: TokenCalculator,
        responseProcessor: ResponseProcessor = new ResponseProcessor(),
        usageCallback?: UsageCallback,
        callerId?: string,
        toolController?: ToolController,
        toolOrchestrator?: ToolOrchestrator
    ) {
        this.tokenCalculator = tokenCalculator;
        this.responseProcessor = responseProcessor;
        this.usageTracker = new UsageTracker(tokenCalculator, usageCallback, callerId);
        this.callerId = callerId;
        this.toolController = toolController;
        this.toolOrchestrator = toolOrchestrator;

        logger.setConfig({
            level: process.env.LOG_LEVEL as any || 'info',
            prefix: 'StreamHandler'
        });
        logger.debug('Initialized StreamHandler', { callerId });
    }

    /**
     * Processes tool calls retrieved from the stream and yields progress updates
     * @param toolCalls The tool calls to process
     * @param params The chat parameters
     * @param messages The current conversation messages
     * @returns AsyncGenerator yielding tool execution progress and results
     */
    private async *processToolCallsStreaming(
        toolCalls: Array<{ name: string; arguments: Record<string, unknown>; id?: string }>,
        params: UniversalChatParams,
        messages: UniversalMessage[]
    ): AsyncGenerator<{
        response: UniversalStreamResponse;
        updatedMessages: UniversalMessage[];
    }> {
        if (!this.toolController) {
            throw new Error('ToolController is required for tool call processing');
        }

        const log = logger.createLogger({ prefix: 'StreamHandler.processToolCallsStreaming' });
        log.debug('Processing tool calls in streaming mode', { count: toolCalls.length });

        const updatedMessages = [...messages];
        const processedToolCalls: Array<{
            id: string;
            toolName: string;
            arguments: Record<string, unknown>;
            result?: string;
            error?: string;
        }> = [];

        // Add the assistant message with tool calls
        const assistantMessage: UniversalMessage = {
            role: 'assistant',
            content: ' ',
            toolCalls: toolCalls.map(call => ({
                id: call.id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: call.name,
                arguments: call.arguments
            }))
        };
        updatedMessages.push(assistantMessage);

        // Process each tool call sequentially, but stream progress updates
        for (const call of toolCalls) {
            const toolCallId = call.id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            try {
                // Yield "tool execution started" update
                yield {
                    response: {
                        role: 'assistant',
                        content: '',
                        isComplete: false,
                        metadata: {
                            toolStatus: 'running',
                            toolName: call.name,
                            toolId: toolCallId
                        }
                    },
                    updatedMessages
                };

                const toolCall: ToolCall = {
                    id: toolCallId,
                    name: call.name,
                    arguments: call.arguments
                };

                log.debug(`Executing tool call: ${call.name}`, { id: toolCallId });
                const result = await this.toolController.executeToolCall(toolCall);

                // Format the result as a string
                const resultStr = typeof result === 'string' ? result : JSON.stringify(result);

                // Add tool result message
                const toolResultMessage: UniversalMessage = {
                    role: 'tool',
                    content: resultStr,
                    toolCallId
                };
                updatedMessages.push(toolResultMessage);

                // Track the processed tool call
                processedToolCalls.push({
                    id: toolCallId,
                    toolName: call.name,
                    arguments: call.arguments,
                    result: resultStr
                });

                log.debug(`Successfully executed tool: ${call.name}`);

                // Yield "tool execution completed" update
                yield {
                    response: {
                        role: 'assistant',
                        content: '',
                        isComplete: false,
                        toolCalls: [{
                            name: call.name,
                            arguments: call.arguments
                        }],
                        toolCallResults: [{
                            id: toolCallId,
                            name: call.name,
                            result: resultStr
                        }],
                        metadata: {
                            toolStatus: 'complete',
                            toolName: call.name,
                            toolId: toolCallId,
                            toolResult: resultStr
                        }
                    },
                    updatedMessages
                };
            } catch (error) {
                log.error(`Error executing tool ${call.name}:`, error);
                const errorMessage = error instanceof Error ? error.message : String(error);

                // Track the error
                processedToolCalls.push({
                    id: toolCallId,
                    toolName: call.name,
                    arguments: call.arguments,
                    error: errorMessage
                });

                // Add error as a system message
                const errorSystemMessage: UniversalMessage = {
                    role: 'system',
                    content: `Error executing tool ${call.name}: ${errorMessage}`
                };
                updatedMessages.push(errorSystemMessage);

                // Yield "tool execution error" update
                yield {
                    response: {
                        role: 'assistant',
                        content: '',
                        isComplete: false,
                        metadata: {
                            toolStatus: 'error',
                            toolName: call.name,
                            toolId: toolCallId,
                            toolError: errorMessage
                        }
                    },
                    updatedMessages
                };
            }
        }
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

        // Create a pipeline with our processors
        const contentAccumulator = new ContentAccumulator();

        // Create the usage tracking processor via the UsageTracker
        const usageProcessor = this.usageTracker.createStreamProcessor(
            inputTokens,
            modelInfo,
            {
                inputCachedTokens: params.inputCachedTokens,
                callerId: params.callerId || this.callerId,
                tokenBatchSize: 100 // Set the batch size for usage callbacks
            }
        );

        // Build the pipeline
        const pipeline = new StreamPipeline([
            contentAccumulator,
            usageProcessor
        ]);

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

                    log.debug('Tool calls detected, executing tools in streaming mode');
                    hasExecutedTools = true;

                    // Get completed tool calls
                    const completedToolCalls = contentAccumulator.getCompletedToolCalls();

                    if (completedToolCalls.length > 0) {
                        // Add the current response as an assistant message
                        const assistantMessage: UniversalMessage = {
                            role: 'assistant',
                            content: contentAccumulator.getAccumulatedContent()
                        };
                        currentMessages.push(assistantMessage);

                        // Stream tool execution progress and results in real-time
                        for await (const { response: toolResponse, updatedMessages } of this.processToolCallsStreaming(
                            completedToolCalls,
                            params,
                            currentMessages
                        )) {
                            // Update current messages with latest state
                            currentMessages = updatedMessages;

                            // Yield tool execution progress to client
                            // yield toolResponse as any;
                        }

                        // Create a follow-up request to continue the conversation
                        const systemMessage = params.messages?.find(m => m.role === 'system')?.content || '';

                        // Create a direct stream from the ChatController or another available service
                        // This avoids accessing private properties of ToolOrchestrator
                        let providerStream;

                        // If we have access to a chatController through the ToolOrchestrator, use it
                        if (this.toolOrchestrator) {
                            log.debug('Creating continuation stream with ToolOrchestrator');

                            // Use the ToolOrchestrator's public API only - create a follow-up request with streamOrchestration
                            providerStream = this.toolOrchestrator.streamProcessResponse(
                                {
                                    content: ' ', // Non-empty content for OpenAI
                                    role: 'assistant'
                                },
                                {
                                    model: modelInfo.name,
                                    systemMessage,
                                    historicalMessages: currentMessages,
                                    settings: {
                                        ...params.settings,
                                        stream: true,
                                        tools: undefined,
                                        toolChoice: undefined
                                    }
                                },
                                inputTokens
                            );
                        } else {
                            // Fallback - can't create a stream without more context
                            throw new Error('Unable to create continuation stream - toolOrchestrator not available');
                        }

                        // Forward the stream chunks to the client
                        log.debug('Starting to process continuation stream chunks');

                        let forwardedChunks = 0;
                        try {
                            for await (const chunk of providerStream) {
                                log.debug('Forwarding continuation chunk to client:', {
                                    chunkHasContent: Boolean(chunk.content),
                                    contentLength: chunk.content?.length,
                                    isComplete: chunk.isComplete,
                                    role: chunk.role,
                                    chunkNumber: ++forwardedChunks
                                });

                                // Yield each chunk to the client
                                yield {
                                    ...chunk,
                                    contentObject: null as any
                                };

                                // If we reach the end of the stream, log it
                                if (chunk.isComplete) {
                                    log.debug('Reached end of continuation stream', {
                                        totalChunks: forwardedChunks
                                    });
                                }
                            }

                            log.debug('Finished streaming all continuation chunks', {
                                totalChunks: forwardedChunks
                            });
                        } catch (error) {
                            log.error('Error while streaming continuation chunks:', error);
                            yield {
                                role: 'assistant',
                                content: `Error during response generation: ${error instanceof Error ? error.message : String(error)}`,
                                isComplete: true
                            };
                        }

                        // Since we've fully handled the streaming, return
                        return;
                    }
                }

                // Add the accumulated content when complete
                if (chunk.isComplete) {
                    const accumulatedContent = contentAccumulator.getAccumulatedContent();
                    response.contentText = accumulatedContent;

                    // If the finish reason is tool_calls, ensure we include all completed tool calls
                    const finishReason = chunk.metadata?.finishReason;
                    if (finishReason === FinishReason.TOOL_CALLS) {
                        log.debug('Finish reason is TOOL_CALLS, retrieving completed tool calls');
                        const completedToolCalls = contentAccumulator.getCompletedToolCalls();

                        if (completedToolCalls.length > 0) {
                            log.debug('Retrieved completed tool calls', { count: completedToolCalls.length });

                            // Update or create the toolCalls array in the response
                            response.toolCalls = completedToolCalls.map(call => ({
                                name: call.name,
                                arguments: call.arguments || {},
                                id: (call as any).id
                            }));
                        }
                    }

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

                    if (chunk.isComplete) {
                        log.debug('Stream chunk completed, checking for tool calls', {
                            hasToolController: Boolean(this.toolController),
                            hasToolOrchestrator: Boolean(this.toolOrchestrator),
                            finishReason: chunk.metadata?.finishReason,
                            hasToolCalls: Boolean(chunk.toolCalls && chunk.toolCalls.length > 0),
                            completedToolCallsCount: contentAccumulator.getCompletedToolCalls().length,
                            hasExecutedTools
                        });
                    }
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
     */
    private async *convertToStreamChunks(
        stream: AsyncIterable<UniversalStreamResponse>
    ): AsyncIterable<StreamChunk> {
        const log = logger.createLogger({ prefix: 'StreamHandler.convertToStreamChunks' });

        for await (const chunk of stream) {
            log.debug('Chunk:', chunk);
            yield chunk as StreamChunk;
            // // Convert Universal ToolCalls to StreamChunk ToolCalls
            // const toolCalls = chunk.toolCalls?.map(toolCall => {
            //     // Universal toolCalls don't have id, so construct a ToolCall with optional id
            //     const toolCallWithId: ToolCall = {
            //         name: toolCall.name,
            //         parameters: toolCall.arguments,
            //         // id is optional in ToolCall type, so it's fine to not include it
            //     };
            //     return toolCallWithId;
            // });

            // yield {
            //     content: chunk.content || '',
            //     isComplete: chunk.isComplete || false,
            //     toolCalls,
            //     metadata: chunk.metadata
            // };
        }
    }
} 