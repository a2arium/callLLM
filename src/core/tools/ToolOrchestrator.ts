import { ToolController } from './ToolController';
import { ChatController } from '../chat/ChatController';
import type { UniversalChatResponse, UniversalMessage } from '../../interfaces/UniversalInterfaces';
import { ToolError, ToolIterationLimitError } from './types';

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
};

/**
 * Orchestrates the execution of tools and manages the conversation flow
 */
export class ToolOrchestrator {
    private readonly DEFAULT_MAX_HISTORY = 100;
    private readonly MAX_TOOL_ITERATIONS = 10;

    /**
     * Creates a new ToolOrchestrator instance
     * @param toolController - The ToolController instance to use for tool execution
     * @param chatController - The ChatController instance to use for conversation management
     */
    constructor(
        private toolController: ToolController,
        private chatController: ChatController
    ) {
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
                finalResponse: currentResponse
            };
        } catch (error) {
            console.error('[ToolOrchestrator] Error during response processing:', error);

            // Reset iteration count even if there's an error
            this.toolController.resetIterationCount();

            // Add error to tool executions
            const errorMessage = error instanceof Error ? error.message : String(error);
            toolExecutions.push({
                toolName: error instanceof ToolError ? error.name : 'unknown',
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
                }
            };
        }
    }
} 