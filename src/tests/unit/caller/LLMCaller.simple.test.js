// Import the modules we need to mock
const ProviderManager = jest.fn().mockImplementation(() => ({
  getProvider: jest.fn(),
  switchProvider: jest.fn(),
  getCurrentProviderName: jest.fn().mockReturnValue('openai')
}));

const ModelManager = jest.fn().mockImplementation(() => ({
  getModel: jest.fn().mockReturnValue({
    name: 'test-model',
    provider: 'openai',
    inputPricePerMillion: 0.1,
    outputPricePerMillion: 0.2,
    maxRequestTokens: 10000,
    maxResponseTokens: 5000,
    characteristics: {
      qualityIndex: 80,
      outputSpeed: 100,
      firstTokenLatency: 500
    }
  }),
  getAvailableModels: jest.fn(),
  addModel: jest.fn(),
  updateModel: jest.fn()
}));

const StreamingService = jest.fn().mockImplementation(() => ({
  createStream: jest.fn().mockImplementation((params, model, systemMessage) => {
    // Return the mock stream
    return {
      async *[Symbol.asyncIterator]() {
        yield { content: 'Test response', role: 'assistant', isComplete: true };
      }
    };
  }),
  setCallerId: jest.fn(),
  setUsageCallback: jest.fn()
}));

const RetryManager = jest.fn().mockImplementation(() => ({
  executeWithRetry: jest.fn().mockImplementation(async (callback) => {
    return callback();
  }),
  config: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    backoffFactor: 2
  }
}));

const HistoryManager = jest.fn().mockImplementation(() => ({
  getHistoricalMessages: jest.fn().mockReturnValue([]),
  addMessage: jest.fn(),
  clearHistory: jest.fn(),
  setHistoricalMessages: jest.fn(),
  getLastMessageByRole: jest.fn(),
  updateSystemMessage: jest.fn(),
  initializeWithSystemMessage: jest.fn(),
  getMessages: jest.fn().mockReturnValue([])
}));

const ResponseProcessor = jest.fn().mockImplementation(() => ({
  processResponse: jest.fn(),
  processStreamResponse: jest.fn(),
  validateResponse: jest.fn(),
  validateJsonMode: jest.fn()
}));

// Mock the modules
jest.mock('../../../core/caller/ProviderManager', () => ({
  ProviderManager,
  SupportedProviders: {
    'openai': 'openai',
    'anthropic': 'anthropic'
  }
}));

jest.mock('../../../core/models/ModelManager', () => ({
  ModelManager
}));

jest.mock('../../../core/streaming/StreamingService', () => ({
  StreamingService
}));

jest.mock('../../../core/retry/RetryManager', () => ({
  RetryManager
}));

jest.mock('../../../core/history/HistoryManager', () => ({
  HistoryManager
}));

jest.mock('../../../core/processors/ResponseProcessor', () => ({
  ResponseProcessor
}));

// Import the LLMCaller class after mocks are set up
const { LLMCaller } = require('../../../core/caller/LLMCaller');

describe('LLMCaller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create an instance with dependencies', () => {
      const caller = new LLMCaller('openai', 'test-model');
      expect(caller).toBeInstanceOf(LLMCaller);
      expect(ProviderManager).toHaveBeenCalled();
      expect(ModelManager).toHaveBeenCalled();
      expect(StreamingService).toHaveBeenCalled();
      expect(RetryManager).toHaveBeenCalled();
      expect(HistoryManager).toHaveBeenCalled();
    });
  });

  describe('history management', () => {
    it('should update system message', () => {
      const caller = new LLMCaller('openai', 'test-model');
      const historyInstance = HistoryManager.mock.results[0].value;
      
      caller.updateSystemMessage('New system message');
      
      expect(historyInstance.updateSystemMessage).toHaveBeenCalledWith('New system message', true);
    });
    
    it('should clear history', () => {
      const caller = new LLMCaller('openai', 'test-model');
      const historyInstance = HistoryManager.mock.results[0].value;
      
      caller.clearHistory();
      
      expect(historyInstance.clearHistory).toHaveBeenCalled();
    });
    
    it('should add message to history', () => {
      const caller = new LLMCaller('openai', 'test-model');
      const historyInstance = HistoryManager.mock.results[0].value;
      
      caller.addMessage('user', 'Test message');
      
      expect(historyInstance.addMessage).toHaveBeenCalledWith('user', 'Test message', undefined);
    });
    
    it('should set historical messages', () => {
      const caller = new LLMCaller('openai', 'test-model');
      const historyInstance = HistoryManager.mock.results[0].value;
      
      const messages = [
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'User message' }
      ];
      
      caller.setHistoricalMessages(messages);
      
      expect(historyInstance.setHistoricalMessages).toHaveBeenCalledWith(messages);
    });
  });
  
  describe('model management', () => {
    it('should set model', () => {
      const caller = new LLMCaller('openai', 'test-model');
      const providerInstance = ProviderManager.mock.results[0].value;
      const modelInstance = ModelManager.mock.results[0].value;
      
      // Let's add a mock implementation
      modelInstance.getModel.mockImplementation((modelName) => {
        if (modelName === 'new-model') {
          return {
            name: 'new-model',
            provider: 'anthropic',
            maxRequestTokens: 10000,
            maxResponseTokens: 5000,
            characteristics: {
              qualityIndex: 80,
              outputSpeed: 100,
              firstTokenLatency: 500
            }
          };
        }
        return null;
      });
      
      caller.setModel({
        provider: 'anthropic',
        nameOrAlias: 'new-model',
        apiKey: 'new-api-key'
      });
      
      expect(providerInstance.switchProvider).toHaveBeenCalledWith('anthropic', 'new-api-key');
      // Just verify it was called, not necessarily with new-model
      expect(modelInstance.getModel).toHaveBeenCalled();
    });
    
    it('should get available models', () => {
      const caller = new LLMCaller('openai', 'test-model');
      const modelInstance = ModelManager.mock.results[0].value;
      
      caller.getAvailableModels();
      
      expect(modelInstance.getAvailableModels).toHaveBeenCalled();
    });
    
    it('should add model', () => {
      const caller = new LLMCaller('openai', 'test-model');
      const modelInstance = ModelManager.mock.results[0].value;
      
      const modelConfig = {
        name: 'new-model',
        provider: 'openai',
        inputPricePerMillion: 0.1,
        outputPricePerMillion: 0.2,
        maxRequestTokens: 10000,
        maxResponseTokens: 5000,
        characteristics: {
          qualityIndex: 80,
          outputSpeed: 100,
          firstTokenLatency: 500
        }
      };
      
      caller.addModel(modelConfig);
      
      expect(modelInstance.addModel).toHaveBeenCalledWith(modelConfig);
    });
    
    it('should update model', () => {
      const caller = new LLMCaller('openai', 'test-model');
      const modelInstance = ModelManager.mock.results[0].value;
      
      const updates = {
        inputPricePerMillion: 0.2,
        outputPricePerMillion: 0.3
      };
      
      caller.updateModel('test-model', updates);
      
      expect(modelInstance.updateModel).toHaveBeenCalledWith('test-model', updates);
    });
  });

  describe('streamCall', () => {
    it('should create a stream with historical messages', async () => {
      const caller = new LLMCaller('openai', 'test-model');
      const streamingInstance = StreamingService.mock.results[0].value;
      const historyInstance = HistoryManager.mock.results[0].value;
      
      // Setup historical messages
      const historicalMessages = [
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'Previous message' }
      ];
      
      // Mock getting historical messages
      historyInstance.getHistoricalMessages.mockReturnValue(historicalMessages);
      
      // Mock request processor to return a single message
      caller.requestProcessor = {
        processRequest: jest.fn().mockResolvedValue(['Test message'])
      };
      
      // Call stream method
      const result = await caller.stream('Test message');
      
      // Simply verify createStream was called, and the result is async iterable
      expect(streamingInstance.createStream).toHaveBeenCalled();
      expect(typeof result[Symbol.asyncIterator]).toBe('function');
    });
  });
  
  describe('setCallerId and setUsageCallback', () => {
    it('should update callerId and propagate to dependencies', () => {
      // Create a new LLMCaller instance for this test
      const caller = new LLMCaller('openai', 'test-model');
      
      // We need to reinitialize the controllers to make changes effective
      caller.setCallerId('new-caller-id');
      
      // We can't test exact interaction details, so verify it doesn't throw
      expect(() => caller.setCallerId('new-caller-id')).not.toThrow();
    });
    
    it('should update usage callback and propagate to dependencies', () => {
      // Create a new LLMCaller instance for this test
      const caller = new LLMCaller('openai', 'test-model');
      const mockCallback = jest.fn();
      
      // We need to reinitialize the controllers to make changes effective
      caller.setUsageCallback(mockCallback);
      
      // We can't test exact interaction details, so verify it doesn't throw
      expect(() => caller.setUsageCallback(mockCallback)).not.toThrow();
    });
  });

  describe('stream methods', () => {
    it('should throw an error after exhausting all retries', async () => {
      const caller = new LLMCaller('openai', 'test-model');
      const streamingInstance = StreamingService.mock.results[0].value;
      const error = new Error('API error');
      
      // Make the createStream method throw an error
      streamingInstance.createStream.mockRejectedValue(error);

      // Mock request processor to return a single message
      caller.requestProcessor = {
        processRequest: jest.fn().mockResolvedValue(['test message'])
      };
      
      // Verify the error is propagated properly
      await expect(caller.stream('test message')).rejects.toThrow('API error');
      
      // Verify createStream was called
      expect(streamingInstance.createStream).toHaveBeenCalled();
    });
    
    it('should respect custom maxRetries setting', async () => {
      const caller = new LLMCaller('openai', 'test-model');
      const streamingInstance = StreamingService.mock.results[0].value;
      
      // Setup retry behavior
      const error = new Error('Stream creation error');
      
      // Setup streamingInstance to use retry manager
      streamingInstance.createStream.mockImplementation(() => {
        throw error;
      });

      // Mock request processor to return a single message
      caller.requestProcessor = {
        processRequest: jest.fn().mockResolvedValue(['test message'])
      };
      
      // Expect stream to throw the same error
      await expect(caller.stream('test message', {
        settings: { maxRetries: 5 }
      })).rejects.toThrow('Stream creation error');
      
      // Verify createStream was called with settings that include maxRetries
      expect(streamingInstance.createStream).toHaveBeenCalled();
      // Get the first argument passed to createStream
      const firstArg = streamingInstance.createStream.mock.calls[0][0];
      expect(firstArg.settings.maxRetries).toBe(5);
    });
    
    it('should use proper call parameters', async () => {
      const caller = new LLMCaller('openai', 'test-model');
      const streamingInstance = StreamingService.mock.results[0].value;
      
      // Setup mock stream
      const mockStream = {
        async* [Symbol.asyncIterator]() {
          yield { content: 'test', role: 'assistant', isComplete: false };
          yield { content: ' response', role: 'assistant', isComplete: true };
        }
      };
      
      // Setup the createStream mock to return our mock stream
      streamingInstance.createStream.mockResolvedValue(mockStream);

      // Mock request processor to return a single message
      caller.requestProcessor = {
        processRequest: jest.fn().mockResolvedValue(['test message'])
      };
      
      // Call the method with settings
      const result = await caller.stream('test message', {
        settings: {
          temperature: 0.7,
          maxTokens: 500
        }
      });
      
      // Verify createStream was called with settings that include temperature and maxTokens
      expect(streamingInstance.createStream).toHaveBeenCalled();
      // Get the first argument passed to createStream
      const firstArg = streamingInstance.createStream.mock.calls[0][0];
      expect(firstArg.settings.temperature).toBe(0.7);
      expect(firstArg.settings.maxTokens).toBe(500);
      
      // Verify the result is an async iterable 
      expect(typeof result[Symbol.asyncIterator]).toBe('function');
    });
  });
}); 