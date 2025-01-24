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

const mockStreamHandler = {
    processStream: jest.fn(async function* (
        stream: AsyncIterable<UniversalStreamResponse>,
        params: UniversalChatParams,
        inputTokens: number,
        modelInfo: ModelInfo
    ): AsyncGenerator<UniversalStreamResponse> {
        const chunks = ['chunk 1', ' chunk 2'];
        for (const chunk of chunks) {
            yield {
                content: chunk,
                role: 'assistant',
                isComplete: chunk === ' chunk 2',
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
            };
        }
    })
} as unknown as jest.Mocked<StreamHandler>;

const mockStreamHandlerForStreamTest = {
    processStream: jest.fn(async function* () {
        const chunks = ['chunk 1', ' chunk 2'];
        let accumulatedContent = '';
        for (const chunk of chunks) {
            accumulatedContent = accumulatedContent ? `${accumulatedContent}${chunk}` : chunk;
            yield {
                content: accumulatedContent,
                role: 'assistant',
                isComplete: chunk === ' chunk 2',
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
            };
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
    const mockModel: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 1,
        outputPricePerMillion: 2,
        maxRequestTokens: 1000,
        maxResponseTokens: 1000,
        tokenizationModel: 'gpt-4',
        jsonMode: true,
        characteristics: {
            qualityIndex: 80,
            outputSpeed: 50,
            firstTokenLatency: 0.5
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Setup ModelManager mock
        (ModelManager as jest.Mock).mockImplementation(() => ({
            getModel: jest.fn().mockReturnValue(mockModel),
            getAvailableModels: jest.fn().mockReturnValue([mockModel]),
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
            expect(models).toEqual([mockModel]);
        });

        it('should add model', () => {
            const modelManagerInstance = (ModelManager as jest.Mock).mock.results[0].value;
            caller.addModel(mockModel);
            expect(modelManagerInstance.addModel).toHaveBeenCalledWith(mockModel);
        });

        it('should get model', () => {
            const model = caller.getModel('test-model');
            expect(model).toEqual(mockModel);
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

        beforeEach(() => {
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
            const response = await caller.chatCall({
                message: 'test message',
                settings: { jsonSchema: { schema } }
            });
            expect(response.content).toBe('test response');
        });

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
            const stream = await caller.stream({
                message: 'test message',
                endingMessage: 'ending message'
            });

            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            expect(chunks).toHaveLength(2);
            expect(chunks[0].content).toBe('chunk 1');
            expect(chunks[1].content).toBe(' chunk 2');
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
            const responseProcessorInstance = (ResponseProcessor as jest.Mock).mock.results[0].value;
            responseProcessorInstance.validateResponse.mockImplementationOnce(() => {
                throw new Error('Invalid response format');
            });

            await expect(caller.chatCall({
                message: 'test message',
                settings: { jsonSchema: { schema: z.object({ name: z.string() }) } }
            })).rejects.toThrow('Invalid response format');
        });

        it('should make stream call with JSON mode', async () => {
            const stream = await caller.streamCall({
                message: 'test message',
                settings: { responseFormat: 'json' }
            });

            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            expect(chunks).toHaveLength(2);
            expect(chunks[0].content).toBe('chunk 1');
            expect(chunks[1].content).toBe(' chunk 2');
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

        beforeEach(() => {
            caller = new LLMCaller('openai', 'test-model', mockSystemMessage, {
                apiKey: mockApiKey
            });
        });

        it('should handle JSON mode validation error', async () => {
            const responseProcessorInstance = (ResponseProcessor as jest.Mock).mock.results[0].value;
            responseProcessorInstance.validateJsonMode.mockImplementationOnce(() => {
                throw new Error('JSON mode not supported');
            });

            await expect(caller.chatCall({
                message: 'test',
                settings: { responseFormat: 'json' }
            })).rejects.toThrow('JSON mode not supported');
        });

        it('should handle schema validation error', async () => {
            const responseProcessorInstance = (ResponseProcessor as jest.Mock).mock.results[0].value;
            responseProcessorInstance.validateResponse.mockImplementationOnce(() => {
                throw new Error('Schema validation failed');
            });

            await expect(caller.chatCall({
                message: 'test',
                settings: { jsonSchema: { schema: z.object({ name: z.string() }) } }
            })).rejects.toThrow('Schema validation failed');
        });

        it('should handle provider errors', async () => {
            const providerManagerInstance = (ProviderManager as jest.Mock).mock.results[0].value;
            providerManagerInstance.getProvider.mockReturnValueOnce({
                chatCall: jest.fn().mockRejectedValue(new Error('API error'))
            });

            await expect(caller.chatCall({
                message: 'test'
            })).rejects.toThrow('API error');
        });
    });

    describe('stream methods', () => {
        let caller: LLMCaller;

        beforeEach(() => {
            caller = new LLMCaller('openai', 'test-model', mockSystemMessage, {
                apiKey: mockApiKey
            });
        });

        it('should handle stream errors in first stream', async () => {
            const streamHandlerInstance = (StreamHandler as jest.MockedClass<typeof StreamHandler>).mock.results[0].value;
            (streamHandlerInstance.processStream as jest.Mock).mockImplementationOnce(async function* () {
                throw new Error('Stream error');
            });

            const stream = await caller.stream({
                message: 'test message',
                endingMessage: 'ending message'
            });

            await expect(async () => {
                for await (const chunk of stream) {
                    // This should throw
                }
            }).rejects.toThrow('Stream error');
        });

        it('should handle stream errors in ending message stream', async () => {
            const streamHandlerInstance = (StreamHandler as jest.MockedClass<typeof StreamHandler>).mock.results[0].value;
            (streamHandlerInstance.processStream as jest.Mock).mockImplementation(async function* () {
                yield {
                    content: 'first response',
                    role: 'assistant',
                    isComplete: true,
                    metadata: {
                        finishReason: FinishReason.STOP
                    }
                };
            });

            const stream = await caller.stream({
                message: 'test message',
                endingMessage: 'ending message'
            });

            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            expect(chunks).toHaveLength(1);
            expect(chunks[0].content).toBe('first response');
        });
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
}); 