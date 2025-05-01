/**
 * Loader for converting MCP server configurations to tool definitions.
 */

import type { MCPServersMap } from './MCPConfigTypes';
import { MCPConnectionError } from './MCPConfigTypes';
import type { ToolDefinition } from '../../types/tooling';
import { MCPServiceAdapter } from './MCPServiceAdapter';
import { logger } from '../../utils/logger';

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
     * Service adapter for interacting with MCP servers.
     */
    private serviceAdapter: MCPServiceAdapter;

    /**
     * Flag indicating if the adapter was created within this loader
     */
    private ownedAdapter: boolean;

    /**
     * Creates a new MCP Tool Loader.
     * @param serviceAdapter Optional service adapter to use (creates a new one if not provided)
     */
    constructor(serviceAdapter?: MCPServiceAdapter) {
        // Use provided adapter or create a new one with empty config (will be set in loadTools)
        if (serviceAdapter) {
            this.serviceAdapter = serviceAdapter;
            this.ownedAdapter = false;
        } else {
            this.serviceAdapter = new MCPServiceAdapter({});
            this.ownedAdapter = true;
        }
    }

    /**
     * Loads tool definitions from MCP server configurations.
     * @param mcpServers Map of server keys to MCP server configurations
     * @returns Promise resolving to an array of tool definitions
     */
    async loadTools(mcpServers: MCPServersMap): Promise<ToolDefinition[]> {
        const log = logger.createLogger({ prefix: 'MCPToolLoader.loadTools' });

        if (!mcpServers) {
            return [];
        }

        // If we're using our own adapter that was created with empty config,
        // create a new one with the provided config
        if (this.ownedAdapter) {
            this.serviceAdapter = new MCPServiceAdapter(mcpServers);
        }

        const allTools: ToolDefinition[] = [];
        const serverKeys = Object.keys(mcpServers);

        log.debug(`Loading tools from ${serverKeys.length} MCP servers`);

        // Process each server in parallel
        const toolPromises = serverKeys.map(async (serverKey) => {
            const config = mcpServers[serverKey];

            // Skip disabled servers
            if (config.disabled) {
                log.debug(`Skipping disabled server: ${serverKey}`);
                return [];
            }

            try {
                // Connect to the server
                await this.serviceAdapter.connectToServer(serverKey);

                // List available tools
                return await this.serviceAdapter.getServerTools(serverKey);
            } catch (error) {
                // Log the error but continue with other servers
                log.error(`Failed to load tools from MCP server "${serverKey}": ${(error as Error).message}`);
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
            } else {
                log.warn(`Duplicate tool name detected: ${tool.name}. Keeping first instance.`);
            }
        }

        log.info(`Loaded ${uniqueTools.length} unique tools from ${serverKeys.length} MCP servers`);
        return uniqueTools;
    }

    /**
     * Clean up resources and disconnect from all servers.
     */
    async dispose(): Promise<void> {
        await this.serviceAdapter.disconnectAll();
    }

    /**
     * Gets the internal MCPServiceAdapter instance.
     * This allows callers to access and manage the adapter directly,
     * particularly for connection management and cleanup.
     * 
     * @returns The MCPServiceAdapter instance used by this loader
     */
    getMCPAdapter(): MCPServiceAdapter {
        return this.serviceAdapter;
    }
} 