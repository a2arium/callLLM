import { jest } from '@jest/globals';
import { ToolOrchestrator } from '../../../../core/tools/ToolOrchestrator.js';
import { ToolController } from '../../../../core/tools/ToolController.js';
import { ChatController } from '../../../../core/chat/ChatController.js';
import { ToolsManager } from '../../../../core/tools/ToolsManager.js';
import type { UniversalChatResponse, UniversalMessage, UniversalChatParams } from '../../../../interfaces/UniversalInterfaces.js';
import type { ProviderManager } from '../../../../core/caller/ProviderManager.js';
import type { ModelManager } from '../../../../core/models/ModelManager.js';
import type { ResponseProcessor } from '../../../../core/processors/ResponseProcessor.js';
import type { RetryManager } from '../../../../core/retry/RetryManager.js';
import type { UsageTracker } from '../../../../core/telemetry/UsageTracker.js';
import { StreamController } from '../../../../core/streaming/StreamController.js';
import { HistoryManager } from '../../../../core/history/HistoryManager.js';
import { ToolCall } from '../../../../types/tooling.js';

const dummyStreamController: StreamController = {
  // Provide minimal stub implementations if any methods are required
  createStream: jest.fn()
} as unknown as StreamController;

describe('ToolOrchestrator', () => {
  let toolOrchestrator: ToolOrchestrator;
  let chatController: jest.Mocked<ChatController>;
  let toolController: jest.Mocked<ToolController>;
  let historyManager: jest.Mocked<HistoryManager>;

  beforeEach(() => {
    chatController = {
      execute: jest.fn()
    } as unknown as jest.Mocked<ChatController>;

    toolController = {
      processToolCalls: jest.fn(),
      resetIterationCount: jest.fn(),
      toolsManager: {} as any,
      iterationCount: 0,
      maxIterations: 10,
      toolCallParser: {} as any
    } as unknown as jest.Mocked<ToolController>;

    historyManager = {
      addToolCallToHistory: jest.fn(),
      addMessage: jest.fn(),
      getHistoricalMessages: jest.fn(),
      getLatestMessages: jest.fn(),
      getLastMessageByRole: jest.fn()
    } as unknown as jest.Mocked<HistoryManager>;

    toolOrchestrator = new ToolOrchestrator(
      toolController,
      chatController,
      dummyStreamController,
      historyManager
    );
  });

  describe('processToolCalls', () => {
    it('should handle a complete tool execution cycle', async () => {
      const initialResponse: UniversalChatResponse = {
        role: 'assistant',
        content: '<tool>testTool:{}</tool>',
        metadata: {}
      };

      toolController.processToolCalls.mockResolvedValueOnce({
        toolCalls: [{
          id: 'test-id',
          toolName: 'testTool',
          arguments: {},
          result: 'Tool execution successful'
        }],
        messages: [{ role: 'tool', content: 'Tool execution successful' }],
        requiresResubmission: true
      });

      const result = await toolOrchestrator.processToolCalls(initialResponse);

      expect(result.requiresResubmission).toBe(true);
      expect(result.newToolCalls).toBe(1);
      expect(historyManager.addMessage).toHaveBeenCalledWith(
        'tool',
        'Tool execution successful',
        {
          toolCallId: 'test-id',
          name: 'testTool'
        }
      );
    });

    it('should handle errors and clean up resources', async () => {
      const initialResponse: UniversalChatResponse = {
        role: 'assistant',
        content: '<tool>testTool:{"shouldFail": true}</tool>',
        metadata: {}
      };

      toolController.processToolCalls.mockResolvedValueOnce({
        toolCalls: [{
          id: 'test-id',
          toolName: 'testTool',
          arguments: { shouldFail: true },
          error: 'Tool error'
        }],
        messages: [],
        requiresResubmission: true
      });

      const result = await toolOrchestrator.processToolCalls(initialResponse);

      expect(result.requiresResubmission).toBe(true);
      expect(result.newToolCalls).toBe(1);
      expect(toolController.resetIterationCount).toHaveBeenCalled();
      expect(historyManager.addMessage).toHaveBeenCalledWith(
        'tool',
        'Error executing tool testTool: Tool error',
        {
          toolCallId: 'test-id'
        }
      );
    });

    it('should handle null/undefined tool result', async () => {
      const initialResponse: UniversalChatResponse = {
        role: 'assistant',
        content: '<tool>testTool:{}</tool>',
        metadata: {}
      };

      toolController.processToolCalls.mockResolvedValueOnce({
        toolCalls: [],
        messages: [],
        requiresResubmission: false
      });

      const result = await toolOrchestrator.processToolCalls(initialResponse);

      expect(result.requiresResubmission).toBe(false);
      expect(result.newToolCalls).toBe(0);
    });

    it('should handle tool result without toolCalls or messages', async () => {
      const initialResponse: UniversalChatResponse = {
        role: 'assistant',
        content: '<tool>testTool:{}</tool>',
        metadata: {}
      };

      toolController.processToolCalls.mockResolvedValueOnce({
        toolCalls: [],
        messages: [],
        requiresResubmission: false
      });

      const result = await toolOrchestrator.processToolCalls(initialResponse);

      expect(result.requiresResubmission).toBe(false);
      expect(result.newToolCalls).toBe(0);
    });
  });
});