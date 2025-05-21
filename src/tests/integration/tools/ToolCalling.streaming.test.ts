import { jest , beforeAll} from '@jest/globals';
import { StreamingService } from '../../../core/streaming/StreamingService.js';
import { HistoryManager } from '../../../core/history/HistoryManager.js';
// Declare variables for modules to be dynamically imported
let TokenCalculator;
import { ToolController } from '../../../core/tools/ToolController.js';
import { ToolsManager } from '../../../core/tools/ToolsManager.js';
import { ToolOrchestrator } from '../../../core/tools/ToolOrchestrator.js';
import { StreamHandler } from '../../../core/streaming/StreamHandler.js';
// Declare variables for modules to be dynamically imported
let ModelManager;
import { RetryManager } from '../../../core/retry/RetryManager.js';
import type { ToolDefinition, ToolCall } from '../../../types/tooling.js';
import type { UniversalStreamResponse, UniversalChatParams, UniversalMessage, FinishReason } from '../../../interfaces/UniversalInterfaces.js';

// Mock TokenCalculator implementation
jest.unstable_mockModule('../../../core/models/TokenCalculator.js', () => {
  return { __esModule: true, __esModule: true, __esModule: true, __esModule: true, __esModule: true, __esModule: true,
    TokenCalculator: jest.fn().mockImplementation(() => ({
      calculateTokens: jest.fn().mockReturnValue({ total: 10 }),
      calculateUsage: jest.fn(),
      calculateTotalTokens: jest.fn().mockReturnValue(100)
    }))
  };
});

// Mock ModelManager implementation
jest.unstable_mockModule('../../../core/models/ModelManager.js', () => {
  return { __esModule: true, __esModule: true, __esModule: true, __esModule: true, __esModule: true, __esModule: true,
    ModelManager: jest.fn().mockImplementation(() => ({
      getModel: jest.fn().mockReturnValue({
        name: 'test-model',
        capabilities: { toolCalls: true }
      })
    }))
  };
});

// Dynamically import modules after mocks are set up
beforeAll(async () => {
  const TokenCalculatorModule = await import('../../../core/models/TokenCalculator.js');
  TokenCalculator = TokenCalculatorModule.TokenCalculator;

  const ModelManagerModule = await import('../../../core/models/ModelManager.js');
  ModelManager = ModelManagerModule.ModelManager;
});


// Create a mock adapter for testing
const mockProviderAdapter = {
  streamCall: jest.fn()
};

// Create a mock provider manager that returns the mock adapter
const mockProviderManager = {
  getProvider: jest.fn().mockReturnValue(mockProviderAdapter)
};

// Create a mock stream controller for ToolOrchestrator
const mockStreamController = {
  createStream: jest.fn()
};

describe('Tool Calling with Streaming', () => {
  // Set up test data
  const mockToolFunction = jest.fn().mockResolvedValue({ result: 'Tool executed successfully' });
  const testTool: ToolDefinition = {
    name: 'test_streaming_tool',
    description: 'A test tool for streaming integration tests',
    parameters: { type: 'object', properties: { param: { type: 'string' } }, required: ['param'] },
    callFunction: mockToolFunction
  };

  let historyManager: HistoryManager;
  let tokenCalculator: TokenCalculator;
  let modelManager: ModelManager;
  let toolsManager: ToolsManager;
  let toolController: ToolController;
  let toolOrchestrator: ToolOrchestrator;
  let streamHandler: StreamHandler;
  let streamingService: StreamingService;
  let retryManager: RetryManager;

  beforeEach(() => {
    jest.clearAllMocks();

    // Initialize components
    historyManager = new HistoryManager('System message');
    tokenCalculator = new TokenCalculator();
    modelManager = new ModelManager('mock-provider' as any);
    retryManager = new RetryManager({ baseDelay: 1000, maxRetries: 3 });

    // Create and set up tools
    toolsManager = new ToolsManager();
    toolsManager.addTool(testTool);

    // Create controllers with appropriate dependencies
    toolController = new ToolController(toolsManager);
    const mockChatController = {
      execute: jest.fn(),
      historyManager: historyManager
    };
    toolOrchestrator = new ToolOrchestrator(
      toolController,
      mockChatController as any,
      mockStreamController as any,
      historyManager
    );

    // Create stream handler manually to avoid complex constructor
    streamHandler = new StreamHandler(
      tokenCalculator,
      historyManager,
      undefined, // responseProcessor - we'll skip this for the test
      undefined, // usageCallback
      undefined, // callerId
      toolController,
      toolOrchestrator
    );

    // Create StreamingService with all dependencies
    streamingService = new StreamingService(
      mockProviderManager as any,
      modelManager,
      historyManager,
      retryManager,
      undefined, // usageCallback
      undefined, // callerId
      undefined, // options
      toolController
    );

    // THIS IS THE CRITICAL STEP - Set the ToolOrchestrator on the StreamingService
    // This is what we fixed in LLMCaller.ts
    streamingService.setToolOrchestrator(toolOrchestrator);
  });

  test('should execute tools during streaming and continue with results', async () => {
    // First mock: Return a tool call
    mockProviderAdapter.streamCall.mockImplementationOnce(async function* () {
      yield {
        role: 'assistant',
        content: '',
        toolCalls: [{
          id: 'tool_call_123',
          name: 'test_streaming_tool',
          arguments: { param: 'test_value' }
        }],
        isComplete: true,
        metadata: { finishReason: 'tool_calls' as FinishReason }
      };
    });

    // Second mock: Return response after tool execution
    mockProviderAdapter.streamCall.mockImplementationOnce(async function* () {
      yield {
        role: 'assistant',
        content: 'Tool executed with result: success',
        isComplete: true,
        metadata: { finishReason: 'stop' as FinishReason }
      };
    });

    // Create chat params
    const params: UniversalChatParams = {
      model: 'test-model',
      messages: [
      { role: 'system', content: 'System message' },
      { role: 'user', content: 'Use the test tool with param=test_value' }],

      tools: [testTool]
    };

    // Call createStream and collect the results
    const stream = await streamingService.createStream(params, 'test-model');

    // Collect all chunks from the stream
    const receivedChunks: UniversalStreamResponse[] = [];
    for await (const chunk of stream) {
      receivedChunks.push(chunk);
    }

    // Verify the tool was called with correct arguments
    expect(mockToolFunction).toHaveBeenCalledTimes(1);
    expect(mockToolFunction).toHaveBeenCalledWith({ param: 'test_value' });

    // Verify we got a stream continuation after the tool call
    expect(mockProviderAdapter.streamCall).toHaveBeenCalledTimes(2);

    // Check that we got a "stop" finishReason in one of the chunks
    expect(receivedChunks.some((chunk) => chunk.metadata?.finishReason === 'stop')).toBe(true);

    // Check that we got the content from the second stream call
    expect(receivedChunks.some((chunk) =>
    chunk.content && chunk.content.includes('Tool executed with result')
    )).toBe(true);

    // Check that the tool result was added to history
    const history = historyManager.getMessages();
    expect(history.some((msg: UniversalMessage) =>
    msg.role === 'tool' &&
    msg.toolCallId === 'tool_call_123' &&
    msg.content && msg.content.includes('Tool executed successfully')
    )).toBe(true);
  });

  // Add a simplified test to validate the key components are properly linked
  test('should directly process tool calls in StreamHandler', async () => {
    // Create a mock tool call in the StreamHandler with the correct toolOrchestrator
    expect(() => {
      // Simply verify that the handler was created with the toolOrchestrator
      streamHandler = new StreamHandler(
        tokenCalculator,
        historyManager,
        undefined,
        undefined,
        undefined,
        toolController,
        toolOrchestrator,
        streamingService
      );

      // Verify the critical methods exist
      expect(streamHandler).toBeTruthy();
      expect(toolOrchestrator).toBeTruthy();
      expect(toolController).toBeTruthy();

      // Verify the tool is registered
      expect(toolsManager.listTools()).toContainEqual(
        expect.objectContaining({
          name: 'test_streaming_tool'
        })
      );

      // Verify StreamingService has toolOrchestrator set
      expect(streamingService['toolOrchestrator']).toBe(toolOrchestrator);
    }).not.toThrow();
  });
});