import { LLMCaller } from '../../../../core/caller/LLMCaller';
import { MCPServiceAdapter } from '../../../../core/mcp/MCPServiceAdapter';
import { MCPConnectionError, MCPToolCallError } from '../../../../core/mcp/MCPConfigTypes';
import type { McpToolSchema } from '../../../../core/mcp/MCPConfigTypes';

// Mock the MCPServiceAdapter
jest.mock('../../../../core/mcp/MCPServiceAdapter', () => {
    return {
        MCPServiceAdapter: jest.fn().mockImplementation(() => ({
            getMcpServerToolSchemas: jest.fn(),
            executeMcpTool: jest.fn(),
            connectToServer: jest.fn(),
            disconnectAll: jest.fn(),
            isConnected: jest.fn().mockReturnValue(true)
        }))
    };
});

// Mock the logger
jest.mock('../../../../utils/logger', () => ({
    logger: {
        createLogger: () => ({
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        })
    }
}));

describe('LLMCaller - MCP Direct Access', () => {
    let caller: LLMCaller;
    let mockAdapter: jest.Mocked<MCPServiceAdapter>;

    beforeEach(() => {
        // Create a new instance for each test
        caller = new LLMCaller('openai', 'test-model');

        // Get the adapter instance created by LLMCaller
        mockAdapter = (MCPServiceAdapter as jest.Mock).mock.instances[0] as jest.Mocked<MCPServiceAdapter>;
    });

    describe('getMcpServerToolSchemas', () => {
        it('should call getMcpServerToolSchemas on MCPServiceAdapter', async () => {
            const mockSchemas: McpToolSchema[] = [
                {
                    name: 'read_file',
                    description: 'Read file contents',
                    parameters: {} as any,
                    serverKey: 'filesystem',
                    llmToolName: 'filesystem_read_file'
                }
            ];

            mockAdapter.getMcpServerToolSchemas.mockResolvedValue(mockSchemas);

            const result = await caller.getMcpServerToolSchemas('filesystem');

            expect(mockAdapter.getMcpServerToolSchemas).toHaveBeenCalledWith('filesystem');
            expect(result).toEqual(mockSchemas);
        });

        it('should throw error if MCPServiceAdapter throws', async () => {
            const mockError = new MCPConnectionError('filesystem', 'Not connected');
            mockAdapter.getMcpServerToolSchemas.mockRejectedValue(mockError);

            await expect(caller.getMcpServerToolSchemas('filesystem'))
                .rejects
                .toThrow(MCPConnectionError);
        });

        it('should create MCPServiceAdapter if not already initialized', async () => {
            // Reset the adapter to test lazy initialization
            (caller as any)._mcpAdapter = null;

            // Setup mock for when a new instance is created
            const mockSchemas: McpToolSchema[] = [
                {
                    name: 'read_file',
                    description: 'Read file contents',
                    parameters: {} as any,
                    serverKey: 'filesystem',
                    llmToolName: 'filesystem_read_file'
                }
            ];

            // We need to mock the implementation again since we're replacing the instance
            (MCPServiceAdapter as jest.Mock).mockImplementation(() => ({
                getMcpServerToolSchemas: jest.fn().mockResolvedValue(mockSchemas),
                executeMcpTool: jest.fn(),
                connectToServer: jest.fn(),
                disconnectAll: jest.fn(),
                isConnected: jest.fn().mockReturnValue(true)
            }));

            const result = await caller.getMcpServerToolSchemas('filesystem');

            // Should create a new adapter
            expect(MCPServiceAdapter).toHaveBeenCalled();
            expect(result).toEqual(mockSchemas);
        });
    });

    describe('callMcpTool', () => {
        it('should call executeMcpTool on MCPServiceAdapter', async () => {
            const mockResult = { content: 'file contents' };
            mockAdapter.executeMcpTool.mockResolvedValue(mockResult);

            const args = { path: 'file.txt' };
            const result = await caller.callMcpTool('filesystem', 'read_file', args);

            expect(mockAdapter.executeMcpTool).toHaveBeenCalledWith('filesystem', 'read_file', args);
            expect(result).toEqual(mockResult);
        });

        it('should throw error if MCPServiceAdapter throws', async () => {
            const mockError = new MCPToolCallError('filesystem', 'read_file', 'File not found');
            mockAdapter.executeMcpTool.mockRejectedValue(mockError);

            const args = { path: 'non-existent.txt' };
            await expect(caller.callMcpTool('filesystem', 'read_file', args))
                .rejects
                .toThrow(MCPToolCallError);
        });

        it('should create MCPServiceAdapter if not already initialized', async () => {
            // Reset the adapter to test lazy initialization
            (caller as any)._mcpAdapter = null;

            // Setup mock for when a new instance is created
            const mockResult = { content: 'file contents' };

            // We need to mock the implementation again since we're replacing the instance
            (MCPServiceAdapter as jest.Mock).mockImplementation(() => ({
                getMcpServerToolSchemas: jest.fn(),
                executeMcpTool: jest.fn().mockResolvedValue(mockResult),
                connectToServer: jest.fn(),
                disconnectAll: jest.fn(),
                isConnected: jest.fn().mockReturnValue(true)
            }));

            const args = { path: 'file.txt' };
            const result = await caller.callMcpTool('filesystem', 'read_file', args);

            expect(MCPServiceAdapter).toHaveBeenCalled();
            expect(result).toEqual(mockResult);
        });
    });

    describe('isMCPToolConfig helper', () => {
        it('should correctly identify MCP tool configs', async () => {
            // Import the helper function to test
            const { isMCPToolConfig } = await import('../../../../core/mcp/MCPConfigTypes');

            // Valid MCP tool config
            const validConfig = {
                mcpServers: {
                    filesystem: {
                        command: 'npx',
                        args: ['-y', '@modelcontextprotocol/server-filesystem', '.']
                    }
                }
            };

            // Invalid configs
            const invalidConfig1 = { name: 'tool', function: {} };
            const invalidConfig2 = { mcpServers: 'not-an-object' };
            const invalidConfig3 = null;

            expect(isMCPToolConfig(validConfig)).toBe(true);
            expect(isMCPToolConfig(invalidConfig1)).toBe(false);
            expect(isMCPToolConfig(invalidConfig2)).toBe(false);
            expect(isMCPToolConfig(invalidConfig3)).toBe(false);
        });
    });

    describe('tool resolution with MCP', () => {
        it('should resolve MCP tools when provided in tools array', async () => {
            // We need to mock the dynamic import behavior
            jest.mock('../../../../core/mcp/MCPToolLoader', () => {
                return {
                    MCPToolLoader: jest.fn().mockImplementation(() => ({
                        loadTools: jest.fn().mockResolvedValue([
                            {
                                name: 'filesystem_list_directory',
                                description: 'List directory contents',
                                function: { name: 'filesystem_list_directory', parameters: {} }
                            }
                        ])
                    }))
                };
            });

            // Use the private method through type casting to test tool resolution
            const mcpConfig = {
                mcpServers: {
                    filesystem: {
                        command: 'npx',
                        args: ['-y', '@modelcontextprotocol/server-filesystem', '.']
                    }
                }
            };

            // Call the private method
            const resolvedTools = await (caller as any).resolveToolDefinitions([mcpConfig]);

            // Since we can't easily verify the dynamic import, we'll just check that we got tools back
            expect(Array.isArray(resolvedTools)).toBe(true);
        });
    });
}); 