import { TokenCalculator } from '../../../../core/models/TokenCalculator';
import { DataSplitter } from '../../../../core/processors/DataSplitter';
import { ModelInfo } from '../../../../interfaces/UniversalInterfaces';
import { describe, expect, test } from '@jest/globals';

jest.mock('../../../../core/models/TokenCalculator');

describe('DataSplitter', () => {
    let tokenCalculator: jest.Mocked<TokenCalculator>;
    let dataSplitter: DataSplitter;
    let mockModelInfo: ModelInfo;

    beforeEach(() => {
        tokenCalculator = new TokenCalculator() as jest.Mocked<TokenCalculator>;
        tokenCalculator.calculateTokens.mockImplementation((text: string) => text.length);
        dataSplitter = new DataSplitter(tokenCalculator);
        mockModelInfo = {
            name: 'test-model',
            maxRequestTokens: 1000,
            maxResponseTokens: 500,
            inputPricePerMillion: 0.01,
            outputPricePerMillion: 0.02,
            characteristics: {
                qualityIndex: 80,
                outputSpeed: 100,
                firstTokenLatency: 100,
            },
            jsonMode: true,
        };
    });

    describe('splitIfNeeded', () => {
        it('should return single chunk for undefined data', async () => {
            const result = await dataSplitter.splitIfNeeded({
                message: 'test',
                data: undefined,
                modelInfo: mockModelInfo,
                maxResponseTokens: 100,
            });

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                content: undefined,
                tokenCount: 0,
                chunkIndex: 0,
                totalChunks: 1,
            });
        });

        it('should return single chunk when data fits in available tokens', async () => {
            const result = await dataSplitter.splitIfNeeded({
                message: 'test',
                data: 'small data',
                modelInfo: mockModelInfo,
                maxResponseTokens: 100,
            });

            expect(result).toHaveLength(1);
            expect(result[0].content).toBe('small data');
        });

        it('should handle endingMessage in token calculation', async () => {
            const result = await dataSplitter.splitIfNeeded({
                message: 'test',
                data: 'data',
                endingMessage: 'ending',
                modelInfo: mockModelInfo,
                maxResponseTokens: 100,
            });

            expect(tokenCalculator.calculateTokens).toHaveBeenCalledWith('ending');
        });
    });

    describe('string splitting', () => {
        it('should split long string into chunks', async () => {
            const sampleText = 'This is the first sentence. This is the second sentence with more content. ' +
                'Here comes the third sentence which is even longer to ensure splitting. ' +
                'And this is the fourth sentence that adds more text to exceed the limit. ' +
                'Finally, this fifth sentence should definitely cause the text to be split into chunks.';

            // Repeat the text 20 times to make it much longer
            const longString = Array(20).fill(sampleText).join(' ') +
                ' Additional unique sentence at the end to verify proper splitting.';

            const result = await dataSplitter.splitIfNeeded({
                message: 'test',
                data: longString,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 1000 },  // Smaller token window
                maxResponseTokens: 100,
            });

            expect(result.length).toBeGreaterThan(1);
            expect(result.every(chunk => chunk.tokenCount <= 1000)).toBe(true);
            expect(result.map(chunk => chunk.content).join(' ')).toBe(longString);

            // Additional assertions to verify chunk properties
            expect(result[0].chunkIndex).toBe(0);
            expect(result[result.length - 1].chunkIndex).toBe(result.length - 1);
            expect(result[0].totalChunks).toBe(result.length);
        });
    });

    describe('array splitting', () => {
        it('should split array into chunks', async () => {
            const array = Array.from({ length: 5 }, (_, i) => 'item-' + String(i).repeat(20));
            const result = await dataSplitter.splitIfNeeded({
                message: 'test',
                data: array,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 50 },
                maxResponseTokens: 20,
            });

            expect(result.length).toBeGreaterThan(1);
            expect(result.every(chunk => Array.isArray(chunk.content))).toBe(true);
            expect(result.flatMap(chunk => chunk.content)).toHaveLength(array.length);
        });
    });

    describe('object splitting', () => {
        it('should delegate object splitting to RecursiveObjectSplitter', async () => {
            const obj = {
                key1: 'a'.repeat(50),
                key2: 'b'.repeat(50)
            };

            const result = await dataSplitter.splitIfNeeded({
                message: 'test',
                data: obj,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 50 },
                maxResponseTokens: 20,
            });

            expect(result.length).toBeGreaterThan(1);
            expect(result.every(chunk => typeof chunk.content === 'object')).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should handle empty string', async () => {
            const result = await dataSplitter.splitIfNeeded({
                message: 'test',
                data: '',
                modelInfo: mockModelInfo,
                maxResponseTokens: 100,
            });

            expect(result).toHaveLength(1);
            expect(result[0].content).toBe('');
        });

        it('should handle empty array', async () => {
            const result = await dataSplitter.splitIfNeeded({
                message: 'test',
                data: [],
                modelInfo: mockModelInfo,
                maxResponseTokens: 100,
            });

            expect(result[0].content).toEqual([]);
        });

        it('should handle empty object', async () => {
            const result = await dataSplitter.splitIfNeeded({
                message: 'test',
                data: {},
                modelInfo: mockModelInfo,
                maxResponseTokens: 100,
            });

            expect(result[0].content).toEqual({});
        });

        it('should handle primitive types', async () => {
            const cases = [
                { input: true, expected: true, tokenCount: 4 },
                { input: 12345, expected: 12345, tokenCount: 5 },
                { input: null, expected: null, tokenCount: 4 }
            ];

            for (const { input, expected, tokenCount } of cases) {
                const result = await dataSplitter.splitIfNeeded({
                    message: 'test',
                    data: input,
                    modelInfo: mockModelInfo,
                    maxResponseTokens: 100,
                });

                expect(result).toHaveLength(1);
                expect(result[0].content).toBe(expected);
                expect(result[0].tokenCount).toBe(tokenCount);
            }
        });
    });
});

