/**
 * MCP configuration types for the callLLM library.
 * These types define the structure for MCP server configurations.
 */

/**
 * Transport type for MCP servers.
 */
export type MCPTransportType = 'stdio' | 'http' | 'custom';

/**
 * HTTP streaming mode for MCP servers.
 */
export type MCPHttpMode = 'sse' | 'streamable';

/**
 * Configuration for a single MCP server.
 */
export type MCPServerConfig = {
    /**
     * Transport type for the MCP server.
     * Will be auto-detected if not specified (stdio if command is present, http if url is present).
     */
    type?: MCPTransportType;

    /**
     * Command to spawn for stdio transport.
     * Required when using stdio transport.
     */
    command?: string;

    /**
     * Arguments for the command when using stdio transport.
     */
    args?: string[];

    /**
     * URL for HTTP transport.
     * Required when using HTTP transport.
     */
    url?: string;

    /**
     * HTTP streaming mode.
     * Only applicable when using HTTP transport.
     * @default 'sse'
     */
    mode?: MCPHttpMode;

    /**
     * Path to custom transport plugin.
     * Required when using custom transport.
     */
    pluginPath?: string;

    /**
     * Additional options to pass to the custom transport plugin.
     */
    options?: Record<string, unknown>;

    /**
     * Environment variables to inject for stdio transport.
     * Values can be template strings like "${ENV_VAR}" to reference existing environment variables.
     */
    env?: Record<string, string>;

    /**
     * HTTP headers for HTTP transport.
     * Values can be template strings like "${TOKEN}" to reference environment variables.
     */
    headers?: Record<string, string>;

    /**
     * Human-readable description of the server.
     */
    description?: string;

    /**
     * Whether this server should be disabled.
     * @default false
     */
    disabled?: boolean;

    /**
     * List of tool names that should be auto-approved without user confirmation.
     */
    autoApprove?: string[];
};

/**
 * Map of server keys to MCP server configurations.
 */
export type MCPServersMap = Record<string, MCPServerConfig>;

/**
 * Tool description from the MCP server.
 */
export type MCPToolDescriptor = {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    returns?: Record<string, unknown>;
};

/**
 * Progress notification from MCP server.
 */
export type MCPProgressNotification = {
    progressToken: string;
    progress: number;
    total?: number;
    message?: string;
};

/**
 * Error types specific to MCP operations.
 */
export class MCPConnectionError extends Error {
    cause?: Error;

    constructor(serverKey: string, message: string, cause?: Error) {
        super(`Failed to connect to MCP server "${serverKey}": ${message}`);
        this.name = 'MCPConnectionError';
        if (cause) this.cause = cause;
    }
}

export class MCPToolCallError extends Error {
    constructor(serverKey: string, toolName: string, message: string) {
        super(`Error calling tool \"${toolName}\" on MCP server \"${serverKey}\": ${message}`);
        this.name = 'MCPToolCallError';
    }
}

export type MCPToolError = {
    error: string;
    details?: unknown;
};

// Re-add McpToolSchema definition
import type { z } from 'zod';

/**
 * Structure representing an MCP server tool configuration within an LLM call.
 */
export type MCPToolConfig = {
    mcpServers: MCPServersMap;
};

/**
 * Type guard to check if a tool configuration is an MCPToolConfig.
 * @param config The tool configuration to check.
 * @returns True if the config is an MCPToolConfig, false otherwise.
 */
export function isMCPToolConfig(config: unknown): config is MCPToolConfig {
    return (
        typeof config === 'object' &&
        config !== null &&
        'mcpServers' in config &&
        typeof config.mcpServers === 'object' &&
        config.mcpServers !== null
    );
}

/**
 * Represents the schema information for a single MCP tool, intended for developers.
 */
export type McpToolSchema = {
    /** The original name of the tool as defined by the MCP server (e.g., list_directory). */
    name: string;
    /** The description of the tool provided by the MCP server. */
    description: string;
    /** Zod schema defining the parameters the tool accepts. */
    parameters: z.ZodObject<any>;
    /** The unique key identifying the MCP server hosting this tool. */
    serverKey: string;
    /** The combined name used internally for LLM interaction (e.g., filesystem_list_directory). */
    llmToolName: string;
};

// Removed redundant export type { McpToolSchema }; as it's now exported directly above 