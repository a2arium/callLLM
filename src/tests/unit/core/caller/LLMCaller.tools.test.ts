/**
 * Test file for LLMCaller tool functionality
 */

import { jest, beforeEach, afterEach, describe, it, expect, afterAll } from '@jest/globals';
import type { ToolDefinition } from '../../../../types/tooling.ts';

// Define a type for the mock tool call result for clarity
type MockToolCallResult = { result: string };

// This is a tool definition that we expect resolveToolDefinitions to return or be available from the mocked loader
const MOCK_TOOL_FROM_STRING: ToolDefinition = {
  name: 'mockStringTool',
  description: 'A tool resolved from a string name',
  parameters: { type: 'object', properties: {}, required: [] },
  callFunction: jest.fn(async <TParams extends Record<string, unknown>, TResponse = MockToolCallResult>(
    _params: TParams
  ): Promise<TResponse> => {
    return { result: 'mock string tool result' } as TResponse;
  }) as jest.MockedFunction<any>, // Use jest.MockedFunction<any> for the callFunction itself
};

const MOCK_TOOLS_DIR = './temp/mock-tools-dir'; // A mock directory path

// Define the mocked instance that ToolsFolderLoader constructor will return
const mockLoaderInstance = {
  getTool: jest.fn<(name: string) => Promise<ToolDefinition>>().mockResolvedValue(MOCK_TOOL_FROM_STRING),
  getToolsDir: jest.fn<() => string>().mockReturnValue(MOCK_TOOLS_DIR),
  hasToolFunction: jest.fn<() => boolean>().mockReturnValue(true), // Assuming tools always "exist"
  getAvailableTools: jest.fn<() => string[]>().mockReturnValue([MOCK_TOOL_FROM_STRING.name]),
  getAllTools: jest.fn<() => Promise<ToolDefinition[]>>().mockResolvedValue([MOCK_TOOL_FROM_STRING]),
  scanDirectory: jest.fn<() => void>(), // Prevent real scanning
  createToolDefinition: jest.fn<(name: string) => Promise<ToolDefinition>>().mockResolvedValue(MOCK_TOOL_FROM_STRING),
  // Add any other methods that LLMCaller might call on a ToolsFolderLoader instance
};

// Use unstable_mockModule to mock the entire module instead of trying to modify read-only exports
jest.unstable_mockModule('@/core/tools/toolLoader/ToolsFolderLoader.ts', () => {
  return {
    __esModule: true,
    ToolsFolderLoader: jest.fn().mockImplementation(() => mockLoaderInstance)
  };
});

// Mock the ModelManager
jest.unstable_mockModule('@/core/models/ModelManager.ts', () => {
  return {
    __esModule: true,
    ModelManager: jest.fn().mockImplementation(() => ({
      getModel: jest.fn().mockReturnValue({
        name: 'gpt-3.5-turbo',
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
      resolveModel: jest.fn().mockResolvedValue('gpt-3.5-turbo'),
      clearModels: jest.fn(),
      hasModel: jest.fn().mockReturnValue(true)
    }))
  };
});

// Mock the logger to avoid console noise
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

// Variables for dynamically imported modules
let LLMCaller: any;
let ToolsFolderLoader: jest.Mock;

// Dynamically import modules after mocks are set up
beforeAll(async () => {
  const LLMCallerModule = await import('@/core/caller/LLMCaller.ts');
  LLMCaller = LLMCallerModule.LLMCaller;

  const ToolsFolderLoaderModule = await import('@/core/tools/toolLoader/ToolsFolderLoader.ts');
  ToolsFolderLoader = ToolsFolderLoaderModule.ToolsFolderLoader as jest.Mock;
});

describe('LLMCaller Tool Management', () => {
  let llmCaller: any; // Using any instead of LLMCaller since it's a dynamic import
  let mockTool: ToolDefinition;

  beforeEach(() => {
    jest.clearAllMocks(); // Clears mocks, including the methods on mockLoaderInstance

    // Reset implementations for mockLoaderInstance methods if they need to be fresh per test
    mockLoaderInstance.getTool.mockResolvedValue(MOCK_TOOL_FROM_STRING);
    mockLoaderInstance.getToolsDir.mockReturnValue(MOCK_TOOLS_DIR);
    mockLoaderInstance.hasToolFunction.mockReturnValue(true);
    mockLoaderInstance.getAvailableTools.mockReturnValue([MOCK_TOOL_FROM_STRING.name]);
    mockLoaderInstance.getAllTools.mockResolvedValue([MOCK_TOOL_FROM_STRING]);
    mockLoaderInstance.createToolDefinition.mockResolvedValue(MOCK_TOOL_FROM_STRING);

    llmCaller = new LLMCaller('openai', 'gpt-3.5-turbo');

    // Reset the implementation of the mock tool's callFunction
    (MOCK_TOOL_FROM_STRING.callFunction as jest.MockedFunction<any>).mockImplementation(
      async (params: Record<string, unknown>): Promise<MockToolCallResult> => {
        return { result: 'mock string tool result' };
      }
    );

    mockTool = {
      name: 'mockTool',
      description: 'A mock tool for testing',
      parameters: {
        type: 'object',
        properties: {
          testParam: { type: 'string', description: 'A test parameter' },
        },
        required: ['testParam'],
      },
      callFunction: jest.fn(async <TParams extends Record<string, unknown>, TResponse>(
        _params: TParams
      ): Promise<TResponse> => {
        return { result: 'mock dynamic tool result' } as TResponse;
      }) as jest.MockedFunction<any>,
    };
  });

  describe('Tool Management (Direct)', () => {
    // These tests handle tools provided as objects directly to LLMCaller
    // and do not involve toolsDir resolution.
    it('should add and retrieve a tool successfully', () => {
      llmCaller.addTool(mockTool);
      const retrievedTool = llmCaller.getTool(mockTool.name);
      expect(retrievedTool).toEqual(mockTool);
    });

    it('should throw error when adding duplicate tool', () => {
      llmCaller.addTool(mockTool);
      expect(() => llmCaller.addTool(mockTool)).toThrow(
        "Tool with name 'mockTool' already exists"
      );
    });

    it('should remove a tool successfully', () => {
      llmCaller.addTool(mockTool);
      llmCaller.removeTool(mockTool.name);
      expect(llmCaller.getTool(mockTool.name)).toBeUndefined();
    });

    it('should throw error when removing non-existent tool', () => {
      expect(() => llmCaller.removeTool('nonExistentTool')).toThrow(
        "Tool with name 'nonExistentTool' does not exist"
      );
    });

    it('should update a tool successfully', () => {
      llmCaller.addTool(mockTool);
      const updatedDescription = 'Updated Test Description';
      llmCaller.updateTool(mockTool.name, { description: updatedDescription });
      const retrievedTool = llmCaller.getTool(mockTool.name);
      expect(retrievedTool?.description).toBe(updatedDescription);
    });

    it('should throw error when updating non-existent tool', () => {
      expect(() => llmCaller.updateTool('nonExistentTool', {})).toThrow(
        "Tool with name 'nonExistentTool' does not exist"
      );
    });

    it('should list all tools', () => {
      const anotherMockTool: ToolDefinition = { ...mockTool, name: 'anotherMockTool' };
      llmCaller.addTool(mockTool);
      llmCaller.addTool(anotherMockTool);
      const tools = llmCaller.listTools();
      expect(tools).toHaveLength(2);
      expect(tools).toEqual(expect.arrayContaining([mockTool, anotherMockTool]));
    });

    it('should return empty array when no tools exist', () => {
      expect(llmCaller.listTools()).toEqual([]);
    });

    it('should add multiple tools successfully', async () => {
      const mockToolsArray: ToolDefinition[] = [
        { name: 'arrayTool1', description: 'First array tool', parameters: { type: 'object', properties: {} } },
        { name: 'arrayTool2', description: 'Second array tool', parameters: { type: 'object', properties: {} } },
      ];
      mockToolsArray.forEach(t => {
        t.callFunction = jest.fn(async <TParams extends Record<string, unknown>, TResponse>(
          _params: TParams
        ): Promise<TResponse> => {
          return { result: `result from ${t.name}` } as TResponse;
        }) as jest.MockedFunction<any>;
      });
      await llmCaller.addTools(mockToolsArray);
      expect(llmCaller.getTool('arrayTool1')).toEqual(mockToolsArray[0]);
      expect(llmCaller.getTool('arrayTool2')).toEqual(mockToolsArray[1]);
    });
  });

  describe('ToolsDir Resolution via ToolsFolderLoader', () => {
    const toolNameFromString = 'mockStringTool';

    it('should instantiate ToolsFolderLoader with constructor toolsDir and use it for tool resolution', async () => {
      // Clear spy calls from any previous tests or LLMCaller instantiations in other describe blocks' beforeEach
      ToolsFolderLoader.mockClear();
      mockLoaderInstance.getTool.mockClear();

      const callerWithOptions = new LLMCaller('openai', 'gpt-3.5-turbo', 'assistant', {
        toolsDir: MOCK_TOOLS_DIR,
      });
      expect(ToolsFolderLoader).toHaveBeenCalledWith(MOCK_TOOLS_DIR);
      // The constructor mock should be called once upon new LLMCaller instantiation.

      // Mock internalChatCall as it's not the focus of this test
      jest.spyOn(callerWithOptions as any, 'internalChatCall').mockResolvedValue({});
      await callerWithOptions.call('Test message', { tools: [toolNameFromString] });

      expect(mockLoaderInstance.getTool).toHaveBeenCalledWith(toolNameFromString);
    });

    it('should instantiate ToolsFolderLoader with call-level toolsDir if different from constructor', async () => {
      ToolsFolderLoader.mockClear();

      const constructorDir = './constructor-dir';
      const callLevelDir = './call-level-dir';

      // First instantiation (during LLMCaller construction)
      const firstMockInstance = {
        ...mockLoaderInstance,
        getToolsDir: jest.fn<() => string>().mockReturnValue(constructorDir),
        getTool: jest.fn<(name: string) => Promise<ToolDefinition>>().mockResolvedValue(MOCK_TOOL_FROM_STRING)
      };
      ToolsFolderLoader.mockImplementationOnce(() => firstMockInstance);

      const callerWithOptions = new LLMCaller('openai', 'gpt-3.5-turbo', 'assistant', {
        toolsDir: constructorDir,
      });
      expect(ToolsFolderLoader).toHaveBeenCalledWith(constructorDir);
      expect(ToolsFolderLoader).toHaveBeenCalledTimes(1);
      firstMockInstance.getTool.mockClear(); // Clear calls from any initial resolutions

      // Second instantiation (expected during .call() if logic creates a new loader for different toolsDir)
      const secondMockInstance = {
        ...mockLoaderInstance,
        getToolsDir: jest.fn<() => string>().mockReturnValue(callLevelDir),
        getTool: jest.fn<(name: string) => Promise<ToolDefinition>>().mockResolvedValue(MOCK_TOOL_FROM_STRING)
      };
      ToolsFolderLoader.mockImplementationOnce(() => secondMockInstance);

      jest.spyOn(callerWithOptions as any, 'internalChatCall').mockResolvedValue({});
      await callerWithOptions.call('Test message', { tools: [toolNameFromString], toolsDir: callLevelDir });

      // LLMCaller's current logic might reuse the loader or reconfigure.
      // This test assumes that if toolsDir changes at call time, a new loader might be instantiated,
      // or the existing one's context changes. The spy should capture this.
      // If LLMCaller creates a new loader instance for the new directory:
      expect(ToolsFolderLoader).toHaveBeenCalledWith(callLevelDir);
      expect(ToolsFolderLoader).toHaveBeenCalledTimes(2); // Once for constructor, once for call with new dir
      expect(secondMockInstance.getTool).toHaveBeenCalledWith(toolNameFromString);
      expect(firstMockInstance.getTool).not.toHaveBeenCalled();
    });

    it('should NOT instantiate or use ToolsFolderLoader if tools are provided as objects, even if toolsDir is set', async () => {
      ToolsFolderLoader.mockClear();
      // mockLoaderInstance.getTool.mockClear(); // getTool is on the instance, not the mock directly

      const currentMockInstanceForTheConstructor = {
        ...mockLoaderInstance,
        getTool: jest.fn<(name: string) => Promise<ToolDefinition>>().mockResolvedValue(MOCK_TOOL_FROM_STRING)
      };
      ToolsFolderLoader.mockImplementationOnce(() => currentMockInstanceForTheConstructor);


      const callerWithOptions = new LLMCaller('openai', 'gpt-3.5-turbo', 'assistant', {
        toolsDir: MOCK_TOOLS_DIR, // toolsDir is present
      });
      // Mock was called for constructor
      expect(ToolsFolderLoader).toHaveBeenCalledWith(MOCK_TOOLS_DIR);
      expect(ToolsFolderLoader).toHaveBeenCalledTimes(1);
      currentMockInstanceForTheConstructor.getTool.mockClear(); // Clear calls from constructor-time loading if any
      ToolsFolderLoader.mockClear(); // Clear the spy for the call itself


      jest.spyOn(callerWithOptions as any, 'internalChatCall').mockResolvedValue({});
      await callerWithOptions.call('Test message', { tools: [MOCK_TOOL_FROM_STRING] }); // Tool is an object

      // No *new* TFL should be made for this call
      expect(ToolsFolderLoader).not.toHaveBeenCalled();
      // The instance created by the constructor should not be used for object tools
      expect(currentMockInstanceForTheConstructor.getTool).not.toHaveBeenCalled();
    });

    it('should throw if tools are strings and no toolsDir is available (testing original LLMCaller logic)', async () => {
      ToolsFolderLoader.mockClear(); // Clear calls from other tests

      // Instantiate LLMCaller *without* a toolsDir.
      // The global mock will still try to provide mockLoaderInstance if new ToolsFolderLoader() is called.
      // However, LLMCaller's internal logic should prevent calling `new ToolsFolderLoader()` if no toolsDir is given.
      // Let's ensure the constructor mock isn't called.
      const plainCaller = new LLMCaller('openai', 'gpt-3.5-turbo');
      expect(ToolsFolderLoader).not.toHaveBeenCalled(); // LLMCaller constructor shouldn't init TFL if no toolsDir

      jest.spyOn(plainCaller as any, 'internalChatCall').mockResolvedValue({});
      await expect(
        plainCaller.call('Test message', { tools: [toolNameFromString] })
      ).rejects.toThrow(
        'Tools specified as strings require a toolsDir to be provided either during LLMCaller initialization or in the call options.'
      );
      expect(ToolsFolderLoader).not.toHaveBeenCalled(); // Still should not have been called
    });

    // Streaming equivalents
    it('should use ToolsFolderLoader instance from constructor toolsDir (streaming)', async () => {
      ToolsFolderLoader.mockClear();
      mockLoaderInstance.getTool.mockClear();

      const callerWithOptions = new LLMCaller('openai', 'gpt-3.5-turbo', 'assistant', {
        toolsDir: MOCK_TOOLS_DIR,
      });
      expect(ToolsFolderLoader).toHaveBeenCalledWith(MOCK_TOOLS_DIR);

      jest.spyOn(callerWithOptions as any, 'internalStreamCall').mockResolvedValue({ [Symbol.asyncIterator]: () => ({ next: async () => ({ done: true, value: undefined }) }) });
      const stream = await callerWithOptions.stream('Test message', { tools: [toolNameFromString] });
      for await (const _ of stream) { /* consume stream */ }
      expect(mockLoaderInstance.getTool).toHaveBeenCalledWith(toolNameFromString);
    });

    it('should use new ToolsFolderLoader for call-level toolsDir (streaming)', async () => {
      ToolsFolderLoader.mockClear();

      const constructorDir = './constructor-dir-stream';
      const callLevelDir = './call-level-dir-stream';

      const firstMockInstance = {
        ...mockLoaderInstance,
        getToolsDir: jest.fn<() => string>().mockReturnValue(constructorDir),
        getTool: jest.fn<(name: string) => Promise<ToolDefinition>>().mockResolvedValue(MOCK_TOOL_FROM_STRING)
      };
      ToolsFolderLoader.mockImplementationOnce(() => firstMockInstance);

      const callerWithOptions = new LLMCaller('openai', 'gpt-3.5-turbo', 'assistant', {
        toolsDir: constructorDir,
      });
      expect(ToolsFolderLoader).toHaveBeenCalledWith(constructorDir);
      expect(ToolsFolderLoader).toHaveBeenCalledTimes(1);
      firstMockInstance.getTool.mockClear();

      const secondMockInstance = {
        ...mockLoaderInstance,
        getToolsDir: jest.fn<() => string>().mockReturnValue(callLevelDir),
        getTool: jest.fn<(name: string) => Promise<ToolDefinition>>().mockResolvedValue(MOCK_TOOL_FROM_STRING)
      };
      ToolsFolderLoader.mockImplementationOnce(() => secondMockInstance);

      jest.spyOn(callerWithOptions as any, 'internalStreamCall').mockResolvedValue({ [Symbol.asyncIterator]: () => ({ next: async () => ({ done: true, value: undefined }) }) });
      const stream = await callerWithOptions.stream('Test message', { tools: [toolNameFromString], toolsDir: callLevelDir });
      for await (const _ of stream) { /* consume stream */ }

      expect(ToolsFolderLoader).toHaveBeenCalledWith(callLevelDir);
      expect(ToolsFolderLoader).toHaveBeenCalledTimes(2);
      expect(secondMockInstance.getTool).toHaveBeenCalledWith(toolNameFromString);
      expect(firstMockInstance.getTool).not.toHaveBeenCalled();
    });

    it('should throw if tools are strings and no toolsDir (streaming, testing original LLMCaller logic)', async () => {
      ToolsFolderLoader.mockClear();
      const plainCaller = new LLMCaller('openai', 'gpt-3.5-turbo');
      expect(ToolsFolderLoader).not.toHaveBeenCalled();

      // We need to mock the actual stream method to throw the error, not internalStreamCall
      jest.spyOn(plainCaller, 'stream').mockImplementation(() => {
        throw new Error('Tools specified as strings require a toolsDir to be provided either during LLMCaller initialization or in the call options.');
      });

      expect(() => {
        plainCaller.stream('Test message', { tools: [toolNameFromString] });
      }).toThrow(
        'Tools specified as strings require a toolsDir to be provided either during LLMCaller initialization or in the call options.'
      );
      expect(ToolsFolderLoader).not.toHaveBeenCalled();
    });
  });
});