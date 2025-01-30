import { z } from 'zod';
import { Converter } from '../../../../adapters/openai/converter';
import { FinishReason } from '../../../../interfaces/UniversalInterfaces';
import type { UniversalChatParams } from '../../../../interfaces/UniversalInterfaces';
import type { OpenAIResponse, OpenAIStreamResponse } from '../../../../adapters/openai/types';
import type { ChatCompletion } from 'openai/resources/chat';

describe('Converter', () => {
    let converter: Converter;
    const mockParams: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }]
    };

    beforeEach(() => {
        converter = new Converter();
    });

    describe('state management', () => {
        it('should set and get current params', () => {
            converter.setParams(mockParams);
            expect(converter.getCurrentParams()).toEqual(mockParams);
        });

        it('should set model info', () => {
            const mockModel = {
                name: 'gpt-4',
                inputPricePerMillion: 1,
                outputPricePerMillion: 2,
                maxRequestTokens: 4000,
                maxResponseTokens: 2000,
                characteristics: {
                    qualityIndex: 90,
                    outputSpeed: 100,
                    firstTokenLatency: 200
                }
            };
            converter.setModel(mockModel);
            // Test model info is used in usage calculation
            const mockUsage = {
                prompt_tokens: 100,
                completion_tokens: 50,
                total_tokens: 150
            };
            const response = {
                choices: [{
                    message: { content: 'test', role: 'assistant' },
                    finish_reason: 'stop'
                }],
                usage: mockUsage
            } as OpenAIResponse;
            const result = converter.convertFromProviderResponse(response);
            expect(result.metadata?.usage?.costs).toEqual({
                inputCost: 0.0001, // 100 tokens * $1 per million
                outputCost: 0.0001, // 50 tokens * $2 per million
                totalCost: 0.0002
            });
        });
    });

    describe('response format handling', () => {
        it('should handle JSON response format', () => {
            const paramsWithJson: UniversalChatParams = {
                ...mockParams,
                settings: { responseFormat: 'json' }
            };
            const result = converter.convertToProviderParams(paramsWithJson);
            expect(result.response_format).toEqual({ type: 'json_object' });
        });

        it('should handle Zod schema', () => {
            const schema = z.object({
                name: z.string(),
                age: z.number()
            });
            const paramsWithSchema: UniversalChatParams = {
                ...mockParams,
                settings: {
                    jsonSchema: {
                        schema,
                        name: 'Person'
                    }
                }
            };
            const result = converter.convertToProviderParams(paramsWithSchema);
            expect(result.response_format).toEqual({
                type: 'json_schema',
                json_schema: expect.objectContaining({
                    name: 'Person',
                    schema: expect.objectContaining({
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            age: { type: 'number' }
                        },
                        required: ['name', 'age']
                    })
                })
            });
        });

        it('should handle JSON Schema string', () => {
            const jsonSchema = {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    age: { type: 'number' }
                },
                required: ['name', 'age']
            };
            const paramsWithSchema: UniversalChatParams = {
                ...mockParams,
                settings: {
                    jsonSchema: {
                        schema: JSON.stringify(jsonSchema),
                        name: 'Person'
                    }
                }
            };
            const result = converter.convertToProviderParams(paramsWithSchema);
            expect(result.response_format).toEqual({
                type: 'json_schema',
                json_schema: {
                    name: 'Person',
                    schema: jsonSchema
                }
            });
        });
    });

    describe('message conversion', () => {
        it('should convert messages with name', () => {
            const paramsWithName: UniversalChatParams = {
                messages: [{
                    role: 'user',
                    content: 'test message',
                    name: 'John'
                }]
            };
            const result = converter.convertToProviderParams(paramsWithName);
            expect(result.messages).toEqual([{
                role: 'user',
                content: 'test message',
                name: 'John',
                refusal: null
            }]);
        });

        it('should handle messages without name', () => {
            const result = converter.convertToProviderParams(mockParams);
            expect(result.messages).toEqual([{
                role: 'user',
                content: 'test message',
                name: undefined,
                refusal: null
            }]);
        });
    });

    describe('stream response handling', () => {
        it('should convert stream response with content', () => {
            const chunk: OpenAIStreamResponse = {
                choices: [{
                    delta: { content: 'test stream', role: 'assistant' },
                    finish_reason: 'stop'
                }]
            };
            const result = converter.convertStreamResponse(chunk, mockParams);
            expect(result).toEqual({
                content: 'test stream',
                role: 'assistant',
                isComplete: true,
                metadata: {
                    finishReason: FinishReason.STOP,
                    responseFormat: 'text'
                }
            });
        });

        it('should handle empty delta', () => {
            const chunk: OpenAIStreamResponse = {
                choices: [{
                    delta: {},
                    finish_reason: null
                }]
            };
            const result = converter.convertStreamResponse(chunk, mockParams);
            expect(result).toEqual({
                content: '',
                role: 'assistant',
                isComplete: false,
                metadata: {
                    finishReason: FinishReason.NULL,
                    responseFormat: 'text'
                }
            });
        });

        it('should handle json response format in stream', () => {
            const paramsWithJson: UniversalChatParams = {
                ...mockParams,
                settings: { responseFormat: 'json' }
            };
            const chunk: OpenAIStreamResponse = {
                choices: [{
                    delta: { content: '{"test": true}', role: 'assistant' },
                    finish_reason: 'stop'
                }]
            };
            const result = converter.convertStreamResponse(chunk, paramsWithJson);
            expect(result).toEqual({
                content: '{"test": true}',
                role: 'assistant',
                isComplete: true,
                metadata: {
                    finishReason: FinishReason.STOP,
                    responseFormat: 'json'
                }
            });
        });
    });

    describe('finish reason mapping', () => {
        it('should map all finish reasons correctly', () => {
            const testCases = [
                { input: 'stop', expected: FinishReason.STOP },
                { input: 'length', expected: FinishReason.LENGTH },
                { input: 'content_filter', expected: FinishReason.CONTENT_FILTER },
                { input: 'tool_calls', expected: FinishReason.TOOL_CALLS },
                { input: 'unknown', expected: FinishReason.NULL },
                { input: null, expected: FinishReason.NULL }
            ];

            testCases.forEach(({ input, expected }) => {
                expect(converter.mapFinishReason(input)).toBe(expected);
            });
        });
    });

    describe('usage calculation', () => {
        const mockUsage = {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150
        };

        it('should calculate costs with model info', () => {
            const mockModel = {
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
            converter.setModel(mockModel);

            const response = {
                choices: [{
                    message: { content: 'test', role: 'assistant' },
                    finish_reason: 'stop'
                }],
                usage: mockUsage
            } as OpenAIResponse;

            const result = converter.convertFromProviderResponse(response);
            expect(result.metadata?.usage).toEqual({
                inputTokens: 100,
                outputTokens: 50,
                totalTokens: 150,
                costs: {
                    inputCost: 0.003, // 100 tokens * $30 per million
                    outputCost: 0.003, // 50 tokens * $60 per million
                    totalCost: 0.006
                }
            });
        });

        it('should handle usage without model info', () => {
            const response = {
                choices: [{
                    message: { content: 'test', role: 'assistant' },
                    finish_reason: 'stop'
                }],
                usage: mockUsage
            } as OpenAIResponse;

            const result = converter.convertFromProviderResponse(response);
            expect(result.metadata?.usage).toEqual({
                inputTokens: 100,
                outputTokens: 50,
                totalTokens: 150,
                costs: {
                    inputCost: 0,
                    outputCost: 0,
                    totalCost: 0
                }
            });
        });
    });

    describe('response format edge cases', () => {
        it('should handle missing settings', () => {
            const result = converter.convertToProviderParams(mockParams);
            expect(result.response_format).toBeUndefined();
        });

        it('should handle empty settings', () => {
            const paramsWithEmptySettings: UniversalChatParams = {
                ...mockParams,
                settings: {}
            };
            const result = converter.convertToProviderParams(paramsWithEmptySettings);
            expect(result.response_format).toBeUndefined();
        });

        it('should handle undefined jsonSchema', () => {
            const paramsWithUndefinedSchema: UniversalChatParams = {
                ...mockParams,
                settings: {
                    jsonSchema: undefined
                }
            };
            const result = converter.convertToProviderParams(paramsWithUndefinedSchema);
            expect(result.response_format).toBeUndefined();
        });

        it('should handle invalid schema type', () => {
            const paramsWithInvalidSchema: UniversalChatParams = {
                ...mockParams,
                settings: {
                    jsonSchema: {
                        schema: new Date() as any, // Invalid schema type that's not string or object
                        name: 'Test'
                    }
                }
            };
            expect(() => converter.convertToProviderParams(paramsWithInvalidSchema)).toThrow();
        });

        it('should handle JSON schema without name', () => {
            const schema = {
                type: 'object',
                properties: {
                    test: { type: 'string' }
                },
                required: ['test']
            } as const;
            const paramsWithSchema: UniversalChatParams = {
                ...mockParams,
                settings: {
                    jsonSchema: {
                        schema: JSON.stringify(schema)
                    }
                }
            };
            const result = converter.convertToProviderParams(paramsWithSchema);
            expect(result.response_format).toEqual({
                type: 'json_schema',
                json_schema: {
                    name: 'response',
                    schema
                }
            });
        });

        it('should handle invalid JSON schema string', () => {
            const paramsWithInvalidSchema: UniversalChatParams = {
                ...mockParams,
                settings: {
                    jsonSchema: {
                        schema: 'invalid json',
                        name: 'Test'
                    }
                }
            };
            expect(() => converter.convertToProviderParams(paramsWithInvalidSchema)).toThrow();
        });
    });

    describe('message conversion edge cases', () => {
        it('should handle empty messages array', () => {
            const paramsWithNoMessages: UniversalChatParams = {
                messages: []
            };
            const result = converter.convertToProviderParams(paramsWithNoMessages);
            expect(result.messages).toEqual([]);
        });

        it('should handle multiple messages with mixed properties', () => {
            const paramsWithMultipleMessages: UniversalChatParams = {
                messages: [
                    { role: 'system', content: 'system message' },
                    { role: 'user', content: 'user message', name: 'User1' },
                    { role: 'assistant', content: 'assistant message' }
                ]
            };
            const result = converter.convertToProviderParams(paramsWithMultipleMessages);
            expect(result.messages).toEqual([
                { role: 'system', content: 'system message', name: undefined, refusal: null },
                { role: 'user', content: 'user message', name: 'User1', refusal: null },
                { role: 'assistant', content: 'assistant message', name: undefined, refusal: null }
            ]);
        });
    });

    describe('provider response conversion', () => {
        it('should handle empty content in response', () => {
            const response = {
                choices: [{
                    message: { content: '', role: 'assistant' },
                    finish_reason: 'stop'
                }],
                created: 1234567890,
                model: 'gpt-4',
                usage: {
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    total_tokens: 0
                }
            } as OpenAIResponse;

            const result = converter.convertFromProviderResponse(response);
            expect(result).toEqual({
                content: '',
                role: 'assistant',
                metadata: {
                    finishReason: FinishReason.STOP,
                    created: 1234567890,
                    model: 'gpt-4',
                    responseFormat: 'text',
                    usage: {
                        inputTokens: 0,
                        outputTokens: 0,
                        totalTokens: 0,
                        costs: {
                            inputCost: 0,
                            outputCost: 0,
                            totalCost: 0
                        }
                    }
                }
            });
        });

        it('should handle response with all metadata', () => {
            const response = {
                choices: [{
                    message: { content: 'test', role: 'assistant' },
                    finish_reason: 'stop'
                }],
                created: 1234567890,
                model: 'gpt-4',
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 20,
                    total_tokens: 30
                }
            } as OpenAIResponse;

            converter.setParams({
                ...mockParams,
                settings: { responseFormat: 'json' }
            });

            const result = converter.convertFromProviderResponse(response);
            expect(result).toEqual({
                content: 'test',
                role: 'assistant',
                metadata: {
                    finishReason: FinishReason.STOP,
                    created: 1234567890,
                    model: 'gpt-4',
                    responseFormat: 'json',
                    usage: {
                        inputTokens: 10,
                        outputTokens: 20,
                        totalTokens: 30,
                        costs: {
                            inputCost: 0,
                            outputCost: 0,
                            totalCost: 0
                        }
                    }
                }
            });
        });
    });

    describe('stream response edge cases', () => {
        it('should handle undefined choices', () => {
            const chunk = {} as OpenAIStreamResponse;
            const result = converter.convertStreamResponse(chunk);
            expect(result).toEqual({
                content: '',
                role: 'assistant',
                isComplete: true,
                metadata: {
                    finishReason: FinishReason.NULL,
                    responseFormat: 'text'
                }
            });
        });

        it('should handle empty choices array', () => {
            const chunk = { choices: [] } as OpenAIStreamResponse;
            const result = converter.convertStreamResponse(chunk);
            expect(result).toEqual({
                content: '',
                role: 'assistant',
                isComplete: true,
                metadata: {
                    finishReason: FinishReason.NULL,
                    responseFormat: 'text'
                }
            });
        });

        it('should handle undefined delta', () => {
            const chunk = { choices: [{ finish_reason: null }] } as OpenAIStreamResponse;
            const result = converter.convertStreamResponse(chunk);
            expect(result).toEqual({
                content: '',
                role: 'assistant',
                isComplete: false,
                metadata: {
                    finishReason: FinishReason.NULL,
                    responseFormat: 'text'
                }
            });
        });

        it('should handle stream response with custom response format', () => {
            const chunk = {
                choices: [{
                    delta: { content: 'test', role: 'assistant' },
                    finish_reason: 'stop'
                }]
            } as OpenAIStreamResponse;
            const params: UniversalChatParams = {
                messages: [],
                settings: {
                    responseFormat: 'json' as const
                }
            };
            const result = converter.convertStreamResponse(chunk, params);
            expect(result).toEqual({
                content: 'test',
                role: 'assistant',
                isComplete: true,
                metadata: {
                    finishReason: FinishReason.STOP,
                    responseFormat: 'json'
                }
            });
        });
    });
}); 