/**
 * Manager for MCP client connections and tool calls.
 */

import type { IMCPClientManager } from './IMCPClientManager';
import type { MCPServerConfig, MCPToolDescriptor } from './MCPConfigTypes';
import { MCPConnectionError, MCPToolCallError } from './MCPConfigTypes';
import type { ToolDefinition, ToolParameters } from '../../types/tooling';
import { Transport, MCPTransportFactory } from './MCPTransportFactory';
import { RetryManager, RetryConfig } from '../retry/RetryManager';
import { logger } from '../../utils/logger';

/**
 * Main implementation of the MCP Client Manager.
 * Manages connections to MCP servers and forwards tool calls.
 */
export class MCPClientManager implements IMCPClientManager {
    /**
     * Map of server keys to connected transports.
     */
    private transports: Map<string, Transport> = new Map();

    /**
     * Map of server keys to tool manifests.
     */
    private toolManifests: Map<string, {
        tools: MCPToolDescriptor[];
        timestamp: number;
        expiresAt: number;
    }> = new Map();

    /**
     * Map of server keys to tool cache (converted to callLLM ToolDefinitions).
     */
    private toolCache: Map<string, ToolDefinition[]> = new Map();

    /**
     * Default TTL for tool manifests in milliseconds.
     */
    private readonly DEFAULT_MANIFEST_TTL = 15 * 60 * 1000; // 15 minutes

    /**
     * Retry manager for handling transient errors.
     */
    private retryManager = new RetryManager({ baseDelay: 1000, maxRetries: 3 } as RetryConfig);

    /** Map of pending JSON-RPC requests (id → {resolve,reject}) */
    private pendingRequests: Map<string, { resolve: (value: any) => void; reject: (error: any) => void }> = new Map();

    /**
     * Connects to an MCP server.
     * @param serverKey Unique identifier for the server
     * @param config Server configuration
     * @returns Promise that resolves when connection is established
     */
    async connect(serverKey: string, config: MCPServerConfig): Promise<void> {
        if (this.transports.has(serverKey)) {
            return; // Already connected
        }

        try {
            // Create a transport for this server
            const transport = await MCPTransportFactory.createTransport(serverKey, config);

            // Set up message handler
            transport.onmessage = (message) => {
                this.handleMessage(serverKey, message);
            };

            // Start the transport
            await transport.start();

            // Store the transport
            this.transports.set(serverKey, transport);

            // Perform MCP handshake (initialize/initialized)
            await this.performHandshake(serverKey, transport);

            // Call listTools to populate the initial tool manifest
            await this.fetchToolManifest(serverKey);
        } catch (error) {
            throw new MCPConnectionError(serverKey, 'Failed to connect', error as Error);
        }
    }

    /**
     * Performs the MCP handshake (initialize/initialized sequence).
     * @param serverKey Unique identifier for the server
     * @param transport Transport instance
     * @returns Promise that resolves when handshake is complete
     */
    private async performHandshake(serverKey: string, transport: Transport): Promise<void> {
        try {
            // Send initialize and await response
            const initRequest = {
                jsonrpc: '2.0',
                id: 'init-' + Date.now(),
                method: 'initialize',
                params: {
                    protocolVersion: '2024-11-05',
                    capabilities: {},
                    clientInfo: { name: 'callLLM', version: '0.10.0' }
                }
            };
            await this.sendRequest(serverKey, initRequest);
            // Send initialized notification (no response expected)
            transport.send({ jsonrpc: '2.0', method: 'notifications/initialized' });
        } catch (err) {
            throw new MCPConnectionError(serverKey, 'Handshake failed', err as Error);
        }
    }

    /**
     * Handles incoming messages from the transport.
     * @param serverKey Unique identifier for the server
     * @param message Incoming message
     */
    private handleMessage(serverKey: string, message: any): void {
        // Route JSON-RPC responses
        if (message.id && this.pendingRequests.has(message.id)) {
            const { resolve, reject } = this.pendingRequests.get(message.id)!;
            this.pendingRequests.delete(message.id);
            if ('error' in message) {
                reject(new Error(message.error?.message || JSON.stringify(message.error)));
            } else {
                resolve(message.result);
            }
            return;
        }
        // Handle notifications like listChanged
        if (message.method === 'notifications/tools/list_changed') {
            this.toolManifests.delete(serverKey);
            this.toolCache.delete(serverKey);
        }
        // Handle progress notifications
        if (message.method === 'notifications/progress' && message.params) {
            logger.info(`MCP[${serverKey}] progress:`, message.params);
        }
        // Handle cancellation notifications
        if (message.method === 'notifications/canceled' && message.params) {
            logger.warn(`MCP[${serverKey}] canceled:`, message.params);
        }
    }

    /**
     * Fetches the tool manifest from the server.
     * @param serverKey Unique identifier for the server
     * @returns Promise resolving to the tool manifest
     */
    private async fetchToolManifest(serverKey: string): Promise<MCPToolDescriptor[]> {
        // Check cache first
        const cachedManifest = this.toolManifests.get(serverKey);
        if (cachedManifest && cachedManifest.expiresAt > Date.now()) {
            return cachedManifest.tools;
        }

        // Cache is invalid or expired, fetch from server
        try {
            // Send JSON-RPC list request
            const request = { jsonrpc: '2.0', id: 'list-tools-' + Date.now(), method: 'tools/list' };
            const response = await this.sendRequest(serverKey, request);
            let tools: MCPToolDescriptor[];
            if (Array.isArray(response)) {
                tools = response as MCPToolDescriptor[];
            } else if (response && Array.isArray(response.tools)) {
                tools = response.tools as MCPToolDescriptor[];
            } else {
                throw new Error('Invalid tools/list response');
            }

            // Cache the manifest
            this.toolManifests.set(serverKey, {
                tools,
                timestamp: Date.now(),
                expiresAt: Date.now() + this.DEFAULT_MANIFEST_TTL
            });

            return tools;
        } catch (error) {
            throw new MCPConnectionError(serverKey, 'Failed to fetch tool manifest', error as Error);
        }
    }

    /**
     * Lists all available tools from the specified MCP server.
     * @param serverKey Unique identifier for the server
     * @returns Promise resolving to an array of tool definitions
     */
    async listTools(serverKey: string): Promise<ToolDefinition[]> {
        // Check if we have a cached result
        const cachedTools = this.toolCache.get(serverKey);
        if (cachedTools) {
            return cachedTools;
        }

        // Fetch the manifest if needed
        const manifest = await this.fetchToolManifest(serverKey);

        // Convert MCP tool descriptors to callLLM ToolDefinitions
        const toolDefinitions = manifest.map(tool => this.convertToToolDefinition(serverKey, tool));

        // Cache the result
        this.toolCache.set(serverKey, toolDefinitions);

        return toolDefinitions;
    }

    /**
     * Enhances parameter schemas for known MCP tools when they're missing or incomplete
     * @param serverKey Server key
     * @param toolName Tool name
     * @param parameters Current parameters object (may be empty)
     * @returns Enhanced parameters object
     */
    private enhanceToolParameters(serverKey: string, toolName: string, parameters: Record<string, unknown>): Record<string, unknown> {
        const log = logger.createLogger({ prefix: 'MCPClientManager.enhanceToolParameters' });

        // Clone parameters to avoid modifying the original
        const enhancedParams = { ...parameters };

        // If properties is missing or empty, initialize it
        if (!enhancedParams.properties || Object.keys(enhancedParams.properties as Record<string, unknown>).length === 0) {
            log.debug(`Enhancing empty properties for ${serverKey}.${toolName}`);
            enhancedParams.properties = {};
        }

        const properties = enhancedParams.properties as Record<string, unknown>;

        // Initialize required array if it doesn't exist
        if (!Array.isArray(enhancedParams.required)) {
            enhancedParams.required = [];
        }

        const required = enhancedParams.required as string[];

        // Enhance filesystem.list_directory parameters
        if (serverKey === 'filesystem' && toolName === 'list_directory') {
            log.debug('Enhancing filesystem.list_directory parameters');

            // Add path parameter if missing
            if (!properties.path) {
                properties.path = {
                    type: 'string',
                    description: 'The directory path to list contents from. Default is current directory.'
                };
            }

            // Add to required if not already there
            if (!required.includes('path')) {
                required.push('path');
                log.debug('Added path to required parameters for filesystem.list_directory');
            }
        }

        // Enhance filesystem.read_file parameters
        if (serverKey === 'filesystem' && toolName === 'read_file') {
            log.debug('Enhancing filesystem.read_file parameters');

            // Add path parameter if missing
            if (!properties.path) {
                properties.path = {
                    type: 'string',
                    description: 'The file path to read.'
                };
            }

            // Add to required if not already there
            if (!required.includes('path')) {
                required.push('path');
            }
        }

        // Enhance other known MCP tool parameters as needed

        log.debug(`Enhanced parameters for ${serverKey}.${toolName}`, {
            propertiesCount: Object.keys(properties).length,
            propertyNames: Object.keys(properties),
            requiredParams: required
        });

        return enhancedParams;
    }

    /**
     * Converts an MCP tool descriptor to a callLLM ToolDefinition.
     * @param serverKey Unique identifier for the server
     * @param tool MCP tool descriptor
     * @returns callLLM ToolDefinition
     */
    private convertToToolDefinition(serverKey: string, tool: MCPToolDescriptor): ToolDefinition {
        const log = logger.createLogger({ prefix: 'MCPClientManager.convertToToolDefinition' });

        // Log original MCP tool details
        log.debug('Converting MCP tool to ToolDefinition:', {
            serverKey,
            toolName: tool.name,
            hasParameters: Boolean(tool.parameters),
            parametersType: tool.parameters ? typeof tool.parameters : 'undefined'
        });

        // Convert MCP parameter descriptor to JSON Schema properties/required
        const raw = tool.parameters || {};
        log.debug('Parameter raw structure:', {
            hasType: Boolean(raw.type),
            hasProperties: Boolean(raw.properties),
            isObject: raw.type === 'object',
            keysCount: Object.keys(raw).length
        });

        let properties: Record<string, unknown>;
        let required: string[];
        // If descriptor is a full JSON Schema object
        if (raw.type === 'object' && raw.properties && typeof raw.properties === 'object') {
            properties = raw.properties as Record<string, unknown>;
            required = Array.isArray(raw.required) ? raw.required as string[] : [];
            log.debug('Using JSON Schema object format', {
                propertiesCount: Object.keys(properties).length,
                requiredFields: required.length ? required : 'none'
            });
        } else {
            // Treat raw as a flat map of parameters
            properties = raw as Record<string, unknown>;
            required = [];
            log.debug('Using flat map parameter format', {
                propertiesCount: Object.keys(properties).length
            });
        }

        // Create dot-free name for OpenAI compatibility (replace dots with underscores)
        const originalName = `${serverKey}.${tool.name}`;
        const apiSafeName = originalName.replace(/\./g, '_');
        log.debug('Name transformation', { originalName, apiSafeName });

        // Create the base parameters object
        let parametersObj: Record<string, unknown> = {
            type: 'object',
            properties,
            required
        };

        // Enhance the parameters for known tools if they're incomplete
        parametersObj = this.enhanceToolParameters(serverKey, tool.name, parametersObj);

        const toolDefinition = {
            name: apiSafeName,
            description: tool.description,
            parameters: parametersObj as ToolParameters,
            // Store the original name and serverKey/toolName separately for easier reference
            callFunction: async (params: Record<string, unknown>) => {
                log.debug('Tool call execution', {
                    toolName: tool.name,
                    paramsKeys: Object.keys(params),
                    paramValues: params
                });

                // Check if we're missing any required parameters and provide defaults when possible
                const allParams = { ...params };

                // Handle path parameters for filesystem tools
                if (serverKey === 'filesystem' && ['list_directory', 'read_file', 'directory_tree'].includes(tool.name)) {
                    // Sanitize path parameter if it exists but is invalid
                    if (typeof allParams.path === 'string') {
                        const originalPath = allParams.path as string;

                        // Check for obviously invalid characters that could indicate model confusion
                        if (/[}\]>)}]/.test(originalPath) || originalPath.includes('"}') || originalPath.includes('"]')) {
                            log.warn(`Received malformed path parameter for ${tool.name}: "${originalPath}", sanitizing`);

                            // Extract just the valid path part, or use default if cannot sanitize
                            // Keep alphanumeric, slashes, dots, dashes, underscores
                            const sanitized = originalPath.replace(/[^\w\/\.\-_]/g, '');

                            // If sanitized path is empty or just dots, use default
                            if (!sanitized || sanitized === '.' || sanitized === '..') {
                                allParams.path = './';
                                log.debug(`Using default path './' instead of "${originalPath}"`);
                            } else {
                                allParams.path = sanitized;
                                log.debug(`Sanitized path from "${originalPath}" to "${sanitized}"`);
                            }
                        }
                    }

                    // For filesystem.list_directory, provide default path if missing or empty
                    if (tool.name === 'list_directory' && (!allParams.path || (typeof allParams.path === 'string' && allParams.path.trim() === ''))) {
                        log.debug('Adding default path parameter for filesystem.list_directory');
                        allParams.path = './';
                    }
                }

                return this.callTool(serverKey, tool.name, allParams, false);
            },
            origin: 'mcp',
            // Add metadata to help with mapping back to original names
            metadata: {
                originalName,
                serverKey,
                toolName: tool.name
            }
        } as ToolDefinition;

        log.debug('Created tool definition', {
            name: toolDefinition.name,
            requiredParams: toolDefinition.parameters.required,
            propertiesKeys: Object.keys(toolDefinition.parameters.properties)
        });

        return toolDefinition;
    }

    /**
     * Calls a tool on the specified MCP server.
     * @param serverKey Unique identifier for the server
     * @param toolName Name of the tool to call
     * @param args Arguments to pass to the tool
     * @param stream Whether to stream the response
     * @returns Promise resolving to the tool result, or AsyncIterator of result chunks if streaming
     */
    async callTool<T = unknown>(
        serverKey: string,
        toolName: string,
        args: Record<string, unknown>,
        stream: false
    ): Promise<T>;
    async callTool<T = unknown>(
        serverKey: string,
        toolName: string,
        args: Record<string, unknown>,
        stream: true
    ): Promise<AsyncIterator<T>>;
    async callTool<T = unknown>(
        serverKey: string,
        toolName: string,
        args: Record<string, unknown>,
        stream: boolean
    ): Promise<T | AsyncIterator<T>> {
        // Ensure we're connected
        if (!this.isConnected(serverKey)) {
            throw new MCPToolCallError(serverKey, toolName, 'Not connected to server');
        }

        const operation = async () => {
            if (stream) {
                // streaming not implemented yet
                async function* stub() { throw new Error('Streaming not implemented for MCP tools'); }
                return stub() as unknown as T;
            } else {
                // Prepare JSON-RPC call request
                const callToolRequest = {
                    jsonrpc: '2.0',
                    id: `call-tool-${Date.now()}`,
                    method: 'tools/call',
                    params: { name: toolName, arguments: args }
                };
                // Send the request and return result
                const response = await this.sendRequest(serverKey, callToolRequest);
                return response as T;
            }
        };
        const shouldRetry = (_: unknown) => true;
        try {
            return stream
                ? (await operation())
                : await this.retryManager.executeWithRetry(operation, shouldRetry);
        } catch (error) {
            throw new MCPToolCallError(serverKey, toolName, (error as Error).message);
        }
    }

    /**
     * Disconnects from the specified MCP server.
     * @param serverKey Unique identifier for the server
     * @returns Promise that resolves when disconnection is complete
     */
    async disconnect(serverKey: string): Promise<void> {
        const transport = this.transports.get(serverKey);
        if (transport) {
            await transport.close();
            this.transports.delete(serverKey);
            this.toolManifests.delete(serverKey);
            this.toolCache.delete(serverKey);
        }
    }

    /**
     * Disconnects from all connected MCP servers.
     * @returns Promise that resolves when all disconnections are complete
     */
    async disconnectAll(): Promise<void> {
        const disconnectPromises = [...this.transports.entries()].map(
            ([serverKey, transport]) => this.disconnect(serverKey)
        );
        await Promise.all(disconnectPromises);
    }

    /**
     * Checks if the manager is connected to a specific server.
     * @param serverKey Unique identifier for the server
     * @returns True if connected, false otherwise
     */
    isConnected(serverKey: string): boolean {
        return this.transports.has(serverKey);
    }

    /**
     * Gets the list of connected server keys.
     * @returns Array of server keys that are currently connected
     */
    getConnectedServers(): string[] {
        return [...this.transports.keys()];
    }

    /**
     * Send a JSON-RPC request over the transport and await the response.
     */
    private sendRequest(serverKey: string, request: any): Promise<any> {
        const transport = this.transports.get(serverKey);
        if (!transport) {
            return Promise.reject(new MCPConnectionError(serverKey, 'Not connected'));
        }
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(request.id, { resolve, reject });
            transport.send(request);
        });
    }
} 