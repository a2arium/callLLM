import { StreamHandler } from '../../../../core/streaming/StreamHandler';
import { TokenCalculator } from '../../../../core/models/TokenCalculator';
import { ModelInfo, UniversalStreamResponse, FinishReason } from '../../../../interfaces/UniversalInterfaces';
import { UsageCallback } from '../../../../interfaces/UsageInterfaces';
import { z } from 'zod';

describe('StreamHandler', () => {
    let tokenCalculator: TokenCalculator;
    let mockUsageCallback: jest.Mock;
    let streamHandler: StreamHandler;

    const mockModelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 1,
        outputPricePerMillion: 2,
        maxRequestTokens: 1000,
        maxResponseTokens: 1000,
        tokenizationModel: 'gpt-4',
        characteristics: {
            qualityIndex: 80,
            outputSpeed: 50,
            firstTokenLatency: 0.5
        }
    };

    beforeEach(() => {
        tokenCalculator = new TokenCalculator();
        mockUsageCallback = jest.fn();
        streamHandler = new StreamHandler(tokenCalculator, mockUsageCallback, 'test-id');

        // Mock token calculator methods
        jest.spyOn(tokenCalculator, 'calculateTokens').mockImplementation((text) => text.length);
        jest.spyOn(tokenCalculator, 'calculateUsage').mockImplementation((input, output, inputPricePerMillion, outputPricePerMillion, inputCachedTokens, inputCachedPricePerMillion) => {
            // Calculate non-cached input tokens
            const nonCachedInputTokens = (inputCachedTokens !== undefined && inputCachedPricePerMillion !== undefined)
                ? input - inputCachedTokens
                : input;

            // Calculate input costs
            const regularInputCost = (nonCachedInputTokens * inputPricePerMillion) / 1_000_000;
            const cachedInputCost = (inputCachedTokens !== undefined && inputCachedPricePerMillion !== undefined)
                ? (inputCachedTokens * inputCachedPricePerMillion) / 1_000_000
                : undefined;

            const outputCost = (output * outputPricePerMillion) / 1_000_000;
            const totalCost = (regularInputCost + (cachedInputCost || 0) + outputCost);

            return {
                inputCost: regularInputCost,
                ...(cachedInputCost !== undefined ? { inputCachedCost: cachedInputCost } : {}),
                outputCost,
                totalCost
            };
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should call usage callback with incremental tokens', async () => {
        const mockStream = {
            async *[Symbol.asyncIterator]() {
                yield {
                    content: 'first',
                    role: 'assistant',
                    isComplete: false
                } as UniversalStreamResponse;
                yield {
                    content: ' chunk',
                    role: 'assistant',
                    isComplete: true
                } as UniversalStreamResponse;
            }
        };

        const generator = streamHandler.processStream(
            mockStream,
            { messages: [], settings: {} },
            10,
            mockModelInfo
        );

        let chunkCount = 0;
        for await (const chunk of generator) {
            chunkCount += 1;
            expect(chunk.metadata?.usage).toBeDefined();
        }

        expect(chunkCount).toBe(2);
        expect(mockUsageCallback).toHaveBeenCalledTimes(1);

        expect(mockUsageCallback).toHaveBeenCalledWith(expect.objectContaining({
            callerId: 'test-id',
            usage: expect.objectContaining({
                inputTokens: 10,
                costs: expect.objectContaining({
                    inputCost: expect.any(Number),
                    outputCost: expect.any(Number),
                    totalCost: expect.any(Number)
                })
            })
        }));
    });

    it('should batch callbacks based on TOKEN_BATCH_SIZE', async () => {
        const mockStream = {
            async *[Symbol.asyncIterator]() {
                yield {
                    content: 'a'.repeat(150),
                    role: 'assistant',
                    isComplete: false
                } as UniversalStreamResponse;
                yield {
                    content: 'b'.repeat(50),
                    role: 'assistant',
                    isComplete: true
                } as UniversalStreamResponse;
            }
        };

        const generator = streamHandler.processStream(
            mockStream,
            { messages: [], settings: {} },
            10,
            mockModelInfo
        );

        for await (const chunk of generator) {
            expect(chunk.metadata?.usage).toBeDefined();
        }

        expect(mockUsageCallback).toHaveBeenCalledTimes(2);

        expect(mockUsageCallback).toHaveBeenNthCalledWith(1, expect.objectContaining({
            usage: expect.objectContaining({
                inputTokens: 10,
                outputTokens: 150,
                costs: expect.objectContaining({
                    inputCost: 0.00001,  // 10 * 1 / 1_000_000
                    outputCost: 0.0003   // 150 * 2 / 1_000_000
                })
            })
        }));

        expect(mockUsageCallback).toHaveBeenNthCalledWith(2, expect.objectContaining({
            usage: expect.objectContaining({
                inputTokens: 0,
                outputTokens: 50,
                costs: expect.objectContaining({
                    inputCost: 0,
                    outputCost: 0.0001   // 50 * 2 / 1_000_000
                })
            })
        }));
    });

    it('should validate JSON response against schema', async () => {
        const testSchema = z.object({
            message: z.string(),
            count: z.number()
        });

        const mockStream = {
            async *[Symbol.asyncIterator]() {
                yield {
                    content: '{"message": "test", "count": 1}',
                    role: 'assistant',
                    isComplete: true
                } as UniversalStreamResponse;
            }
        };

        const generator = streamHandler.processStream(
            mockStream,
            {
                messages: [],
                settings: {
                    responseFormat: 'json',
                    jsonSchema: { schema: testSchema }
                }
            },
            10,
            mockModelInfo
        );

        const chunks = [];
        for await (const chunk of generator) {
            chunks.push(chunk);
        }

        expect(chunks[0].content).toEqual({ message: 'test', count: 1 });
    });

    it('should handle invalid JSON schema validation', async () => {
        const testSchema = z.object({
            message: z.string(),
            count: z.number()
        });

        const mockStream = {
            async *[Symbol.asyncIterator]() {
                yield {
                    content: '{"message": "test", "count": "invalid"}',
                    role: 'assistant',
                    isComplete: true
                } as UniversalStreamResponse;
            }
        };

        const generator = streamHandler.processStream(
            mockStream,
            {
                messages: [],
                settings: {
                    responseFormat: 'json',
                    jsonSchema: { schema: testSchema }
                }
            },
            10,
            mockModelInfo
        );

        const chunks = [];
        for await (const chunk of generator) {
            chunks.push(chunk);
        }

        expect(chunks[0].metadata?.validationErrors).toBeDefined();
        expect(chunks[0].metadata?.finishReason).toBe(FinishReason.CONTENT_FILTER);
    });

    it('should handle malformed JSON response', async () => {
        const mockStream = {
            async *[Symbol.asyncIterator]() {
                yield {
                    content: 'invalid json{',
                    role: 'assistant',
                    isComplete: true
                } as UniversalStreamResponse;
            }
        };

        const generator = streamHandler.processStream(
            mockStream,
            { messages: [], settings: { responseFormat: 'json' } },
            10,
            mockModelInfo
        );

        await expect(async () => {
            for await (const chunk of generator) {
                // This should throw
            }
        }).rejects.toThrow('Failed to parse JSON response');
    });

    describe('token batching', () => {
        it('should trigger callback at TOKEN_BATCH_SIZE boundary', async () => {
            // Mock token calculator to return exact token counts
            jest.spyOn(tokenCalculator, 'calculateTokens')
                .mockImplementation((text) => text.length);

            const mockStream = {
                async *[Symbol.asyncIterator]() {
                    yield {
                        content: 'a'.repeat(99),
                        role: 'assistant',
                        isComplete: false
                    } as UniversalStreamResponse;
                    yield {
                        content: 'b',
                        role: 'assistant',
                        isComplete: false
                    } as UniversalStreamResponse;
                    yield {
                        content: 'c',
                        role: 'assistant',
                        isComplete: true
                    } as UniversalStreamResponse;
                }
            };

            const generator = streamHandler.processStream(
                mockStream,
                { messages: [], settings: {} },
                10,
                mockModelInfo
            );

            for await (const chunk of generator) {
                // consume chunks
            }

            // Should trigger callback at 100 tokens and at completion
            expect(mockUsageCallback).toHaveBeenCalledTimes(2);

            // First callback should include input tokens
            expect(mockUsageCallback).toHaveBeenNthCalledWith(1, expect.objectContaining({
                usage: expect.objectContaining({
                    inputTokens: 10,
                    outputTokens: 100
                })
            }));

            // Second callback should only include remaining output tokens
            expect(mockUsageCallback).toHaveBeenNthCalledWith(2, expect.objectContaining({
                usage: expect.objectContaining({
                    inputTokens: 0,
                    outputTokens: 1
                })
            }));
        });

        it('should handle multiple token batches', async () => {
            jest.spyOn(tokenCalculator, 'calculateTokens')
                .mockImplementationOnce(() => 100)  // First chunk
                .mockImplementationOnce(() => 200)  // Second chunk
                .mockImplementationOnce(() => 300); // Final chunk

            const mockStream = {
                async *[Symbol.asyncIterator]() {
                    yield {
                        content: 'a'.repeat(100),
                        role: 'assistant',
                        isComplete: false
                    } as UniversalStreamResponse;
                    yield {
                        content: 'b'.repeat(100),
                        role: 'assistant',
                        isComplete: false
                    } as UniversalStreamResponse;
                    yield {
                        content: 'c'.repeat(100),
                        role: 'assistant',
                        isComplete: true
                    } as UniversalStreamResponse;
                }
            };

            const generator = streamHandler.processStream(
                mockStream,
                { messages: [], settings: {} },
                10,
                mockModelInfo
            );

            for await (const chunk of generator) {
                // consume chunks
            }

            expect(mockUsageCallback).toHaveBeenCalledTimes(3);

            const calls = mockUsageCallback.mock.calls;
            expect(calls[0][0].usage.outputTokens).toBe(100);
            expect(calls[1][0].usage.outputTokens).toBe(100);
            expect(calls[2][0].usage.outputTokens).toBe(100);
        });

        it('should handle zero input tokens', async () => {
            const mockStream = {
                async *[Symbol.asyncIterator]() {
                    yield {
                        content: 'test',
                        role: 'assistant',
                        isComplete: true
                    } as UniversalStreamResponse;
                }
            };

            const generator = streamHandler.processStream(
                mockStream,
                { messages: [], settings: {} },
                0,
                mockModelInfo
            );

            for await (const chunk of generator) {
                // consume chunks
            }

            expect(mockUsageCallback).toHaveBeenCalledWith(expect.objectContaining({
                usage: expect.objectContaining({
                    inputTokens: 0,
                    outputTokens: expect.any(Number)
                })
            }));
        });

        it('should handle very large content chunks', async () => {
            let tokenCount = 0;
            // Mock token calculator to simulate accumulating tokens
            jest.spyOn(tokenCalculator, 'calculateTokens')
                .mockImplementation(() => {
                    tokenCount += 100;
                    return tokenCount;
                });

            const mockStream = {
                async *[Symbol.asyncIterator]() {
                    // First chunk: 100 tokens
                    yield {
                        content: 'a'.repeat(100),
                        role: 'assistant',
                        isComplete: false
                    } as UniversalStreamResponse;
                    // Second chunk: 200 tokens total
                    yield {
                        content: 'b'.repeat(100),
                        role: 'assistant',
                        isComplete: false
                    } as UniversalStreamResponse;
                    // Final chunk: 300 tokens total
                    yield {
                        content: 'c'.repeat(100),
                        role: 'assistant',
                        isComplete: true
                    } as UniversalStreamResponse;
                }
            };

            const generator = streamHandler.processStream(
                mockStream,
                { messages: [], settings: {} },
                10,
                mockModelInfo
            );

            for await (const chunk of generator) {
                // consume chunks
            }

            // Should have 3 callbacks: one for each 100-token batch
            expect(mockUsageCallback.mock.calls.length).toBe(3);

            const calls = mockUsageCallback.mock.calls;
            // First callback: 100 tokens (includes input tokens)
            expect(calls[0][0].usage.outputTokens).toBe(100);
            expect(calls[0][0].usage.inputTokens).toBe(10);
            // Second callback: 100 more tokens
            expect(calls[1][0].usage.outputTokens).toBe(100);
            expect(calls[1][0].usage.inputTokens).toBe(0);
            // Third callback: 100 more tokens
            expect(calls[2][0].usage.outputTokens).toBe(100);
            expect(calls[2][0].usage.inputTokens).toBe(0);
        });

        // Add test for remaining uncovered branches
        it('should handle JSON parse error with schema validation', async () => {
            const testSchema = z.object({
                message: z.string(),
                count: z.number()
            });

            const mockStream = {
                async *[Symbol.asyncIterator]() {
                    yield {
                        content: 'invalid json with schema',
                        role: 'assistant',
                        isComplete: true
                    } as UniversalStreamResponse;
                }
            };

            const generator = streamHandler.processStream(
                mockStream,
                {
                    messages: [],
                    settings: {
                        responseFormat: 'json',
                        jsonSchema: { schema: testSchema }
                    }
                },
                10,
                mockModelInfo
            );

            await expect(async () => {
                for await (const chunk of generator) {
                    // This should throw
                }
            }).rejects.toThrow('Failed to parse JSON response');
        });

        it('should handle undefined settings in params', async () => {
            const mockStream = {
                async *[Symbol.asyncIterator]() {
                    yield {
                        content: 'test content',
                        role: 'assistant',
                        isComplete: true
                    } as UniversalStreamResponse;
                }
            };

            const generator = streamHandler.processStream(
                mockStream,
                { messages: [] }, // No settings
                10,
                mockModelInfo
            );

            const chunks = [];
            for await (const chunk of generator) {
                chunks.push(chunk);
            }

            expect(chunks[0].content).toBe('test content');
        });

        it('should handle undefined metadata in chunk', async () => {
            const mockStream = {
                async *[Symbol.asyncIterator]() {
                    const response = {
                        content: 'test content',
                        role: 'assistant',
                        isComplete: true
                    } as UniversalStreamResponse;
                    delete response.metadata;
                    yield response;
                }
            };

            const generator = streamHandler.processStream(
                mockStream,
                { messages: [], settings: {} },
                10,
                mockModelInfo
            );

            const chunks = [];
            for await (const chunk of generator) {
                chunks.push(chunk);
                // The StreamHandler should always add metadata
                expect(chunk.metadata!).toBeDefined();
                expect(chunk.metadata!.usage).toBeDefined();
            }
        });
    });

    describe('error handling and edge cases', () => {
        it('should handle token calculator errors', async () => {
            jest.spyOn(tokenCalculator, 'calculateTokens')
                .mockImplementation(() => {
                    throw new Error('Token calculation failed');
                });

            const mockStream = {
                async *[Symbol.asyncIterator]() {
                    yield {
                        content: 'test',
                        role: 'assistant',
                        isComplete: false
                    } as UniversalStreamResponse;
                }
            };

            const generator = streamHandler.processStream(
                mockStream,
                { messages: [], settings: {} },
                10,
                mockModelInfo
            );

            await expect(async () => {
                for await (const chunk of generator) {
                    // This should throw
                }
            }).rejects.toThrow('Token calculation failed');
        });

        it('should handle empty stream', async () => {
            const mockStream = {
                async *[Symbol.asyncIterator]() {
                    // Empty stream
                }
            };

            const generator = streamHandler.processStream(
                mockStream,
                { messages: [], settings: {} },
                10,
                mockModelInfo
            );

            const chunks = [];
            for await (const chunk of generator) {
                chunks.push(chunk);
            }

            expect(chunks).toHaveLength(0);
            expect(mockUsageCallback).not.toHaveBeenCalled();
        });

        it('should handle missing optional parameters', async () => {
            // Create handler without usage callback and callerId
            const handlerWithoutOptionals = new StreamHandler(tokenCalculator);

            const mockStream = {
                async *[Symbol.asyncIterator]() {
                    yield {
                        content: 'test',
                        role: 'assistant',
                        isComplete: true
                    } as UniversalStreamResponse;
                }
            };

            const generator = handlerWithoutOptionals.processStream(
                mockStream,
                { messages: [], settings: {} },
                10,
                mockModelInfo
            );

            const chunks = [];
            for await (const chunk of generator) {
                chunks.push(chunk);
            }

            expect(chunks).toHaveLength(1);
            expect(chunks[0].content).toBe('test');
        });

        it('should handle stream errors and make final usage callback', async () => {
            jest.spyOn(tokenCalculator, 'calculateTokens')
                .mockImplementation((text) => text.length);

            const mockStream = {
                async *[Symbol.asyncIterator]() {
                    yield {
                        content: 'a'.repeat(150),
                        role: 'assistant',
                        isComplete: false
                    } as UniversalStreamResponse;
                    throw new Error('Stream error');
                }
            };

            const generator = streamHandler.processStream(
                mockStream,
                { messages: [], settings: {} },
                10,
                mockModelInfo
            );

            await expect(async () => {
                for await (const chunk of generator) {
                    // This should throw
                }
            }).rejects.toThrow('Stream error');

            // Should have made a callback for the tokens before the error
            expect(mockUsageCallback).toHaveBeenCalledWith(expect.objectContaining({
                usage: expect.objectContaining({
                    outputTokens: 150
                })
            }));
        });
    });

    it('should handle cached tokens in usage calculation', async () => {
        const mockStream = {
            async *[Symbol.asyncIterator]() {
                yield {
                    content: 'test',
                    role: 'assistant',
                    isComplete: true
                } as UniversalStreamResponse;
            }
        };

        const params = {
            messages: [],
            settings: {},
            inputCachedTokens: 20,
            inputCachedPricePerMillion: 500
        };

        const generator = streamHandler.processStream(
            mockStream,
            params,
            100,  // total input tokens
            { ...mockModelInfo, inputPricePerMillion: 1000 }
        );

        for await (const chunk of generator) {
            expect(chunk.metadata?.usage).toBeDefined();
            expect(chunk.metadata?.usage?.inputCachedTokens).toBe(20);
            expect(chunk.metadata?.usage?.costs.inputCost).toBe(0.08); // (100-20) * 1000 / 1_000_000
            expect(chunk.metadata?.usage?.costs.inputCachedCost).toBe(0.01); // 20 * 500 / 1_000_000
        }

        expect(mockUsageCallback).toHaveBeenCalledWith(expect.objectContaining({
            callerId: 'test-id',
            usage: expect.objectContaining({
                inputTokens: 100,
                inputCachedTokens: 20,
                costs: expect.objectContaining({
                    inputCost: 0.08,
                    inputCachedCost: 0.01
                })
            })
        }));
    });

    it('should handle cached tokens without cached price', async () => {
        const mockStream = {
            async *[Symbol.asyncIterator]() {
                yield {
                    content: 'test',
                    role: 'assistant',
                    isComplete: true
                } as UniversalStreamResponse;
            }
        };

        const params = {
            messages: [],
            settings: {},
            inputCachedTokens: 20  // no cached price provided
        };

        const generator = streamHandler.processStream(
            mockStream,
            params,
            100,  // total input tokens
            { ...mockModelInfo, inputPricePerMillion: 1000 }
        );

        for await (const chunk of generator) {
            expect(chunk.metadata?.usage).toBeDefined();
            expect(chunk.metadata?.usage?.inputCachedTokens).toBe(20);
            expect(chunk.metadata?.usage?.costs.inputCost).toBe(0.1); // all tokens charged at regular price
            expect(chunk.metadata?.usage?.costs.inputCachedCost).toBeUndefined();
        }

        expect(mockUsageCallback).toHaveBeenCalledWith(expect.objectContaining({
            callerId: 'test-id',
            usage: expect.objectContaining({
                inputTokens: 100,
                inputCachedTokens: 20,
                costs: expect.objectContaining({
                    inputCost: 0.1  // all tokens charged at regular price
                })
            })
        }));
    });
}); 