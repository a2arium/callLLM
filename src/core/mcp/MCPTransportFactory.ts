/**
 * Factory for creating MCP transports based on configuration.
 */

import type { MCPServerConfig, MCPTransportType } from './MCPConfigTypes';
import { MCPConnectionError } from './MCPConfigTypes';
import { spawn } from 'child_process';

/**
 * Transport interface from the MCP SDK.
 * This is simplified for our local type checks since we're not importing the actual SDK types.
 */
export interface Transport {
    start(): Promise<void>;
    send(message: any): Promise<void>;
    close(): Promise<void>;
    onmessage?: (message: any) => void;
    onclose?: () => void;
    onerror?: (error: Error) => void;
}

/**
 * Factory for creating MCP transport instances based on configuration.
 */
export class MCPTransportFactory {
    /**
     * Infers the transport type from the configuration if not explicitly specified.
     * @param config MCP server configuration
     * @returns Inferred transport type
     */
    static inferTransportType(config: MCPServerConfig): MCPTransportType {
        if (config.type) {
            return config.type;
        }

        if (config.command) {
            return 'stdio';
        }

        if (config.url) {
            return 'http';
        }

        throw new MCPConnectionError('unknown', 'Cannot infer transport type. Please specify command, url, or type explicitly.');
    }

    /**
     * Creates a transport instance based on the provided configuration.
     * @param serverKey Unique identifier for the server
     * @param config MCP server configuration
     * @returns Promise resolving to a transport instance
     */
    static async createTransport(serverKey: string, config: MCPServerConfig): Promise<Transport> {
        // Determine the transport type
        const transportType = this.inferTransportType(config);

        switch (transportType) {
            case 'stdio':
                return this.createStdioTransport(serverKey, config);
            case 'http':
                return this.createHttpTransport(serverKey, config);
            case 'custom':
                return this.createCustomTransport(serverKey, config);
            default:
                throw new MCPConnectionError(serverKey, `Unsupported transport type: ${transportType}`);
        }
    }

    /**
     * Creates a stdio transport using the command and args from the configuration.
     * @param serverKey Unique identifier for the server
     * @param config MCP server configuration
     * @returns Promise resolving to a stdio transport instance
     */
    private static async createStdioTransport(serverKey: string, config: MCPServerConfig): Promise<Transport> {
        try {
            // Validate required configuration
            if (!config.command) {
                throw new MCPConnectionError(serverKey, 'Command is required for stdio transport');
            }

            // Process environment variables
            const envVars = { ...process.env };
            if (config.env) {
                for (const [key, value] of Object.entries(config.env)) {
                    // Process template strings like ${ENV_VAR}
                    const processedValue = value.replace(/\${([^}]+)}/g, (match, envVar) => {
                        return process.env[envVar] || '';
                    });
                    envVars[key] = processedValue;
                }
            }

            // Spawn the process
            const childProcess = spawn(config.command, config.args || [], {
                env: envVars,
                stdio: ['pipe', 'pipe', 'pipe'] // stdin, stdout, stderr
            });

            // Utility to parse line-delimited JSON-RPC from stdout
            const rl = require('readline').createInterface({ input: childProcess.stdout });
            const transportCallbacks: { onmessage?: (m: any) => void; onclose?: () => void; onerror?: (e: Error) => void } = {};

            rl.on('line', (line: string) => {
                try {
                    const msg = JSON.parse(line);
                    transportCallbacks.onmessage?.(msg);
                } catch (_) {
                    // ignore non-JSON lines
                }
            });

            childProcess.on('close', () => transportCallbacks.onclose?.());
            childProcess.on('error', (err) => transportCallbacks.onerror?.(err));

            return {
                async start() {
                    // This would initialize the transport
                },
                async send(message: any) {
                    // This would send a message to the process's stdin
                    if (childProcess.stdin.writable) {
                        childProcess.stdin.write(JSON.stringify(message) + '\n');
                    }
                },
                async close() {
                    // This would cleanly shut down the transport
                    childProcess.kill();
                },
                set onmessage(cb: (m: any) => void) { transportCallbacks.onmessage = cb; },
                set onclose(cb: () => void) { transportCallbacks.onclose = cb; },
                set onerror(cb: (e: Error) => void) { transportCallbacks.onerror = cb; }
            };
        } catch (error) {
            throw new MCPConnectionError(serverKey, 'Failed to create stdio transport', error as Error);
        }
    }

    /**
     * Creates an HTTP transport using the URL and mode from the configuration.
     * @param serverKey Unique identifier for the server
     * @param config MCP server configuration
     * @returns Promise resolving to an HTTP transport instance
     */
    private static async createHttpTransport(serverKey: string, config: MCPServerConfig): Promise<Transport> {
        try {
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

            // We'll return a placeholder for now - in a real implementation,
            // this would be an instance of HttpClientTransport from the SDK
            return {
                async start() {
                    // This would initialize the transport
                },
                async send(message: any) {
                    // This would send a message via HTTP POST
                },
                async close() {
                    // This would cleanly shut down the transport
                }
            };
        } catch (error) {
            throw new MCPConnectionError(serverKey, 'Failed to create HTTP transport', error as Error);
        }
    }

    /**
     * Creates a custom transport using the pluginPath from the configuration.
     * @param serverKey Unique identifier for the server
     * @param config MCP server configuration
     * @returns Promise resolving to a custom transport instance
     */
    private static async createCustomTransport(serverKey: string, config: MCPServerConfig): Promise<Transport> {
        try {
            // Validate required configuration
            if (!config.pluginPath) {
                throw new MCPConnectionError(serverKey, 'Plugin path is required for custom transport');
            }

            throw new MCPConnectionError(serverKey, 'Custom transports are not yet supported');
        } catch (error) {
            throw new MCPConnectionError(serverKey, 'Failed to create custom transport', error as Error);
        }
    }
} 