import { StreamHandler } from '../../../../adapters/openai/stream';
import { Converter } from '../../../../adapters/openai/converter';
import { FinishReason } from '../../../../interfaces/UniversalInterfaces';
import type { OpenAIStreamResponse } from '../../../../adapters/openai/types';
import type { UniversalChatParams, ModelInfo, UniversalStreamResponse } from '../../../../interfaces/UniversalInterfaces';
import type { Stream } from 'openai/streaming';
import type { ChatCompletionChunk } from 'openai/resources/chat';

jest.mock('../../../../adapters/openai/converter');

// Helper function to create a mock OpenAI stream
function createMockStream(chunks: any[]): Stream<ChatCompletionChunk> {
    return {
        [Symbol.asyncIterator]: async function* () {
            for (const chunk of chunks) {
                yield chunk as ChatCompletionChunk;
            }
        }
    } as unknown as Stream<ChatCompletionChunk>;
}

describe('StreamHandler', () => {
    let handler: StreamHandler;
    let mockConverter: jest.Mocked<Converter>;
    let mockParams: UniversalChatParams;
    let mockModelInfo: ModelInfo;

    beforeEach(() => {
        mockParams = {
            messages: [{ role: 'user', content: 'test' }]
        };

        mockModelInfo = {
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

        mockConverter = {
            convertStreamResponse: jest.fn(),
            getCurrentParams: jest.fn(),
            setModel: jest.fn(),
            setParams: jest.fn()
        } as unknown as jest.Mocked<Converter>;
        (Converter as jest.Mock).mockImplementation(() => mockConverter);

        handler = new StreamHandler();
    });

    describe('convertProviderStream', () => {
        it('should handle stream correctly with params', async () => {
            const mockStream = {
                [Symbol.asyncIterator]: async function* () {
                    yield {
                        id: 'test-id',
                        choices: [{
                            delta: { content: 'test', role: 'assistant' },
                            finish_reason: 'stop',
                            index: 0
                        }]
                    } as ChatCompletionChunk;
                }
            } as unknown as Stream<ChatCompletionChunk>;

            const result = handler.convertProviderStream(mockStream);
            const chunks: UniversalStreamResponse[] = [];
            for await (const chunk of result) {
                chunks.push(chunk);
            }

            expect(chunks).toEqual([{
                content: 'test',
                role: 'assistant',
                isComplete: true,
                metadata: {
                    finishReason: FinishReason.STOP,
                    provider: 'openai'
                }
            }]);
        });

        it('should handle empty stream', async () => {
            const mockStream = {
                [Symbol.asyncIterator]: async function* () {
                    // Empty stream
                }
            } as unknown as Stream<ChatCompletionChunk>;

            const result = handler.convertProviderStream(mockStream);
            const chunks: UniversalStreamResponse[] = [];
            for await (const chunk of result) {
                chunks.push(chunk);
            }

            expect(chunks).toEqual([]);
        });

        it('should handle stream errors', async () => {
            const mockStream = {
                [Symbol.asyncIterator]: async function* () {
                    throw new Error('Stream error');
                }
            } as unknown as Stream<ChatCompletionChunk>;

            await expect(async () => {
                const result = handler.convertProviderStream(mockStream);
                for await (const _ of result) {
                    // Consume stream
                }
            }).rejects.toThrow('Stream error');
        });

        it('should handle multiple chunks', async () => {
            const mockStream = {
                [Symbol.asyncIterator]: async function* () {
                    yield {
                        id: 'test-id-1',
                        choices: [{
                            delta: { content: 'Hello', role: 'assistant' },
                            finish_reason: null,
                            index: 0
                        }]
                    } as ChatCompletionChunk;
                    yield {
                        id: 'test-id-2',
                        choices: [{
                            delta: { content: ' World', role: 'assistant' },
                            finish_reason: 'stop',
                            index: 0
                        }]
                    } as ChatCompletionChunk;
                }
            } as unknown as Stream<ChatCompletionChunk>;

            const result = handler.convertProviderStream(mockStream);
            const chunks: UniversalStreamResponse[] = [];
            for await (const chunk of result) {
                chunks.push(chunk);
            }

            expect(chunks).toEqual([
                {
                    content: 'Hello',
                    role: 'assistant',
                    isComplete: false,
                    metadata: {
                        finishReason: FinishReason.NULL,
                        provider: 'openai'
                    }
                },
                {
                    content: ' World',
                    role: 'assistant',
                    isComplete: true,
                    metadata: {
                        finishReason: FinishReason.STOP,
                        provider: 'openai'
                    }
                }
            ]);
        });

        it('should handle stream with function/tool call chunks', async () => {
            // Create a mock stream that includes tool calls
            const mockStream = createMockStream([
                {
                    choices: [
                        {
                            delta: {
                                content: 'Response with tool call',
                                tool_calls: [
                                    {
                                        id: 'tool_1',
                                        index: 0,
                                        function: {
                                            name: 'get_weather',
                                            arguments: '{"location":'
                                        }
                                    }
                                ]
                            },
                            finish_reason: null
                        }
                    ]
                },
                {
                    choices: [
                        {
                            delta: {
                                content: '',
                                tool_calls: [
                                    {
                                        id: 'tool_1',
                                        index: 0,
                                        function: {
                                            arguments: '"New York"}'
                                        }
                                    }
                                ]
                            },
                            finish_reason: 'tool_calls'
                        }
                    ]
                }
            ]);

            const streamHandler = new StreamHandler();
            const result = streamHandler.convertProviderStream(mockStream as any);

            const chunks = [];
            for await (const chunk of result) {
                chunks.push(chunk);
            }

            expect(chunks.length).toBe(2);
            expect(chunks[0].toolCallChunks).toBeDefined();
            expect(chunks[0].toolCallChunks![0].id).toBe('tool_1');
            expect(chunks[0].toolCallChunks![0].name).toBe('get_weather');
            expect(chunks[0].toolCallChunks![0].argumentsChunk).toBe('{"location":');
            expect(chunks[1].isComplete).toBe(true);
            expect(chunks[1].metadata?.finishReason).toBe('tool_calls');
        });

        it('should handle undefined tool calls', async () => {
            // Create a mock stream without tool calls
            const mockStream = createMockStream([
                {
                    choices: [
                        {
                            delta: {
                                content: 'Response without tool calls',
                                // No tool_calls field
                            },
                            finish_reason: null
                        }
                    ]
                }
            ]);

            const streamHandler = new StreamHandler();
            const result = streamHandler.convertProviderStream(mockStream as any);

            const chunks = [];
            for await (const chunk of result) {
                chunks.push(chunk);
            }

            expect(chunks.length).toBe(1);
            expect(chunks[0].toolCallChunks).toBeUndefined();
        });

        it('should handle all finish reason types', async () => {
            // Test all possible finish reasons
            const finishReasons = [
                'stop',
                'length',
                'content_filter',
                'tool_calls',
                'function_call',
                'unknown_reason' // For default case
            ];

            for (const reason of finishReasons) {
                const mockStream = createMockStream([
                    {
                        choices: [
                            {
                                delta: {
                                    content: `Response with finish reason: ${reason}`
                                },
                                finish_reason: reason
                            }
                        ]
                    }
                ]);

                const streamHandler = new StreamHandler();
                const result = streamHandler.convertProviderStream(mockStream as any);

                const chunks = [];
                for await (const chunk of result) {
                    chunks.push(chunk);
                }

                expect(chunks.length).toBe(1);

                // Verify the finish reason mapping
                switch (reason) {
                    case 'stop':
                        expect(chunks[0].metadata?.finishReason).toBe('stop');
                        break;
                    case 'length':
                        expect(chunks[0].metadata?.finishReason).toBe('length');
                        break;
                    case 'content_filter':
                        expect(chunks[0].metadata?.finishReason).toBe('content_filter');
                        break;
                    case 'tool_calls':
                    case 'function_call':
                        expect(chunks[0].metadata?.finishReason).toBe('tool_calls');
                        break;
                    default:
                        expect(chunks[0].metadata?.finishReason).toBe('null');
                        break;
                }
            }
        });

        it('should handle stream with empty delta', async () => {
            // Create a mock stream with an empty delta
            const mockStream = createMockStream([
                {
                    choices: [
                        {
                            delta: {}, // Empty delta
                            finish_reason: null
                        }
                    ]
                }
            ]);

            const streamHandler = new StreamHandler();
            const result = streamHandler.convertProviderStream(mockStream as any);

            const chunks = [];
            for await (const chunk of result) {
                chunks.push(chunk);
            }

            expect(chunks.length).toBe(1);
            expect(chunks[0].content).toBe('');
        });

        it('should handle null finish reason', async () => {
            // Create a mock stream with a null finish reason
            const mockStream = createMockStream([
                {
                    choices: [
                        {
                            delta: {
                                content: 'Response with null finish reason'
                            },
                            finish_reason: null
                        }
                    ]
                }
            ]);

            const streamHandler = new StreamHandler();
            const result = streamHandler.convertProviderStream(mockStream as any);

            const chunks = [];
            for await (const chunk of result) {
                chunks.push(chunk);
            }

            expect(chunks.length).toBe(1);
            expect(chunks[0].metadata?.finishReason).toBe('null');
        });

        // New tests for additional coverage

        it('should handle chunks with empty choices array', async () => {
            // Testing lines 50-51 where choices[0] is accessed
            const mockStream = createMockStream([
                {
                    id: 'test-id',
                    choices: [] // Empty choices array
                }
            ]);

            const streamHandler = new StreamHandler();
            const result = streamHandler.convertProviderStream(mockStream as any);

            const chunks = [];
            for await (const chunk of result) {
                chunks.push(chunk);
            }

            // Should skip the chunk and return empty array
            expect(chunks).toEqual([]);
        });

        it('should handle delta without content property', async () => {
            // Create a mock stream with delta missing content property
            const mockStream = createMockStream([
                {
                    choices: [
                        {
                            delta: {
                                // No content property
                            },
                            finish_reason: null
                        }
                    ]
                }
            ]);

            const streamHandler = new StreamHandler();
            const result = streamHandler.convertProviderStream(mockStream as any);

            const chunks = [];
            for await (const chunk of result) {
                chunks.push(chunk);
            }

            expect(chunks.length).toBe(1);
            expect(chunks[0].content).toBe('');
        });

        it('should handle tool_calls that are empty arrays', async () => {
            // Testing lines 76-78
            const mockStream = createMockStream([
                {
                    choices: [
                        {
                            delta: {
                                content: 'test content',
                                tool_calls: [] // Empty array
                            },
                            finish_reason: null
                        }
                    ]
                }
            ]);

            const streamHandler = new StreamHandler();
            const result = streamHandler.convertProviderStream(mockStream as any);

            const chunks = [];
            for await (const chunk of result) {
                chunks.push(chunk);
            }

            expect(chunks.length).toBe(1);
            expect(chunks[0].toolCallChunks).toBeUndefined();
        });

        it('should handle tool calls without function property', async () => {
            // Testing the tool call mapping function for missing function property
            const mockStream = createMockStream([
                {
                    choices: [
                        {
                            delta: {
                                content: 'test content',
                                tool_calls: [
                                    {
                                        id: 'tool_1',
                                        index: 0
                                        // No function property
                                    }
                                ]
                            },
                            finish_reason: null
                        }
                    ]
                }
            ]);

            const streamHandler = new StreamHandler();
            const result = streamHandler.convertProviderStream(mockStream as any);

            const chunks = [];
            for await (const chunk of result) {
                chunks.push(chunk);
            }

            expect(chunks.length).toBe(1);
            expect(chunks[0].toolCallChunks).toBeDefined();
            expect(chunks[0].toolCallChunks![0].name).toBeUndefined();
            expect(chunks[0].toolCallChunks![0].argumentsChunk).toBeUndefined();
        });

        it('should handle empty string finish reason', async () => {
            // Testing mapFinishReason for empty string
            const mockStream = createMockStream([
                {
                    choices: [
                        {
                            delta: {
                                content: 'test content'
                            },
                            finish_reason: '' // Empty string
                        }
                    ]
                }
            ]);

            const streamHandler = new StreamHandler();
            const result = streamHandler.convertProviderStream(mockStream as any);

            const chunks = [];
            for await (const chunk of result) {
                chunks.push(chunk);
            }

            expect(chunks.length).toBe(1);
            expect(chunks[0].metadata?.finishReason).toBe(FinishReason.NULL);
        });
    });
});