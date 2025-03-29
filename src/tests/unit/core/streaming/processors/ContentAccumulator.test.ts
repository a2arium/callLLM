import { ContentAccumulator } from '../../../../../core/streaming/processors/ContentAccumulator';
import { StreamChunk, ToolCallChunk } from '../../../../../core/streaming/types';
import { FinishReason, UniversalStreamResponse } from '../../../../../interfaces/UniversalInterfaces';
import { ToolCall } from '../../../../../types/tooling';

describe('ContentAccumulator', () => {
    let contentAccumulator: ContentAccumulator;

    beforeEach(() => {
        contentAccumulator = new ContentAccumulator();
    });

    describe('constructor', () => {
        it('should initialize correctly', () => {
            expect(contentAccumulator).toBeDefined();
            expect(contentAccumulator.getAccumulatedContent()).toBe('');
            expect(contentAccumulator.getCompletedToolCalls()).toEqual([]);
        });
    });

    describe('processStream', () => {
        it('should accumulate content from chunks', async () => {
            const chunks: (StreamChunk & Partial<UniversalStreamResponse>)[] = [
                { content: 'Hello', role: 'assistant', isComplete: false },
                { content: ' world', role: 'assistant', isComplete: false },
                { content: '!', role: 'assistant', isComplete: true }
            ];

            // Create async iterable of chunks
            const stream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of chunks) {
                        yield chunk;
                    }
                }
            };

            // Process the stream
            const resultChunks: StreamChunk[] = [];
            for await (const chunk of contentAccumulator.processStream(stream)) {
                resultChunks.push(chunk);
            }

            // Verify the accumulated content
            expect(contentAccumulator.getAccumulatedContent()).toBe('Hello world!');

            // Verify the accumulated content in metadata
            expect(resultChunks[0].metadata?.accumulatedContent).toBe('Hello');
            expect(resultChunks[1].metadata?.accumulatedContent).toBe('Hello world');
            expect(resultChunks[2].metadata?.accumulatedContent).toBe('Hello world!');
        });

        it('should handle empty stream', async () => {
            const chunks: StreamChunk[] = [];

            // Create async iterable of chunks
            const stream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of chunks) {
                        yield chunk;
                    }
                }
            };

            // Process the stream
            const resultChunks: StreamChunk[] = [];
            for await (const chunk of contentAccumulator.processStream(stream)) {
                resultChunks.push(chunk);
            }

            // Verify the accumulated content
            expect(contentAccumulator.getAccumulatedContent()).toBe('');
            expect(resultChunks.length).toBe(0);
        });

        it('should handle chunks with no content', async () => {
            const chunks: (StreamChunk & Partial<UniversalStreamResponse>)[] = [
                { role: 'assistant', isComplete: false },
                { role: 'assistant', isComplete: true }
            ];

            // Create async iterable of chunks
            const stream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of chunks) {
                        yield chunk;
                    }
                }
            };

            // Process the stream
            const resultChunks: StreamChunk[] = [];
            for await (const chunk of contentAccumulator.processStream(stream)) {
                resultChunks.push(chunk);
            }

            // Verify the accumulated content
            expect(contentAccumulator.getAccumulatedContent()).toBe('');
            expect(resultChunks.length).toBe(2);
        });
    });

    describe('tool call processing', () => {
        it('should accumulate and process a single tool call', async () => {
            const chunks: (StreamChunk & Partial<UniversalStreamResponse>)[] = [
                {
                    content: '',
                    role: 'assistant',
                    isComplete: false,
                    toolCallChunks: [
                        {
                            index: 0,
                            id: 'tool-1',
                            name: 'get_weather',
                            argumentsChunk: '{"city": "New'
                        } as ToolCallChunk
                    ]
                },
                {
                    content: '',
                    role: 'assistant',
                    isComplete: false,
                    toolCallChunks: [
                        {
                            index: 0,
                            argumentsChunk: ' York"}'
                        } as ToolCallChunk
                    ]
                },
                {
                    content: '',
                    role: 'assistant',
                    isComplete: true,
                    metadata: {
                        finishReason: FinishReason.TOOL_CALLS
                    }
                }
            ];

            // Create async iterable of chunks
            const stream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of chunks) {
                        yield chunk;
                    }
                }
            };

            // Process the stream
            const resultChunks: StreamChunk[] = [];
            for await (const chunk of contentAccumulator.processStream(stream)) {
                resultChunks.push(chunk);
            }

            // The last chunk should have the completed tool call
            const lastChunk = resultChunks[resultChunks.length - 1];
            expect(lastChunk.toolCalls).toBeDefined();
            expect(lastChunk.toolCalls?.length).toBe(1);
            expect(lastChunk.toolCalls?.[0].name).toBe('get_weather');
            expect(lastChunk.toolCalls?.[0].arguments).toEqual({ city: 'New York' });

            // Check completed tool calls
            const completedToolCalls = contentAccumulator.getCompletedToolCalls();
            expect(completedToolCalls.length).toBe(1);
            expect(completedToolCalls[0].name).toBe('get_weather');
            expect(completedToolCalls[0].arguments).toEqual({ city: 'New York' });
        });

        it('should handle multiple tool calls', async () => {
            const chunks: (StreamChunk & Partial<UniversalStreamResponse>)[] = [
                {
                    content: '',
                    role: 'assistant',
                    isComplete: false,
                    toolCallChunks: [
                        {
                            index: 0,
                            id: 'tool-1',
                            name: 'get_weather',
                            argumentsChunk: '{"city": "New York"}'
                        } as ToolCallChunk,
                        {
                            index: 1,
                            id: 'tool-2',
                            name: 'get_time',
                            argumentsChunk: '{"timezone":'
                        } as ToolCallChunk
                    ]
                },
                {
                    content: '',
                    role: 'assistant',
                    isComplete: false,
                    toolCallChunks: [
                        {
                            index: 1,
                            argumentsChunk: ' "EST"}'
                        } as ToolCallChunk
                    ]
                },
                {
                    content: '',
                    role: 'assistant',
                    isComplete: true,
                    metadata: {
                        finishReason: FinishReason.TOOL_CALLS
                    }
                }
            ];

            // Create async iterable of chunks
            const stream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of chunks) {
                        yield chunk;
                    }
                }
            };

            // Process the stream
            let lastChunk: StreamChunk | null = null;
            for await (const chunk of contentAccumulator.processStream(stream)) {
                lastChunk = chunk;
            }

            // The last chunk should have the completed tool calls
            expect(lastChunk?.toolCalls).toBeDefined();
            expect(lastChunk?.toolCalls?.length).toBe(2);

            // Verify the first tool call
            const weatherTool = lastChunk?.toolCalls?.find(tool => tool.name === 'get_weather');
            expect(weatherTool).toBeDefined();
            expect(weatherTool?.arguments).toEqual({ city: 'New York' });

            // Verify the second tool call
            const timeTool = lastChunk?.toolCalls?.find(tool => tool.name === 'get_time');
            expect(timeTool).toBeDefined();
            expect(timeTool?.arguments).toEqual({ timezone: 'EST' });

            // Check completed tool calls
            const completedToolCalls = contentAccumulator.getCompletedToolCalls();
            expect(completedToolCalls.length).toBe(2);
        });

        it('should handle invalid JSON in tool call arguments', async () => {
            const chunks: (StreamChunk & Partial<UniversalStreamResponse>)[] = [
                {
                    content: '',
                    role: 'assistant',
                    isComplete: false,
                    toolCallChunks: [
                        {
                            index: 0,
                            id: 'tool-1',
                            name: 'get_weather',
                            argumentsChunk: '{"city": "New York'
                        } as ToolCallChunk
                    ]
                },
                {
                    content: '',
                    role: 'assistant',
                    isComplete: true,
                    metadata: {
                        finishReason: FinishReason.TOOL_CALLS
                    }
                }
            ];

            // Create async iterable of chunks
            const stream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of chunks) {
                        yield chunk;
                    }
                }
            };

            // Process the stream
            let lastChunk: StreamChunk | null = null;
            for await (const chunk of contentAccumulator.processStream(stream)) {
                lastChunk = chunk;
            }

            // Tool call should not be completed due to invalid JSON
            expect(lastChunk?.toolCalls).toBeUndefined();
            expect(contentAccumulator.getCompletedToolCalls().length).toBe(0);
            expect(lastChunk?.metadata?.toolCallsInProgress).toBe(1);
        });

        it('should handle empty tool call chunks array', async () => {
            const chunks: (StreamChunk & Partial<UniversalStreamResponse>)[] = [
                {
                    content: 'Hello',
                    role: 'assistant',
                    isComplete: false,
                    toolCallChunks: []
                },
                {
                    content: ' world',
                    role: 'assistant',
                    isComplete: true
                }
            ];

            // Create async iterable of chunks
            const stream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of chunks) {
                        yield chunk;
                    }
                }
            };

            // Process the stream
            const resultChunks: StreamChunk[] = [];
            for await (const chunk of contentAccumulator.processStream(stream)) {
                resultChunks.push(chunk);
            }

            // Verify the accumulated content is correct
            expect(contentAccumulator.getAccumulatedContent()).toBe('Hello world');
            // No tool calls should be processed
            expect(contentAccumulator.getCompletedToolCalls().length).toBe(0);
        });

        it('should process combined content and tool calls', async () => {
            const chunks: (StreamChunk & Partial<UniversalStreamResponse>)[] = [
                {
                    content: 'Here is the weather:',
                    role: 'assistant',
                    isComplete: false,
                    toolCallChunks: [
                        {
                            index: 0,
                            id: 'tool-1',
                            name: 'get_weather',
                            argumentsChunk: '{"city": "New York"}'
                        } as ToolCallChunk
                    ]
                },
                {
                    content: ' Enjoy!',
                    role: 'assistant',
                    isComplete: true,
                    metadata: {
                        finishReason: FinishReason.TOOL_CALLS
                    }
                }
            ];

            // Create async iterable of chunks
            const stream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of chunks) {
                        yield chunk;
                    }
                }
            };

            // Process the stream
            let lastChunk: StreamChunk | null = null;
            for await (const chunk of contentAccumulator.processStream(stream)) {
                lastChunk = chunk;
            }

            // Verify content and tool calls
            expect(contentAccumulator.getAccumulatedContent()).toBe('Here is the weather: Enjoy!');
            expect(contentAccumulator.getCompletedToolCalls().length).toBe(1);
            expect(lastChunk?.toolCalls?.[0].name).toBe('get_weather');
            expect(lastChunk?.toolCalls?.[0].arguments).toEqual({ city: 'New York' });
        });
    });

    describe('reset', () => {
        it('should clear accumulated content and tool calls', async () => {
            // Set up some content and tool calls
            const chunks: (StreamChunk & Partial<UniversalStreamResponse>)[] = [
                {
                    content: 'Hello',
                    role: 'assistant',
                    isComplete: false,
                    toolCallChunks: [
                        {
                            index: 0,
                            id: 'tool-1',
                            name: 'get_weather',
                            argumentsChunk: '{"city": "New York"}'
                        } as ToolCallChunk
                    ]
                },
                {
                    content: ' world',
                    role: 'assistant',
                    isComplete: true,
                    metadata: {
                        finishReason: FinishReason.TOOL_CALLS
                    }
                }
            ];

            // Create async iterable of chunks
            const stream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of chunks) {
                        yield chunk;
                    }
                }
            };

            // Process the stream
            for await (const _ of contentAccumulator.processStream(stream)) {
                // We don't need the chunks for this test
            }

            // Verify we have content and tool calls
            expect(contentAccumulator.getAccumulatedContent()).toBe('Hello world');
            expect(contentAccumulator.getCompletedToolCalls().length).toBe(1);

            // Reset the accumulator
            contentAccumulator.reset();

            // Verify everything is cleared
            expect(contentAccumulator.getAccumulatedContent()).toBe('');
            expect(contentAccumulator.getCompletedToolCalls()).toEqual([]);
        });
    });

    describe('getAccumulatedContent', () => {
        it('should return the current accumulated content', async () => {
            const chunks: (StreamChunk & Partial<UniversalStreamResponse>)[] = [
                { content: 'Hello', role: 'assistant', isComplete: false },
                { content: ' world', role: 'assistant', isComplete: true }
            ];

            // Create async iterable of chunks
            const stream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of chunks) {
                        yield chunk;
                    }
                }
            };

            // Process part of the stream and check intermediate content
            const iterator = contentAccumulator.processStream(stream)[Symbol.asyncIterator]();
            await iterator.next(); // Process first chunk

            expect(contentAccumulator.getAccumulatedContent()).toBe('Hello');

            await iterator.next(); // Process second chunk

            expect(contentAccumulator.getAccumulatedContent()).toBe('Hello world');
        });
    });

    describe('getCompletedToolCalls', () => {
        it('should return all completed tool calls', async () => {
            const chunks: (StreamChunk & Partial<UniversalStreamResponse>)[] = [
                {
                    content: '',
                    role: 'assistant',
                    isComplete: false,
                    toolCallChunks: [
                        {
                            index: 0,
                            id: 'tool-1',
                            name: 'get_weather',
                            argumentsChunk: '{"city": "New York"}'
                        } as ToolCallChunk
                    ]
                },
                {
                    content: '',
                    role: 'assistant',
                    isComplete: false,
                    toolCallChunks: [
                        {
                            index: 1,
                            id: 'tool-2',
                            name: 'get_time',
                            argumentsChunk: '{"timezone": "EST"}'
                        } as ToolCallChunk
                    ]
                },
                {
                    content: '',
                    role: 'assistant',
                    isComplete: true,
                    metadata: {
                        finishReason: FinishReason.TOOL_CALLS
                    }
                }
            ];

            // Create async iterable of chunks
            const stream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of chunks) {
                        yield chunk;
                    }
                }
            };

            // Process the stream
            for await (const _ of contentAccumulator.processStream(stream)) {
                // We don't need the chunks for this test
            }

            // Get completed tool calls
            const completedToolCalls = contentAccumulator.getCompletedToolCalls();

            // Verify the calls
            expect(completedToolCalls.length).toBe(2);

            // Check the tool calls are in order
            expect(completedToolCalls[0].id).toBe('tool-1');
            expect(completedToolCalls[0].name).toBe('get_weather');
            expect(completedToolCalls[0].arguments).toEqual({ city: 'New York' });

            expect(completedToolCalls[1].id).toBe('tool-2');
            expect(completedToolCalls[1].name).toBe('get_time');
            expect(completedToolCalls[1].arguments).toEqual({ timezone: 'EST' });
        });

        it('should return a copy of the completed tool calls array', async () => {
            const chunks: (StreamChunk & Partial<UniversalStreamResponse>)[] = [
                {
                    content: '',
                    role: 'assistant',
                    isComplete: false,
                    toolCallChunks: [
                        {
                            index: 0,
                            id: 'tool-1',
                            name: 'get_weather',
                            argumentsChunk: '{"city": "New York"}'
                        } as ToolCallChunk
                    ]
                },
                {
                    content: '',
                    role: 'assistant',
                    isComplete: true,
                    metadata: {
                        finishReason: FinishReason.TOOL_CALLS
                    }
                }
            ];

            // Create async iterable of chunks
            const stream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of chunks) {
                        yield chunk;
                    }
                }
            };

            // Process the stream
            for await (const _ of contentAccumulator.processStream(stream)) {
                // We don't need the chunks for this test
            }

            // Get completed tool calls
            const completedToolCalls = contentAccumulator.getCompletedToolCalls();
            expect(completedToolCalls.length).toBe(1);

            // Modify the returned array
            completedToolCalls.push({
                id: 'fake-tool',
                name: 'fake_tool',
                arguments: {}
            });

            // The internal array should not be affected
            const newToolCalls = contentAccumulator.getCompletedToolCalls();
            expect(newToolCalls.length).toBe(1);
            expect(newToolCalls[0].id).toBe('tool-1');
        });
    });
}); 