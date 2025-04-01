import { z } from 'zod';
import { Converter } from '../../../../adapters/openai/converter';
import { UniversalChatParams, UniversalChatResponse, FinishReason, Usage } from '../../../../interfaces/UniversalInterfaces';
import { SchemaValidator } from '../../../../core/schema/SchemaValidator';
import {
    Response,
    FunctionTool,
    ResponseOutputItem,
    ResponseOutputMessage,
    ResponseFunctionToolCall,
    ResponseTextConfig
} from '../../../../adapters/openai/types';
import type { ToolDefinition } from '../../../../types/tooling';
import { OpenAI } from 'openai';

// Mock SchemaValidator
jest.mock('../../../../core/schema/SchemaValidator', () => ({
    SchemaValidator: {
        getSchemaObject: jest.fn((schema) => {
            if (typeof schema === 'string') {
                try {
                    return JSON.parse(schema);
                } catch {
                    return {};
                }
            }
            return {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    age: { type: 'number' }
                },
                required: ['name', 'age'],
                additionalProperties: false
            };
        })
    }
}));

describe('Converter', () => {
    let converter: Converter;
    let mockTool: ToolDefinition;

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
    });

    describe('convertToOpenAIResponseParams', () => {
        it('should convert basic params correctly', () => {
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Hello' }],
                model: 'gpt-4',
                settings: {
                    temperature: 0.7,
                    maxTokens: 100
                },
                tools: [mockTool]
            };

            const result = converter.convertToOpenAIResponseParams('gpt-4', params);

            expect(result).toEqual({
                model: 'gpt-4',
                input: [{ role: 'user', content: 'Hello' }],
                temperature: 0.7,
                max_output_tokens: 100,
                tools: [{
                    type: 'function',
                    name: 'test_tool',
                    description: 'A test tool',
                    parameters: {
                        type: 'object',
                        properties: {
                            test: { type: 'string' }
                        },
                        additionalProperties: false
                    },
                    strict: true
                }]
            });
        });

        it('should handle JSON response format', () => {
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Hello' }],
                model: 'gpt-4',
                responseFormat: 'json'
            };

            const result = converter.convertToOpenAIResponseParams('gpt-4', params);
            expect(result.text?.format).toEqual({
                type: 'json_object'
            });
        });

        it('should handle JSON schema', () => {
            const schema = z.object({
                name: z.string(),
                age: z.number()
            });

            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Hello' }],
                model: 'gpt-4',
                jsonSchema: {
                    name: 'Person',
                    schema
                }
            };

            const result = converter.convertToOpenAIResponseParams('gpt-4', params);
            expect(result.text?.format).toEqual({
                type: 'json_schema',
                name: 'Person',
                schema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        age: { type: 'number' }
                    },
                    required: ['name', 'age'],
                    additionalProperties: false
                },
                strict: true
            });
        });
    });

    describe('convertFromOpenAIResponse', () => {
        it('should convert successful response correctly', () => {
            const timestamp = Math.floor(Date.now() / 1000);
            const response: Response = {
                id: 'test-id',
                created_at: timestamp,
                model: 'gpt-4',
                status: 'completed',
                output_text: 'Hello there!',
                metadata: {
                    model: 'gpt-4',
                    created_at: timestamp.toString(),
                    finish_reason: 'stop'
                },
                output: [{
                    type: 'message',
                    role: 'assistant',
                    id: 'msg_1',
                    status: 'completed',
                    content: [{
                        type: 'output_text',
                        text: 'Hello there!',
                        annotations: []
                    }]
                }],
                usage: {
                    total_tokens: 30,
                    input_tokens: 10,
                    output_tokens: 20,
                    input_tokens_details: {
                        cached_tokens: 0
                    },
                    output_tokens_details: {
                        reasoning_tokens: 0
                    }
                },
                object: 'response',
                error: null,
                incomplete_details: null,
                instructions: '',
                parallel_tool_calls: false,
                tool_choice: 'none',
                tools: [],
                temperature: 1,
                top_p: 1,
                max_output_tokens: 100,
                previous_response_id: null
            };

            const result = converter.convertFromOpenAIResponse(response);
            expect(result.content).toBe('Hello there!');
            expect(result.role).toBe('assistant');
            expect(result.metadata?.model).toBe('gpt-4');
            expect(result.metadata?.created).toBe(timestamp);
            expect(result.metadata?.usage?.tokens?.total).toBe(30);
            expect(result.metadata?.usage?.tokens?.input).toBe(10);
            expect(result.metadata?.usage?.tokens?.output).toBe(20);
            expect(result.metadata?.finishReason).toBe(FinishReason.STOP);
        });

        it('should handle error response correctly', () => {
            const timestamp = Math.floor(Date.now() / 1000);
            const response: Response = {
                id: 'test-id',
                created_at: timestamp,
                model: 'gpt-4',
                status: 'failed',
                output_text: '',
                metadata: {
                    model: 'gpt-4',
                    created_at: timestamp.toString(),
                    finish_reason: 'error'
                },
                error: {
                    code: 'server_error',
                    message: 'Test error message'
                },
                output: [],
                usage: {
                    total_tokens: 0,
                    input_tokens: 0,
                    output_tokens: 0,
                    input_tokens_details: {
                        cached_tokens: 0
                    },
                    output_tokens_details: {
                        reasoning_tokens: 0
                    }
                },
                object: 'response',
                incomplete_details: null,
                instructions: '',
                parallel_tool_calls: false,
                tool_choice: 'none',
                tools: [],
                temperature: 1,
                top_p: 1,
                max_output_tokens: 100,
                previous_response_id: null
            };

            const result = converter.convertFromOpenAIResponse(response);
            expect(result).toEqual({
                content: '',
                role: 'assistant',
                metadata: {
                    finishReason: 'error',
                    model: 'gpt-4',
                    created: timestamp,
                    refusal: {
                        code: 'server_error',
                        message: 'Test error message'
                    },
                    usage: {
                        tokens: {
                            input: 0,
                            inputCached: 0,
                            output: 0,
                            total: 0
                        },
                        costs: {
                            input: 0,
                            inputCached: 0,
                            output: 0,
                            total: 0
                        }
                    }
                }
            });
        });

        it('should handle tool calls correctly', () => {
            const timestamp = Math.floor(Date.now() / 1000);
            const response: Response = {
                id: 'test-id',
                created_at: timestamp,
                model: 'gpt-4',
                status: 'completed',
                output_text: '',
                metadata: {
                    model: 'gpt-4',
                    created_at: timestamp.toString(),
                    finish_reason: 'stop'
                },
                output: [{
                    type: 'message',
                    role: 'assistant',
                    id: 'msg_1',
                    status: 'completed',
                    content: [{
                        type: 'output_text',
                        text: '',
                        annotations: []
                    }]
                }, {
                    type: 'function_call',
                    call_id: 'call_1',
                    name: 'test_tool',
                    arguments: '{"test": "value"}'
                }],
                usage: {
                    total_tokens: 0,
                    input_tokens: 0,
                    output_tokens: 0,
                    input_tokens_details: {
                        cached_tokens: 0
                    },
                    output_tokens_details: {
                        reasoning_tokens: 0
                    }
                },
                object: 'response',
                error: null,
                incomplete_details: null,
                instructions: '',
                parallel_tool_calls: false,
                tool_choice: 'none',
                tools: [],
                temperature: 1,
                top_p: 1,
                max_output_tokens: 100,
                previous_response_id: null
            };

            const result = converter.convertFromOpenAIResponse(response);
            expect(result).toEqual({
                content: '',
                role: 'assistant',
                metadata: {
                    finishReason: 'stop',
                    model: 'gpt-4',
                    created: timestamp,
                    usage: {
                        tokens: {
                            input: 0,
                            inputCached: 0,
                            output: 0,
                            total: 0
                        },
                        costs: {
                            input: 0,
                            inputCached: 0,
                            output: 0,
                            total: 0
                        }
                    }
                },
                toolCalls: [{
                    id: 'call_1',
                    name: 'test_tool',
                    arguments: { test: 'value' }
                }]
            });
        });
    });
});
