/**
 * Interface for the MCP Client Manager.
 * Defines methods for interacting with MCP servers.
 */

import type { MCPServerConfig } from './MCPConfigTypes';
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
} 