import type { ToolDefinition, ToolsManager } from '../../types/tooling';
import type { UniversalMessage, UniversalChatResponse } from '../../interfaces/UniversalInterfaces';
import { ToolIterationLimitError, ToolNotFoundError, ToolExecutionError } from '../../types/tooling';
import { logger } from '../../utils/logger';
import type { ToolCall } from '../../types/tooling';

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
     * TODO: We do not need content at all, we parse only response 
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
        const log = logger.createLogger({ prefix: 'ToolController.processToolCalls' });
        if (this.iterationCount >= this.maxIterations) {
            log.warn(`Iteration limit exceeded: ${this.maxIterations}`);
            throw new ToolIterationLimitError(this.maxIterations);
        }
        this.iterationCount++;

        // First check for direct tool calls in the response
        let parsedToolCalls: { id?: string; name: string; arguments: Record<string, unknown> }[] = [];
        let requiresResubmission = false;

        if (response?.toolCalls?.length) {
            log.debug(`Found ${response.toolCalls.length} direct tool calls`);
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
            log.debug(`Processing tool call: ${name}`);
            const toolCallId = id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const toolCall = {
                id: toolCallId,
                toolName: name,
                arguments: args
            };
            const tool = this.toolsManager.getTool(name);

            if (!tool) {
                log.warn(`Tool not found: ${name}`);
                const error = new ToolNotFoundError(name);
                messages.push({
                    role: 'system',
                    content: `Error: ${error.message}`
                });
                toolCalls.push({ ...toolCall, error: error.message });
                continue;
            }

            try {
                log.debug(`Executing tool: ${name}`);
                if (!tool.callFunction) {
                    throw new ToolExecutionError(name, 'Tool does not have a callFunction implementation');
                }
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
                log.debug(`Successfully executed tool: ${name}`);
            } catch (error) {
                log.error(`Error executing tool ${name}:`, error);
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

    /**
     * Executes a single tool call
     * @param toolCall - The tool call to execute
     * @returns The result of the tool execution
     * @throws {ToolNotFoundError} When the requested tool is not found
     * @throws {ToolExecutionError} When tool execution fails
     */
    async executeToolCall(toolCall: ToolCall): Promise<string | Record<string, unknown>> {
        const log = logger.createLogger({ prefix: 'ToolController.executeToolCall' });
        log.debug('Executing tool call', { name: toolCall.name, id: toolCall.id, parameters: toolCall.arguments });

        // Find the tool
        const tool = this.getToolByName(toolCall.name);
        if (!tool) {
            log.error(`Tool not found: ${toolCall.name}`);
            throw new ToolNotFoundError(toolCall.name);
        }

        try {
            // Validate parameters against schema
            const args = toolCall.arguments || {};
            const schema = tool.parameters;

            // Check required parameters
            if (schema && schema.required && Array.isArray(schema.required)) {
                for (const requiredParam of schema.required) {
                    if (!(requiredParam in args)) {
                        throw new Error(`Missing required parameter: ${requiredParam}`);
                    }
                }
            }

            // Check for additional properties if not allowed
            if (schema && schema.properties && schema.additionalProperties === false) {
                const extraProps = Object.keys(args).filter(key => !(key in schema.properties));
                if (extraProps.length > 0) {
                    throw new Error(`Unexpected additional parameters: ${extraProps.join(', ')}`);
                }
            }

            // Execute the tool
            if (!tool.callFunction) {
                throw new ToolExecutionError(toolCall.name, 'Tool does not have a callFunction implementation');
            }
            const result = await tool.callFunction(args);
            log.debug(`Tool execution successful: ${toolCall.name}`, {
                id: toolCall.id,
                resultType: typeof result
            });
            log.debug('Tool execution result', { result });

            // Ensure we return the correct type
            return typeof result === 'string' ? result : result as Record<string, unknown>;
        } catch (error) {
            // Handle tool execution errors
            const errorMessage = error instanceof Error ? error.message : String(error);
            log.error(`Tool execution error: ${errorMessage}`, { toolName: toolCall.name });
            throw new ToolExecutionError(toolCall.name, errorMessage);
        }
    }
} 