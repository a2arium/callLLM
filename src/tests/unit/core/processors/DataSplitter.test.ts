import { TokenCalculator } from '../../../../core/models/TokenCalculator';
import { DataSplitter } from '../../../../core/processors/DataSplitter';
import { ModelInfo } from '../../../../interfaces/UniversalInterfaces';

jest.mock('../../../../core/models/TokenCalculator');

describe('DataSplitter', () => {
    let tokenCalculator: jest.Mocked<TokenCalculator>;
    let dataSplitter: DataSplitter;
    let mockModelInfo: ModelInfo;

    beforeEach(() => {
        tokenCalculator = new TokenCalculator() as jest.Mocked<TokenCalculator>;
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
        it('should return single chunk for undefined data', () => {
            const result = dataSplitter.splitIfNeeded({
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

        it('should return single chunk when data fits in available tokens', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: 'small data',
                modelInfo: mockModelInfo,
                maxResponseTokens: 100,
            });

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                content: 'small data',
                tokenCount: 'small data'.length,
                chunkIndex: 0,
                totalChunks: 1,
            });
        });

        it('should handle endingMessage in token calculation', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: 'data',
                endingMessage: 'ending',
                modelInfo: mockModelInfo,
                maxResponseTokens: 100,
            });

            expect(tokenCalculator.calculateTokens).toHaveBeenCalledWith('ending');
            expect(result).toHaveLength(1);
        });
    });

    describe('string data splitting', () => {
        it('should split long string data into chunks', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const longString = 'Paragraph 1\n\nParagraph 2\n\nParagraph 3';

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: longString,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 30 },
                maxResponseTokens: 10,
            });

            expect(result.length).toBeGreaterThan(1);
            expect(result.every(chunk => chunk.tokenCount <= 30)).toBe(true);
            expect(result.every(chunk => typeof chunk.content === 'string')).toBe(true);
        });

        it('should maintain paragraph boundaries when splitting strings', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const paragraphs = 'P1\n\nP2\n\nP3';

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: paragraphs,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 25 },
                maxResponseTokens: 10,
            });

            expect(result.some(chunk => chunk.content.includes('\n\n'))).toBe(false);
        });
    });

    describe('array data splitting', () => {
        it('should split array data into chunks', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const arrayData = [1, 2, 3, 4, 5];

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: arrayData,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 30 },
                maxResponseTokens: 10,
            });

            expect(result.length).toBeGreaterThan(1);
            expect(result.every(chunk => Array.isArray(chunk.content))).toBe(true);
        });

        it('should keep array items intact when splitting', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const arrayData = [{ id: 1, data: 'long data 1' }, { id: 2, data: 'long data 2' }];

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: arrayData,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 30 },
                maxResponseTokens: 10,
            });

            expect(result.every(chunk =>
                chunk.content.every((item: any) =>
                    typeof item === 'object' && 'id' in item && 'data' in item
                )
            )).toBe(true);
        });
    });

    describe('object data splitting', () => {
        it('should split object data into chunks', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const objectData = {
                key1: 'value1',
                key2: 'value2',
                key3: 'value3',
            };

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: objectData,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 30 },
                maxResponseTokens: 10,
            });

            expect(result.length).toBeGreaterThan(1);
            expect(result.every(chunk => typeof chunk.content === 'object')).toBe(true);
        });

        it('should keep key-value pairs intact when splitting', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const objectData = {
                key1: { nested: 'long value 1' },
                key2: { nested: 'long value 2' },
            };

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: objectData,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 30 },
                maxResponseTokens: 10,
            });

            expect(result.every(chunk =>
                Object.values(chunk.content).every((value: any) =>
                    typeof value === 'object' && 'nested' in value
                )
            )).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should handle empty string', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: '',
                modelInfo: mockModelInfo,
                maxResponseTokens: 100,
            });

            expect(result).toHaveLength(1);
            expect(result[0].content).toBe('');
        });

        it('should handle empty array', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: [],
                modelInfo: mockModelInfo,
                maxResponseTokens: 100,
            });

            expect(result[0].content).toEqual([]);
            expect(result[0].tokenCount).toBe(2); // [] is 2 chars
        });

        it('should handle empty object', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: {},
                modelInfo: mockModelInfo,
                maxResponseTokens: 100,
            });

            expect(result[0].content).toEqual({});
            expect(result[0].tokenCount).toBe(2); // {} is 2 chars
        });

        it('should handle very large single items that exceed token limit', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const largeItem = 'x'.repeat(1000);
            const maxTokens = 100;

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: largeItem,
                modelInfo: { ...mockModelInfo, maxRequestTokens: maxTokens },
                maxResponseTokens: 50,
            });

            // Since we split by paragraphs, and this is one large paragraph,
            // it will be treated as a single chunk even if it exceeds the token limit
            expect(result).toHaveLength(1);
            expect(result[0].content).toBe(largeItem);
            expect(result[0].tokenCount).toBe(1000);
        });

        it('should split large text with paragraphs', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const paragraph1 = 'x'.repeat(80);
            const paragraph2 = 'y'.repeat(80);
            const paragraph3 = 'z'.repeat(80);
            const largeText = `${paragraph1}\n\n${paragraph2}\n\n${paragraph3}`;
            const maxTokens = 100;

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: largeText,
                modelInfo: { ...mockModelInfo, maxRequestTokens: maxTokens },
                maxResponseTokens: 50,
            });

            // Each paragraph should be in its own chunk
            expect(result.length).toBeGreaterThan(1);
            expect(result.every(chunk => chunk.tokenCount <= maxTokens)).toBe(true);
        });
    });
}); 