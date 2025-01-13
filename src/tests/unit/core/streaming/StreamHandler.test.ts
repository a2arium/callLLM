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
        jest.spyOn(tokenCalculator, 'calculateUsage').mockImplementation((input, output) => ({
            inputCost: input * 0.001,
            outputCost: output * 0.002,
            totalCost: input * 0.001 + output * 0.002
        }));
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
                    inputCost: 0.01,
                    outputCost: 0.3
                })
            })
        }));

        expect(mockUsageCallback).toHaveBeenNthCalledWith(2, expect.objectContaining({
            usage: expect.objectContaining({
                inputTokens: 0,
                outputTokens: 50,
                costs: expect.objectContaining({
                    inputCost: 0,
                    outputCost: 0.1
                })
            })
        }));
    });
}); 