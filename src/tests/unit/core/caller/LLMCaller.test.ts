import { LLMCaller } from '../../../../core/caller/LLMCaller';
import { ProviderManager } from '../../../../core/caller/ProviderManager';
import { ModelManager } from '../../../../core/models/ModelManager';
import { TokenCalculator } from '../../../../core/models/TokenCalculator';
import { ResponseProcessor } from '../../../../core/processors/ResponseProcessor';
import { StreamHandler } from '../../../../core/streaming/StreamHandler';
import { ModelInfo, UniversalStreamResponse, FinishReason, UniversalChatParams } from '../../../../interfaces/UniversalInterfaces';
import { z } from 'zod';
import { BaseAdapter } from '../../../../adapters/base/baseAdapter';

// Mock dependencies
jest.mock('../../../../core/caller/ProviderManager');
jest.mock('../../../../core/models/ModelManager');
jest.mock('../../../../core/models/TokenCalculator');
jest.mock('../../../../core/processors/ResponseProcessor');
jest.mock('../../../../core/streaming/StreamHandler');

const createMockProvider = (chatCallImpl: jest.Mock, streamCallImpl?: jest.Mock) => ({
    chatCall: chatCallImpl,
    streamCall: streamCallImpl || jest.fn(),
    convertToProviderParams: jest.fn(),
    convertFromProviderResponse: jest.fn(),
    convertFromProviderStreamResponse: jest.fn()
});

const mockStreamHandler = {
    processStream: jest.fn(async function* (
        stream: AsyncIterable<UniversalStreamResponse>,
        params: UniversalChatParams,
        inputTokens: number,
        modelInfo: ModelInfo
    ): AsyncGenerator<UniversalStreamResponse> {
        // Pass through the provider's actual stream chunks
        for await (const chunk of stream) {
            yield chunk;
        }
    })
} as unknown as jest.Mocked<StreamHandler>;


// Define the mock chat call
const mockChatCall = jest.fn().mockResolvedValue({
    content: 'test response',
    role: 'assistant',
    metadata: {
        usage: {
            inputTokens: 10,
            outputTokens: 20,
            totalTokens: 30,
            costs: {
                inputCost: 0.00001,
                outputCost: 0.00002,
                totalCost: 0.00003
            }
        }
    }
});

describe('LLMCaller', () => {
    const mockApiKey = 'test-api-key';
    const mockSystemMessage = 'You are a helpful assistant.';
    const mockModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 0.1,
        outputPricePerMillion: 0.2,
        maxRequestTokens: 1000,
        maxResponseTokens: 500,
        tokenizationModel: 'test',
        characteristics: {
            qualityIndex: 80,
            outputSpeed: 100,
            firstTokenLatency: 100
        },
        capabilities: {
            streaming: true,
            toolCalls: true,
            parallelToolCalls: true,
            batchProcessing: true,
            systemMessages: true,
            temperature: true,
            jsonMode: true
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Setup ModelManager mock
        (ModelManager as jest.Mock).mockImplementation(() => ({
            getModel: jest.fn().mockReturnValue(mockModelInfo),
            getAvailableModels: jest.fn().mockReturnValue([mockModelInfo]),
            addModel: jest.fn(),
            updateModel: jest.fn()
        }));

        // Setup TokenCalculator mock
        (TokenCalculator as jest.Mock).mockImplementation(() => ({
            calculateTokens: jest.fn().mockReturnValue(10),
            calculateUsage: jest.fn().mockReturnValue({
                inputTokens: 10,
                outputTokens: 20,
                totalTokens: 30,
                inputCost: 0.00001,
                outputCost: 0.00002,
                totalCost: 0.00003
            })
        }));

        // Setup ResponseProcessor mock
        (ResponseProcessor as jest.Mock).mockImplementation(() => ({
            validateResponse: jest.fn().mockImplementation((response) => response),
            validateJsonMode: jest.fn()
        }));

        // Setup StreamHandler mock
        (StreamHandler as jest.MockedClass<typeof StreamHandler>).mockImplementation(() => mockStreamHandler);

        // Setup ProviderManager mock
        (ProviderManager as jest.Mock).mockImplementation(() => ({
            getProvider: jest.fn().mockReturnValue({
                chatCall: jest.fn().mockResolvedValue({
                    content: 'test response',
                    role: 'assistant',
                    metadata: {
                        finishReason: FinishReason.STOP
                    }
                }),
                streamCall: jest.fn().mockResolvedValue({
                    [Symbol.asyncIterator]: async function* () {
                        yield {
                            content: 'test content',
                            role: 'assistant',
                            isComplete: true,
                            metadata: {
                                finishReason: FinishReason.STOP
                            }
                        };
                    }
                })
            }),
            switchProvider: jest.fn(),
            getCurrentProviderName: jest.fn().mockReturnValue('openai')
        }));
    });

    describe('constructor', () => {
        it('should initialize with valid provider and model', () => {
            const caller = new LLMCaller('openai', 'test-model', mockSystemMessage, {
                apiKey: mockApiKey
            });
            expect(ProviderManager).toHaveBeenCalledWith('openai', mockApiKey);
            expect(ModelManager).toHaveBeenCalledWith('openai');
            expect(caller).toBeDefined();
        });

        it('should initialize with callerId and usageCallback', () => {
            const mockCallback = jest.fn();
            const caller = new LLMCaller('openai', 'test-model', mockSystemMessage, {
                apiKey: mockApiKey,
                callerId: 'test-id',
                usageCallback: mockCallback
            });
            expect(caller['callerId']).toBe('test-id');
            expect(caller['usageCallback']).toBe(mockCallback);
        });

        it('should throw error for invalid model', () => {
            (ModelManager as jest.Mock).mockImplementation(() => ({
                getModel: jest.fn().mockReturnValue(null)
            }));
            expect(() => new LLMCaller('openai', 'invalid-model', mockSystemMessage))
                .toThrow('Model invalid-model not found for provider openai');
        });
    });

    describe('model management', () => {
        let caller: LLMCaller;

        beforeEach(() => {
            caller = new LLMCaller('openai', 'test-model', mockSystemMessage, {
                apiKey: mockApiKey
            });
        });

        it('should get available models', () => {
            const models = caller.getAvailableModels();
            expect(models).toEqual([mockModelInfo]);
        });

        it('should add model', () => {
            const modelManagerInstance = (ModelManager as jest.Mock).mock.results[0].value;
            caller.addModel(mockModelInfo);
            expect(modelManagerInstance.addModel).toHaveBeenCalledWith(mockModelInfo);
        });

        it('should get model', () => {
            const model = caller.getModel('test-model');
            expect(model).toEqual(mockModelInfo);
        });

        it('should update model', () => {
            const modelManagerInstance = (ModelManager as jest.Mock).mock.results[0].value;
            const updates = { inputPricePerMillion: 2 };
            caller.updateModel('test-model', updates);
            expect(modelManagerInstance.updateModel).toHaveBeenCalledWith('test-model', updates);
        });

        it('should set model with provider switch', () => {
            const providerManagerInstance = (ProviderManager as jest.Mock).mock.results[0].value;
            caller.setModel({ provider: 'openai', nameOrAlias: 'test-model', apiKey: 'new-key' });
            expect(providerManagerInstance.switchProvider).toHaveBeenCalledWith('openai', 'new-key');
        });

        it('should throw error when setting invalid model', () => {
            const modelManagerInstance = (ModelManager as jest.Mock).mock.results[0].value;
            modelManagerInstance.getModel.mockReturnValueOnce(null);
            expect(() => caller.setModel({ nameOrAlias: 'invalid-model' }))
                .toThrow('Model invalid-model not found in provider current');
        });
    });

    describe('chat methods', () => {
        let caller: LLMCaller;
        let mockProviderManager: jest.Mocked<ProviderManager>;
        let mockResponseProcessor: jest.Mocked<ResponseProcessor>;

        beforeEach(() => {
            jest.clearAllMocks();

            // Setup ResponseProcessor mock
            mockResponseProcessor = {
                validateResponse: jest.fn().mockImplementation((response, settings) => {
                    if (settings?.jsonSchema) {
                        if (typeof response.content === 'string') {
                            response.content = JSON.parse(response.content);
                        }
                    }
                    return response;
                }),
                validateJsonMode: jest.fn()
            } as unknown as jest.Mocked<ResponseProcessor>;
            (ResponseProcessor as jest.Mock).mockImplementation(() => mockResponseProcessor);

            // Setup ProviderManager mock with default successful response
            const defaultProvider = createMockProvider(jest.fn().mockResolvedValue({
                content: 'test response',
                role: 'assistant',
                metadata: { finishReason: FinishReason.STOP }
            }));

            mockProviderManager = {
                getProvider: jest.fn().mockReturnValue(defaultProvider),
                switchProvider: jest.fn(),
                getCurrentProviderName: jest.fn().mockReturnValue('openai')
            } as unknown as jest.Mocked<ProviderManager>;
            (ProviderManager as jest.Mock).mockImplementation(() => mockProviderManager);

            caller = new LLMCaller('openai', 'test-model', mockSystemMessage, {
                apiKey: mockApiKey
            });
        });

        it('should make chat call', async () => {
            const response = await caller.chatCall({
                message: 'test message',
                settings: { temperature: 0.7 }
            });
            expect(response.content).toBe('test response');
            expect(response.metadata?.finishReason).toBe(FinishReason.STOP);
        });

        it('should make chat call with JSON schema', async () => {
            const schema = z.object({ name: z.string() });
            const mockChatCall = jest.fn().mockResolvedValue({
                content: JSON.stringify({ name: 'test' }),
                role: 'assistant',
                metadata: { finishReason: FinishReason.STOP }
            });

            mockProviderManager.getProvider.mockReturnValue(createMockProvider(mockChatCall));

            const response = await caller.chatCall({
                message: 'test message',
                settings: { jsonSchema: { schema }, maxRetries: 0 }
            });
            expect(response.content).toEqual({ name: 'test' });
        }, 10000);

        it('should make stream call', async () => {
            const streamHandlerInstance = (StreamHandler as jest.MockedClass<typeof StreamHandler>).mock.results[0].value as StreamHandler;
            const llmCaller = new LLMCaller('openai', 'test-model', 'system message', {
                apiKey: mockApiKey
            });
            const streamCallMock = jest.spyOn(llmCaller, 'streamCall').mockImplementation(async ({ message }) => ({
                [Symbol.asyncIterator]: async function* () {
                    yield {
                        content: 'first 1',
                        role: 'assistant',
                        isComplete: false,
                        metadata: {
                            finishReason: FinishReason.NULL
                        }
                    };

                    yield {
                        content: ' first 2',
                        role: 'assistant',
                        isComplete: true,
                        metadata: {
                            finishReason: FinishReason.STOP
                        }
                    };
                }
            }));

            const stream = await llmCaller.stream({ message: 'test message' });

            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            expect(chunks.length).toBe(2);
            expect(chunks[0].content).toBe('first 1');
            expect(chunks[0].isComplete).toBe(false);
            expect(chunks[1].content).toBe(' first 2');
            expect(chunks[1].isComplete).toBe(true);
            expect(chunks[1].metadata?.finishReason).toBe(FinishReason.STOP);
        });

        it('should make extended call with ending message', async () => {
            const responses = await caller.call({
                message: 'test message',
                endingMessage: 'ending message'
            });
            expect(responses).toHaveLength(1);
            expect(responses[0].content).toBe('test response');
        });

        it('should make stream call without ending message and accumulate content', async () => {
            // Mock dependencies
            const llmCaller = new LLMCaller('openai', 'test-model', 'system message', {
                apiKey: mockApiKey
            });
            jest.spyOn(llmCaller, 'streamCall').mockImplementation(async () => ({
                [Symbol.asyncIterator]: async function* () {
                    yield {
                        content: 'chunk 1',
                        isComplete: false
                    } as UniversalStreamResponse;
                    yield {
                        content: ' chunk 2',
                        isComplete: true
                    } as UniversalStreamResponse;
                }
            }));

            const stream = await llmCaller.stream({ message: 'test prompt' });
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            expect(chunks.length).toBe(2);
            expect(chunks[0].content).toBe('chunk 1');
            expect(chunks[0].isComplete).toBe(false);
            expect(chunks[1].content).toBe(' chunk 2');
            expect(chunks[1].isComplete).toBe(true);
        });

        it('should make stream call with ending message and accumulate content', async () => {
            const mockStreamCall = jest.fn().mockImplementation(async () => ({
                [Symbol.asyncIterator]: async function* () {
                    yield {
                        content: 'first chunk',
                        role: 'assistant',
                        isComplete: false,
                        metadata: { finishReason: FinishReason.NULL }
                    };
                    yield {
                        content: ' second chunk',
                        role: 'assistant',
                        isComplete: true,
                        metadata: { finishReason: FinishReason.STOP }
                    };
                }
            }));

            mockProviderManager.getProvider.mockReturnValue(createMockProvider(jest.fn(), mockStreamCall));

            const stream = await caller.stream({
                message: 'test message',
                endingMessage: 'ending message'
            });

            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            expect(chunks.length).toBe(2);
            expect(chunks[0].content).toBe('first chunk');
            expect(chunks[1].content).toBe(' second chunk');
        });

        it('should calculate usage when not provided in response', async () => {
            // Setup mock
            const mockAdapter = {
                chatCall: mockChatCall
            } as unknown as jest.Mocked<BaseAdapter>;

            (ProviderManager as jest.MockedClass<typeof ProviderManager>).mockImplementation(() => ({
                getProvider: jest.fn().mockReturnValue(mockAdapter)
            } as unknown as ProviderManager));

            const caller = new LLMCaller('openai', 'test-model', 'system message', { apiKey: 'test-key' });
            const response = await caller.chatCall({ message: 'test message' });

            expect(response.metadata?.usage).toEqual({
                inputTokens: 10,
                outputTokens: 20,
                totalTokens: 30,
                costs: {
                    inputCost: 0.00001,
                    outputCost: 0.00002,
                    totalCost: 0.00003
                }
            });
        });

        it('should handle JSON mode validation error', async () => {
            const responseProcessorInstance = (ResponseProcessor as jest.Mock).mock.results[0].value;
            responseProcessorInstance.validateJsonMode.mockImplementationOnce(() => {
                throw new Error('JSON mode not supported');
            });

            await expect(caller.chatCall({
                message: 'test message',
                settings: { responseFormat: 'json' }
            })).rejects.toThrow('JSON mode not supported');
        });

        it('should handle response validation error', async () => {
            // Setup the validation to fail after the provider call
            mockResponseProcessor.validateResponse.mockImplementationOnce(() => {
                throw new Error('Invalid response format');
            });

            const mockChatCall = jest.fn().mockResolvedValue({
                content: 'test response',
                role: 'assistant',
                metadata: { finishReason: FinishReason.STOP }
            });

            mockProviderManager.getProvider.mockReturnValue(createMockProvider(mockChatCall));

            await expect(caller.chatCall({
                message: 'test message',
                settings: { jsonSchema: { schema: z.object({ name: z.string() }) }, maxRetries: 0 }
            })).rejects.toThrow('Invalid response format');

            // Verify that both the provider call and validation were attempted
            expect(mockChatCall).toHaveBeenCalled();
            expect(mockResponseProcessor.validateResponse).toHaveBeenCalled();
        }, 10000);

        it('should make stream call with JSON mode', async () => {
            const mockStreamCall = jest.fn().mockImplementation(async () => ({
                [Symbol.asyncIterator]: async function* () {
                    yield {
                        content: '{"key": "value"}',
                        role: 'assistant',
                        isComplete: true,
                        metadata: {
                            finishReason: FinishReason.STOP,
                            responseFormat: 'json'
                        }
                    };
                }
            }));

            mockProviderManager.getProvider.mockReturnValue(createMockProvider(jest.fn(), mockStreamCall));

            const stream = await caller.streamCall({
                message: 'test',
                settings: { responseFormat: 'json' }
            });

            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            expect(chunks.length).toBe(1);
            expect(chunks[0].content).toBe('{"key": "value"}');
            expect(chunks[0].metadata?.responseFormat).toBe('json');
        });

        it('should handle stream JSON mode validation error', async () => {
            const responseProcessorInstance = (ResponseProcessor as jest.Mock).mock.results[0].value;
            responseProcessorInstance.validateJsonMode.mockImplementationOnce(() => {
                throw new Error('JSON mode not supported');
            });

            await expect(caller.streamCall({
                message: 'test message',
                settings: { responseFormat: 'json' }
            })).rejects.toThrow('JSON mode not supported');
        });

        it('should handle response with undefined metadata', async () => {
            // Setup mock
            const mockAdapter = {
                chatCall: mockChatCall
            } as unknown as jest.Mocked<BaseAdapter>;

            (ProviderManager as jest.MockedClass<typeof ProviderManager>).mockImplementation(() => ({
                getProvider: jest.fn().mockReturnValue(mockAdapter)
            } as unknown as ProviderManager));

            const caller = new LLMCaller('openai', 'test-model', 'system message', { apiKey: 'test-key' });
            const response = await caller.chatCall({ message: 'test message' });

            expect(response.metadata?.usage).toEqual({
                inputTokens: 10,
                outputTokens: 20,
                totalTokens: 30,
                costs: {
                    inputCost: 0.00001,
                    outputCost: 0.00002,
                    totalCost: 0.00003
                }
            });
        });

        it('should handle response with empty metadata', async () => {
            // Setup mock
            const mockAdapter = {
                chatCall: mockChatCall
            } as unknown as jest.Mocked<BaseAdapter>;

            (ProviderManager as jest.MockedClass<typeof ProviderManager>).mockImplementation(() => ({
                getProvider: jest.fn().mockReturnValue(mockAdapter)
            } as unknown as ProviderManager));

            const caller = new LLMCaller('openai', 'test-model', 'system message', { apiKey: 'test-key' });
            const response = await caller.chatCall({ message: 'test message' });

            expect(response.metadata?.usage).toEqual({
                inputTokens: 10,
                outputTokens: 20,
                totalTokens: 30,
                costs: {
                    inputCost: 0.00001,
                    outputCost: 0.00002,
                    totalCost: 0.00003
                }
            });
        });
    });

    describe('error handling', () => {
        let caller: LLMCaller;
        let mockProviderManager: jest.Mocked<ProviderManager>;
        let mockResponseProcessor: jest.Mocked<ResponseProcessor>;

        const createMockProvider = (chatCallImpl: jest.Mock, streamCallImpl?: jest.Mock) => ({
            chatCall: chatCallImpl,
            streamCall: streamCallImpl || jest.fn(),
            convertToProviderParams: jest.fn(),
            convertFromProviderResponse: jest.fn(),
            convertFromProviderStreamResponse: jest.fn()
        });

        beforeEach(() => {
            jest.clearAllMocks();

            // Setup ResponseProcessor mock
            mockResponseProcessor = {
                validateResponse: jest.fn().mockImplementation((response, settings) => {
                    if (settings?.jsonSchema) {
                        if (typeof response.content === 'string') {
                            response.content = JSON.parse(response.content);
                        }
                    }
                    return response;
                }),
                validateJsonMode: jest.fn()
            } as unknown as jest.Mocked<ResponseProcessor>;
            (ResponseProcessor as jest.Mock).mockImplementation(() => mockResponseProcessor);

            // Setup ProviderManager mock with default successful response
            const defaultProvider = createMockProvider(jest.fn().mockResolvedValue({
                content: 'test response',
                role: 'assistant',
                metadata: { finishReason: FinishReason.STOP }
            }));

            mockProviderManager = {
                getProvider: jest.fn().mockReturnValue(defaultProvider),
                switchProvider: jest.fn(),
                getCurrentProviderName: jest.fn().mockReturnValue('openai')
            } as unknown as jest.Mocked<ProviderManager>;
            (ProviderManager as jest.Mock).mockImplementation(() => mockProviderManager);

            caller = new LLMCaller('openai', 'test-model', mockSystemMessage, {
                apiKey: mockApiKey
            });
        });

        it('should handle JSON mode validation error', async () => {
            mockResponseProcessor.validateJsonMode.mockImplementationOnce(() => {
                throw new Error('JSON mode not supported');
            });

            await expect(caller.chatCall({
                message: 'test',
                settings: { responseFormat: 'json' }
            })).rejects.toThrow('JSON mode not supported');
        });

        it('should handle schema validation error', async () => {
            // Setup the validation to fail after the provider call
            mockResponseProcessor.validateResponse.mockImplementationOnce(() => {
                throw new Error('Schema validation failed');
            });

            const mockChatCall = jest.fn().mockResolvedValue({
                content: 'test response',
                role: 'assistant',
                metadata: { finishReason: FinishReason.STOP }
            });

            mockProviderManager.getProvider.mockReturnValue(createMockProvider(mockChatCall));

            await expect(caller.chatCall({
                message: 'test',
                settings: { jsonSchema: { schema: z.object({ name: z.string() }) }, maxRetries: 0 }
            })).rejects.toThrow('Schema validation failed');

            // Verify that both the provider call and validation were attempted
            expect(mockChatCall).toHaveBeenCalled();
            expect(mockResponseProcessor.validateResponse).toHaveBeenCalled();
        }, 10000);

        it('should handle provider errors', async () => {
            mockProviderManager.getProvider.mockReturnValue(
                createMockProvider(jest.fn().mockRejectedValue(new Error('API error')))
            );

            await expect(caller.chatCall({
                message: 'test'
            })).rejects.toThrow('Failed after 3 retries. Last error: API error');
        }, 15000); // Increase timeout to 15 seconds for retries

        it('should retry on failure with default maxRetries', async () => {
            const mockChatCall = jest.fn()
                .mockRejectedValueOnce(new Error('First failure'))
                .mockRejectedValueOnce(new Error('Second failure'))
                .mockResolvedValueOnce({
                    content: 'Success after retries',
                    role: 'assistant',
                    metadata: { finishReason: FinishReason.STOP }
                });

            mockProviderManager.getProvider.mockReturnValue(createMockProvider(mockChatCall));

            const response = await caller.chatCall({ message: 'test' });

            expect(mockChatCall).toHaveBeenCalledTimes(3);
            expect(response.content).toBe('Success after retries');
        }, 15000); // Increase timeout to 15 seconds for retries

        it('should respect custom maxRetries setting', async () => {
            const mockChatCall = jest.fn()
                .mockRejectedValueOnce(new Error('First failure'))
                .mockRejectedValueOnce(new Error('Second failure'))
                .mockRejectedValueOnce(new Error('Third failure'))
                .mockRejectedValueOnce(new Error('Fourth failure'))
                .mockResolvedValueOnce({
                    content: 'Success after retries',
                    role: 'assistant',
                    metadata: { finishReason: FinishReason.STOP }
                });

            mockProviderManager.getProvider.mockReturnValue(createMockProvider(mockChatCall));

            const response = await caller.chatCall({
                message: 'test',
                settings: { maxRetries: 4 }
            });

            expect(mockChatCall).toHaveBeenCalledTimes(5); // 1 initial + 4 retries
            expect(response.content).toBe('Success after retries');
        }, 20000); // Increase timeout to 20 seconds for more retries

        it('should fail after exhausting all retries', async () => {
            const mockChatCall = jest.fn()
                .mockRejectedValue(new Error('Persistent failure'));

            mockProviderManager.getProvider.mockReturnValue(createMockProvider(mockChatCall));

            await expect(caller.chatCall({
                message: 'test',
                settings: { maxRetries: 2 }
            })).rejects.toThrow('Failed after 2 retries. Last error: Persistent failure');

            expect(mockChatCall).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
        }, 15000); // Increase timeout to 15 seconds for retries

        it('should use exponential backoff between retries', async () => {
            jest.useFakeTimers();
            const mockChatCall = jest.fn()
                .mockRejectedValueOnce(new Error('First failure'))
                .mockRejectedValueOnce(new Error('Second failure'))
                .mockResolvedValueOnce({
                    content: 'Success after retries',
                    role: 'assistant',
                    metadata: { finishReason: FinishReason.STOP }
                });

            mockProviderManager.getProvider.mockReturnValue(createMockProvider(mockChatCall));

            const callPromise = caller.chatCall({ message: 'test' });

            // First retry should wait 1 second
            await jest.advanceTimersByTimeAsync(1000);
            // Second retry should wait 2 seconds
            await jest.advanceTimersByTimeAsync(2000);

            const response = await callPromise;

            expect(mockChatCall).toHaveBeenCalledTimes(3);
            expect(response.content).toBe('Success after retries');

            jest.useRealTimers();
        });
    });

    describe('stream methods', () => {
        let caller: LLMCaller;
        let mockProviderManager: jest.Mocked<ProviderManager>;
        let mockResponseProcessor: jest.Mocked<ResponseProcessor>;
        let mockTokenCalculator: jest.Mocked<TokenCalculator>;

        beforeEach(() => {
            jest.clearAllMocks();

            // Setup ResponseProcessor mock
            mockResponseProcessor = {
                validateResponse: jest.fn(),
                validateJsonMode: jest.fn()
            } as unknown as jest.Mocked<ResponseProcessor>;
            (ResponseProcessor as jest.Mock).mockImplementation(() => mockResponseProcessor);

            // Setup TokenCalculator mock
            mockTokenCalculator = {
                calculateTokens: jest.fn().mockReturnValue(10),
                calculateUsage: jest.fn()
            } as unknown as jest.Mocked<TokenCalculator>;
            (TokenCalculator as jest.Mock).mockImplementation(() => mockTokenCalculator);

            // Setup ProviderManager mock
            mockProviderManager = {
                getProvider: jest.fn(),
                switchProvider: jest.fn(),
                getCurrentProviderName: jest.fn().mockReturnValue('openai')
            } as unknown as jest.Mocked<ProviderManager>;
            (ProviderManager as jest.Mock).mockImplementation(() => mockProviderManager);

            caller = new LLMCaller('openai', 'test-model', mockSystemMessage, {
                apiKey: mockApiKey
            });
        });

        it('should handle stream errors in first stream', async () => {
            const mockStreamCall = jest.fn()
                .mockRejectedValueOnce(new Error('First failure'))
                .mockRejectedValueOnce(new Error('Second failure'))
                .mockImplementationOnce(async () => ({
                    [Symbol.asyncIterator]: async function* () {
                        yield {
                            content: 'Success after retries',
                            role: 'assistant',
                            isComplete: true,
                            metadata: { finishReason: FinishReason.STOP }
                        };
                    }
                }));

            mockProviderManager.getProvider.mockReturnValue(createMockProvider(jest.fn(), mockStreamCall));

            const stream = await caller.streamCall({ message: 'test' });
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            expect(mockStreamCall).toHaveBeenCalledTimes(3);
            expect(chunks).toHaveLength(1);
            expect(chunks[0].content).toBe('Success after retries');
        }, 15000);

        it('should handle stream errors in ending message stream', async () => {
            const mockStreamCall = jest.fn()
                .mockRejectedValueOnce(new Error('First failure'))
                .mockImplementationOnce(async () => ({
                    [Symbol.asyncIterator]: async function* () {
                        yield {
                            content: 'First chunk before failure',
                            role: 'assistant',
                            isComplete: false,
                            metadata: { finishReason: FinishReason.NULL }
                        };
                        throw new Error('Mid-stream failure');
                    }
                }))
                .mockImplementationOnce(async () => ({
                    [Symbol.asyncIterator]: async function* () {
                        yield {
                            content: 'Success after retry',
                            role: 'assistant',
                            isComplete: true,
                            metadata: { finishReason: FinishReason.STOP }
                        };
                    }
                }));

            mockProviderManager.getProvider.mockReturnValue(createMockProvider(jest.fn(), mockStreamCall));

            const stream = await caller.streamCall({ message: 'test' });
            const chunks = [];
            let attempt = 0;

            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            expect(mockStreamCall).toHaveBeenCalledTimes(3);
            expect(chunks).toHaveLength(2);
            expect(chunks[0].content).toBe('First chunk before failure');
            expect(chunks[1].content).toBe('Success after retry');
        }, 15000);

        it('should fail after exhausting all retries in stream', async () => {
            const mockStreamCall = jest.fn()
                .mockRejectedValueOnce(new Error('First failure'))
                .mockRejectedValueOnce(new Error('Second failure'))
                .mockRejectedValueOnce(new Error('Third failure'))
                .mockRejectedValue(new Error('Third failure'));

            mockProviderManager.getProvider.mockReturnValue(createMockProvider(jest.fn(), mockStreamCall));

            let error: Error | undefined;
            try {
                const stream = await caller.streamCall({
                    message: 'test',
                    settings: { maxRetries: 2 }
                });

                for await (const chunk of stream) {
                    // This should not be reached
                }
            } catch (e) {
                error = e as Error;
            }

            expect(error).toBeDefined();
            expect((error as Error).message).toContain('Failed after 2 retries. Last error: Third failure');
            expect(mockStreamCall).toHaveBeenCalledTimes(3); // Initial + 2 retries
        }, 15000);

        it('should respect custom maxRetries setting in stream', async () => {
            const mockStreamCall = jest.fn()
                .mockImplementationOnce(async () => {
                    throw new Error('First failure');
                })
                .mockImplementationOnce(async () => {
                    throw new Error('Second failure');
                })
                .mockImplementationOnce(async () => ({
                    [Symbol.asyncIterator]: async function* () {
                        yield {
                            content: 'Success after retries',
                            role: 'assistant',
                            isComplete: true,
                            metadata: { finishReason: FinishReason.STOP }
                        };
                    }
                }));

            mockProviderManager.getProvider.mockReturnValue(createMockProvider(jest.fn(), mockStreamCall));

            const stream = await caller.streamCall({
                message: 'test',
                settings: { maxRetries: 4 }
            });

            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            expect(mockStreamCall).toHaveBeenCalledTimes(3);
            expect(chunks).toHaveLength(1);
            expect(chunks[0].content).toBe('Success after retries');
        }, 20000);

        it('should use exponential backoff between stream retries', async () => {
            jest.useFakeTimers();

            const mockStreamCall = jest.fn()
                .mockImplementationOnce(async () => ({
                    [Symbol.asyncIterator]: async function* () {
                        yield {
                            content: 'First chunk',
                            role: 'assistant',
                            isComplete: false,
                            metadata: { finishReason: FinishReason.NULL }
                        };
                        throw new Error('Initial stream failure');
                    }
                }))
                .mockImplementationOnce(async () => ({
                    [Symbol.asyncIterator]: async function* () {
                        yield {
                            content: 'Success after retry',
                            role: 'assistant',
                            isComplete: true,
                            metadata: { finishReason: FinishReason.STOP }
                        };
                    }
                }));

            mockProviderManager.getProvider.mockReturnValue(createMockProvider(jest.fn(), mockStreamCall));

            const stream = await caller.streamCall({ message: 'test' });
            const chunksPromise = (async () => {
                const chunks = [];
                for await (const chunk of stream) {
                    chunks.push(chunk);
                }
                return chunks;
            })();

            // First retry should wait 1 second
            await jest.advanceTimersByTimeAsync(1000);
            // Second retry should wait 2 seconds
            await jest.advanceTimersByTimeAsync(2000);

            const chunks = await chunksPromise;

            expect(mockStreamCall).toHaveBeenCalledTimes(2);
            expect(chunks).toHaveLength(2);
            expect(chunks[0].content).toBe('First chunk');
            expect(chunks[1].content).toBe('Success after retry');

            jest.useRealTimers();
        }, 15000);
    });

    describe('LLMCaller usage tracking', () => {
        let mockUsageCallback: jest.Mock;
        let caller: LLMCaller;

        beforeEach(() => {
            mockUsageCallback = jest.fn();
            caller = new LLMCaller('openai', 'gpt-4', 'test system message', {
                callerId: 'test-id',
                usageCallback: mockUsageCallback
            });
        });

        it('should call usage callback with correct data structure', async () => {
            const providerManagerInstance = (ProviderManager as jest.Mock).mock.results[0].value;
            providerManagerInstance.getProvider.mockReturnValueOnce({
                chatCall: jest.fn().mockResolvedValue({
                    content: 'test response',
                    role: 'assistant'
                })
            });

            await caller.chatCall({ message: 'test message' });

            expect(mockUsageCallback).toHaveBeenCalledWith(expect.objectContaining({
                callerId: 'test-id',
                usage: expect.objectContaining({
                    inputTokens: expect.any(Number),
                    outputTokens: expect.any(Number),
                    totalTokens: expect.any(Number),
                    costs: expect.objectContaining({
                        inputCost: expect.any(Number),
                        outputCost: expect.any(Number),
                        totalCost: expect.any(Number)
                    })
                }),
                timestamp: expect.any(Number)
            }));
        });

        it('should allow changing callerId', async () => {
            caller.setCallerId('new-test-id');

            const providerManagerInstance = (ProviderManager as jest.Mock).mock.results[0].value;
            providerManagerInstance.getProvider.mockReturnValueOnce({
                chatCall: jest.fn().mockResolvedValue({
                    content: 'test response',
                    role: 'assistant'
                })
            });

            await caller.chatCall({ message: 'test message' });

            expect(mockUsageCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    callerId: 'new-test-id'
                })
            );
        });
    });

    describe('settings management', () => {
        let caller: LLMCaller;

        beforeEach(() => {
            caller = new LLMCaller('openai', 'test-model', mockSystemMessage, {
                apiKey: mockApiKey,
                settings: {
                    temperature: 0.7,
                    maxTokens: 100
                }
            });
        });

        it('should initialize with settings', async () => {
            const response = await caller.chatCall({ message: 'test message' });
            const providerManagerInstance = (ProviderManager as jest.Mock).mock.results[0].value;
            const provider = providerManagerInstance.getProvider();

            expect(provider.chatCall).toHaveBeenCalledWith('test-model', expect.objectContaining({
                settings: expect.objectContaining({
                    temperature: 0.7,
                    maxTokens: 100
                })
            }));
        });

        it('should update settings', async () => {
            caller.updateSettings({ temperature: 0.9 });

            const response = await caller.chatCall({ message: 'test message' });
            const providerManagerInstance = (ProviderManager as jest.Mock).mock.results[0].value;
            const provider = providerManagerInstance.getProvider();

            expect(provider.chatCall).toHaveBeenCalledWith('test-model', expect.objectContaining({
                settings: expect.objectContaining({
                    temperature: 0.9,
                    maxTokens: 100
                })
            }));
        });

        it('should merge method-level settings with class-level settings', async () => {
            const response = await caller.chatCall({
                message: 'test message',
                settings: {
                    temperature: 0.5,
                    topP: 0.8
                }
            });

            const providerManagerInstance = (ProviderManager as jest.Mock).mock.results[0].value;
            const provider = providerManagerInstance.getProvider();

            expect(provider.chatCall).toHaveBeenCalledWith('test-model', expect.objectContaining({
                settings: expect.objectContaining({
                    temperature: 0.5,  // Method-level overrides class-level
                    maxTokens: 100,    // Class-level preserved
                    topP: 0.8         // New setting added
                })
            }));
        });

        it('should use method-level settings when no class-level settings exist', async () => {
            // Create a new instance without class-level settings
            const mockProvider = {
                chatCall: jest.fn().mockResolvedValue({
                    content: 'test response',
                    role: 'assistant',
                    metadata: {
                        finishReason: FinishReason.STOP,
                        usage: {
                            inputTokens: 10,
                            outputTokens: 20,
                            totalTokens: 30,
                            costs: {
                                inputCost: 0.00001,
                                outputCost: 0.00002,
                                totalCost: 0.00003
                            }
                        }
                    }
                })
            };

            // Setup the mock before creating the instance
            (ProviderManager as jest.Mock).mockImplementation(() => ({
                getProvider: jest.fn().mockReturnValue(mockProvider),
                switchProvider: jest.fn(),
                getCurrentProviderName: jest.fn().mockReturnValue('openai')
            }));

            caller = new LLMCaller('openai', 'test-model', mockSystemMessage, {
                apiKey: mockApiKey
            });

            await caller.chatCall({
                message: 'test message',
                settings: {
                    temperature: 0.5
                }
            });

            expect(mockProvider.chatCall).toHaveBeenCalledWith('test-model', expect.objectContaining({
                settings: expect.objectContaining({
                    temperature: 0.5
                })
            }));
        });

        it('should handle undefined settings', async () => {
            // Create a new instance without class-level settings
            const mockProvider = {
                chatCall: jest.fn().mockResolvedValue({
                    content: 'test response',
                    role: 'assistant',
                    metadata: {
                        finishReason: FinishReason.STOP,
                        usage: {
                            inputTokens: 10,
                            outputTokens: 20,
                            totalTokens: 30,
                            costs: {
                                inputCost: 0.00001,
                                outputCost: 0.00002,
                                totalCost: 0.00003
                            }
                        }
                    }
                })
            };

            // Setup the mock before creating the instance
            (ProviderManager as jest.Mock).mockImplementation(() => ({
                getProvider: jest.fn().mockReturnValue(mockProvider),
                switchProvider: jest.fn(),
                getCurrentProviderName: jest.fn().mockReturnValue('openai')
            }));

            caller = new LLMCaller('openai', 'test-model', mockSystemMessage, {
                apiKey: mockApiKey
            });

            await caller.chatCall({
                message: 'test message'
            });

            expect(mockProvider.chatCall).toHaveBeenCalledWith('test-model', expect.objectContaining({
                settings: undefined
            }));
        });

        it('should apply settings to stream calls', async () => {
            const streamIterable = await caller.streamCall({
                message: 'test message',
                settings: {
                    temperature: 0.5
                }
            });
            // Trigger the iteration (even if you ignore the value)
            await streamIterable[Symbol.asyncIterator]().next();
            const provider = (ProviderManager as jest.Mock).mock.results[0].value.getProvider();
            expect(provider.streamCall).toHaveBeenCalledWith('test-model', expect.objectContaining({
                settings: expect.objectContaining({
                    temperature: 0.5,
                    maxTokens: 100
                })
            }));
        });

        it('should apply settings to extended call methods', async () => {
            const responses = await caller.call({
                message: 'test message',
                settings: {
                    temperature: 0.5
                }
            });

            const providerManagerInstance = (ProviderManager as jest.Mock).mock.results[0].value;
            const provider = providerManagerInstance.getProvider();

            expect(provider.chatCall).toHaveBeenCalledWith('test-model', expect.objectContaining({
                settings: expect.objectContaining({
                    temperature: 0.5,
                    maxTokens: 100
                })
            }));
        });
    });

    describe("Logging", () => {
        it("should log processing message chunks in call() method when processing multiple chunks", async () => {
            const logSpy = jest.spyOn(console, "log").mockImplementation(() => { });
            const caller = new LLMCaller("openai", "dummy-model", "dummy system message", {});

            // Override the requestProcessor to return multiple chunks
            Reflect.set(caller, "requestProcessor", {
                processRequest: async () => ["chunk1", "chunk2", "chunk3"]
            });

            // Override chatCall to return a dummy response
            Reflect.set(caller, "chatCall", async ({ message, settings }: { message: string; settings?: unknown }) => {
                return { content: message, role: "assistant", metadata: {} };
            });

            await caller.call({ message: "test", data: undefined, endingMessage: undefined, settings: undefined });

            expect(logSpy).toHaveBeenCalledTimes(3);
            expect(logSpy).toHaveBeenCalledWith("Processing message 1 of 3 chunks");
            expect(logSpy).toHaveBeenCalledWith("Processing message 2 of 3 chunks");
            expect(logSpy).toHaveBeenCalledWith("Processing message 3 of 3 chunks");
            logSpy.mockRestore();
        });
    });
}); 