/**
 * Interface for the MCP Client Manager.
 * Defines methods for interacting with MCP servers.
 */

import type { MCPServerConfig, McpToolSchema } from './MCPConfigTypes';
import type { ToolDefinition } from '../../types/tooling';

/**
 * Interface for MCP Client Manager.
 * This manager handles connections to MCP servers and forwards
 * tool calls to the appropriate server.
 */
export interface IMCPClientManager {
    /**
     * Connects to an MCP server using the provided configuration.
     * @param serverKey Unique identifier for this server
     * @param config Server configuration
     * @returns Promise that resolves when connection is established
     */
    connect(serverKey: string, config: MCPServerConfig): Promise<void>;

    /**
     * Lists all available tools from the specified MCP server.
     * Results are cached with TTL and refreshed if the server sends a listChanged notification.
     * @param serverKey Unique identifier for the server
     * @returns Promise resolving to an array of tool definitions
     */
    listTools(serverKey: string): Promise<ToolDefinition[]>;

    /**
     * Calls a tool on the specified MCP server.
     * @param serverKey Unique identifier for the server
     * @param toolName Name of the tool to call
     * @param args Arguments to pass to the tool
     * @param stream Whether to stream the response (returns AsyncIterator if true, Promise if false)
     * @returns Promise resolving to the tool result, or AsyncIterator of result chunks if streaming
     */
    callTool<T = unknown>(
        serverKey: string,
        toolName: string,
        args: Record<string, unknown>,
        stream: false
    ): Promise<T>;

    /**
     * Calls a tool on the specified MCP server with streaming response.
     * @param serverKey Unique identifier for the server
     * @param toolName Name of the tool to call
     * @param args Arguments to pass to the tool
     * @param stream Must be true to use streaming
     * @returns Promise resolving to an AsyncIterator yielding tool result chunks
     */
    callTool<T = unknown>(
        serverKey: string,
        toolName: string,
        args: Record<string, unknown>,
        stream: true
    ): Promise<AsyncIterator<T>>;

    /**
     * Disconnects from the specified MCP server.
     * @param serverKey Unique identifier for the server
     * @returns Promise that resolves when disconnection is complete
     */
    disconnect(serverKey: string): Promise<void>;

    /**
     * Disconnects from all connected MCP servers.
     * @returns Promise that resolves when all disconnections are complete
     */
    disconnectAll(): Promise<void>;

    /**
     * Checks if the manager is connected to a specific server.
     * @param serverKey Unique identifier for the server
     * @returns True if connected, false otherwise
     */
    isConnected(serverKey: string): boolean;

    /**
     * Gets the list of connected server keys.
     * @returns Array of server keys that are currently connected
     */
    getConnectedServers(): string[];

    /**
     * Retrieves the detailed schemas for tools available on a specific MCP server.
     * This method is intended for developers to understand tool capabilities.
     * @param serverKey The unique identifier for the MCP server.
     * @returns A promise that resolves to an array of McpToolSchema objects.
     * @throws MCPConnectionError if the server cannot be reached or the manifest cannot be fetched.
     */
    getMcpServerToolSchemas(serverKey: string): Promise<McpToolSchema[]>;

    /**
     * Executes a specific tool on a connected MCP server directly.
     * Does not involve LLM interaction.
     * @param serverKey The unique identifier for the MCP server.
     * @param toolName The *original* name of the tool (e.g., 'list_directory').
     * @param args The arguments object to pass to the tool.
     * @returns A promise that resolves with the tool's result payload.
     * @throws MCPToolCallError if the server is not connected or the tool call fails.
     * @throws MCPConnectionError if sending the request fails.
     */
    executeMcpTool(serverKey: string, toolName: string, args: Record<string, unknown>): Promise<unknown>;
} 