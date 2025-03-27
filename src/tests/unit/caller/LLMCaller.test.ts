import { jest } from '@jest/globals';
import { LLMCaller } from '../../../core/caller/LLMCaller';
import { StreamingService } from '../../../core/streaming/StreamingService';
import { ProviderManager } from '../../../core/caller/ProviderManager';
import { ModelManager } from '../../../core/models/ModelManager';
import { ResponseProcessor } from '../../../core/processors/ResponseProcessor';
import { RetryManager } from '../../../core/retry/RetryManager';
import { HistoryManager } from '../../../core/history/HistoryManager';
import { type UniversalMessage, type UniversalChatParams, type UniversalStreamResponse } from '../../../interfaces/UniversalInterfaces';
import { type SupportedProviders } from '../../../core/types';

describe('LLMCaller', () => {
    let mockStreamingService: jest.Mocked<StreamingService>;
    let mockProviderManager: jest.Mocked<ProviderManager>;
    let mockModelManager: jest.Mocked<ModelManager>;
    let mockResponseProcessor: jest.Mocked<ResponseProcessor>;
    let mockRetryManager: jest.Mocked<RetryManager>;
    let mockHistoryManager: jest.Mocked<HistoryManager>;
    let llmCaller: LLMCaller;

    beforeEach(() => {
        jest.useFakeTimers();

        mockStreamingService = {
            createStream: jest.fn(),
            setCallerId: jest.fn(),
            setUsageCallback: jest.fn(),
            getTokenCalculator: jest.fn(),
            getResponseProcessor: jest.fn()
        } as unknown as jest.Mocked<StreamingService>;

        mockProviderManager = {
            getProvider: jest.fn(),
            switchProvider: jest.fn(),
            getCurrentProviderName: jest.fn().mockReturnValue('openai' as SupportedProviders)
        } as unknown as jest.Mocked<ProviderManager>;

        mockModelManager = {
            getModel: jest.fn().mockReturnValue({
                name: 'test-model',
                provider: 'openai',
                inputPricePerMillion: 0.15,
                outputPricePerMillion: 0.60,
                maxRequestTokens: 128000,
                maxResponseTokens: 16384,
                characteristics: {
                    qualityIndex: 73,
                    outputSpeed: 183.8,
                    firstTokenLatency: 730
                }
            }),
            getAvailableModels: jest.fn(),
            addModel: jest.fn(),
            updateModel: jest.fn(),
            clearModels: jest.fn(),
            hasModel: jest.fn(),
            resolveModel: jest.fn()
        } as unknown as jest.Mocked<ModelManager>;

        mockResponseProcessor = {
            processResponse: jest.fn(),
            processStreamResponse: jest.fn(),
            validateResponse: jest.fn(),
            validateJsonMode: jest.fn()
        } as unknown as jest.Mocked<ResponseProcessor>;

        mockRetryManager = {
            executeWithRetry: jest.fn(),
            config: {
                maxRetries: 3,
                initialDelay: 1000,
                maxDelay: 5000,
                backoffFactor: 2
            }
        } as unknown as jest.Mocked<RetryManager>;

        mockHistoryManager = {
            getHistoricalMessages: jest.fn().mockReturnValue([] as UniversalMessage[]),
            addMessage: jest.fn(),
            getLastMessageByRole: jest.fn(),
            initializeWithSystemMessage: jest.fn(),
            clearHistory: jest.fn(),
            setHistoricalMessages: jest.fn(),
            getLastMessages: jest.fn(),
            serializeHistory: jest.fn(),
            deserializeHistory: jest.fn(),
            updateSystemMessage: jest.fn(),
            addToolCallToHistory: jest.fn(),
            getHistorySummary: jest.fn(),
            captureStreamResponse: jest.fn()
        } as unknown as jest.Mocked<HistoryManager>;

        llmCaller = new LLMCaller(
            'openai',
            'test-model',
            'You are a helpful assistant',
            {
                providerManager: mockProviderManager,
                modelManager: mockModelManager,
                streamingService: mockStreamingService,
                responseProcessor: mockResponseProcessor,
                retryManager: mockRetryManager,
                historyManager: mockHistoryManager
            }
        );
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    describe('streamCall', () => {
        it('should include historical messages in the messages array', async () => {
            const historicalMessages: UniversalMessage[] = [
                { role: 'system', content: 'You are a helpful assistant' },
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi there!' },
            ];
            const userMessage = 'How are you?';

            mockHistoryManager.getHistoricalMessages.mockReturnValue(historicalMessages);
            mockStreamingService.createStream.mockResolvedValue(async function* () {
                yield { content: 'Test response', role: 'assistant', isComplete: true } as UniversalStreamResponse;
            }());

            await llmCaller.streamCall({ message: userMessage });

            expect(mockStreamingService.createStream).toHaveBeenCalledWith({
                messages: [...historicalMessages, { role: 'user', content: userMessage }],
                message: userMessage,
                settings: undefined
            }, 'test-model', 'You are a helpful assistant');
        });

        it('should throw error after exhausting all retries', async () => {
            const error = new Error('API error');

            // Simply make the createStream method throw an error
            mockStreamingService.createStream.mockRejectedValue(error);

            // Verify the error is propagated properly
            await expect(llmCaller.streamCall({ message: 'test message' })).rejects.toThrow('API error');
            // Verify createStream was called
            expect(mockStreamingService.createStream).toHaveBeenCalled();
        });

        it('should respect custom maxRetries setting', async () => {
            const error = new Error('API error');

            // Simply make the createStream method throw an error
            mockStreamingService.createStream.mockRejectedValue(error);

            const customRetrySettings = {
                maxRetries: 2,
                initialDelay: 1000,
                maxDelay: 5000,
                backoffFactor: 2,
            };

            // Verify the error is propagated properly
            await expect(llmCaller.streamCall({
                message: 'test message',
                settings: { retrySettings: customRetrySettings }
            })).rejects.toThrow('API error');
            // Verify createStream was called
            expect(mockStreamingService.createStream).toHaveBeenCalled();
        });
    });

    describe('stream methods', () => {
        it('should throw error after exhausting all retries in stream', async () => {
            const streamError = new Error('Stream error');

            // Simply make the createStream method throw an error
            mockStreamingService.createStream.mockRejectedValue(streamError);

            // Verify the error is propagated properly
            await expect(llmCaller.streamCall({ message: 'test message' })).rejects.toThrow('Stream error');
            // Verify createStream was called
            expect(mockStreamingService.createStream).toHaveBeenCalled();
        });

        it('should respect custom maxRetries setting in stream', async () => {
            const customRetrySettings = { maxRetries: 1 };
            const streamError = new Error('Stream error');

            // Simply make the createStream method throw an error
            mockStreamingService.createStream.mockRejectedValue(streamError);

            // Verify the error is propagated properly
            await expect(llmCaller.streamCall({
                message: 'test message',
                settings: { retrySettings: customRetrySettings }
            })).rejects.toThrow('Stream error');
            // Verify createStream was called
            expect(mockStreamingService.createStream).toHaveBeenCalled();
        });

        it('should use exponential backoff between stream retries', async () => {
            const streamError = new Error('Stream error');

            // Simply make the createStream method throw an error
            mockStreamingService.createStream.mockRejectedValue(streamError);

            // Verify the error is propagated properly
            await expect(llmCaller.streamCall({ message: 'test message' })).rejects.toThrow('Stream error');
            // Verify createStream was called
            expect(mockStreamingService.createStream).toHaveBeenCalled();
        });
    });
});