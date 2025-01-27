import { StringSplitter, type SplitOptions } from '../../../../core/processors/StringSplitter';
import { TokenCalculator } from '../../../../core/models/TokenCalculator';

type MockTokenCalculator = {
    calculateTokens: jest.Mock;
};

describe('StringSplitter', () => {
    let tokenCalculator: MockTokenCalculator;
    let stringSplitter: StringSplitter;

    beforeEach(() => {
        tokenCalculator = {
            calculateTokens: jest.fn()
        };
        stringSplitter = new StringSplitter(tokenCalculator as unknown as TokenCalculator);
    });

    describe('split', () => {
        it('should return empty array for empty input', () => {
            const result = stringSplitter.split('', 100);
            expect(result.chunks).toEqual([]);
            expect(result.benchmark.strategy).toBe('fixed');
            expect(result.benchmark.inputLength).toBe(0);
            expect(result.benchmark.inputTokens).toBe(0);
            expect(result.benchmark.outputChunks).toBe(0);
        });

        it('should return single chunk if input tokens are less than max', () => {
            const input = 'Hello world';
            tokenCalculator.calculateTokens.mockReturnValue(5);

            const result = stringSplitter.split(input, 10);

            expect(result.chunks).toEqual(['Hello world']);
            expect(result.benchmark.strategy).toBe('fixed');
            expect(result.benchmark.inputLength).toBe(input.length);
            expect(result.benchmark.inputTokens).toBe(5);
            expect(result.benchmark.outputChunks).toBe(1);
        });

        it('should split text using NLP when appropriate', () => {
            const input = 'This is sentence one. This is sentence two. This is sentence three.';

            // Mock token calculation for different parts of text
            tokenCalculator.calculateTokens.mockImplementation((text: string) => {
                // Return a token count that's proportional to text length but ensures splitting
                return Math.ceil(text.length * 1.5);
            });

            const result = stringSplitter.split(input, 20);

            expect(result.chunks.length).toBeGreaterThan(1);
            expect(result.benchmark.strategy).toBe('nlp');
        });

        it('should use fixed splitting when forceFixedSplit is true', () => {
            const input = 'This is a test sentence that needs to be split into multiple parts.';
            const options: SplitOptions = { forceFixedSplit: true };

            tokenCalculator.calculateTokens
                .mockReturnValueOnce(50) // total text
                .mockReturnValueOnce(20) // first part
                .mockReturnValueOnce(20) // second part
                .mockReturnValueOnce(10); // third part

            const result = stringSplitter.split(input, 15, options);

            expect(result.benchmark.strategy).toBe('fixed');
            expect(result.chunks.length).toBeGreaterThan(1);
        });

        it('should handle very long single words', () => {
            const input = 'supercalifragilisticexpialidocious'.repeat(10);
            tokenCalculator.calculateTokens
                .mockImplementation((text: string) => text.length);

            const result = stringSplitter.split(input, 20);

            expect(result.chunks.length).toBeGreaterThan(1);
            expect(result.chunks.every(chunk =>
                tokenCalculator.calculateTokens(chunk) <= 20
            )).toBe(true);
        });

        it('should skip NLP for text with many unusual symbols', () => {
            // Create a string with many unusual symbols in the first 100 characters
            const unusualSymbols = '@#$%^&*~`+={[}]|\\<>'; // 20 different unusual symbols
            const normalText = ' some normal text here';
            const input = unusualSymbols + normalText;

            // Mock token calculation
            tokenCalculator.calculateTokens
                .mockImplementation((text: string) => text.length);

            const result = stringSplitter.split(input, 50);

            expect(result.benchmark.strategy).toBe('fixed');
        });

        it('should handle text with long number sequences', () => {
            const input = '12345678901234567890 some text here';
            tokenCalculator.calculateTokens
                .mockImplementation((text: string) => text.length);

            const result = stringSplitter.split(input, 15);

            expect(result.benchmark.strategy).toBe('fixed');
            expect(result.chunks.length).toBeGreaterThan(1);
        });

        it('should maintain performance with large inputs', () => {
            const input = 'Test sentence. '.repeat(1000);
            tokenCalculator.calculateTokens
                .mockImplementation((text: string) => text.length);

            const startTime = performance.now();
            const result = stringSplitter.split(input, 100);
            const duration = performance.now() - startTime;

            expect(duration).toBeLessThan(5000); // should complete within 5 seconds
            expect(result.chunks.length).toBeGreaterThan(1);
            expect(result.benchmark.totalTime).toBeGreaterThan(0);
        });
    });
});
