import { jest } from '@jest/globals';
import { LLMCaller } from '../../../../core/caller/LLMCaller';
import type { StreamingService } from '../../../../core/streaming/StreamingService';
import type { ProviderManager } from '../../../../core/caller/ProviderManager';
import type { ModelManager } from '../../../../core/models/ModelManager';
import type { ResponseProcessor } from '../../../../core/processors/ResponseProcessor';
import type { RetryManager } from '../../../../core/retry/RetryManager';
import type { HistoryManager } from '../../../../core/history/HistoryManager';
import type { TokenCalculator } from '../../../../core/models/TokenCalculator';
import type { UniversalMessage, UniversalStreamResponse, ModelInfo } from '../../../../interfaces/UniversalInterfaces';
import type { SupportedProviders } from '../../../../core/types';

// Define RequestProcessor interface type
type RequestProcessor = {
    processRequest: (params: any) => Promise<string[]>;
}

describe('LLMCaller', () => {
    let mockStreamingService: jest.Mocked<StreamingService>;
    let mockProviderManager: jest.Mocked<ProviderManager>;
    let mockModelManager: jest.Mocked<ModelManager>;
    let mockResponseProcessor: jest.Mocked<ResponseProcessor>;
    let mockRetryManager: jest.Mocked<RetryManager>;
    let mockHistoryManager: jest.Mocked<HistoryManager>;
    let mockTokenCalculator: jest.Mocked<TokenCalculator>;
    let llmCaller: LLMCaller;

    beforeEach(() => {
        jest.useFakeTimers();

        mockStreamingService = {
            createStream: jest.fn(),
            setCallerId: jest.fn(),
            setUsageCallback: jest.fn(),
            getTokenCalculator: jest.fn().mockReturnValue(mockTokenCalculator),
            getResponseProcessor: jest.fn().mockReturnValue(mockResponseProcessor),
            executeWithRetry: jest.fn()
        } as unknown as jest.Mocked<StreamingService>;

        mockProviderManager = {
            getProvider: jest.fn(),
            switchProvider: jest.fn(),
            getCurrentProviderName: jest.fn().mockReturnValue('openai' as SupportedProviders)
        } as unknown as jest.Mocked<ProviderManager>;

        const mockModelInfo: ModelInfo = {
            name: 'test-model',
            inputPricePerMillion: 0.01,
            outputPricePerMillion: 0.02,
            maxRequestTokens: 4000,
            maxResponseTokens: 1000,
            characteristics: {
                qualityIndex: 80,
                outputSpeed: 20,
                firstTokenLatency: 500
            }
        };

        mockModelManager = {
            getModel: jest.fn().mockReturnValue(mockModelInfo),
            getAvailableModels: jest.fn(),
            addModel: jest.fn(),
            updateModel: jest.fn(),
            clearModels: jest.fn(),
            hasModel: jest.fn(),
            resolveModel: jest.fn()
        } as unknown as jest.Mocked<ModelManager>;

        mockResponseProcessor = {
            validateResponse: jest.fn(),
            validateJsonMode: jest.fn(),
            parseJson: jest.fn(),
            validateWithSchema: jest.fn()
        } as unknown as jest.Mocked<ResponseProcessor>;

        mockRetryManager = {
            executeWithRetry: jest.fn()
        } as unknown as jest.Mocked<RetryManager>;

        mockHistoryManager = {
            initializeWithSystemMessage: jest.fn(),
            clearHistory: jest.fn(),
            setHistoricalMessages: jest.fn(),
            getLastMessages: jest.fn(),
            validateMessage: jest.fn(),
            serializeHistory: jest.fn(),
            deserializeHistory: jest.fn(),
            captureStreamResponse: jest.fn(),
            getHistoricalMessages: jest.fn().mockReturnValue([]),
            addMessage: jest.fn(),
            getLastMessageByRole: jest.fn(),
            updateSystemMessage: jest.fn(),
            addToolCallToHistory: jest.fn(),
            getHistorySummary: jest.fn()
        } as unknown as jest.Mocked<HistoryManager>;

        mockTokenCalculator = {
            calculateTotalTokens: jest.fn(),
            calculateTokens: jest.fn(),
            calculateUsage: jest.fn()
        } as unknown as jest.Mocked<TokenCalculator>;

        llmCaller = new LLMCaller(
            'openai',
            'gpt-4',
            'You are a helpful assistant.',
            {
                streamingService: mockStreamingService,
                providerManager: mockProviderManager,
                modelManager: mockModelManager,
                responseProcessor: mockResponseProcessor,
                retryManager: mockRetryManager,
                historyManager: mockHistoryManager,
                tokenCalculator: mockTokenCalculator
            }
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    describe('stream methods', () => {
        it('should throw an error after exhausting all retries', async () => {
            const error = new Error('Stream creation failed');

            // Configure mockStreamingService to throw an error after being called
            mockStreamingService.createStream.mockRejectedValue(error);

            // Mock the request processor to return a single message
            (llmCaller as any).requestProcessor = {
                processRequest: jest.fn().mockImplementation(() => Promise.resolve(['test message']))
            };

            // Execute the call and expect it to fail
            await expect(llmCaller.stream('test message')).rejects.toThrow('Stream creation failed');

            // Verify the createStream was called at least once
            expect(mockStreamingService.createStream).toHaveBeenCalledTimes(1);
        });

        it('should respect custom maxRetries setting', async () => {
            const error = new Error('Stream creation failed');

            // Configure mockStreamingService to throw an error after being called
            mockStreamingService.createStream.mockRejectedValue(error);

            // Mock the request processor to return a single message
            (llmCaller as any).requestProcessor = {
                processRequest: jest.fn().mockImplementation(() => Promise.resolve(['test message']))
            };

            // Set maxRetries to 1 in options
            const customOptions = {
                settings: {
                    retrySettings: {
                        maxRetries: 1,
                        initialDelay: 1000,
                        maxDelay: 5000,
                        backoffFactor: 2,
                    }
                }
            };

            // Execute the call with custom options and expect it to fail
            await expect(llmCaller.stream('test message', customOptions)).rejects.toThrow('Stream creation failed');

            // Verify the createStream was called at least once with the proper settings
            expect(mockStreamingService.createStream).toHaveBeenCalledWith(
                expect.objectContaining({
                    settings: expect.objectContaining({
                        retrySettings: expect.objectContaining({
                            maxRetries: 1
                        })
                    })
                }),
                'test-model',
                'You are a helpful assistant.'
            );

            // Verify the number of calls
            expect(mockStreamingService.createStream).toHaveBeenCalledTimes(1);
        });

        it('should use proper call parameters', async () => {
            // Setup mock to return a valid async generator
            mockStreamingService.createStream.mockResolvedValue((async function* () {
                yield { content: 'Hello', role: 'assistant', isComplete: false };
                yield { content: 'Hello world', role: 'assistant', isComplete: true };
            })());

            // Mock the request processor to return a single message
            (llmCaller as any).requestProcessor = {
                processRequest: jest.fn().mockImplementation(() => Promise.resolve(['test message']))
            };

            // Call the stream method with a message
            await llmCaller.stream('test message');

            // Verify createStream was called with the expected parameters
            expect(mockStreamingService.createStream).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: expect.arrayContaining([
                        expect.objectContaining({
                            role: 'user',
                            content: 'test message'
                        })
                    ])
                }),
                'test-model',
                'You are a helpful assistant.'
            );
        });
    });
});