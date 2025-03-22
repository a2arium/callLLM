import type { ToolDefinition, ToolsManager } from '../types';
import type { UniversalMessage, UniversalChatResponse } from '../../interfaces/UniversalInterfaces';
import { ToolIterationLimitError, ToolNotFoundError, ToolExecutionError } from '../../types/tooling';
import { logger } from '../../utils/logger';

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
        logger.setConfig({ level: process.env.LOG_LEVEL as any || 'info', prefix: 'ToolController' });
        logger.debug(`Initialized with maxIterations: ${maxIterations}`);
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
        if (this.iterationCount >= this.maxIterations) {
            logger.warn(`Iteration limit exceeded: ${this.maxIterations}`);
            throw new ToolIterationLimitError(this.maxIterations);
        }
        this.iterationCount++;

        // First check for direct tool calls in the response
        let parsedToolCalls: { id?: string; name: string; arguments: Record<string, unknown> }[] = [];
        let requiresResubmission = false;

        if (response?.toolCalls?.length) {
            logger.debug(`Found ${response.toolCalls.length} direct tool calls`);
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

        const messages: UniversalMessage[] = [];
        const toolCalls: {
            id: string;
            toolName: string;
            arguments: Record<string, unknown>;
            result?: string;
            error?: string;
        }[] = [];

        for (const { id, name, arguments: args } of parsedToolCalls) {
            logger.debug(`Processing tool call: ${name}`);
            const toolCallId = id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const toolCall = {
                id: toolCallId,
                toolName: name,
                arguments: args
            };
            const tool = this.toolsManager.getTool(name);

            if (!tool) {
                logger.warn(`Tool not found: ${name}`);
                const error = new ToolNotFoundError(name);
                messages.push({
                    role: 'system',
                    content: `Error: ${error.message}`
                });
                toolCalls.push({ ...toolCall, error: error.message });
                continue;
            }

            try {
                logger.debug(`Executing tool: ${name}`);
                const result = await tool.callFunction(args);
                let processedMessages: string[];

                if (tool.postCallLogic) {
                    logger.debug(`Running post-call logic for: ${name}`);
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
                logger.debug(`Successfully executed tool: ${name}`);
            } catch (error) {
                logger.error(`Error executing tool ${name}:`, error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                const toolError = new ToolExecutionError(name, errorMessage);
                messages.push({
                    role: 'system',
                    content: `Error: ${toolError.message}`
                });
                toolCalls.push({ ...toolCall, error: toolError.message });
            }
        }

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
        logger.debug('Resetting iteration count');
        this.iterationCount = 0;
    }

    /**
     * Gets a tool by name
     * @param name - The name of the tool to get
     * @returns The tool definition or undefined if not found
     */
    getToolByName(name: string): ToolDefinition | undefined {
        return this.toolsManager.getTool(name);
    }
} 