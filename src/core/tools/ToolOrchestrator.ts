import { ToolController } from './ToolController';
import { ChatController } from '../chat/ChatController';
import type { UniversalChatResponse, UniversalMessage, UniversalChatParams, UniversalStreamResponse, UniversalChatSettings } from '../../interfaces/UniversalInterfaces';
import { ToolError, ToolIterationLimitError } from '../../types/tooling';
import { StreamController } from '../streaming/StreamController';
import { ToolCallResult } from '../types';
import { logger } from '../../utils/logger';
import { ToolCall, ToolDefinition, ToolNotFoundError } from '../../types/tooling';
import { HistoryManager } from '../history/HistoryManager';

export type ToolOrchestrationParams = {
    model: string;
    systemMessage: string;
    historicalMessages?: UniversalMessage[];
    settings?: UniversalChatSettings;
    maxHistoryLength?: number;
    callerId?: string;
};

export type ToolOrchestrationResult = {
    response: UniversalChatResponse;
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
     * @param historyManager - HistoryManager instance for managing conversation history
     */
    constructor(
        private toolController: ToolController,
        private chatController: ChatController,
        streamController: StreamController,
        private historyManager: HistoryManager
    ) {
        this.streamController = streamController;
        logger.setConfig({ level: process.env.LOG_LEVEL as any || 'info', prefix: 'ToolOrchestrator' });
        logger.debug('Initialized');
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
        const log = logger.createLogger({ prefix: 'ToolOrchestrator.processResponse' });
        log.debug('Starting response processing');
        let currentResponse = response;

        try {
            // Store the initial assistant response in history
            this.historyManager.addMessage('assistant', currentResponse.content || '');

            // Process all tool calls first in a loop
            let iterationCount = 0;
            let requiresMoreProcessing = true;

            while (requiresMoreProcessing) {
                iterationCount++;
                if (iterationCount > this.MAX_TOOL_ITERATIONS) {
                    logger.warn(`Iteration limit exceeded: ${this.MAX_TOOL_ITERATIONS}`);
                    throw new ToolIterationLimitError(this.MAX_TOOL_ITERATIONS);
                }

                // Process tools and update history
                const { requiresResubmission } = await this.processToolCalls(currentResponse,);

                // If we found and processed tool calls, get LLM response
                if (requiresResubmission) {
                    // Get the current messages from the history manager
                    const currentMessages = this.historyManager.getHistoricalMessages();

                    // Get response from LLM based on tool results
                    currentResponse = await this.chatController.execute({
                        model: params.model,
                        systemMessage: params.systemMessage,
                        settings: params.settings,
                        historicalMessages: currentMessages
                    });

                    // Add the assistant's response to the historical messages
                    if (currentResponse.content) {
                        this.historyManager.addMessage('assistant', currentResponse.content);
                    }
                } else {
                    requiresMoreProcessing = false;
                }
            }

            // Reset tool iteration count after successful processing
            this.toolController.resetIterationCount();
            log.debug('Successfully completed response processing');

            // Get final history state
            const updatedHistoricalMessages = this.historyManager.getHistoricalMessages();

            return {
                response,
                finalResponse: currentResponse,
                updatedHistoricalMessages
            };
        } catch (error) {
            log.error('Error during response processing:', error);

            // Reset iteration count even if there's an error
            this.toolController.resetIterationCount();

            // Add error to tool executions
            const errorMessage = error instanceof Error ? error.message : String(error);


            return {
                response,
                finalResponse: {
                    role: 'assistant',
                    content: `An error occurred during tool execution: ${errorMessage}`,
                    metadata: {}
                },
                updatedHistoricalMessages: this.historyManager.getHistoricalMessages()
            };
        }
    }

    /**
     * Processes tool calls found in a response and adds their results to history
     * @param response - The response that may contain tool calls
     * @returns Object containing whether resubmission is required and the tool calls found
     */
    public async processToolCalls(
        response: UniversalChatResponse
    ): Promise<{ requiresResubmission: boolean; newToolCalls: number }> {
        // Process tools in the response
        const toolResult = await this.toolController.processToolCalls(
            response.content || '',
            response
        );

        // If no tool calls were found or processed, return early
        if (!toolResult?.requiresResubmission) {
            logger.debug('No more tool calls to process');
            return { requiresResubmission: false, newToolCalls: 0 };
        }

        let newToolCallsCount = 0;

        // Add tool executions to the tracking array and prepare messages
        if (toolResult?.toolCalls) {
            for (const call of toolResult.toolCalls) {

                // Add to history manager - this handles adding both the assistant and tool messages
                this.historyManager.addToolCallToHistory(
                    call.toolName,
                    call.arguments,
                    call.result || undefined,
                    call.error
                );

                newToolCallsCount++;
            }
        }

        return {
            requiresResubmission: true,
            newToolCalls: newToolCallsCount
        };
    }

} 