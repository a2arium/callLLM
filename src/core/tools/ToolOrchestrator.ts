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

    private async *accumulateStream(stream: AsyncIterable<UniversalStreamResponse>): AsyncIterable<UniversalStreamResponse> {
        let accumulatedContent = '';
        for await (const chunk of stream) {
            accumulatedContent += chunk.content;
            yield {
                ...chunk,
                contentText: accumulatedContent
            };
        }
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
            let { toolCalls, messages, requiresResubmission } = await this.toolController.processToolCalls(
                currentResponse.content,
                currentResponse
            );

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

            const newParams = {
                model: params.model,
                systemMessage: params.systemMessage,
                settings: {
                    ...params.settings,
                    stream: false,
                    tools: [],  // No tools for follow-up to force text response
                    toolChoice: 'none',  // Force no tools for the follow-up message
                    toolCalls: undefined
                },
                historicalMessages: [
                    ...currentMessages,
                    { role: 'user' as const, content: 'Please provide a complete response based on the tool execution results. Write a short poem about the current time in Tokyo.' }
                ]
            };

            currentResponse = await this.chatController.execute(newParams);
        }

        // Final streaming session with complete context
        const finalParams: UniversalChatParams = {
            messages: [
                { role: 'system', content: params.systemMessage },
                ...currentMessages
            ],
            settings: {
                ...params.settings,
                stream: true,
                tools: [],  // No tools for final response
                toolChoice: 'none',  // Force no tools for final response
                toolCalls: undefined,
                shouldRetryDueToContent: false // Disable content-based retries for streaming
            }
        };

        const finalStream = await this.streamController.createStream(params.model, finalParams, inputTokens);
        let accumulatedContent = '';
        let lastToolCalls: Array<{ name: string; arguments: Record<string, unknown> }> | undefined;

        for await (const chunk of finalStream) {
            // Track tool calls
            if (chunk.toolCalls?.length) {
                // Only yield if these are new tool calls
                const newToolCalls = chunk.toolCalls.filter(call => {
                    const callId = (call as any).id;
                    if (!callId) return true;
                    const isNew = !seenToolCallIds.has(callId);
                    if (isNew) seenToolCallIds.add(callId);
                    return isNew;
                });

                if (newToolCalls.length > 0) {
                    lastToolCalls = newToolCalls;
                    // Yield tool call chunk immediately
                    yield {
                        role: chunk.role,
                        content: '',
                        toolCalls: newToolCalls,
                        isComplete: false,
                        metadata: chunk.metadata
                    };
                    continue;
                }
            }

            // Accumulate content
            if (chunk.content) {
                accumulatedContent += chunk.content;
            }

            // For intermediate chunks, yield with isComplete false
            if (!chunk.isComplete && chunk.content) {
                yield {
                    role: chunk.role,
                    content: chunk.content,
                    contentObject: chunk.contentObject,
                    toolCalls: lastToolCalls,
                    isComplete: false,
                    metadata: chunk.metadata
                };
            }

            // For the final chunk, yield the complete accumulated content
            if (chunk.isComplete) {
                yield {
                    role: chunk.role,
                    content: chunk.content,
                    contentText: chunk.contentText || accumulatedContent,
                    contentObject: chunk.contentObject,
                    toolCalls: lastToolCalls,
                    isComplete: true,
                    metadata: chunk.metadata
                };
            }
        }
    }

    private async getFirstCompleteResponse(stream: AsyncIterable<UniversalStreamResponse>): Promise<UniversalChatResponse> {
        let totalContent = '';
        let role = 'assistant';
        let toolCalls;

        for await (const chunk of stream) {
            if (chunk.content) {
                totalContent += chunk.content;
            }
            if (chunk.role) {
                role = chunk.role;
            }
            if (chunk.toolCalls) {
                toolCalls = chunk.toolCalls;
            }
            if (chunk.isComplete) {
                return {
                    content: totalContent,
                    role,
                    toolCalls,
                    metadata: chunk.metadata
                };
            }
        }

        return {
            content: totalContent,
            role,
            toolCalls,
            metadata: {}
        };
    }

    /**
     * Stream processes a response directly from the LLM provider with real-time streaming.
     * @param params - The orchestration parameters
     * @param inputTokens - The estimated input tokens for the prompt
     * @returns An async iterable streaming the response
     */
    async *streamDirectResponse(
        params: ToolOrchestrationParams,
        inputTokens: number
    ): AsyncIterable<UniversalStreamResponse> {
        // Import the StreamBuffer here to avoid circular dependencies
        const { StreamBuffer } = require('../streaming/StreamBuffer');

        const streamBuffer = new StreamBuffer();
        let currentMessages = params.historicalMessages || [];
        let iteration = 0;
        let seenToolCallIds = new Set<string>();

        // Ensure settings are properly configured
        const streamingParams: UniversalChatParams = {
            messages: [
                { role: 'system', content: params.systemMessage },
                ...currentMessages
            ],
            settings: {
                ...params.settings,
                stream: true  // Ensure streaming is enabled
            },
            callerId: params.callerId
        };

        // Create the initial stream
        let stream = await this.streamController.createStream(params.model, streamingParams, inputTokens);

        // Process the stream
        while (true) {
            // Track tool calls for the current iteration
            const toolCallsInCurrentIteration: ToolCall[] = [];

            // Process current stream
            for await (const chunk of stream) {
                logger.debug('Processing chunk in streamDirectResponse:', JSON.stringify(chunk, null, 2));
                // Process the chunk with our streamBuffer to handle tool call accumulation
                const { streamableContent, completedToolCalls, isComplete } = streamBuffer.processChunk(chunk);

                logger.debug('Streamable content:', streamableContent);
                logger.debug('Completed tool calls:', completedToolCalls);
                logger.debug('Is complete:', isComplete);

                // Handle completed tool calls
                if (completedToolCalls.length > 0) {
                    // Count this as a tool iteration
                    iteration++;

                    if (iteration > this.MAX_TOOL_ITERATIONS) {
                        logger.warn(`Tool iteration limit exceeded: ${this.MAX_TOOL_ITERATIONS}`);
                        throw new ToolIterationLimitError(this.MAX_TOOL_ITERATIONS);
                    }

                    // Process tool calls
                    for (const toolCall of completedToolCalls) {
                        // Skip already processed tool calls
                        if (toolCall.id && seenToolCallIds.has(toolCall.id)) {
                            continue;
                        }

                        // Mark this tool call as seen
                        if (toolCall.id) {
                            seenToolCallIds.add(toolCall.id);
                        }

                        // Add this to the current iteration's tool calls
                        toolCallsInCurrentIteration.push(toolCall);

                        // Yield a tool call notification to the client
                        yield {
                            role: 'assistant',
                            content: '',
                            isComplete: false,
                            toolCalls: [{
                                name: toolCall.name,
                                arguments: toolCall.parameters
                            }]
                        };
                    }

                    // If we have tool calls, we need to execute them and continue with a new stream
                    if (toolCallsInCurrentIteration.length > 0) {
                        // Execute the tool calls
                        const executedToolCalls = await Promise.all(
                            toolCallsInCurrentIteration.map(async (call) => {
                                try {
                                    // Find the tool definition
                                    const tool = this.toolController.getToolByName(call.name);
                                    if (!tool) {
                                        throw new ToolNotFoundError(call.name);
                                    }

                                    // Execute the tool
                                    const result = await tool.callFunction(call.parameters);
                                    const resultText = typeof result === 'string' ? result : JSON.stringify(result);

                                    return {
                                        ...call,
                                        result: resultText
                                    };
                                } catch (error) {
                                    // Handle tool execution errors
                                    const errorMessage = error instanceof Error ? error.message : String(error);
                                    logger.error(`Tool execution error: ${errorMessage}`, { toolName: call.name });

                                    return {
                                        ...call,
                                        error: errorMessage,
                                        result: `Error: ${errorMessage}`
                                    };
                                }
                            })
                        );

                        // Update messages with the assistant's tool calls and the tool results
                        currentMessages.push({
                            role: 'assistant',
                            content: '',
                            toolCalls: executedToolCalls.map(call => ({
                                id: call.id || `tool-${Date.now()}`,
                                name: call.name,
                                arguments: call.parameters
                            }))
                        });

                        // Add tool responses to history
                        for (const call of executedToolCalls) {
                            currentMessages.push({
                                role: 'tool',
                                content: call.result || `Error: ${call.error || 'Unknown error'}`,
                                toolCallId: call.id || `tool-${Date.now()}`
                            });
                        }

                        // Create a new stream with the updated conversation
                        const newStreamParams: UniversalChatParams = {
                            messages: [
                                { role: 'system', content: params.systemMessage },
                                ...this.trimHistory(currentMessages, params.maxHistoryLength ?? this.DEFAULT_MAX_HISTORY)
                            ],
                            settings: {
                                ...params.settings,
                                stream: true
                            },
                            callerId: params.callerId
                        };

                        // Reset the stream buffer for the new stream
                        streamBuffer.reset();

                        // Create a new stream
                        stream = await this.streamController.createStream(params.model, newStreamParams, inputTokens);

                        // Break out of the current stream loop to start processing the new stream
                        break;
                    }
                }

                // Yield streamable content to the client
                if (streamableContent) {
                    yield {
                        role: 'assistant',
                        content: streamableContent,
                        isComplete: false
                    };
                }

                // If complete, exit the stream and the outer loop
                if (isComplete) {
                    yield {
                        role: 'assistant',
                        content: chunk.content || '',
                        contentText: streamBuffer.getAccumulatedContent(),
                        isComplete: true,
                        metadata: chunk.metadata
                    };

                    // Exit both loops
                    return;
                }
            }

            // If we completed the stream without finding more tool calls, we're done
            if (toolCallsInCurrentIteration.length === 0) {
                break;
            }
        }
    }
} 