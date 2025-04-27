/**
 * Loader for converting MCP server configurations to tool definitions.
 */

import type { MCPServersMap } from './MCPConfigTypes';
import { MCPConnectionError, MCPToolCallError } from './MCPConfigTypes';
import type { ToolDefinition } from '../../types/tooling';
import { MCPClientManager } from './MCPClientManager';

/**
 * Interface for MCP Tool Loader.
 */
export interface IMCPToolLoader {
    /**
     * Loads tool definitions from MCP server configurations.
     * @param mcpServers Map of server keys to MCP server configurations
     * @returns Promise resolving to an array of tool definitions
     */
    loadTools(mcpServers: MCPServersMap): Promise<ToolDefinition[]>;
}

/**
 * Main implementation of the MCP Tool Loader.
 * Converts MCP server configurations to tool definitions.
 */
export class MCPToolLoader implements IMCPToolLoader {
    /**
     * Client manager for interacting with MCP servers.
     */
    private clientManager: MCPClientManager;

    /**
     * Creates a new MCP Tool Loader.
     * @param clientManager Optional client manager to use (creates a new one if not provided)
     */
    constructor(clientManager?: MCPClientManager) {
        this.clientManager = clientManager || new MCPClientManager();
    }

    /**
     * Loads tool definitions from MCP server configurations.
     * @param mcpServers Map of server keys to MCP server configurations
     * @returns Promise resolving to an array of tool definitions
     */
    async loadTools(mcpServers: MCPServersMap): Promise<ToolDefinition[]> {
        if (!mcpServers) {
            return [];
        }

        const allTools: ToolDefinition[] = [];
        const serverKeys = Object.keys(mcpServers);

        // Process each server in parallel
        const toolPromises = serverKeys.map(async (serverKey) => {
            const config = mcpServers[serverKey];

            // Skip disabled servers
            if (config.disabled) {
                return [];
            }

            try {
                // Connect to the server
                await this.clientManager.connect(serverKey, config);

                // List available tools
                return await this.clientManager.listTools(serverKey);
            } catch (error) {
                // Log the error but continue with other servers
                console.error(`Failed to load tools from MCP server "${serverKey}": ${(error as Error).message}`);
                return [];
            }
        });

        // Wait for all servers to be processed
        const toolArrays = await Promise.all(toolPromises);

        // Flatten the arrays
        for (const tools of toolArrays) {
            allTools.push(...tools);
        }

        // Track unique tool names
        const toolNames = new Set<string>();
        const uniqueTools: ToolDefinition[] = [];

        // Filter out duplicates
        for (const tool of allTools) {
            if (!toolNames.has(tool.name)) {
                toolNames.add(tool.name);
                uniqueTools.push(tool);
            }
        }

        return uniqueTools;
    }

    /**
     * Clean up resources and disconnect from all servers.
     */
    async dispose(): Promise<void> {
        await this.clientManager.disconnectAll();
    }
} 