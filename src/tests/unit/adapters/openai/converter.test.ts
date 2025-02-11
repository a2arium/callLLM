import { z } from 'zod';
import { Converter } from '../../../../adapters/openai/converter';
import { FinishReason } from '../../../../interfaces/UniversalInterfaces';
import type { UniversalChatParams, UniversalChatResponse } from '../../../../interfaces/UniversalInterfaces';
import type { OpenAIResponse, OpenAIStreamResponse, OpenAIToolCall } from '../../../../adapters/openai/types';
import type { ChatCompletion, ChatCompletionMessage } from 'openai/resources/chat';
import type { ModelInfo } from '../../../../interfaces/UniversalInterfaces';

describe('Converter', () => {
    let converter: Converter;
    let mockModel: ModelInfo;
    const mockParams: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }]
    };

    // Define mockToolCall at the top level for reuse across test cases
    const mockToolCall: OpenAIToolCall = {
        id: 'call_123',
        type: 'function',
        function: {
            name: 'test_tool',
            arguments: '{"test": "value"}'
        }
    };

    beforeEach(() => {
        converter = new Converter();
        mockModel = {
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
        converter.setModel(mockModel);
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
            expect(result.metadata?.usage?.costs).toEqual({
                inputCost: 0.003, // 100 tokens * $30 per million
                outputCost: 0.003, // 50 tokens * $60 per million
                totalCost: 0.006
            });
        });

        it('should handle cached tokens in usage', () => {
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

            const usageWithCached = {
                ...mockUsage,
                prompt_tokens_details: {
                    cached_tokens: 20
                }
            };

            const response = {
                choices: [{
                    message: { content: 'test', role: 'assistant' },
                    finish_reason: 'stop'
                }],
                usage: usageWithCached
            } as OpenAIResponse;

            const result = converter.convertFromProviderResponse(response);
            expect(result.metadata?.usage).toEqual({
                inputTokens: 100,
                outputTokens: 50,
                totalTokens: 150,
                inputCachedTokens: 20,
                costs: {
                    inputCost: 0.003,
                    outputCost: 0.003,
                    totalCost: 0.006
                }
            });
        });

        it('should handle usage without cached tokens', () => {
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
                usage: mockUsage // No cached tokens info
            } as OpenAIResponse;

            const result = converter.convertFromProviderResponse(response);
            expect(result.metadata?.usage).toEqual({
                inputTokens: 100,
                outputTokens: 50,
                totalTokens: 150,
                costs: {
                    inputCost: 0.003,
                    outputCost: 0.003,
                    totalCost: 0.006
                }
            });
        });

        it('should handle usage without model info', () => {
            converter.clearModel(); // Clear the model before testing
            const usageWithCached = {
                ...mockUsage,
                prompt_tokens_details: {
                    cached_tokens: 20
                }
            };

            const response = {
                choices: [{
                    message: { content: 'test', role: 'assistant' },
                    finish_reason: 'stop'
                }],
                usage: usageWithCached
            } as OpenAIResponse;

            const result = converter.convertFromProviderResponse(response);
            expect(result.metadata?.usage).toEqual({
                inputTokens: 100,
                outputTokens: 50,
                totalTokens: 150,
                inputCachedTokens: 20,
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
            // Set up a model with known pricing
            const mockModel = {
                name: 'test-model',
                inputPricePerMillion: 0.1,
                outputPricePerMillion: 0.2,
                maxRequestTokens: 1000,
                maxResponseTokens: 500,
                characteristics: {
                    qualityIndex: 80,
                    outputSpeed: 100,
                    firstTokenLatency: 100
                }
            };
            converter.setModel(mockModel);

            const response: OpenAIResponse = {
                id: 'response_123',
                object: 'chat.completion',
                choices: [{
                    index: 0,
                    logprobs: null,
                    message: {
                        role: 'assistant',
                        content: 'Using tool',
                        tool_calls: [mockToolCall],
                        refusal: null
                    } as ChatCompletionMessage,
                    finish_reason: 'tool_calls'
                }],
                created: 123,
                model: 'gpt-4',
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 20,
                    total_tokens: 30
                }
            };

            converter.setParams({
                ...mockParams,
                settings: { responseFormat: 'json' }
            });

            const result = converter.convertFromProviderResponse(response);
            expect(result).toEqual({
                content: 'Using tool',
                role: 'assistant',
                toolCalls: [{
                    name: 'test_tool',
                    arguments: { test: 'value' }
                }],
                metadata: {
                    finishReason: FinishReason.TOOL_CALLS,
                    created: 123,
                    model: 'gpt-4',
                    responseFormat: 'json',
                    usage: {
                        inputTokens: 10,
                        outputTokens: 20,
                        totalTokens: 30,
                        costs: {
                            inputCost: 0.000001,
                            outputCost: 0.000004,
                            totalCost: 0.000005
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

    describe('additional edge cases', () => {
        it('should handle model with disabled system messages', () => {
            const modelWithoutSystem = {
                name: 'test-model',
                inputPricePerMillion: 0.1,
                outputPricePerMillion: 0.2,
                maxRequestTokens: 1000,
                maxResponseTokens: 500,
                characteristics: {
                    qualityIndex: 80,
                    outputSpeed: 100,
                    firstTokenLatency: 100
                },
                capabilities: {
                    systemMessages: false
                }
            };
            converter.setModel(modelWithoutSystem);
            const params: UniversalChatParams = {
                messages: [
                    { role: 'system', content: 'system message' }
                ]
            };
            const result = converter.convertToProviderParams(params);
            expect(result.messages[0].role).toBe('user');
        });

        it('should handle model without capabilities', () => {
            const modelWithoutCapabilities = {
                name: 'test-model',
                inputPricePerMillion: 0.1,
                outputPricePerMillion: 0.2,
                maxRequestTokens: 1000,
                maxResponseTokens: 500,
                characteristics: {
                    qualityIndex: 80,
                    outputSpeed: 100,
                    firstTokenLatency: 100
                }
            };
            converter.setModel(modelWithoutCapabilities);
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }],
                settings: {
                    stream: true,
                    temperature: 0.7,
                    n: 3
                }
            };
            const result = converter.convertToProviderParams(params);
            // When capabilities are undefined, streaming should be enabled by default
            expect(result.stream).toBe(true);
            // Other settings should pass through
            expect(result.temperature).toBe(0.7);
            expect(result.n).toBe(1);
        });

        it('should handle function messages without name', () => {
            const params: UniversalChatParams = {
                messages: [
                    { role: 'function', content: 'function result' }
                ]
            };
            const result = converter.convertToProviderParams(params);
            expect(result.messages[0]).toMatchObject({
                role: 'function',
                name: 'function'
            });
        });

        it('should handle tool messages conversion', () => {
            const params: UniversalChatParams = {
                messages: [
                    { role: 'tool', content: 'tool result' }
                ]
            };
            const result = converter.convertToProviderParams(params);
            expect(result.messages[0].role).toBe('user');
        });

        it('should handle developer messages', () => {
            const params: UniversalChatParams = {
                messages: [
                    { role: 'developer', content: 'dev message' }
                ]
            };
            const result = converter.convertToProviderParams(params);
            expect(result.messages[0].role).toBe('developer');
        });

        it('should handle unknown message roles', () => {
            const params: UniversalChatParams = {
                messages: [
                    { role: 'unknown' as any, content: 'test' }
                ]
            };
            const result = converter.convertToProviderParams(params);
            expect(result.messages[0].role).toBe('user');
        });

        it('should handle tool-related settings with capabilities', () => {
            const modelWithTools = {
                name: 'test-model',
                inputPricePerMillion: 0.1,
                outputPricePerMillion: 0.2,
                maxRequestTokens: 1000,
                maxResponseTokens: 500,
                characteristics: {
                    qualityIndex: 80,
                    outputSpeed: 100,
                    firstTokenLatency: 100
                },
                capabilities: {
                    toolCalls: true,
                    parallelToolCalls: true
                }
            };
            converter.setModel(modelWithTools);
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }],
                settings: {
                    toolChoice: 'auto',
                    tools: [{ type: 'function', function: { name: 'test' } }],
                    toolCalls: 2
                }
            };
            const result = converter.convertToProviderParams(params);
            expect(result.tool_choice).toBe('auto');
            expect(result.tools).toBeDefined();
            expect(result).toHaveProperty('tool_calls', 2);
        });

        it('should handle tool settings without parallel capability', () => {
            const modelWithLimitedTools = {
                name: 'test-model',
                inputPricePerMillion: 0.1,
                outputPricePerMillion: 0.2,
                maxRequestTokens: 1000,
                maxResponseTokens: 500,
                characteristics: {
                    qualityIndex: 80,
                    outputSpeed: 100,
                    firstTokenLatency: 100
                },
                capabilities: {
                    toolCalls: true,
                    parallelToolCalls: false
                }
            };
            converter.setModel(modelWithLimitedTools);
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }],
                settings: {
                    toolChoice: 'auto',
                    tools: [{ type: 'function', function: { name: 'test' } }],
                    toolCalls: 2
                }
            };
            const result = converter.convertToProviderParams(params);
            const resultAsAny = result as any;
            expect(resultAsAny.tool_calls).toBeUndefined();
        });

        it('should handle response with length finish reason and empty content', () => {
            const response = {
                choices: [{
                    message: { content: '   ', role: 'assistant' },
                    finish_reason: 'length'
                }]
            } as OpenAIResponse;
            expect(() => converter.convertFromProviderResponse(response))
                .toThrow('Response was truncated before any content could be generated');
        });

        it('should handle model without streaming capability', () => {
            const modelWithoutStreaming = {
                name: 'test-model',
                inputPricePerMillion: 0.1,
                outputPricePerMillion: 0.2,
                maxRequestTokens: 1000,
                maxResponseTokens: 500,
                characteristics: {
                    qualityIndex: 80,
                    outputSpeed: 100,
                    firstTokenLatency: 100
                },
                capabilities: {
                    streaming: false
                }
            };
            converter.setModel(modelWithoutStreaming);
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }],
                settings: {
                    stream: true
                }
            };
            const result = converter.convertToProviderParams(params);
            expect(result.stream).toBe(false);
        });

        it('should handle model without temperature capability', () => {
            const modelWithoutTemp = {
                name: 'test-model',
                inputPricePerMillion: 0.1,
                outputPricePerMillion: 0.2,
                maxRequestTokens: 1000,
                maxResponseTokens: 500,
                characteristics: {
                    qualityIndex: 80,
                    outputSpeed: 100,
                    firstTokenLatency: 100
                },
                capabilities: {
                    temperature: false
                }
            };
            converter.setModel(modelWithoutTemp);
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }],
                settings: {
                    temperature: 0.7
                }
            };
            const result = converter.convertToProviderParams(params);
            expect(result.temperature).toBeUndefined();
        });

        it('should handle model without batch processing capability', () => {
            const modelWithoutBatch = {
                name: 'test-model',
                inputPricePerMillion: 0.1,
                outputPricePerMillion: 0.2,
                maxRequestTokens: 1000,
                maxResponseTokens: 500,
                characteristics: {
                    qualityIndex: 80,
                    outputSpeed: 100,
                    firstTokenLatency: 100
                },
                capabilities: {
                    batchProcessing: false
                }
            };
            converter.setModel(modelWithoutBatch);
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }],
                settings: {
                    n: 3
                }
            };
            const result = converter.convertToProviderParams(params);
            expect(result.n).toBe(1);
        });

        it('should handle model without any settings', () => {
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }]
            };
            const result = converter.convertToProviderParams(params);
            expect(result.response_format).toBeUndefined();
            expect(result.temperature).toBeUndefined();
            expect(result.top_p).toBeUndefined();
            expect(result.n).toBe(1);
            expect(result.stream).toBe(false);
            expect(result.stop).toBeUndefined();
            expect(result.max_completion_tokens).toBeUndefined();
            expect(result.presence_penalty).toBeUndefined();
            expect(result.frequency_penalty).toBeUndefined();
        });

        it('should handle model not set error', () => {
            converter.clearModel();
            expect(() => converter.convertToProviderParams(mockParams))
                .toThrow('Model not set');
        });

        it('should handle invalid response structure', () => {
            const response = {} as OpenAIResponse;
            expect(() => converter.convertFromProviderResponse(response))
                .toThrow('Invalid OpenAI response structure: missing required fields');
        });

        it('should handle response with missing choices', () => {
            const response = {
                id: 'test',
                created: 123,
                model: 'test',
                object: 'chat.completion',
                choices: [],
                usage: {
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    total_tokens: 0
                }
            } as OpenAIResponse;
            expect(() => converter.convertFromProviderResponse(response))
                .toThrow('Invalid OpenAI response structure: missing required fields');
        });

        it('should handle response with missing message', () => {
            const response = {
                id: 'test',
                created: 123,
                model: 'test',
                object: 'chat.completion',
                choices: [{}],
                usage: {
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    total_tokens: 0
                }
            } as OpenAIResponse;
            expect(() => converter.convertFromProviderResponse(response))
                .toThrow('Invalid OpenAI response structure: missing required fields');
        });

        it('should handle model without tool calls capability', () => {
            const modelWithoutTools = {
                name: 'test-model',
                inputPricePerMillion: 0.1,
                outputPricePerMillion: 0.2,
                maxRequestTokens: 1000,
                maxResponseTokens: 500,
                characteristics: {
                    qualityIndex: 80,
                    outputSpeed: 100,
                    firstTokenLatency: 100
                },
                capabilities: {
                    toolCalls: false
                }
            };
            converter.setModel(modelWithoutTools);
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }],
                settings: {
                    toolChoice: 'auto',
                    tools: [{ type: 'function', function: { name: 'test' } }],
                    toolCalls: 2
                }
            };
            const result = converter.convertToProviderParams(params);
            expect(result.tool_choice).toBeUndefined();
            expect(result.tools).toBeUndefined();
            expect(result).not.toHaveProperty('tool_calls');
        });
    });

    describe('tool calling', () => {
        it('should convert tool settings when tool calls are enabled', () => {
            const mockTool = {
                name: 'test_tool',
                description: 'A test tool',
                parameters: {
                    type: 'object',
                    properties: {
                        test: {
                            type: 'string',
                            description: 'A test parameter'
                        }
                    },
                    required: ['test']
                },
                callFunction: async <T>(params: Record<string, unknown>): Promise<T> => {
                    return {} as T;
                }
            };

            const paramsWithTools: UniversalChatParams = {
                ...mockParams,
                settings: {
                    tools: [mockTool],
                    toolChoice: 'auto'
                }
            };

            const result = converter.convertToProviderParams(paramsWithTools);
            expect(result.tools).toEqual([{
                type: 'function',
                function: {
                    name: 'test_tool',
                    description: 'A test tool',
                    parameters: {
                        type: 'object',
                        properties: {
                            test: {
                                type: 'string',
                                description: 'A test parameter'
                            }
                        },
                        required: ['test']
                    }
                }
            }]);
            expect(result.tool_choice).toBe('auto');
        });

        it('should handle tool calls in response', () => {
            const response: OpenAIResponse = {
                id: 'response_123',
                object: 'chat.completion',
                choices: [{
                    index: 0,
                    logprobs: null,
                    message: {
                        role: 'assistant',
                        content: 'Using tool',
                        tool_calls: [mockToolCall],
                        refusal: null
                    } as ChatCompletionMessage,
                    finish_reason: 'tool_calls'
                }],
                created: 123,
                model: 'gpt-4',
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 20,
                    total_tokens: 30
                }
            };

            const result = converter.convertFromProviderResponse(response);
            expect(result.toolCalls).toEqual([{
                name: 'test_tool',
                arguments: { test: 'value' }
            }]);
            expect(result.metadata?.finishReason).toBe(FinishReason.TOOL_CALLS);
        });

        it('should handle parallel tool calls when supported', () => {
            const mockToolCalls: OpenAIToolCall[] = [{
                id: 'call_1',
                type: 'function',
                function: { name: 'tool1', arguments: '{}' }
            }, {
                id: 'call_2',
                type: 'function',
                function: { name: 'tool2', arguments: '{}' }
            }];

            const paramsWithParallelTools: UniversalChatParams = {
                ...mockParams,
                settings: {
                    tools: [{
                        name: 'tool1',
                        description: 'Tool 1',
                        parameters: { type: 'object', properties: {} },
                        callFunction: async <T>(params: Record<string, unknown>): Promise<T> => {
                            return {} as T;
                        }
                    }, {
                        name: 'tool2',
                        description: 'Tool 2',
                        parameters: { type: 'object', properties: {} },
                        callFunction: async <T>(params: Record<string, unknown>): Promise<T> => {
                            return {} as T;
                        }
                    }],
                    toolChoice: 'auto',
                    toolCalls: mockToolCalls
                }
            };

            const result = converter.convertToProviderParams(paramsWithParallelTools);
            expect(result.tools).toBeDefined();
            expect(result.tool_choice).toBe('auto');
        });

        it('should not include tool settings when tool calls are disabled', () => {
            const modelWithoutTools = {
                ...mockModel,
                capabilities: {
                    ...mockModel.capabilities,
                    toolCalls: false
                }
            };
            converter.setModel(modelWithoutTools);

            const paramsWithTools: UniversalChatParams = {
                ...mockParams,
                settings: {
                    tools: [{
                        name: 'test_tool',
                        description: 'A test tool',
                        parameters: { type: 'object', properties: {} },
                        callFunction: async <T>(params: Record<string, unknown>): Promise<T> => {
                            return {} as T;
                        }
                    }],
                    toolChoice: 'auto'
                }
            };

            const result = converter.convertToProviderParams(paramsWithTools);
            expect(result.tools).toBeUndefined();
            expect(result.tool_choice).toBeUndefined();
        });
    });
}); 