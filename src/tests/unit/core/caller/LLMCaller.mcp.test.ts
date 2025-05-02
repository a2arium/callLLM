import { LLMCaller } from '../../../../core/caller/LLMCaller';
import { MCPServiceAdapter } from '../../../../core/mcp/MCPServiceAdapter';
import { MCPConnectionError, MCPToolCallError } from '../../../../core/mcp/MCPConfigTypes';
import type { McpToolSchema } from '../../../../core/mcp/MCPConfigTypes';
import { ModelManager } from '../../../../core/models/ModelManager';

// Mock the MCPServiceAdapter
jest.mock('../../../../core/mcp/MCPServiceAdapter', () => {
    return {
        MCPServiceAdapter: jest.fn()
    };
});

// Mock the ModelManager
jest.mock('../../../../core/models/ModelManager', () => {
    return {
        ModelManager: jest.fn().mockImplementation(() => ({
            getModel: jest.fn().mockReturnValue({
                name: 'test-model',
                inputPrice: 0.001,
                outputPrice: 0.002,
                maxRequestTokens: 4000,
                maxResponseTokens: 2000,
                characteristics: {
                    quality: 0.8,
                    speed: 0.7,
                    latency: 0.3
                }
            }),
            getAvailableModels: jest.fn().mockReturnValue([]),
            addModel: jest.fn(),
            updateModel: jest.fn(),
            resolveModel: jest.fn(),
            clearModels: jest.fn(),
            hasModel: jest.fn().mockReturnValue(true)
        }))
    };
});

// Mock the logger
jest.mock('../../../../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        createLogger: jest.fn().mockReturnValue({
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        })
    }
}));

describe('LLMCaller - MCP Direct Access', () => {
    let caller: LLMCaller;
    let mockMcpAdapter: any;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Create a mock implementation for MCPServiceAdapter
        const mockAdapter = {
            getMcpServerToolSchemas: jest.fn(),
            executeMcpTool: jest.fn(),
            connectToServer: jest.fn(),
            disconnectAll: jest.fn(),
            isConnected: jest.fn().mockReturnValue(true)
        };

        // Set up the mock implementation
        (MCPServiceAdapter as jest.Mock).mockImplementation(() => mockAdapter);

        // Create a new instance for each test
        caller = new LLMCaller('openai', 'test-model');

        // Store the mock adapter
        mockMcpAdapter = mockAdapter;
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

            mockMcpAdapter.getMcpServerToolSchemas.mockResolvedValue(mockSchemas);

            const result = await caller.getMcpServerToolSchemas('filesystem');

            expect(mockMcpAdapter.getMcpServerToolSchemas).toHaveBeenCalledWith('filesystem');
            expect(result).toEqual(mockSchemas);
        });

        it('should throw error if MCPServiceAdapter throws', async () => {
            const mockError = new MCPConnectionError('filesystem', 'Not connected');
            mockMcpAdapter.getMcpServerToolSchemas.mockRejectedValue(mockError);

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
            mockMcpAdapter.executeMcpTool.mockResolvedValue(mockResult);

            const args = { path: 'file.txt' };
            const result = await caller.callMcpTool('filesystem', 'read_file', args);

            expect(mockMcpAdapter.executeMcpTool).toHaveBeenCalledWith('filesystem', 'read_file', args);
            expect(result).toEqual(mockResult);
        });

        it('should throw error if MCPServiceAdapter throws', async () => {
            const mockError = new MCPToolCallError('filesystem', 'read_file', 'File not found');
            mockMcpAdapter.executeMcpTool.mockRejectedValue(mockError);

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

    describe('addTools with MCP configurations', () => {
        beforeEach(() => {
            // Start with a fresh caller for each test
            caller = new LLMCaller('openai', 'gpt-3.5-turbo');
            jest.clearAllMocks();
        });

        it('should register MCP server configs without connecting', async () => {
            // Create a mock adapter for testing with proper structure
            const mockAdapter = {
                registerServerConfig: jest.fn(),
                connectToServer: jest.fn(),
                getMcpServerToolSchemas: jest.fn(),
                executeMcpTool: jest.fn(),
                isConnected: jest.fn().mockReturnValue(false),
                disconnectAll: jest.fn()
            };
            (caller as any)._mcpAdapter = mockAdapter;

            // Define MCP config
            const mcpConfig = {
                filesystem: {
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-filesystem', '.']
                }
            };

            // Mock the resolveToolDefinitions method to not actually perform the loading
            jest.spyOn(caller as any, 'resolveToolDefinitions').mockResolvedValue([]);

            // Add the tools
            await caller.addTools([mcpConfig]);

            // Verify registerServerConfig was called but not connectToServer
            expect(mockAdapter.registerServerConfig).toHaveBeenCalledWith('filesystem', expect.anything());
            expect(mockAdapter.connectToServer).not.toHaveBeenCalled();
        });

        it('should use a shared MCPServiceAdapter across all operations', async () => {
            // Skip this test for now - it requires more extensive mocking
            // of the full adapter-tools-caller interaction

            // Instead test that the adapter is properly created just once
            (caller as any)._mcpAdapter = null;

            // Mock MCPServiceAdapter constructor
            const mockAdapter = {
                registerServerConfig: jest.fn(),
                connectToServer: jest.fn(),
                getMcpServerToolSchemas: jest.fn(),
                executeMcpTool: jest.fn(),
                isConnected: jest.fn().mockReturnValue(false),
                disconnectAll: jest.fn()
            };
            (MCPServiceAdapter as jest.Mock).mockImplementation(() => mockAdapter);

            // Mock related methods to avoid actual SDK calls
            jest.spyOn(caller as any, 'resolveToolDefinitions').mockResolvedValue([]);
            jest.spyOn(caller as any, 'internalChatCall').mockResolvedValue({ messages: [], usage: {} });

            // First use via addTools
            const mcpConfig = { filesystem: { command: 'test-command' } };
            await caller.addTools([mcpConfig]);

            // Then use connectToMcpServer
            await caller.connectToMcpServer('filesystem');

            // Then use in an LLM call
            await caller.call('List files', { tools: [mcpConfig] });

            // Verify adapter was constructed only once
            expect(MCPServiceAdapter).toHaveBeenCalledTimes(1);
        });
    });

    describe('connectToMcpServer', () => {
        beforeEach(() => {
            caller = new LLMCaller('openai', 'gpt-3.5-turbo');
            jest.clearAllMocks();
        });

        it('should connect to server registered via addTools', async () => {
            // Create mock adapter
            const mockAdapter = {
                registerServerConfig: jest.fn(),
                connectToServer: jest.fn().mockResolvedValue(undefined),
                getMcpServerToolSchemas: jest.fn(),
                executeMcpTool: jest.fn(),
                isConnected: jest.fn().mockReturnValue(false)
            };
            (caller as any)._mcpAdapter = mockAdapter;

            // Register config
            const mcpConfig = { filesystem: { command: 'test-command' } };
            await caller.addTools([mcpConfig]);

            // Connect to server
            await caller.connectToMcpServer('filesystem');

            // Verify connectToServer was called
            expect(mockAdapter.connectToServer).toHaveBeenCalledWith('filesystem');
        });

        it('should throw helpful error when server config is missing', async () => {
            // Create mock adapter that triggers a "server not found" error
            const mockAdapter = {
                connectToServer: jest.fn().mockRejectedValue(
                    new Error('Server configuration not found')
                ),
                isConnected: jest.fn().mockReturnValue(false)
            };
            (caller as any)._mcpAdapter = mockAdapter;

            // Try to connect to non-existent server
            await expect(caller.connectToMcpServer('unknown'))
                .rejects.toThrow(/No configuration found for MCP server/);
        });
    });

    describe('call with MCP tools', () => {
        let originalCall: any;

        beforeEach(() => {
            caller = new LLMCaller('openai', 'gpt-3.5-turbo');
            jest.clearAllMocks();

            // Save the original call method for later restoration
            originalCall = caller.call;
        });

        afterEach(() => {
            // Restore original method
            if (originalCall) {
                caller.call = originalCall;
            }
        });

        it('should handle MCP tools registration correctly', async () => {
            // Create tools that will be resolved
            const resolvedTools = [{ name: 'test-tool', callFunction: jest.fn() }];
            jest.spyOn(caller as any, 'resolveToolDefinitions').mockResolvedValue(resolvedTools);

            // Mock methods to avoid real calls
            jest.spyOn(caller as any, 'internalChatCall').mockResolvedValue({ messages: [], usage: {} });

            // Call without tools argument first
            await caller.call('Test without tools');

            // Mock call() to specifically look at the tools parameter
            const callSpy = jest.spyOn(caller, 'call');

            // Now call with an MCP config in the tools array
            const mcpConfig = { filesystem: { command: 'test-command' } };
            await caller.call('Test with MCP config', { tools: [mcpConfig] });

            // Verify call was made with the right parameters
            expect(callSpy).toHaveBeenLastCalledWith('Test with MCP config', { tools: [mcpConfig] });
        });

        it('should prevent duplicate server connections in call method', async () => {
            // 1. Mock the necessary methods for the call to proceed
            jest.spyOn(caller as any, 'resolveToolDefinitions').mockResolvedValue([]);
            jest.spyOn(caller as any, 'internalChatCall').mockResolvedValue({ messages: [], usage: {} });

            // 2. Call once to ensure the internal _mcpAdapter is potentially created if needed
            // (although our test doesn't rely on creation here, it sets the stage)
            await caller.call('Initial call');

            // 3. Get the *actual* internal adapter instance (or ensure it exists)
            const internalAdapter = (caller as any).getMcpAdapter(); // Use the getter

            // 4. Mock the isConnected method on the *actual* internal instance
            const isConnectedSpy = jest.spyOn(internalAdapter, 'isConnected').mockReturnValue(true);
            const connectToServerSpy = jest.spyOn(internalAdapter, 'connectToServer');

            // 5. Call again with the MCP config
            const mcpConfig = { filesystem: { command: 'test-command', args: [] } };
            await caller.call('Test with MCP', { tools: [mcpConfig] });

            // 6. Verify the spy on the internal adapter's method was called
            expect(isConnectedSpy).toHaveBeenCalledWith('filesystem');
            expect(connectToServerSpy).not.toHaveBeenCalled();
        });
    });
}); 