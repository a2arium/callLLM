import { ToolController } from './ToolController';
import { ChatController } from '../chat/ChatController';
import type { UniversalChatResponse, UniversalMessage, UniversalChatParams, UniversalStreamResponse } from '../../interfaces/UniversalInterfaces';
import { ToolError, ToolIterationLimitError } from '../../types/tooling';
import { StreamController } from '../streaming/StreamController';

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
        toolName: string;
        parameters: Record<string, unknown>;
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
        for await (const chunk of stream) {
            // console.log('[ToolOrchestrator] [accumulateStream] Raw chunk received:', JSON.stringify(chunk));
            if (chunk.content) {
                totalContent += chunk.content;
            }
            // Yield chunks as they come; when a chunk signals completion, yield the final accumulated chunk
            if (chunk.isComplete) {
                // console.log('[ToolOrchestrator] [accumulateStream] Final accumulated content:', totalContent);
                yield {
                    role: chunk.role,
                    content: totalContent,
                    isComplete: true,
                    metadata: chunk.metadata
                };
                return;
            } else {
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

            // Process tool calls and handle resubmissions
            while (true) {
                iterationCount++;
                if (iterationCount > this.MAX_TOOL_ITERATIONS) {
                    if (process.env.NODE_ENV !== 'test') { console.warn(`[ToolOrchestrator] Iteration limit exceeded: ${this.MAX_TOOL_ITERATIONS}`); }
                    throw new ToolIterationLimitError(this.MAX_TOOL_ITERATIONS);
                }

                if (process.env.NODE_ENV !== 'test') { console.log(`[ToolOrchestrator] Processing iteration ${iterationCount}/${this.MAX_TOOL_ITERATIONS}`); }
                const toolResult = await this.toolController.processToolCalls(currentResponse.content as string, currentResponse);

                // Add tool executions to the tracking array
                if (toolResult?.toolCalls) {
                    toolResult.toolCalls.forEach(call => {
                        toolExecutions.push({
                            toolName: call.name,
                            parameters: call.parameters,
                            result: call.result,
                            error: call.error
                        });
                    });
                }

                // If no tool calls were found or processed, break the loop
                if (!toolResult?.requiresResubmission) {
                    if (process.env.NODE_ENV !== 'test') { console.log('[ToolOrchestrator] No more tool calls to process'); }
                    break;
                }

                // Prepare messages to add
                const newMessages: UniversalMessage[] = [];

                // Only add assistant message if it contains meaningful content beyond tool calls
                const content = currentResponse.content.trim();
                const hasToolCall = content.includes('<tool>') || (currentResponse.toolCalls?.length ?? 0) > 0;
                const hasNonToolContent = content.replace(/<tool>.*?<\/tool>/g, '').trim().length > 0;

                if (hasNonToolContent || (!hasToolCall && content.length > 0)) {
                    newMessages.push({ role: 'assistant' as const, content: currentResponse.content as string });
                }

                // Add tool call context messages for successful tool calls
                if (toolResult?.toolCalls) {
                    toolResult.toolCalls.forEach(call => {
                        if (!call.error) {
                            newMessages.push({
                                role: 'system',
                                content: `Tool ${call.name} was called with parameters: ${JSON.stringify(call.parameters)}`
                            });
                        }
                    });
                }

                // Add tool messages
                if (toolResult.messages) {
                    newMessages.push(...toolResult.messages);
                }

                // Add all messages in the correct order and trim
                updatedHistoricalMessages = this.trimHistory([
                    ...updatedHistoricalMessages,
                    ...newMessages
                ], maxHistory);

                // Make a new chat call with the updated context
                if (process.env.NODE_ENV !== 'test') { console.log('[ToolOrchestrator] Making new chat call with updated context'); }
                currentResponse = await this.chatController.execute({
                    model: params.model,
                    systemMessage: params.systemMessage,
                    message: 'Please continue based on the tool execution results above.',
                    settings: params.settings,
                    historicalMessages: [...updatedHistoricalMessages]
                });
            }

            // Reset tool iteration count after successful processing
            this.toolController.resetIterationCount();
            if (process.env.NODE_ENV !== 'test') { console.log('[ToolOrchestrator] Successfully completed response processing'); }

            return {
                response,
                toolExecutions,
                finalResponse: currentResponse,
                updatedHistoricalMessages: updatedHistoricalMessages
            };
        } catch (error) {
            console.error('[ToolOrchestrator] Error during response processing:', error);

            // Reset iteration count even if there's an error
            this.toolController.resetIterationCount();

            // Add error to tool executions
            const errorMessage = error instanceof Error ? error.message : String(error);
            toolExecutions.push({
                toolName: (() => { if (error instanceof ToolError) { return error.name; } return 'unknown'; })(),
                parameters: {},
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
    async streamProcessResponse(
        response: UniversalChatResponse,
        params: ToolOrchestrationParams,
        inputTokens: number
    ): Promise<AsyncIterable<UniversalStreamResponse>> {
        let currentResponse = response;
        let updatedHistoricalMessages: UniversalMessage[] = params.historicalMessages ? [...params.historicalMessages] : [];
        const toolExecutions: { toolName: string; parameters: Record<string, unknown>; result?: string; error?: string }[] = [];
        const maxHistory = params.maxHistoryLength ?? this.DEFAULT_MAX_HISTORY;
        let iterationCount = 0;

        while (true) {
            iterationCount++;
            if (iterationCount > this.MAX_TOOL_ITERATIONS) {
                throw new ToolIterationLimitError(this.MAX_TOOL_ITERATIONS);
            }

            // console.log(`[ToolOrchestrator] [Streaming] Iteration ${iterationCount} starting. Current response content: ${currentResponse.content.substring(0, 100)}...`);

            const toolResult = await this.toolController.processToolCalls(currentResponse.content as string, currentResponse);
            // console.log(`[ToolOrchestrator] [Streaming] toolResult: `, toolResult);

            if (toolResult?.toolCalls) {
                toolResult.toolCalls.forEach(call => {
                    toolExecutions.push({
                        toolName: call.name,
                        parameters: call.parameters,
                        result: call.result,
                        error: call.error
                    });
                });
            }

            if (!toolResult?.requiresResubmission) {
                break;
            }

            // Prepare new messages based on current response and tool call results
            const newMessages: UniversalMessage[] = [];
            const content = currentResponse.content.trim();
            const hasToolCall = content.includes('<tool>') || (((currentResponse as any).toolCalls)?.length ?? 0) > 0;
            const hasNonToolContent = content.replace(/<tool>.*?<\/tool>/g, '').trim().length > 0;

            if (hasNonToolContent || (!hasToolCall && content.length > 0)) {
                newMessages.push({ role: 'assistant', content: currentResponse.content });
            }
            if (toolResult?.toolCalls) {
                toolResult.toolCalls.forEach(call => {
                    if (!call.error) {
                        newMessages.push({
                            role: 'system',
                            content: `Tool ${call.name} was called with parameters: ${JSON.stringify(call.parameters)}`
                        });
                    }
                });
            }
            if (toolResult.messages) {
                newMessages.push(...toolResult.messages);
            }

            // console.log(`[ToolOrchestrator] [Streaming] New messages: `, newMessages);

            updatedHistoricalMessages = this.trimHistory([...updatedHistoricalMessages, ...newMessages], maxHistory);

            // console.log(`[ToolOrchestrator] [Streaming] Updated historical messages: `, updatedHistoricalMessages);

            // Build new chat parameters for streaming
            const newParams: UniversalChatParams = {
                messages: [
                    { role: 'system', content: params.systemMessage },
                    ...updatedHistoricalMessages,
                    { role: 'assistant', content: 'Please continue based on the tool execution results above.' }
                ],
                settings: params.settings
            };

            // console.log('[ToolOrchestrator] [Streaming] New chat parameters: ', newParams);

            // Start a new streaming session with updated context and wrap it with accumulation
            const newStream = await this.streamController.createStream(params.model, newParams, inputTokens);
            // console.log('[ToolOrchestrator] [Streaming] New streaming session started.');
            return this.accumulateStream(newStream);
        }

        // If no tool calls require resubmission, create a final streaming session with accumulation
        const finalParams: UniversalChatParams = {
            messages: [
                { role: 'system', content: params.systemMessage },
                ...updatedHistoricalMessages,
                { role: 'assistant', content: 'Please continue based on the tool execution results above.' }
            ],
            settings: params.settings
        };

        const finalStreamIterable = await this.streamController.createStream(params.model, finalParams, inputTokens);
        return this.accumulateStream(finalStreamIterable);
    }
} 