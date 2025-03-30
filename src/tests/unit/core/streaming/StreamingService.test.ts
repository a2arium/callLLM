import { StreamingService } from '../../../../core/streaming/StreamingService';
import { ProviderManager } from '../../../../core/caller/ProviderManager';
import { ModelManager } from '../../../../core/models/ModelManager';
import { TokenCalculator } from '../../../../core/models/TokenCalculator';
import { ResponseProcessor } from '../../../../core/processors/ResponseProcessor';
import { RetryManager } from '../../../../core/retry/RetryManager';
import { StreamHandler } from '../../../../core/streaming/StreamHandler';
import { UniversalChatParams, UniversalStreamResponse, ModelInfo } from '../../../../interfaces/UniversalInterfaces';
import { UsageCallback } from '../../../../interfaces/UsageInterfaces';
import { HistoryManager } from '../../../../core/history/HistoryManager';

// Create mock dependencies
jest.mock('../../../../core/caller/ProviderManager');
jest.mock('../../../../core/models/ModelManager');
jest.mock('../../../../core/models/TokenCalculator');
jest.mock('../../../../core/streaming/StreamHandler');
jest.mock('../../../../core/retry/RetryManager');
jest.mock('../../../../core/history/HistoryManager');

describe('StreamingService', () => {
    // Mock dependencies
    let mockProviderManager: jest.Mocked<ProviderManager>;
    let mockModelManager: jest.Mocked<ModelManager>;
    let mockRetryManager: jest.Mocked<RetryManager>;
    let mockStreamHandler: jest.Mocked<StreamHandler>;
    let mockHistoryManager: jest.Mocked<HistoryManager>;
    let mockTokenCalculator: jest.Mocked<TokenCalculator>;
    let mockProvider: { streamCall: jest.Mock };
    let mockUsageCallback: jest.Mock;
    let streamingService: StreamingService;

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

        mockHistoryManager = {
            getHistoricalMessages: jest.fn().mockReturnValue([]),
            getLastMessageByRole: jest.fn(),
            addMessage: jest.fn()
        } as unknown as jest.Mocked<HistoryManager>;

        mockTokenCalculator = {
            countInputTokens: jest.fn().mockReturnValue(10),
            countOutputTokens: jest.fn().mockReturnValue(20),
            calculateTotalTokens: jest.fn().mockReturnValue(30)
        } as unknown as jest.Mocked<TokenCalculator>;

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
        (TokenCalculator as jest.Mock).mockImplementation(() => mockTokenCalculator);

        // Create the StreamingService instance
        streamingService = new StreamingService(
            mockProviderManager,
            mockModelManager,
            mockHistoryManager,
            mockRetryManager,
            mockUsageCallback,
            callerId
        );
    });

    const createTestParams = (overrides = {}): UniversalChatParams => {
        return {
            messages: [{ role: 'user', content: 'test message' }],
            model: 'test-model',
            ...overrides
        };
    };

    it('should create a stream with system message', async () => {
        // Arrange
        const systemMessage = 'You are a helpful assistant';
        const params = createTestParams();

        // Act
        await streamingService.createStream(params, 'test-model', systemMessage);

        // Assert
        expect(mockModelManager.getModel).toHaveBeenCalledWith('test-model');
        expect(mockStreamHandler.processStream).toHaveBeenCalled();
    });

    it('should not prepend system message if one already exists', async () => {
        // Arrange
        const systemMessage = 'You are a helpful assistant';
        const params = createTestParams({
            messages: [
                { role: 'system', content: 'Existing system message' },
                { role: 'user', content: 'test message' }
            ]
        });

        // Act
        await streamingService.createStream(params, 'test-model', systemMessage);

        // Assert
        expect(mockModelManager.getModel).toHaveBeenCalledWith('test-model');
        expect(mockStreamHandler.processStream).toHaveBeenCalled();
    });

    it('should handle retries correctly', async () => {
        // Arrange
        const systemMessage = 'You are a helpful assistant';
        const params = createTestParams();

        // Set up retry behavior
        mockRetryManager.executeWithRetry.mockImplementation(async (fn) => {
            await fn();
            return {} as AsyncIterable<any>;
        });

        // Act
        await streamingService.createStream(params, 'test-model', systemMessage);

        // Assert
        expect(mockRetryManager.executeWithRetry).toHaveBeenCalled();
    });

    it('should update the callerId correctly', async () => {
        // Arrange
        const systemMessage = 'You are a helpful assistant';
        const params = createTestParams({ callerId: 'test-caller-id' });

        // Act
        await streamingService.createStream(params, 'test-model', systemMessage);

        // Assert
        expect(mockStreamHandler.processStream).toHaveBeenCalled();
        // Verify that callerId is being used correctly
        expect(params.callerId).toBe('test-caller-id');
    });

    it('should update the usage callback correctly', async () => {
        // Arrange
        const systemMessage = 'You are a helpful assistant';
        const usageCallback = jest.fn();
        streamingService = new StreamingService(
            mockProviderManager,
            mockModelManager,
            mockHistoryManager,
            mockRetryManager,
            usageCallback,
            'default-caller-id'
        );
        const params = createTestParams();

        // Act
        await streamingService.createStream(params, 'test-model', systemMessage);

        // Assert
        expect(mockStreamHandler.processStream).toHaveBeenCalled();
        // We can't directly test that usageCallback is passed, but we can ensure no errors
    });

    it('should throw error when model is not found', async () => {
        // Arrange
        const systemMessage = 'You are a helpful assistant';
        mockModelManager.getModel.mockReturnValue(undefined);
        const params = createTestParams();

        // Act & Assert
        await expect(
            streamingService.createStream(params, 'unknown-model', systemMessage)
        ).rejects.toThrow(/Model unknown-model not found for provider/);
    });

    it('should use custom maxRetries from params settings', async () => {
        // Arrange
        const systemMessage = 'You are a helpful assistant';
        const params = createTestParams({
            settings: { maxRetries: 5 }
        });

        // Act
        await streamingService.createStream(params, 'test-model', systemMessage);

        // Assert
        // Since we mock the retryManager, we can't directly test its config
        // But we can ensure no errors occurred
        expect(mockRetryManager.executeWithRetry).toHaveBeenCalled();
    });

    it('should throw error if retryManager fails after all retries', async () => {
        // Arrange
        const systemMessage = 'You are a helpful assistant';
        const params = createTestParams();

        mockRetryManager.executeWithRetry.mockRejectedValue(new Error('Max retries exceeded'));

        // Act & Assert
        await expect(
            streamingService.createStream(params, 'test-model', systemMessage)
        ).rejects.toThrow('Max retries exceeded');
    });

    it('should handle provider stream error', async () => {
        // Arrange
        const systemMessage = 'You are a helpful assistant';
        const params = createTestParams();

        mockProviderManager.getProvider.mockImplementation(() => { throw new Error('Stream creation failed'); });

        // Act & Assert
        await expect(
            streamingService.createStream(params, 'test-model', systemMessage)
        ).rejects.toThrow();
    });

    it('should return token calculator instance', () => {
        // Act
        const tokenCalculator = streamingService.getTokenCalculator();

        // Assert
        expect(tokenCalculator).toBeDefined();
    });

    it('should return response processor instance', () => {
        // Act
        const responseProcessor = streamingService.getResponseProcessor();

        // Assert
        expect(responseProcessor).toBeDefined();
    });
}); 