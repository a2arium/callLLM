import { ChatController } from '../../../../core/chat/ChatController';
import { ProviderManager } from '../../../../core/caller/ProviderManager';
import { ModelManager } from '../../../../core/models/ModelManager';
import { ResponseProcessor } from '../../../../core/processors/ResponseProcessor';
import { UsageTracker } from '../../../../core/telemetry/UsageTracker';
import { UniversalChatParams, UniversalChatResponse, UniversalMessage } from '../../../../interfaces/UniversalInterfaces';
import { RetryManager } from '../../../../core/retry/RetryManager';
import { z } from 'zod';

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
    tokens: {
        input: number;
        inputCached: number;
        output: number;
        total: number;
    };
    costs: {
        input: number;
        inputCached: number;
        output: number;
        total: number;
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

describe("ChatController", () => {
    let providerManager: ProviderManagerMock;
    let modelManager: ModelManagerMock;
    let responseProcessor: ResponseProcessorMock;
    let usageTracker: UsageTrackerMock;
    let chatController: ChatController;
    let retryManager: RetryManager;
    const modelName = 'openai-model';
    const systemMessage = 'system message';
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
        tokens: {
            input: 10,
            inputCached: 0,
            output: 20,
            total: 30
        },
        costs: {
            input: 0.00001,
            inputCached: 0,
            output: 0.00002,
            total: 0.00003
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

        // Create a RetryManager instance with minimal config
        retryManager = new RetryManager({ baseDelay: 1, maxRetries: 0 });

        chatController = new ChatController(
            providerManager as unknown as ProviderManager,
            modelManager as unknown as ModelManager,
            responseProcessor as unknown as ResponseProcessor,
            retryManager,
            usageTracker as unknown as UsageTracker
        );
    });

    it('should execute chat call successfully with default settings', async () => {
        const result = await chatController.execute({ model: modelName, systemMessage });

        // Verify that validateJsonMode has been called with the correct arguments.
        expect(responseProcessor.validateJsonMode).toHaveBeenCalledWith(fakeModel, {
            messages: [
                { role: 'system', content: systemMessage }
            ],
            settings: undefined
        });

        // The expected chat parameters.
        const expectedParams: UniversalChatParams = {
            messages: [
                { role: 'system', content: systemMessage }
            ],
            settings: undefined
        };
        expect(providerManager.getProvider().chatCall).toHaveBeenCalledWith(modelName, expectedParams);

        // Verify usage tracking was called since metadata.usage was initially undefined.
        expect(usageTracker.trackUsage).toHaveBeenCalledWith(
            systemMessage + '\n',
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
        await expect(chatController.execute({ model: modelName, systemMessage }))
            .rejects
            .toThrow(`Model ${modelName} not found`);
    });

    it('should append JSON instructions to the system message when responseFormat is json', async () => {
        const settings = { responseFormat: 'json' } as const;
        await chatController.execute({ model: modelName, systemMessage, settings });

        const expectedSystemMessage = systemMessage + '\n Provide your response in valid JSON format.';
        const expectedParams: UniversalChatParams = {
            messages: [
                { role: 'system', content: expectedSystemMessage }
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
                    tokens: {
                        input: 5,
                        inputCached: 0,
                        output: 10,
                        total: 15
                    },
                    costs: {
                        input: 0.000005,
                        inputCached: 0,
                        output: 0.00001,
                        total: 0.000015
                    }
                }
            }
        };

        // Update the mock to return our prepared response
        providerManager.getProvider().chatCall.mockResolvedValue(providerResponse);

        const result = await chatController.execute({ model: modelName, systemMessage });

        // Verify that trackUsage was still called
        expect(usageTracker.trackUsage).toHaveBeenCalledWith(
            systemMessage + '\n',
            'provider response with usage',
            fakeModel
        );

        // The result should have the usage from trackUsage, not the original metadata
        expect(result.metadata?.usage).toEqual(usage);
    });

    describe("Content-based retry", () => {
        let shouldRetryDueToContentSpy: jest.SpyInstance;

        beforeEach(() => {
            // Create a new RetryManager with retry settings
            retryManager = new RetryManager({
                baseDelay: 1,
                maxRetries: 3,
            });

            shouldRetryDueToContentSpy = jest.spyOn(require("../../../../core/retry/utils/ShouldRetryDueToContent"), "shouldRetryDueToContent");

            chatController = new ChatController(
                providerManager as unknown as ProviderManager,
                modelManager as unknown as ModelManager,
                responseProcessor as unknown as ResponseProcessor,
                retryManager,
                usageTracker as unknown as UsageTracker
            );
        });

        afterEach(() => {
            shouldRetryDueToContentSpy.mockRestore();
        });

        it("should retry on unsatisfactory responses and eventually succeed", async () => {
            const unsatisfactoryResponse = { content: "I am not sure about that", role: 'assistant', metadata: {} };
            const satisfactoryResponse = { content: "Here is a complete answer", role: 'assistant', metadata: {} };

            // Mock shouldRetryDueToContent to return true twice (triggering retries) and then false
            shouldRetryDueToContentSpy
                .mockReturnValueOnce(true)  // First attempt - retry
                .mockReturnValueOnce(true)  // Second attempt - retry
                .mockReturnValueOnce(false); // Third attempt - succeed

            // Mock the provider's chat call to return different responses
            const mockProvider = {
                chatCall: jest.fn()
                    .mockResolvedValueOnce(unsatisfactoryResponse)
                    .mockResolvedValueOnce(unsatisfactoryResponse)
                    .mockResolvedValueOnce(satisfactoryResponse)
            };
            (providerManager.getProvider as jest.Mock).mockReturnValue(mockProvider);

            const result = await chatController.execute({
                model: modelName,
                systemMessage,
            });

            expect(result).toEqual(satisfactoryResponse);
            expect(mockProvider.chatCall).toHaveBeenCalledTimes(3);
            expect(shouldRetryDueToContentSpy).toHaveBeenCalledTimes(3);
        });

        it("should fail after max retries if responses remain unsatisfactory", async () => {
            const unsatisfactoryResponse = { content: "I am not sure about that", role: 'assistant', metadata: {} };

            // Mock shouldRetryDueToContent to always return true (always unsatisfactory)
            shouldRetryDueToContentSpy.mockReturnValue(true);

            // Mock the provider's chat call to always return unsatisfactory response
            const mockProvider = {
                chatCall: jest.fn().mockResolvedValue(unsatisfactoryResponse)
            };
            (providerManager.getProvider as jest.Mock).mockReturnValue(mockProvider);

            await expect(chatController.execute({
                model: modelName,
                systemMessage,
            })).rejects.toThrow(/Failed after 3 retries.*Response content triggered retry due to unsatisfactory answer/);

            expect(mockProvider.chatCall).toHaveBeenCalledTimes(4); // Initial + 3 retries
            expect(shouldRetryDueToContentSpy).toHaveBeenCalledTimes(4);
        });
    });
});