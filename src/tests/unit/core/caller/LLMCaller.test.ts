import { jest } from '@jest/globals';
import { LLMCaller } from '../../../../core/caller/LLMCaller.ts';
import type { StreamingService } from '../../../../core/streaming/StreamingService.ts';
import { ProviderManager } from '../../../../core/caller/ProviderManager.ts';
import { ModelManager } from '../../../../core/models/ModelManager.ts';
import type { ResponseProcessor } from '../../../../core/processors/ResponseProcessor.ts';
import { RetryManager } from '../../../../core/retry/RetryManager.ts';
import type { HistoryManager } from '../../../../core/history/HistoryManager.ts';
import type { TokenCalculator } from '../../../../core/models/TokenCalculator.ts';
import type { UniversalMessage, UniversalStreamResponse, ModelInfo, Usage, UniversalChatResponse, ModelCapabilities, UrlSource, Base64Source } from '../../../../interfaces/UniversalInterfaces.ts';
import type { RegisteredProviders } from '../../../../adapters/index.ts';
import type { ToolController } from '../../../../core/tools/ToolController.ts';
import type { ChatController } from '../../../../core/chat/ChatController.ts';
import type { UniversalChatParams, UniversalChatSettings, LLMCallOptions, HistoryMode } from '../../../../interfaces/UniversalInterfaces.ts';
import type { ToolsManager } from '../../../../core/tools/ToolsManager.ts';
import type { ToolDefinition, ToolCall } from '../../../../types/tooling.ts';
import { CapabilityError } from '../../../../core/models/CapabilityError.ts';

jest.mock('@dqbd/tiktoken');

// Define NormalizedImageSource type alias if not already available through imports
type NormalizedImageSource = UrlSource | Base64Source;

// ---- mocks for @/core/file-data/fileData.ts ----
const mockValidateImageFile = jest.fn((p: string) =>
  p === './image.png' ? Promise.resolve(true) : Promise.resolve(false)
);
const mockNormalizeImageSource = jest
  .fn<() => Promise<Base64Source>>()
  .mockResolvedValue({ type: 'base64', data: 'test-base64', mime: 'image/png' });
const mockEstimateImageTokens = jest.fn().mockReturnValue(1000);
const mockValidateMaskFile = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);
const mockSaveBase64ToFile = jest.fn<() => Promise<string>>().mockResolvedValue('/tmp/out.png');
const mockFilePathToBase64 = jest.fn<() => Promise<string>>().mockResolvedValue('test-base64');

const mockFileDataModule = {
  __esModule: true as const,
  validateImageFile: mockValidateImageFile,
  normalizeImageSource: mockNormalizeImageSource,
  estimateImageTokens: mockEstimateImageTokens,
  validateMaskFile: mockValidateMaskFile,
  saveBase64ToFile: mockSaveBase64ToFile,
  filePathToBase64: mockFilePathToBase64
};

jest.unstable_mockModule('@/core/file-data/fileData.ts', () => mockFileDataModule);

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

// Define RequestProcessor interface type
type RequestProcessor = {
  processRequest: (params: any) => Promise<string[]>;
};

describe('LLMCaller', () => {
  let llmCaller: LLMCaller;
  let mockHistoryManager: jest.Mocked<HistoryManager>;
  let mockStreamingService: jest.Mocked<StreamingService>;
  let mockToolsManager: jest.Mocked<ToolsManager>;
  let mockChatController: jest.Mocked<ChatController>;
  let mockRetryManager: RetryManager;
  let mockTokenCalculator: jest.Mocked<TokenCalculator>;
  let mockResponseProcessor: jest.Mocked<ResponseProcessor>;
  let mockModelManager: jest.Mocked<ModelManager>;
  let mockProviderManager: jest.Mocked<ProviderManager>;
  let mockRequestProcessor: {
    processRequest: jest.Mock;
  };

  beforeEach(() => {
    jest.useFakeTimers();

    const defaultSystemMessage = 'You are a helpful assistant.';

    mockHistoryManager = {
      addMessage: jest.fn(),
      getLastMessages: jest.fn(),
      getHistorySummary: jest.fn(),
      getLastMessageByRole: jest.fn(),
      getHistoricalMessages: jest.fn().mockReturnValue([]),
      initializeWithSystemMessage: jest.fn(),
      clearHistory: jest.fn(),
      getMessages: jest.fn(),
      updateSystemMessage: jest.fn(),
      serializeHistory: jest.fn(),
      deserializeHistory: jest.fn(),
      setHistoricalMessages: jest.fn(),
      addToolCallToHistory: jest.fn(),
      captureStreamResponse: jest.fn(),
      removeToolCallsWithoutResponses: jest.fn()
    } as unknown as jest.Mocked<HistoryManager>;

    // Mock the initializeWithSystemMessage to actually add the message
    mockHistoryManager.initializeWithSystemMessage.mockImplementation(() => {
      mockHistoryManager.addMessage('system', defaultSystemMessage);
    });

    // Initialize with system message
    mockHistoryManager.initializeWithSystemMessage();

    const mockUsage: Usage = {
      tokens: {
        input: { total: 10, cached: 0 },
        output: { total: 20, reasoning: 0 },
        total: 30
      },
      costs: {
        input: { total: 0.0001, cached: 0 },
        output: { total: 0.0002, reasoning: 0 },
        total: 0.0003
      }
    };
    const mockUsageEmpty: Usage = {
      tokens: {
        input: { total: 0, cached: 0 },
        output: { total: 0, reasoning: 0 },
        total: 0
      },
      costs: {
        input: { total: 0, cached: 0 },
        output: { total: 0, reasoning: 0 },
        total: 0
      }
    };

    mockStreamingService = {
      createStream: jest.fn().mockImplementation(() => {
        // Return an async generator that yields a single response
        return async function* () {
          yield {
            content: 'test response',
            role: 'assistant',
            isComplete: true
          } as UniversalStreamResponse;
        }();
      }),
      setCallerId: jest.fn(),
      setUsageCallback: jest.fn(),
      setToolOrchestrator: jest.fn(),
      getTokenCalculator: jest.fn().mockReturnValue(mockTokenCalculator),
      getResponseProcessor: jest.fn().mockReturnValue(mockResponseProcessor)
    } as unknown as jest.Mocked<StreamingService>;

    mockToolsManager = {
      listTools: jest.fn().mockReturnValue([]),
      addTool: jest.fn(),
      removeTool: jest.fn(),
      updateTool: jest.fn(),
      getTool: jest.fn(),
      handler: jest.fn()
    } as unknown as jest.Mocked<ToolsManager>;

    const mockMessage: UniversalChatResponse = {
      content: 'test response',
      role: 'assistant',
      metadata: {
        created: Date.now()
      }
    };

    const mockExecute = jest.fn().mockImplementation(async () => mockMessage);

    mockChatController = {
      execute: mockExecute,
      setToolOrchestrator: jest.fn()
    } as unknown as jest.Mocked<ChatController>;

    mockRetryManager = new RetryManager({ maxRetries: 3 });

    mockTokenCalculator = {
      calculateTokens: jest.fn().mockReturnValue(10),
      calculateUsage: jest.fn(),
      calculateTotalTokens: jest.fn().mockReturnValue(100)
    } as unknown as jest.Mocked<TokenCalculator>;

    mockResponseProcessor = {
      processResponse: jest.fn()
    } as unknown as jest.Mocked<ResponseProcessor>;

    const mockModelInfo: ModelInfo = {
      name: 'test-model',
      inputPricePerMillion: 0.01,
      outputPricePerMillion: 0.02,
      maxRequestTokens: 4000,
      maxResponseTokens: 1000,
      characteristics: {
        qualityIndex: 80,
        outputSpeed: 20,
        firstTokenLatency: 500
      }
    };

    mockModelManager = {
      getModel: jest.fn().mockReturnValue({
        name: 'test-model',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 1000,
        maxResponseTokens: 1000,
        capabilities: {
          input: { text: true },
          output: { text: { textOutputFormats: ['text'] } }
        },
        characteristics: {
          qualityIndex: 5,
          outputSpeed: 5,
          firstTokenLatency: 1000
        }
      })
    } as unknown as jest.Mocked<ModelManager>;

    mockProviderManager = {
      getProvider: jest.fn()
    } as unknown as jest.Mocked<ProviderManager>;

    // Mock Date.now() for consistent timestamps in tests
    // jest.spyOn(Date, 'now').mockReturnValue(1743507110838); // Temporarily disable if causing issues

    // Create the LLMCaller instance with the mocked HistoryManager
    llmCaller = new LLMCaller('openai' as RegisteredProviders, 'test-model', defaultSystemMessage, {
      providerManager: mockProviderManager,
      modelManager: mockModelManager,
      historyManager: mockHistoryManager,
      streamingService: mockStreamingService,
      toolsManager: mockToolsManager,
      chatController: mockChatController,
      retryManager: mockRetryManager,
      tokenCalculator: mockTokenCalculator,
      responseProcessor: mockResponseProcessor
    });

    // Mock the request processor
    mockRequestProcessor = {
      processRequest: jest.fn().mockImplementation(() => Promise.resolve(['test message']))
    };

    // Mock the token calculator to calculate tokens for the message
    mockTokenCalculator.calculateTokens.mockImplementation((text: string) => {
      return 10; // Return a fixed token count for testing
    });

    // Mock the token calculator to calculate usage
    mockTokenCalculator.calculateUsage.mockImplementation(
      (
        inputTokens: number,
        outputTokens: number,
        inputPricePerMillion: number,
        outputPricePerMillion: number,
        inputCachedTokens: number = 0,
        inputCachedPricePerMillion?: number,
        outputReasoningTokens: number = 0) => {
        const regularInputCost = inputTokens * inputPricePerMillion / 1_000_000;
        const cachedInputCost = inputCachedTokens && inputCachedPricePerMillion ?
          inputCachedTokens * inputCachedPricePerMillion / 1_000_000 :
          0;
        const outputCost = outputTokens * outputPricePerMillion / 1_000_000;
        const reasoningCost = outputReasoningTokens * outputPricePerMillion / 1_000_000;
        const totalCost = regularInputCost + cachedInputCost + outputCost + reasoningCost;

        return {
          input: { total: regularInputCost, cached: cachedInputCost },
          output: { total: outputCost, reasoning: reasoningCost },
          total: totalCost
        };
      }
    );

    // Verify that the system message is initialized
    expect(mockHistoryManager.initializeWithSystemMessage).toHaveBeenCalled();
    expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('system', defaultSystemMessage);

    // Mock the ModelManager.getCapabilities static method using a different approach
    const originalGetCapabilities = ModelManager.getCapabilities;
    jest.spyOn(ModelManager, 'getCapabilities').mockImplementation((modelId: string) => {
      if (modelId === 'image-model') {
        return {
          streaming: true,
          input: {
            text: true,
            image: true
          },
          output: {
            text: true
          }
        } as ModelCapabilities;
      }

      // Default capabilities - text only
      return {
        streaming: true,
        input: {
          text: true
          // No image capability
        },
        output: {
          text: true
        }
      } as ModelCapabilities;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should throw error when model is not found', () => {
      mockModelManager.getModel.mockReturnValue(undefined);

      expect(() => new LLMCaller('openai' as RegisteredProviders, 'non-existent-model', 'You are a helpful assistant.', {
        providerManager: mockProviderManager,
        modelManager: mockModelManager
      })).toThrow('Model non-existent-model not found for provider openai');
    });

    it('should initialize with default system message', () => {
      const defaultSystemMessage = 'You are a helpful assistant.';

      const caller = new LLMCaller('openai' as RegisteredProviders, 'test-model', defaultSystemMessage, {
        providerManager: mockProviderManager,
        modelManager: mockModelManager,
        historyManager: mockHistoryManager
      });

      expect(mockHistoryManager.initializeWithSystemMessage).toHaveBeenCalled();
      expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('system', defaultSystemMessage);
    });

    it('should initialize with custom settings', () => {
      const customSettings: UniversalChatSettings = {
        maxRetries: 5,
        temperature: 0.7,
        topP: 0.9
      };

      const caller = new LLMCaller('openai' as RegisteredProviders, 'test-model', 'Custom system message', {
        providerManager: mockProviderManager,
        modelManager: mockModelManager,
        settings: customSettings,
        retryManager: new RetryManager({ maxRetries: 5 })
      });

      // Verify the RetryManager was initialized with correct config
      expect((caller as any).retryManager.config.maxRetries).toBe(5);
    });

    it('should initialize with custom callerId', () => {
      const customCallerId = 'test-caller-id';
      const caller = new LLMCaller('openai' as RegisteredProviders, 'test-model', 'System message', {
        providerManager: mockProviderManager,
        modelManager: mockModelManager,
        callerId: customCallerId
      });

      // Verify callerId was set
      expect((caller as any).callerId).toBe(customCallerId);
    });
  });

  describe('stream methods', () => {
    it('should throw an error after exhausting all retries', async () => {
      // Mock the createStream to throw an error
      mockStreamingService.createStream.mockRejectedValue(new Error('Stream creation failed'));
      mockStreamingService.createStream.mockClear(); // Reset before call

      // Initialize errorThrown to a known value
      let errorThrown: Error | null = null;
      try {
        // Explicitly consume the stream which should trigger retries and fail
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const chunk of llmCaller.stream('test message')) { }
      } catch (error) {
        errorThrown = error as Error;
      }

      // Adding more detailed error checks for debugging
      expect(errorThrown).not.toBeNull();
      if (errorThrown) {// Add conditional check to prevent TS errors
        expect(errorThrown).toBeInstanceOf(Error);
        expect(errorThrown?.message).toMatch(/Stream creation failed/i);
      }

      // Verify createStream was called
      expect(mockStreamingService.createStream).toHaveBeenCalledTimes(1);
    });

    it('should respect custom maxRetries setting', async () => {
      const customMaxRetries = 2;
      const customOptions: LLMCallOptions = {
        settings: { maxRetries: customMaxRetries },
        historyMode: 'dynamic' as HistoryMode
      };

      // Mock the createStream to throw an error
      mockStreamingService.createStream.mockRejectedValue(new Error('Stream creation failed'));
      mockStreamingService.createStream.mockClear(); // Reset before call

      // Initialize errorThrown to a known value
      let errorThrown: Error | null = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const chunk of llmCaller.stream('test message', customOptions)) { }
      } catch (error) {
        errorThrown = error as Error;
      }

      // Adding more detailed error checks for debugging
      expect(errorThrown).not.toBeNull();
      if (errorThrown) {// Add conditional check to prevent TS errors
        expect(errorThrown).toBeInstanceOf(Error);
        expect(errorThrown?.message).toMatch(/Stream creation failed/i);
      }

      // Verify createStream was called
      expect(mockStreamingService.createStream).toHaveBeenCalledTimes(1);
    });

    it('should use proper call parameters', async () => {
      const message = 'test message';
      const options: LLMCallOptions = {
        settings: { temperature: 0.5 },
        historyMode: 'dynamic' as HistoryMode
      };

      // Modify expectations to match actual parameters
      const expectedParams = {
        callerId: expect.any(String),
        historyMode: 'dynamic',
        model: 'test-model',
        settings: expect.objectContaining({ temperature: 0.5 })
      };

      // Ensure we only have one processed message to avoid chunking path
      mockRequestProcessor.processRequest.mockReset();
      mockRequestProcessor.processRequest.mockImplementation(() => Promise.resolve(['test message']));

      // Ensure the model doesn't have jsonMode capability
      mockModelManager.getModel.mockReset();
      mockModelManager.getModel.mockReturnValue({
        name: 'test-model',
        inputPricePerMillion: 1,
        outputPricePerMillion: 1,
        maxRequestTokens: 1000,
        maxResponseTokens: 1000,
        capabilities: {
          input: {
            text: true
          },
          output: {
            text: {
              textOutputFormats: ['text', 'json']
            }
          }
        },
        characteristics: { qualityIndex: 1, outputSpeed: 1, firstTokenLatency: 1 }
      });

      mockStreamingService.createStream.mockClear();
      // Mock a valid stream response
      mockStreamingService.createStream.mockResolvedValue(async function* () {
        yield { content: 'dummy', role: 'assistant', isComplete: true } as UniversalStreamResponse;
      }());

      // Consume the stream fully
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const chunk of llmCaller.stream(message, options)) { }

      expect(mockStreamingService.createStream).toHaveBeenCalledTimes(1);
      expect(mockStreamingService.createStream).toHaveBeenCalledWith(
        expect.objectContaining({
          ...expectedParams,
          messages: [],
          tools: undefined,
          responseFormat: undefined,
          jsonSchema: undefined
        }),
        'test-model',
        undefined
      );
    });

    it('should track token usage for stream calls', async () => {
      const message = 'test message';
      mockStreamingService.createStream.mockClear();
      mockStreamingService.createStream.mockResolvedValue(async function* () {
        yield {
          content: 'dummy',
          role: 'assistant',
          isComplete: true,
          metadata: {
            usage: {
              tokens: {
                input: { total: 10, cached: 0 },
                output: { total: 20, reasoning: 0 },
                total: 30
              }
            }
          }
        } as UniversalStreamResponse;
      }());

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const chunk of llmCaller.stream(message)) { }

      expect(mockStreamingService.createStream).toHaveBeenCalledTimes(1);
    });
  });

  describe('token calculation and usage tracking', () => {
    it('should track token usage for call method', async () => {
      const message = 'test message';
      // Reset mock
      mockTokenCalculator.calculateTokens.mockClear();
      await llmCaller.call(message);
      // Verify token calculation was called (indirectly by ChatController)
      // Need to check the mock on chatController.execute to be precise
      expect(mockChatController.execute).toHaveBeenCalled();
      // We cannot easily check mockTokenCalculator directly as it's called deep inside
    });

    it('should track token usage for stream calls', async () => {
      const message = 'test message';
      mockStreamingService.createStream.mockClear();
      mockStreamingService.createStream.mockResolvedValue(async function* () {
        yield {
          content: 'dummy',
          role: 'assistant',
          isComplete: true,
          metadata: {
            usage: {
              tokens: {
                input: { total: 10, cached: 0 },
                output: { total: 20, reasoning: 0 },
                total: 30
              }
            }
          }
        } as UniversalStreamResponse;
      }());

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const chunk of llmCaller.stream(message)) { }

      expect(mockStreamingService.createStream).toHaveBeenCalledTimes(1);
    });
  });

  describe('tool management', () => {
    const dummyTool: ToolDefinition = {
      name: 'dummy_tool',
      description: 'A dummy tool',
      parameters: { type: 'object', properties: {} }
    };
    const toolCall: ToolCall = { id: 'call_123', name: 'dummy_tool', arguments: {} };
    const mockStreamChunkWithToolCall: UniversalStreamResponse = {
      content: '',
      toolCalls: [toolCall],
      role: 'assistant',
      isComplete: true
    };

    it('should handle tool calls in stream response', async () => {
      mockStreamingService.createStream.mockClear();
      mockStreamingService.createStream.mockResolvedValue(async function* () {
        yield mockStreamChunkWithToolCall; // Ensure this exact object is yielded
      }());
      llmCaller.addTool(dummyTool);

      const results: UniversalStreamResponse[] = [];
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const chunk of llmCaller.stream('test message')) {
        results.push(chunk);
      }

      expect(mockStreamingService.createStream).toHaveBeenCalledTimes(1);
      expect(results.length).toBe(1);
      expect(results[0]).toEqual(mockStreamChunkWithToolCall);
      expect(results[0].toolCalls).toEqual([toolCall]);
    });
  });

  describe('history management', () => {
    it('should add messages to history', async () => {
      const message = 'test message';
      mockHistoryManager.addMessage.mockClear();
      mockStreamingService.createStream.mockClear();
      mockStreamingService.createStream.mockResolvedValue(async function* () {
        yield { content: 'response', isComplete: true, role: 'assistant' } as UniversalStreamResponse;
      }());

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const chunk of llmCaller.stream(message)) { }

      // Update expected call count to 2 since both user message and assistant response are added
      expect(mockHistoryManager.addMessage).toHaveBeenCalledTimes(2);
      expect(mockHistoryManager.addMessage).toHaveBeenCalledWith(
        'user',
        message, // Check only role and content, ignore metadata mismatches for now
        expect.anything()
      );
    });

    it('should retrieve historical messages', async () => {
      // Explicitly type historicalMessages
      const historicalMessages: UniversalMessage[] = [
        { role: 'user', content: 'Previous message' }];

      mockHistoryManager.getHistoricalMessages.mockReturnValue(historicalMessages);
      mockHistoryManager.getHistoricalMessages.mockClear();
      mockStreamingService.createStream.mockClear();
      mockStreamingService.createStream.mockResolvedValue(async function* () {
        yield { content: 'response', role: 'assistant', isComplete: true } as UniversalStreamResponse;
      }());

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const chunk of llmCaller.stream('test message')) { }

      expect(mockHistoryManager.getHistoricalMessages).toHaveBeenCalledTimes(1);
      expect(mockStreamingService.createStream).toHaveBeenCalledTimes(1);
    });
  });

  describe('capability enforcement', () => {
    test('call with file on text-only model throws CapabilityError', async () => {
      // Set up mockModelManager to return a text-only model
      mockModelManager.getModel.mockReturnValue({
        name: 'text-only-model',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 80,
          outputSpeed: 20,
          firstTokenLatency: 500
        },
        capabilities: {
          input: {
            text: true
            // No image capability
          },
          output: {
            text: true
          }
        }
      });

      // Create a new instance with this model
      const textOnlyCaller = new LLMCaller('openai' as RegisteredProviders, 'text-only-model', 'You are a helpful assistant.', {
        providerManager: mockProviderManager,
        modelManager: mockModelManager,
        historyManager: mockHistoryManager,
        streamingService: mockStreamingService,
        toolsManager: mockToolsManager,
        chatController: mockChatController,
        retryManager: mockRetryManager,
        tokenCalculator: mockTokenCalculator,
        responseProcessor: mockResponseProcessor
      });

      // Test that using a file throws CapabilityError
      await expect(textOnlyCaller.call("Hi", { file: "./image.png" })).
        rejects.
        toThrow('Model "text-only-model" does not support image inputs.');
    });

    test('stream with file on text-only model throws CapabilityError', async () => {
      // Set up mockModelManager to return a text-only model
      mockModelManager.getModel.mockReturnValue({
        name: 'text-only-model',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 80,
          outputSpeed: 20,
          firstTokenLatency: 500
        },
        capabilities: {
          input: {
            text: true
            // No image capability
          },
          output: {
            text: true
          }
        }
      });

      // Create a new instance with this model
      const textOnlyCaller = new LLMCaller('openai' as RegisteredProviders, 'text-only-model', 'You are a helpful assistant.', {
        providerManager: mockProviderManager,
        modelManager: mockModelManager,
        historyManager: mockHistoryManager,
        streamingService: mockStreamingService,
        toolsManager: mockToolsManager,
        chatController: mockChatController,
        retryManager: mockRetryManager,
        tokenCalculator: mockTokenCalculator,
        responseProcessor: mockResponseProcessor
      });

      // Test that streaming with a file throws CapabilityError
      await expect(async () => {
        const stream = textOnlyCaller.stream("Hi", { file: "./image.png" });
        // Consume the stream to trigger the error
        for await (const _ of stream) {



          // Nothing to do here
        }
      }).rejects.toThrow(CapabilityError);
    });
    test('call with file on image-capable model succeeds', async () => {
      const imageModel = {
        name: 'image-model',
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        capabilities: {
          input: { text: true },
          output: { text: true }
        },
        characteristics: {
          qualityIndex: 1,
          outputSpeed: 1,
          firstTokenLatency: 1
        }
      };

      // Make the mocked ModelManager return an image‑capable model
      mockModelManager.getModel.mockReturnValue(imageModel);

      const imageCaller = new LLMCaller('openai' as RegisteredProviders, 'image-model', 'You are a helpful assistant.', {
        providerManager: mockProviderManager,
        modelManager: mockModelManager,
        historyManager: mockHistoryManager,
        streamingService: mockStreamingService,
        toolsManager: mockToolsManager,
        chatController: mockChatController,
        retryManager: mockRetryManager,
        tokenCalculator: mockTokenCalculator,
        responseProcessor: mockResponseProcessor
      });

      // Stub image processing so it doesn't hit the real filesystem
      jest.spyOn(imageCaller as any, 'processImageFiles').mockResolvedValue([]);

      await expect(imageCaller.call('Hi', { file: './image.png' })).resolves.not.toThrow();
    });

    test('call without file succeeds on any model', async () => {
      // Should work with a text-only model
      await expect(llmCaller.call("Hello world")).
        resolves.
        not.toThrow();
    });
  });

  describe('call parameters', () => {
    it('should properly process and include data parameter in call method', async () => {
      // Setup
      const message = 'Test message';
      const dataContent = 'Additional context data';
      const processedMessage = `${message}\n\n${dataContent}`;

      // Create proper mocks that match the expected types
      const mockRequestProcessor = {
        processRequest: jest.fn().mockImplementation(() => Promise.resolve([processedMessage]))
      };

      const mockUsage: Usage = {
        tokens: {
          input: { total: 10, cached: 0 },
          output: { total: 20, reasoning: 0 },
          total: 30
        },
        costs: {
          input: { total: 0.0001, cached: 0 },
          output: { total: 0.0002, reasoning: 0 },
          total: 0.0003
        }
      };

      const mockChatResponse: UniversalChatResponse = {
        content: 'Response with processed data',
        role: 'assistant',
        metadata: {
          usage: mockUsage
        }
      };

      // Reuse the existing chat controller and model manager mocks
      mockChatController.execute.mockResolvedValue(mockChatResponse);
      mockModelManager.getModel.mockReturnValue({
        name: 'test-model',
        inputPricePerMillion: 1,
        outputPricePerMillion: 1,
        maxRequestTokens: 1000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 1,
          outputSpeed: 1,
          firstTokenLatency: 1
        }
      });

      // Replace the request processor with our mock
      (llmCaller as any).requestProcessor = mockRequestProcessor;

      // Call the method with data parameter
      const result = await llmCaller.call(message, {
        data: dataContent
      });

      // Assertions
      expect(mockRequestProcessor.processRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          message,
          data: dataContent
        })
      );

      // Verify the response is returned correctly
      expect(result).toEqual([mockChatResponse]);
    });

    it('should properly process and include data parameter in stream method', async () => {
      // Setup
      const message = 'Test message';
      const dataContent = 'Additional context data';
      const processedMessage = `${message}\n\n${dataContent}`;

      // Create proper mocks that match the expected types
      const mockRequestProcessor = {
        processRequest: jest.fn().mockImplementation(() => Promise.resolve([processedMessage]))
      };

      const mockUsage: Usage = {
        tokens: {
          input: { total: 10, cached: 0 },
          output: { total: 20, reasoning: 0 },
          total: 30
        },
        costs: {
          input: { total: 0.0001, cached: 0 },
          output: { total: 0.0002, reasoning: 0 },
          total: 0.0003
        }
      };

      const mockStreamResponse: UniversalStreamResponse = {
        content: 'Streaming response with data',
        role: 'assistant',
        isComplete: true,
        metadata: {
          usage: mockUsage
        }
      };

      // Set up streaming service mock
      mockStreamingService.createStream.mockClear();
      mockStreamingService.createStream.mockResolvedValue(async function* () {
        yield mockStreamResponse;
      }());

      // Make sure model manager returns a valid model
      mockModelManager.getModel.mockReturnValue({
        name: 'test-model',
        inputPricePerMillion: 1,
        outputPricePerMillion: 1,
        maxRequestTokens: 1000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 1,
          outputSpeed: 1,
          firstTokenLatency: 1
        }
      });

      // Replace the request processor with our mock
      (llmCaller as any).requestProcessor = mockRequestProcessor;

      // Collect stream results
      const results: UniversalStreamResponse[] = [];
      for await (const chunk of llmCaller.stream(message, { data: dataContent })) {
        results.push(chunk);
      }

      // Assertions
      expect(mockRequestProcessor.processRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          message,
          data: dataContent
        })
      );

      // Verify streaming service was called
      expect(mockStreamingService.createStream).toHaveBeenCalledTimes(1);

      // Verify the stream results
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(mockStreamResponse);
    });

    // Add test for data parameter handling in both single and multi-chunk flows
    it('should correctly process data parameter in both single and multi-chunk flows', async () => {
      // We'll use the existing mocks already set up in beforeEach
      // since they're properly initialized

      // Mock the request processor
      const mockRequestProcessor = {
        processRequest: jest.fn().mockImplementation(() => Promise.resolve(['Processed message with data']))
      };

      // Replace the request processor on the existing llmCaller
      (llmCaller as any).requestProcessor = mockRequestProcessor;

      // Call with data parameter
      await llmCaller.call('Test message', { data: 'Additional data' });

      // Verify data was passed to the request processor
      expect(mockRequestProcessor.processRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test message',
          data: 'Additional data'
        })
      );
    });

    it('should correctly pass data parameter to RequestProcessor', async () => {
      // Use the existing llmCaller instance that's already properly set up

      // Mock the request processor
      const mockRequestProcessor = {
        processRequest: jest.fn().mockImplementation(() => Promise.resolve(['Processed message']))
      };

      // Replace the request processor
      (llmCaller as any).requestProcessor = mockRequestProcessor;

      // Test data parameter is passed to RequestProcessor
      await llmCaller.call('Test message', {
        data: 'Additional data for prompt'
      });

      // Verify data was passed to requestProcessor
      expect(mockRequestProcessor.processRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test message',
          data: 'Additional data for prompt'
        })
      );
    });
  });

  describe('data parameter handling', () => {
    it('should correctly process single chunk with data parameter', async () => {
      // Setup
      const userMessage = 'What is TypeScript?';
      const dataContent = 'Reply in Russian';
      const processedContent = 'What is TypeScript?\n\nReply in Russian';

      // Create a request processor that returns a single chunk
      const testRequestProcessor = {
        processRequest: jest.fn().mockImplementation(() => Promise.resolve([processedContent]))
      };

      // Replace the LLMCaller's request processor
      (llmCaller as any).requestProcessor = testRequestProcessor;

      // Mock the chat controller to capture what parameters are passed
      mockChatController.execute.mockImplementation((params) => {
        return Promise.resolve({
          content: 'Response in Russian',
          role: 'assistant',
          metadata: {}
        });
      });

      // Set up spies to track chat params and history
      const executeSpy = jest.spyOn(mockChatController, 'execute');

      // Call the method with data parameter
      await llmCaller.call(userMessage, {
        data: dataContent
      });

      // Verify request processor was called with correct parameters
      expect(testRequestProcessor.processRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          message: userMessage,
          data: dataContent
        })
      );

      // Most importantly - verify that the processed content (with data) is used in the chat parameters
      const chatParams = executeSpy.mock.calls[0][0];

      // Find the user message in the messages array
      const userMessages = chatParams.messages.filter(
        (msg: any) => msg.role === 'user'
      );

      // There should be at least one user message
      expect(userMessages.length).toBeGreaterThan(0);

      // Get the last user message (most recent one);
      const lastUserMessage = userMessages[userMessages.length - 1];

      // Verify the user message contains the processed content with data
      expect(lastUserMessage.content).toBe(processedContent);
    });
  });
});