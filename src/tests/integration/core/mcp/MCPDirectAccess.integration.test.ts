import { LLMCaller } from '../../../../core/caller/LLMCaller';
import { MCPClientManager } from '../../../../core/mcp/MCPClientManager';
import { MCPTransportFactory } from '../../../../core/mcp/MCPTransportFactory';
import {
    MCPConnectionError,
    MCPToolCallError,
    MCPToolConfig,
    MCPServerConfig,
    MCPServersMap
} from '../../../../core/mcp/MCPConfigTypes';
import type { IMCPClientManager } from '../../../../core/mcp/IMCPClientManager';
import type { McpToolSchema } from '../../../../core/mcp/MCPConfigTypes';
import type { FinishReason } from '../../../../interfaces/UniversalInterfaces';

type SimplifiedToolSchema = {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: Record<string, unknown>;
        required: string[];
    };
    llmToolName: string;
    serverKey: string;
};

// Create a map to track connected servers
const connectedServers = new Map<string, { connected: boolean; config: MCPServerConfig }>();

// Mock the MCPClientManager
jest.mock('../../../../core/mcp/MCPClientManager', () => {
    return {
        MCPClientManager: class {
            async connect(serverKey: string, config: MCPServerConfig): Promise<void> {
                // Store the connection state
                connectedServers.set(serverKey, {
                    connected: true,
                    config
                });
                return Promise.resolve();
            }

            async disconnect(serverKey: string): Promise<void> {
                connectedServers.delete(serverKey);
                return Promise.resolve();
            }

            isConnected(serverKey: string): boolean {
                return connectedServers.has(serverKey) && connectedServers.get(serverKey)!.connected;
            }

            async getMcpServerToolSchemas(serverKey: string): Promise<SimplifiedToolSchema[]> {
                if (!this.isConnected(serverKey)) {
                    throw new MCPConnectionError(serverKey, 'Server not connected. Cannot fetch schemas.');
                }

                // Return mock schemas with llmToolName included
                return Promise.resolve([
                    {
                        name: 'list_directory',
                        description: 'List contents of a directory',
                        parameters: {
                            type: 'object',
                            properties: {
                                path: {
                                    type: 'string',
                                    description: 'The directory path'
                                }
                            },
                            required: ['path']
                        },
                        llmToolName: 'filesystem_list_directory',
                        serverKey: 'filesystem'
                    },
                    {
                        name: 'read_file',
                        description: 'Read the contents of a file',
                        parameters: {
                            type: 'object',
                            properties: {
                                path: {
                                    type: 'string',
                                    description: 'The file path'
                                }
                            },
                            required: ['path']
                        },
                        llmToolName: 'filesystem_read_file',
                        serverKey: 'filesystem'
                    }
                ]);
            }

            async executeMcpTool(serverKey: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
                if (!this.isConnected(serverKey)) {
                    throw new MCPToolCallError(serverKey, toolName, 'Not connected to server');
                }

                if (toolName === 'list_directory') {
                    return Promise.resolve({
                        items: [
                            { name: 'file1.txt', type: 'file' },
                            { name: 'file2.txt', type: 'file' },
                            { name: 'subdir', type: 'directory' }
                        ]
                    });
                } else if (toolName === 'read_file') {
                    if (args.path === 'error.txt') {
                        throw new MCPToolCallError(serverKey, toolName, 'File not found');
                    }
                    return Promise.resolve({
                        content: [
                            { type: 'text', text: 'File content mock' }
                        ]
                    });
                } else {
                    throw new MCPToolCallError(serverKey, toolName, `Tool not found: ${toolName}`);
                }
            }
        }
    };
});

// Mock the MCPTransportFactory to bypass actual server connections
jest.mock('../../../../core/mcp/MCPTransportFactory');

// Mock MCPToolLoader for the MCP integration test
jest.mock('../../../../core/mcp/MCPToolLoader', () => {
    return {
        MCPToolLoader: class {
            async loadTools() {
                return [
                    {
                        name: 'filesystem_list_directory',
                        description: 'List directory contents',
                        function: {
                            name: 'filesystem_list_directory',
                            parameters: {
                                type: 'object',
                                properties: {
                                    path: { type: 'string' }
                                },
                                required: ['path']
                            }
                        }
                    }
                ];
            }
        }
    };
});

describe('MCP Direct Access Integration', () => {
    let caller: LLMCaller;
    let mcpManager: MCPClientManager;

    beforeEach(() => {
        jest.clearAllMocks();
        connectedServers.clear();

        caller = new LLMCaller('openai', 'fast');
        mcpManager = new MCPClientManager();
        (caller as any)._mcpClientManager = mcpManager;
    });

    describe('getMcpServerToolSchemas', () => {
        it('should fetch and return tool schemas from an MCP server', async () => {
            // First connect to the server
            await mcpManager.connect('filesystem', {
                command: 'mock-command',
                args: []
            });

            // Get the tool schemas
            const schemas = await caller.getMcpServerToolSchemas('filesystem');

            // Verify we got the expected schemas
            expect(schemas).toHaveLength(2);
            expect(schemas[0].name).toBe('list_directory');
            expect(schemas[1].name).toBe('read_file');
        });

        it('should throw an error when server is not connected', async () => {
            // Try to get schemas without connecting first
            await expect(caller.getMcpServerToolSchemas('non_existent_server'))
                .rejects.toThrow(MCPConnectionError);
        });
    });

    describe('callMcpTool', () => {
        beforeEach(async () => {
            // Connect to the filesystem server before each test
            await mcpManager.connect('filesystem', {
                command: 'mock-command',
                args: []
            });
        });

        it('should call list_directory and return results', async () => {
            const result = await caller.callMcpTool('filesystem', 'list_directory', { path: '.' });

            expect(result).toEqual({
                items: [
                    { name: 'file1.txt', type: 'file' },
                    { name: 'file2.txt', type: 'file' },
                    { name: 'subdir', type: 'directory' }
                ]
            });
        });

        it('should call read_file and return contents', async () => {
            const result = await caller.callMcpTool('filesystem', 'read_file', { path: 'sample.txt' });

            expect(result).toEqual({
                content: [
                    { type: 'text', text: 'File content mock' }
                ]
            });
        });

        it('should throw an error for unknown tools', async () => {
            await expect(caller.callMcpTool('filesystem', 'unknown_tool', { path: '.' }))
                .rejects.toThrow(MCPToolCallError);
        });

        it('should throw an error when tool execution fails', async () => {
            await expect(caller.callMcpTool('filesystem', 'read_file', { path: 'error.txt' }))
                .rejects.toThrow(MCPToolCallError);
        });
    });

    describe('LLMCaller with MCP tools', () => {
        // Test for proper integration with ToolsManager
        it('should handle MCP tool config in call method', async () => {
            // Create an MCP config
            const mcpConfig = {
                mcpServers: {
                    filesystem: {
                        command: 'mock-command',
                        args: []
                    }
                } as MCPServersMap
            };

            // Create a mock for resolveToolDefinitions
            const resolveToolSpy = jest.fn().mockResolvedValue([]);

            // Replace the method with our spy
            const originalResolveToolDefinitions = (caller as any).resolveToolDefinitions;
            (caller as any).resolveToolDefinitions = resolveToolSpy;

            // Mock the chat controller for this test to prevent actual API calls
            const mockChatController = {
                execute: jest.fn().mockResolvedValue({
                    role: 'assistant',
                    content: 'Test response',
                    metadata: {
                        finishReason: 'complete' as FinishReason
                    }
                })
            };
            (caller as any).chatController = mockChatController;

            try {
                // Call with the MCP config
                await caller.call('Test prompt', {
                    tools: [mcpConfig]
                });

                // Verify the resolveToolDefinitions was called with the proper arguments
                expect(resolveToolSpy).toHaveBeenCalledWith(
                    [mcpConfig],
                    undefined
                );
            } finally {
                // Restore the original method
                (caller as any).resolveToolDefinitions = originalResolveToolDefinitions;
            }
        });
    });
}); 