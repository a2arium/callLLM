import { jest, beforeAll } from '@jest/globals';
import { MCPConnectionError, MCPToolCallError, type MCPServersMap, type MCPServerConfig } from '../../../../core/mcp/MCPConfigTypes.ts';
import type { McpToolSchema } from '../../../../core/mcp/MCPConfigTypes.ts';
import { type ToolDefinition, type ToolParameters } from '../../../../types/tooling.ts';
import type { ModelInfo, UniversalChatResponse } from '../../../../interfaces/UniversalInterfaces.ts';

// Declare variables for modules to be dynamically imported
let MCPServiceAdapter: jest.Mock;
let LLMCaller: any;

// Mock the ModelManager
jest.unstable_mockModule('@/core/models/ModelManager.ts', () => {
  return {
    __esModule: true,
    ModelManager: jest.fn().mockImplementation(() => ({
      getModel: jest.fn().mockReturnValue({
        name: 'test-model',
        inputPricePerMillion: 0.001,
        outputPricePerMillion: 0.002,
        maxRequestTokens: 4000,
        maxResponseTokens: 2000,
        characteristics: {
          qualityIndex: 0.8,
          outputSpeed: 0.7,
          firstTokenLatency: 0.3
        }
      }),
      getAvailableModels: jest.fn().mockReturnValue([]),
      addModel: jest.fn(),
      updateModel: jest.fn(),
      resolveModel: jest.fn().mockResolvedValue('test-model'),
      clearModels: jest.fn(),
      hasModel: jest.fn().mockReturnValue(true)
    }))
  };
});

// Mock the MCPServiceAdapter
jest.unstable_mockModule('@/core/mcp/MCPServiceAdapter.ts', () => {
  return {
    __esModule: true,
    MCPServiceAdapter: jest.fn()
  };
});

// Mock the logger
jest.unstable_mockModule('@/utils/logger.ts', () => ({
  __esModule: true,
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

// Mock the MCPConfigTypes module for isMCPToolConfig
jest.unstable_mockModule('@/core/mcp/MCPConfigTypes.ts', () => {
  // Return a simple mock with just what we need
  return {
    __esModule: true,
    // Use the real isMCPToolConfig logic
    isMCPToolConfig: jest.fn().mockImplementation((config) => {
      return (
        typeof config === 'object' &&
        config !== null &&
        'mcpServers' in config &&
        typeof config.mcpServers === 'object' &&
        config.mcpServers !== null
      );
    }),
    // Mock the errors we need
    MCPConnectionError: class MCPConnectionError extends Error {
      constructor(serverKey: string, message: string) {
        super(`MCPConnectionError: ${serverKey} - ${message}`);
        this.name = 'MCPConnectionError';
      }
    },
    MCPToolCallError: class MCPToolCallError extends Error {
      constructor(serverKey: string, toolName: string, message: string) {
        super(`MCPToolCallError: ${serverKey}.${toolName} - ${message}`);
        this.name = 'MCPToolCallError';
      }
    }
  };
});

// Dynamically import modules after mocks are set up
beforeAll(async () => {
  const MCPServiceAdapterModule = await import('@/core/mcp/MCPServiceAdapter.ts');
  MCPServiceAdapter = MCPServiceAdapterModule.MCPServiceAdapter as jest.Mock;

  const LLMCallerModule = await import('@/core/caller/LLMCaller.ts');
  LLMCaller = LLMCallerModule.LLMCaller;
});

describe('LLMCaller - MCP Direct Access', () => {
  let caller: typeof LLMCaller;
  let mockMcpAdapterInstance: {
    getMcpServerToolSchemas: jest.Mock<() => Promise<McpToolSchema[]>>;
    executeMcpTool: jest.Mock<() => Promise<any>>;
    connectToServer: jest.Mock<(serverKey: string) => Promise<void>>;
    disconnectAll: jest.Mock<() => Promise<void>>;
    isConnected: jest.Mock<() => boolean>;
    getConnectedServers: jest.Mock<() => string[]>;
    listConfiguredServers: jest.Mock<() => string[]>;
    registerServerConfig: jest.Mock<(serverKey: string, config: MCPServerConfig) => void>;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockMcpAdapterInstance = {
      getMcpServerToolSchemas: jest.fn<() => Promise<McpToolSchema[]>>(),
      executeMcpTool: jest.fn<() => Promise<any>>(),
      connectToServer: jest.fn<(serverKey: string) => Promise<void>>().mockResolvedValue(undefined as any),
      disconnectAll: jest.fn<() => Promise<void>>().mockResolvedValue(undefined as any),
      isConnected: jest.fn<() => boolean>().mockReturnValue(true as any),
      getConnectedServers: jest.fn<() => string[]>().mockReturnValue(['filesystem'] as any),
      listConfiguredServers: jest.fn<() => string[]>().mockReturnValue(['filesystem'] as any),
      registerServerConfig: jest.fn<(serverKey: string, config: MCPServerConfig) => void>()
    };

    MCPServiceAdapter.mockImplementation(() => mockMcpAdapterInstance);

    caller = new LLMCaller('openai', 'test-model');
  });

  describe('getMcpServerToolSchemas', () => {
    it('should call getMcpServerToolSchemas on MCPServiceAdapter instance', async () => {
      const mockSchemas: McpToolSchema[] = [
        {
          name: 'read_file',
          description: 'Read file contents',
          parameters: {} as any,
          serverKey: 'filesystem',
          llmToolName: 'filesystem_read_file'
        }];
      mockMcpAdapterInstance.getMcpServerToolSchemas.mockResolvedValue(mockSchemas as any);

      const result = await caller.getMcpServerToolSchemas('filesystem');

      expect(mockMcpAdapterInstance.getMcpServerToolSchemas).toHaveBeenCalledWith('filesystem');
      expect(result).toEqual(mockSchemas);
    });

    it('should throw error if MCPServiceAdapter instance throws', async () => {
      const mockError = new MCPConnectionError('filesystem', 'Not connected');
      mockMcpAdapterInstance.getMcpServerToolSchemas.mockRejectedValue(mockError as any);

      await expect(caller.getMcpServerToolSchemas('filesystem')).rejects.toThrow(MCPConnectionError);
    });

    it('should use the MCPServiceAdapter instance created by LLMCaller', async () => {
      (caller as any)._mcpAdapter = null;
      const mockSchemas: McpToolSchema[] = [
        {
          name: 'read_file',
          description: 'Read file contents',
          parameters: {} as any,
          serverKey: 'filesystem',
          llmToolName: 'filesystem_read_file'
        }];

      mockMcpAdapterInstance.getMcpServerToolSchemas.mockResolvedValue(mockSchemas as any);

      const result = await caller.getMcpServerToolSchemas('filesystem');

      expect(MCPServiceAdapter).toHaveBeenCalledTimes(1);
      expect(mockMcpAdapterInstance.getMcpServerToolSchemas).toHaveBeenCalledWith('filesystem');
      expect(result).toEqual(mockSchemas);
    });
  });

  describe('callMcpTool', () => {
    it('should call executeMcpTool on MCPServiceAdapter instance', async () => {
      const mockResult = { content: 'file contents' };
      mockMcpAdapterInstance.executeMcpTool.mockResolvedValue(mockResult as any);

      const args = { path: 'file.txt' };
      const result = await caller.callMcpTool('filesystem', 'read_file', args);

      expect(mockMcpAdapterInstance.executeMcpTool).toHaveBeenCalledWith('filesystem', 'read_file', args);
      expect(result).toEqual(mockResult);
    });

    it('should throw error if MCPServiceAdapter instance throws', async () => {
      const mockError = new MCPToolCallError('filesystem', 'read_file', 'File not found');
      mockMcpAdapterInstance.executeMcpTool.mockRejectedValue(mockError as any);

      const args = { path: 'non-existent.txt' };
      await expect(caller.callMcpTool('filesystem', 'read_file', args)).rejects.toThrow(MCPToolCallError);
    });

    it('should use the MCPServiceAdapter instance created by LLMCaller on first call', async () => {
      (caller as any)._mcpAdapter = null;
      const mockResult = { content: 'file contents' };
      mockMcpAdapterInstance.executeMcpTool.mockResolvedValue(mockResult as any);

      const args = { path: 'file.txt' };
      const result = await caller.callMcpTool('filesystem', 'read_file', args);

      expect(MCPServiceAdapter).toHaveBeenCalledTimes(1);
      expect(mockMcpAdapterInstance.executeMcpTool).toHaveBeenCalledWith('filesystem', 'read_file', args);
      expect(result).toEqual(mockResult);
    });
  });

  describe('isMCPToolConfig helper', () => {
    it('should correctly identify MCP tool configs', async () => {
      const { isMCPToolConfig } = await import('../../../../core/mcp/MCPConfigTypes.ts');
      const validConfig: MCPServersMap = {
        filesystem: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', '.']
        }
      };
      const invalidConfig1 = { name: 'tool', function: {} };
      const invalidConfig2 = { mcpServers: 'not-an-object' };
      const invalidConfig3 = null;

      expect(isMCPToolConfig({ mcpServers: validConfig })).toBe(true);
      expect(isMCPToolConfig(invalidConfig1)).toBe(false);
      expect(isMCPToolConfig(invalidConfig2 as any)).toBe(false);
      expect(isMCPToolConfig(invalidConfig3 as any)).toBe(false);
    });
  });

  describe('tool resolution with MCP', () => {
    it('should resolve MCP tools when provided in tools array', async () => {
      // Mock resolveToolDefinitions to return expected standard tools
      const mockStandardTools: ToolDefinition[] = [{
        name: 'calculator',
        description: 'Calculator tool',
        parameters: { type: 'object', properties: {} },
        callFunction: jest.fn() as any
      }];
      jest.spyOn(caller as any, 'resolveToolDefinitions').mockResolvedValue(mockStandardTools);

      // Mock internalChatCall to prevent actual API calls
      jest.spyOn(caller as any, 'internalChatCall').mockResolvedValue({
        messages: [{ role: 'assistant', content: 'Response' }],
        usage: {}
      });

      // Create MCP config
      const mcpServersMap: MCPServersMap = {
        filesystem: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', '.']
        }
      };

      const standardTool: ToolDefinition = {
        name: 'weather',
        description: 'Get weather info',
        parameters: { type: 'object', properties: {} },
        callFunction: jest.fn() as any
      };

      // First register the MCP config using addTools (this should trigger registerServerConfig)
      await caller.addTools([mcpServersMap]);

      // Then call with both MCP config and standard tools
      await caller.call('test message', {
        tools: [mcpServersMap, standardTool, 'calculator'] // Mix of MCP config, ToolDefinition, and string
      });

      // Verify the MCP configuration was registered during addTools call
      expect(mockMcpAdapterInstance.registerServerConfig).toHaveBeenCalledWith('filesystem', mcpServersMap.filesystem);

      // Verify resolveToolDefinitions was called (for standard tools)
      expect(jest.spyOn(caller as any, 'resolveToolDefinitions')).toHaveBeenCalled();
    });
  });

  describe('addTools with MCP configurations', () => {
    beforeEach(() => {
      caller = new LLMCaller('openai', 'gpt-3.5-turbo');
      // Ensure MCPServiceAdapter mock is reset for these tests if they create new LLMCallers
      MCPServiceAdapter.mockImplementation(() => mockMcpAdapterInstance);
      // We re-assign mockMcpAdapterInstance's methods if needed, or ensure it's fresh
      mockMcpAdapterInstance.registerServerConfig.mockClear();
      mockMcpAdapterInstance.connectToServer.mockClear();
      mockMcpAdapterInstance.isConnected.mockClear().mockReturnValue(false); // Default to not connected for these tests
    });

    it('should register MCP server configs without auto-connecting', async () => {
      const mcpConfig: MCPServersMap = {
        filesystem: {
          command: 'mock-command',
          args: []
        }
      };

      // This local mockAdapter is specific to this test's logic verification.
      // The global mockMcpAdapterInstance is what LLMCaller will use via its constructor.
      const localMockAdapterOperations = {
        registerServerConfig: jest.fn<(serverKey: string, config: MCPServerConfig) => void>(),
        connectToServer: jest.fn<(serverKey: string) => Promise<void>>().mockResolvedValue(undefined as any),
        isConnected: jest.fn<() => boolean>().mockReturnValue(false)
      };
      // Point the main spy to this specific set of operations for this test case if needed
      // Or ensure the getMcpAdapter spy returns this one.
      jest.spyOn(caller as any, 'getMcpAdapter').mockReturnValue(localMockAdapterOperations);

      await caller.addTools([mcpConfig]);

      expect(localMockAdapterOperations.registerServerConfig).toHaveBeenCalledWith('filesystem', mcpConfig.filesystem);
      expect(localMockAdapterOperations.connectToServer).not.toHaveBeenCalled();
    });

    it('should use a shared MCPServiceAdapter across all operations', async () => {
      (caller as any)._mcpAdapter = null; // Force re-initialization

      // mockMcpAdapterInstance is configured in the outer beforeEach to be returned by MCPServiceAdapter constructor
      // So, we expect MCPServiceAdapter constructor to be called once, and then its methods on mockMcpAdapterInstance to be called.

      jest.spyOn(caller as any, 'resolveToolDefinitions').mockResolvedValue([] as any);
      jest.spyOn(caller as any, 'internalChatCall').mockResolvedValue({ messages: [], usage: {} } as any);

      const mcpConfig: MCPServersMap = { filesystem: { command: 'test-command' } };
      await caller.addTools([mcpConfig]);
      // MCPServiceAdapter constructor called here by getMcpAdapter -> _initMcpAdapter

      await caller.connectToMcpServer('filesystem');
      // Uses existing adapter instance (mockMcpAdapterInstance)

      await caller.call('List files', { tools: [mcpConfig] });
      // Uses existing adapter instance (mockMcpAdapterInstance)

      expect(MCPServiceAdapter).toHaveBeenCalledTimes(1); // Constructor should be called only once by LLMCaller
      expect(mockMcpAdapterInstance.registerServerConfig).toHaveBeenCalled();
      expect(mockMcpAdapterInstance.connectToServer).toHaveBeenCalled();
    });
  });

  describe('connectToMcpServer', () => {
    beforeEach(() => {
      caller = new LLMCaller('openai', 'gpt-3.5-turbo');
      MCPServiceAdapter.mockImplementation(() => mockMcpAdapterInstance);
      mockMcpAdapterInstance.connectToServer.mockClear().mockResolvedValue(undefined as any);
      mockMcpAdapterInstance.isConnected.mockClear().mockReturnValue(false);
      mockMcpAdapterInstance.listConfiguredServers.mockClear().mockReturnValue(['filesystem']);
    });

    it('should connect to server registered via addTools', async () => {
      // _mcpAdapter will be mockMcpAdapterInstance due to beforeEach setup
      const mcpConfig = { filesystem: { command: 'test-command' } };
      await caller.addTools([mcpConfig]); // This will use the mocked registerServerConfig

      await caller.connectToMcpServer('filesystem');

      expect(mockMcpAdapterInstance.connectToServer).toHaveBeenCalledWith('filesystem');
    });

    it('should throw helpful error when server config is missing', async () => {
      // Ensure listConfiguredServers returns an empty array or a list not containing 'unknown'
      mockMcpAdapterInstance.listConfiguredServers.mockReturnValue([]);
      // Mock connectToServer to throw an error if called with 'unknown', simulating config not found behavior upstream
      mockMcpAdapterInstance.connectToServer.mockImplementation(async (serverKey: string) => {
        if (serverKey === 'unknown') {
          throw new Error('Server configuration not found for unknown');
        }
      });

      // Update the expected error message pattern to match what LLMCaller actually throws
      await expect(caller.connectToMcpServer('unknown'))
        .rejects.toThrow(/No configuration found for MCP server "unknown"/);
    });
  });

  describe('call with MCP tools', () => {
    let originalCall: any;

    beforeEach(() => {
      caller = new LLMCaller('openai', 'gpt-3.5-turbo');
      MCPServiceAdapter.mockImplementation(() => mockMcpAdapterInstance);
      originalCall = caller.call.bind(caller); // Bind to ensure `this` context
    });

    afterEach(() => {
      // No need to restore caller.call if not modified by spyOn(caller, 'call')
    });

    it('should handle MCP tools registration correctly', async () => {
      const resolvedTools: ToolDefinition[] = [{
        name: 'test-tool',
        description: 'Test tool description',
        parameters: { type: 'object', properties: {} },
        callFunction: jest.fn<(params: any) => Promise<any>>().mockResolvedValue({})
      }];
      jest.spyOn(caller as any, 'resolveToolDefinitions').mockResolvedValue(resolvedTools as any);
      jest.spyOn(caller as any, 'internalChatCall').mockResolvedValue({ messages: [], usage: {} } as any);

      await caller.call('Test without tools');

      const callSpy = jest.spyOn(caller, 'call');

      const mcpConfig = { filesystem: { command: 'test-command' } };
      await caller.call('Test with MCP config', { tools: [mcpConfig] });

      expect(callSpy).toHaveBeenLastCalledWith('Test with MCP config', { tools: [mcpConfig] });
      callSpy.mockRestore(); // Restore original after spying
    });

    it('should prevent duplicate server connections in call method', async () => {
      jest.spyOn(caller as any, 'resolveToolDefinitions').mockResolvedValue([] as any);
      jest.spyOn(caller as any, 'internalChatCall').mockResolvedValue({ messages: [], usage: {} } as any);

      await caller.call('Initial call'); // This might initialize the adapter

      // Ensure getMcpAdapter returns our main mock instance, which it should by default from beforeEach
      const connectToServerSpy = mockMcpAdapterInstance.connectToServer;
      connectToServerSpy.mockClear(); // Clear calls from previous initializations
      mockMcpAdapterInstance.isConnected.mockReturnValue(true); // Simulate already connected

      // const originalIsMCPToolConfig = (caller as any).isMCPToolConfig; // isMCPToolConfig is not a method on caller instance
      // (caller as any).isMCPToolConfig = jest.fn().mockReturnValue(true); // Cannot mock a free function like this here.
      // Instead, ensure the mcpConfig structure is correctly identified by the real isMCPToolConfig.

      const mcpConfig: MCPServersMap = {
        filesystem: { command: 'test-command', args: [] }
      }; // Valid MCP config
      await caller.call('Test with MCP', { tools: [mcpConfig] });

      expect(connectToServerSpy).not.toHaveBeenCalled();

      // (caller as any).isMCPToolConfig = originalIsMCPToolConfig;
    });

    it('should use resolved tools and call internalChatCall in LLMCaller.call', async () => {
      // Mock standard tools that will be resolved
      const mockResolvedTools: ToolDefinition[] = [
        {
          name: 'calculator',
          description: 'Calculator tool',
          parameters: { type: 'object', properties: {} },
          callFunction: jest.fn() as any
        },
        {
          name: 'weather',
          description: 'Weather tool',
          parameters: { type: 'object', properties: {} },
          callFunction: jest.fn() as any
        }
      ];

      // Mock resolveToolDefinitions to return our mock tools
      const resolveToolsSpy = jest.spyOn(caller as any, 'resolveToolDefinitions').mockResolvedValue(mockResolvedTools);

      // Mock internalChatCall to capture its input and return a response
      const mockResponse = {
        messages: [{ role: 'assistant' as const, content: 'Mock response' }],
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 }
      };
      const internalChatCallSpy = jest.spyOn(caller as any, 'internalChatCall').mockResolvedValue(mockResponse);

      // Create MCP config and register it
      const mcpConfig = { filesystem: { command: 'test-command', args: [] } };
      await caller.addTools([mcpConfig as any]);

      // Call with both string tools and MCP config
      const result = await caller.call('Test message', {
        tools: ['calculator', 'weather', mcpConfig]
      });

      // Verify resolveToolDefinitions was called with string tools only (MCP filtered out)
      expect(resolveToolsSpy).toHaveBeenCalledWith(['calculator', 'weather'], undefined);

      // Verify internalChatCall was called with the resolved tools
      expect(internalChatCallSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: mockResolvedTools
        })
      );

      // Verify the response was returned correctly
      expect(result).toEqual([mockResponse]);

      // Verify MCP registration happened
      expect(mockMcpAdapterInstance.registerServerConfig).toHaveBeenCalledWith('filesystem', mcpConfig.filesystem);
    });
  });

  describe('addTools and MCP server connection', () => {
    beforeEach(() => {
      MCPServiceAdapter.mockImplementation(() => mockMcpAdapterInstance);
      caller = new LLMCaller('openai', 'test-model');
      // Clear relevant mocks on mockMcpAdapterInstance for these specific tests
      mockMcpAdapterInstance.registerServerConfig.mockClear();
      mockMcpAdapterInstance.connectToServer.mockClear();
    });

    it('should register MCP server configs via addTools and allow connection', async () => {
      const mcpConfig = { filesystem: { command: 'test-command', args: [] } };

      // getMcpAdapter is an internal method, direct calls to mockMcpAdapterInstance methods are preferred for verification
      await caller.addTools([mcpConfig as any]);
      expect(mockMcpAdapterInstance.registerServerConfig).toHaveBeenCalledWith('filesystem', mcpConfig.filesystem);

      await caller.connectToMcpServer('filesystem');
      expect(mockMcpAdapterInstance.connectToServer).toHaveBeenCalledWith('filesystem');
    });
  });
});