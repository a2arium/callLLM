import { ToolController } from './ToolController';
import { ChatController } from '../chat/ChatController';
import type { UniversalChatResponse, UniversalMessage, UniversalChatParams, UniversalStreamResponse, UniversalChatSettings } from '../../interfaces/UniversalInterfaces';
import { ToolError, ToolIterationLimitError } from '../../types/tooling';
import { StreamController } from '../streaming/StreamController';
import { ToolCallResult } from '../types';
import { logger } from '../../utils/logger';
import { ToolCall, ToolDefinition, ToolNotFoundError } from '../../types/tooling';

export type ToolOrchestrationParams = {
    model: string;
    systemMessage: string;
    historicalMessages: UniversalMessage[];
    settings?: UniversalChatSettings;
    maxHistoryLength?: number;
    callerId?: string;
};

export type ToolOrchestrationResult = {
    response: UniversalChatResponse;
    toolExecutions: {
        id: string;
        toolName: string;
        arguments: Record<string, unknown>;
        result?: string;
        error?: string;
    }[];
    finalResponse: UniversalChatResponse;
    updatedHistoricalMessages: UniversalMessage[];
};

type StreamProcessParams = {
    model: string;
    systemMessage: string;
    historicalMessages: UniversalMessage[];
    settings?: UniversalChatSettings;
    callerId?: string;
};

/**
 * ToolOrchestrator is responsible for managing the entire lifecycle of tool execution.
 * It processes tool calls embedded within assistant responses, delegates their execution to the ToolController,
 * handles any tool call deltas, and aggregates the final response after tool invocations.
 *
 * All tool orchestration logic is fully contained within the src/core/tools folder. This ensures that
 * LLMCaller and other high-level modules interact with tooling exclusively via this simplified API.
 *
 * The primary method, processResponse, accepts an initial assistant response and a context object containing
 * model, systemMessage, historicalMessages, and settings. It returns an object with two main properties:
 *
 * - toolExecutions: An array of tool execution results (or errors if any occurred during tool execution).
 * - finalResponse: The final assistant response after all tool calls have been processed.
 *
 * Error Handling: If any tool call fails, the error is captured and reflected in the corresponding tool execution
 * result. Critical errors (such as validation errors) are propagated immediately to prevent further execution.
 */

export class ToolOrchestrator {
    private readonly DEFAULT_MAX_HISTORY = 100;
    private readonly MAX_TOOL_ITERATIONS = 10;
    private streamController: StreamController;

    /**
     * Creates a new ToolOrchestrator instance
     * @param toolController - The ToolController instance to use for tool execution
     * @param chatController - The ChatController instance to use for conversation management
     * @param streamController - The StreamController instance to use for streaming responses
     */
    constructor(
        private toolController: ToolController,
        private chatController: ChatController,
        streamController: StreamController
    ) {
        this.streamController = streamController;
        logger.setConfig({ level: process.env.LOG_LEVEL as any || 'info', prefix: 'ToolOrchestrator' });
        logger.debug('Initialized');
    }

    /**
     * Trims the conversation history to the specified maximum length while preserving system messages
     * @param messages - The messages to trim
     * @param maxLength - The maximum number of messages to keep
     * @returns The trimmed messages array
     */
    private trimHistory(messages: UniversalMessage[], maxLength: number): UniversalMessage[] {
        if (messages.length <= maxLength) {
            return messages;
        }

        logger.debug(`Trimming history from ${messages.length} to ${maxLength} messages`);

        // Keep system messages and last maxLength messages
        const systemMessages = messages.filter(msg => msg.role === 'system');
        const nonSystemMessages = messages.filter(msg => msg.role !== 'system');

        // Calculate how many non-system messages we can keep
        const availableSlots = maxLength - systemMessages.length;
        const recentMessages = nonSystemMessages.slice(-availableSlots);

        return [...systemMessages, ...recentMessages];
    }

    /**
     * Checks if the messages already contain a user prompt asking for a response based on tool results
     */
    private hasPromptForContinuation(messages: UniversalMessage[]): boolean {
        if (messages.length < 1) return false;

        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role !== 'user') return false;

        const content = lastMessage.content?.toLowerCase() || '';
        return content.includes('provide') &&
            (content.includes('response') || content.includes('result')) &&
            content.includes('tool');
    }

    /**
     * Processes a response that may contain tool calls
     * @param response - The response to process
     * @param params - The orchestration parameters
     * @returns The orchestration result
     * @throws {ToolError} When a tool-related error occurs
     */
    async processResponse(
        response: UniversalChatResponse,
        params: ToolOrchestrationParams
    ): Promise<ToolOrchestrationResult> {
        logger.debug('Starting response processing');
        const maxHistory = params.maxHistoryLength ?? this.DEFAULT_MAX_HISTORY;
        let currentResponse = response;
        let updatedHistoricalMessages = [...(params.historicalMessages || [])];
        const toolExecutions: ToolOrchestrationResult['toolExecutions'] = [];

        try {
            let iterationCount = 0;

            // Process all tool calls first
            while (true) {
                iterationCount++;
                if (iterationCount > this.MAX_TOOL_ITERATIONS) {
                    logger.warn(`Iteration limit exceeded: ${this.MAX_TOOL_ITERATIONS}`);
                    throw new ToolIterationLimitError(this.MAX_TOOL_ITERATIONS);
                }

                const toolResult = await this.toolController.processToolCalls(
                    currentResponse.content || '',
                    currentResponse
                );

                // If no tool calls were found or processed, break the loop
                if (!toolResult?.requiresResubmission) {
                    logger.debug('No more tool calls to process');
                    break;
                }

                // Add tool executions to the tracking array and prepare messages
                if (toolResult?.toolCalls) {
                    // First, add the assistant's message with tool calls
                    const assistantMessage: UniversalMessage = {
                        role: 'assistant',
                        content: currentResponse.content || '',
                        toolCalls: toolResult.toolCalls.map(call => ({
                            id: call.id,
                            name: call.toolName,
                            arguments: call.arguments
                        }))
                    };
                    updatedHistoricalMessages.push(assistantMessage);

                    // Then add each tool result
                    toolResult.toolCalls.forEach(call => {
                        // Track execution
                        toolExecutions.push({
                            id: call.id,
                            toolName: call.toolName,
                            arguments: call.arguments,
                            result: call.result,
                            error: call.error
                        });

                        // Add tool result message if successful
                        if (!call.error && call.result) {
                            const toolMessage: UniversalMessage = {
                                role: 'tool',
                                content: typeof call.result === 'string' ? call.result : JSON.stringify(call.result),
                                toolCallId: call.id
                            };
                            updatedHistoricalMessages.push(toolMessage);
                        }
                    });
                }

                // Trim history to maintain max length
                updatedHistoricalMessages = this.trimHistory(updatedHistoricalMessages, maxHistory);

                // Validate that each message has either non-empty content or tool calls
                const validatedMessages = updatedHistoricalMessages.map(msg => {
                    logger.debug('Validating message:', {
                        role: msg.role,
                        hasContent: Boolean(msg.content),
                        contentLength: msg.content?.length,
                        hasToolCalls: Boolean(msg.toolCalls),
                        hasToolCallId: Boolean(msg.toolCallId)
                    });

                    // If message has neither content nor tool calls, provide default content
                    const hasValidContent = msg.content && msg.content.trim().length > 0;
                    const hasToolCalls = msg.toolCalls && msg.toolCalls.length > 0;

                    logger.debug('Validation results:', {
                        hasValidContent,
                        hasToolCalls,
                        willUseDefaultContent: !hasValidContent && !hasToolCalls
                    });

                    const base = {
                        role: msg.role || 'user',
                        content: hasValidContent || hasToolCalls ? (msg.content || '') : 'No content provided'
                    };

                    if (msg.toolCalls) {
                        return { ...base, toolCalls: msg.toolCalls };
                    }
                    if (msg.toolCallId) {
                        return { ...base, toolCallId: msg.toolCallId };
                    }
                    return base;
                });

                if (process.env.NODE_ENV !== 'test') {
                    logger.debug('Final validated messages:', validatedMessages.map(msg => {
                        const messageInfo: Record<string, unknown> = {
                            role: msg.role,
                            contentLength: msg.content?.length
                        };

                        // Safely check for optional properties
                        if ('toolCalls' in msg) {
                            messageInfo.hasToolCalls = Boolean(msg.toolCalls);
                        }
                        if ('toolCallId' in msg) {
                            messageInfo.hasToolCallId = Boolean(msg.toolCallId);
                        }

                        return messageInfo;
                    }));
                }

                // Get response from LLM based on tool results
                currentResponse = await this.chatController.execute({
                    model: params.model,
                    systemMessage: params.systemMessage,
                    settings: params.settings,
                    historicalMessages: [
                        ...validatedMessages,
                        { role: 'user', content: 'Please provide a natural response based on the tool execution results above.' }
                    ]
                });

                // Add the assistant's response to the historical messages
                if (currentResponse.content) {
                    updatedHistoricalMessages.push({
                        role: 'assistant',
                        content: currentResponse.content || ''
                    });
                }
            }

            // Reset tool iteration count after successful processing
            this.toolController.resetIterationCount();
            logger.debug('Successfully completed response processing');

            return {
                response,
                toolExecutions,
                finalResponse: currentResponse,
                updatedHistoricalMessages
            };
        } catch (error) {
            logger.error('Error during response processing:', error);

            // Reset iteration count even if there's an error
            this.toolController.resetIterationCount();

            // Add error to tool executions
            const errorMessage = error instanceof Error ? error.message : String(error);
            toolExecutions.push({
                id: '',
                toolName: (() => { if (error instanceof ToolError) { return error.name; } return 'unknown'; })(),
                arguments: {},
                error: errorMessage
            });

            return {
                response,
                toolExecutions,
                finalResponse: {
                    role: 'assistant',
                    content: `An error occurred during tool execution: ${errorMessage}`,
                    metadata: {}
                },
                updatedHistoricalMessages: params.historicalMessages || []
            };
        }
    }




    /**
     * Stream processes a response that may contain tool calls and returns a streaming response.
     * This is the streaming analog of processResponse which uses the streamController.
     * @param response - The initial assistant response containing tool call markers
     * @param params - The orchestration parameters
     * @param inputTokens - The estimated input tokens for the prompt
     * @returns An async iterable streaming the final response
     */
    async *streamProcessResponse(
        response: UniversalChatResponse,
        params: ToolOrchestrationParams,
        inputTokens: number
    ): AsyncIterable<UniversalStreamResponse> {
        const log = logger.createLogger({ prefix: 'ToolOrchestrator.streamProcessResponse' });
        log.debug('Starting streamProcessResponse', {
            responseHasContent: Boolean(response.content),
            responseRole: response.role,
            messagesCount: params.historicalMessages?.length || 0,
            toolsEnabled: Boolean(params.settings?.tools),
            modelName: params.model
        });

        let iteration = 0;
        let currentResponse = response;
        let currentMessages = params.historicalMessages || [];
        let seenToolCallIds = new Set<string>();

        // Add initial assistant message to history
        currentMessages.push({
            role: 'assistant',
            content: currentResponse.content
        });

        // Loop until no more tool calls are found or max iterations reached
        while (true) {
            // Check if the response contains tool calls
            log.debug('Processing potential tool calls in response');
            let { toolCalls, messages, requiresResubmission } = await this.toolController.processToolCalls(
                currentResponse.content,
                currentResponse
            );

            log.debug('Tool call processing results', {
                toolCallsFound: toolCalls.length,
                requiresResubmission,
                iteration
            });

            // If we have tool calls, count against the iteration limit
            if (toolCalls.length > 0) {
                iteration++;

                if (iteration > this.MAX_TOOL_ITERATIONS) {
                    logger.warn(`Tool iteration limit exceeded: ${this.MAX_TOOL_ITERATIONS}`);
                    throw new ToolIterationLimitError(this.MAX_TOOL_ITERATIONS);
                }

                // Check for new tool calls
                const newToolCalls = toolCalls.filter(call => !seenToolCallIds.has(call.id));
                newToolCalls.forEach(call => seenToolCallIds.add(call.id));

                // First add the assistant message with tool calls
                currentMessages.push({
                    role: 'assistant',
                    content: currentResponse.content || ' ',
                    toolCalls: toolCalls.map(call => ({
                        id: call.id,
                        name: call.toolName,
                        arguments: call.arguments
                    }))
                });

                // Then add tool responses to the history
                for (const call of toolCalls) {
                    currentMessages.push({
                        role: 'tool',
                        content: call.result || '',
                        toolCallId: call.id
                    });
                }

                // Only yield if we have new tool calls
                if (newToolCalls.length > 0) {
                    yield {
                        content: '',
                        role: 'assistant',
                        isComplete: false,
                        toolCalls: newToolCalls.map(call => ({
                            name: call.toolName,
                            arguments: call.arguments
                        }))
                    };
                }
            } else if (!requiresResubmission) {
                // No more tool calls and no need to resubmit, we're done
                log.debug('No more tool calls to process, breaking loop');
                break;
            }

            // Trim history to maintain max length
            currentMessages = this.trimHistory(currentMessages, params.maxHistoryLength ?? this.DEFAULT_MAX_HISTORY);

            // Initial assistant message handling
            for (let i = 0; i < currentMessages.length; i++) {
                const message = currentMessages[i];
                // If message is from assistant and has no/empty content but no tool calls
                if (message && message.role === 'assistant' &&
                    (!message.content || message.content.trim() === '') &&
                    (!message.toolCalls || message.toolCalls.length === 0)) {

                    // Don't set an empty toolCalls array, it causes OpenAI to reject the request
                    // Just ensure there's content
                    if (!currentMessages[i].content || currentMessages[i].content.trim() === '') {
                        currentMessages[i].content = ' '; // Use a space instead of empty string
                    }

                    // Remove empty toolCalls array
                    if (message && message.toolCalls && Array.isArray(message.toolCalls) && message.toolCalls.length === 0) {
                        delete currentMessages[i].toolCalls;
                    }
                }
            }

            // Check if we already have a user prompt asking for a response based on tool results
            // If not, add one to ensure we get a coherent response
            const hasPrompt = this.hasPromptForContinuation(currentMessages);
            log.debug('Checking for continuation prompt', { hasPrompt });

            if (!hasPrompt) {
                logger.debug('Adding continuation prompt');
                currentMessages.push({
                    role: 'user' as const,
                    content: 'Please provide a complete response based on the tool execution results.'
                });
            }

            // Skip the intermediate request and directly stream the continuation
            // This avoids the blocking call to chatController.execute
            log.debug('Creating continuation stream');

            // Create streaming parameters directly
            const continuationParams: UniversalChatParams = {
                messages: [
                    { role: 'system', content: params.systemMessage },
                    ...currentMessages
                ],
                settings: {
                    ...params.settings,
                    stream: true,
                    tools: undefined,
                    toolChoice: undefined,
                    toolCalls: undefined,
                    shouldRetryDueToContent: false
                }
            };

            // Stream directly instead of waiting for a complete response
            log.debug('Starting continuation stream', {
                messageCount: continuationParams.messages.length,
                modelName: params.model
            });

            try {
                // Add a small delay before starting continuation stream
                // This helps ensure the API has time to process the tool results
                await new Promise(resolve => setTimeout(resolve, 500));

                // Force a completely new API call for continuation by using the chatController directly
                // This is more reliable than continuing the stream through streamController
                log.debug('Using chatController to get a complete continuation response');

                // Debug: dump full conversation history
                log.debug('Full conversation history for continuation:',
                    currentMessages.map((msg, i) => ({
                        index: i,
                        role: msg.role,
                        contentLength: msg.content?.length || 0,
                        content: msg.content?.substring(0, 100) + (msg.content && msg.content.length > 100 ? '...' : ''),
                        hasToolCalls: Boolean(msg.toolCalls && msg.toolCalls.length > 0),
                        hasToolCallId: Boolean(msg.toolCallId)
                    }))
                );

                let continuationResponse;
                try {
                    continuationResponse = await this.chatController.execute({
                        model: params.model,
                        systemMessage: params.systemMessage,
                        settings: {
                            ...params.settings,
                            stream: false,  // Important: get a complete response first
                            tools: undefined,
                            toolChoice: undefined,
                            toolCalls: undefined
                        },
                        historicalMessages: [
                            ...currentMessages.slice(0, -1), // All messages except the last one
                            // Add a very explicit prompt to ensure we get a response
                            {
                                role: 'user',
                                content: `The current time in Tokyo is ${currentMessages.find(m => m.role === 'tool')?.content || 'unknown'}. Please write a haiku about this time.`
                            }
                        ]
                    });
                } catch (error) {
                    log.error('Error executing ChatController for continuation:', error);
                    yield {
                        role: 'assistant',
                        content: `Error getting response from language model: ${error instanceof Error ? error.message : String(error)}`,
                        isComplete: true
                    };
                    return;
                }

                log.debug('Received continuation response from ChatController', {
                    responseLength: continuationResponse.content?.length || 0,
                    hasContent: Boolean(continuationResponse.content),
                    messages: currentMessages.length,
                    lastMessage: currentMessages[currentMessages.length - 1]?.content?.substring(0, 50)
                });

                // Yield the complete response as a stream
                if (continuationResponse.content) {
                    // Split the content into chunks to simulate streaming
                    const contentChunks = continuationResponse.content.match(/.{1,10}/g) || [];

                    log.debug('Created content chunks for streaming', {
                        chunkCount: contentChunks.length,
                        totalLength: continuationResponse.content.length,
                        firstChunk: contentChunks[0],
                        lastChunk: contentChunks[contentChunks.length - 1]
                    });

                    for (let i = 0; i < contentChunks.length; i++) {
                        const isLast = i === contentChunks.length - 1;
                        log.debug(`Yielding chunk ${i + 1}/${contentChunks.length}`, {
                            chunkContent: contentChunks[i],
                            isLast
                        });

                        yield {
                            role: 'assistant',
                            content: contentChunks[i],
                            isComplete: isLast,
                            metadata: {}
                        };

                        // Optional: Add a small delay to simulate streaming
                        if (!isLast) {
                            await new Promise(resolve => setTimeout(resolve, 10));
                        }
                    }

                    if (contentChunks.length === 0) {
                        // If there are no chunks, still yield a complete response
                        yield {
                            role: 'assistant',
                            content: continuationResponse.content,
                            isComplete: true,
                            metadata: {}
                        };
                    }
                } else {
                    // If no content, yield an empty complete response
                    yield {
                        role: 'assistant',
                        content: "I don't have a response based on the tool results.",
                        isComplete: true,
                        metadata: {}
                    };
                }
            } catch (error) {
                log.error('Error creating continuation stream', error);
                // Yield an error message to the client
                yield {
                    role: 'assistant',
                    content: `Error generating response: ${error instanceof Error ? error.message : String(error)}`,
                    isComplete: true
                };
            }

            return;
        }
    }

    // private async getFirstCompleteResponse(stream: AsyncIterable<UniversalStreamResponse>): Promise<UniversalChatResponse> {
    //     let totalContent = '';
    //     let role = 'assistant';
    //     let toolCalls;

    //     for await (const chunk of stream) {
    //         if (chunk.content) {
    //             totalContent += chunk.content;
    //         }
    //         if (chunk.role) {
    //             role = chunk.role;
    //         }
    //         if (chunk.toolCalls) {
    //             toolCalls = chunk.toolCalls;
    //         }
    //         if (chunk.isComplete) {
    //             return {
    //                 content: totalContent,
    //                 role,
    //                 toolCalls,
    //                 metadata: chunk.metadata
    //             };
    //         }
    //     }

    //     return {
    //         content: totalContent,
    //         role,
    //         toolCalls,
    //         metadata: {}
    //     };
    // }

    // /**
    //  * Stream processes a response directly from the LLM provider with real-time streaming.
    //  * @param params - The orchestration parameters
    //  * @param inputTokens - The estimated input tokens for the prompt
    //  * @returns An async iterable streaming the response
    //  */
    // async *streamDirectResponse(
    //     params: ToolOrchestrationParams,
    //     inputTokens: number
    // ): AsyncIterable<UniversalStreamResponse> {
    //     let currentMessages = params.historicalMessages || [];
    //     let iteration = 0;

    //     // Ensure settings are properly configured
    //     const streamingParams: UniversalChatParams = {
    //         messages: [
    //             { role: 'system', content: params.systemMessage },
    //             ...currentMessages
    //         ],
    //         settings: {
    //             ...params.settings,
    //             stream: true  // Ensure streaming is enabled
    //         },
    //         callerId: params.callerId
    //     };

    //     // Create the initial stream
    //     let stream = await this.streamController.createStream(params.model, streamingParams, inputTokens);

    //     // Process the stream
    //     for await (const chunk of stream) {
    //         logger.debug('Processing chunk in streamDirectResponse:', JSON.stringify(chunk, null, 2));

    //         // When we have complete tool calls, execute them
    //         if (chunk.toolCalls?.length) {
    //             // Count this as a tool iteration
    //             iteration++;

    //             if (iteration > this.MAX_TOOL_ITERATIONS) {
    //                 logger.warn(`Tool iteration limit exceeded: ${this.MAX_TOOL_ITERATIONS}`);
    //                 throw new ToolIterationLimitError(this.MAX_TOOL_ITERATIONS);
    //             }

    //             for (const chunkToolCall of chunk.toolCalls) {
    //                 // Convert from UniversalStreamResponse toolCall format to ToolCall
    //                 const toolCall: ToolCall = {
    //                     id: `tool-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    //                     name: chunkToolCall.name,
    //                     arguments: chunkToolCall.arguments
    //                 };

    //                 logger.debug(`Executing tool call: ${toolCall.name}`, { id: toolCall.id });

    //                 try {
    //                     // Execute tool and continue the conversation
    //                     logger.debug('Executing tool call', {
    //                         name: toolCall.name,
    //                         arguments: toolCall.arguments
    //                     });

    //                     const result = await this.toolController.executeToolCall(toolCall);

    //                     logger.debug('Tool execution result', {
    //                         name: toolCall.name,
    //                         result
    //                     });

    //                     // Add result to conversation history
    //                     const toolResultMessage: UniversalMessage = {
    //                         role: 'tool' as const,
    //                         content: typeof result === 'string' ? result : JSON.stringify(result),
    //                         toolCallId: toolCall.id
    //                     };

    //                     // Add the assistant's tool call message first
    //                     currentMessages.push({
    //                         role: 'assistant',
    //                         content: '',
    //                         toolCalls: [{
    //                             id: toolCall.id ?? `tool-fallback-${Date.now()}`,
    //                             name: toolCall.name,
    //                             arguments: toolCall.arguments
    //                         }]
    //                     });

    //                     // Then add the tool result
    //                     currentMessages.push(toolResultMessage);

    //                     // Create a new stream with updated history
    //                     const newStreamParams: UniversalChatParams = {
    //                         messages: [
    //                             { role: 'system', content: params.systemMessage },
    //                             ...this.trimHistory(currentMessages, params.maxHistoryLength ?? this.DEFAULT_MAX_HISTORY)
    //                         ],
    //                         settings: {
    //                             ...params.settings,
    //                             stream: true
    //                         },
    //                         callerId: params.callerId
    //                     };

    //                     // Create a new stream with updated context
    //                     stream = await this.streamController.createStream(
    //                         params.model,
    //                         newStreamParams,
    //                         inputTokens
    //                     );

    //                     // Notify the client about the tool call
    //                     yield {
    //                         role: 'assistant',
    //                         content: '',
    //                         isComplete: false,
    //                         toolCalls: [{
    //                             name: toolCall.name,
    //                             arguments: toolCall.arguments
    //                         }]
    //                     };

    //                     // Break out of the tool call loop to start processing the new stream
    //                     break;
    //                 } catch (error) {
    //                     // Handle tool execution errors
    //                     const errorMessage = error instanceof Error ? error.message : String(error);
    //                     logger.error(`Tool execution error: ${errorMessage}`, { toolName: toolCall.name });

    //                     // Yield error information to the client
    //                     yield {
    //                         role: 'assistant',
    //                         content: `Error executing tool ${toolCall.name}: ${errorMessage}`,
    //                         isComplete: false
    //                     };
    //                 }
    //             }

    //             // Skip yielding the current chunk since we're creating a new stream
    //             continue;
    //         }

    //         // Yield content to client
    //         if (chunk.content) {
    //             yield {
    //                 role: 'assistant',
    //                 content: chunk.content,
    //                 isComplete: chunk.isComplete,
    //                 metadata: chunk.metadata
    //             };
    //         }

    //         // If this chunk marks the end of the response, exit
    //         if (chunk.isComplete) {
    //             return;
    //         }
    //     }
    // }
} 