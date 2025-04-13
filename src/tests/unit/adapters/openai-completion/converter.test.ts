import { z } from 'zod';
import { Converter } from '../../../../adapters/openai-completion/converter';
import { UniversalChatParams, UniversalChatResponse, UniversalMessage, ModelInfo, UniversalStreamResponse } from '../../../../interfaces/UniversalInterfaces';
import { OpenAIResponse, OpenAIStreamResponse, OpenAIToolCall, OpenAIAssistantMessage } from '../../../../adapters/openai-completion/types';
import { ToolDefinition } from '../../../../core/types';
import { ChatCompletionMessage } from 'openai/resources/chat';

describe('Converter', () => {
    let converter: Converter;
    let mockTool: ToolDefinition;
    let mockModel: ModelInfo;

    beforeEach(() => {
        converter = new Converter();
        mockTool = {
            name: 'test_tool',
            description: 'A test tool',
            parameters: {
                type: 'object',
                properties: {
                    test: { type: 'string' }
                }
            }
        };
        mockModel = {
            name: 'test-model',
            inputPricePerMillion: 0.01,
            outputPricePerMillion: 0.02,
            maxRequestTokens: 4000,
            maxResponseTokens: 1000,
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
                input: {
                    text: true
                },
                output: {
                    text: true
                }
            }
        };
        converter.setModel(mockModel);
    });

    describe('convertToProviderParams', () => {
        it('should convert basic params correctly', () => {
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Hello' }],
                model: 'test-model',
                settings: {
                    temperature: 0.7,
                    maxTokens: 100
                }
            };

            const result = converter.convertToProviderParams(params);

            expect(result).toMatchObject({
                messages: [{ role: 'user', content: 'Hello' }],
                temperature: 0.7,
                max_completion_tokens: 100,
                stream: false
            });
        });

        it('should handle JSON response format', () => {
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Hello' }],
                model: 'test-model',
                responseFormat: 'json'
            };

            const result = converter.convertToProviderParams(params);
            expect(result.response_format).toEqual({ type: 'json_object' });
        });

        it('should handle Zod schema', () => {
            const schema = z.object({
                name: z.string(),
                age: z.number()
            });

            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Hello' }],
                model: 'test-model',
                jsonSchema: {
                    name: 'Person',
                    schema
                }
            };

            const result = converter.convertToProviderParams(params);
            expect(result.response_format).toMatchObject({
                type: 'json_schema',
                json_schema: {
                    name: 'Person',
                    schema: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            age: { type: 'number' }
                        },
                        required: ['name', 'age']
                    }
                }
            });
        });

        it('should handle JSON schema string', () => {
            const schemaStr = JSON.stringify({
                type: 'object',
                properties: {
                    name: { type: 'string' }
                }
            });

            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Hello' }],
                model: 'test-model',
                jsonSchema: {
                    name: 'Person',
                    schema: schemaStr
                }
            };

            const result = converter.convertToProviderParams(params);
            expect(result.response_format).toMatchObject({
                type: 'json_schema',
                json_schema: {
                    name: 'Person',
                    schema: JSON.parse(schemaStr)
                }
            });
        });

        it('should handle invalid JSON schema string', () => {
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Hello' }],
                model: 'test-model',
                jsonSchema: {
                    name: 'Person',
                    schema: 'invalid json'
                }
            };

            expect(() => converter.convertToProviderParams(params)).toThrow('Invalid JSON schema string');
        });

        it('should handle tool calls', () => {
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Hello' }],
                model: 'test-model',
                tools: [mockTool],
                settings: {
                    toolChoice: 'auto'
                }
            };

            const result = converter.convertToProviderParams(params);
            expect(result.tools).toEqual([{
                type: 'function',
                function: {
                    name: 'test_tool',
                    description: 'A test tool',
                    parameters: {
                        type: 'object',
                        properties: {
                            test: { type: 'string' }
                        }
                    }
                }
            }]);
            expect(result.tool_choice).toBe('auto');
        });

        it('should handle parallel tool calls', () => {
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Hello' }],
                model: 'test-model',
                tools: [mockTool],
                settings: {
                    toolCalls: [{
                        name: 'test_tool',
                        arguments: { test: 'value' }
                    }]
                }
            };

            const result = converter.convertToProviderParams(params);
            expect(result.tools).toEqual([{
                type: 'function',
                function: {
                    name: 'test_tool',
                    description: 'A test tool',
                    parameters: {
                        type: 'object',
                        properties: {
                            test: { type: 'string' }
                        }
                    }
                }
            }]);
            // Tool calls are handled by the provider adapter
        });

    });

    describe('convertFromProviderResponse', () => {
        it('should convert successful response correctly', () => {
            const response: OpenAIResponse = {
                id: 'test-id',
                object: 'chat.completion',
                created: 1234567890,
                model: 'test-model',
                choices: [{
                    index: 0,
                    logprobs: null,
                    message: {
                        role: 'assistant',
                        content: 'Hello there!',
                        refusal: null
                    },
                    finish_reason: 'stop'
                }],
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 20,
                    total_tokens: 30
                }
            };

            const result = converter.convertFromProviderResponse(response);
            expect(result).toMatchObject({
                content: 'Hello there!',
                role: 'assistant',
                metadata: {
                    model: 'test-model',
                    created: 1234567890,
                    finishReason: 'stop',
                    usage: {
                        tokens: {
                            input: 10,
                            output: 20,
                            total: 30
                        }
                    }
                }
            });
        });

        it('should handle tool calls in response', () => {
            const response: OpenAIResponse = {
                id: 'test-id',
                object: 'chat.completion',
                created: 1234567890,
                model: 'test-model',
                choices: [{
                    index: 0,
                    logprobs: null,
                    message: {
                        role: 'assistant',
                        content: null,
                        refusal: null,
                        tool_calls: [{
                            id: 'call-1',
                            type: 'function',
                            function: {
                                name: 'test_tool',
                                arguments: JSON.stringify({ test: 'value' })
                            }
                        }]
                    },
                    finish_reason: 'tool_calls'
                }],
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 20,
                    total_tokens: 30
                }
            };

            const result = converter.convertFromProviderResponse(response);
            expect(result).toMatchObject({
                content: '',
                role: 'assistant',
                toolCalls: [{
                    name: 'test_tool',
                    arguments: { test: 'value' }
                }],
                metadata: {
                    finishReason: 'tool_calls'
                }
            });
        });

        it('should handle function messages', () => {
            const response: OpenAIResponse = {
                id: 'test-id',
                object: 'chat.completion',
                created: 1234567890,
                model: 'test-model',
                choices: [{
                    index: 0,
                    logprobs: null,
                    message: {
                        role: 'assistant',
                        content: null,
                        tool_calls: [{
                            id: 'call-1',
                            type: 'function',
                            function: {
                                name: 'test_function',
                                arguments: JSON.stringify({ test: 'value' })
                            }
                        }],
                        refusal: null
                    },
                    finish_reason: 'tool_calls'
                }],
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 20,
                    total_tokens: 30
                }
            };

            const result = converter.convertFromProviderResponse(response);
            expect(result).toMatchObject({
                content: '',
                role: 'assistant',
                toolCalls: [{
                    id: 'call-1',
                    name: 'test_function',
                    arguments: { test: 'value' }
                }],
                metadata: {
                    finishReason: 'tool_calls'
                }
            });
        });

        it('should handle invalid response structure', () => {
            const response = {
                id: 'test-id',
                object: 'chat.completion',
                created: 1234567890,
                model: 'test-model',
                choices: [],
                usage: {
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    total_tokens: 0
                }
            } as OpenAIResponse;

            expect(() => converter.convertFromProviderResponse(response))
                .toThrow('Invalid OpenAI response structure: missing choices or message');
        });
    });

    describe('convertStreamResponse', () => {
        it('should convert stream chunks correctly', async () => {
            const mockStream: AsyncIterable<OpenAIStreamResponse> = {
                async *[Symbol.asyncIterator]() {
                    yield {
                        id: 'test-id',
                        object: 'chat.completion.chunk',
                        created: 1234567890,
                        model: 'test-model',
                        choices: [{
                            delta: {
                                role: 'assistant',
                                content: 'Hello'
                            },
                            finish_reason: null
                        }]
                    };
                    yield {
                        id: 'test-id',
                        object: 'chat.completion.chunk',
                        created: 1234567890,
                        model: 'test-model',
                        choices: [{
                            delta: {
                                content: ' there!'
                            },
                            finish_reason: null
                        }]
                    };
                    yield {
                        id: 'test-id',
                        object: 'chat.completion.chunk',
                        created: 1234567890,
                        model: 'test-model',
                        choices: [{
                            delta: {},
                            finish_reason: 'stop'
                        }]
                    };
                }
            };

            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Hi' }],
                model: 'test-model'
            };

            const chunks: UniversalStreamResponse[] = [];
            for await (const chunk of converter.convertStreamResponse(mockStream, params)) {
                chunks.push(chunk);
            }

            expect(chunks).toHaveLength(3);
            expect(chunks[0]).toMatchObject({
                role: 'assistant',
                content: 'Hello',
                isComplete: false
            });
            expect(chunks[1]).toMatchObject({
                role: 'assistant',
                content: ' there!',
                isComplete: false
            });
            expect(chunks[2]).toMatchObject({
                role: 'assistant',
                content: '',
                isComplete: false,
                metadata: {
                    finishReason: 'stop'
                }
            });
        });

        it('should handle tool calls in stream', async () => {
            const mockStream: AsyncIterable<OpenAIStreamResponse> = {
                async *[Symbol.asyncIterator]() {
                    yield {
                        id: 'test-id',
                        object: 'chat.completion.chunk',
                        created: 1234567890,
                        model: 'test-model',
                        choices: [{
                            delta: {
                                role: 'assistant',
                                tool_calls: [{
                                    id: 'call-1',
                                    type: 'function',
                                    function: {
                                        name: 'test_tool',
                                        arguments: ''
                                    }
                                }]
                            },
                            finish_reason: null
                        }]
                    };
                    yield {
                        id: 'test-id',
                        object: 'chat.completion.chunk',
                        created: 1234567890,
                        model: 'test-model',
                        choices: [{
                            delta: {
                                tool_calls: [{
                                    id: 'call-1',
                                    type: 'function',
                                    function: {
                                        arguments: '{"test":'
                                    }
                                }]
                            },
                            finish_reason: null
                        }]
                    };
                    yield {
                        id: 'test-id',
                        object: 'chat.completion.chunk',
                        created: 1234567890,
                        model: 'test-model',
                        choices: [{
                            delta: {
                                tool_calls: [{
                                    id: 'call-1',
                                    type: 'function',
                                    function: {
                                        arguments: '"value"}'
                                    }
                                }]
                            },
                            finish_reason: null
                        }]
                    };
                    yield {
                        id: 'test-id',
                        object: 'chat.completion.chunk',
                        created: 1234567890,
                        model: 'test-model',
                        choices: [{
                            delta: {},
                            finish_reason: 'tool_calls'
                        }]
                    };
                }
            };

            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Hi' }],
                model: 'test-model'
            };

            const chunks: UniversalStreamResponse[] = [];
            for await (const chunk of converter.convertStreamResponse(mockStream, params)) {
                chunks.push(chunk);
            }

            expect(chunks).toHaveLength(4);
            expect(chunks[0]).toMatchObject({
                role: 'assistant',
                content: '',
                isComplete: false,
                toolCalls: [{
                    id: 'call-1',
                    name: 'test_tool'
                }]
            });
            expect(chunks[3]).toMatchObject({
                role: 'assistant',
                content: '',
                isComplete: false,
                toolCalls: [{
                    id: 'call-1',
                    name: 'test_tool',
                    arguments: { test: 'value' }
                }],
                metadata: {
                    finishReason: 'tool_calls'
                }
            });
        });
    });
});
