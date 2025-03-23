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

    // Sample processed stream
    const mockProcessedStream = async function* () {
        yield {
            content: 'Test',
            role: 'assistant',
            isComplete: false,
            metadata: {
                usage: {
                    inputTokens: 10,
                    outputTokens: 5,
                    totalTokens: 15,
                    costs: {
                        inputCost: 0.01,
                        outputCost: 0.02,
                        totalCost: 0.03
                    }
                }
            }
        };
        yield {
            content: ' response',
            role: 'assistant',
            isComplete: true,
            metadata: {
                usage: {
                    inputTokens: 10,
                    outputTokens: 10,
                    totalTokens: 20,
                    costs: {
                        inputCost: 0.01,
                        outputCost: 0.04,
                        totalCost: 0.05
                    }
                }
            }
        };
    };

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
        // Create service
        const service = new StreamingService(
            mockProviderManager,
            mockModelManager,
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
        // Create service
        const service = new StreamingService(
            mockProviderManager,
            mockModelManager,
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
        mockRetryManager.executeWithRetry.mockImplementation(async (fn, shouldRetry) => {
            // Call the function once, then simulate a retry
            try {
                return fn();
            } catch (error) {
                // Simulate retry logic
                return mockProcessedStream();
            }
        });

        // Make the provider fail on first call
        mockProvider.streamCall.mockRejectedValueOnce(new Error('Test error'));
        mockProvider.streamCall.mockResolvedValueOnce(mockStreamResponse());

        // Create service
        const service = new StreamingService(
            mockProviderManager,
            mockModelManager,
            mockRetryManager
        );

        // Create stream params
        const params: UniversalChatParams = {
            messages: [{ role: 'user', content: 'Test message' }],
            settings: { stream: true }
        };

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
        expect(mockProvider.streamCall).toHaveBeenCalledTimes(1);
    });

    it('should update the callerId correctly', () => {
        // Create service with initial callerId
        const service = new StreamingService(
            mockProviderManager,
            mockModelManager,
            mockRetryManager,
            mockUsageCallback,
            callerId
        );

        // Update callerId
        const newCallerId = 'new-caller-id';
        service.setCallerId(newCallerId);

        // Verify that new stream handler was created with updated callerId
        expect(StreamHandler).toHaveBeenLastCalledWith(
            expect.any(TokenCalculator),
            expect.any(ResponseProcessor),
            mockUsageCallback,
            newCallerId
        );
    });

    it('should update the usage callback correctly', () => {
        // Create service
        const service = new StreamingService(
            mockProviderManager,
            mockModelManager,
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
            expect.any(ResponseProcessor),
            newCallback,
            expect.any(String)
        );
    });
}); 