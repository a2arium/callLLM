import { LLMCaller } from '../../../../core/caller/LLMCaller';
import { ProviderManager } from '../../../../core/caller/ProviderManager';
import { ModelManager } from '../../../../core/models/ModelManager';
import { TokenCalculator } from '../../../../core/models/TokenCalculator';
import { ResponseProcessor } from '../../../../core/caller/ResponseProcessor';
import { StreamHandler } from '../../../../core/streaming/StreamHandler';
import { ModelInfo, UniversalChatResponse, UniversalStreamResponse, FinishReason } from '../../../../interfaces/UniversalInterfaces';
import { z } from 'zod';

// Mock dependencies
jest.mock('../../../../core/caller/ProviderManager');
jest.mock('../../../../core/models/ModelManager');
jest.mock('../../../../core/models/TokenCalculator');
jest.mock('../../../../core/caller/ResponseProcessor');
jest.mock('../../../../core/streaming/StreamHandler');

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
                costs: {
                    inputCost: 0.00001,
                    outputCost: 0.00002,
                    totalCost: 0.00003
                }
            })
        }));

        // Setup ResponseProcessor mock
        (ResponseProcessor as jest.Mock).mockImplementation(() => ({
            validateResponse: jest.fn().mockImplementation((response) => response),
            validateJsonMode: jest.fn()
        }));

        // Setup StreamHandler mock
        (StreamHandler as jest.Mock).mockImplementation(() => ({
            processStream: jest.fn().mockImplementation(async function* () {
                yield {
                    content: 'chunk 1',
                    role: 'assistant',
                    isComplete: false,
                    metadata: {
                        finishReason: null,
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
                yield {
                    content: ' chunk 2',
                    role: 'assistant',
                    isComplete: true,
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
                };
            })
        }));

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
            const caller = new LLMCaller('openai', 'test-model', mockSystemMessage, mockApiKey);
            expect(ProviderManager).toHaveBeenCalledWith('openai', mockApiKey);
            expect(ModelManager).toHaveBeenCalledWith('openai');
            expect(caller).toBeDefined();
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
            caller = new LLMCaller('openai', 'test-model', mockSystemMessage, mockApiKey);
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
            caller = new LLMCaller('openai', 'test-model', mockSystemMessage, mockApiKey);
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
            // Mock dependencies
            const llmCaller = new LLMCaller('openai', 'test-model', 'system message');
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
            expect(chunks[1].content).toBe('first 1 first 2');
            expect(chunks[1].isComplete).toBe(true);
            expect(chunks[1].metadata?.finishReason).toBe(FinishReason.STOP);
        });

        it('should make extended call with ending message', async () => {
            const responses = await caller.call({
                message: 'test message',
                endingMessage: 'ending message'
            });
            expect(responses).toHaveLength(2);
            expect(responses[0].content).toBe('test response');
            expect(responses[1].content).toBe('test response');
        });

        it('should make stream call without ending message and accumulate content', async () => {
            // Mock dependencies
            const llmCaller = new LLMCaller('openai', 'test-model', 'system message');
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
            expect(chunks[1].content).toBe('chunk 1 chunk 2');
            expect(chunks[1].isComplete).toBe(true);
        });

        it('should make stream call with ending message and accumulate content', async () => {
            const llmCaller = new LLMCaller('openai', 'test-model', 'system message');
            let callCount = 0;
            const streamCallMock = jest.spyOn(llmCaller, 'streamCall').mockImplementation(async ({ message, data, settings }) => {
                callCount++;
                return {
                    [Symbol.asyncIterator]: async function* () {
                        if (message === 'test message') {
                            yield {
                                content: 'first ',
                                role: 'assistant',
                                isComplete: false,
                                metadata: {
                                    finishReason: FinishReason.NULL
                                }
                            };
                            yield {
                                content: 'response',
                                role: 'assistant',
                                isComplete: true,
                                metadata: {
                                    finishReason: FinishReason.STOP
                                }
                            };
                        } else {
                            yield {
                                content: 'second ',
                                role: 'assistant',
                                isComplete: false,
                                metadata: {
                                    finishReason: FinishReason.NULL
                                }
                            };
                            yield {
                                content: 'response',
                                role: 'assistant',
                                isComplete: true,
                                metadata: {
                                    finishReason: FinishReason.STOP
                                }
                            };
                        }
                    }
                };
            });

            const settings = { temperature: 0.7 };
            const data = { key: 'value' };
            const stream = await llmCaller.stream({
                message: 'test message',
                endingMessage: 'ending message',
                settings,
                data
            });

            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            expect(chunks.length).toBe(4);
            // First stream chunks
            expect(chunks[0].content).toBe('first ');
            expect(chunks[0].isComplete).toBe(false);
            expect(chunks[0].metadata?.finishReason).toBe(FinishReason.NULL);
            expect(chunks[1].content).toBe('first response');
            expect(chunks[1].isComplete).toBe(true);
            expect(chunks[1].metadata?.finishReason).toBe(FinishReason.STOP);
            // Second stream chunks
            expect(chunks[2].content).toBe('first responsesecond ');
            expect(chunks[2].isComplete).toBe(false);
            expect(chunks[2].metadata?.finishReason).toBe(FinishReason.NULL);
            expect(chunks[3].content).toBe('first responsesecond response');
            expect(chunks[3].isComplete).toBe(true);
            expect(chunks[3].metadata?.finishReason).toBe(FinishReason.STOP);

            expect(callCount).toBe(2);
            expect(streamCallMock).toHaveBeenCalledTimes(2);
            expect(streamCallMock).toHaveBeenNthCalledWith(1, { message: 'test message', data, settings });
            expect(streamCallMock).toHaveBeenNthCalledWith(2, { message: 'ending message', data, settings });
        });

        it('should calculate usage when not provided in response', async () => {
            const providerManagerInstance = (ProviderManager as jest.Mock).mock.results[0].value;
            providerManagerInstance.getProvider.mockReturnValueOnce({
                chatCall: jest.fn().mockResolvedValue({
                    content: 'test response',
                    role: 'assistant',
                    metadata: {
                        finishReason: FinishReason.STOP
                    }
                })
            });

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
            const providerManagerInstance = (ProviderManager as jest.Mock).mock.results[0].value;
            providerManagerInstance.getProvider.mockReturnValueOnce({
                chatCall: jest.fn().mockResolvedValue({
                    content: 'test response',
                    role: 'assistant'
                })
            });

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
            const providerManagerInstance = (ProviderManager as jest.Mock).mock.results[0].value;
            providerManagerInstance.getProvider.mockReturnValueOnce({
                chatCall: jest.fn().mockResolvedValue({
                    content: 'test response',
                    role: 'assistant',
                    metadata: {}
                })
            });

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
            caller = new LLMCaller('openai', 'test-model', mockSystemMessage, mockApiKey);
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
            caller = new LLMCaller('openai', 'test-model', mockSystemMessage, mockApiKey);
        });

        it('should make stream call with ending message and accumulate content', async () => {
            const stream = await caller.stream({
                message: 'test message',
                endingMessage: 'ending message'
            });

            const chunks: UniversalStreamResponse[] = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            expect(chunks).toHaveLength(4);
            expect(chunks[0].content).toBe('chunk 1');
            expect(chunks[1].content).toBe('chunk 1 chunk 2');
            expect(chunks[2].content).toBe('chunk 1 chunk 2chunk 1');
            expect(chunks[3].content).toBe('chunk 1 chunk 2chunk 1 chunk 2');
        });

        it('should handle stream errors in first stream', async () => {
            const streamHandlerInstance = (StreamHandler as jest.Mock).mock.results[0].value;
            streamHandlerInstance.processStream.mockImplementationOnce(async function* () {
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
            const streamHandlerInstance = (StreamHandler as jest.Mock).mock.results[0].value;
            let callCount = 0;
            streamHandlerInstance.processStream.mockImplementation(async function* () {
                callCount++;
                if (callCount === 1) {
                    yield {
                        content: 'chunk 1',
                        role: 'assistant',
                        isComplete: true,
                        metadata: {
                            finishReason: FinishReason.STOP
                        }
                    };
                } else {
                    throw new Error('Stream error');
                }
            });

            const stream = await caller.stream({
                message: 'test message',
                endingMessage: 'ending message'
            });

            const chunks: UniversalStreamResponse[] = [];
            await expect(async () => {
                for await (const chunk of stream) {
                    chunks.push(chunk);
                }
            }).rejects.toThrow('Stream error');

            expect(chunks).toHaveLength(1);
            expect(chunks[0].content).toBe('chunk 1');
        });

        it('should handle stream without ending message', async () => {
            const stream = await caller.stream({
                message: 'test message'
            });

            const chunks: UniversalStreamResponse[] = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            expect(chunks).toHaveLength(2);
            expect(chunks[0].content).toBe('chunk 1');
            expect(chunks[1].content).toBe('chunk 1 chunk 2');
        });
    });
}); 