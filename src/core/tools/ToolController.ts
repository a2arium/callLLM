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
     * Finds a tool definition, prioritizing the call-specific list.
     * @param name - The name of the tool to find.
     * @param callSpecificTools - Optional list of tools relevant to the current call.
     * @returns The tool definition or undefined.
     */
    private findToolDefinition(name: string, callSpecificTools?: ToolDefinition[]): ToolDefinition | undefined {
        // 1. Check call-specific tools first
        if (callSpecificTools) {
            const foundTool = callSpecificTools.find(t => t.name === name);
            if (foundTool) {
                return foundTool;
            }
        }
        // 2. Fallback to the general ToolsManager
        return this.toolsManager.getTool(name);
    }

    /**
     * Processes tool calls found in the response from the LLM.
     * Executes the tools using either call-specific definitions or the main tools manager.
     * @param response - The response object containing tool calls.
     * @param callSpecificTools - Optional list of tools passed specifically for this call.
     * @returns Object containing messages, tool calls, and resubmission flag.
     * @throws {ToolIterationLimitError} When iteration limit is exceeded.
     * @throws {ToolNotFoundError} When a requested tool is not found.
     * @throws {ToolExecutionError} When tool execution fails.
     */
    async processToolCalls(
        response: UniversalChatResponse,
        callSpecificTools?: ToolDefinition[]
    ): Promise<{
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

        let requiresResubmission = false;
        const parsedToolCalls: { id?: string; name: string; arguments: Record<string, unknown> }[] = [];

        if (response?.toolCalls?.length) {
            log.debug(`Found ${response.toolCalls.length} direct tool calls`);
            response.toolCalls.forEach(tc => parsedToolCalls.push({
                id: tc.id,
                name: tc.name,
                arguments: tc.arguments
            }));
            requiresResubmission = true;
        } else {
            log.debug('No direct tool calls found in response.');
            requiresResubmission = false;
        }

        const messages: UniversalMessage[] = [];
        const executedToolCalls: {
            id: string;
            toolName: string;
            arguments: Record<string, unknown>;
            result?: string;
            error?: string;
        }[] = [];

        for (const { id, name, arguments: args } of parsedToolCalls) {
            log.debug(`Processing tool call: ${name}`);
            const toolCallId = id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const toolCallInfo = {
                id: toolCallId,
                toolName: name,
                arguments: args
            };

            // Use the new findToolDefinition method
            const tool = this.findToolDefinition(name, callSpecificTools);

            if (!tool) {
                log.warn(`Tool not found: ${name}`);
                const error = new ToolNotFoundError(name);
                // Create a system message indicating the tool wasn't found
                // Consistent with how executeToolCall might handle it, though we might prefer
                // to return the error directly in the tool result structure.
                messages.push({
                    role: 'tool',
                    content: `Error: ${error.message}`,
                    toolCallId: toolCallId,
                    // Optional: add name if needed by downstream processing
                    // name: name
                });
                executedToolCalls.push({ ...toolCallInfo, error: error.message });
                continue; // Move to the next tool call
            }

            try {
                log.debug(`Executing tool: ${name}`);
                if (!tool.callFunction) {
                    throw new ToolExecutionError(name, 'Tool does not have a callFunction implementation');
                }

                // Execute using the found tool definition
                const result = await tool.callFunction(args);
                const resultString = typeof result === 'string' ? result : JSON.stringify(result);

                // Add result message for the LLM
                messages.push({
                    role: 'tool',
                    content: resultString,
                    toolCallId: toolCallId,
                    // Optional: add name if needed by downstream processing
                    // name: name
                });

                executedToolCalls.push({ ...toolCallInfo, result: resultString });
                log.debug(`Successfully executed tool: ${name}`);
            } catch (error) {
                log.error(`Error executing tool ${name}:`, error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                const toolError = new ToolExecutionError(name, errorMessage);

                // Add error message for the LLM
                messages.push({
                    role: 'tool',
                    content: `Error executing tool ${name}: ${toolError.message}`,
                    toolCallId: toolCallId,
                    // Optional: add name if needed by downstream processing
                    // name: name
                });
                executedToolCalls.push({ ...toolCallInfo, error: toolError.message });
            }
        }

        return {
            messages,
            toolCalls: executedToolCalls,
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
     * Gets a tool by name, prioritizing call-specific tools if provided.
     * @param name - The name of the tool to get
     * @param callSpecificTools - Optional list of tools relevant to the current call.
     * @returns The tool definition or undefined if not found
     */
    getToolByName(name: string, callSpecificTools?: ToolDefinition[]): ToolDefinition | undefined {
        return this.findToolDefinition(name, callSpecificTools);
    }

    /**
     * Executes a single tool call, prioritizing call-specific definitions.
     * @param toolCall - The tool call to execute
     * @param callSpecificTools - Optional list of tools passed specifically for this call.
     * @returns The result of the tool execution
     * @throws {ToolNotFoundError} When the requested tool is not found
     * @throws {ToolExecutionError} When tool execution fails
     */
    async executeToolCall(
        toolCall: ToolCall,
        callSpecificTools?: ToolDefinition[]
    ): Promise<string | Record<string, unknown>> {
        const log = logger.createLogger({ prefix: 'ToolController.executeToolCall' });
        log.debug('Executing tool call', { name: toolCall.name, id: toolCall.id, parameters: toolCall.arguments });

        // Find the tool using the new method
        const tool = this.findToolDefinition(toolCall.name, callSpecificTools);
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
            // Note: Zod validation might be more robust here if schema is Zod
            if (schema && typeof schema === 'object' && 'properties' in schema && (schema as any).additionalProperties === false) {
                const knownProps = schema.properties ? Object.keys(schema.properties) : [];
                const extraProps = Object.keys(args).filter(key => !knownProps.includes(key));
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
            // log.debug('Tool execution result', { result }); // Avoid logging potentially large results

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