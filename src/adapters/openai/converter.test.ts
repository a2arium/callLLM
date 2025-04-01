import { z } from 'zod';
import { Converter } from './converter';
import { UniversalChatParams, FinishReason } from '../../interfaces/UniversalInterfaces';
import { OpenAIResponseValidationError } from './errors';
import { ToolDefinition } from '../../types/tooling';
import { Response, ResponseOutputItem, ResponseOutputMessage, ResponseUsage, ResponseFunctionToolCall } from './types';

describe('Converter', () => {
    let converter: Converter;

    beforeEach(() => {
        converter = new Converter();
    });

    describe('convertToOpenAIResponseParams', () => {
        const modelName = 'gpt-4-turbo';

        it('should convert basic chat parameters', () => {
            const params: UniversalChatParams = {
                model: modelName,
                messages: [
                    { role: 'user', content: 'Hello' },
                    { role: 'assistant', content: 'Hi there!' }
                ]
            };

            const result = converter.convertToOpenAIResponseParams(modelName, params);

            expect(result).toEqual({
                model: modelName,
                input: [
                    { role: 'user', content: 'Hello' },
                    { role: 'assistant', content: 'Hi there!' }
                ]
            });
        });

        it('should handle system message', () => {
            const params: UniversalChatParams = {
                model: modelName,
                messages: [{ role: 'user', content: 'Hello' }],
                systemMessage: 'You are a helpful assistant'
            };

            const result = converter.convertToOpenAIResponseParams(modelName, params);

            expect(result).toEqual({
                model: modelName,
                input: [{ role: 'user', content: 'Hello' }],
                instructions: 'You are a helpful assistant'
            });
        });

        it('should convert tool definitions correctly', () => {
            const toolDef: ToolDefinition = {
                name: 'search',
                description: 'Search for information',
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string' }
                    },
                    required: ['query']
                }
            };

            const params: UniversalChatParams = {
                model: modelName,
                messages: [{ role: 'user', content: 'Search for cats' }],
                tools: [toolDef]
            };

            const result = converter.convertToOpenAIResponseParams(modelName, params);

            expect(result.tools).toHaveLength(1);
            expect(result.tools![0]).toEqual({
                type: 'function',
                name: 'search',
                description: 'Search for information',
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string' }
                    },
                    required: ['query'],
                    additionalProperties: false
                },
                strict: true
            });
        });

        it('should throw error for invalid tool definition', () => {
            const invalidTool = { description: 'Invalid tool' } as ToolDefinition;
            const params: UniversalChatParams = {
                model: modelName,
                messages: [{ role: 'user', content: 'Test' }],
                tools: [invalidTool]
            };

            expect(() => converter.convertToOpenAIResponseParams(modelName, params))
                .toThrow(OpenAIResponseValidationError);
        });

        it('should handle JSON schema configuration', () => {
            const schema = z.object({
                name: z.string(),
                age: z.number()
            });

            const params: UniversalChatParams = {
                model: modelName,
                messages: [{ role: 'user', content: 'Get user info' }],
                jsonSchema: {
                    name: 'UserInfo',
                    schema
                }
            };

            const result = converter.convertToOpenAIResponseParams(modelName, params);

            expect(result.text).toBeDefined();
            expect(result.text?.format).toEqual({
                type: 'json_schema',
                strict: true,
                name: 'UserInfo',
                schema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        age: { type: 'number' }
                    },
                    required: ['name', 'age'],
                    additionalProperties: false
                }
            });
        });

        it('should handle optional settings', () => {
            const params: UniversalChatParams = {
                model: modelName,
                messages: [{ role: 'user', content: 'Test' }],
                settings: {
                    temperature: 0.7,
                    topP: 0.9,
                    maxTokens: 100,
                    toolChoice: 'auto',
                    user: 'test-user',
                    providerOptions: {
                        metadata: { tag: 'test' }
                    }
                }
            };

            const result = converter.convertToOpenAIResponseParams(modelName, params);

            expect(result).toMatchObject({
                temperature: 0.7,
                top_p: 0.9,
                max_output_tokens: 100,
                tool_choice: 'auto',
                user: 'test-user',
                metadata: { tag: 'test' }
            });
        });
    });

    describe('convertFromOpenAIResponse', () => {
        const baseResponse = {
            object: 'response',
            model: 'gpt-4-turbo',
            temperature: 0.7,
            top_p: 0.9,
            tools: [],
            metadata: null,
            parallel_tool_calls: false,
            tool_choice: 'none',
            output: [],
            output_text: '',
            instructions: '',
            error: null,
            incomplete_details: null
        };

        it('should convert successful response', () => {
            const outputMessage: ResponseOutputMessage = {
                type: 'message',
                id: 'msg_123',
                role: 'assistant',
                status: 'completed',
                content: [{
                    type: 'output_text',
                    text: 'Hello, how can I help?',
                    annotations: []
                }]
            };

            const usage: ResponseUsage = {
                input_tokens: 10,
                output_tokens: 20,
                total_tokens: 30,
                input_tokens_details: { cached_tokens: 0 },
                output_tokens_details: { reasoning_tokens: 0 }
            };

            const response = {
                ...baseResponse,
                id: 'resp_123',
                created_at: 1234567890,
                status: 'completed',
                output: [outputMessage],
                usage,
                output_text: 'Hello, how can I help?'
            } as Response;

            const result = converter.convertFromOpenAIResponse(response);

            expect(result).toEqual({
                content: 'Hello, how can I help?',
                role: 'assistant',
                metadata: {
                    model: 'gpt-4-turbo',
                    created: 1234567890,
                    finishReason: FinishReason.STOP,
                    usage: {
                        tokens: {
                            input: 10,
                            inputCached: 0,
                            output: 20,
                            total: 30
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

        it('should handle function calls in response', () => {
            const functionCall: ResponseFunctionToolCall = {
                type: 'function_call',
                call_id: 'fc_123',
                id: 'fc_123',
                name: 'search',
                arguments: JSON.stringify({ query: 'cats' })
            };

            const response = {
                ...baseResponse,
                id: 'resp_123',
                created_at: Date.now(),
                status: 'completed',
                output: [functionCall],
                output_text: ''
            } as Response;

            const result = converter.convertFromOpenAIResponse(response);

            expect(result.toolCalls).toHaveLength(1);
            expect(result.toolCalls![0]).toEqual({
                id: 'fc_123',
                name: 'search',
                arguments: { query: 'cats' }
            });
        });

        it('should handle incomplete response due to length', () => {
            const response = {
                ...baseResponse,
                id: 'resp_123',
                created_at: Date.now(),
                status: 'incomplete',
                incomplete_details: {
                    reason: 'max_output_tokens'
                },
                output: [],
                output_text: ''
            } as Response;

            const result = converter.convertFromOpenAIResponse(response);

            expect(result.metadata?.finishReason).toBe(FinishReason.LENGTH);
        });

        it('should handle failed response', () => {
            const response = {
                ...baseResponse,
                id: 'resp_123',
                created_at: Date.now(),
                status: 'failed',
                error: {
                    message: 'Content policy violation',
                    code: 'invalid_prompt'
                },
                output: [],
                output_text: ''
            } as Response;

            const result = converter.convertFromOpenAIResponse(response);

            expect(result.metadata?.finishReason).toBe(FinishReason.ERROR);
            expect(result.metadata?.refusal).toEqual({
                message: 'Content policy violation',
                code: 'invalid_prompt'
            });
        });

        it('should handle malformed function call arguments', () => {
            const functionCall: ResponseFunctionToolCall = {
                type: 'function_call',
                call_id: 'fc_123',
                id: 'fc_123',
                name: 'search',
                arguments: '{invalid json}'
            };

            const response = {
                ...baseResponse,
                id: 'resp_123',
                created_at: Date.now(),
                status: 'completed',
                output: [functionCall],
                output_text: ''
            } as Response;

            const result = converter.convertFromOpenAIResponse(response);

            expect(result.toolCalls![0]).toEqual({
                id: 'fc_123',
                name: 'search',
                arguments: { rawArguments: '{invalid json}' }
            });
        });
    });
}); 