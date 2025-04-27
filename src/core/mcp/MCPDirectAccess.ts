/**
 * MCP Direct Access Types
 * 
 * This file re-exports types and interfaces for direct access to MCP tools without LLM involvement.
 * For implementation, see LLMCaller.getMcpServerToolSchemas and LLMCaller.callMcpTool.
 */

import type { McpToolSchema } from './MCPConfigTypes';
import type { IMCPClientManager } from './IMCPClientManager';

/**
 * Interface for direct MCP tool access provided by LLMCaller
 * Subset of IMCPClientManager methods focused on direct tool access
 */
export interface MCPDirectAccess {
    /**
     * Gets all available tool schemas from an MCP server
     * @see IMCPClientManager.getMcpServerToolSchemas
     * 
     * @param serverName - The name of the MCP server as configured in the mcpServers map
     * @returns An array of tool schemas available on the server
     */
    getMcpServerToolSchemas(serverName: string): Promise<McpToolSchema[]>;

    /**
     * Calls a specific tool on an MCP server directly
     * @see IMCPClientManager.executeMcpTool
     * 
     * @param serverName - The name of the MCP server as configured in the mcpServers map
     * @param toolName - The name of the tool to call
     * @param parameters - The parameters to pass to the tool
     * @returns The result from the tool
     */
    callMcpTool(serverName: string, toolName: string, parameters: Record<string, any>): Promise<any>;
}

// Re-export McpToolSchema type for convenience
export { McpToolSchema }; 