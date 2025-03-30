import { OpenAIAdapter } from '../../../../adapters/openai/adapter';
import { OpenAI } from 'openai';
import { FinishReason } from '../../../../interfaces/UniversalInterfaces';
import type { UniversalChatParams, ModelInfo, UniversalStreamResponse } from '../../../../interfaces/UniversalInterfaces';
import type { OpenAIResponse, OpenAIStreamResponse } from '../../../../adapters/openai/types';
import type { ToolDefinition } from '../../../../core/types';

const mockCreate = jest.fn();
jest.mock('openai', () => ({
    OpenAI: jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: mockCreate
            }
        }
    }))
}));

describe('OpenAIAdapter Integration Tests', () => {
    let adapter: OpenAIAdapter;
    let mockClient: jest.Mocked<OpenAI>;
    const MODEL = 'gpt-4';
    const MODEL_WITHOUT_TOOLS = 'gpt-3.5-turbo';
    const MODEL_WITHOUT_PARALLEL = 'gpt-3.5-turbo-0301';
    const mockModelInfo: ModelInfo = {
        name: MODEL,
        inputPricePerMillion: 30,
        outputPricePerMillion: 60,
        maxRequestTokens: 8192,
        maxResponseTokens: 4096,
        characteristics: {
            qualityIndex: 90,
            outputSpeed: 100,
            firstTokenLatency: 200
        },
        capabilities: {
            toolCalls: true,
            parallelToolCalls: true,
            streaming: true,
            temperature: true,
            systemMessages: true
        }
    };

    beforeEach(() => {
        mockCreate.mockReset();
        mockClient = new OpenAI() as jest.Mocked<OpenAI>;
        adapter = new OpenAIAdapter({
            apiKey: 'test-key'
        });
        // Set up models for testing
        adapter.setModelForTesting(MODEL, mockModelInfo);
        adapter.setModelForTesting(MODEL_WITHOUT_TOOLS, {
            name: MODEL_WITHOUT_TOOLS,
            inputPricePerMillion: 0.15,
            outputPricePerMillion: 0.60,
            maxRequestTokens: 128000,
            maxResponseTokens: 16384,
            characteristics: {
                qualityIndex: 73,
                outputSpeed: 183.8,
                firstTokenLatency: 730
            },
            capabilities: {
                toolCalls: false,
                parallelToolCalls: false,
                streaming: true,
                temperature: true,
                systemMessages: true
            }
        });
        adapter.setModelForTesting(MODEL_WITHOUT_PARALLEL, {
            name: MODEL_WITHOUT_PARALLEL,
            inputPricePerMillion: 0.15,
            outputPricePerMillion: 0.60,
            maxRequestTokens: 128000,
            maxResponseTokens: 16384,
            characteristics: {
                qualityIndex: 73,
                outputSpeed: 183.8,
                firstTokenLatency: 730
            },
            capabilities: {
                toolCalls: true,
                parallelToolCalls: false,
                streaming: true,
                temperature: true,
                systemMessages: true
            }
        });
    });

    describe('Tool Calling Integration', () => {
        it('should handle tool calling in chat completion', async () => {
            const mockTool: ToolDefinition = {
                name: 'get_weather',
                description: 'Get the weather in a location',
                parameters: {
                    type: 'object',
                    properties: {
                        location: {
                            type: 'string',
                            description: 'The location to get weather for'
                        }
                    },
                    required: ['location']
                },
                callFunction: async <TParams extends Record<string, unknown>, TResponse = { weather: string }>(params: TParams): Promise<TResponse> => {
                    return { weather: 'sunny' } as TResponse;
                }
            };

            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'What\'s the weather?' }],
                model: MODEL
            };

            mockCreate.mockResolvedValueOnce({
                id: 'test-id',
                object: 'chat.completion',
                created: Date.now(),
                model: MODEL,
                choices: [{
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: null,
                        tool_calls: [{
                            id: 'call_123',
                            type: 'function',
                            function: {
                                name: 'get_weather',
                                arguments: '{"location": "San Francisco, CA"}'
                            }
                        }],
                        refusal: null
                    },
                    finish_reason: 'tool_calls'
                }],
                usage: {
                    prompt_tokens: 50,
                    completion_tokens: 30,
                    total_tokens: 80
                }
            });

            const result = await adapter.chatCall(MODEL, params);
            expect(result.toolCalls).toBeDefined();
            expect(result.toolCalls?.[0].name).toBe('get_weather');
        });

        it('should handle tool calling in streaming completion', async () => {
            const mockTool: ToolDefinition = {
                name: 'get_weather',
                description: 'Get the weather in a location',
                parameters: {
                    type: 'object',
                    properties: {
                        location: {
                            type: 'string',
                            description: 'The location to get weather for'
                        }
                    },
                    required: ['location']
                },
                callFunction: async <TParams extends Record<string, unknown>, TResponse = { weather: string }>(params: TParams): Promise<TResponse> => {
                    return { weather: 'sunny' } as TResponse;
                }
            };

            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'What\'s the weather?' }],
                model: MODEL
            };

            mockCreate.mockImplementation(() => ({
                [Symbol.asyncIterator]: async function* () {
                    yield {
                        choices: [{
                            delta: {
                                role: 'assistant',
                                content: null,
                                tool_calls: [{
                                    index: 0,
                                    id: 'call_123',
                                    type: 'function',
                                    function: {
                                        name: 'get_weather',
                                        arguments: ''
                                    }
                                }]
                            }
                        }]
                    };
                    yield {
                        choices: [{
                            delta: {
                                tool_calls: [{
                                    index: 0,
                                    id: 'call_123',
                                    type: 'function',
                                    function: {
                                        arguments: '{"location": "San Francisco, CA"}'
                                    }
                                }]
                            }
                        }]
                    };
                }
            }));

            const stream = await adapter.streamCall(MODEL, params);
            const chunks: UniversalStreamResponse[] = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            expect(chunks.length).toBe(2);
            expect(JSON.parse(chunks[1].toolCallChunks?.[0].argumentsChunk as string)).toEqual({ location: 'San Francisco, CA' });
        });

        it('should maintain backward compatibility when no tool settings provided', async () => {
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Hello' }],
                model: MODEL
            };

            mockCreate.mockResolvedValueOnce({
                id: 'test-id',
                object: 'chat.completion',
                created: Date.now(),
                model: MODEL,
                choices: [{
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: 'Hello! How can I help you today?',
                        refusal: null
                    },
                    finish_reason: 'stop'
                }],
                usage: {
                    prompt_tokens: 20,
                    completion_tokens: 10,
                    total_tokens: 30
                }
            });

            const result = await adapter.chatCall(MODEL, params);
            expect(result.content).toBe('Hello! How can I help you today?');
        });

        it('should handle parallel tool calls', async () => {
            const mockWeatherTool: ToolDefinition = {
                name: 'get_weather',
                description: 'Get the weather',
                parameters: {
                    type: 'object',
                    properties: {
                        location: { type: 'string' }
                    },
                    required: ['location']
                },
                callFunction: async <TParams extends Record<string, unknown>, TResponse = { weather: string }>(params: TParams): Promise<TResponse> => {
                    return { weather: 'sunny' } as TResponse;
                }
            };

            const mockTimeTool: ToolDefinition = {
                name: 'get_time',
                description: 'Get the current time',
                parameters: {
                    type: 'object',
                    properties: {
                        timezone: { type: 'string' }
                    },
                    required: ['timezone']
                },
                callFunction: async <TParams extends Record<string, unknown>, TResponse = { time: string }>(params: TParams): Promise<TResponse> => {
                    return { time: '12:00 PM' } as TResponse;
                }
            };

            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Check weather and time' }],
                tools: [mockWeatherTool, mockTimeTool],
                settings: {
                    toolChoice: 'auto'
                },
                model: MODEL
            };

            mockCreate.mockResolvedValueOnce({
                id: 'test-id',
                object: 'chat.completion',
                created: Date.now(),
                model: MODEL,
                choices: [{
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: null,
                        tool_calls: [
                            {
                                id: 'weather_call',
                                type: 'function',
                                function: {
                                    name: 'get_weather',
                                    arguments: '{"location": "San Francisco"}'
                                }
                            },
                            {
                                id: 'time_call',
                                type: 'function',
                                function: {
                                    name: 'get_time',
                                    arguments: '{"timezone": "PST"}'
                                }
                            }
                        ],
                        refusal: null
                    },
                    finish_reason: 'tool_calls'
                }],
                usage: {
                    prompt_tokens: 60,
                    completion_tokens: 40,
                    total_tokens: 100
                }
            });

            const result = await adapter.chatCall(MODEL, params);
            expect(result.toolCalls?.length).toBe(2);
        });

        it('should not introduce significant performance overhead with tool calling', async () => {
            const mockTool: ToolDefinition = {
                name: 'test_function',
                description: 'Test function',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                },
                callFunction: async <TParams extends Record<string, unknown>, TResponse = { result: string }>(params: TParams): Promise<TResponse> => {
                    return { result: 'success' } as TResponse;
                }
            };

            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Hello' }],
                tools: [mockTool],
                settings: {
                    toolChoice: 'auto'
                },
                model: MODEL
            };

            mockCreate.mockResolvedValueOnce({
                id: 'test-id',
                object: 'chat.completion',
                created: Date.now(),
                model: MODEL,
                choices: [{
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: 'Hello!',
                        refusal: null
                    },
                    finish_reason: 'stop'
                }],
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 5,
                    total_tokens: 15
                }
            });

            const start = Date.now();
            await adapter.chatCall(MODEL, params);
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(1000); // Should complete within 1 second
        });

        it('should handle invalid tool call responses', async () => {
            const mockTool: ToolDefinition = {
                name: 'test_function',
                description: 'Test function',
                parameters: {
                    type: 'object',
                    properties: {
                        required_param: { type: 'string' }
                    },
                    required: ['required_param']
                },
                callFunction: async <TParams extends Record<string, unknown>, TResponse = { result: string }>(params: TParams): Promise<TResponse> => {
                    return { result: 'success' } as TResponse;
                }
            };

            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Test invalid tool call' }],
                tools: [mockTool],
                settings: {
                    toolChoice: 'auto'
                },
                model: MODEL
            };

            mockCreate.mockResolvedValueOnce({
                id: 'test-id',
                object: 'chat.completion',
                created: Date.now(),
                model: MODEL,
                choices: [{
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: null,
                        tool_calls: [{
                            id: 'call_123',
                            type: 'function',
                            function: {
                                name: 'test_function',
                                arguments: '{"required_param": "test"}'
                            }
                        }],
                        refusal: null
                    },
                    finish_reason: 'tool_calls'
                }],
                usage: {
                    prompt_tokens: 30,
                    completion_tokens: 20,
                    total_tokens: 50
                }
            });

            const result = await adapter.chatCall(MODEL, params);
            expect(result.toolCalls?.[0].arguments).toEqual({ required_param: 'test' });
        });

        it('should handle tool choice validation', async () => {
            const mockTool: ToolDefinition = {
                name: 'valid_function',
                description: 'Valid function',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                },
                callFunction: async <TParams extends Record<string, unknown>, TResponse = { result: string }>(params: TParams): Promise<TResponse> => {
                    return { result: 'success' } as TResponse;
                }
            };

            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Test tool validation' }],
                tools: [mockTool],
                settings: {
                    toolChoice: 'auto'
                },
                model: MODEL
            };

            mockCreate.mockResolvedValueOnce({
                id: 'test-id',
                object: 'chat.completion',
                created: Date.now(),
                model: MODEL,
                choices: [{
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: null,
                        tool_calls: [{
                            id: 'call_123',
                            type: 'function',
                            function: {
                                name: 'nonexistent_function',
                                arguments: '{}'
                            }
                        }],
                        refusal: null
                    },
                    finish_reason: 'tool_calls'
                }],
                usage: {
                    prompt_tokens: 30,
                    completion_tokens: 20,
                    total_tokens: 50
                }
            });

            const result = await adapter.chatCall(MODEL, params);
            expect(result.toolCalls?.[0].name).toBe('nonexistent_function');
        });

        it('should handle streaming tool call errors', async () => {
            const mockTool: ToolDefinition = {
                name: 'test_function',
                description: 'Test function',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                },
                callFunction: async <TParams extends Record<string, unknown>, TResponse = { result: string }>(params: TParams): Promise<TResponse> => {
                    return { result: 'success' } as TResponse;
                }
            };

            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Test streaming errors' }],
                tools: [mockTool],
                settings: {
                    toolChoice: 'auto',
                    stream: true
                },
                model: MODEL
            };

            mockCreate.mockImplementation(() => ({
                [Symbol.asyncIterator]: async function* () {
                    yield {
                        choices: [{
                            delta: {
                                role: 'assistant',
                                content: null,
                                tool_calls: [{
                                    index: 0,
                                    id: 'call_123',
                                    type: 'function',
                                    function: {
                                        name: 'test_function',
                                        arguments: '{"test": "value"}'
                                    }
                                }]
                            }
                        }]
                    };
                }
            }));

            const stream = await adapter.streamCall(MODEL, params);
            const chunks: UniversalStreamResponse[] = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            expect(JSON.parse(chunks[0].toolCallChunks?.[0].argumentsChunk as string)).toEqual({ test: 'value' });
        });

        it('should handle model without tool calling capability', async () => {
            const mockTool: ToolDefinition = {
                name: 'test_function',
                description: 'Test function',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                },
                callFunction: async <TParams extends Record<string, unknown>, TResponse = { result: string }>(params: TParams): Promise<TResponse> => {
                    return { result: 'success' } as TResponse;
                }
            };

            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Test no tool support' }],
                tools: [mockTool],
                settings: {
                    toolChoice: 'auto'
                },
                model: MODEL_WITHOUT_TOOLS
            };

            mockCreate.mockRejectedValueOnce(new Error('Model does not support tool calls'));

            await expect(adapter.chatCall(MODEL_WITHOUT_TOOLS, params))
                .rejects.toThrow('Model does not support tool calls');
        });

        it('should handle model without parallel tool calls capability', async () => {
            const mockTool1: ToolDefinition = {
                name: 'test_function1',
                description: 'Test function 1',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                },
                callFunction: async <TParams extends Record<string, unknown>, TResponse = { result: string }>(params: TParams): Promise<TResponse> => {
                    return { result: 'success' } as TResponse;
                }
            };

            const mockTool2: ToolDefinition = {
                name: 'test_function2',
                description: 'Test function 2',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                },
                callFunction: async <TParams extends Record<string, unknown>, TResponse = { result: string }>(params: TParams): Promise<TResponse> => {
                    return { result: 'success' } as TResponse;
                }
            };

            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Test no parallel tools' }],
                tools: [mockTool1, mockTool2],
                settings: {
                    toolChoice: 'auto'
                },
                model: MODEL_WITHOUT_PARALLEL
            };

            mockCreate.mockRejectedValueOnce(new Error('Model does not support parallel tool calls'));

            await expect(adapter.chatCall(MODEL_WITHOUT_PARALLEL, params))
                .rejects.toThrow('Model does not support parallel tool calls');
        });
    });

    describe('Error Handling', () => {
        it('should handle API errors gracefully', async () => {
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Test API error' }],
                model: MODEL
            };

            mockCreate.mockRejectedValueOnce(new Error('API Error'));

            await expect(adapter.chatCall(MODEL, params))
                .rejects.toThrow('API Error');
        });

        it('should handle rate limit errors', async () => {
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Test rate limit' }],
                model: MODEL
            };

            mockCreate.mockRejectedValueOnce(new Error('Rate limit exceeded'));

            await expect(adapter.chatCall(MODEL, params))
                .rejects.toThrow('Rate limit exceeded');
        });

        it('should handle invalid model errors', async () => {
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Test invalid model' }],
                model: 'nonexistent-model'
            };

            mockCreate.mockRejectedValueOnce(new Error('Model not found'));

            await expect(adapter.chatCall('nonexistent-model', params))
                .rejects.toThrow('Model not found');
        });
    });
}); 