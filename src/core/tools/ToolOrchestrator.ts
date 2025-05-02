import { ToolController } from './ToolController';
import { ChatController } from '../chat/ChatController';
import type { UniversalChatResponse, UniversalMessage, UniversalChatParams, UniversalStreamResponse, UniversalChatSettings } from '../../interfaces/UniversalInterfaces';
import { ToolError, ToolIterationLimitError } from '../../types/tooling';
import { StreamController } from '../streaming/StreamController';
import { logger } from '../../utils/logger';
import { ToolCall, ToolDefinition, ToolNotFoundError } from '../../types/tooling';
import { HistoryManager } from '../history/HistoryManager';
import { MCPServiceAdapter } from '../mcp/MCPServiceAdapter';

// Type to track called tools with their arguments
type CalledTool = {
    name: string;
    arguments: string; // JSON stringified arguments for comparison
    timestamp: number;
};


/**
 * TODO: Combine with ToolController
 * 
 * 
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
    // Track which tools have been called to prevent duplicate calls
    private calledTools: CalledTool[] = [];

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
        const log = logger.createLogger({
            level: process.env.LOG_LEVEL as any || 'info',
            prefix: 'ToolOrchestrator.constructor'
        });
        log.debug('Initialized');
    }

    /**
     * Reset the called tools tracking
     */
    public resetCalledTools(): void {
        this.calledTools = [];
        logger.debug('Called tools tracking reset');
    }


    /**
     * Processes tool calls found in a response and adds their results to history
     * @param response - The response that may contain tool calls
     * @param callSpecificTools - Optional list of tools passed specifically for this call.
     * @param mcpAdapterProvider - Function to get the MCPServiceAdapter instance.
     * @returns Object containing whether resubmission is required and the tool calls found
     */
    public async processToolCalls(
        response: UniversalChatResponse,
        callSpecificTools?: ToolDefinition[],
        mcpAdapterProvider?: () => MCPServiceAdapter | null
    ): Promise<{ requiresResubmission: boolean; newToolCalls: number }> {
        // Reset iteration count at the beginning of each tool processing session
        this.toolController.resetIterationCount();

        // Filter out tool calls that have already been made with the same arguments
        if (response.toolCalls && response.toolCalls.length > 0) {
            logger.debug(`Processing ${response.toolCalls.length} tool calls`);

            const filteredToolCalls = response.toolCalls.filter(call => {
                const argStr = JSON.stringify(call.arguments || {});
                const isDuplicate = this.calledTools.some(
                    t => t.name === call.name && t.arguments === argStr
                );

                if (isDuplicate) {
                    logger.debug(`Skipping duplicate tool call: ${call.name} with args: ${argStr.substring(0, 100)}`);
                    return false;
                }

                // Track this tool call
                this.calledTools.push({
                    name: call.name,
                    arguments: argStr,
                    timestamp: Date.now()
                });

                return true;
            });

            // If all tool calls were duplicates, return early
            if (filteredToolCalls.length === 0 && response.toolCalls.length > 0) {
                logger.debug('All tool calls were duplicates, skipping processing');
                return { requiresResubmission: false, newToolCalls: 0 };
            }

            // Update the response with filtered tool calls
            response.toolCalls = filteredToolCalls;
            logger.debug(`After filtering: ${response.toolCalls.length} tool calls remaining`);
        }

        // Get the adapter instance using the provider function
        const mcpAdapter = mcpAdapterProvider ? mcpAdapterProvider() : null;

        // Process tools in the response, passing the adapter instance
        const toolResult = await this.toolController.processToolCalls(
            response,
            callSpecificTools,
            mcpAdapter
        );

        // If no tool calls were found or processed, return early
        if (!toolResult?.requiresResubmission) {
            logger.debug('No more tool calls to process');
            return { requiresResubmission: false, newToolCalls: 0 };
        }

        let newToolCallsCount = 0;

        // Add tool executions to the tracking array and prepare messages
        if (toolResult?.toolCalls) {
            logger.debug(`Processing ${toolResult.toolCalls.length} tool call results`);

            for (const call of toolResult.toolCalls) {
                // CRITICAL: When processing tool calls, we need to add the tool response
                // directly with the EXACT same tool call ID that was provided by the API.
                // This ensures OpenAI can match tool responses to the original calls.

                if (!call.id) {
                    logger.warn('Tool call missing ID - this may cause message history issues');
                    continue;
                }

                // Add tool result directly to history with the EXACT original ID
                if (call.result !== undefined) { // Check if result exists
                    // *** Stringify result if it's not already a string ***
                    const resultContentString = typeof call.result === 'string'
                        ? call.result
                        : JSON.stringify(call.result);

                    this.historyManager.addMessage('tool', resultContentString, {
                        toolCallId: call.id,
                        name: call.toolName
                    });
                    logger.debug(`Added tool result for ${call.toolName} with ID ${call.id}`);
                } else if (call.error) {
                    // Handle error case (error should already be a string)
                    const errorMessage = call.error.startsWith('Error executing tool')
                        ? call.error
                        : `Error executing tool ${call.toolName}: ${call.error}`;

                    this.historyManager.addMessage('tool',
                        errorMessage,
                        { toolCallId: call.id });
                    logger.debug(`Added tool error for ${call.toolName} with ID ${call.id}: ${call.error}`);
                }

                newToolCallsCount++;
            }
        }

        return {
            requiresResubmission: toolResult.requiresResubmission,
            newToolCalls: newToolCallsCount
        };
    }

} 