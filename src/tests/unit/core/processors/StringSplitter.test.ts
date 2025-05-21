import { jest } from '@jest/globals';
import { StringSplitter, type SplitOptions } from '../../../../core/processors/StringSplitter.js';
import { TokenCalculator } from '../../../../core/models/TokenCalculator.js';

// Mock function declarations
// const mockCalculateTokens = jest.fn(); // This was unused and can be removed
const mockCalculateTokens_1 = jest.fn(); // Corrected line, though now unused as tokenCalculator.calculateTokens is mocked directly

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
    } as unknown as TokenCalculator;
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
    (tokenCalculator.calculateTokens as jest.MockedFunction<any>).mockImplementation((text: string) => {
      if (text === input) return 50;
      if (text.startsWith('This is a first')) return 12;
      if (text.startsWith('This is a second')) return 12;
      return text.length;
    });

    const result = stringSplitter.split(input, 10);

    expect(result.length).toBeGreaterThan(1);
    result.forEach(chunk => {
      expect((tokenCalculator.calculateTokens as jest.Mock)(chunk)).toBeLessThanOrEqual(10 + 5);
    });
  });

  it('should use fixed splitting when forceFixedSplit is true', () => {
    const input = 'This is a first sentence. This is a second sentence.';
    (tokenCalculator.calculateTokens as jest.MockedFunction<any>).mockImplementation((text: string) => {
      return text.length;
    });

    const result = stringSplitter.split(input, 10, { forceFixedSplit: true });

    expect(result.length).toBeGreaterThan(1);
    result.forEach(chunk => {
      expect(chunk.length).toBeLessThanOrEqual(10);
    });
  });

  it('should handle long single word', () => {
    const input = 'supercalifragilisticexpialidocious';
    (tokenCalculator.calculateTokens as jest.MockedFunction<any>).mockImplementation((text: string) => {
      return Math.ceil(text.length / 2);
    });

    const result = stringSplitter.split(input, 10);

    expect(result.length).toBeGreaterThan(1);
    result.forEach(chunk => {
      expect((tokenCalculator.calculateTokens as jest.Mock)(chunk)).toBeLessThanOrEqual(10 + 5);
    });
  });

  it('should skip smart split for text with many unusual symbols', () => {
    const input = '@#$%^&*~`+={[}]|\\<>@#$%^&*~`+={[}]|\\<> some normal text here';
    (tokenCalculator.calculateTokens as jest.MockedFunction<any>).mockImplementation((text: string) => text.length);

    const result = stringSplitter.split(input, 10);

    expect(result.length).toBeGreaterThan(1);
    result.forEach(chunk => {
      expect((tokenCalculator.calculateTokens as jest.Mock)(chunk)).toBeLessThanOrEqual(10 + 5);
    });
  });

  it('should handle large input efficiently', () => {
    const input = 'a'.repeat(15000);
    (tokenCalculator.calculateTokens as jest.MockedFunction<any>).mockImplementation((text: string) => text.length);

    const result = stringSplitter.split(input, 100);

    expect(result.length).toBeGreaterThan(1);
    result.forEach(chunk => {
      expect((tokenCalculator.calculateTokens as jest.Mock)(chunk)).toBeLessThanOrEqual(100 + 50);
    });
  });
});