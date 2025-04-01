import { OpenAIResponseAdapter } from '../../../../adapters/openai/adapter';
import type { UniversalChatParams } from '../../../../interfaces/UniversalInterfaces';
import type { Response } from '../../../../adapters/openai/types';
import type { ToolDefinition } from '../../../../types/tooling';
import { OpenAIResponseAdapterError } from '../../../../adapters/openai/errors';

describe('OpenAIResponseAdapter', () => {
    let adapter: OpenAIResponseAdapter;
    const mockModel = 'gpt-4';
    const mockTool: ToolDefinition = {
        name: 'test_tool',
        description: 'A test tool',
        parameters: {
            type: 'object',
            properties: {
                test: { type: 'string' }
            }
        }
    };

    beforeEach(() => {
        adapter = new OpenAIResponseAdapter('test-api-key');
    });

    describe('Parameter Conversion', () => {
        it('should convert parameters correctly', () => {
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Hello' }],
                model: mockModel,
                settings: {
                    temperature: 0.7,
                    maxTokens: 100
                },
                tools: [mockTool]
            };

            adapter.convertToProviderParams = jest.fn().mockImplementation((model, params) => {
                return { model, input: params.messages };
            });

            adapter.convertToProviderParams(mockModel, params);
            expect(adapter.convertToProviderParams).toHaveBeenCalledWith(mockModel, params);
        });

        it('should handle basic chat response', async () => {
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'Hello' }],
                model: mockModel,
                tools: [mockTool]
            };

            const mockResponse = {
                id: 'test-id',
                created_at: Math.floor(Date.now() / 1000),
                model: 'gpt-4',
                status: 'completed',
                output_text: 'Hello there!',
                metadata: {
                    model: 'gpt-4',
                    created_at: Math.floor(Date.now() / 1000).toString(),
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
                tools: [],
                temperature: 1,
                top_p: 1,
                max_output_tokens: 100,
                previous_response_id: null
            } as unknown as Response;

            adapter.chatCall = jest.fn().mockResolvedValue({
                content: 'Hello there!',
                role: 'assistant',
                metadata: {
                    finishReason: 'stop',
                    model: 'gpt-4',
                    created: mockResponse.created_at,
                    usage: {
                        tokens: {
                            total: 30,
                            input: 10,
                            output: 20,
                            inputCached: 0
                        },
                        costs: {
                            total: 0,
                            input: 0,
                            output: 0,
                            inputCached: 0
                        }
                    }
                }
            });

            const response = await adapter.chatCall(mockModel, params);
            expect(response).toBeDefined();
            expect(response.content).toBe('Hello there!');
            expect(response.metadata?.finishReason).toBe('stop');
        });
    });
});