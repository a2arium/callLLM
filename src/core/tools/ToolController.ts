import type { ToolDefinition, ToolsManager } from '../types';
import type { UniversalMessage, UniversalChatResponse } from '../../interfaces/UniversalInterfaces';
import { ToolCallParser } from './ToolCallParser';
import { ToolIterationLimitError, ToolNotFoundError, ToolExecutionError } from './types';

export class ToolController {
    private toolsManager: ToolsManager;
    private iterationCount: number = 0;
    private maxIterations: number;
    private toolCallParser: ToolCallParser;

    /**
     * Creates a new ToolController instance
     * @param toolsManager - The ToolsManager instance to use for tool management
     * @param maxIterations - Maximum number of tool call iterations allowed (default: 5)
     */
    constructor(toolsManager: ToolsManager, maxIterations: number = 5) {
        this.toolsManager = toolsManager;
        this.maxIterations = maxIterations;
        this.toolCallParser = new ToolCallParser();
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
        toolCalls: { name: string; parameters: Record<string, unknown>; result?: string; error?: string }[];
        requiresResubmission: boolean;
    }> {
        if (process.env.NODE_ENV !== 'test') { console.log(`[ToolController] Processing tool calls (iteration ${this.iterationCount + 1}/${this.maxIterations})`); }

        if (this.iterationCount >= this.maxIterations) {
            if (process.env.NODE_ENV !== 'test') { console.warn(`[ToolController] Iteration limit exceeded: ${this.maxIterations}`); }
            throw new ToolIterationLimitError(this.maxIterations);
        }
        this.iterationCount++;

        // First check for direct tool calls in the response
        let parsedToolCalls: { toolName: string; parameters: Record<string, unknown> }[] = [];
        let requiresResubmission = false;

        if (response?.toolCalls?.length) {
            if (process.env.NODE_ENV !== 'test') { console.log(`[ToolController] Found ${response.toolCalls.length} direct tool calls`); }
            parsedToolCalls = response.toolCalls.map((tc: { name: string; arguments: Record<string, unknown> }) => ({
                toolName: tc.name,
                parameters: tc.arguments || {}
            }));
            requiresResubmission = true;
        } else {
            // Fall back to parsing content if no direct tool calls
            const parseResult = this.toolCallParser.parse(content);
            parsedToolCalls = parseResult.toolCalls;
            requiresResubmission = parseResult.requiresResubmission;
        }

        if (process.env.NODE_ENV !== 'test') { console.log(`[ToolController] Processing ${parsedToolCalls.length} tool calls`); }

        const messages: UniversalMessage[] = [];
        const toolCalls: { name: string; parameters: Record<string, unknown>; result?: string; error?: string }[] = [];

        for (const { toolName, parameters } of parsedToolCalls) {
            if (process.env.NODE_ENV !== 'test') { console.log(`[ToolController] Processing tool call: ${toolName}`); }
            const toolCall = { name: toolName, parameters };
            const tool = this.toolsManager.getTool(toolName);

            if (!tool) {
                if (process.env.NODE_ENV !== 'test') { console.warn(`[ToolController] Tool not found: ${toolName}`); }
                const error = new ToolNotFoundError(toolName);
                messages.push({
                    role: 'system',
                    content: `Error: ${error.message}`
                });
                toolCalls.push({ ...toolCall, error: error.message });
                continue;
            }

            try {
                if (process.env.NODE_ENV !== 'test') { console.log(`[ToolController] Executing tool: ${toolName}`); }
                const result = await tool.callFunction(parameters);
                let processedMessages: string[];

                if (tool.postCallLogic) {
                    if (process.env.NODE_ENV !== 'test') { console.log(`[ToolController] Running post-call logic for: ${toolName}`); }
                    processedMessages = await tool.postCallLogic(result);
                } else {
                    processedMessages = [typeof result === 'string' ? result : JSON.stringify(result)];
                }

                messages.push(...processedMessages.map(content => ({
                    role: 'function' as const,
                    content,
                    name: toolName
                })));

                toolCalls.push({ ...toolCall, result: typeof result === 'string' ? result : JSON.stringify(result) });
                if (process.env.NODE_ENV !== 'test') { console.log(`[ToolController] Successfully executed tool: ${toolName}`); }
            } catch (error) {
                console.error(`[ToolController] Error executing tool ${toolName}:`, error);
                const toolError = new ToolExecutionError(toolName, error);
                messages.push({
                    role: 'system',
                    content: `Error: ${toolError.message}`
                });
                toolCalls.push({ ...toolCall, error: toolError.message });
            }
        }

        if (process.env.NODE_ENV !== 'test') { console.log(`[ToolController] Completed processing ${parsedToolCalls.length} tool calls`); }
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