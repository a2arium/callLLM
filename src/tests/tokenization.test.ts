import { mockModels } from './mocks/mockModels';

// Mock OpenAI API responses
jest.mock('openai', () => ({
    OpenAI: jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn().mockImplementation(async (params) => {
                    if (params.stream) {
                        return {
                            [Symbol.asyncIterator]: async function* () {
                                yield {
                                    choices: [{
                                        delta: { content: 'Hello', role: 'assistant' },
                                        finish_reason: null
                                    }],
                                    created: Date.now(),
                                    model: 'mock-model-1',
                                    usage: {
                                        prompt_tokens: 10,
                                        completion_tokens: 2,
                                        total_tokens: 12
                                    }
                                };
                                yield {
                                    choices: [{
                                        delta: { content: ' world', role: 'assistant' },
                                        finish_reason: 'stop'
                                    }],
                                    created: Date.now(),
                                    model: 'mock-model-1',
                                    usage: {
                                        prompt_tokens: 10,
                                        completion_tokens: 20,
                                        total_tokens: 30
                                    }
                                };
                            }
                        };
                    }
                    return {
                        choices: [{
                            message: { content: 'Hello world', role: 'assistant' },
                            finish_reason: 'stop'
                        }],
                        created: Date.now(),
                        model: 'mock-model-1',
                        usage: {
                            prompt_tokens: 10,
                            completion_tokens: 20,
                            total_tokens: 30
                        }
                    };
                })
            }
        }
    }))
}));

// Mock OpenAI models
jest.mock('../adapters/providers/openai/models', () => ({
    defaultModels: mockModels
}));

// Mock tiktoken
jest.mock('@dqbd/tiktoken', () => ({
    encoding_for_model: jest.fn().mockReturnValue({
        encode: jest.fn().mockReturnValue(new Array(10)),
        free: jest.fn()
    })
}));

import { OpenAIAdapter } from '../adapters/openai';
import { UniversalChatParams } from '../interfaces/UniversalInterfaces';

describe('Token Counting', () => {
    let adapter: OpenAIAdapter;
    const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'Hello' }],
        settings: {
            temperature: 0.7,
            maxTokens: 100
        }
    };

    beforeEach(() => {
        adapter = new OpenAIAdapter('test-key');
        jest.clearAllMocks();
    });

    describe('Token Calculation', () => {
        it('should calculate tokens and costs correctly for chat call', async () => {
            const response = await adapter.chatCall('mock-model-1', params);

            // Check token counts
            expect(response.metadata?.usage?.inputTokens).toBe(10);
            expect(response.metadata?.usage?.outputTokens).toBe(20);
            expect(response.metadata?.usage?.totalTokens).toBe(30);

            // Check costs (based on mock-model-1 pricing: input=$30/M, output=$60/M)
            expect(response.metadata?.usage?.costs.inputCost).toBeCloseTo(0.0003, 6); // 10 tokens at $30/M
            expect(response.metadata?.usage?.costs.outputCost).toBeCloseTo(0.0012, 6); // 20 tokens at $60/M
            expect(response.metadata?.usage?.costs.totalCost).toBeCloseTo(0.0015, 6);
        });

        it('should calculate tokens and costs correctly for stream call', async () => {
            const stream = await adapter.streamCall('mock-model-1', params);
            let finalChunk;
            let chunkCount = 0;

            for await (const chunk of stream) {
                chunkCount++;
                if (chunkCount === 1) {
                    // First chunk
                    expect(chunk.metadata?.usage?.inputTokens).toBe(10);
                    expect(chunk.metadata?.usage?.outputTokens).toBe(10);
                    expect(chunk.metadata?.usage?.totalTokens).toBe(20);
                    expect(chunk.metadata?.usage?.costs.inputCost).toBeCloseTo(0.0003, 6); // 10 tokens at $30/M
                    expect(chunk.metadata?.usage?.costs.outputCost).toBeCloseTo(0.0006, 6); // 10 tokens at $60/M
                    expect(chunk.metadata?.usage?.costs.totalCost).toBeCloseTo(0.0009, 6);
                }
                finalChunk = chunk;
            }

            // Final chunk
            expect(finalChunk?.metadata?.usage?.inputTokens).toBe(10);
            expect(finalChunk?.metadata?.usage?.outputTokens).toBe(20);
            expect(finalChunk?.metadata?.usage?.totalTokens).toBe(30);
            expect(finalChunk?.metadata?.usage?.costs.inputCost).toBeCloseTo(0.0003, 6); // 10 tokens at $30/M
            expect(finalChunk?.metadata?.usage?.costs.outputCost).toBeCloseTo(0.0012, 6); // 20 tokens at $60/M
            expect(finalChunk?.metadata?.usage?.costs.totalCost).toBeCloseTo(0.0015, 6);
            expect(chunkCount).toBe(2);
        });

        it('should handle token counting errors gracefully', async () => {
            // Mock tiktoken to throw an error
            jest.mock('@dqbd/tiktoken', () => ({
                encoding_for_model: () => {
                    throw new Error('Tokenization failed');
                }
            }));

            const response = await adapter.chatCall('mock-model-1', params);

            // Should still have token counts from OpenAI response
            expect(response.metadata?.usage?.inputTokens).toBe(10);
            expect(response.metadata?.usage?.outputTokens).toBe(20);
            expect(response.metadata?.usage?.totalTokens).toBe(30);

            // Costs should be calculated correctly despite tokenization error
            expect(response.metadata?.usage?.costs.totalCost).toBeCloseTo(0.0015, 6);
        });
    });
}); 