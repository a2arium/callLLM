import { ChatController } from '../../../../core/chat/ChatController';
import { ProviderManager } from '../../../../core/caller/ProviderManager';
import { ModelManager } from '../../../../core/models/ModelManager';
import { ResponseProcessor } from '../../../../core/processors/ResponseProcessor';
import { UsageTracker } from '../../../../core/telemetry/UsageTracker';
import { UniversalChatParams, UniversalChatResponse } from '../../../../interfaces/UniversalInterfaces';
import { RetryManager } from '../../../../core/retry/RetryManager';
import { z } from 'zod';

// Mock the RetryManager so that the local instance created inside ChatController#execute executes the call immediately.
jest.mock('../../../../core/retry/RetryManager', () => {
    return {
        RetryManager: jest.fn().mockImplementation((_config: { baseDelay: number; maxRetries: number }) => ({
            executeWithRetry: <T>(fn: () => Promise<T>, _shouldRetry: (err: unknown) => boolean): Promise<T> => fn()
        }))
    };
});

type ModelInfo = {
    name: string;
    inputPricePerMillion: number;
    outputPricePerMillion: number;
    maxRequestTokens: number;
    maxResponseTokens: number;
    characteristics: {
        qualityIndex: number;
        outputSpeed: number;
        firstTokenLatency: number;
    };
};

type Usage = {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costs: {
        inputCost: number;
        outputCost: number;
        totalCost: number;
    };
};

type MockProvider = {
    chatCall: jest.Mock<Promise<UniversalChatResponse>, [string, UniversalChatParams]>;
};

type ProviderManagerMock = {
    getProvider: jest.Mock<MockProvider, []>;
};

type ModelManagerMock = {
    getModel: jest.Mock<ModelInfo | undefined, [string]>;
};

type ResponseProcessorMock = {
    validateJsonMode: jest.Mock<void, [ModelInfo, UniversalChatParams]>;
    validateResponse: jest.Mock<UniversalChatResponse, [UniversalChatResponse, UniversalChatParams['settings']]>;
};

type UsageTrackerMock = {
    trackUsage: jest.Mock<Promise<Usage>, [string, string, ModelInfo]>;
};

describe('ChatController', () => {
    let providerManager: ProviderManagerMock;
    let modelManager: ModelManagerMock;
    let responseProcessor: ResponseProcessorMock;
    let usageTracker: UsageTrackerMock;
    let chatController: ChatController;
    const modelName = 'openai-model';
    const systemMessage = 'system message';
    const userMessage = 'user message';
    const fakeModel: ModelInfo = {
        name: modelName,
        inputPricePerMillion: 30,
        outputPricePerMillion: 60,
        maxRequestTokens: 1000,
        maxResponseTokens: 500,
        characteristics: {
            qualityIndex: 80,
            outputSpeed: 100,
            firstTokenLatency: 10
        }
    };
    const usage: Usage = {
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        costs: {
            inputCost: 0.00001,
            outputCost: 0.00002,
            totalCost: 0.00003
        }
    };

    beforeEach(() => {
        // Set up a provider mock with its chatCall method.
        providerManager = {
            getProvider: jest.fn()
        };
        const mockProvider: MockProvider = {
            chatCall: jest.fn().mockResolvedValue({
                content: 'provider response',
                role: 'assistant',
                metadata: {}
            })
        };
        providerManager.getProvider.mockReturnValue(mockProvider);

        modelManager = {
            getModel: jest.fn().mockReturnValue(fakeModel)
        };

        responseProcessor = {
            validateJsonMode: jest.fn(),
            validateResponse: jest.fn().mockImplementation((resp) => resp)
        };

        usageTracker = {
            trackUsage: jest.fn().mockResolvedValue(usage)
        };

        // Instead of using a placeholder, create a dummy RetryManager instance with minimal config.
        const dummyRetryManager = new RetryManager({ baseDelay: 1000, maxRetries: 0 });

        chatController = new ChatController(
            providerManager as unknown as ProviderManager,
            modelManager as unknown as ModelManager,
            responseProcessor as unknown as ResponseProcessor,
            dummyRetryManager,
            usageTracker as unknown as UsageTracker
        );
    });

    it('should execute chat call successfully with default settings', async () => {
        const result = await chatController.execute(modelName, systemMessage, userMessage);

        // Verify that validateJsonMode has been called with the correct arguments.
        expect(responseProcessor.validateJsonMode).toHaveBeenCalledWith(fakeModel, {
            messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: userMessage }
            ],
            settings: undefined
        });

        // The expected chat parameters.
        const expectedParams: UniversalChatParams = {
            messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: userMessage }
            ],
            settings: undefined
        };
        expect(providerManager.getProvider().chatCall).toHaveBeenCalledWith(modelName, expectedParams);

        // Verify usage tracking was called since metadata.usage was initially undefined.
        expect(usageTracker.trackUsage).toHaveBeenCalledWith(
            systemMessage + '\n' + userMessage,
            'provider response',
            fakeModel
        );

        // Final result should reflect the provider response with usage added.
        expect(result).toEqual({
            content: 'provider response',
            role: 'assistant',
            metadata: {
                usage: usage
            }
        });
    });

    it('should throw an error if model is not found', async () => {
        modelManager.getModel.mockReturnValue(undefined);
        await expect(chatController.execute(modelName, systemMessage, userMessage))
            .rejects
            .toThrow(`Model ${modelName} not found`);
    });

    it('should append JSON instructions to the system message when responseFormat is json', async () => {
        const settings = { responseFormat: 'json' } as const;
        await chatController.execute(modelName, systemMessage, userMessage, settings);

        const expectedSystemMessage = systemMessage + '\n Provide your response in valid JSON format.';
        const expectedParams: UniversalChatParams = {
            messages: [
                { role: 'system', content: expectedSystemMessage },
                { role: 'user', content: userMessage }
            ],
            settings: settings
        };

        expect(providerManager.getProvider().chatCall).toHaveBeenCalledWith(modelName, expectedParams);
    });

    it('should call usageTracker.trackUsage even if metadata already has usage', async () => {
        // Prepare a provider response that already contains usage in metadata.
        const providerResponse: UniversalChatResponse = {
            content: 'provider response with usage',
            role: 'assistant',
            metadata: {
                usage: {
                    inputTokens: 5,
                    outputTokens: 10,
                    totalTokens: 15,
                    costs: {
                        inputCost: 0.000005,
                        outputCost: 0.00001,
                        totalCost: 0.000015
                    }
                }
            }
        };
        providerManager.getProvider().chatCall.mockResolvedValueOnce(providerResponse);

        const result = await chatController.execute(modelName, systemMessage, userMessage);

        // Even though metadata.usage exists, trackUsage should still be called.
        expect(usageTracker.trackUsage).toHaveBeenCalledWith(
            systemMessage + '\n' + userMessage,
            'provider response with usage',
            fakeModel
        );

        // Since validateResponse returns its input, the usage remains unchanged.
        expect(result.metadata?.usage).toEqual(providerResponse.metadata!.usage);
    });
});