import { ToolOrchestrator } from '../../../../core/tools/ToolOrchestrator';
import type { ToolController } from '../../../../core/tools/ToolController';
import type { ChatController } from '../../../../core/chat/ChatController';
import type { UniversalChatResponse, UniversalMessage } from '../../../../interfaces/UniversalInterfaces';
import type { ToolsManager } from '../../../../core/tools/ToolsManager';
import type { ProviderManager } from '../../../../core/caller/ProviderManager';
import type { ModelManager } from '../../../../core/models/ModelManager';
import type { ResponseProcessor } from '../../../../core/processors/ResponseProcessor';
import type { RetryManager } from '../../../../core/retry/RetryManager';
import type { UsageTracker } from '../../../../core/telemetry/UsageTracker';

jest.mock('../../../../core/tools/ToolController', () => {
    return {
        ToolController: jest.fn().mockImplementation(() => ({
            processToolCalls: jest.fn(),
            resetIterationCount: jest.fn()
        }))
    };
});

jest.mock('../../../../core/chat/ChatController', () => {
    return {
        ChatController: jest.fn().mockImplementation(() => ({
            execute: jest.fn()
        }))
    };
});

describe('ToolOrchestrator', () => {
    let toolOrchestrator: ToolOrchestrator;
    let mockToolController: jest.Mocked<ToolController>;
    let mockChatController: jest.Mocked<ChatController>;

    beforeEach(() => {
        const mockToolsManager = {} as ToolsManager;
        const mockProviderManager = {} as ProviderManager;
        const mockModelManager = {} as ModelManager;
        const mockResponseProcessor = {} as ResponseProcessor;
        const mockRetryManager = {} as RetryManager;
        const mockUsageTracker = {} as UsageTracker;

        mockToolController = {
            processToolCalls: jest.fn(),
            resetIterationCount: jest.fn()
        } as unknown as jest.Mocked<ToolController>;

        mockChatController = {
            execute: jest.fn()
        } as unknown as jest.Mocked<ChatController>;

        toolOrchestrator = new ToolOrchestrator(mockToolController, mockChatController);
    });

    describe('processResponse', () => {
        const mockResponse: UniversalChatResponse = {
            role: 'assistant',
            content: 'test content',
            metadata: {}
        };

        const mockParams = {
            model: 'test-model',
            systemMessage: 'test system message',
            historicalMessages: [],
            settings: {}
        };

        it('should return original response when no tool calls are found', async () => {
            mockToolController.processToolCalls.mockResolvedValue({
                requiresResubmission: false,
                messages: [],
                toolCalls: []
            });

            const result = await toolOrchestrator.processResponse(mockResponse, mockParams);

            expect(result).toBe(mockResponse);
            expect(mockToolController.processToolCalls).toHaveBeenCalledWith(mockResponse.content);
            expect(mockChatController.execute).not.toHaveBeenCalled();
            expect(mockToolController.resetIterationCount).not.toHaveBeenCalled();
        });

        it('should process tool calls and make new chat call when tools are executed', async () => {
            const toolMessages: UniversalMessage[] = [
                { role: 'function', content: 'tool result 1' },
                { role: 'function', content: 'tool result 2' }
            ];

            mockToolController.processToolCalls.mockResolvedValue({
                requiresResubmission: true,
                messages: toolMessages,
                toolCalls: [
                    { name: 'tool1', parameters: {} },
                    { name: 'tool2', parameters: {} }
                ]
            });

            const newResponse: UniversalChatResponse = {
                role: 'assistant',
                content: 'new response',
                metadata: {}
            };
            mockChatController.execute.mockResolvedValue(newResponse);

            const result = await toolOrchestrator.processResponse(mockResponse, mockParams);

            expect(result).toBe(newResponse);
            expect(mockToolController.processToolCalls).toHaveBeenCalledWith(mockResponse.content);
            expect(mockChatController.execute).toHaveBeenCalledWith({
                model: mockParams.model,
                systemMessage: mockParams.systemMessage,
                message: 'Please continue based on the tool execution results above.',
                settings: mockParams.settings,
                historicalMessages: [
                    ...mockParams.historicalMessages,
                    { role: 'assistant' as const, content: mockResponse.content },
                    ...toolMessages
                ]
            });
            expect(mockToolController.resetIterationCount).toHaveBeenCalled();
        });

        it('should handle errors from tool processing', async () => {
            const error = new Error('Tool processing failed');
            mockToolController.processToolCalls.mockRejectedValue(error);

            await expect(toolOrchestrator.processResponse(mockResponse, mockParams))
                .rejects.toThrow('Tool processing failed');

            expect(mockChatController.execute).not.toHaveBeenCalled();
            expect(mockToolController.resetIterationCount).not.toHaveBeenCalled();
        });

        it('should handle errors from chat controller', async () => {
            mockToolController.processToolCalls.mockResolvedValue({
                requiresResubmission: true,
                messages: [{ role: 'function', content: 'tool result' }],
                toolCalls: [{ name: 'tool1', parameters: {} }]
            });

            const error = new Error('Chat execution failed');
            mockChatController.execute.mockRejectedValue(error);

            await expect(toolOrchestrator.processResponse(mockResponse, mockParams))
                .rejects.toThrow('Chat execution failed');

            expect(mockToolController.resetIterationCount).not.toHaveBeenCalled();
        });

        it('should work with undefined historical messages', async () => {
            const paramsWithoutHistory = {
                ...mockParams,
                historicalMessages: undefined
            };

            mockToolController.processToolCalls.mockResolvedValue({
                requiresResubmission: true,
                messages: [{ role: 'function', content: 'tool result' }],
                toolCalls: [{ name: 'tool1', parameters: {} }]
            });

            const newResponse: UniversalChatResponse = {
                role: 'assistant',
                content: 'new response',
                metadata: {}
            };
            mockChatController.execute.mockResolvedValue(newResponse);

            const result = await toolOrchestrator.processResponse(mockResponse, paramsWithoutHistory);

            expect(result).toBe(newResponse);
            expect(mockChatController.execute).toHaveBeenCalledWith({
                model: paramsWithoutHistory.model,
                systemMessage: paramsWithoutHistory.systemMessage,
                message: 'Please continue based on the tool execution results above.',
                settings: paramsWithoutHistory.settings,
                historicalMessages: [
                    { role: 'assistant' as const, content: mockResponse.content },
                    { role: 'function' as const, content: 'tool result' }
                ]
            });
        });
    });
}); 