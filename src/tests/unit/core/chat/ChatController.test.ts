import { jest } from '@jest/globals';
import { ChatController } from '../../../../core/chat/ChatController';
import { ProviderManager } from '../../../../core/caller/ProviderManager';
import { ModelManager } from '../../../../core/models/ModelManager';
import { ResponseProcessor } from '../../../../core/processors/ResponseProcessor';
import { UsageTracker } from '../../../../core/telemetry/UsageTracker';
import { ToolController } from '../../../../core/tools/ToolController';
import { ToolOrchestrator } from '../../../../core/tools/ToolOrchestrator';
import { HistoryManager } from '../../../../core/history/HistoryManager';
import { RetryManager } from '../../../../core/retry/RetryManager';
import { UniversalChatResponse, FinishReason, UniversalMessage } from '../../../../interfaces/UniversalInterfaces';
import { shouldRetryDueToContent } from '../../../../core/retry/utils/ShouldRetryDueToContent';
import { Mock } from 'jest-mock';

type MockProvider = {
    chatCall: jest.Mock;
    name: string;
    models: string[];
};

type ProviderManagerMock = {
    getProvider: () => MockProvider;
};

const createMockProvider = (): ProviderManagerMock => {
    const defaultResponse: UniversalChatResponse = {
        content: 'Test response',
        role: 'assistant',
        metadata: {
            finishReason: FinishReason.STOP,
            usage: {
                tokens: {
                    input: 10,
                    inputCached: 0,
                    output: 10,
                    total: 20
                },
                costs: {
                    input: 0.0001,
                    inputCached: 0,
                    output: 0.0002,
                    total: 0.0003
                }
            }
        },
        toolCalls: []
    };

    const mockProvider: MockProvider = {
        chatCall: jest.fn().mockImplementation(() => Promise.resolve(defaultResponse)),
        name: 'mock',
        models: []
    };

    return {
        getProvider: () => mockProvider
    };
};

describe('ChatController', () => {
    let mockProviderManager: ProviderManagerMock;
    let mockModelManager: ModelManager;
    let mockResponseProcessor: ResponseProcessor;
    let mockRetryManager: RetryManager;
    let mockUsageTracker: UsageTracker;
    let mockToolController: ToolController;
    let mockToolOrchestrator: ToolOrchestrator;
    let mockHistoryManager: HistoryManager;
    let chatController: ChatController;

    beforeEach(() => {
        mockProviderManager = createMockProvider();
        mockModelManager = {
            getModel: jest.fn().mockReturnValue({
                name: 'test-model',
                provider: 'mock',
                capabilities: {
                    streaming: true,
                    tools: true,
                    jsonMode: true
                }
            })
        } as unknown as ModelManager;
        mockResponseProcessor = {
            validateResponse: jest.fn().mockImplementation((response) => Promise.resolve(response)),
            validateJsonMode: jest.fn()
        } as unknown as ResponseProcessor;
        mockRetryManager = new RetryManager({ baseDelay: 1, maxRetries: 0 });
        mockUsageTracker = {
            trackUsage: jest.fn().mockImplementation(() => Promise.resolve({
                tokens: {
                    input: 10,
                    inputCached: 0,
                    output: 10,
                    total: 20
                },
                costs: {
                    input: 0.0001,
                    inputCached: 0,
                    output: 0.0002,
                    total: 0.0003
                }
            }))
        } as unknown as UsageTracker;
        mockToolController = {
            getTools: jest.fn().mockReturnValue([])
        } as unknown as ToolController;
        mockToolOrchestrator = {
            processToolCalls: jest.fn().mockImplementation(async () => ({
                requiresResubmission: false,
                newToolCalls: 0
            }))
        } as unknown as ToolOrchestrator;
        mockHistoryManager = {
            getMessages: jest.fn().mockReturnValue([]),
            addMessage: jest.fn(),
            getSystemMessage: jest.fn().mockReturnValue({ role: 'system', content: 'Test system message' })
        } as unknown as HistoryManager;

        chatController = new ChatController(
            mockProviderManager as unknown as ProviderManager,
            mockModelManager,
            mockResponseProcessor,
            mockRetryManager,
            mockUsageTracker,
            mockToolController,
            mockToolOrchestrator,
            mockHistoryManager
        );
    });

    it('should execute chat call successfully with default settings', async () => {
        const response = await chatController.execute({
            model: 'test-model',
            messages: [{ role: 'user', content: 'Hello' }]
        });

        expect(response).toBeDefined();
        expect(response.content).toBe('Test response');
    });

    // ... rest of the tests ...
});