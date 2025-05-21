import { jest } from "@jest/globals";import { RequestProcessor } from '../../../../core/processors/RequestProcessor.js';
import { ModelInfo } from '../../../../interfaces/UniversalInterfaces.js';

describe('RequestProcessor', () => {
  let processor: RequestProcessor;
  const mockModel: ModelInfo = {
    name: 'test-model',
    inputPricePerMillion: 1,
    outputPricePerMillion: 2,
    maxRequestTokens: 4000,
    maxResponseTokens: 1000,
    tokenizationModel: 'gpt-4',
    capabilities: {
      input: {
        text: true
      },
      output: {
        text: {
          textOutputFormats: ['text', 'json']
        }
      }
    },
    characteristics: {
      qualityIndex: 80,
      outputSpeed: 50,
      firstTokenLatency: 0.5
    }
  };

  beforeEach(() => {
    processor = new RequestProcessor();
  });

  it('should process message only', async () => {
    const result = await processor.processRequest({
      message: 'Hello world',
      model: mockModel
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Hello world');
  });

  it('should process message with string data', async () => {
    const result = await processor.processRequest({
      message: 'Hello world',
      data: 'Additional data',
      model: mockModel
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Hello world\n\nAdditional data');
  });

  it('should process message with object data', async () => {
    const data = { key: 'value', nested: { prop: 123 } };
    const result = await processor.processRequest({
      message: 'Hello world',
      data,
      model: mockModel
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Hello world\n\n{\n  "key": "value",\n  "nested": {\n    "prop": 123\n  }\n}');
  });

  it('should process message with ending message', async () => {
    const result = await processor.processRequest({
      message: 'Hello world',
      endingMessage: 'Goodbye',
      model: mockModel
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Hello world\n\nGoodbye');
  });

  it('should process message with data and ending message', async () => {
    const data = { key: 'value' };
    const result = await processor.processRequest({
      message: 'Hello world',
      data,
      endingMessage: 'Goodbye',
      model: mockModel
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Hello world\n\n{\n  "key": "value"\n}\n\nGoodbye');
  });

  it('should handle non-object data', async () => {
    const result = await processor.processRequest({
      message: 'Hello world',
      data: 123,
      model: mockModel
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Hello world\n\n123');
  });

  it('should handle undefined data', async () => {
    const result = await processor.processRequest({
      message: 'Hello world',
      data: undefined,
      model: mockModel
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Hello world');
  });
});