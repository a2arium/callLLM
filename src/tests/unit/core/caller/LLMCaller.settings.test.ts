import { jest, describe, expect, test, beforeEach, beforeAll, it } from '@jest/globals';
import { RetryManager } from '../../../../core/retry/RetryManager.ts';
import type { RegisteredProviders } from '../../../../adapters/index.ts';
import type { ModelInfo, HistoryMode, JSONSchemaDefinition, UniversalChatResponse, UniversalStreamResponse } from '../../../../interfaces/UniversalInterfaces.ts';

// Declare variables for dynamic imports
let LLMCaller;
let UsageTracker;
let ModelManager;

// Mock all LLMCaller dependencies
const mockStreamHandlerHandleStream = jest.fn();
const mockHistoryManagerGetMessages = jest.fn();
const mockModelManagerGetModel = jest.fn();
const mockProviderManagerGetCurrentProviderName = jest.fn();
const mockToolsManagerRegisterTools = jest.fn();
const mockChatControllerChatRequest = jest.fn();
const mockResponseProcessorProcessResponse = jest.fn();
const mockUsageTrackerTrackTokens = jest.fn();
const mockTokenCalculatorCalculateTokens = jest.fn();
const mockStreamingServiceCreateStream = jest.fn()

// Set up all module mocks before importing actual modules
jest.unstable_mockModule('@/core/telemetry/UsageTracker.ts', () => ({
  __esModule: true,
  UsageTracker: jest.fn().mockImplementation(() => ({
    trackTokens: mockUsageTrackerTrackTokens
  }))
}));

jest.unstable_mockModule('@/core/streaming/StreamingService.ts', () => ({
  __esModule: true,
  StreamingService: jest.fn().mockImplementation(() => ({
    createStream: mockStreamingServiceCreateStream,
    setToolOrchestrator: jest.fn()
  }))
}));

jest.unstable_mockModule('@/core/caller/ProviderManager.ts', () => ({
  __esModule: true,
  ProviderManager: jest.fn().mockImplementation(() => ({
    getCurrentProviderName: mockProviderManagerGetCurrentProviderName,
    switchProvider: jest.fn(),
    getProvider: jest.fn()
  }))
}));

jest.unstable_mockModule('@/core/models/ModelManager.ts', () => ({
  __esModule: true,
  ModelManager: jest.fn().mockImplementation(() => ({
    getModel: mockModelManagerGetModel,
    getAvailableModels: jest.fn().mockReturnValue([]),
    addModel: jest.fn(),
    updateModel: jest.fn()
  }))
}));

jest.unstable_mockModule('@/core/history/HistoryManager.ts', () => ({
  __esModule: true,
  HistoryManager: jest.fn().mockImplementation(() => ({
    getMessages: mockHistoryManagerGetMessages,
    getMessages: jest.fn().mockReturnValue([{ role: 'system', content: 'You are a helpful assistant' }]),
    addMessage: jest.fn(),
    clearHistory: jest.fn(),
    initializeWithSystemMessage: jest.fn()
  }))
}));

jest.unstable_mockModule('@/core/tools/ToolsManager.ts', () => ({
  __esModule: true,
  ToolsManager: jest.fn().mockImplementation(() => ({
    registerTools: mockToolsManagerRegisterTools,
    getRegisteredTools: jest.fn().mockReturnValue([])
  }))
}));

jest.unstable_mockModule('@/core/chat/ChatController.ts', () => ({
  __esModule: true,
  ChatController: jest.fn().mockImplementation(() => ({
    chatRequest: mockChatControllerChatRequest
  }))
}));

jest.unstable_mockModule('@/core/processors/ResponseProcessor.ts', () => ({
  __esModule: true,
  ResponseProcessor: jest.fn().mockImplementation(() => ({
    processResponse: mockResponseProcessorProcessResponse
  }))
}));

jest.unstable_mockModule('@/core/processors/RequestProcessor.ts', () => ({
  __esModule: true,
  RequestProcessor: jest.fn().mockImplementation(() => ({
    processRequest: jest.fn().mockResolvedValue(['test message'] as string[])
  }))
}));

jest.unstable_mockModule('@/core/models/TokenCalculator.ts', () => ({
  __esModule: true,
  TokenCalculator: jest.fn().mockImplementation(() => ({
    calculateTokens: mockTokenCalculatorCalculateTokens,
    calculateTotalTokens: jest.fn().mockResolvedValue(100 as number)
  }))
}));

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

// Dynamically import modules after mocks are set up
beforeAll(async () => {
  const UsageTrackerModule = await import('@/core/telemetry/UsageTracker.ts');
  UsageTracker = UsageTrackerModule.UsageTracker;

  const LLMCallerModule = await import('@/core/caller/LLMCaller.ts');
  LLMCaller = LLMCallerModule.LLMCaller;

  const ModelManagerModule = await import('@/core/models/ModelManager.ts');
  ModelManager = ModelManagerModule.ModelManager;
});

describe('LLMCaller Settings & Configuration', () => {
  let llmCaller;
  let mockStreamingService;
  let mockProviderManager;
  let mockModelManager;
  let mockHistoryManager;
  let mockToolsManager;
  let mockChatController;
  let mockTokenCalculator;
  let mockResponseProcessor;
  let mockUsageCallback;
  let mockRequestProcessor;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup test fixture
    mockUsageCallback = jest.fn()

    // Set up the model info
    const mockModelInfo = {
      name: 'test-model',
      inputPricePerMillion: 0.1,
      outputPricePerMillion: 0.2,
      maxRequestTokens: 2000,
      maxResponseTokens: 1000,
      tokenizationModel: 'gpt-3.5-turbo',
      characteristics: {
        qualityIndex: 80,
        outputSpeed: 100,
        firstTokenLatency: 100
      },
      capabilities: {
        streaming: true,
        toolCalls: true,
        parallelToolCalls: true,
        batchProcessing: true,
        input: {
          text: true
        },
        output: {
          text: {
            textOutputFormats: ['text', 'json']
          }
        }
      }
    };

    // Create all the mock services
    mockModelManager = {
      getModel: mockModelManagerGetModel.mockReturnValue(mockModelInfo),
      getAvailableModels: jest.fn().mockReturnValue([mockModelInfo]),
      addModel: jest.fn(),
      updateModel: jest.fn()
    };

    mockProviderManager = {
      getCurrentProviderName: mockProviderManagerGetCurrentProviderName.mockReturnValue('openai'),
      switchProvider: jest.fn(),
      getProvider: jest.fn()
    };

    mockHistoryManager = {
      getMessages: mockHistoryManagerGetMessages.mockReturnValue([{ role: 'system', content: 'You are a helpful assistant' }]),
      getMessages: jest.fn().mockReturnValue([{ role: 'system', content: 'You are a helpful assistant' }]),
      addMessage: jest.fn(),
      clearHistory: jest.fn(),
      initializeWithSystemMessage: jest.fn()
    };

    mockStreamingService = {
      createStream: mockStreamingServiceCreateStream.mockResolvedValue((async function* () {
        yield {
          content: "Hello, I'm an AI assistant",
          role: 'assistant',
          isComplete: true
        };
      })() as AsyncGenerator<UniversalStreamResponse>),
      setToolOrchestrator: jest.fn()
    };

    mockToolsManager = {
      registerTools: mockToolsManagerRegisterTools,
      getRegisteredTools: jest.fn().mockReturnValue([]),
      listTools: jest.fn().mockReturnValue([])
    };

    mockChatController = {
      chatRequest: mockChatControllerChatRequest.mockResolvedValue({
        content: "Hello, I'm an AI assistant",
        role: 'assistant'
      } as UniversalChatResponse)
    };

    mockTokenCalculator = {
      calculateTokens: mockTokenCalculatorCalculateTokens.mockReturnValue(100),
      calculateTotalTokens: jest.fn().mockResolvedValue(100 as number)
    };

    mockResponseProcessor = {
      processResponse: mockResponseProcessorProcessResponse.mockResolvedValue({
        content: "Hello, I'm an AI assistant",
        role: 'assistant'
      } as UniversalChatResponse)
    };

    mockRequestProcessor = {
      processRequest: jest.fn().mockResolvedValue(['test message'] as string[])
    };

    // Create a new LLMCaller instance with all our mocks
    llmCaller = new LLMCaller('openai', 'test-model', 'You are a helpful assistant', {
      providerManager: mockProviderManager,
      modelManager: mockModelManager,
      historyManager: mockHistoryManager,
      streamingService: mockStreamingService,
      toolsManager: mockToolsManager,
      chatController: mockChatController,
      retryManager: new RetryManager({ maxRetries: 3 }),
      tokenCalculator: mockTokenCalculator,
      responseProcessor: mockResponseProcessor,
      usageCallback: mockUsageCallback
    });

    // Set the request processor directly
    (llmCaller).requestProcessor = mockRequestProcessor;
  });

  // The tests themselves remain largely unchanged
  describe('setCallerId', () => {
    it('should update callerId and reinitialize controllers', () => {
      // Spy on reinitializeControllers
      const spy = jest.spyOn(llmCaller as any, 'reinitializeControllers');

      // Call the method
      llmCaller.setCallerId('new-caller-id');

      // Verify callerId was updated
      expect((llmCaller as any).callerId).toBe('new-caller-id');

      // Verify controllers were reinitialized
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('setUsageCallback', () => {
    it('should update usageCallback and reinitialize controllers', () => {
      // Spy on reinitializeControllers
      const spy = jest.spyOn(llmCaller as any, 'reinitializeControllers');

      // Create a new callback
      const newCallback = jest.fn()

      // Call the method
      llmCaller.setUsageCallback(newCallback);

      // Verify usageCallback was updated
      expect((llmCaller as any).usageCallback).toBe(newCallback);

      // Verify controllers were reinitialized
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateSettings', () => {
    it('should update settings without reinitializing controllers when maxRetries is unchanged', () => {
      // Spy on reinitializeControllers
      const spy = jest.spyOn(llmCaller as any, 'reinitializeControllers');

      // Call the method with settings that don't change maxRetries
      llmCaller.updateSettings({
        temperature: 0.5
      });

      // Verify settings were updated
      expect((llmCaller as any).initialSettings).toEqual({
        temperature: 0.5
      });

      // Verify controllers were NOT reinitialized
      expect(spy).not.toHaveBeenCalled();
    });

    it('should update settings and reinitialize controllers when maxRetries changes', () => {
      // Spy on reinitializeControllers
      const spy = jest.spyOn(llmCaller as any, 'reinitializeControllers');

      // Call the method with settings that change maxRetries
      llmCaller.updateSettings({
        maxRetries: 5,
        temperature: 0.7
      });

      // Verify settings were updated
      expect((llmCaller as any).initialSettings).toEqual({
        maxRetries: 5,
        temperature: 0.7
      });

      // Verify controllers were reinitialized
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('stream method', () => {
    it('should stream responses with JSON mode when model supports it', async () => {
      // Setup
      const mockJsonSchema = {
        schema: {} as JSONSchemaDefinition
      };

      // Mock the stream response
      const mockStreamResponse = async function* () {
        yield {
          content: '{"name":"John","age":30}',
          role: 'assistant',
          isComplete: true
        } as UniversalStreamResponse;
      }();
      mockStreamingService.createStream.mockResolvedValue(mockStreamResponse);

      // Call stream with JSON schema
      const stream = await llmCaller.stream('Get user info', {
        jsonSchema: mockJsonSchema
      });

      // Collect all chunks
      const results: UniversalStreamResponse[] = [];
      for await (const chunk of stream) {
        results.push(chunk);
      }

      // Verify
      expect(mockStreamingService.createStream).toHaveBeenCalledWith(
        expect.objectContaining({
          jsonSchema: mockJsonSchema,
          responseFormat: 'json'
        }),
        'test-model',
        undefined
      );

      // Verify the results
      expect(results.length).toBe(1);
      expect(results[0].content).toBe('{"name":"John","age":30}');
    });

    it('should use ChunkController when message is split into multiple chunks', async () => {
      // Setup
      mockRequestProcessor.processRequest.mockResolvedValue(['chunk1', 'chunk2']);

      // Spy on ChunkController.processChunks and processChunksParallel
      const mockProcessChunks = jest.fn().mockResolvedValue([
        { content: 'Response 1', role: 'assistant' },
        { content: 'Response 2', role: 'assistant' }] as UniversalChatResponse[]
      );
      const mockProcessChunksParallel = jest.fn().mockResolvedValue([
        { content: 'Response 1', role: 'assistant' },
        { content: 'Response 2', role: 'assistant' }] as UniversalChatResponse[]
      );
      (llmCaller as any).chunkController = {
        processChunks: mockProcessChunks,
        processChunksParallel: mockProcessChunksParallel
      };

      // Call stream with a message that gets split
      const stream = await llmCaller.stream('Complex message that needs chunking');

      // Collect all chunks
      const results: UniversalStreamResponse[] = [];
      for await (const chunk of stream) {
        results.push(chunk);
      }

      // Verify ChunkController was used (parallel chunking is enabled by default)
      expect(mockProcessChunksParallel).toHaveBeenCalledTimes(1);

      // Verify multiple responses were returned
      expect(results.length).toBe(2);
      expect(results[0].content).toBe('Response 1');
      expect(results[1].content).toBe('Response 2');
      expect(results[0].isComplete).toBe(false);
      expect(results[1].isComplete).toBe(true);
    });

    it('should reset history when using stateless history mode', async () => {
      // Set up spy on historyManager.initializeWithSystemMessage
      const initializeSpy = jest.spyOn(mockHistoryManager, 'initializeWithSystemMessage');

      // Mock the stream response
      const mockStreamResponse = async function* () {
        yield {
          content: 'Stateless response',
          role: 'assistant',
          isComplete: true
        } as UniversalStreamResponse;
      }();
      mockStreamingService.createStream.mockResolvedValue(mockStreamResponse);

      // Call stream with stateless mode
      const stream = llmCaller.stream('Test message', {
        historyMode: 'stateless' as HistoryMode
      });

      // Consume the stream to completion
      for await (const chunk of await stream) {
        // Just consume the chunks
      }

      // Verify history was initialized with system message
      expect(initializeSpy).toHaveBeenCalled();
    });
  });

  describe('setModel', () => {
    it('should update the model without provider change', () => {
      // Setup
      const initialModel = (llmCaller as any).model;
      const newModelName = 'gpt-4';
      mockModelManager.getModel.mockReturnValue({
        name: newModelName,
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 90,
          outputSpeed: 30,
          firstTokenLatency: 300
        },
        capabilities: {
          streaming: true,
          toolCalls: true,
          parallelToolCalls: true,
          batchProcessing: true,
          input: {
            text: true
          },
          output: {
            text: {
              textOutputFormats: ['text']
            }
          }
        }
      } as ModelInfo);

      // Execute
      llmCaller.setModel({ nameOrAlias: newModelName });

      // Verify
      expect((llmCaller as any).model).toBe(newModelName);
      expect(mockProviderManager.switchProvider).not.toHaveBeenCalled();
      expect(mockModelManager.getModel).toHaveBeenCalledWith(newModelName);
    });

    it('should update model and provider with provider change', async () => {
      // Setup
      const initialProvider = (llmCaller as any).provider;
      const initialModel = (llmCaller as any).model;
      const newProviderName = 'google' as RegisteredProviders;
      const newModelName = 'gemini-pro';
      const newApiKey = 'new-api-key';

      // Spy on reinitializeControllers
      const reinitSpy = jest.spyOn(llmCaller as any, 'reinitializeControllers');

      // Simply mock the getModel call for the provider change
      mockModelManager.getModel.mockReturnValue({
        name: newModelName,
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 95,
          outputSpeed: 25,
          firstTokenLatency: 350
        }
      } as ModelInfo);

      // Execute
      llmCaller.setModel({
        nameOrAlias: newModelName,
        provider: newProviderName,
        apiKey: newApiKey
      });

      // Verify
      expect((llmCaller as any).model).toBe(newModelName);
      expect(mockProviderManager.switchProvider).toHaveBeenCalledWith(newProviderName, newApiKey);
      expect(reinitSpy).toHaveBeenCalled();
    });

    it('should throw an error when model is not found', () => {
      // Setup
      const nonExistentModel = 'non-existent-model';
      mockModelManager.getModel.mockReturnValue(undefined);

      // Execute & Verify
      expect(() => {
        llmCaller.setModel({ nameOrAlias: nonExistentModel });
      }).toThrow(`Model ${nonExistentModel} not found in provider openai`);
    });
  });

  describe('JSON schema handling', () => {
    it('should handle JSON schema in stream calls', async () => {
      // Setup
      const jsonSchema = {
        schema: {} as JSONSchemaDefinition
      };

      // Mock the stream response with JSON content
      const mockStreamResponse = async function* () {
        yield {
          content: '{"name":"John","age":30}',
          role: 'assistant',
          contentObject: { name: 'John', age: 30 },
          isComplete: true
        } as UniversalStreamResponse;
      }();
      mockStreamingService.createStream.mockResolvedValue(mockStreamResponse);

      // Call stream with JSON schema
      const stream = await llmCaller.stream('Get user info', {
        jsonSchema: jsonSchema
      });

      // Collect all chunks
      const results: UniversalStreamResponse[] = [];
      for await (const chunk of stream) {
        results.push(chunk);
      }

      // Verify the results include the JSON content and object
      expect(results.length).toBe(1);
      expect(results[0].content).toBe('{"name":"John","age":30}');
      expect(results[0].contentObject).toEqual({ name: 'John', age: 30 });

      // Verify createStream was called with jsonSchema
      expect(mockStreamingService.createStream).toHaveBeenCalledWith(
        expect.objectContaining({
          jsonSchema: jsonSchema,
          responseFormat: 'json'
        }),
        'test-model',
        undefined
      );
    });
  });

  describe('model management methods', () => {
    it('should delegate getAvailableModels to ModelManager', () => {
      // Setup
      const mockModels = [
        { name: 'model1', inputPricePerMillion: 0.01, outputPricePerMillion: 0.02 },
        { name: 'model2', inputPricePerMillion: 0.02, outputPricePerMillion: 0.03 }] as
        ModelInfo[];
      mockModelManager.getAvailableModels.mockReturnValue(mockModels);

      // Execute
      const result = llmCaller.getAvailableModels();

      // Verify
      expect(mockModelManager.getAvailableModels).toHaveBeenCalled();
      expect(result).toEqual(mockModels);
    });

    it('should delegate addModel to ModelManager', () => {
      // Setup
      const newModel = {
        name: 'new-model',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 85,
          outputSpeed: 40,
          firstTokenLatency: 400
        }
      } as ModelInfo;

      // Execute
      llmCaller.addModel(newModel);

      // Verify
      expect(mockModelManager.addModel).toHaveBeenCalledWith(newModel);
    });

    it('should delegate getModel to ModelManager', () => {
      // Setup
      const modelName = 'gpt-4';
      const mockModel = {
        name: modelName,
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 90,
          outputSpeed: 35,
          firstTokenLatency: 350
        }
      } as ModelInfo;
      mockModelManager.getModel.mockReturnValue(mockModel);

      // Execute
      const result = llmCaller.getModel(modelName);

      // Verify
      expect(mockModelManager.getModel).toHaveBeenCalledWith(modelName);
      expect(result).toEqual(mockModel);
    });

    it('should delegate updateModel to ModelManager', () => {
      // Setup
      const modelName = 'gpt-4';
      const updates = {
        inputPricePerMillion: 0.015,
        characteristics: {
          qualityIndex: 95,
          outputSpeed: 35,
          firstTokenLatency: 350
        }
      };

      // Execute
      llmCaller.updateModel(modelName, updates);

      // Verify
      expect(mockModelManager.updateModel).toHaveBeenCalledWith(modelName, updates);
    });
  });
});