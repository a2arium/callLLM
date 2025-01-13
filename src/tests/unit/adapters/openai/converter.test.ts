import { z } from 'zod';
import { Converter } from '../../../../adapters/openai/converter';
import { FinishReason } from '../../../../interfaces/UniversalInterfaces';
import type { ModelInfo, UniversalChatParams } from '../../../../interfaces/UniversalInterfaces';
import type { OpenAIResponse } from '../../../../adapters/openai/types';
import type { ChatCompletion } from 'openai/resources/chat';

describe('Converter', () => {
    let converter: Converter;
    const mockModel: ModelInfo = {
        name: 'gpt-4',
        inputPricePerMillion: 30,
        outputPricePerMillion: 60,
        maxRequestTokens: 8192,
        maxResponseTokens: 4096,
        characteristics: {
            qualityIndex: 90,
            outputSpeed: 100,
            firstTokenLatency: 200
        }
    };

    beforeEach(() => {
        converter = new Converter();
    });

    describe('model and params management', () => {
        it('should set model info', () => {
            converter.setModel(mockModel);
            // Test effect through usage conversion
            const usage = {
                prompt_tokens: 10,
                completion_tokens: 20,
                total_tokens: 30
            };
            const result = converter['convertUsage'](usage);
            expect(result.costs).toEqual({
                inputCost: 0.00030000000000000003,  // (10 / 1M) * 30
                outputCost: 0.0012000000000000001, // (20 / 1M) * 60
                totalCost: 0.0015   // 0.0003 + 0.0012
            });
        });

        it('should set params', () => {
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }],
                settings: { responseFormat: 'json' }
            };
            converter.setParams(params);
            // Test effect through response conversion
            const response: OpenAIResponse = {
                id: 'test',
                object: 'chat.completion',
                created: 123,
                model: 'gpt-4',
                choices: [{
                    message: { role: 'assistant', content: 'test', refusal: null },
                    finish_reason: 'stop',
                    index: 0,
                    logprobs: null
                }],
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 20,
                    total_tokens: 30
                }
            };
            const result = converter.convertFromProviderResponse(response);
            expect(result.metadata?.responseFormat).toBe('json');
        });
    });

    describe('response format handling', () => {
        it('should handle Zod schema', () => {
            const schema = z.object({ name: z.string() });
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }],
                settings: {
                    jsonSchema: {
                        name: 'TestSchema',
                        schema
                    }
                }
            };
            const result = converter.convertToProviderParams(params);
            expect(result.response_format).toEqual({
                type: 'json_schema',
                json_schema: {
                    name: 'TestSchema',
                    schema: {
                        $schema: 'http://json-schema.org/draft-07/schema#',
                        type: 'object',
                        properties: {
                            name: { type: 'string' }
                        },
                        required: ['name'],
                        additionalProperties: false
                    },
                    strict: true
                }
            });
        });

        it('should handle JSON schema string', () => {
            const schema = JSON.stringify({
                type: 'object',
                properties: {
                    name: { type: 'string' }
                }
            });
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }],
                settings: {
                    jsonSchema: {
                        name: 'TestSchema',
                        schema
                    }
                }
            };
            const result = converter.convertToProviderParams(params);
            expect(result.response_format).toEqual({
                type: 'json_schema',
                json_schema: {
                    name: 'TestSchema',
                    schema: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' }
                        }
                    }
                }
            });
        });

        it('should handle JSON schema object', () => {
            const schema = z.object({
                name: z.string()
            });
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }],
                settings: {
                    jsonSchema: {
                        name: 'TestSchema',
                        schema
                    }
                }
            };
            const result = converter.convertToProviderParams(params);
            expect(result.response_format).toEqual({
                type: 'json_schema',
                json_schema: {
                    name: 'TestSchema',
                    schema: {
                        $schema: 'http://json-schema.org/draft-07/schema#',
                        type: 'object',
                        properties: {
                            name: { type: 'string' }
                        },
                        required: ['name'],
                        additionalProperties: false
                    },
                    strict: true
                }
            });
        });

        it('should use default name for JSON schema', () => {
            const schema = z.object({
                name: z.string()
            });
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }],
                settings: {
                    jsonSchema: {
                        schema
                    }
                }
            };
            const result = converter.convertToProviderParams(params);
            expect(result.response_format).toEqual({
                type: 'json_schema',
                json_schema: {
                    name: 'response',
                    schema: {
                        $schema: 'http://json-schema.org/draft-07/schema#',
                        type: 'object',
                        properties: {
                            name: { type: 'string' }
                        },
                        required: ['name'],
                        additionalProperties: false
                    },
                    strict: true
                }
            });
        });

        it('should handle default JSON format', () => {
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }],
                settings: {
                    responseFormat: 'json'
                }
            };
            const result = converter.convertToProviderParams(params);
            expect(result.response_format).toEqual({
                type: 'json_object'
            });
        });

        it('should handle no format', () => {
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }]
            };
            const result = converter.convertToProviderParams(params);
            expect(result.response_format).toBeUndefined();
        });
    });

    describe('parameter conversion', () => {
        it('should convert messages', () => {
            const params: UniversalChatParams = {
                messages: [
                    { role: 'system', content: 'system message' },
                    { role: 'user', content: 'user message' },
                    { role: 'assistant', content: 'assistant message' }
                ]
            };
            const result = converter.convertToProviderParams(params);
            expect(result.messages).toEqual([
                { role: 'system', content: 'system message', name: undefined, refusal: null },
                { role: 'user', content: 'user message', name: undefined, refusal: null },
                { role: 'assistant', content: 'assistant message', name: undefined, refusal: null }
            ]);
        });

        it('should convert settings', () => {
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }],
                settings: {
                    temperature: 0.7,
                    topP: 0.9,
                    maxTokens: 100,
                    presencePenalty: 0.5,
                    frequencyPenalty: 0.3
                }
            };
            const result = converter.convertToProviderParams(params);
            expect(result).toMatchObject({
                temperature: 0.7,
                top_p: 0.9,
                max_tokens: 100,
                presence_penalty: 0.5,
                frequency_penalty: 0.3
            });
        });

        it('should set default values', () => {
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }]
            };
            const result = converter.convertToProviderParams(params);
            expect(result).toMatchObject({
                n: 1,
                stream: false,
                stop: undefined
            });
        });
    });

    describe('response conversion', () => {
        it('should convert basic response', () => {
            const response: OpenAIResponse = {
                id: 'test',
                object: 'chat.completion',
                created: 123,
                model: 'gpt-4',
                choices: [{
                    message: { role: 'assistant', content: 'test response', refusal: null },
                    finish_reason: 'stop',
                    index: 0,
                    logprobs: null
                }],
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 20,
                    total_tokens: 30
                }
            };
            const result = converter.convertFromProviderResponse(response);
            expect(result).toEqual({
                content: 'test response',
                role: 'assistant',
                metadata: {
                    finishReason: FinishReason.STOP,
                    created: 123,
                    model: 'gpt-4',
                    usage: {
                        inputTokens: 10,
                        outputTokens: 20,
                        totalTokens: 30,
                        costs: {
                            inputCost: 0,
                            outputCost: 0,
                            totalCost: 0
                        }
                    },
                    responseFormat: 'text'
                }
            });
        });

        it('should handle empty content', () => {
            const response: OpenAIResponse = {
                id: 'test',
                object: 'chat.completion',
                created: 123,
                model: 'gpt-4',
                choices: [{
                    message: { role: 'assistant', content: '', refusal: null },
                    finish_reason: 'stop',
                    index: 0,
                    logprobs: null
                }],
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 20,
                    total_tokens: 30
                }
            };
            const result = converter.convertFromProviderResponse(response);
            expect(result.content).toBe('');
        });

        it('should handle different finish reasons', () => {
            const testCases = [
                { input: 'stop', expected: FinishReason.STOP },
                { input: 'length', expected: FinishReason.LENGTH },
                { input: 'content_filter', expected: FinishReason.CONTENT_FILTER },
                { input: 'tool_calls', expected: FinishReason.TOOL_CALLS }
            ] as const;

            testCases.forEach(({ input, expected }) => {
                const response: OpenAIResponse = {
                    id: 'test',
                    object: 'chat.completion',
                    created: 123,
                    model: 'gpt-4',
                    choices: [{
                        message: { role: 'assistant', content: 'test', refusal: null },
                        finish_reason: input,
                        index: 0,
                        logprobs: null
                    }],
                    usage: {
                        prompt_tokens: 10,
                        completion_tokens: 20,
                        total_tokens: 30
                    }
                };
                const result = converter.convertFromProviderResponse(response);
                expect(result.metadata?.finishReason).toBe(expected);
            });
        });

        it('should calculate costs when model is set', () => {
            converter.setModel(mockModel);
            const response: OpenAIResponse = {
                id: 'test',
                object: 'chat.completion',
                created: 123,
                model: 'gpt-4',
                choices: [{
                    message: { role: 'assistant', content: 'test', refusal: null },
                    finish_reason: 'stop',
                    index: 0,
                    logprobs: null
                }],
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 20,
                    total_tokens: 30
                }
            };
            const result = converter.convertFromProviderResponse(response);
            expect(result.metadata?.usage?.costs).toEqual({
                inputCost: 0.00030000000000000003,  // (10 / 1M) * 30
                outputCost: 0.0012000000000000001, // (20 / 1M) * 60
                totalCost: 0.0015   // 0.0003 + 0.0012
            });
        });
    });
}); 