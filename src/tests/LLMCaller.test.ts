import { mockModels } from './mocks/mockModels';

const mockCosts = {
    inputCost: 0.0003,  // Based on $30/M tokens for 10 tokens
    outputCost: 0.0012, // Based on $60/M tokens for 20 tokens
    totalCost: 0.0015
};

const mockStreamCosts = {
    first: {
        inputCost: 0.00021,  // Based on $30/M tokens for 7 tokens
        outputCost: 0.00012, // Based on $60/M tokens for 2 tokens
        totalCost: 0.00033
    },
    final: mockCosts
};

// Mock OpenAI adapter
jest.mock('../adapters/openai/OpenAIAdapter', () => ({
    OpenAIAdapter: jest.fn().mockImplementation(() => ({
        chatCall: jest.fn().mockImplementation(async (model, params) => ({
            content: 'Mock response',
            role: 'assistant',
            metadata: {
                model,
                usage: {
                    inputTokens: 10,
                    outputTokens: 20,
                    totalTokens: 30,
                    costs: mockCosts
                }
            }
        })),
        streamCall: jest.fn().mockImplementation(async (model, params) => ({
            [Symbol.asyncIterator]: async function* () {
                yield {
                    content: 'Mock',
                    role: 'assistant',
                    isComplete: false,
                    metadata: {
                        model,
                        usage: {
                            inputTokens: 7,
                            outputTokens: 2,
                            totalTokens: 9,
                            costs: mockStreamCosts.first
                        }
                    }
                };
                yield {
                    content: ' response',
                    role: 'assistant',
                    isComplete: true,
                    metadata: {
                        model,
                        usage: {
                            inputTokens: 10,
                            outputTokens: 20,
                            totalTokens: 30,
                            costs: mockStreamCosts.final
                        }
                    }
                };
            }
        }))
    }))
}));

// Mock OpenAI models
jest.mock('../adapters/openai/models', () => ({
    defaultModels: mockModels
}));

import { LLMCaller } from '../core/LLMCaller';
import { ModelInfo } from '../interfaces/UniversalInterfaces';

describe('LLMCaller', () => {
    let caller: LLMCaller;
    const defaultModel = 'mock-model-1';
    const systemMessage = 'You are a helpful assistant.';

    beforeEach(() => {
        caller = new LLMCaller('openai', defaultModel, systemMessage);
    });

    describe('Initialization', () => {
        it('should initialize with default values', () => {
            const model = caller.getModel(defaultModel);
            expect(model).toBeDefined();
            expect((model as ModelInfo).name).toBe(defaultModel);
            expect((model as ModelInfo).tokenizationModel).toBe('mock-tokenizer');
            expect((model as ModelInfo).characteristics).toBeDefined();
            expect((model as ModelInfo).characteristics.qualityIndex).toBe(95);
        });

        it('should initialize with model alias', () => {
            const callerWithAlias = new LLMCaller('openai', 'fast', systemMessage);
            const model = callerWithAlias.getModel('fast');
            expect(model).toBeDefined();
            expect(model?.characteristics.outputSpeed).toBeGreaterThanOrEqual(25);
        });

        it('should throw error for invalid provider', () => {
            expect(() => new LLMCaller('invalid' as any, defaultModel, systemMessage))
                .toThrow('Provider invalid is not supported yet');
        });

        it('should throw error for invalid model', () => {
            expect(() => new LLMCaller('openai', 'invalid-model', systemMessage))
                .toThrow('Model invalid-model not found');
        });
    });

    describe('Model Management', () => {
        it('should set model with options', () => {
            caller.setModel({ nameOrAlias: 'mock-model-3' });
            const model = caller.getModel('mock-model-3');
            expect(model).toBeDefined();
            expect(model?.inputPricePerMillion).toBe(45.0);
            expect(model?.characteristics.qualityIndex).toBe(100);
        });

        it('should set model by alias', () => {
            caller.setModel({ nameOrAlias: 'fast' });
            const model = caller.getModel('fast');
            expect(model).toBeDefined();
            expect(model?.characteristics.outputSpeed).toBeGreaterThanOrEqual(25);
        });

        it('should switch provider with model', () => {
            caller.setModel({
                provider: 'openai',
                nameOrAlias: 'fast',
                apiKey: 'new-key'
            });
            const model = caller.getModel('fast');
            expect(model).toBeDefined();
            expect(model?.characteristics.outputSpeed).toBeGreaterThanOrEqual(25);
        });

        it('should throw error when setting invalid model', () => {
            expect(() => caller.setModel({ nameOrAlias: 'invalid-model' }))
                .toThrow('Model invalid-model not found');
        });
    });

    describe('Chat Calls', () => {
        it('should make successful chat call', async () => {
            const response = await caller.chatCall({
                message: 'Hello'
            });
            expect(response.content).toBe('Mock response');
            expect(response.metadata?.model).toBe(defaultModel);
            expect(response.metadata?.usage?.costs.totalCost).toBe(0.0015);
        });

        it('should include system message in chat call', async () => {
            const response = await caller.chatCall({
                message: 'Hello'
            });
            expect(response.metadata?.model).toBe(defaultModel);
        });

        it('should handle chat call with settings', async () => {
            const response = await caller.chatCall({
                message: 'Hello',
                settings: {
                    temperature: 0.7,
                    maxTokens: 100
                }
            });
            expect(response.content).toBe('Mock response');
        });
    });

    describe('Stream Calls', () => {
        it('should handle streaming responses', async () => {
            const stream = await caller.streamCall({
                message: 'Hello'
            });
            const chunks: string[] = [];

            for await (const chunk of stream) {
                chunks.push(chunk.content);
                expect(chunk.metadata?.usage?.costs.totalCost).toBeGreaterThan(0);
            }

            expect(chunks.join('')).toBe('Mock response');
        });

        it('should handle streaming with settings', async () => {
            const stream = await caller.streamCall({
                message: 'Hello',
                settings: {
                    temperature: 0.7,
                    maxTokens: 100
                }
            });
            let finalChunk;

            for await (const chunk of stream) {
                finalChunk = chunk;
            }

            expect(finalChunk?.isComplete).toBe(true);
            expect(finalChunk?.metadata?.usage?.costs.inputCost).toBe(0.00021);
            expect(finalChunk?.metadata?.usage?.costs.outputCost).toBeCloseTo(0.00012, 5);
            expect(finalChunk?.metadata?.usage?.costs.totalCost).toBe(0.00033);
        });
    });

    describe('Error Handling', () => {
        it('should handle chat call errors', async () => {
            const mockError = new Error('API Error');
            jest.spyOn(caller['provider'], 'chatCall').mockRejectedValueOnce(mockError);

            await expect(caller.chatCall({
                message: 'Hello'
            })).rejects.toThrow('API Error');
        });

        it('should handle stream call errors', async () => {
            const mockError = new Error('API Error');
            jest.spyOn(caller['provider'], 'streamCall').mockRejectedValueOnce(mockError);

            await expect(caller.streamCall({
                message: 'Hello'
            })).rejects.toThrow('API Error');
        });
    });

    describe('Advanced Model Management', () => {
        it('should handle model updates', () => {
            const customModel: ModelInfo = {
                name: 'custom-model',
                inputPricePerMillion: 30.0,
                outputPricePerMillion: 60.0,
                maxRequestTokens: 8192,
                maxResponseTokens: 4096,
                tokenizationModel: 'mock-tokenizer',
                characteristics: {
                    qualityIndex: 85,
                    outputSpeed: 50,
                    firstTokenLatency: 500
                }
            };

            caller.addModel(customModel);
            expect(caller.getModel('custom-model')).toEqual(customModel);

            const updatedModel = {
                ...customModel,
                inputPricePerMillion: 40.0,
                characteristics: {
                    ...customModel.characteristics,
                    qualityIndex: 95
                }
            };
            caller.addModel(updatedModel);
            expect(caller.getModel('custom-model')).toEqual(updatedModel);
        });

        it('should list all available models', () => {
            const models = caller.getAvailableModels();
            expect(models).toContainEqual(expect.objectContaining({
                name: 'mock-model-1',
                tokenizationModel: 'mock-tokenizer',
                characteristics: expect.objectContaining({
                    qualityIndex: 95,
                    outputSpeed: 15,
                    firstTokenLatency: 2000
                })
            }));
            expect(models.length).toBeGreaterThan(0);
        });

        it('should validate model settings', () => {
            const invalidModel = {
                name: 'invalid',
                inputPricePerMillion: -1,
                outputPricePerMillion: -2,
                maxRequestTokens: 0,
                maxResponseTokens: -1,
                characteristics: {
                    qualityIndex: -1,
                    outputSpeed: -1,
                    firstTokenLatency: -1
                }
            } as ModelInfo;

            expect(() => caller.addModel(invalidModel))
                .toThrow('Invalid model configuration');
        });
    });
}); 