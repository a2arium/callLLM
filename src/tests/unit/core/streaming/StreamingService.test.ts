import { StreamingService } from '../../../../core/streaming/StreamingService';
import { ProviderManager } from '../../../../core/caller/ProviderManager';
import { ModelManager } from '../../../../core/models/ModelManager';
import { TokenCalculator } from '../../../../core/models/TokenCalculator';
import { ResponseProcessor } from '../../../../core/processors/ResponseProcessor';
import { RetryManager } from '../../../../core/retry/RetryManager';
import { StreamHandler } from '../../../../core/streaming/StreamHandler';
import { UniversalChatParams, UniversalStreamResponse, ModelInfo } from '../../../../interfaces/UniversalInterfaces';
import { UsageCallback } from '../../../../interfaces/UsageInterfaces';

// Create mock dependencies
jest.mock('../../../../core/caller/ProviderManager');
jest.mock('../../../../core/models/ModelManager');
jest.mock('../../../../core/streaming/StreamHandler');
jest.mock('../../../../core/retry/RetryManager');

describe('StreamingService', () => {
    // Mock dependencies
    let mockProviderManager: jest.Mocked<ProviderManager>;
    let mockModelManager: jest.Mocked<ModelManager>;
    let mockRetryManager: jest.Mocked<RetryManager>;
    let mockStreamHandler: jest.Mocked<StreamHandler>;
    let mockProvider: { streamCall: jest.Mock };
    let mockUsageCallback: jest.Mock;

    // Test data
    const testModel = 'test-model';
    const testSystemMessage = 'You are a test assistant';
    const callerId = 'test-caller-id';

    // Sample model info
    const modelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 1000,
        outputPricePerMillion: 2000,
        maxRequestTokens: 8000,
        maxResponseTokens: 2000,
        characteristics: {
            qualityIndex: 80,
            outputSpeed: 100,
            firstTokenLatency: 0.5
        }
    };

    // Sample stream response for mocks
    const mockStreamResponse = async function* () {
        yield { content: 'Test', role: 'assistant', isComplete: false };
        yield { content: ' response', role: 'assistant', isComplete: true };
    };

    // HELPER FUNCTIONS
    async function* mockProcessedStream(): AsyncGenerator<UniversalStreamResponse> {
        yield { content: 'Test', role: 'assistant', isComplete: false };
        yield { content: ' response', role: 'assistant', isComplete: true };
    }

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Setup mocks
        mockProvider = { streamCall: jest.fn() };
        mockProviderManager = {
            getProvider: jest.fn().mockReturnValue(mockProvider),
        } as unknown as jest.Mocked<ProviderManager>;

        mockModelManager = {
            getModel: jest.fn().mockReturnValue(modelInfo)
        } as unknown as jest.Mocked<ModelManager>;

        mockStreamHandler = {
            processStream: jest.fn()
        } as unknown as jest.Mocked<StreamHandler>;

        mockRetryManager = {
            executeWithRetry: jest.fn()
        } as unknown as jest.Mocked<RetryManager>;

        mockUsageCallback = jest.fn();

        // Setup provider stream mock
        mockProvider.streamCall.mockResolvedValue(mockStreamResponse());

        // Setup stream handler mock
        mockStreamHandler.processStream.mockReturnValue(mockProcessedStream());

        // Setup retry manager mock
        mockRetryManager.executeWithRetry.mockImplementation(async (fn) => {
            return fn();
        });

        // Override the StreamHandler constructor
        (StreamHandler as jest.Mock).mockImplementation(() => mockStreamHandler);
    });

    it('should create a stream with system message', async () => {
        // Create mock HistoryManager
        const mockHistoryManager = {
            addMessage: jest.fn(),
            getHistoricalMessages: jest.fn().mockReturnValue([]),
            getLatestMessages: jest.fn(),
            systemMessage: 'Test system message'
        } as unknown as any;

        // Create service with correct constructor parameters
        const service = new StreamingService(
            mockProviderManager,
            mockModelManager,
            mockHistoryManager,
            mockRetryManager,
            mockUsageCallback,
            callerId
        );

        // Create stream params without system message
        const params: UniversalChatParams = {
            messages: [{ role: 'user', content: 'Test message' }],
            settings: { stream: true }
        };

        // Call createStream
        const stream = await service.createStream(params, testModel, testSystemMessage);

        // Collect results to trigger execution
        const results: UniversalStreamResponse[] = [];
        for await (const chunk of stream) {
            results.push(chunk);
        }

        // Check that the system message was prepended
        expect(mockProvider.streamCall).toHaveBeenCalledWith(
            testModel,
            expect.objectContaining({
                messages: [
                    { role: 'system', content: testSystemMessage },
                    { role: 'user', content: 'Test message' }
                ]
            })
        );

        // Verify other expected calls
        expect(mockModelManager.getModel).toHaveBeenCalledWith(testModel);
        expect(mockStreamHandler.processStream).toHaveBeenCalled();

        // Verify results are as expected
        expect(results.length).toBe(2);
        expect(results[0].content).toBe('Test');
        expect(results[1].content).toBe(' response');
    });

    it('should not prepend system message if one already exists', async () => {
        // Create mock HistoryManager
        const mockHistoryManager = {
            addMessage: jest.fn(),
            getHistoricalMessages: jest.fn().mockReturnValue([]),
            getLatestMessages: jest.fn(),
            systemMessage: 'Test system message'
        } as unknown as any;

        // Create service with correct constructor parameters
        const service = new StreamingService(
            mockProviderManager,
            mockModelManager,
            mockHistoryManager,
            mockRetryManager
        );

        // Create stream params with system message already included
        const params: UniversalChatParams = {
            messages: [
                { role: 'system', content: 'Existing system message' },
                { role: 'user', content: 'Test message' }
            ],
            settings: { stream: true }
        };

        // Call createStream
        const stream = await service.createStream(params, testModel, testSystemMessage);

        // Collect results to trigger execution
        const results: UniversalStreamResponse[] = [];
        for await (const chunk of stream) {
            results.push(chunk);
        }

        // Verify the existing system message was kept, not overwritten
        expect(mockProvider.streamCall).toHaveBeenCalledWith(
            testModel,
            expect.objectContaining({
                messages: [
                    { role: 'system', content: 'Existing system message' },
                    { role: 'user', content: 'Test message' }
                ]
            })
        );
    });

    it('should handle retries correctly', async () => {
        // Configure retry manager to simulate a retry
        mockRetryManager.executeWithRetry.mockImplementation(async (fn) => {
            // First call fails, second succeeds
            try {
                return await fn();
            } catch (error) {
                return await fn();
            }
        });

        // Create mock HistoryManager
        const mockHistoryManager = {
            addMessage: jest.fn(),
            getHistoricalMessages: jest.fn().mockReturnValue([]),
            getLatestMessages: jest.fn(),
            systemMessage: 'Test system message'
        } as unknown as any;

        // Create service with correct constructor parameters
        const service = new StreamingService(
            mockProviderManager,
            mockModelManager,
            mockHistoryManager,
            mockRetryManager
        );

        // Create stream params
        const params: UniversalChatParams = {
            messages: [{ role: 'user', content: 'Test message' }],
            settings: { stream: true }
        };

        // Make the provider fail on first call
        mockProvider.streamCall.mockRejectedValueOnce(new Error('Test error'));
        mockProvider.streamCall.mockResolvedValueOnce(mockStreamResponse());

        // Call createStream
        const stream = await service.createStream(params, testModel);

        // Collect results to trigger execution
        const results: UniversalStreamResponse[] = [];
        for await (const chunk of stream) {
            results.push(chunk);
        }

        // Verify retry was attempted
        expect(mockRetryManager.executeWithRetry).toHaveBeenCalled();

        // Provider should have been called twice (original + retry)
        expect(mockProvider.streamCall).toHaveBeenCalledTimes(2);
    });

    it('should update the callerId correctly', async () => {
        // Create mock HistoryManager
        const mockHistoryManager = {
            addMessage: jest.fn(),
            getHistoricalMessages: jest.fn().mockReturnValue([]),
            getLatestMessages: jest.fn(),
            systemMessage: 'Test system message'
        } as unknown as any;

        // Create service with initial callerId
        const service = new StreamingService(
            mockProviderManager,
            mockModelManager,
            mockHistoryManager,
            mockRetryManager,
            mockUsageCallback,
            'test-caller-id'
        );

        // Update callerId
        service.setCallerId('new-caller-id');

        // Create stream params
        const params: UniversalChatParams = {
            messages: [{ role: 'user', content: 'Test message' }],
            settings: { stream: true }
        };

        // Call createStream to trigger StreamHandler creation
        await service.createStream(params, testModel);

        // Verify that new stream handler was created with updated callerId
        expect(StreamHandler).toHaveBeenLastCalledWith(
            expect.any(TokenCalculator),
            expect.any(Object), // HistoryManager
            expect.any(ResponseProcessor),
            mockUsageCallback,
            'new-caller-id',
            undefined, // toolController
            undefined, // toolOrchestrator
            expect.any(Object) // StreamingService
        );
    });

    it('should update the usage callback correctly', () => {
        // Create mock HistoryManager
        const mockHistoryManager = {
            addMessage: jest.fn(),
            getHistoricalMessages: jest.fn().mockReturnValue([]),
            getLatestMessages: jest.fn(),
            systemMessage: 'Test system message'
        } as unknown as any;

        // Create service with correct constructor parameters
        const service = new StreamingService(
            mockProviderManager,
            mockModelManager,
            mockHistoryManager,
            mockRetryManager,
            mockUsageCallback,
            callerId
        );

        // Update usage callback
        const newCallback = jest.fn();
        service.setUsageCallback(newCallback);

        // Verify that new stream handler was created with updated callback
        expect(StreamHandler).toHaveBeenLastCalledWith(
            expect.any(TokenCalculator),
            expect.any(Object), // HistoryManager
            expect.any(ResponseProcessor),
            newCallback,
            callerId,
            undefined, // toolController
            undefined, // toolOrchestrator
            expect.any(Object) // StreamingService
        );
    });

    it('should throw error when model is not found', async () => {
        // Create mock HistoryManager
        const mockHistoryManager = {
            addMessage: jest.fn(),
            getHistoricalMessages: jest.fn().mockReturnValue([]),
            getLatestMessages: jest.fn(),
            systemMessage: 'Test system message'
        } as unknown as any;

        // Create service with correct constructor parameters
        const service = new StreamingService(
            mockProviderManager,
            mockModelManager,
            mockHistoryManager,
            mockRetryManager
        );

        // Mock model not found
        mockModelManager.getModel.mockReturnValueOnce(undefined);

        // Create stream params
        const params: UniversalChatParams = {
            messages: [{ role: 'user', content: 'Test message' }],
            settings: { stream: true }
        };

        // Expect createStream to throw an error
        await expect(service.createStream(params, 'unknown-model')).rejects.toThrow(
            /Model unknown-model not found/
        );
    });

    it('should use custom maxRetries from params settings', async () => {
        // Create mock HistoryManager
        const mockHistoryManager = {
            addMessage: jest.fn(),
            getHistoricalMessages: jest.fn().mockReturnValue([]),
            getLatestMessages: jest.fn(),
            systemMessage: 'Test system message'
        } as unknown as any;

        // Create service with correct constructor parameters
        const service = new StreamingService(
            mockProviderManager,
            mockModelManager,
            mockHistoryManager,
            mockRetryManager
        );

        // Create stream params with custom maxRetries
        const params: UniversalChatParams = {
            messages: [{ role: 'user', content: 'Test message' }],
            settings: { stream: true, maxRetries: 5 }
        };

        // Call createStream
        await service.createStream(params, testModel);

        // Verify that executeWithRetry was called with the custom maxRetries
        expect(mockRetryManager.executeWithRetry).toHaveBeenCalledWith(
            expect.any(Function),
            expect.any(Function)
        );

        // Access the first argument of the last call (which should be the params object)
        const executeWithRetryCall = mockRetryManager.executeWithRetry.mock.calls[0][0];

        // Execute it to trigger streamCall
        await executeWithRetryCall();

        // Verify that the custom maxRetries setting was used
        expect(mockProvider.streamCall).toHaveBeenCalledWith(
            testModel,
            expect.objectContaining({
                settings: expect.objectContaining({
                    maxRetries: 5
                })
            })
        );
    });

    it('should throw error if retryManager fails after all retries', async () => {
        // Create mock HistoryManager
        const mockHistoryManager = {
            addMessage: jest.fn(),
            getHistoricalMessages: jest.fn().mockReturnValue([]),
            getLatestMessages: jest.fn(),
            systemMessage: 'Test system message'
        } as unknown as any;

        // Configure retry manager to always fail
        mockRetryManager.executeWithRetry.mockRejectedValueOnce(new Error('Max retries exceeded'));

        // Create service with correct constructor parameters
        const service = new StreamingService(
            mockProviderManager,
            mockModelManager,
            mockHistoryManager,
            mockRetryManager
        );

        // Create stream params
        const params: UniversalChatParams = {
            messages: [{ role: 'user', content: 'Test message' }],
            settings: { stream: true }
        };

        // Expect createStream to throw an error due to retry failure
        await expect(service.createStream(params, testModel)).rejects.toThrow('Max retries exceeded');
    });

    it('should handle provider stream error', async () => {
        // Create mock HistoryManager
        const mockHistoryManager = {
            addMessage: jest.fn(),
            getHistoricalMessages: jest.fn().mockReturnValue([]),
            getLatestMessages: jest.fn(),
            systemMessage: 'Test system message'
        } as unknown as any;

        // Create service with correct constructor parameters
        const service = new StreamingService(
            mockProviderManager,
            mockModelManager,
            mockHistoryManager,
            mockRetryManager
        );

        // Set up retry manager to pass through function calls once
        mockRetryManager.executeWithRetry.mockImplementation(async (fn) => {
            return await fn();
        });

        // Make the provider's streamCall throw an error
        const testError = new Error('Stream creation failed');
        mockProvider.streamCall.mockRejectedValueOnce(testError);

        // Create stream params
        const params: UniversalChatParams = {
            messages: [{ role: 'user', content: 'Test message' }],
            settings: { stream: true }
        };

        // Expect createStream to throw the provider error
        await expect(service.createStream(params, testModel)).rejects.toThrow('Stream creation failed');
    });

    it('should return token calculator instance', () => {
        // Create mock HistoryManager
        const mockHistoryManager = {
            addMessage: jest.fn(),
            getHistoricalMessages: jest.fn().mockReturnValue([]),
            getLatestMessages: jest.fn(),
        } as unknown as any;

        // Create service
        const service = new StreamingService(
            mockProviderManager,
            mockModelManager,
            mockHistoryManager,
            mockRetryManager
        );

        // Get the token calculator
        const tokenCalculator = service.getTokenCalculator();

        // Verify that it's an instance of TokenCalculator
        expect(tokenCalculator).toBeInstanceOf(TokenCalculator);
    });

    it('should return response processor instance', () => {
        // Create mock HistoryManager
        const mockHistoryManager = {
            addMessage: jest.fn(),
            getHistoricalMessages: jest.fn().mockReturnValue([]),
            getLatestMessages: jest.fn(),
        } as unknown as any;

        // Create service
        const service = new StreamingService(
            mockProviderManager,
            mockModelManager,
            mockHistoryManager,
            mockRetryManager
        );

        // Get the response processor
        const responseProcessor = service.getResponseProcessor();

        // Verify that it's an instance of ResponseProcessor
        expect(responseProcessor).toBeInstanceOf(ResponseProcessor);
    });
}); 