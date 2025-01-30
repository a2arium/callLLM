import { StreamHandler } from '../../../../adapters/openai/stream';
import { Converter } from '../../../../adapters/openai/converter';
import { FinishReason } from '../../../../interfaces/UniversalInterfaces';
import type { OpenAIStreamResponse } from '../../../../adapters/openai/types';
import type { UniversalChatParams, ModelInfo } from '../../../../interfaces/UniversalInterfaces';

jest.mock('../../../../adapters/openai/converter');

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

        handler = new StreamHandler(mockConverter);

        mockConverter.convertStreamResponse.mockReturnValue({
            content: 'test',
            role: 'assistant',
            isComplete: true,
            metadata: {
                finishReason: FinishReason.STOP,
                responseFormat: 'text'
            }
        });
        mockConverter.getCurrentParams.mockReturnValue(mockParams);
    });

    describe('handleStream', () => {
        it('should handle stream correctly with params', async () => {
            const mockStream = {
                async *[Symbol.asyncIterator]() {
                    yield {
                        choices: [{
                            delta: { content: 'test', role: 'assistant' },
                            finish_reason: 'stop'
                        }]
                    };
                }
            };

            const result = handler.handleStream(mockStream as AsyncIterable<OpenAIStreamResponse>, mockParams);
            const chunks = [];
            for await (const chunk of result) {
                chunks.push(chunk);
            }

            expect(mockConverter.convertStreamResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    choices: [{
                        delta: { content: 'test', role: 'assistant' },
                        finish_reason: 'stop'
                    }]
                }),
                mockParams
            );

            expect(chunks).toEqual([{
                content: 'test',
                role: 'assistant',
                isComplete: true,
                metadata: {
                    finishReason: FinishReason.STOP,
                    responseFormat: 'text'
                }
            }]);
        });

        it('should handle empty stream', async () => {
            const mockStream = {
                async *[Symbol.asyncIterator]() {
                    // Empty stream
                }
            };

            const result = handler.handleStream(mockStream as AsyncIterable<OpenAIStreamResponse>, mockParams);
            const chunks = [];
            for await (const chunk of result) {
                chunks.push(chunk);
            }

            expect(chunks).toEqual([]);
        });

        it('should handle stream errors', async () => {
            const mockStream = {
                async *[Symbol.asyncIterator]() {
                    throw new Error('Stream error');
                }
            };

            await expect(async () => {
                const result = handler.handleStream(mockStream as AsyncIterable<OpenAIStreamResponse>, mockParams);
                for await (const _ of result) {
                    // Consume stream
                }
            }).rejects.toThrow('Stream error');
        });

        it('should handle multiple chunks with params', async () => {
            const mockStream = {
                async *[Symbol.asyncIterator]() {
                    yield {
                        choices: [{
                            delta: { content: 'Hello', role: 'assistant' },
                            finish_reason: null
                        }]
                    };
                    yield {
                        choices: [{
                            delta: { content: ' World', role: 'assistant' },
                            finish_reason: 'stop'
                        }]
                    };
                }
            };

            mockConverter.convertStreamResponse
                .mockReturnValueOnce({
                    content: 'Hello',
                    role: 'assistant',
                    isComplete: false,
                    metadata: {
                        finishReason: FinishReason.NULL,
                        responseFormat: 'text'
                    }
                })
                .mockReturnValueOnce({
                    content: ' World',
                    role: 'assistant',
                    isComplete: true,
                    metadata: {
                        finishReason: FinishReason.STOP,
                        responseFormat: 'text'
                    }
                });

            const result = handler.handleStream(mockStream as AsyncIterable<OpenAIStreamResponse>, mockParams);
            const chunks = [];
            for await (const chunk of result) {
                chunks.push(chunk);
            }

            expect(mockConverter.convertStreamResponse).toHaveBeenCalledTimes(2);
            expect(mockConverter.convertStreamResponse).toHaveBeenNthCalledWith(1,
                expect.objectContaining({
                    choices: [{
                        delta: { content: 'Hello', role: 'assistant' },
                        finish_reason: null
                    }]
                }),
                mockParams
            );
            expect(mockConverter.convertStreamResponse).toHaveBeenNthCalledWith(2,
                expect.objectContaining({
                    choices: [{
                        delta: { content: ' World', role: 'assistant' },
                        finish_reason: 'stop'
                    }]
                }),
                mockParams
            );

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

        it('should handle stream with json response format', async () => {
            const jsonParams: UniversalChatParams = {
                ...mockParams,
                settings: { responseFormat: 'json' as const }
            };

            const mockStream = {
                async *[Symbol.asyncIterator]() {
                    yield {
                        choices: [{
                            delta: { content: '{"key":', role: 'assistant' },
                            finish_reason: null
                        }]
                    };
                    yield {
                        choices: [{
                            delta: { content: '"value"}', role: 'assistant' },
                            finish_reason: 'stop'
                        }]
                    };
                }
            };

            mockConverter.convertStreamResponse
                .mockReturnValueOnce({
                    content: '{"key":',
                    role: 'assistant',
                    isComplete: false,
                    metadata: {
                        finishReason: FinishReason.NULL,
                        responseFormat: 'json'
                    }
                })
                .mockReturnValueOnce({
                    content: '"value"}',
                    role: 'assistant',
                    isComplete: true,
                    metadata: {
                        finishReason: FinishReason.STOP,
                        responseFormat: 'json'
                    }
                });

            const result = handler.handleStream(mockStream as AsyncIterable<OpenAIStreamResponse>, jsonParams);
            const chunks = [];
            for await (const chunk of result) {
                chunks.push(chunk);
            }

            expect(mockConverter.convertStreamResponse).toHaveBeenCalledTimes(2);
            expect(chunks).toEqual([
                {
                    content: '{"key":',
                    role: 'assistant',
                    isComplete: false,
                    metadata: {
                        finishReason: FinishReason.NULL,
                        responseFormat: 'json'
                    }
                },
                {
                    content: '"value"}',
                    role: 'assistant',
                    isComplete: true,
                    metadata: {
                        finishReason: FinishReason.STOP,
                        responseFormat: 'json'
                    }
                }
            ]);
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