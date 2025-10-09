import { jest } from '@jest/globals';
import { ToolOrchestrator } from '../../../core/tools/ToolOrchestrator.ts';
import { ToolController } from '../../../core/tools/ToolController.ts';
import { ChatController } from '../../../core/chat/ChatController.ts';
import { ToolsManager } from '../../../core/tools/ToolsManager.ts';
import type { ToolDefinition } from '../../../types/tooling.ts';
import type { UniversalChatResponse, UniversalMessage } from '../../../interfaces/UniversalInterfaces.ts';
import { StreamController } from '../../../core/streaming/StreamController.ts';
import { HistoryManager } from '../../../core/history/HistoryManager.ts';

// Mock ChatController
class MockChatController {
  constructor(private responses: string[]) {
    this.responses = [...responses];
  }

  async execute(): Promise<UniversalChatResponse> {
    const content = this.responses.shift() || 'No more responses';
    return { role: 'assistant', content, metadata: {} };
  }
}

// Add mock StreamController
const mockStreamController: StreamController = {
  createStream: jest.fn()
} as unknown as StreamController;

describe('ToolOrchestrator Integration', () => {
  let toolsManager: ToolsManager;
  let toolController: ToolController;
  let chatController: ChatController;
  let orchestrator: ToolOrchestrator;

  beforeEach(() => {
    toolsManager = new ToolsManager();
    toolController = new ToolController(toolsManager);
  });

  describe('Tool Execution Flow', () => {
    it('should handle a complete tool execution cycle', async () => {
      // Setup mock tools
      const mockWeatherTool: ToolDefinition = {
        name: 'getWeather',
        description: 'Get weather for a location',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string' }
          }
        },
        callFunction: jest.fn().mockResolvedValue('Sunny, 22°C')
      };

      const mockTimeTool: ToolDefinition = {
        name: 'getTime',
        description: 'Get current time for a location',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string' }
          }
        },
        callFunction: jest.fn().mockResolvedValue('14:30 GMT')
      };

      toolsManager.addTool(mockWeatherTool);
      toolsManager.addTool(mockTimeTool);

      // Setup mock chat responses
      const mockChatController = {
        providerManager: { getProvider: jest.fn() },
        modelManager: { getModel: jest.fn() },
        responseProcessor: { validateResponse: jest.fn(), validateJsonMode: jest.fn() },
        retryManager: { executeWithRetry: jest.fn() },
        usageTracker: { trackUsage: jest.fn() },
        toolController: undefined,
        toolOrchestrator: undefined,
        historyManager: undefined,
        execute: jest.fn().mockResolvedValueOnce({
          content: 'Based on the weather and time data: It\'s a sunny afternoon in London!',
          role: 'assistant'
        })
      } as unknown as ChatController;

      const mockHistoryManager = {
        historicalMessages: [],
        systemMessage: 'test',
        initializeWithSystemMessage: jest.fn(),
        getMessages: jest.fn().mockReturnValue([]),
        validateMessage: jest.fn(),
        addMessage: jest.fn(),
        clearHistory: jest.fn(),
        setMessages: jest.fn(),
        getLastMessageByRole: jest.fn(),
        getLastMessages: jest.fn(),
        serializeHistory: jest.fn(),
        deserializeHistory: jest.fn(),
        updateSystemMessage: jest.fn(),
        addToolCallToHistory: jest.fn(),
        getHistorySummary: jest.fn(),
        captureStreamResponse: jest.fn()
      } as unknown as HistoryManager;

      orchestrator = new ToolOrchestrator(
        toolController,
        mockChatController,
        mockStreamController,
        mockHistoryManager
      );

      // Initial response with tool calls
      const initialResponse: UniversalChatResponse = {
        role: 'assistant',
        content: 'Let me check the weather and time in London.',
        metadata: {},
        toolCalls: [
          {
            name: 'getWeather',
            arguments: { location: 'London' }
          },
          {
            name: 'getTime',
            arguments: { location: 'London' }
          }]

      };

      const result = await orchestrator.processToolCalls(initialResponse);

      // Verify tool executions
      expect(result.newToolCalls).toBe(2);
      expect(result.requiresResubmission).toBe(true);
      expect(mockWeatherTool.callFunction).toHaveBeenCalledWith({ location: 'London' });
      expect(mockTimeTool.callFunction).toHaveBeenCalledWith({ location: 'London' });

      // Verify history manager was called
      expect(mockHistoryManager.addMessage).toHaveBeenCalledWith(
        'tool',
        'Sunny, 22°C',
        {
          toolCallId: expect.any(String),
          name: 'getWeather'
        }
      );
      expect(mockHistoryManager.addMessage).toHaveBeenCalledWith(
        'tool',
        '14:30 GMT',
        {
          toolCallId: expect.any(String),
          name: 'getTime'
        }
      );
    });

    it('should handle tool execution errors gracefully', async () => {
      // Setup mock tool that throws an error
      const mockErrorTool: ToolDefinition = {
        name: 'errorTool',
        description: 'A tool that throws an error',
        parameters: {
          type: 'object',
          properties: {}
        },
        callFunction: jest.fn().mockRejectedValue(new Error('Tool execution failed'))
      };

      toolsManager.addTool(mockErrorTool);

      // Setup mock chat responses
      const mockChatController = {
        providerManager: { getProvider: jest.fn() },
        modelManager: { getModel: jest.fn() },
        responseProcessor: { validateResponse: jest.fn(), validateJsonMode: jest.fn() },
        retryManager: { executeWithRetry: jest.fn() },
        usageTracker: { trackUsage: jest.fn() },
        toolController: undefined,
        toolOrchestrator: undefined,
        historyManager: undefined,
        execute: jest.fn().mockResolvedValueOnce({
          content: 'I encountered an error while executing the tool.',
          role: 'assistant'
        })
      } as unknown as ChatController;

      const mockHistoryManager = {
        historicalMessages: [],
        systemMessage: 'test',
        initializeWithSystemMessage: jest.fn(),
        getMessages: jest.fn().mockReturnValue([]),
        validateMessage: jest.fn(),
        addMessage: jest.fn(),
        clearHistory: jest.fn(),
        setMessages: jest.fn(),
        getLastMessageByRole: jest.fn(),
        getLastMessages: jest.fn(),
        serializeHistory: jest.fn(),
        deserializeHistory: jest.fn(),
        updateSystemMessage: jest.fn(),
        addToolCallToHistory: jest.fn(),
        getHistorySummary: jest.fn(),
        captureStreamResponse: jest.fn()
      } as unknown as HistoryManager;

      orchestrator = new ToolOrchestrator(
        toolController,
        mockChatController,
        mockStreamController,
        mockHistoryManager
      );

      const initialResponse: UniversalChatResponse = {
        role: 'assistant',
        content: 'Let me try to execute this tool.',
        metadata: {},
        toolCalls: [
          {
            name: 'errorTool',
            arguments: { shouldFail: true }
          }]

      };

      const result = await orchestrator.processToolCalls(initialResponse);

      expect(result.newToolCalls).toBe(1);
      expect(result.requiresResubmission).toBe(true);
      // New error string can include the native Error prefix; assert more flexibly
      expect(mockHistoryManager.addMessage).toHaveBeenCalledWith(
        'tool',
        expect.stringContaining('Error executing tool errorTool:'),
        {
          toolCallId: expect.any(String)
        }
      );
    });

    it('should handle multiple tool execution cycles', async () => {
      // Setup mock tool
      const mockTool: ToolDefinition = {
        name: 'testTool',
        description: 'Test tool',
        parameters: {
          type: 'object',
          properties: {
            param: { type: 'string' }
          }
        },
        callFunction: jest.fn().
          mockResolvedValueOnce('First result').
          mockResolvedValueOnce('Second result')
      };

      toolsManager.addTool(mockTool);

      // Setup mock chat responses that include another tool call
      const mockChatController = {
        providerManager: { getProvider: jest.fn() },
        modelManager: { getModel: jest.fn() },
        responseProcessor: { validateResponse: jest.fn(), validateJsonMode: jest.fn() },
        retryManager: { executeWithRetry: jest.fn() },
        usageTracker: { trackUsage: jest.fn() },
        toolController: undefined,
        toolOrchestrator: undefined,
        historyManager: undefined,
        execute: jest.fn().mockResolvedValueOnce({
          content: 'Final response without tool calls',
          role: 'assistant'
        })
      } as unknown as ChatController;

      const mockHistoryManager = {
        historicalMessages: [],
        systemMessage: 'test',
        initializeWithSystemMessage: jest.fn(),
        getMessages: jest.fn().mockReturnValue([]),
        validateMessage: jest.fn(),
        addMessage: jest.fn(),
        clearHistory: jest.fn(),
        setMessages: jest.fn(),
        getLastMessageByRole: jest.fn(),
        getLastMessages: jest.fn(),
        serializeHistory: jest.fn(),
        deserializeHistory: jest.fn(),
        updateSystemMessage: jest.fn(),
        addToolCallToHistory: jest.fn(),
        getHistorySummary: jest.fn(),
        captureStreamResponse: jest.fn()
      } as unknown as HistoryManager;

      orchestrator = new ToolOrchestrator(
        toolController,
        mockChatController,
        mockStreamController,
        mockHistoryManager
      );

      const initialResponse: UniversalChatResponse = {
        role: 'assistant',
        content: 'Let me execute the test tool.',
        metadata: {},
        toolCalls: [
          {
            name: 'testTool',
            arguments: {}
          }]

      };

      const result = await orchestrator.processToolCalls(initialResponse);

      expect(result.newToolCalls).toBe(1);
      expect(result.requiresResubmission).toBe(true);
      expect(mockHistoryManager.addMessage).toHaveBeenCalledWith(
        'tool',
        'First result',
        {
          toolCallId: expect.any(String),
          name: 'testTool'
        }
      );
    });

    it('should preserve conversation history', async () => {
      const mockTool: ToolDefinition = {
        name: 'testTool',
        description: 'Test tool',
        parameters: {
          type: 'object',
          properties: {}
        },
        callFunction: jest.fn().mockResolvedValue('Tool result')
      };

      toolsManager.addTool(mockTool);

      const historicalMessages: UniversalMessage[] = [
        { role: 'user', content: 'Initial question' },
        { role: 'assistant', content: 'Initial response' }];


      const mockChatController = {
        providerManager: { getProvider: jest.fn() },
        modelManager: { getModel: jest.fn() },
        responseProcessor: { validateResponse: jest.fn(), validateJsonMode: jest.fn() },
        retryManager: { executeWithRetry: jest.fn() },
        usageTracker: { trackUsage: jest.fn() },
        toolController: undefined,
        toolOrchestrator: undefined,
        historyManager: undefined,
        execute: jest.fn().mockResolvedValueOnce({
          content: 'Final response',
          role: 'assistant'
        })
      } as unknown as ChatController;

      const mockHistoryManager = {
        historicalMessages: [],
        systemMessage: 'test',
        initializeWithSystemMessage: jest.fn(),
        getMessages: jest.fn().mockReturnValue(historicalMessages),
        validateMessage: jest.fn(),
        addMessage: jest.fn(),
        clearHistory: jest.fn(),
        setMessages: jest.fn(),
        getLastMessageByRole: jest.fn(),
        getLastMessages: jest.fn(),
        serializeHistory: jest.fn(),
        deserializeHistory: jest.fn(),
        updateSystemMessage: jest.fn(),
        addToolCallToHistory: jest.fn(),
        getHistorySummary: jest.fn(),
        captureStreamResponse: jest.fn()
      } as unknown as HistoryManager;

      orchestrator = new ToolOrchestrator(
        toolController,
        mockChatController,
        mockStreamController,
        mockHistoryManager
      );

      const initialResponse: UniversalChatResponse = {
        role: 'assistant',
        content: 'Let me execute the test tool.',
        metadata: {},
        toolCalls: [
          {
            name: 'testTool',
            arguments: {}
          }]

      };

      const result = await orchestrator.processToolCalls(initialResponse);

      expect(result.newToolCalls).toBe(1);
      expect(result.requiresResubmission).toBe(true);
      expect(mockHistoryManager.addMessage).toHaveBeenCalledWith(
        'tool',
        'Tool result',
        {
          toolCallId: expect.any(String),
          name: 'testTool'
        }
      );
    });
  });
});