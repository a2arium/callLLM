import { jest, describe, expect, test, beforeAll, beforeEach } from '@jest/globals';
import { ModelInfo } from '../../../../interfaces/UniversalInterfaces.js';

// Declare variables for modules to be dynamically imported
let DataSplitter;
let TokenCalculator;

// Mock variables
const mockCalculateTokens = jest.fn().mockImplementation((text: any) => typeof text === 'string' ? text.length : 0);
const mockTokenCalculator = jest.fn().mockImplementation(() => ({
  calculateTokens: mockCalculateTokens
}));

// Setup mocks before importing actual modules
jest.unstable_mockModule('../../../../core/models/TokenCalculator.js', () => ({
  __esModule: true,
  TokenCalculator: mockTokenCalculator
}));

// Dynamically import modules after mocks are set up
beforeAll(async () => {
  const DataSplitterModule = await import('../../../../core/processors/DataSplitter.js');
  DataSplitter = DataSplitterModule.DataSplitter;
});

describe('DataSplitter', () => {
  let dataSplitter;
  let mockModelInfo: ModelInfo;

  beforeEach(() => {
    // Reset mock functions
    mockCalculateTokens.mockReset();
    // Default implementation to use string length as token count
    mockCalculateTokens.mockImplementation((text: string) => text.length);

    // Create a new DataSplitter instance for each test
    dataSplitter = new DataSplitter(new mockTokenCalculator());

    mockModelInfo = {
      name: 'test-model',
      inputPricePerMillion: 0.1,
      outputPricePerMillion: 0.2,
      maxRequestTokens: 1000,
      maxResponseTokens: 500,
      tokenizationModel: 'test',
      characteristics: {
        qualityIndex: 80,
        outputSpeed: 100,
        firstTokenLatency: 100
      },
      capabilities: {
        streaming: true,
        toolCalls: true,
        parallelToolCalls: true,
        batchProcessing: true,
        input: {
          text: true
        },
        output: {
          text: {
            textOutputFormats: ['text', 'json']
          }
        }
      }
    };
  });

  describe('splitIfNeeded', () => {
    it('should return single chunk for undefined data', async () => {
      const result = await dataSplitter.splitIfNeeded({
        message: 'test',
        data: undefined,
        modelInfo: mockModelInfo,
        maxResponseTokens: 100
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        content: undefined,
        tokenCount: 0,
        chunkIndex: 0,
        totalChunks: 1
      });
    });

    it('should return single chunk when data fits in available tokens', async () => {
      const result = await dataSplitter.splitIfNeeded({
        message: 'test',
        data: 'small data',
        modelInfo: mockModelInfo,
        maxResponseTokens: 100
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
        maxResponseTokens: 100
      });

      expect(mockCalculateTokens).toHaveBeenCalledWith('ending');
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
        modelInfo: { ...mockModelInfo, maxRequestTokens: 1000 }, // Smaller token window
        maxResponseTokens: 100
      });

      expect(result.length).toBeGreaterThan(1);
      expect(result.every((chunk) => chunk.tokenCount <= 1000)).toBe(true);
      expect(result.map((chunk) => chunk.content).join(' ')).toBe(longString);

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
        maxResponseTokens: 20
      });

      expect(result.length).toBeGreaterThan(1);
      expect(result.every((chunk) => Array.isArray(chunk.content))).toBe(true);
      expect(result.flatMap((chunk) => chunk.content)).toHaveLength(array.length);
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
        maxResponseTokens: 20
      });

      expect(result.length).toBeGreaterThan(1);
      expect(result.every((chunk) => typeof chunk.content === 'object')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', async () => {
      const result = await dataSplitter.splitIfNeeded({
        message: 'test',
        data: '',
        modelInfo: mockModelInfo,
        maxResponseTokens: 100
      });

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('');
    });

    it('should handle empty array', async () => {
      const result = await dataSplitter.splitIfNeeded({
        message: 'test',
        data: [],
        modelInfo: mockModelInfo,
        maxResponseTokens: 100
      });

      expect(result[0].content).toEqual([]);
    });

    it('should handle empty object', async () => {
      const result = await dataSplitter.splitIfNeeded({
        message: 'test',
        data: {},
        modelInfo: mockModelInfo,
        maxResponseTokens: 100
      });

      expect(result[0].content).toEqual({});
    });

    it('should handle primitive types', async () => {
      const cases = [
        { input: true, expected: true, tokenCount: 4 },
        { input: 12345, expected: 12345, tokenCount: 5 },
        { input: null, expected: null, tokenCount: 4 }];


      for (const { input, expected, tokenCount } of cases) {
        const result = await dataSplitter.splitIfNeeded({
          message: 'test',
          data: input,
          modelInfo: mockModelInfo,
          maxResponseTokens: 100
        });

        expect(result).toHaveLength(1);
        expect(result[0].content).toBe(expected);
        expect(result[0].tokenCount).toBe(tokenCount);
      }
    });
  });

  describe('maxCharsPerChunk option', () => {
    it('should accept maxCharsPerChunk and not throw', async () => {
      const result = await dataSplitter.splitIfNeeded({
        message: 'test',
        data: 'a'.repeat(100),
        modelInfo: mockModelInfo,
        maxResponseTokens: 10,
        maxCharsPerChunk: 10
      });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('maxCharsPerChunk enforcement', () => {
    it('should split long string by maxCharsPerChunk', async () => {
      const longString = 'a'.repeat(100) + 'b'.repeat(100) + 'c'.repeat(100);
      const result = await dataSplitter.splitIfNeeded({
        message: 'test',
        data: longString,
        modelInfo: mockModelInfo,
        maxResponseTokens: 10,
        maxCharsPerChunk: 100
      });
      expect(result.length).toBeGreaterThan(2);
      expect(result.every((chunk) => chunk.content.length <= 100)).toBe(true);
      expect(result.map((chunk) => chunk.content).join('')).toBe(longString);
    });
    it('should split array by maxCharsPerChunk', async () => {
      const array = Array.from({ length: 20 }, (_, i) => 'x'.repeat(10));
      const result = await dataSplitter.splitIfNeeded({
        message: 'test',
        data: array,
        modelInfo: { ...mockModelInfo, maxRequestTokens: 1000 },
        maxResponseTokens: 10,
        maxCharsPerChunk: 50
      });
      expect(result.length).toBeGreaterThan(1);
      expect(result.every((chunk) => JSON.stringify(chunk.content).length <= 50)).toBe(true);
      expect(result.flatMap((chunk) => chunk.content)).toEqual(array);
    });
    it('should split object by maxCharsPerChunk', async () => {
      const obj = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [
        `k${i}`, 'y'.repeat(20)]
      ));
      const result = await dataSplitter.splitIfNeeded({
        message: 'test',
        data: obj,
        modelInfo: { ...mockModelInfo, maxRequestTokens: 1000 },
        maxResponseTokens: 10,
        maxCharsPerChunk: 60
      });
      expect(result.length).toBeGreaterThan(1);
      expect(result.every((chunk) => JSON.stringify(chunk.content).length <= 60)).toBe(true);
      // Reconstruct the object
      const reconstructed = Object.assign({}, ...result.map((chunk) => chunk.content));
      expect(reconstructed).toEqual(obj);
    });
  });

  describe('maxCharsPerChunk and token limit interaction', () => {
    it('should split by the stricter of token or char limit for strings', async () => {
      // Each 'x' is 1 char and 1 token (mocked);
      const data = 'x'.repeat(50) + 'y'.repeat(50) + 'z'.repeat(50); // 150 chars/tokens
      // Set both limits low
      const modelInfo = { ...mockModelInfo, maxRequestTokens: 40 };
      const result = await dataSplitter.splitIfNeeded({
        message: 'test',
        data,
        modelInfo,
        maxResponseTokens: 10,
        maxCharsPerChunk: 30 // Stricter than tokens in some cases
      });
      // All chunks should be <= 30 chars and <= 40 tokens
      expect(result.length).toBeGreaterThan(1);
      expect(result.every((chunk) => chunk.content.length <= 30)).toBe(true);
      expect(result.every((chunk) => chunk.tokenCount <= 40)).toBe(true);
      expect(result.map((chunk) => chunk.content).join('')).toBe(data);
    });
    it('should split arrays by the stricter of token or char limit', async () => {
      const data = Array.from({ length: 20 }, (_, i) => 'a'.repeat(10));
      const modelInfo = { ...mockModelInfo, maxRequestTokens: 35 };
      const result = await dataSplitter.splitIfNeeded({
        message: 'test',
        data,
        modelInfo,
        maxResponseTokens: 5,
        maxCharsPerChunk: 40
      });
      expect(result.length).toBeGreaterThan(1);
      expect(result.every((chunk) => JSON.stringify(chunk.content).length <= 40)).toBe(true);
      expect(result.every((chunk) => chunk.tokenCount <= 35)).toBe(true);
      expect(result.flatMap((chunk) => chunk.content)).toEqual(data);
    });
    it('should split objects by the stricter of token or char limit', async () => {
      const data = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [
        `k${i}`, 'b'.repeat(10)]
      ));
      const modelInfo = { ...mockModelInfo, maxRequestTokens: 35 };
      const result = await dataSplitter.splitIfNeeded({
        message: 'test',
        data,
        modelInfo,
        maxResponseTokens: 5,
        maxCharsPerChunk: 40
      });
      expect(result.length).toBeGreaterThan(1);
      expect(result.every((chunk) => JSON.stringify(chunk.content).length <= 40)).toBe(true);
      expect(result.every((chunk) => chunk.tokenCount <= 35)).toBe(true);
      // Reconstruct the object
      const reconstructed = Object.assign({}, ...result.map((chunk) => chunk.content));
      expect(reconstructed).toEqual(data);
    });
  });
});