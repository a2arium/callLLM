/**
 * MCP Service Adapter
 * 
 * Adapter layer for the @modelcontextprotocol/sdk Client
 * This provides a bridge between callLLM's internal interfaces and the MCP SDK.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { MCPServerConfig, MCPServersMap } from './MCPConfigTypes';
import { MCPConnectionError, MCPToolCallError, McpToolSchema, MCPAuthenticationError, MCPTimeoutError } from './MCPConfigTypes';
import { logger } from '../../utils/logger';
import type { ToolDefinition, ToolParameters, ToolParameterSchema } from '../../types/tooling';
import { z } from 'zod';
import { OAuthProvider, type OAuthProviderOptions } from './OAuthProvider';
import type { OAuthClientInformation } from '@modelcontextprotocol/sdk/shared/auth.js';
import { RetryManager } from '../retry/RetryManager';
import type { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';

/**
 * Import interfaces for resources and prompts
 */
import type {
    MCPRequestOptions,
    Resource,
    ReadResourceParams,
    ReadResourceResult,
    ResourceTemplate,
    Prompt,
    GetPromptParams,
    GetPromptResult
} from './MCPInterfaces';

/**
 * Client information for MCP SDK connection
 */
const CLIENT_INFO = {
    name: 'callLLM',
    version: '0.10.0'
};

/**
 * Default client capabilities to advertise to the server
 */
const DEFAULT_CLIENT_CAPABILITIES = {
    tools: {},
    resources: {},
    prompts: {},
    roots: {}
};

/**
 * Default retry configuration for MCP operations
 */
const DEFAULT_RETRY_CONFIG = {
    baseDelay: 500,   // Start with 500ms delay
    maxRetries: 3,    // Max 3 retries
    retryableStatusCodes: [408, 429, 502, 503, 504] // Common transient HTTP errors
};

/**
 * Define JSON-RPC Error interface locally since we can't import it
 */
interface JSONRPCError {
    code: number;
    message: string;
    data?: unknown;
}

/**
 * MCP Service Adapter class
 * 
 * This adapter manages SDK Client instances (one per configured MCP server)
 * and their corresponding Transport instances. It mediates between callLLM's
 * components and the SDK Client interface.
 */
export class MCPServiceAdapter {
    /**
     * Map of server keys to SDK clients
     */
    private sdkClients: Map<string, Client> = new Map();

    /**
     * Map of server keys to SDK transports
     */
    private sdkTransports: Map<string, Transport> = new Map();

    /**
     * Map of server keys to MCP server configurations
     */
    private serverConfigs: Map<string, MCPServerConfig> = new Map();

    /**
     * Cache of tools fetched from MCP servers
     */
    private toolCache: Map<string, ToolDefinition[]> = new Map();

    /**
     * Retry manager for handling transient failures
     */
    private retryManager: RetryManager;

    /**
     * Constructor
     * @param mcpServers Map of server keys to MCP server configurations
     */
    constructor(mcpServers: MCPServersMap) {
        const log = logger.createLogger({ prefix: 'MCPServiceAdapter.constructor' });

        // Initialize the retry manager
        this.retryManager = new RetryManager(DEFAULT_RETRY_CONFIG);

        // Store server configurations (filtering disabled ones)
        Object.entries(mcpServers || {})
            .filter(([, config]) => !config.disabled)
            .forEach(([key, config]) => {
                this.serverConfigs.set(key, config);
            });

        log.info(`Initialized with ${this.serverConfigs.size} MCP server configurations.`);
    }

    /**
     * Creates a transport instance for the SDK.
     * @param serverKey Unique identifier for the server
     * @param config Server configuration
     * @returns Transport instance
     */
    private createTransport(serverKey: string, config: MCPServerConfig): Transport {
        const log = logger.createLogger({ prefix: 'MCPServiceAdapter.createTransport' });

        // Determine transport type from config
        const transportType = config.type || this.determineTransportType(config);

        log.debug(`Creating ${transportType} transport for server ${serverKey}`);

        try {
            // Create transport based on type
            switch (transportType) {
                case 'stdio':
                    return this.createStdioTransport(serverKey, config);
                case 'http':
                    return this.createHttpTransport(serverKey, config);
                case 'custom':
                    throw new MCPConnectionError(
                        serverKey,
                        'Custom transports are not yet supported in the MCPServiceAdapter'
                    );
                default:
                    throw new MCPConnectionError(
                        serverKey,
                        `Unknown transport type: ${transportType}`
                    );
            }
        } catch (error) {
            if (error instanceof MCPConnectionError) {
                throw error;
            }
            throw new MCPConnectionError(
                serverKey,
                `Failed to create transport: ${(error as Error).message}`,
                error as Error
            );
        }
    }

    /**
     * Creates a stdio transport for the SDK.
     * @param serverKey Unique identifier for the server
     * @param config Server configuration
     * @returns StdioClientTransport instance
     */
    private createStdioTransport(serverKey: string, config: MCPServerConfig): StdioClientTransport {
        if (!config.command) {
            throw new MCPConnectionError(serverKey, 'Command is required for stdio transport');
        }

        // Process environment variables
        const env: Record<string, string> = {};

        // Always include PATH environment variable by default
        if (process.env.PATH) {
            env['PATH'] = process.env.PATH;
        }

        if (config.env) {
            for (const [key, value] of Object.entries(config.env)) {
                // Process template strings like ${TOKEN}
                const processedValue = value.replace(/\${([^}]+)}/g, (match, envVar) => {
                    return process.env[envVar] || '';
                });
                env[key] = processedValue;
            }
        }

        return new StdioClientTransport({
            command: config.command,
            args: config.args || [],
            env
        });
    }

    /**
     * Creates an HTTP transport using the URL and mode from the configuration.
     * @param serverKey Unique identifier for the server
     * @param config MCP server configuration
     * @returns HTTP transport instance
     */
    private createHttpTransport(serverKey: string, config: MCPServerConfig): Transport {
        // Validate required configuration
        if (!config.url) {
            throw new MCPConnectionError(serverKey, 'URL is required for HTTP transport');
        }

        // Enforce HTTPS for security
        if (config.url.startsWith('http://') && !config.url.includes('localhost') && !config.url.includes('127.0.0.1')) {
            throw new MCPConnectionError(serverKey, 'HTTPS is required for HTTP transport (except for localhost)');
        }

        // Process headers
        const headers: Record<string, string> = {};
        if (config.headers) {
            for (const [key, value] of Object.entries(config.headers)) {
                // Process template strings like ${TOKEN}
                const processedValue = value.replace(/\${([^}]+)}/g, (match, envVar) => {
                    return process.env[envVar] || '';
                });
                headers[key] = processedValue;
            }
        }

        // Create transport options
        const transportOptions: Record<string, any> = {
            requestInit: { headers }
        };

        // Check if OAuth authentication is needed
        const oauthProvider = this.createOAuthProviderIfNeeded(serverKey, config);
        if (oauthProvider) {
            transportOptions.authProvider = oauthProvider;
        }

        // Create HTTP transport based on specified mode
        const mode = config.mode || 'sse';
        const url = new URL(config.url);

        if (mode === 'streamable') {
            return new StreamableHTTPClientTransport(url, transportOptions);
        } else {
            return new SSEClientTransport(url, transportOptions);
        }
    }

    /**
     * Creates an OAuth provider if the server config requires authentication.
     * @param serverKey Unique identifier for the server
     * @param config Server configuration
     * @returns OAuthProvider instance or undefined if not needed
     */
    private createOAuthProviderIfNeeded(serverKey: string, config: MCPServerConfig): OAuthProvider | undefined {
        const log = logger.createLogger({ prefix: 'MCPServiceAdapter.createOAuthProviderIfNeeded' });

        // Check if OAuth authentication is configured
        if (!config.auth?.oauth) {
            log.debug(`No OAuth configuration for server ${serverKey}`);
            return undefined;
        }

        const oauthConfig = config.auth.oauth;

        log.info(`Creating OAuth provider for server ${serverKey}`);

        // Create client information if pre-registered
        let clientInfo: OAuthClientInformation | undefined;
        if (oauthConfig.clientId) {
            clientInfo = {
                client_id: oauthConfig.clientId,
                ...(oauthConfig.clientSecret && { client_secret: oauthConfig.clientSecret })
            };
        }

        // Create options for OAuth provider
        const options: OAuthProviderOptions = {
            redirectUrl: oauthConfig.redirectUrl,
            clientMetadata: {
                redirect_uris: [oauthConfig.redirectUrl],
                client_name: 'callLLM MCP Client',
                software_id: 'callLLM',
                software_version: '0.10.0'
            },
            ...(clientInfo && { clientInformation: clientInfo })
        };

        return new OAuthProvider(serverKey, options);
    }

    /**
     * Completes OAuth authentication flow for a server connection.
     * @param serverKey Unique identifier for the server
     * @param authorizationCode Authorization code returned from OAuth provider
     * @returns Promise that resolves when authentication is complete
     */
    async completeAuthentication(serverKey: string, authorizationCode: string): Promise<void> {
        const log = logger.createLogger({ prefix: 'MCPServiceAdapter.completeAuthentication' });

        const transport = this.sdkTransports.get(serverKey);
        if (!transport) {
            throw new MCPConnectionError(serverKey, 'Transport not found. Start connection first.');
        }

        // For StreamableHTTPClientTransport or SSEClientTransport
        if ('finishAuth' in transport && typeof transport.finishAuth === 'function') {
            log.info(`Completing authentication for server ${serverKey}`);
            await transport.finishAuth(authorizationCode);
            log.info(`Authentication completed for server ${serverKey}`);
        } else {
            throw new MCPConnectionError(serverKey, 'Transport does not support authentication');
        }
    }

    /**
     * Creates a Client instance for the SDK.
     * @returns Client instance
     */
    private createClient(): Client {
        return new Client(
            CLIENT_INFO,
            {
                capabilities: DEFAULT_CLIENT_CAPABILITIES
            }
        );
    }

    /**
     * Connects to an MCP server using the SDK
     * @param serverKey Unique identifier for the server
     * @returns Promise that resolves when connection is established
     * @throws MCPConnectionError if connection fails
     */
    async connectToServer(serverKey: string): Promise<void> {
        const log = logger.createLogger({ prefix: 'MCPServiceAdapter.connectToServer' });

        // Check if already connected
        if (this.isConnected(serverKey)) {
            log.debug(`Already connected to server ${serverKey}`);
            return;
        }

        // Get server config
        const config = this.serverConfigs.get(serverKey);
        if (!config) {
            throw new MCPConnectionError(
                serverKey,
                'Server configuration not found'
            );
        }

        log.debug(`Connecting to server ${serverKey}`);

        try {
            if (config.type === 'http' || (!config.type && config.url)) {
                // For HTTP, we implement the Streamable HTTP -> SSE fallback strategy
                await this.connectWithHttp(serverKey, config);
            } else {
                // For stdio and custom, no fallback is needed
                const transport = this.createTransport(serverKey, config);
                const client = this.createClient();

                // Connect
                // await transport.start();
                await client.connect(transport);

                // Store references
                this.sdkTransports.set(serverKey, transport);
                this.sdkClients.set(serverKey, client);

                log.info(`Connected to server ${serverKey}`);
            }
        } catch (error) {
            // Clean up any partially initialized resources
            await this.disconnectServer(serverKey).catch(() => { /* Ignore cleanup errors */ });

            if (error instanceof MCPConnectionError) {
                throw error;
            }

            throw new MCPConnectionError(
                serverKey,
                `Failed to connect: ${(error as Error).message}`,
                error as Error
            );
        }
    }

    /**
     * Implements the HTTP connection with fallback from Streamable HTTP to SSE
     * @param serverKey Unique identifier for the server
     * @param config Server configuration
     */
    private async connectWithHttp(serverKey: string, config: MCPServerConfig): Promise<void> {
        const log = logger.createLogger({ prefix: 'MCPServiceAdapter.connectWithHttp' });

        if (!config.url) {
            throw new MCPConnectionError(serverKey, 'URL is required for HTTP transport');
        }

        // First try with StreamableHTTPClientTransport
        try {
            log.debug(`Trying Streamable HTTP transport for server ${serverKey}`);

            const transport = new StreamableHTTPClientTransport(
                new URL(config.url),
                {
                    requestInit: {
                        headers: config.headers
                    }
                }
            );

            const client = this.createClient();

            // await transport.start();
            await client.connect(transport);

            // Store references
            this.sdkTransports.set(serverKey, transport);
            this.sdkClients.set(serverKey, client);

            log.info(`Connected to server ${serverKey} using Streamable HTTP transport`);
            return;
        } catch (error) {
            log.warn(`Streamable HTTP connection failed for server ${serverKey}: ${(error as Error).message}`);

            // Check if the error indicates protocol mismatch or HTTP method issues
            const errorMessage = (error as Error).message.toLowerCase();
            const shouldFallback =
                errorMessage.includes('404') ||
                errorMessage.includes('405') ||
                errorMessage.includes('not found') ||
                errorMessage.includes('method not allowed') ||
                errorMessage.includes('protocol') ||
                errorMessage.includes('not supported');

            if (!shouldFallback) {
                throw new MCPConnectionError(
                    serverKey,
                    `Streamable HTTP connection failed: ${(error as Error).message}`,
                    error as Error
                );
            }

            log.info(`Falling back to SSE transport for server ${serverKey}`);
        }

        // Fallback to SSE transport
        try {
            const transport = new SSEClientTransport(
                new URL(config.url),
                {
                    requestInit: {
                        headers: config.headers
                    }
                }
            );

            const client = this.createClient();

            // await transport.start();
            await client.connect(transport);

            // Store references
            this.sdkTransports.set(serverKey, transport);
            this.sdkClients.set(serverKey, client);

            log.info(`Connected to server ${serverKey} using SSE transport (fallback)`);
        } catch (error) {
            throw new MCPConnectionError(
                serverKey,
                `Both Streamable HTTP and SSE transports failed: ${(error as Error).message}`,
                error as Error
            );
        }
    }

    /**
     * Disconnects from a specific MCP server.
     * @param serverKey Unique identifier for the server
     * @returns Promise that resolves when disconnected
     */
    async disconnectServer(serverKey: string): Promise<void> {
        const log = logger.createLogger({ prefix: 'MCPServiceAdapter.disconnectServer' });

        const client = this.sdkClients.get(serverKey);
        const transport = this.sdkTransports.get(serverKey);

        if (!client && !transport) {
            log.debug(`Not connected to server ${serverKey}`);
            return;
        }

        log.debug(`Disconnecting from server ${serverKey}`);

        try {
            // Disconnect the client first if available
            if (client) {
                try {
                    await client.close();
                } catch (error) {
                    log.warn(`Error disconnecting client for server ${serverKey}: ${error}`);
                    // Continue even if client disconnect fails
                }
                this.sdkClients.delete(serverKey);
            }

            // Then handle the transport and force kill the child process if it exists
            if (transport) {
                // Access the underlying child process if this is a StdioClientTransport
                if (transport instanceof StdioClientTransport && (transport as any).process) {
                    const childProcess = (transport as any).process;

                    // Send SIGTERM first for graceful shutdown
                    try {
                        childProcess.kill('SIGTERM');
                    } catch (error) {
                        log.warn(`Error sending SIGTERM to process for server ${serverKey}: ${error}`);
                    }

                    // Give it a short time to terminate gracefully
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // Force kill with SIGKILL if still running
                    try {
                        if (childProcess.killed === false) {
                            childProcess.kill('SIGKILL');
                        }
                    } catch (error) {
                        log.warn(`Error sending SIGKILL to process for server ${serverKey}: ${error}`);
                    }
                }

                // Close the transport
                try {
                    await transport.close();
                } catch (error) {
                    log.warn(`Error closing transport for server ${serverKey}: ${error}`);
                }
                this.sdkTransports.delete(serverKey);
            }

            // Clear cached tools
            this.toolCache.delete(serverKey);

            log.info(`Disconnected from server ${serverKey}`);
        } catch (error) {
            log.error(`Error disconnecting from server ${serverKey}: ${(error as Error).message}`);
            throw new MCPConnectionError(serverKey, `Failed to disconnect from server: ${error}`);
        }
    }

    /**
     * Disconnects from all connected MCP servers
     * @returns Promise that resolves when all disconnections are complete
     */
    async disconnectAll(): Promise<void> {
        const log = logger.createLogger({ prefix: 'MCPServiceAdapter.disconnectAll' });
        log.debug(`Disconnecting from all servers`);

        const disconnectPromises = Array.from(this.sdkClients.keys()).map(
            serverKey => this.disconnectServer(serverKey)
        );

        await Promise.all(disconnectPromises);

        log.info(`Disconnected from all servers`);
    }

    /**
     * Gets tools from the specified MCP server.
     * @param serverKey The unique identifier for the server.
     * @param options Optional request options
     * @returns A Promise resolving to an array of ToolDefinitions.
     * @throws MCPConnectionError if the server cannot be reached or the tools cannot be fetched.
     */
    async getServerTools(serverKey: string, options?: MCPRequestOptions): Promise<ToolDefinition[]> {
        const log = logger.createLogger({ prefix: 'MCPServiceAdapter.getServerTools' });
        const shouldRetry = options?.retry !== false; // Default to retry unless explicitly disabled

        // Check if we have cached tools for this server
        if (this.toolCache.has(serverKey)) {
            log.debug(`Returning cached tools for server ${serverKey}`);
            return this.toolCache.get(serverKey)!;
        }

        if (!this.isConnected(serverKey)) {
            throw new MCPConnectionError(serverKey, 'Server not connected. Cannot fetch tools.');
        }

        const client = this.sdkClients.get(serverKey)!;

        // Define the operation function for retry
        const fetchTools = async (): Promise<ToolDefinition[]> => {
            try {
                log.debug(`Fetching tools from server ${serverKey}`);

                // Call the SDK client's listTools method
                const result = await client.listTools();

                // Convert the SDK tool descriptors to our ToolDefinition type
                const tools: ToolDefinition[] = result.tools.map(tool =>
                    this.convertToToolDefinition(serverKey, tool)
                );

                log.info(`Fetched ${tools.length} tools from server ${serverKey}`);

                // Cache the tools for future use
                this.toolCache.set(serverKey, tools);

                return tools;
            } catch (error) {
                log.error(`Error fetching tools from server ${serverKey}:`, error);

                // Check for authentication errors
                if (error instanceof Error &&
                    (error.name === 'UnauthorizedError' ||
                        error.message.includes('unauthorized') ||
                        error.message.includes('401'))) {
                    throw new MCPAuthenticationError(serverKey, 'Authentication required to fetch tools',
                        error);
                }

                // Check for timeout errors
                if (error instanceof Error &&
                    (error.message.includes('timeout') || error.message.includes('timed out'))) {
                    throw new MCPTimeoutError(serverKey, 'fetch tools');
                }

                throw new MCPConnectionError(
                    serverKey,
                    `Failed to fetch tools: ${(error instanceof Error) ? error.message : String(error)}`,
                    error instanceof Error ? error : undefined
                );
            }
        };

        // Define the retry predicate
        const shouldRetryPredicate = (error: unknown): boolean => {
            if (!shouldRetry) return false;

            // Don't retry authentication errors
            if (error instanceof MCPAuthenticationError) return false;

            // Retry on timeouts
            if (error instanceof MCPTimeoutError) return true;

            // Retry on network-related errors
            if (error instanceof Error) {
                const message = error.message.toLowerCase();
                return message.includes('network') ||
                    message.includes('connection') ||
                    message.includes('socket') ||
                    message.includes('econnreset');
            }

            return false;
        };

        // Use retry manager if retry is enabled
        if (shouldRetry) {
            log.debug(`Fetching tools from server ${serverKey} with retry enabled`);
            return await this.retryManager.executeWithRetry(fetchTools, shouldRetryPredicate);
        } else {
            return await fetchTools();
        }
    }

    /**
     * Execute a tool on an MCP server
     * @param serverKey The key of the MCP server
     * @param toolName The name of the tool to execute
     * @param args The arguments to pass to the tool
     * @param stream Whether to stream the result
     * @returns The result of the tool execution, or an AsyncIterator for streaming
     * @throws MCPConnectionError if the server is not connected
     * @throws MCPToolCallError if execution fails
     * @throws MCPAuthenticationError if authentication is required
     * @throws MCPTimeoutError if the operation times out
     */
    async executeTool<T = unknown>(
        serverKey: string,
        toolName: string,
        args: Record<string, unknown>,
        stream: boolean = false,
        options?: MCPRequestOptions
    ): Promise<T | AsyncIterator<T>> {
        const log = logger.createLogger({ prefix: 'MCPServiceAdapter.executeTool' });
        const shouldRetry = options?.retry !== false; // Default to retry unless explicitly disabled

        const client = this.sdkClients.get(serverKey);
        if (!client) {
            throw new MCPConnectionError(
                serverKey,
                'Server not connected. Try connecting first with connectToServer().'
            );
        }

        // Process arguments to handle any environment variable references
        const processedArgs = this.processArguments(serverKey, toolName, args);

        // Define the operation to execute with potential retries
        const operation = async () => {
            try {
                if (stream) {
                    // Streaming is not retryable since it returns an iterator
                    return await client.callTool({
                        name: toolName,
                        arguments: processedArgs,
                        stream: true
                    }) as unknown as AsyncIterator<T>;
                } else {
                    return await client.callTool({
                        name: toolName,
                        arguments: processedArgs
                    }) as unknown as T;
                }
            } catch (error) {
                // Map errors to appropriate types
                if (error instanceof Error) {
                    // Check for authentication errors
                    if (error.name === 'UnauthorizedError' || error.message.includes('unauthorized') || error.message.includes('401')) {
                        throw new MCPAuthenticationError(serverKey, `Authentication required for tool ${toolName}`, error);
                    }

                    // Check for timeout errors
                    if (error.message.includes('timeout') || error.message.includes('timed out')) {
                        throw new MCPTimeoutError(serverKey, `execute tool ${toolName}`);
                    }

                    // Check for JSON-RPC errors (implementation specific)
                    const jsonRpcError = error as unknown as { code?: number; message: string };
                    if (jsonRpcError.code !== undefined) {
                        log.warn(`JSON-RPC error executing tool ${toolName} on server ${serverKey}: ${jsonRpcError.code} - ${jsonRpcError.message}`);

                        // Map common JSON-RPC error codes to appropriate error types
                        if (jsonRpcError.code === -32000) { // Server error
                            throw new MCPToolCallError(serverKey, toolName, jsonRpcError.message || 'Server error', error);
                        }
                        if (jsonRpcError.code === -32601) { // Method not found
                            throw new MCPToolCallError(serverKey, toolName, 'Tool not found on server', error);
                        }
                        if (jsonRpcError.code === -32602) { // Invalid params
                            throw new MCPToolCallError(serverKey, toolName, 'Invalid parameters', error);
                        }
                    }
                }

                // For any other errors, rethrow as MCPToolCallError
                throw new MCPToolCallError(
                    serverKey,
                    toolName,
                    (error instanceof Error) ? error.message : String(error),
                    error instanceof Error ? error : undefined
                );
            }
        };

        // Define the retry predicate
        const shouldRetryPredicate = (error: unknown): boolean => {
            if (!shouldRetry) return false;

            // Don't retry authentication errors
            if (error instanceof MCPAuthenticationError) return false;

            // Don't retry tool not found or invalid parameter errors
            if (error instanceof MCPToolCallError &&
                (error.message.includes('Tool not found') || error.message.includes('Invalid parameters'))) {
                return false;
            }

            // Retry on connection errors, timeouts, and specific status codes
            if (error instanceof MCPTimeoutError) return true;

            // Check for retryable HTTP status codes in wrapped errors
            if (error instanceof MCPToolCallError && error.cause) {
                const statusCodeMatch = error.cause.message.match(/(\d{3})/);
                if (statusCodeMatch) {
                    const statusCode = parseInt(statusCodeMatch[1], 10);
                    return DEFAULT_RETRY_CONFIG.retryableStatusCodes.includes(statusCode);
                }
            }

            // Retry on network-related errors
            if (error instanceof Error) {
                const message = error.message.toLowerCase();
                return message.includes('network') ||
                    message.includes('connection') ||
                    message.includes('socket') ||
                    message.includes('econnreset');
            }

            return false;
        };

        // If streaming or retries are disabled, execute directly
        if (stream || !shouldRetry) {
            log.debug(`Executing tool ${toolName} on server ${serverKey} without retry`, {
                streaming: stream
            });
            return await operation();
        }

        // Otherwise use the retry manager
        try {
            log.debug(`Executing tool ${toolName} on server ${serverKey} with retry enabled`);
            return await this.retryManager.executeWithRetry(operation, shouldRetryPredicate);
        } catch (error) {
            // Ensure all errors are properly wrapped
            if (error instanceof MCPAuthenticationError ||
                error instanceof MCPToolCallError ||
                error instanceof MCPTimeoutError) {
                throw error;
            }

            // Fallback error handling
            throw new MCPToolCallError(
                serverKey,
                toolName,
                `Failed after retries: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Processes arguments before sending to the MCP server
     * This includes sanitizing paths for filesystem tools and providing defaults
     * @param serverKey Server key
     * @param toolName Tool name
     * @param args Arguments to process
     * @returns Processed arguments
     */
    private processArguments(
        serverKey: string,
        toolName: string,
        args: Record<string, unknown>
    ): Record<string, unknown> {
        const log = logger.createLogger({ prefix: 'MCPServiceAdapter.processArguments' });
        const processedArgs = { ...args };

        // Handle path parameters for filesystem tools
        if (serverKey === 'filesystem' && ['list_directory', 'read_file', 'directory_tree'].includes(toolName)) {
            // Sanitize path parameter if it exists but is invalid
            if (typeof processedArgs.path === 'string') {
                const originalPath = processedArgs.path as string;

                // Check for obviously invalid characters that could indicate model confusion
                // Note: we specifically check for closing quotes/braces which are common in LLM errors
                if (/[}\]>)}]/.test(originalPath) ||
                    originalPath.includes('"}') ||
                    originalPath.includes('"]') ||
                    originalPath.includes('"') ||
                    originalPath.includes('}')) {

                    log.warn(`Received malformed path parameter for ${toolName}: "${originalPath}", sanitizing`);

                    // Extract just the valid path part, or use default if cannot sanitize
                    // Keep alphanumeric, slashes, dots, dashes, underscores
                    const sanitized = originalPath.replace(/[^\w\/\.\-_]/g, '');

                    // If sanitized path is empty or just dots, use default
                    if (!sanitized || sanitized === '.' || sanitized === '..') {
                        processedArgs.path = './';
                        log.debug(`Using default path './' instead of "${originalPath}"`);
                    } else {
                        processedArgs.path = sanitized;
                        log.debug(`Sanitized path from "${originalPath}" to "${sanitized}"`);
                    }
                }
            }

            // For filesystem.list_directory, provide default path if missing or empty
            if (toolName === 'list_directory' && (!processedArgs.path || (typeof processedArgs.path === 'string' && processedArgs.path.trim() === ''))) {
                log.debug('Adding default path parameter for filesystem.list_directory');
                processedArgs.path = './';
            }
        }

        return processedArgs;
    }

    /**
     * Converts an SDK tool to a callLLM ToolDefinition
     * @param serverKey Unique identifier for the server
     * @param tool Tool from the SDK
     * @returns ToolDefinition compatible with callLLM
     */
    private convertToToolDefinition(
        serverKey: string,
        tool: { name: string; description?: string; inputSchema: any }
    ): ToolDefinition {
        const log = logger.createLogger({ prefix: 'MCPServiceAdapter.convertToToolDefinition' });

        // Log original SDK tool details
        log.debug('Converting SDK tool to ToolDefinition:', {
            serverKey,
            toolName: tool.name,
            hasInputSchema: Boolean(tool.inputSchema)
        });

        // Get the input schema (parameters)
        const inputSchema = tool.inputSchema || { type: 'object', properties: {} };

        // Validate that inputSchema is an object with the expected structure
        if (inputSchema.type !== 'object') {
            log.warn(`Tool ${tool.name} has non-object input schema, using empty schema instead`);
            inputSchema.type = 'object';
            inputSchema.properties = {};
        }

        // Ensure properties exists
        const properties = inputSchema.properties || {};

        // Ensure required is an array
        const required = Array.isArray(inputSchema.required) ? inputSchema.required : [];

        // Create dot-free name for OpenAI compatibility (replace dots with underscores)
        const originalName = `${serverKey}.${tool.name}`;
        const apiSafeName = originalName.replace(/\./g, '_');
        log.debug('Name transformation', { originalName, apiSafeName });

        // Store the original tool name for use when calling the server
        const originalToolName = tool.name;

        // Create the tool definition with a fully functional callFunction that can handle sync and streaming
        const toolDefinition: ToolDefinition = {
            name: apiSafeName,
            description: tool.description || `Tool from server ${serverKey}`,
            parameters: {
                type: 'object',
                properties: properties as Record<string, ToolParameterSchema>,
                required
            },
            // Define callFunction with a type that satisfies the ToolDefinition interface
            callFunction: async <TParams extends Record<string, unknown>, TResponse = unknown>(
                params: TParams
            ): Promise<TResponse> => {
                // Log the tool call
                log.debug(`Tool call execution for ${originalName}`, {
                    paramsKeys: Object.keys(params)
                });

                // Process arguments (sanitize paths, etc.)
                const processedArgs = this.processArguments(serverKey, originalToolName, params);

                // Execute the tool using the adapter
                // For now, we're always using non-streaming mode
                // In the future, we could detect if the caller expects streaming
                return this.executeTool<TResponse>(serverKey, originalToolName, processedArgs) as Promise<TResponse>;
            },
            origin: 'mcp',
            metadata: {
                originalName,
                serverKey,
                toolName: originalToolName
            }
        };

        log.debug('Created tool definition', {
            name: toolDefinition.name,
            requiredParams: required.length,
            propertiesCount: Object.keys(properties).length
        });

        return toolDefinition;
    }

    /**
     * Creates a Zod schema from the tool parameters for validation
     * @param parameters Tool parameters in JSON Schema format
     * @returns Zod schema for validating parameters
     */
    private createZodSchemaFromParameters(parameters: ToolParameters): z.ZodObject<any> {
        const schemaMap: Record<string, z.ZodTypeAny> = {};

        // For each property, create appropriate Zod schema
        Object.entries(parameters.properties).forEach(([key, param]) => {
            let schema: z.ZodTypeAny;

            switch (param.type) {
                case 'string':
                    schema = z.string();
                    if (param.enum && Array.isArray(param.enum)) {
                        schema = z.enum(param.enum as [string, ...string[]]);
                    }
                    break;
                case 'number':
                    schema = z.number();
                    break;
                case 'integer':
                    schema = z.number().int();
                    break;
                case 'boolean':
                    schema = z.boolean();
                    break;
                case 'array':
                    // Default to any[] if items type is not specified
                    schema = z.array(z.any());
                    break;
                case 'object':
                    // Default to Record<string, any> if properties are not specified
                    schema = z.record(z.string(), z.any());
                    break;
                default:
                    // Default to any for unknown types
                    schema = z.any();
            }

            // Make optional if not in required list
            if (!parameters.required?.includes(key)) {
                schema = schema.optional();
            }

            schemaMap[key] = schema;
        });

        return z.object(schemaMap);
    }

    /**
     * Checks if the adapter is connected to a specific server
     * @param serverKey Unique identifier for the server
     * @returns True if connected, false otherwise
     */
    isConnected(serverKey: string): boolean {
        return this.sdkClients.has(serverKey) && this.sdkTransports.has(serverKey);
    }

    /**
     * Gets the list of connected server keys
     * @returns Array of server keys that are currently connected
     */
    getConnectedServers(): string[] {
        return Array.from(this.sdkClients.keys());
    }

    /**
     * Executes a specific tool on a connected MCP server directly.
     * This method is intended for direct tool calls without LLM interaction.
     * @param serverKey The unique identifier for the MCP server.
     * @param toolName The original name of the tool (e.g., 'list_directory').
     * @param args The arguments object to pass to the tool.
     * @param options Optional request options for timeout and cancellation
     * @returns A promise that resolves with the tool's result payload.
     * @throws MCPToolCallError if the server is not connected or the tool call fails.
     */
    async executeMcpTool(
        serverKey: string,
        toolName: string,
        args: Record<string, unknown>,
        options?: MCPRequestOptions
    ): Promise<unknown> {
        const log = logger.createLogger({ prefix: 'MCPServiceAdapter.executeMcpTool' });
        log.debug(`Executing direct MCP tool call: ${serverKey}.${toolName}`, { args });

        // Reuse the existing executeTool method which already handles the direct tool execution
        // Skip streaming for direct calls
        return this.executeTool(serverKey, toolName, args, false);
    }

    /**
     * Retrieves the detailed schemas for tools available on a specific MCP server.
     * This method is intended for developers to understand tool capabilities.
     * @param serverKey The unique identifier for the MCP server.
     * @returns A promise that resolves to an array of McpToolSchema objects.
     * @throws MCPConnectionError if the server cannot be reached or the manifest cannot be fetched.
     */
    async getMcpServerToolSchemas(serverKey: string): Promise<McpToolSchema[]> {
        const log = logger.createLogger({ prefix: 'MCPServiceAdapter.getMcpServerToolSchemas' });
        log.debug(`Fetching tool schemas for server: ${serverKey}`);

        // Ensure we're connected to the server
        if (!this.isConnected(serverKey)) {
            log.error(`Attempted to get schemas for unconnected server: ${serverKey}`);
            throw new MCPConnectionError(serverKey, 'Server not connected. Cannot fetch schemas.');
        }

        // Get the client
        const client = this.sdkClients.get(serverKey)!;

        try {
            // Call the SDK client's listTools method
            const toolsResult = await client.listTools();

            // Convert the tools to McpToolSchema format
            const schemas: McpToolSchema[] = toolsResult.tools.map(tool => {
                // Create API-safe name for LLM compatibility
                const llmToolName = `${serverKey}_${tool.name}`.replace(/[^a-zA-Z0-9_]/g, '_');

                // First create a default parameters object that matches ToolParameters
                const defaultParams: ToolParameters = {
                    type: 'object',
                    properties: {} as Record<string, ToolParameterSchema>,
                    required: [] as string[]
                };

                // Convert the input schema to a Zod schema
                let inputSchema: ToolParameters;
                if (tool.inputSchema) {
                    // Make sure properties exists and is of the right type
                    const properties = (tool.inputSchema.properties || {}) as Record<string, ToolParameterSchema>;
                    const required = Array.isArray(tool.inputSchema.required) ? tool.inputSchema.required : [];

                    inputSchema = {
                        type: 'object',
                        properties,
                        required
                    };
                } else {
                    inputSchema = defaultParams;
                }

                const zodSchema = this.createZodSchemaFromParameters(inputSchema);

                return {
                    name: tool.name,
                    description: tool.description || 'No description provided',
                    parameters: zodSchema,
                    serverKey: serverKey,
                    llmToolName: llmToolName,
                    inputSchema: zodSchema
                };
            });

            log.debug(`Successfully retrieved ${schemas.length} tool schemas for server: ${serverKey}`);
            return schemas;
        } catch (error) {
            log.error(`Failed to get tool schemas for server ${serverKey}:`, error);
            throw new MCPConnectionError(
                serverKey,
                `Failed to fetch tool schemas: ${(error as Error).message}`,
                error as Error
            );
        }
    }

    /**
     * List resources available on an MCP server
     * @param serverKey The key of the MCP server
     * @returns The list of resources available on the server
     * @throws MCPConnectionError if the server cannot be reached or the resources cannot be listed
     */
    async listResources(serverKey: string): Promise<Resource[]> {
        const log = logger.createLogger({ prefix: 'MCPServiceAdapter.listResources' });

        if (!this.isConnected(serverKey)) {
            throw new MCPConnectionError(serverKey, 'Not connected to server');
        }

        const client = this.sdkClients.get(serverKey)!;

        try {
            log.debug(`Listing resources on server ${serverKey}`);

            // Attempt to call client.listResources
            const { resources } = await client.listResources();

            // Map the SDK results to our interface
            return resources.map((resource: any) => ({
                uri: resource.uri,
                contentType: resource.contentType || '', // Ensure contentType is never undefined
                metadata: resource.metadata
            })) as Resource[];
        } catch (error) {
            log.debug(`Error listing resources on server ${serverKey}:`, error);

            // Handle "method not supported" errors gracefully
            if (error instanceof Error && error.message.includes('Method not found')) {
                log.debug(`listResources not supported by server ${serverKey}`);
                return [];
            }

            // Re-throw other errors
            throw new MCPConnectionError(
                serverKey,
                `Failed to list resources: ${(error instanceof Error) ? error.message : String(error)}`
            );
        }
    }

    /**
     * Reads a resource from the specified MCP server.
     * @param serverKey Unique identifier for the server
     * @param params Parameters for the resource to read
     * @param options Optional request options for timeout and cancellation
     * @returns Promise resolving to the resource result
     */
    async readResource(
        serverKey: string,
        params: ReadResourceParams,
        options?: MCPRequestOptions
    ): Promise<ReadResourceResult> {
        const log = logger.createLogger({ prefix: 'MCPServiceAdapter.readResource' });

        // Ensure we're connected to the server
        if (!this.isConnected(serverKey)) {
            throw new MCPConnectionError(serverKey, 'Not connected to server');
        }

        // Get the client
        const client = this.sdkClients.get(serverKey)!;

        log.debug(`Reading resource ${params.uri} from server ${serverKey}`);

        try {
            // Call the SDK client's readResource method
            const result = await client.readResource(params);

            // Return the result directly as it should match our ReadResourceResult type
            log.info(`Successfully read resource ${params.uri} from server ${serverKey}`);
            return result as unknown as ReadResourceResult;
        } catch (error) {
            // Handle the case where the server doesn't support reading resources
            log.warn(`Failed to read resource from server ${serverKey}: ${(error as Error).message}`);

            // Check if the error indicates the capability is not supported
            const errorMessage = (error as Error).message.toLowerCase();
            if (
                errorMessage.includes('not found') ||
                errorMessage.includes('unsupported') ||
                errorMessage.includes('not supported') ||
                errorMessage.includes('unimplemented')
            ) {
                log.info(`Server ${serverKey} does not support reading resources.`);
                // Return a special empty result that indicates the feature is not supported
                return {
                    uri: params.uri,
                    content: "",
                    _mcpMethodNotSupported: true,
                    _mcpErrorMessage: `Feature resources/read not supported by server ${serverKey}`
                } as unknown as ReadResourceResult;
            }

            // Re-throw other errors
            throw new MCPConnectionError(
                serverKey,
                `Failed to read resource: ${(error as Error).message}`,
                error as Error
            );
        }
    }

    /**
     * Lists available resource templates from the specified MCP server.
     * @param serverKey Unique identifier for the server
     * @param options Optional request options for timeout and cancellation
     * @returns Promise resolving to an array of resource templates
     */
    async listResourceTemplates(
        serverKey: string,
        options?: MCPRequestOptions
    ): Promise<ResourceTemplate[]> {
        const log = logger.createLogger({ prefix: 'MCPServiceAdapter.listResourceTemplates' });

        // Ensure we're connected to the server
        if (!this.isConnected(serverKey)) {
            throw new MCPConnectionError(serverKey, 'Not connected to server');
        }

        // Get the client
        const client = this.sdkClients.get(serverKey)!;

        log.debug(`Listing resource templates from server ${serverKey}`);

        try {
            // Call the SDK client's listResourceTemplates method
            const result = await client.listResourceTemplates();

            // The result.templates might be of unknown type, so we need to assert it
            const rawTemplates = (result.templates || []) as any[];

            // Convert the SDK response to our ResourceTemplate type
            const templates: ResourceTemplate[] = rawTemplates.map((template: any) => ({
                name: template.name,
                description: template.description,
                parameters: template.parameters as Record<string, unknown> | undefined
            }));

            log.info(`Listed ${templates.length} resource templates from server ${serverKey}`);
            return templates;
        } catch (error) {
            // Handle the case where the server doesn't support resource templates
            log.warn(`Failed to list resource templates from server ${serverKey}: ${(error as Error).message}`);

            // Check if the error indicates the capability is not supported
            const errorMessage = (error as Error).message.toLowerCase();
            if (
                errorMessage.includes('not found') ||
                errorMessage.includes('unsupported') ||
                errorMessage.includes('not supported') ||
                errorMessage.includes('unimplemented')
            ) {
                log.info(`Server ${serverKey} does not support resource templates.`);
                return []; // Return empty array for unsupported methods
            }

            // Re-throw other errors
            throw new MCPConnectionError(
                serverKey,
                `Failed to list resource templates: ${(error as Error).message}`,
                error as Error
            );
        }
    }

    /**
     * Lists available prompts from the specified MCP server.
     * @param serverKey Unique identifier for the server
     * @param options Optional request options for timeout and cancellation
     * @returns Promise resolving to an array of prompts
     */
    async listPrompts(serverKey: string, options?: MCPRequestOptions): Promise<Prompt[]> {
        const log = logger.createLogger({ prefix: 'MCPServiceAdapter.listPrompts' });

        // Ensure we're connected to the server
        if (!this.isConnected(serverKey)) {
            throw new MCPConnectionError(serverKey, 'Not connected to server');
        }

        // Get the client
        const client = this.sdkClients.get(serverKey)!;

        log.debug(`Listing prompts from server ${serverKey}`);

        try {
            // Call the SDK client's listPrompts method
            const result = await client.listPrompts();

            // Convert the SDK response to our Prompt type
            const prompts: Prompt[] = result.prompts.map((prompt: any) => ({
                name: prompt.name,
                description: prompt.description,
                parameters: prompt.parameters as Record<string, unknown> | undefined
            }));

            log.info(`Listed ${prompts.length} prompts from server ${serverKey}`);
            return prompts;
        } catch (error) {
            // Handle the case where the server doesn't support prompts
            log.warn(`Failed to list prompts from server ${serverKey}: ${(error as Error).message}`);

            // Check if the error indicates the capability is not supported
            const errorMessage = (error as Error).message.toLowerCase();
            if (
                errorMessage.includes('not found') ||
                errorMessage.includes('unsupported') ||
                errorMessage.includes('not supported') ||
                errorMessage.includes('unimplemented')
            ) {
                log.info(`Server ${serverKey} does not support prompts.`);
                return []; // Return empty array for unsupported methods
            }

            // Re-throw other errors
            throw new MCPConnectionError(
                serverKey,
                `Failed to list prompts: ${(error as Error).message}`,
                error as Error
            );
        }
    }

    /**
     * Gets a prompt from the specified MCP server.
     * @param serverKey Unique identifier for the server
     * @param params Parameters for the prompt to get
     * @param options Optional request options for timeout and cancellation
     * @returns Promise resolving to the prompt result
     */
    async getPrompt(
        serverKey: string,
        params: GetPromptParams,
        options?: MCPRequestOptions
    ): Promise<GetPromptResult> {
        const log = logger.createLogger({ prefix: 'MCPServiceAdapter.getPrompt' });

        // Ensure we're connected to the server
        if (!this.isConnected(serverKey)) {
            throw new MCPConnectionError(serverKey, 'Not connected to server');
        }

        // Get the client
        const client = this.sdkClients.get(serverKey)!;

        log.debug(`Getting prompt ${params.name} from server ${serverKey}`, {
            hasArgs: !!params.arguments
        });

        try {
            // Call the SDK client's getPrompt method
            const result = await client.getPrompt({
                name: params.name,
                arguments: params.arguments as Record<string, string> | undefined
            });

            // Return the result directly as it should match our GetPromptResult type
            log.info(`Successfully got prompt ${params.name} from server ${serverKey}`);
            return result as unknown as GetPromptResult;
        } catch (error) {
            // Handle the case where the server doesn't support getting prompts
            log.warn(`Failed to get prompt from server ${serverKey}: ${(error as Error).message}`);

            // Check if the error indicates the capability is not supported
            const errorMessage = (error as Error).message.toLowerCase();
            if (
                errorMessage.includes('not found') ||
                errorMessage.includes('unsupported') ||
                errorMessage.includes('not supported') ||
                errorMessage.includes('unimplemented')
            ) {
                log.info(`Server ${serverKey} does not support getting prompts.`);
                // Return a special empty result that indicates the feature is not supported
                return {
                    content: "",
                    _mcpMethodNotSupported: true,
                    _mcpErrorMessage: `Feature prompts/get not supported by server ${serverKey}`
                } as unknown as GetPromptResult;
            }

            // Re-throw other errors
            throw new MCPConnectionError(
                serverKey,
                `Failed to get prompt: ${(error as Error).message}`,
                error as Error
            );
        }
    }

    /**
     * Determines the transport type from the configuration if not explicitly specified.
     * @param config MCP server configuration
     * @returns Determined transport type
     */
    private determineTransportType(config: MCPServerConfig): 'stdio' | 'http' | 'custom' {
        if (config.command) {
            return 'stdio';
        }

        if (config.url) {
            return 'http';
        }

        if (config.pluginPath) {
            return 'custom';
        }

        throw new Error('Cannot determine transport type. Please specify command, url, pluginPath, or type explicitly.');
    }
} 