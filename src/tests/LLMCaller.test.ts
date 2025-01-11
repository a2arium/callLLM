import { mockModels } from './mocks/mockModels';
import { z } from 'zod';
import { SchemaValidationError } from '../core/schema/SchemaValidator';
import { FinishReason } from '../interfaces/UniversalInterfaces';

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
        chatCall: jest.fn().mockImplementation(async (model, params) => {
            // Handle JSON mode validation error
            if ((params.settings?.jsonSchema || params.settings?.responseFormat === 'json') && !mockModels.find(m => m.name === model)?.jsonMode) {
                throw new Error(`Model ${model} does not support JSON mode`);
            }

            // Handle schema validation or JSON mode
            if (params.settings?.jsonSchema || params.settings?.responseFormat === 'json') {
                return {
                    content: '{"name": "test", "age": 25}',
                    role: 'assistant',
                    metadata: {
                        model,
                        responseFormat: 'json',
                        usage: {
                            inputTokens: 10,
                            outputTokens: 20,
                            totalTokens: 30,
                            costs: mockCosts
                        }
                    }
                };
            }

            return {
                content: 'Mock response',
                role: 'assistant',
                metadata: {
                    model,
                    responseFormat: 'text',
                    usage: {
                        inputTokens: 10,
                        outputTokens: 20,
                        totalTokens: 30,
                        costs: mockCosts
                    }
                }
            };
        }),
        streamCall: jest.fn().mockImplementation(async (model, params) => ({
            [Symbol.asyncIterator]: async function* () {
                // Handle JSON mode validation error
                if ((params.settings?.jsonSchema || params.settings?.responseFormat === 'json') && !mockModels.find(m => m.name === model)?.jsonMode) {
                    throw new Error(`Model ${model} does not support JSON mode`);
                }

                if (params.settings?.jsonSchema || params.settings?.responseFormat === 'json') {
                    yield {
                        content: JSON.stringify({ name: 'test', age: 25 }),
                        role: 'assistant',
                        isComplete: true,
                        metadata: {
                            model,
                            responseFormat: 'json',
                            usage: mockStreamCosts.final
                        }
                    };
                    return;
                }

                yield {
                    content: 'Mock',
                    role: 'assistant',
                    isComplete: false,
                    metadata: {
                        model,
                        responseFormat: 'text',
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
                        responseFormat: 'text',
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

        it('should validate model configuration on add', () => {
            expect(() => caller.addModel({
                name: 'invalid-model',
                inputPricePerMillion: -1,
                outputPricePerMillion: 1,
                maxRequestTokens: 1000,
                maxResponseTokens: 1000,
                characteristics: {
                    qualityIndex: 80,
                    outputSpeed: 20,
                    firstTokenLatency: 1000
                }
            })).toThrow('Invalid model configuration');

            expect(() => caller.addModel({
                name: 'invalid-model',
                inputPricePerMillion: 1,
                outputPricePerMillion: 1,
                maxRequestTokens: 0,
                maxResponseTokens: 1000,
                characteristics: {
                    qualityIndex: 80,
                    outputSpeed: 20,
                    firstTokenLatency: 1000
                }
            })).toThrow('Invalid model configuration');
        });

        it('should handle model updates correctly', () => {
            const updates = {
                inputPricePerMillion: 100,
                characteristics: {
                    qualityIndex: 99,
                    outputSpeed: 30,
                    firstTokenLatency: 500
                }
            };
            caller.updateModel(defaultModel, updates);
            const model = caller.getModel(defaultModel);
            expect(model?.inputPricePerMillion).toBe(100);
            expect(model?.characteristics.qualityIndex).toBe(99);
        });

        it('should throw error when updating non-existent model', () => {
            expect(() => caller.updateModel('non-existent', {}))
                .toThrow('Model non-existent not found');
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

    describe('JSON Mode and Schema Validation', () => {
        const TestSchema = z.object({
            name: z.string(),
            age: z.number()
        });

        it('should handle JSON mode with schema validation', async () => {
            const response = await caller.chatCall({
                message: 'Get user info',
                settings: {
                    jsonSchema: {
                        name: 'TestSchema',
                        schema: TestSchema
                    }
                }
            });
            expect(response.metadata?.responseFormat).toBe('json');
            expect(typeof response.content).toBe('object');
            expect(response.content).toEqual({ name: 'test', age: 25 });
        });

        it('should handle JSON mode without schema', async () => {
            const response = await caller.chatCall({
                message: 'Get user info',
                settings: {
                    responseFormat: 'json'
                }
            });
            expect(response.metadata?.responseFormat).toBe('json');
            expect(typeof response.content).toBe('object');
            expect(response.content).toEqual({ name: 'test', age: 25 });
        });

        it('should handle regular text mode', async () => {
            const response = await caller.chatCall({
                message: 'Get user info'
            });
            expect(response.metadata?.responseFormat).toBe('text');
            expect(typeof response.content).toBe('string');
            expect(response.content).toBe('Mock response');
        });

        it('should handle JSON mode in streaming with schema', async () => {
            const stream = await caller.streamCall({
                message: 'Get user info',
                settings: {
                    jsonSchema: {
                        name: 'TestSchema',
                        schema: TestSchema
                    }
                }
            });

            for await (const chunk of stream) {
                expect(chunk.metadata?.responseFormat).toBe('json');
                if (chunk.isComplete) {
                    const content = typeof chunk.content === 'string' ? JSON.parse(chunk.content) : chunk.content;
                    expect(typeof content).toBe('object');
                    expect(content).toEqual({ name: 'test', age: 25 });
                }
            }
        });

        it('should handle JSON mode in streaming without schema', async () => {
            const stream = await caller.streamCall({
                message: 'Get user info',
                settings: {
                    responseFormat: 'json'
                }
            });

            for await (const chunk of stream) {
                expect(chunk.metadata?.responseFormat).toBe('json');
                if (chunk.isComplete) {
                    const content = typeof chunk.content === 'string' ? JSON.parse(chunk.content) : chunk.content;
                    expect(typeof content).toBe('object');
                    expect(content).toEqual({ name: 'test', age: 25 });
                }
            }
        });

        it('should handle regular text mode in streaming', async () => {
            const stream = await caller.streamCall({
                message: 'Get user info'
            });

            let finalContent = '';
            for await (const chunk of stream) {
                expect(chunk.metadata?.responseFormat).toBe('text');
                expect(typeof chunk.content).toBe('string');
                finalContent += chunk.content;
            }
            expect(finalContent).toBe('Mock response');
        });

        it('should throw error for invalid JSON mode model', async () => {
            // First, update the model to disable JSON mode
            caller.updateModel(defaultModel, { jsonMode: false });

            await expect(caller.chatCall({
                message: 'Get user info',
                settings: {
                    responseFormat: 'json'
                }
            })).rejects.toThrow('Model mock-model-1 does not support JSON mode');
        });

        it('should handle schema validation errors', async () => {
            const InvalidSchema = z.object({
                name: z.string(),
                age: z.string() // Expecting string but will receive number
            });

            const response = await caller.chatCall({
                message: 'Get user info',
                settings: {
                    jsonSchema: {
                        name: 'InvalidSchema',
                        schema: InvalidSchema
                    }
                }
            });

            expect(response.metadata?.finishReason).toBe(FinishReason.CONTENT_FILTER);
            expect(response.metadata?.validationErrors).toBeDefined();
            expect(response.metadata?.validationErrors?.[0].message).toContain('Expected string');
            expect(response.metadata?.validationErrors?.[0].path).toBe('age');
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

    describe('Advanced Usage', () => {
        it('should handle multi-turn conversations', async () => {
            const responses = await caller.call({
                message: 'Start conversation',
                endingMessage: 'End conversation'
            });

            expect(responses).toHaveLength(2);
            expect(responses[0].content).toBe('Mock response');
            expect(responses[1].content).toBe('Mock response');
        });

        it('should handle streaming multi-turn conversations', async () => {
            const stream = await caller.stream({
                message: 'Start conversation',
                endingMessage: 'End conversation'
            });

            const chunks: string[] = [];
            for await (const chunk of stream) {
                chunks.push(chunk.content);
            }

            expect(chunks.join('')).toBe('Mock responseMock response');
        });

        it('should handle response with finish reason', async () => {
            jest.spyOn(caller['provider'], 'chatCall').mockResolvedValueOnce({
                content: 'Truncated response',
                role: 'assistant',
                metadata: {
                    finishReason: FinishReason.LENGTH,
                    model: defaultModel
                }
            });

            const response = await caller.chatCall({
                message: 'Generate long text'
            });

            expect(response.metadata?.finishReason).toBe(FinishReason.LENGTH);
        });
    });
}); 