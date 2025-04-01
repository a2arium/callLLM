import { Converter } from '../../../../adapters/openai/converter';
import { ToolDefinition } from '../../../../types/tooling';
import { UniversalChatParams, UniversalMessage, FinishReason } from '../../../../interfaces/UniversalInterfaces';

describe('OpenAI Response API Converter', () => {
    let converter: Converter;

    beforeEach(() => {
        converter = new Converter();
    });

    describe('convertToOpenAIResponseParams', () => {
        test('should convert basic universal params to OpenAI Response params', () => {
            const universalParams: UniversalChatParams = {
                messages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: 'Hello!' }
                ],
                model: 'gpt-4o',
                settings: {
                    maxTokens: 100,
                    temperature: 0.7,
                }
            };

            const result = converter.convertToOpenAIResponseParams('gpt-4o', universalParams);

            expect(result).toEqual(expect.objectContaining({
                input: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: 'Hello!' }
                ],
                model: 'gpt-4o',
                max_output_tokens: 100,
                temperature: 0.7,
            }));
        });

        test('should convert universal tools to OpenAI Response tools', () => {
            const toolDef: ToolDefinition = {
                name: 'test_tool',
                description: 'A test tool',
                parameters: {
                    type: 'object',
                    properties: {
                        param1: { type: 'string' }
                    },
                    required: ['param1']
                }
            };

            const universalParams: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Use the tool' }],
                tools: [toolDef],
                model: 'gpt-4o'
            };

            const result = converter.convertToOpenAIResponseParams('gpt-4o', universalParams);

            expect(result.tools).toHaveLength(1);
            expect(result.tools?.[0]).toEqual({
                type: 'function',
                name: 'test_tool',
                description: 'A test tool',
                parameters: expect.objectContaining({
                    type: 'object',
                    properties: {
                        param1: { type: 'string' }
                    },
                    required: ['param1']
                }),
                strict: true
            });
        });

        test('should handle toolChoice in settings', () => {
            const toolDef: ToolDefinition = {
                name: 'test_tool',
                description: 'A test tool',
                parameters: {
                    type: 'object',
                    properties: {
                        param1: { type: 'string' }
                    },
                    required: ['param1']
                }
            };

            const universalParams: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Use the tool' }],
                tools: [toolDef],
                model: 'gpt-4o',
                settings: {
                    toolChoice: 'auto'
                }
            };

            const result = converter.convertToOpenAIResponseParams('gpt-4o', universalParams);

            expect(result.tool_choice).toBe('auto');
        });

        test('should handle toolChoice object in settings', () => {
            const toolDef: ToolDefinition = {
                name: 'test_tool',
                description: 'A test tool',
                parameters: {
                    type: 'object',
                    properties: {
                        param1: { type: 'string' }
                    },
                    required: ['param1']
                }
            };

            const universalParams: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Use the tool' }],
                tools: [toolDef],
                model: 'gpt-4o',
                settings: {
                    toolChoice: {
                        type: 'function',
                        function: { name: 'test_tool' }
                    }
                }
            };

            const result = converter.convertToOpenAIResponseParams('gpt-4o', universalParams);

            expect(result.tool_choice).toEqual({
                type: 'function',
                function: { name: 'test_tool' }
            });
        });

        test('should properly handle multipart message content', () => {
            const universalParams: UniversalChatParams = {
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Look at this image:' },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
                                    detail: 'high'
                                }
                            }
                        ] as any
                    }
                ],
                model: 'gpt-4o-vision'
            };

            const result = converter.convertToOpenAIResponseParams('gpt-4o-vision', universalParams);

            expect(result.input).toEqual([
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Look at this image:' },
                        {
                            type: 'image_url',
                            image_url: {
                                url: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
                                detail: 'high'
                            }
                        }
                    ]
                }
            ]);
        });

        test('should ignore null or undefined parameters', () => {
            const universalParams: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Hello' }],
                model: 'gpt-4o',
                settings: {
                    maxTokens: undefined,
                    temperature: undefined
                }
            };

            const result = converter.convertToOpenAIResponseParams('gpt-4o', universalParams);

            expect(result).toEqual(expect.objectContaining({
                input: [{ role: 'user', content: 'Hello' }],
                model: 'gpt-4o'
            }));
            expect(result.max_output_tokens).toBeUndefined();
            expect(result.temperature).toBeUndefined();
        });
    });

    describe('convertFromOpenAIResponse', () => {
        test('should convert basic OpenAI Response to universal format', () => {
            const openAIResponse = {
                id: 'resp_123',
                created_at: new Date().toISOString(),
                model: 'gpt-4o',
                usage: {
                    input_tokens: 10,
                    output_tokens: 20,
                    total_tokens: 30
                },
                object: 'response',
                output_text: 'Hello, how can I help you?',
                status: 'completed'
            };

            const result = converter.convertFromOpenAIResponse(openAIResponse as any);

            expect(result).toEqual(expect.objectContaining({
                content: 'Hello, how can I help you?',
                role: 'assistant',
                metadata: expect.objectContaining({
                    model: 'gpt-4o',
                    created: expect.any(String),
                    finishReason: 'stop',
                    usage: expect.objectContaining({
                        tokens: {
                            input: 10,
                            inputCached: 0,
                            output: 20,
                            total: 30
                        }
                    })
                })
            }));
        });

        test('should handle function tool calls', () => {
            // Mock the function call structure as it appears in the actual implementation
            const functionCall = {
                type: 'function_call',
                name: 'test_tool',
                arguments: '{"param1":"value1"}',
                id: 'fc_1234567890'
            };

            const openAIResponse = {
                id: 'resp_123',
                created_at: new Date().toISOString(),
                model: 'gpt-4o',
                usage: {
                    input_tokens: 10,
                    output_tokens: 20,
                    total_tokens: 30
                },
                object: 'response',
                status: 'completed',
                output: [
                    functionCall
                ]
            };

            const result = converter.convertFromOpenAIResponse(openAIResponse as any);

            expect(result.content).toBe('');
            expect(result.toolCalls?.length).toBe(1);
            if (result.toolCalls && result.toolCalls.length > 0) {
                // Match the structure that extractDirectFunctionCalls actually creates
                expect(result.toolCalls[0]).toEqual({
                    id: 'fc_1234567890',
                    name: 'test_tool',
                    arguments: { param1: 'value1' }
                });
            }
            // In the current implementation, the finishReason is set to 'stop' for completed responses,
            // regardless of whether tool calls are present
            expect(result.metadata?.finishReason).toBe('stop');
        });

        test('should handle incomplete responses', () => {
            const openAIResponse = {
                id: 'resp_123',
                created_at: new Date().toISOString(),
                model: 'gpt-4o',
                status: 'incomplete',
                incomplete_details: {
                    reason: 'max_output_tokens'
                },
                object: 'response',
                output_text: 'This response was cut off'
            };

            const result = converter.convertFromOpenAIResponse(openAIResponse as any);

            expect(result.metadata?.finishReason).toBe('length');
            expect(result.content).toBe('This response was cut off');
        });

        test('should handle content safety issues', () => {
            const openAIResponse = {
                id: 'resp_123',
                created_at: new Date().toISOString(),
                model: 'gpt-4o',
                status: 'failed',
                error: {
                    code: 'content_filter',
                    message: 'Content was filtered due to safety concerns'
                },
                object: 'response'
            };

            const result = converter.convertFromOpenAIResponse(openAIResponse as any);

            // The converter maps 'failed' status to 'error' finish reason,
            // The refusal info is stored in metadata.refusal
            expect(result.metadata?.finishReason).toBe('error');
            expect(result.metadata?.refusal).toEqual({
                message: 'Content was filtered due to safety concerns',
                code: 'content_filter'
            });
            expect(result.content).toBe('');
        });
    });
}); 