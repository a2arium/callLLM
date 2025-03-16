import { ToolController } from './ToolController';
import { ChatController } from '../chat/ChatController';
import type { UniversalChatResponse, UniversalMessage, UniversalChatParams, UniversalStreamResponse } from '../../interfaces/UniversalInterfaces';
import { ToolError, ToolIterationLimitError } from '../../types/tooling';
import { StreamController } from '../streaming/StreamController';
import { ToolCallResult } from '../types';

export type ToolOrchestrationParams = {
    model: string;
    systemMessage: string;
    historicalMessages?: UniversalMessage[];
    settings?: Record<string, unknown>;
    maxHistoryLength?: number;
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
        if (process.env.NODE_ENV !== 'test') { console.log('[ToolOrchestrator] Initialized'); }
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

        if (process.env.NODE_ENV !== 'test') { console.log(`[ToolOrchestrator] Trimming history from ${messages.length} to ${maxLength} messages`); }

        // Keep system messages and last maxLength messages
        const systemMessages = messages.filter(msg => msg.role === 'system');
        const nonSystemMessages = messages.filter(msg => msg.role !== 'system');

        // Calculate how many non-system messages we can keep
        const availableSlots = maxLength - systemMessages.length;
        const recentMessages = nonSystemMessages.slice(-availableSlots);

        return [...systemMessages, ...recentMessages];
    }

    private async *accumulateStream(stream: AsyncIterable<UniversalStreamResponse>): AsyncIterable<UniversalStreamResponse> {
        let totalContent = "";
        let toolCalls: Array<{ name: string; arguments: Record<string, unknown> }> | undefined;
        let lastYieldedContent = "";

        for await (const chunk of stream) {
            // Track tool calls
            if (chunk.toolCalls?.length) {
                toolCalls = chunk.toolCalls;
                // Yield tool call chunk immediately
                yield {
                    role: chunk.role,
                    content: '',
                    toolCalls: chunk.toolCalls,
                    isComplete: false,
                    metadata: chunk.metadata
                };
                continue;
            }

            // Accumulate content
            if (chunk.content) {
                totalContent += chunk.content;
            }

            // Yield chunks as they come; when a chunk signals completion, yield the final accumulated chunk
            if (chunk.isComplete) {
                if (totalContent !== lastYieldedContent) {
                    yield {
                        role: chunk.role,
                        content: totalContent,
                        toolCalls,
                        isComplete: true,
                        metadata: chunk.metadata
                    };
                }
                return;
            } else if (chunk.content && chunk.content !== lastYieldedContent) {
                lastYieldedContent = chunk.content;
                yield { ...chunk, content: chunk.content };
            }
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
        if (process.env.NODE_ENV !== 'test') { console.log('[ToolOrchestrator] Starting response processing'); }
        const maxHistory = params.maxHistoryLength ?? this.DEFAULT_MAX_HISTORY;
        let currentResponse = response;
        let updatedHistoricalMessages = [...(params.historicalMessages || [])];
        const toolExecutions: ToolOrchestrationResult['toolExecutions'] = [];

        try {
            let iterationCount = 0;

            while (true) {
                iterationCount++;
                if (iterationCount > this.MAX_TOOL_ITERATIONS) {
                    if (process.env.NODE_ENV !== 'test') { console.warn(`[ToolOrchestrator] Iteration limit exceeded: ${this.MAX_TOOL_ITERATIONS}`); }
                    throw new ToolIterationLimitError(this.MAX_TOOL_ITERATIONS);
                }

                if (process.env.NODE_ENV !== 'test') { console.log(`[ToolOrchestrator] Processing iteration ${iterationCount}/${this.MAX_TOOL_ITERATIONS}`); }
                const toolResult = await this.toolController.processToolCalls(
                    currentResponse.content || '',
                    currentResponse
                );

                // If no tool calls were found or processed, break the loop
                if (!toolResult?.requiresResubmission) {
                    if (process.env.NODE_ENV !== 'test') { console.log('[ToolOrchestrator] No more tool calls to process'); }
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
                    if (process.env.NODE_ENV !== 'test') {
                        console.log('[ToolOrchestrator] Validating message:', {
                            role: msg.role,
                            hasContent: Boolean(msg.content),
                            contentLength: msg.content?.length,
                            hasToolCalls: Boolean(msg.toolCalls),
                            hasToolCallId: Boolean(msg.toolCallId)
                        });
                    }

                    // If message has neither content nor tool calls, provide default content
                    const hasValidContent = msg.content && msg.content.trim().length > 0;
                    const hasToolCalls = msg.toolCalls && msg.toolCalls.length > 0;

                    if (process.env.NODE_ENV !== 'test') {
                        console.log('[ToolOrchestrator] Validation results:', {
                            hasValidContent,
                            hasToolCalls,
                            willUseDefaultContent: !hasValidContent && !hasToolCalls
                        });
                    }

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
                    console.log('[ToolOrchestrator] Final validated messages:', validatedMessages.map(msg => {
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
            if (process.env.NODE_ENV !== 'test') { console.log('[ToolOrchestrator] Successfully completed response processing'); }

            return {
                response,
                toolExecutions,
                finalResponse: currentResponse,
                updatedHistoricalMessages
            };
        } catch (error) {
            console.error('[ToolOrchestrator] Error during response processing:', error);

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
        let currentResponse = response;
        let updatedHistoricalMessages: UniversalMessage[] = params.historicalMessages ? [...params.historicalMessages] : [];
        const toolExecutions: ToolCallResult[] = [];
        const maxHistory = params.maxHistoryLength ?? this.DEFAULT_MAX_HISTORY;
        let iterationCount = 0;

        // Process all tool calls first
        while (true) {
            iterationCount++;
            if (iterationCount > this.MAX_TOOL_ITERATIONS) {
                if (process.env.NODE_ENV !== 'test') { console.warn(`[ToolOrchestrator] Iteration limit exceeded: ${this.MAX_TOOL_ITERATIONS}`); }
                throw new ToolIterationLimitError(this.MAX_TOOL_ITERATIONS);
            }

            const toolResult = await this.toolController.processToolCalls(
                currentResponse.content || '',
                currentResponse
            );

            // If no tool calls were found or processed, break the loop
            if (!toolResult?.requiresResubmission) {
                if (process.env.NODE_ENV !== 'test') { console.log('[ToolOrchestrator] No more tool calls to process'); }
                break;
            }

            // Add tool executions and prepare messages
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

                // Yield tool calls immediately
                yield {
                    role: 'assistant',
                    content: '',
                    toolCalls: toolResult.toolCalls.map(call => ({
                        name: call.toolName,
                        arguments: call.arguments
                    })),
                    isComplete: false,
                    metadata: {}
                };
            }

            // Trim history to maintain max length
            updatedHistoricalMessages = this.trimHistory(updatedHistoricalMessages, maxHistory);

            // Get a non-streaming response to check for more tool calls
            const newParams = {
                model: params.model,
                systemMessage: params.systemMessage,
                settings: {
                    ...params.settings,
                    stream: false,
                    tools: params.settings?.tools,
                    toolChoice: params.settings?.toolChoice,
                    toolCalls: params.settings?.toolCalls
                },
                historicalMessages: [
                    ...updatedHistoricalMessages,
                    { role: 'user' as const, content: 'Please continue based on the tool execution results above.' }
                ]
            };

            currentResponse = await this.chatController.execute(newParams);
        }

        // Final streaming session with complete context
        const finalParams: UniversalChatParams = {
            messages: [
                { role: 'system', content: params.systemMessage },
                ...updatedHistoricalMessages
            ],
            settings: {
                ...params.settings,
                stream: true,
                tools: params.settings?.tools,
                toolChoice: params.settings?.toolChoice,
                toolCalls: params.settings?.toolCalls,
                shouldRetryDueToContent: false // Disable content-based retries for streaming
            }
        };

        const finalStream = await this.streamController.createStream(params.model, finalParams, inputTokens);
        let accumulatedContent = '';
        let lastToolCalls: Array<{ name: string; arguments: Record<string, unknown> }> | undefined;

        for await (const chunk of finalStream) {
            // Track tool calls
            if (chunk.toolCalls?.length) {
                lastToolCalls = chunk.toolCalls;
                // Yield tool call chunk immediately
                yield {
                    role: chunk.role,
                    content: '',
                    toolCalls: chunk.toolCalls,
                    isComplete: false,
                    metadata: chunk.metadata
                };
                continue;
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
                    toolCalls: lastToolCalls,
                    isComplete: false,
                    metadata: chunk.metadata
                };
            }

            // For the final chunk, yield the complete accumulated content
            if (chunk.isComplete) {
                yield {
                    role: chunk.role,
                    content: accumulatedContent,
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
} 