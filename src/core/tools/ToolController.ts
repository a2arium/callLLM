import type { ToolDefinition, ToolsManager } from '../../types/tooling';
import type { UniversalMessage, UniversalChatResponse } from '../../interfaces/UniversalInterfaces';
import { ToolIterationLimitError, ToolNotFoundError, ToolExecutionError } from '../../types/tooling';
import { logger } from '../../utils/logger';
import type { ToolCall } from '../../types/tooling';
import { MCPServiceAdapter } from '../mcp/MCPServiceAdapter';

export class ToolController {
    private toolsManager: ToolsManager;
    private iterationCount: number = 0;
    private maxIterations: number;

    /**
     * Creates a new ToolController instance
     * @param toolsManager - The ToolsManager instance to use for tool management
     * @param maxIterations - Maximum number of tool call iterations allowed (default: 5)
     */
    constructor(
        toolsManager: ToolsManager,
        maxIterations: number = 5
    ) {
        this.toolsManager = toolsManager;
        this.maxIterations = maxIterations;
        const log = logger.createLogger({ prefix: 'ToolController.constructor', level: process.env.LOG_LEVEL as any || 'info' });
        log.debug(`Initialized with maxIterations: ${maxIterations}`);
    }

    /**
     * Finds a tool definition, prioritizing the call-specific list.
     * @param name - The name of the tool to find.
     * @param callSpecificTools - Optional list of tools relevant to the current call.
     * @returns The tool definition or undefined.
     */
    private findToolDefinition(name: string, callSpecificTools?: ToolDefinition[]): ToolDefinition | undefined {
        const log = logger.createLogger({ prefix: 'ToolController.findToolDefinition' });
        log.debug('Looking for tool by name:', {
            toolName: name,
            hasCallSpecificTools: Boolean(callSpecificTools),
            callSpecificToolsCount: callSpecificTools?.length || 0
        });

        // 1. Check call-specific tools first
        if (callSpecificTools) {
            // First try exact match on name
            let foundTool = callSpecificTools.find(t => t.name === name);
            if (foundTool) {
                log.debug('Found exact match in call-specific tools', {
                    toolName: name,
                    matchedName: foundTool.name,
                    hasOriginalName: Boolean(foundTool.metadata?.originalName)
                });
                return foundTool;
            }

            // If not found, check for tools with matching originalName in metadata
            foundTool = callSpecificTools.find(t =>
                t.metadata &&
                typeof t.metadata.originalName === 'string' &&
                t.metadata.originalName === name
            );

            if (foundTool) {
                log.debug('Found match by originalName in call-specific tools', {
                    requestedName: name,
                    matchedName: foundTool.name,
                    originalName: foundTool.metadata?.originalName as string
                });
                return foundTool;
            } else {
                log.debug('No match found in call-specific tools', { requestedName: name });
            }
        }

        // 2. Try the general ToolsManager with exact name
        const exactTool = this.toolsManager.getTool(name);
        if (exactTool) {
            log.debug('Found exact match in ToolsManager', {
                toolName: name,
                hasOriginalName: Boolean(exactTool.metadata?.originalName)
            });
            return exactTool;
        }

        // 3. Check all tools for matching originalName in metadata
        // This is less efficient but ensures we find the correct tool
        // when the name has been transformed for API compatibility
        const allTools = this.toolsManager.listTools() || [];
        log.debug('Searching all tools for originalName match', {
            requestedName: name,
            totalToolCount: allTools.length
        });

        const foundByOriginalName = allTools.find(t =>
            t.metadata &&
            typeof t.metadata.originalName === 'string' &&
            t.metadata.originalName === name
        );

        if (foundByOriginalName) {
            log.debug('Found match by originalName in all tools', {
                requestedName: name,
                matchedName: foundByOriginalName.name,
                originalName: foundByOriginalName.metadata?.originalName as string
            });
        } else {
            log.debug('No tool found matching requested name', { requestedName: name });
        }

        return foundByOriginalName;
    }

    /**
     * Processes tool calls found in the response from the LLM.
     * Executes the tools using either call-specific definitions or the main tools manager.
     * @param response - The response object containing tool calls.
     * @param callSpecificTools - Optional list of tools passed specifically for this call.
     * @param mcpAdapter - The MCPServiceAdapter instance to use for executing MCP tools.
     * @returns Object containing messages, tool calls, and resubmission flag.
     * @throws {ToolIterationLimitError} When iteration limit is exceeded.
     * @throws {ToolNotFoundError} When a requested tool is not found.
     * @throws {ToolExecutionError} When tool execution fails.
     */
    async processToolCalls(
        response: UniversalChatResponse,
        callSpecificTools?: ToolDefinition[],
        mcpAdapter?: MCPServiceAdapter | null
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
            response.toolCalls.forEach(tc => {
                log.debug('Processing tool call from response', {
                    id: tc.id,
                    name: tc.name,
                    argumentsKeys: Object.keys(tc.arguments || {}),
                    argumentsJson: JSON.stringify(tc.arguments).substring(0, 500) // Limit log size
                });
                parsedToolCalls.push({
                    id: tc.id,
                    name: tc.name,
                    arguments: tc.arguments
                });
            });
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
            log.debug(`Processing tool call: ${name}`, {
                hasArguments: Boolean(args),
                argumentsCount: Object.keys(args || {}).length,
                arguments: args || {}
            });
            const toolCallId = id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const toolCallInfo = {
                id: toolCallId,
                toolName: name,
                arguments: args
            };

            // Use the new findToolDefinition method
            const tool = this.findToolDefinition(name, callSpecificTools);

            let result: string | Record<string, unknown> | undefined;
            let error: string | undefined;

            if (!tool) {
                log.warn(`Tool not found: ${name}`, {
                    availableToolNames: callSpecificTools?.map(t => t.name) || [],
                    argumentsProvided: args
                });
                const notFoundError = new ToolNotFoundError(name);
                // Add error message to history via Tool result structure
                error = `Error: ${notFoundError.message}`;
                messages.push({ // Keep the original message push for context if desired
                    role: 'tool',
                    content: error,
                    metadata: { tool_call_id: toolCallId }
                });
            } else {
                // --- Execute the tool (Standard or MCP) --- 
                try {
                    log.debug(`Executing tool definition found: ${tool.name}`, { isMCP: tool.metadata?.isMCP });

                    // --- MCP Tool Execution Logic ---
                    if (tool.metadata?.isMCP) {
                        if (!mcpAdapter) {
                            log.error('MCP Adapter not provided for executing MCP tool:', { toolName: name });
                            throw new ToolExecutionError(name, 'MCP Adapter not provided to processToolCalls.');
                        }
                        const serverKey = tool.metadata.serverKey as string;
                        const originalToolName = tool.metadata.originalName as string; // Use original name for MCP call

                        if (!serverKey || !originalToolName) {
                            log.error('MCP tool metadata missing serverKey or originalName:', { toolName: name, metadata: tool.metadata });
                            throw new ToolExecutionError(name, 'Invalid MCP tool metadata.');
                        }
                        log.debug(`Executing MCP tool via adapter: ${serverKey}.${originalToolName}`);
                        const mcpResultRaw = await mcpAdapter.executeMcpTool(serverKey, originalToolName, args || {});
                        log.debug(`MCP tool execution successful: ${serverKey}.${originalToolName}`);
                        // Type check the raw result
                        if (typeof mcpResultRaw === 'string' || (typeof mcpResultRaw === 'object' && mcpResultRaw !== null)) {
                            result = mcpResultRaw as string | Record<string, unknown>;
                        } else if (mcpResultRaw !== undefined) {
                            // Stringify other types if necessary
                            result = JSON.stringify(mcpResultRaw);
                        }
                        // If mcpResultRaw is undefined, result remains undefined

                        // --- Standard Tool Execution Logic (using callFunction) ---
                    } else if (tool.callFunction) { // Use callFunction
                        log.debug(`Executing standard function tool: ${tool.name}`);
                        // Standard function execution expects arguments directly
                        const standardResultRaw = await tool.callFunction(args || {}); // Use callFunction
                        log.debug(`Standard function tool execution successful: ${tool.name}`);
                        // Type check the raw result
                        if (typeof standardResultRaw === 'string' || (typeof standardResultRaw === 'object' && standardResultRaw !== null)) {
                            result = standardResultRaw as string | Record<string, unknown>;
                        } else if (standardResultRaw !== undefined) {
                            // Stringify other types if necessary
                            result = JSON.stringify(standardResultRaw);
                        }
                        // If standardResultRaw is undefined, result remains undefined
                    } else {
                        log.error(`Tool definition is invalid or missing execution logic: ${tool.name}`);
                        throw new ToolExecutionError(tool.name, 'Tool function not defined.');
                    }

                } catch (execError) {
                    log.error(`Tool execution failed: ${name}`, { error: execError });
                    const execErrorMsg = execError instanceof Error ? execError.message : String(execError);
                    error = `Error executing tool ${name}: ${execErrorMsg}`;
                    messages.push({ // Keep the original message push for context if desired
                        role: 'tool',
                        content: error,
                        metadata: { tool_call_id: toolCallId }
                    });
                }
            }

            // Store result/error for the orchestrator
            executedToolCalls.push({
                ...toolCallInfo,
                result: result as string | undefined, // Ensure type compatibility
                error
            });
        } // End loop through parsedToolCalls

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
        callSpecificTools?: ToolDefinition[],
        mcpAdapter?: MCPServiceAdapter | null
    ): Promise<string | Record<string, unknown>> {
        const log = logger.createLogger({ prefix: 'ToolController.executeToolCall' });
        const { name, arguments: args, id } = toolCall;

        log.debug(`Attempting to execute tool: ${name}`, { toolCallId: id });

        const tool = this.findToolDefinition(name, callSpecificTools);

        if (!tool) {
            log.error(`Tool definition not found for execution: ${name}`);
            throw new ToolNotFoundError(name);
        }

        log.debug(`Executing tool definition found: ${tool.name}`, { isMCP: tool.metadata?.isMCP });

        // --- MCP Tool Execution Logic --- 
        if (tool.metadata?.isMCP) {
            if (!mcpAdapter) {
                log.error('MCP Adapter not provided for executing MCP tool:', { toolName: name });
                throw new ToolExecutionError(name, 'MCP Adapter not provided to executeToolCall.');
            }
            const serverKey = tool.metadata.serverKey as string;
            const originalToolName = tool.metadata.originalName as string;

            if (!serverKey || !originalToolName) {
                log.error('MCP tool metadata missing serverKey or originalName:', { toolName: name, metadata: tool.metadata });
                throw new ToolExecutionError(name, 'Invalid MCP tool metadata.');
            }

            try {
                log.debug(`Executing MCP tool via adapter: ${serverKey}.${originalToolName}`);
                const resultRaw = await mcpAdapter.executeMcpTool(serverKey, originalToolName, args || {});
                log.debug(`MCP tool execution successful: ${serverKey}.${originalToolName}`);
                // Type check the raw result
                if (typeof resultRaw === 'string' || (typeof resultRaw === 'object' && resultRaw !== null)) {
                    return resultRaw as string | Record<string, unknown>;
                } else if (resultRaw !== undefined) {
                    return JSON.stringify(resultRaw);
                } else {
                    // Handle undefined result - perhaps return empty string or throw?
                    // Let's return empty string for now to match signature.
                    return '';
                }
            } catch (error) {
                log.error(`MCP tool execution failed: ${serverKey}.${originalToolName}`, { error });
                throw new ToolExecutionError(name, (error as Error).message);
            }
        }
        // --- Standard Tool Execution Logic (using callFunction) ---
        else if (tool.callFunction) { // Use callFunction
            try {
                log.debug(`Executing standard function tool: ${tool.name}`);
                const resultRaw = await tool.callFunction(args || {}); // Use callFunction
                log.debug(`Standard function tool execution successful: ${tool.name}`);
                // Type check the raw result
                if (typeof resultRaw === 'string' || (typeof resultRaw === 'object' && resultRaw !== null)) {
                    return resultRaw as string | Record<string, unknown>;
                } else if (resultRaw !== undefined) {
                    return JSON.stringify(resultRaw);
                } else {
                    // Handle undefined result
                    return '';
                }
            } catch (error) {
                log.error(`Standard function tool execution failed: ${tool.name}`, { error });
                throw new ToolExecutionError(tool.name, (error as Error).message);
            }
        } else {
            log.error(`Tool definition is invalid or missing execution logic: ${tool.name}`);
            throw new ToolExecutionError(tool.name, 'Tool function not defined.');
        }
    }
} 