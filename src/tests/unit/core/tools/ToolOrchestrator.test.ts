import { ToolOrchestrator } from '../../../../core/tools/ToolOrchestrator';
import { ToolController } from '../../../../core/tools/ToolController';
import { ChatController } from '../../../../core/chat/ChatController';
import { ToolsManager } from '../../../../core/tools/ToolsManager';
import type { ToolDefinition } from '../../../../core/types';
import type { UniversalChatResponse, UniversalMessage, UniversalChatParams } from '../../../../interfaces/UniversalInterfaces';
import type { ProviderManager } from '../../../../core/caller/ProviderManager';
import type { ModelManager } from '../../../../core/models/ModelManager';
import type { ResponseProcessor } from '../../../../core/processors/ResponseProcessor';
import type { RetryManager } from '../../../../core/retry/RetryManager';
import type { UsageTracker } from '../../../../core/telemetry/UsageTracker';
import { StreamController } from '../../../../core/streaming/StreamController';
import { HistoryManager } from '../../../../core/history/HistoryManager';
import { ToolCall } from '../../../../types/tooling';

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
            execute: jest.fn(),
        } as unknown as jest.Mocked<ChatController>;

        toolController = {
            processToolCalls: jest.fn(),
            resetIterationCount: jest.fn(),
            toolsManager: {} as any,
            iterationCount: 0,
            maxIterations: 10,
            toolCallParser: {} as any,
        } as unknown as jest.Mocked<ToolController>;

        historyManager = {
            addToolCallToHistory: jest.fn(),
            addMessage: jest.fn(),
            getHistoricalMessages: jest.fn(),
            getLatestMessages: jest.fn(),
            getLastMessageByRole: jest.fn(),
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
                metadata: {},
            };

            toolController.processToolCalls.mockResolvedValueOnce({
                toolCalls: [{
                    id: 'test-id',
                    toolName: 'testTool',
                    arguments: {},
                    result: 'Tool execution successful',
                }],
                messages: [{ role: 'tool', content: 'Tool execution successful' }],
                requiresResubmission: true,
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
                metadata: {},
            };

            toolController.processToolCalls.mockResolvedValueOnce({
                toolCalls: [{
                    id: 'test-id',
                    toolName: 'testTool',
                    arguments: { shouldFail: true },
                    error: 'Tool error',
                }],
                messages: [],
                requiresResubmission: true,
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
                metadata: {},
            };

            toolController.processToolCalls.mockResolvedValueOnce({
                toolCalls: [],
                messages: [],
                requiresResubmission: false,
            });

            const result = await toolOrchestrator.processToolCalls(initialResponse);

            expect(result.requiresResubmission).toBe(false);
            expect(result.newToolCalls).toBe(0);
        });

        it('should handle tool result without toolCalls or messages', async () => {
            const initialResponse: UniversalChatResponse = {
                role: 'assistant',
                content: '<tool>testTool:{}</tool>',
                metadata: {},
            };

            toolController.processToolCalls.mockResolvedValueOnce({
                toolCalls: [],
                messages: [],
                requiresResubmission: false,
            });

            const result = await toolOrchestrator.processToolCalls(initialResponse);

            expect(result.requiresResubmission).toBe(false);
            expect(result.newToolCalls).toBe(0);
        });
    });
}); 