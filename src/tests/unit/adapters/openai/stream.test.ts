import { StreamHandler } from '../../../../adapters/openai/stream';
import { ResponseStreamEvent, type Response } from '../../../../adapters/openai/types';
import { FinishReason } from '../../../../interfaces/UniversalInterfaces';
import type { Stream } from 'openai/streaming';
import type { ToolDefinition } from '../../../../types/tooling';
import { OpenAI } from 'openai';

describe('StreamHandler', () => {
    let handler: StreamHandler;
    let mockTools: ToolDefinition[];

    beforeEach(() => {
        mockTools = [{
            name: 'test_tool',
            description: 'A test tool',
            parameters: {
                type: 'object',
                properties: {
                    test: { type: 'string' }
                }
            }
        }];

        handler = new StreamHandler(mockTools);
    });

    describe('handleStream', () => {
        it('should handle basic text stream', async () => {
            const mockStreamResponse: ResponseStreamEvent[] = [
                {
                    type: 'response.output_text.delta',
                    delta: 'test stream',
                    content_index: 0,
                    item_id: 'msg_1',
                    output_index: 0
                },
                {
                    type: 'response.completed',
                    response: {
                        id: '123',
                        created_at: 123456789,
                        model: 'gpt-4',
                        status: 'completed',
                        output_text: 'test stream',
                        output: [],
                        metadata: {},
                        usage: {
                            total_tokens: 0,
                            input_tokens: 0,
                            output_tokens: 0,
                            input_tokens_details: {},
                            output_tokens_details: {}
                        } as OpenAI.Responses.ResponseUsage,
                        object: 'response',
                        instructions: '',
                        incomplete_details: null,
                        parallel_tool_calls: false,
                        tool_choice: 'none',
                        tools: [],
                        error: null,
                        temperature: 1,
                        top_p: 1
                    }
                }
            ];

            const stream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of mockStreamResponse) {
                        yield chunk;
                    }
                }
            } as unknown as Stream<ResponseStreamEvent>;

            const result = handler.handleStream(stream);

            let content = '';
            let isComplete = false;
            for await (const chunk of result) {
                if (chunk.content) {
                    content += chunk.content;
                }
                if (chunk.isComplete) {
                    isComplete = true;
                }
            }

            expect(content).toBe('test stream');
            expect(isComplete).toBe(true);
        });

        it('should handle tool calls', async () => {
            const mockStreamResponse: ResponseStreamEvent[] = [
                {
                    type: 'response.output_item.added',
                    output_index: 0,
                    item: {
                        type: 'function_call',
                        id: 'call_123',
                        name: 'test_tool',
                        arguments: '',
                        call_id: 'call_123',
                        status: 'incomplete'
                    }
                },
                {
                    type: 'response.function_call_arguments.delta',
                    item_id: 'call_123',
                    delta: '{"test":',
                    output_index: 0
                },
                {
                    type: 'response.function_call_arguments.delta',
                    item_id: 'call_123',
                    delta: '"value"}',
                    output_index: 0
                },
                {
                    type: 'response.completed',
                    response: {
                        id: '123',
                        created_at: 123456789,
                        model: 'gpt-4',
                        status: 'completed',
                        output_text: '',
                        output: [{
                            type: 'function_call',
                            id: 'call_123',
                            name: 'test_tool',
                            arguments: '{"test":"value"}',
                            call_id: 'call_123',
                            status: 'incomplete'
                        }],
                        metadata: {},
                        usage: {
                            total_tokens: 0,
                            input_tokens: 0,
                            output_tokens: 0,
                            input_tokens_details: {},
                            output_tokens_details: {}
                        } as OpenAI.Responses.ResponseUsage,
                        object: 'response',
                        instructions: '',
                        incomplete_details: null,
                        parallel_tool_calls: false,
                        tool_choice: 'none',
                        tools: [],
                        error: null,
                        temperature: 1,
                        top_p: 1
                    }
                }
            ];

            const stream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of mockStreamResponse) {
                        yield chunk;
                    }
                }
            } as unknown as Stream<ResponseStreamEvent>;

            const result = handler.handleStream(stream);

            let toolCallName: string | undefined;
            let toolCallArgs = '';
            let isComplete = false;

            for await (const chunk of result) {
                if (chunk.toolCallChunks?.[0]) {
                    const toolChunk = chunk.toolCallChunks[0];
                    if (toolChunk.name) {
                        toolCallName = toolChunk.name;
                    }
                    if (toolChunk.argumentsChunk) {
                        toolCallArgs += toolChunk.argumentsChunk;
                    }
                }
                if (chunk.isComplete) {
                    isComplete = true;
                }
            }

            expect(toolCallName).toBe('test_tool');
            expect(toolCallArgs).toBe('{"test":"value"}');
            expect(isComplete).toBe(true);
        });

        it('should handle stream failures', async () => {
            const mockStreamResponse: ResponseStreamEvent[] = [
                {
                    type: 'response.failed',
                    error: {
                        message: 'Test error',
                        code: 'server_error'
                    },
                    response: {
                        id: '123',
                        created_at: 123456789,
                        model: 'gpt-4',
                        status: 'failed',
                        output_text: '',
                        output: [],
                        error: {
                            message: 'Test error',
                            code: 'server_error'
                        },
                        metadata: {},
                        usage: {
                            total_tokens: 0,
                            input_tokens: 0,
                            output_tokens: 0,
                            input_tokens_details: {},
                            output_tokens_details: {}
                        } as OpenAI.Responses.ResponseUsage,
                        object: 'response',
                        instructions: '',
                        incomplete_details: null,
                        parallel_tool_calls: false,
                        tool_choice: 'none',
                        tools: [],
                        temperature: 1,
                        top_p: 1
                    } as Response
                } as ResponseStreamEvent
            ];

            const stream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of mockStreamResponse) {
                        yield chunk;
                    }
                }
            } as unknown as Stream<ResponseStreamEvent>;

            const result = handler.handleStream(stream);

            let error: string | undefined;
            let finishReason: FinishReason | undefined;

            for await (const chunk of result) {
                if (chunk.metadata?.toolError) {
                    error = chunk.metadata.toolError;
                }
                if (chunk.metadata?.finishReason) {
                    finishReason = chunk.metadata.finishReason;
                }
            }

            expect(error).toBe('Test error');
            expect(finishReason).toBe(FinishReason.ERROR);
        });

        it('should handle updateTools', () => {
            const newTools: ToolDefinition[] = [{
                name: 'new_tool',
                description: 'A new test tool',
                parameters: {
                    type: 'object',
                    properties: {
                        test: { type: 'string' }
                    }
                }
            }];

            handler.updateTools(newTools);
            // Since tools is private, we can only test that the update doesn't throw
            expect(true).toBe(true);
        });
    });
});