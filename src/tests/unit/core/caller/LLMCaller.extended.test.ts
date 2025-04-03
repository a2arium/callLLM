import { ChatController } from '../../../../core/chat/ChatController';
import { StreamingService } from '../../../../core/streaming/StreamingService';
import { type UniversalChatParams, type UniversalStreamResponse, type ModelInfo, type Usage } from '../../../../interfaces/UniversalInterfaces';
import { type ToolDefinition, type ToolCall } from '../../../../types/tooling';
import { type RegisteredProviders } from '../../../../adapters';
import { UsageTracker } from '../../../../core/telemetry/UsageTracker';
import { RequestProcessor } from '../../../../core/processors/RequestProcessor';
import { ProviderManager } from '../../../../core/caller/ProviderManager';
import { ModelManager } from '../../../../core/models/ModelManager';
import { LLMCaller } from '../../../../core/caller/LLMCaller';
import { HistoryManager } from '../../../../core/history/HistoryManager';
import { ProviderNotFoundError } from '../../../../adapters/types';
import { UniversalChatResponse, UniversalMessage, FinishReason } from '../../../../interfaces/UniversalInterfaces';
import { ContentAccumulator } from '../../../../core/streaming/processors/ContentAccumulator';
import { StreamHandler } from '../../../../core/streaming/StreamHandler';

describe('LLMCaller - Model Management', () => {
    let mockProviderManager: jest.Mocked<ProviderManager>;
    let mockModelManager: jest.Mocked<ModelManager>;
    let mockRequestProcessor: jest.Mocked<RequestProcessor>;
    let mockStreamingService: jest.Mocked<StreamingService>;
    let mockUsageTracker: jest.Mocked<UsageTracker>;
    let mockChatController: jest.Mocked<ChatController>;
    let mockHistoryManager: jest.Mocked<HistoryManager>;
    let llmCaller: LLMCaller;

    beforeEach(() => {
        mockProviderManager = {
            getCurrentProviderName: jest.fn().mockReturnValue('openai'),
            getProvider: jest.fn()
        } as unknown as jest.Mocked<ProviderManager>;

        const mockModelInfo: ModelInfo = {
            name: 'gpt-4',
            inputPricePerMillion: 0.01,
            outputPricePerMillion: 0.03,
            maxRequestTokens: 8192,
            maxResponseTokens: 4096,
            characteristics: {
                qualityIndex: 90,
                outputSpeed: 60,
                firstTokenLatency: 500
            }
        };

        mockModelManager = {
            getModel: jest.fn().mockReturnValue(mockModelInfo)
        } as unknown as jest.Mocked<ModelManager>;

        mockRequestProcessor = {
            processRequest: jest.fn().mockResolvedValue(['test message'])
        } as unknown as jest.Mocked<RequestProcessor>;

        mockStreamingService = {
            createStream: jest.fn()
        } as unknown as jest.Mocked<StreamingService>;

        const mockUsage: Usage = {
            tokens: {
                input: 10,
                inputCached: 0,
                output: 20,
                total: 30
            },
            costs: {
                input: 0.0001,
                inputCached: 0,
                output: 0.0006,
                total: 0.0007
            }
        };

        mockUsageTracker = {
            trackUsage: jest.fn().mockResolvedValue(mockUsage)
        } as unknown as jest.Mocked<UsageTracker>;

        mockChatController = {
            processResponse: jest.fn(),
            execute: jest.fn()
        } as unknown as jest.Mocked<ChatController>;

        mockHistoryManager = {
            addMessage: jest.fn(),
            getHistoricalMessages: jest.fn().mockReturnValue([])
        } as unknown as jest.Mocked<HistoryManager>;

        llmCaller = new LLMCaller('openai', 'gpt-4', 'system message', {
            apiKey: 'test-key',
            providerManager: mockProviderManager,
            modelManager: mockModelManager,
            chatController: mockChatController,
            streamingService: mockStreamingService,
            historyManager: mockHistoryManager,
            usageCallback: (usage) => {
                mockUsageTracker.trackUsage('test message', 'test response', mockModelInfo);
            }
        });
    });

    describe('streaming', () => {
        it('should stream responses without chunking', async () => {
            const message = 'test message';
            const mockStream = [
                { contentText: 'partial', role: 'assistant', isComplete: false },
                { contentText: 'complete', role: 'assistant', isComplete: true }
            ];
            mockStreamingService.createStream.mockResolvedValue(async function* () {
                for (const chunk of mockStream) {
                    yield chunk as UniversalStreamResponse;
                }
            }());

            const stream = await llmCaller.stream(message);
            const responses = [];
            for await (const response of stream) {
                responses.push(response);
            }

            // Verify message was added to history
            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('user', message);

            // Verify stream was created
            expect(mockStreamingService.createStream).toHaveBeenCalledWith(
                expect.objectContaining({
                    callerId: expect.any(String)
                }),
                'gpt-4',
                undefined
            );

            // Verify responses were collected
            expect(responses).toEqual([
                { contentText: 'partial', role: 'assistant', isComplete: false },
                { contentText: 'complete', role: 'assistant', isComplete: true }
            ]);

            // Verify final message was added to history
            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('assistant', 'complete');
        });
    });

    test('should handle provider not found error', async () => {
        mockModelManager.getModel.mockReturnValue({
            name: 'gpt-4',
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
        mockProviderManager.getProvider.mockImplementation(() => {
            throw new ProviderNotFoundError('test-provider');
        });
        mockChatController.execute.mockImplementation(async (params) => {
            throw new ProviderNotFoundError('test-provider');
        });

        await expect(llmCaller.call('test message', {
            settings: { stream: false }
        })).rejects.toThrow('Provider "test-provider" not found in registry');
    });
});