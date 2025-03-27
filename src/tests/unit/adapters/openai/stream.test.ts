import { StreamHandler } from '../../../../adapters/openai/stream';
import { Converter } from '../../../../adapters/openai/converter';
import { FinishReason } from '../../../../interfaces/UniversalInterfaces';
import type { OpenAIStreamResponse } from '../../../../adapters/openai/types';
import type { UniversalChatParams, ModelInfo, UniversalStreamResponse } from '../../../../interfaces/UniversalInterfaces';
import type { Stream } from 'openai/streaming';
import type { ChatCompletionChunk } from 'openai/resources/chat';

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
    });
});