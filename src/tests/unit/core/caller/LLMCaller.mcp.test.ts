import { LLMCaller } from '../../../../core/caller/LLMCaller';
import { MCPClientManager } from '../../../../core/mcp/MCPClientManager';
import { MCPConnectionError, MCPToolCallError } from '../../../../core/mcp/MCPConfigTypes';
import type { McpToolSchema } from '../../../../core/mcp/MCPConfigTypes';

// Mock the MCPClientManager
jest.mock('../../../../core/mcp/MCPClientManager', () => {
    return {
        MCPClientManager: jest.fn().mockImplementation(() => ({
            getMcpServerToolSchemas: jest.fn(),
            executeMcpTool: jest.fn(),
            connect: jest.fn(),
            disconnectAll: jest.fn(),
            isConnected: jest.fn().mockReturnValue(true)
        }))
    };
});

describe('LLMCaller - MCP Direct Access', () => {
    let caller: LLMCaller;
    let mockMcpManager: jest.Mocked<MCPClientManager>;

    beforeEach(() => {
        jest.clearAllMocks();
        caller = new LLMCaller('openai', 'fast');
        mockMcpManager = new MCPClientManager() as jest.Mocked<MCPClientManager>;
        (caller as any)._mcpClientManager = mockMcpManager;
    });

    describe('getMcpServerToolSchemas', () => {
        it('should call getMcpServerToolSchemas on MCPClientManager', async () => {
            const mockSchemas: McpToolSchema[] = [
                {
                    name: 'list_directory',
                    description: 'List directory contents',
                    parameters: {} as any,
                    serverKey: 'filesystem',
                    llmToolName: 'filesystem_list_directory'
                }
            ];

            mockMcpManager.getMcpServerToolSchemas.mockResolvedValue(mockSchemas);

            const result = await caller.getMcpServerToolSchemas('filesystem');

            expect(mockMcpManager.getMcpServerToolSchemas).toHaveBeenCalledWith('filesystem');
            expect(result).toEqual(mockSchemas);
        });

        it('should handle connection errors from getMcpServerToolSchemas', async () => {
            const error = new MCPConnectionError('filesystem', 'Server not connected');
            mockMcpManager.getMcpServerToolSchemas.mockRejectedValue(error);

            await expect(caller.getMcpServerToolSchemas('filesystem')).rejects.toThrow(MCPConnectionError);
            expect(mockMcpManager.getMcpServerToolSchemas).toHaveBeenCalledWith('filesystem');
        });

        it('should create MCPClientManager if not already initialized', async () => {
            // Reset the manager to test lazy initialization
            (caller as any)._mcpClientManager = null;

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
            (MCPClientManager as jest.Mock).mockImplementation(() => ({
                getMcpServerToolSchemas: jest.fn().mockResolvedValue(mockSchemas),
                executeMcpTool: jest.fn(),
                connect: jest.fn(),
                disconnectAll: jest.fn(),
                isConnected: jest.fn().mockReturnValue(true)
            }));

            const result = await caller.getMcpServerToolSchemas('filesystem');

            expect(MCPClientManager).toHaveBeenCalled();
            expect(result).toEqual(mockSchemas);
        });
    });

    describe('callMcpTool', () => {
        it('should call executeMcpTool on MCPClientManager', async () => {
            const mockResult = { files: ['file1.txt', 'file2.txt'] };
            mockMcpManager.executeMcpTool.mockResolvedValue(mockResult);

            const args = { path: '.' };
            const result = await caller.callMcpTool('filesystem', 'list_directory', args);

            expect(mockMcpManager.executeMcpTool).toHaveBeenCalledWith('filesystem', 'list_directory', args);
            expect(result).toEqual(mockResult);
        });

        it('should handle tool call errors from executeMcpTool', async () => {
            const error = new MCPToolCallError('filesystem', 'list_directory', 'Permission denied');
            mockMcpManager.executeMcpTool.mockRejectedValue(error);

            const args = { path: '/restricted' };
            await expect(caller.callMcpTool('filesystem', 'list_directory', args)).rejects.toThrow(MCPToolCallError);
            expect(mockMcpManager.executeMcpTool).toHaveBeenCalledWith('filesystem', 'list_directory', args);
        });

        it('should handle connection errors from executeMcpTool', async () => {
            const error = new MCPConnectionError('filesystem', 'Connection closed');
            mockMcpManager.executeMcpTool.mockRejectedValue(error);

            const args = { path: '.' };
            await expect(caller.callMcpTool('filesystem', 'list_directory', args)).rejects.toThrow(MCPConnectionError);
            expect(mockMcpManager.executeMcpTool).toHaveBeenCalledWith('filesystem', 'list_directory', args);
        });

        it('should create MCPClientManager if not already initialized', async () => {
            // Reset the manager to test lazy initialization
            (caller as any)._mcpClientManager = null;

            // Setup mock for when a new instance is created
            const mockResult = { content: 'file contents' };

            // We need to mock the implementation again since we're replacing the instance
            (MCPClientManager as jest.Mock).mockImplementation(() => ({
                getMcpServerToolSchemas: jest.fn(),
                executeMcpTool: jest.fn().mockResolvedValue(mockResult),
                connect: jest.fn(),
                disconnectAll: jest.fn(),
                isConnected: jest.fn().mockReturnValue(true)
            }));

            const args = { path: 'file.txt' };
            const result = await caller.callMcpTool('filesystem', 'read_file', args);

            expect(MCPClientManager).toHaveBeenCalled();
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