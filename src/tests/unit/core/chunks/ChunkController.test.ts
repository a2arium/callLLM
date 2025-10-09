import { jest } from '@jest/globals';
import type { UniversalChatResponse, UniversalStreamResponse, UniversalMessage } from '../../../../interfaces/UniversalInterfaces.ts';
import { FinishReason } from '../../../../interfaces/UniversalInterfaces.ts';

// Mock functions
const mockCalculateTokens = jest.fn();
const mockGetTokenCount = jest.fn();
const mockCalculateTotalTokens = jest.fn().mockResolvedValue(100);

const mockChatExecute = jest.fn();

const mockCreateStream = jest.fn();

const mockAddMessage = jest.fn();
const mockgetMessages = jest.fn().mockReturnValue([]);
const mocksetMessages = jest.fn();
const mockClearHistory = jest.fn()

// Create mock dependencies with factory functions
jest.unstable_mockModule('@/core/models/TokenCalculator', () => ({
  __esModule: true,
  TokenCalculator: jest.fn().mockImplementation(() => ({
    calculateTokens: mockCalculateTokens,
    getTokenCount: mockGetTokenCount,
    calculateTotalTokens: mockCalculateTotalTokens
  }))
}));

jest.unstable_mockModule('@/core/chat/ChatController', () => ({
  __esModule: true,
  ChatController: jest.fn().mockImplementation(() => ({
    execute: mockChatExecute
  }))
}));

jest.unstable_mockModule('@/core/streaming/StreamController', () => ({
  __esModule: true,
  StreamController: jest.fn().mockImplementation(() => ({
    createStream: mockCreateStream
  }))
}));

jest.unstable_mockModule('@/core/history/HistoryManager', () => ({
  __esModule: true,
  HistoryManager: jest.fn().mockImplementation(() => ({
    addMessage: mockAddMessage,
    getMessages: mockgetMessages,
    setMessages: mocksetMessages,
    clearHistory: mockClearHistory
  }))
}));

jest.unstable_mockModule('@/core/processors/DataSplitter', () => ({
  __esModule: true,
  DataSplitter: jest.fn().mockImplementation(() => ({
    splitData: jest.fn()
  }))
}));

// Variables for dynamically imported mocked modules
let ChunkController: any;
let ChunkIterationLimitError: any;
let TokenCalculator: any;
let ChatController: any;
let StreamController: any;
let HistoryManager: any;

// Import the modules after mocking
beforeAll(async () => {
  // Import the module under test
  const controllerModule = await import('@/core/chunks/ChunkController');
  ChunkController = controllerModule.ChunkController;
  ChunkIterationLimitError = controllerModule.ChunkIterationLimitError;

  // Import mocked modules
  const tokenCalculatorModule = await import('@/core/models/TokenCalculator');
  TokenCalculator = tokenCalculatorModule.TokenCalculator;

  const chatControllerModule = await import('@/core/chat/ChatController');
  ChatController = chatControllerModule.ChatController;

  const streamControllerModule = await import('@/core/streaming/StreamController');
  StreamController = streamControllerModule.StreamController;

  const historyManagerModule = await import('@/core/history/HistoryManager');
  HistoryManager = historyManagerModule.HistoryManager;
});

describe('ChunkController', () => {
  let chunkController: any;
  let mockTokenCalculator: any;
  let mockChatController: any;
  let mockStreamController: any;
  let mockHistoryManager: any;

  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();

    // Create instances of our mocked classes
    mockTokenCalculator = new TokenCalculator();
    mockChatController = new ChatController();
    mockStreamController = new StreamController();
    mockHistoryManager = new HistoryManager();

    // Initialize controller with mocks
    chunkController = new ChunkController(
      mockTokenCalculator,
      mockChatController,
      mockStreamController,
      mockHistoryManager,
      5 // Lower max iterations for testing
    );
  });

  describe('constructor', () => {
    it('should initialize with default maxIterations', () => {
      const controller = new ChunkController(
        mockTokenCalculator,
        mockChatController,
        mockStreamController,
        mockHistoryManager
      );

      // Default is 20, but we can only test this indirectly
      expect(controller).toBeDefined();
    });

    it('should initialize with custom maxIterations', () => {
      const customMaxIterations = 10;
      const controller = new ChunkController(
        mockTokenCalculator,
        mockChatController,
        mockStreamController,
        mockHistoryManager,
        customMaxIterations
      );

      expect(controller).toBeDefined();
    });
  });

  describe('processChunks', () => {
    it('should process chunks and return responses', async () => {
      const messages = ['chunk1', 'chunk2'];
      const params = {
        model: 'model-id',
        systemMessage: 'system message'
      };

      const mockResponse: UniversalChatResponse = {
        content: 'Mock response',
        role: 'assistant',
        metadata: {
          finishReason: FinishReason.STOP
        }
      };

      mockChatExecute.mockResolvedValue(mockResponse);

      const results = await chunkController.processChunks(messages, params);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(mockResponse);
      expect(results[1]).toEqual(mockResponse);
      expect(mockChatExecute).toHaveBeenCalledTimes(2);
      expect(mockChatExecute).toHaveBeenCalledWith({
        model: params.model,
        messages: expect.arrayContaining([
          { role: 'system', content: 'You are a helpful assistant.' }]
        ),
        settings: undefined,
        jsonSchema: undefined,
        responseFormat: undefined,
        tools: undefined
      });
    });

    it('should pass historical messages and settings to the chat controller', async () => {
      const messages = ['test message'];
      const historicalMessages: UniversalMessage[] = [
        { role: 'user', content: 'previous message' }];

      const settings = { temperature: 0.7 };
      const params = {
        model: 'model-id',
        systemMessage: 'system message',
        historicalMessages,
        settings
      };

      mockChatExecute.mockResolvedValue({
        content: 'response',
        role: 'assistant',
        metadata: {
          finishReason: FinishReason.STOP
        }
      });

      await chunkController.processChunks(messages, params);

      expect(mockChatExecute).toHaveBeenCalledWith({
        model: params.model,
        messages: expect.arrayContaining([
          { role: 'system', content: 'You are a helpful assistant.' }]
        ),
        settings,
        jsonSchema: undefined,
        responseFormat: undefined,
        tools: undefined
      });
    });

    it('should throw ChunkIterationLimitError when max iterations exceeded', async () => {
      // Create more messages than the maxIterations limit (5);
      const messages = ['chunk1', 'chunk2', 'chunk3', 'chunk4', 'chunk5', 'chunk6'];
      const params = {
        model: 'model-id',
        systemMessage: 'system message'
      };

      mockChatExecute.mockResolvedValue({
        content: 'response',
        role: 'assistant',
        metadata: {
          finishReason: FinishReason.STOP
        }
      });

      await expect(chunkController.processChunks(messages, params)).
        rejects.toThrow(ChunkIterationLimitError);

      // Should only process up to max iterations (5)
      expect(mockChatExecute).toHaveBeenCalledTimes(5);
    });

    it('should handle empty message array', async () => {
      const messages: string[] = [];
      const params = {
        model: 'model-id',
        systemMessage: 'system message'
      };

      const results = await chunkController.processChunks(messages, params);

      expect(results).toEqual([]);
      expect(mockChatExecute).not.toHaveBeenCalled();
    });
  });

  describe('streamChunks', () => {
    it('should stream chunks and yield responses', async () => {
      const messages = ['chunk1', 'chunk2'];
      const params = {
        model: 'model-id',
        systemMessage: 'system message'
      };

      const mockStreamChunks: UniversalStreamResponse[] = [
        { content: 'chunk ', isComplete: false, role: 'assistant' },
        { content: 'response', isComplete: true, role: 'assistant' }];


      mockCreateStream.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockStreamChunks) {
            yield chunk;
          }
        }
      });

      const streamGenerator = chunkController.streamChunks(messages, params);
      const results: UniversalStreamResponse[] = [];

      for await (const chunk of streamGenerator) {
        results.push(chunk);
      }

      expect(results).toHaveLength(4); // 2 chunks per message, 2 messages
      expect(results[0].content).toBe('chunk ');
      expect(results[0].isComplete).toBe(false);
      expect(results[1].content).toBe('response');
      expect(results[1].isComplete).toBe(true); // Last message is complete
      expect(results[2].content).toBe('chunk ');
      expect(results[2].isComplete).toBe(false);
      expect(results[3].content).toBe('response');
      expect(results[3].isComplete).toBe(true); // Last chunk of last message

      expect(mockCreateStream).toHaveBeenCalledTimes(2);
      expect(mockCreateStream).toHaveBeenCalledWith(
        params.model,
        expect.objectContaining({
          messages: expect.arrayContaining([
            { role: 'system', content: expect.any(String) }]
          )
        }),
        expect.any(Number)
      );
    });

    it('should pass historical messages to the stream controller', async () => {
      const messages = ['test message'];
      const historicalMessages: UniversalMessage[] = [
        { role: 'user', content: 'previous message' }];

      const settings = { temperature: 0.7 };
      const params = {
        model: 'model-id',
        systemMessage: 'system message',
        historicalMessages,
        settings
      };

      mockCreateStream.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          yield { content: 'response', isComplete: true, role: 'assistant' };
        }
      });

      const streamGenerator = chunkController.streamChunks(messages, params);
      for await (const _ of streamGenerator) {



        // Just consume the generator
      } expect(mockCreateStream).toHaveBeenCalledWith(params.model,
        expect.objectContaining({
          messages: expect.arrayContaining([
            { role: 'system', content: expect.any(String) }]
          ),
          settings: params.settings
        }),
        expect.any(Number)
      );
    });

    it('should throw ChunkIterationLimitError when max iterations exceeded', async () => {
      // Create more messages than the maxIterations limit (5);
      const messages = ['chunk1', 'chunk2', 'chunk3', 'chunk4', 'chunk5', 'chunk6'];
      const params = {
        model: 'model-id',
        systemMessage: 'system message'
      };

      mockCreateStream.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          yield { content: 'response', isComplete: true, role: 'assistant' };
        }
      });

      const streamGenerator = chunkController.streamChunks(messages, params);

      // Function to consume generator until error
      const consumeUntilError = async () => {
        for await (const _ of streamGenerator) {



          // Just consume the generator
        }
      }; await expect(consumeUntilError()).rejects.toThrow(ChunkIterationLimitError);
      expect(mockCreateStream).toHaveBeenCalledTimes(5);
    });
  });

  describe('resetIterationCount', () => {
    it('should reset the iteration count', async () => {
      // First, process some chunks to increase the counter
      const messages = ['chunk1', 'chunk2'];
      const params = {
        model: 'model-id',
        systemMessage: 'system message'
      };

      mockChatExecute.mockResolvedValue({
        content: 'response',
        role: 'assistant',
        metadata: {
          finishReason: FinishReason.STOP
        }
      });

      await chunkController.processChunks(messages, params);

      // Now process more chunks - this will start with iteration count of 2
      const moreMessages = ['chunk3', 'chunk4'];

      // Reset iteration count explicitly
      chunkController.resetIterationCount();

      // This should work because we reset the iteration count
      await chunkController.processChunks(moreMessages, params);

      // Should have processed all 4 chunks (2 in first call, 2 in second call)
      expect(mockChatExecute).toHaveBeenCalledTimes(4);
    });
  });

  describe('ChunkIterationLimitError', () => {
    it('should create error with correct message', () => {
      const maxIterations = 10;
      const error = new ChunkIterationLimitError(maxIterations);

      expect(error.message).toBe(`Chunk iteration limit of ${maxIterations} exceeded`);
      expect(error.name).toBe('ChunkIterationLimitError');
    });

    it('should be JSON serializable without circular references', () => {
      const maxIterations = 10;
      const error = new ChunkIterationLimitError(maxIterations);

      // This should not throw "Converting circular structure to JSON"
      expect(() => JSON.stringify(error)).not.toThrow();

      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);

      expect(parsed.name).toBe('ChunkIterationLimitError');
      expect(parsed.message).toBe(`Chunk iteration limit of ${maxIterations} exceeded`);
      expect(parsed.maxIterations).toBe(maxIterations);
    });
  });
});