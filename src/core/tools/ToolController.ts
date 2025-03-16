import type { ToolDefinition, ToolsManager } from '../types';
import type { UniversalMessage, UniversalChatResponse } from '../../interfaces/UniversalInterfaces';
import { ToolIterationLimitError, ToolNotFoundError, ToolExecutionError } from '../../types/tooling';

export class ToolController {
    private toolsManager: ToolsManager;
    private iterationCount: number = 0;
    private maxIterations: number;

    /**
     * Creates a new ToolController instance
     * @param toolsManager - The ToolsManager instance to use for tool management
     * @param maxIterations - Maximum number of tool call iterations allowed (default: 5)
     */
    constructor(toolsManager: ToolsManager, maxIterations: number = 5) {
        this.toolsManager = toolsManager;
        this.maxIterations = maxIterations;
        if (process.env.NODE_ENV !== 'test') { console.log(`[ToolController] Initialized with maxIterations: ${maxIterations}`); }
    }

    /**
     * Processes tool calls found in the content
     * @param content - The content to process for tool calls
     * @param response - The response object containing tool calls (optional)
     * @returns Object containing messages, tool calls, and resubmission flag
     * @throws {ToolIterationLimitError} When iteration limit is exceeded
     * @throws {ToolNotFoundError} When a requested tool is not found
     * @throws {ToolExecutionError} When tool execution fails
     */
    async processToolCalls(content: string, response?: UniversalChatResponse): Promise<{
        messages: UniversalMessage[];
        toolCalls: {
            id: string;
            toolName: string;
            arguments: Record<string, unknown>;
            result?: string;
            error?: string;
        }[];
        requiresResubmission: boolean;
    }> {
        // console.log('[ToolController] Raw content for tool calls:', content);

        // if (process.env.NODE_ENV !== 'test') { console.log(`[ToolController] Processing tool calls (iteration ${this.iterationCount + 1}/${this.maxIterations})`); }

        if (this.iterationCount >= this.maxIterations) {
            // if (process.env.NODE_ENV !== 'test') { console.warn(`[ToolController] Iteration limit exceeded: ${this.maxIterations}`); }
            throw new ToolIterationLimitError(this.maxIterations);
        }
        this.iterationCount++;

        // First check for direct tool calls in the response
        let parsedToolCalls: { id?: string; name: string; arguments: Record<string, unknown> }[] = [];
        let requiresResubmission = false;

        if (response?.toolCalls?.length) {
            if (process.env.NODE_ENV !== 'test') { console.log(`[ToolController] Found ${response.toolCalls.length} direct tool calls`); }
            parsedToolCalls = response.toolCalls.map((tc: { id?: string; name: string; arguments: Record<string, unknown> }) => ({
                id: tc.id,
                name: tc.name,
                arguments: tc.arguments
            }));
            requiresResubmission = true;
        } else {
            parsedToolCalls = [];
            requiresResubmission = false;
        }

        // if (process.env.NODE_ENV !== 'test') { console.log(`[ToolController] Processing ${parsedToolCalls.length} tool calls`); }

        const messages: UniversalMessage[] = [];
        const toolCalls: {
            id: string;
            toolName: string;
            arguments: Record<string, unknown>;
            result?: string;
            error?: string;
        }[] = [];

        for (const { id, name, arguments: args } of parsedToolCalls) {
            // if (process.env.NODE_ENV !== 'test') { console.log(`[ToolController] Processing tool call: ${name}`); }
            // Get the tool call ID from the response if available
            const toolCallId = id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const toolCall = {
                id: toolCallId,
                toolName: name,
                arguments: args
            };
            const tool = this.toolsManager.getTool(name);

            if (!tool) {
                // if (process.env.NODE_ENV !== 'test') { console.warn(`[ToolController] Tool not found: ${name}`); }
                const error = new ToolNotFoundError(name);
                messages.push({
                    role: 'system',
                    content: `Error: ${error.message}`
                });
                toolCalls.push({ ...toolCall, error: error.message });
                continue;
            }

            try {
                // if (process.env.NODE_ENV !== 'test') { console.log(`[ToolController] Executing tool: ${name}`); }
                const result = await tool.callFunction(args);
                let processedMessages: string[];

                if (tool.postCallLogic) {
                    // if (process.env.NODE_ENV !== 'test') { console.log(`[ToolController] Running post-call logic for: ${name}`); }
                    processedMessages = await tool.postCallLogic(result);
                } else {
                    processedMessages = [typeof result === 'string' ? result : JSON.stringify(result)];
                }

                messages.push(...processedMessages.map(content => ({
                    role: 'function' as const,
                    content,
                    name
                })));

                let finalResult: string;
                if (typeof result === 'string') {
                    finalResult = result;
                } else {
                    finalResult = JSON.stringify(result);
                }
                toolCalls.push({ ...toolCall, result: finalResult });
                // if (process.env.NODE_ENV !== 'test') { console.log(`[ToolController] Successfully executed tool: ${name}`); }
            } catch (error) {
                console.error(`[ToolController] Error executing tool ${name}:`, error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                const toolError = new ToolExecutionError(name, errorMessage);
                messages.push({
                    role: 'system',
                    content: `Error: ${toolError.message}`
                });
                toolCalls.push({ ...toolCall, error: toolError.message });
            }
        }

        // if (process.env.NODE_ENV !== 'test') { console.log(`[ToolController] Completed processing ${parsedToolCalls.length} tool calls`); }
        return {
            messages,
            toolCalls,
            requiresResubmission
        };
    }

    /**
     * Resets the iteration count to 0
     */
    resetIterationCount(): void {
        if (process.env.NODE_ENV !== 'test') { console.log('[ToolController] Resetting iteration count'); }
        this.iterationCount = 0;
    }
} 