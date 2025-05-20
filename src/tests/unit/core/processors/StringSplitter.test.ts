import { StringSplitter, type SplitOptions } from '../../../../core/processors/StringSplitter.js';
import { TokenCalculator } from '../../../../core/models/TokenCalculator.js';

type MockTokenCalculator = {
    calculateTokens: jest.Mock;
    calculateUsage: jest.Mock;
    calculateTotalTokens: jest.Mock;
};

describe('StringSplitter', () => {
    let stringSplitter: StringSplitter;
    let tokenCalculator: TokenCalculator;

    beforeEach(() => {
        tokenCalculator = {
            calculateTokens: jest.fn(),
            calculateUsage: jest.fn(),
            calculateTotalTokens: jest.fn()
        };
        stringSplitter = new StringSplitter(tokenCalculator);
    });

    it('should handle empty input', () => {
        const input = '';
        (tokenCalculator.calculateTokens as jest.Mock).mockReturnValue(0);

        const result = stringSplitter.split(input, 10);

        expect(result).toEqual([]);
    });

    it('should return single chunk for small input', () => {
        const input = 'Hello world';
        (tokenCalculator.calculateTokens as jest.Mock).mockReturnValue(5);

        const result = stringSplitter.split(input, 10);

        expect(result).toEqual(['Hello world']);
    });

    it('should split text using smart strategy when appropriate', () => {
        const input = 'This is a first sentence. This is a second sentence.';
        (tokenCalculator.calculateTokens as jest.Mock).mockImplementation((text: string) => {
            if (text === input) return 50;
            return 12;
        });

        const result = stringSplitter.split(input, 10);

        expect(result.length).toBeGreaterThan(1);
    });

    it('should use fixed splitting when forceFixedSplit is true', () => {
        const input = 'This is a first sentence. This is a second sentence.';
        (tokenCalculator.calculateTokens as jest.Mock).mockImplementation((text: string) => {
            if (text === input) return 50;
            return 20;
        });

        const result = stringSplitter.split(input, 10, { forceFixedSplit: true });

        expect(result.length).toBeGreaterThan(1);
    });

    it('should handle long single word', () => {
        const input = 'supercalifragilisticexpialidocious';
        (tokenCalculator.calculateTokens as jest.Mock).mockImplementation((text: string) => {
            // Return token count proportional to text length
            return Math.ceil(text.length / 2);
        });

        const result = stringSplitter.split(input, 10);

        expect(result.length).toBeGreaterThan(1);
        expect(result.every(chunk =>
            tokenCalculator.calculateTokens(chunk) <= 10
        )).toBe(true);
    });

    it('should skip smart split for text with many unusual symbols', () => {
        const input = '@#$%^&*~`+={[}]|\\<>@#$%^&*~`+={[}]|\\<> some normal text here';
        (tokenCalculator.calculateTokens as jest.Mock).mockReturnValue(20);

        const result = stringSplitter.split(input, 10);

        expect(result.length).toBeGreaterThan(1);
    });

    it('should handle large input efficiently', () => {
        const input = 'a'.repeat(15000);
        (tokenCalculator.calculateTokens as jest.Mock).mockReturnValue(15000);

        const result = stringSplitter.split(input, 100);

        expect(result.length).toBeGreaterThan(1);
    });
});
