import { StreamHandler } from '../../../../adapters/openai/stream';
import { FinishReason } from '../../../../interfaces/UniversalInterfaces';
import type { OpenAIStreamResponse } from '../../../../adapters/openai/types';

describe('StreamHandler', () => {
    let handler: StreamHandler;

    beforeEach(() => {
        handler = new StreamHandler();
    });

    describe('handleStream', () => {
        it('should handle basic content streaming', async () => {
            const stream = createMockStream([
                { content: 'Hello', role: 'assistant', finish_reason: null },
                { content: ' World', role: 'assistant', finish_reason: 'stop' }
            ]);

            const chunks = [];
            for await (const chunk of handler.handleStream(stream)) {
                chunks.push(chunk);
            }

            expect(chunks).toEqual([
                {
                    content: 'Hello',
                    role: 'assistant',
                    isComplete: false,
                    metadata: {
                        finishReason: FinishReason.NULL,
                        responseFormat: 'text'
                    }
                },
                {
                    content: ' World',
                    role: 'assistant',
                    isComplete: true,
                    metadata: {
                        finishReason: FinishReason.STOP,
                        responseFormat: 'text'
                    }
                }
            ]);
        });

        it('should handle empty content', async () => {
            const stream = createMockStream([
                { content: '', role: 'assistant', finish_reason: null }
            ]);

            const chunks = [];
            for await (const chunk of handler.handleStream(stream)) {
                chunks.push(chunk);
            }

            expect(chunks).toEqual([
                {
                    content: '',
                    role: 'assistant',
                    isComplete: false,
                    metadata: {
                        finishReason: FinishReason.NULL,
                        responseFormat: 'text'
                    }
                }
            ]);
        });

        it('should handle missing role', async () => {
            const stream = createMockStream([
                { content: 'test', finish_reason: null }
            ]);

            const chunks = [];
            for await (const chunk of handler.handleStream(stream)) {
                chunks.push(chunk);
            }

            expect(chunks).toEqual([
                {
                    content: 'test',
                    role: 'assistant',
                    isComplete: false,
                    metadata: {
                        finishReason: FinishReason.NULL,
                        responseFormat: 'text'
                    }
                }
            ]);
        });

        it('should handle custom response format', async () => {
            const stream = createMockStream([
                { content: '{"test": true}', role: 'assistant', finish_reason: 'stop' }
            ]);

            const params = {
                messages: [],
                settings: {
                    responseFormat: 'json' as const
                }
            };

            const chunks = [];
            for await (const chunk of handler.handleStream(stream, params)) {
                chunks.push(chunk);
            }

            expect(chunks).toEqual([
                {
                    content: '{"test": true}',
                    role: 'assistant',
                    isComplete: true,
                    metadata: {
                        finishReason: FinishReason.STOP,
                        responseFormat: 'json'
                    }
                }
            ]);
        });

        it('should handle missing delta', async () => {
            const stream = createMockStream([
                { finish_reason: null }
            ]);

            const chunks = [];
            for await (const chunk of handler.handleStream(stream)) {
                chunks.push(chunk);
            }

            expect(chunks).toEqual([
                {
                    content: '',
                    role: 'assistant',
                    isComplete: false,
                    metadata: {
                        finishReason: FinishReason.NULL,
                        responseFormat: 'text'
                    }
                }
            ]);
        });

        it('should handle empty choices array', async () => {
            const stream = {
                async *[Symbol.asyncIterator]() {
                    yield {
                        choices: [{
                            delta: {},
                            finish_reason: null
                        }]
                    } as OpenAIStreamResponse;
                }
            };

            const chunks = [];
            for await (const chunk of handler.handleStream(stream)) {
                chunks.push(chunk);
            }

            expect(chunks).toEqual([
                {
                    content: '',
                    role: 'assistant',
                    isComplete: false,
                    metadata: {
                        finishReason: FinishReason.NULL,
                        responseFormat: 'text'
                    }
                }
            ]);
        });

        it('should handle undefined choices', async () => {
            const stream = {
                async *[Symbol.asyncIterator]() {
                    yield {
                        choices: [{
                            delta: {},
                            finish_reason: null
                        }]
                    } as OpenAIStreamResponse;
                }
            };

            const chunks = [];
            for await (const chunk of handler.handleStream(stream)) {
                chunks.push(chunk);
            }

            expect(chunks).toEqual([
                {
                    content: '',
                    role: 'assistant',
                    isComplete: false,
                    metadata: {
                        finishReason: FinishReason.NULL,
                        responseFormat: 'text'
                    }
                }
            ]);
        });

        it('should handle params without settings', async () => {
            const stream = createMockStream([
                { content: 'test', role: 'assistant', finish_reason: null }
            ]);

            const params = { messages: [] };

            const chunks = [];
            for await (const chunk of handler.handleStream(stream, params)) {
                chunks.push(chunk);
            }

            expect(chunks).toEqual([
                {
                    content: 'test',
                    role: 'assistant',
                    isComplete: false,
                    metadata: {
                        finishReason: FinishReason.NULL,
                        responseFormat: 'text'
                    }
                }
            ]);
        });

        it('should handle undefined delta with existing choices', async () => {
            const stream = {
                async *[Symbol.asyncIterator]() {
                    yield {
                        choices: [{
                            finish_reason: null
                        }]
                    } as OpenAIStreamResponse;
                }
            };

            const chunks = [];
            for await (const chunk of handler.handleStream(stream)) {
                chunks.push(chunk);
            }

            expect(chunks).toEqual([
                {
                    content: '',
                    role: 'assistant',
                    isComplete: false,
                    metadata: {
                        finishReason: FinishReason.NULL,
                        responseFormat: 'text'
                    }
                }
            ]);
        });

        it('should handle undefined finish_reason with existing choices', async () => {
            const stream = {
                async *[Symbol.asyncIterator]() {
                    yield {
                        choices: [{
                            delta: {
                                content: 'test',
                                role: 'assistant'
                            }
                        }]
                    } as OpenAIStreamResponse;
                }
            };

            const chunks = [];
            for await (const chunk of handler.handleStream(stream)) {
                chunks.push(chunk);
            }

            expect(chunks).toEqual([
                {
                    content: 'test',
                    role: 'assistant',
                    isComplete: true,
                    metadata: {
                        finishReason: FinishReason.NULL,
                        responseFormat: 'text'
                    }
                }
            ]);
        });

        it('should handle undefined settings with existing params', async () => {
            const stream = createMockStream([
                { content: 'test', role: 'assistant', finish_reason: null }
            ]);

            const params = { messages: [], settings: undefined };

            const chunks = [];
            for await (const chunk of handler.handleStream(stream, params)) {
                chunks.push(chunk);
            }

            expect(chunks).toEqual([
                {
                    content: 'test',
                    role: 'assistant',
                    isComplete: false,
                    metadata: {
                        finishReason: FinishReason.NULL,
                        responseFormat: 'text'
                    }
                }
            ]);
        });
    });

    describe('mapFinishReason', () => {
        const testCases = [
            { input: null, expected: FinishReason.NULL },
            { input: 'stop', expected: FinishReason.STOP },
            { input: 'length', expected: FinishReason.LENGTH },
            { input: 'content_filter', expected: FinishReason.CONTENT_FILTER },
            { input: 'tool_calls', expected: FinishReason.TOOL_CALLS },
            { input: 'unknown', expected: FinishReason.NULL }
        ] as const;

        testCases.forEach(({ input, expected }) => {
            it(`should map ${input || 'null'} to ${expected}`, () => {
                expect(handler['mapFinishReason'](input)).toBe(expected);
            });
        });
    });
});

function createMockStream(chunks: Array<Partial<OpenAIStreamResponse['choices'][0]['delta'] & { finish_reason: string | null }>>): AsyncIterable<OpenAIStreamResponse> {
    return {
        async *[Symbol.asyncIterator]() {
            for (const chunk of chunks) {
                yield {
                    choices: [{
                        delta: {
                            content: chunk.content,
                            role: chunk.role
                        },
                        finish_reason: chunk.finish_reason
                    }]
                } as OpenAIStreamResponse;
            }
        }
    };
} 