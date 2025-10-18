// @ts-nocheck
import { jest, beforeAll } from '@jest/globals';

// Mock function declarations (MUST be before any imports that use them)
const mockValidate_1 = jest.fn((...args) => args[0]);
const mockValidate_2 = jest.fn();
const mockValidate_3 = jest.fn();
const mockValidate_4 = jest.fn();
const mockValidate_5 = jest.fn();
const mockValidate_6 = jest.fn();
const mockValidate_7 = jest.fn();
const mockValidate_8 = jest.fn();
const mockValidate_9 = jest.fn();
const mockValidate_10 = jest.fn();
const mockValidate_11 = jest.fn();
const mockValidate_12 = jest.fn();
const mockValidate_13 = jest.fn();
const mockValidate_14 = jest.fn();
const mockValidate_15 = jest.fn();
const mockValidate_16 = jest.fn();
const mockGetSchemaObject = jest.fn();

// Mock SchemaValidator (MUST be before any imports that use it)
class MockSchemaValidationError extends Error {
  constructor(
    message,
    public readonly validationErrors = []
  ) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

jest.unstable_mockModule('@/core/schema/SchemaValidator', () => {
  return {
    __esModule: true,
    SchemaValidator: {
      validate: mockValidate_1,
      getSchemaObject: mockGetSchemaObject
    },
    SchemaValidationError: MockSchemaValidationError
  };
});

// Mock UnionTransformer (MUST be before any imports that use it)
const mockFlattenUnions = jest.fn((schema) => ({ schema, mapping: [] }));
const mockUnflattenData = jest.fn((data) => data);

jest.unstable_mockModule('@/core/schema/UnionTransformer', () => {
  return {
    __esModule: true,
    flattenUnions: mockFlattenUnions,
    unflattenData: mockUnflattenData
  };
});

// Import other types and interfaces
import { type UniversalChatResponse, type UniversalChatParams, FinishReason, type ResponseFormat, type ModelInfo } from '@/interfaces/UniversalInterfaces';
import { z } from 'zod';

// Declare variables for modules to be dynamically imported
let ResponseProcessor;
let SchemaValidator;
let SchemaValidationError;

// Import after mocks are set up
beforeAll(async () => {
  const ResponseProcessorModule = await import('@/core/processors/ResponseProcessor');
  ResponseProcessor = ResponseProcessorModule.ResponseProcessor;

  const SchemaValidatorModule = await import('@/core/schema/SchemaValidator');
  SchemaValidator = SchemaValidatorModule.SchemaValidator;
  SchemaValidationError = SchemaValidatorModule.SchemaValidationError;
});

describe('ResponseProcessor', () => {
  let processor: ResponseProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new ResponseProcessor();
    // Default: SchemaValidator.validate returns the first argument (valid content)
    mockValidate_1.mockImplementation((...args) => args[0]);
    // Default: getSchemaObject returns a basic object representation
    mockGetSchemaObject.mockImplementation((schema) => {
      if (typeof schema === 'string') {
        return JSON.parse(schema);
      }
      // For Zod schemas, return a simple object structure
      return { type: 'object', properties: {}, additionalProperties: false };
    });
    // Default: UnionTransformer functions return data unchanged
    mockFlattenUnions.mockImplementation((schema) => ({ schema, mapping: [] }));
    mockUnflattenData.mockImplementation((data) => data);
  });

  describe('validateResponse', () => {
    it('should return response as-is when no special handling needed', async () => {
      const response: UniversalChatResponse = {
        content: 'Hello, world!',
        role: 'assistant'
      };

      const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }],
        model: 'test-model'
      };

      const mockModelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 80,
          outputSpeed: 20,
          firstTokenLatency: 500
        }
      };

      const result = await processor.validateResponse(response, params, mockModelInfo);
      expect(result).toEqual(response);
    });

    it('should parse JSON when responseFormat is json', async () => {
      const jsonContent = { message: 'Hello' };
      const response: UniversalChatResponse = {
        content: JSON.stringify(jsonContent),
        role: 'assistant',
        metadata: { responseFormat: 'json' }
      };

      const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }],
        model: 'test-model',
        responseFormat: 'json'
      };

      const mockModelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 80,
          outputSpeed: 20,
          firstTokenLatency: 500
        }
      };

      const result = await processor.validateResponse(response, params, mockModelInfo);
      expect(result.contentObject).toEqual(jsonContent);
    });

    it('should validate content against Zod schema', async () => {
      const testSchema = z.object({
        name: z.string(),
        age: z.number()
      });

      const validContent = { name: 'test', age: 25 };
      mockValidate_1.mockReturnValueOnce(validContent);

      const response: UniversalChatResponse = {
        content: JSON.stringify(validContent),
        role: 'assistant'
      };

      const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }],
        model: 'test-model',
        responseFormat: 'json',
        jsonSchema: {
          schema: testSchema
        }
      };

      const mockModelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 80,
          outputSpeed: 20,
          firstTokenLatency: 500
        }
      };

      const result = await processor.validateResponse(response, params, mockModelInfo);
      expect(result.contentObject).toEqual(validContent);
      expect(SchemaValidator.validate).toHaveBeenCalledWith(validContent, testSchema);
    });

    it('should handle validation errors', async () => {
      const testSchema = z.object({
        name: z.string(),
        age: z.number()
      });

      const invalidContent = { name: 'test' };
      // Mock must throw BOTH times (validation tries twice: initial + retry with enforcement)
      mockValidate_1.mockImplementation(() => {
        throw new SchemaValidationError('Validation failed', [
          { path: 'age', message: 'Required' }]
        );
      });

      const response: UniversalChatResponse = {
        content: JSON.stringify(invalidContent),
        role: 'assistant'
      };

      const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }],
        model: 'test-model',
        responseFormat: 'json',
        jsonSchema: {
          schema: testSchema
        }
      };

      const mockModelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 80,
          outputSpeed: 20,
          firstTokenLatency: 500
        }
      };

      const result = await processor.validateResponse(response, params, mockModelInfo);
      expect(result.metadata?.validationErrors).toEqual([
        { path: ['age'], message: 'Required' }
      ]);
      expect(result.metadata?.finishReason).toBe(FinishReason.CONTENT_FILTER);
    });

    it('should handle non-SchemaValidationError errors', async () => {
      const testSchema = z.object({
        name: z.string()
      });

      // Mock must throw BOTH times (validation tries twice: initial + retry with enforcement)
      mockValidate_1.mockImplementation(() => {
        throw new Error('Unexpected validation error');
      });

      const response: UniversalChatResponse = {
        content: JSON.stringify({ name: 'test' }),
        role: 'assistant'
      };

      const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }],
        model: 'test-model',
        responseFormat: 'json',
        jsonSchema: {
          schema: testSchema
        }
      };

      const mockModelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 80,
          outputSpeed: 20,
          firstTokenLatency: 500
        }
      };

      await expect(processor.validateResponse(response, params, mockModelInfo)).rejects.toThrow(
        'Failed to validate response: Unexpected validation error'
      );
    });

    it('should handle unknown validation errors', async () => {
      const testSchema = z.object({
        name: z.string()
      });

      // Mock must throw BOTH times (validation tries twice: initial + retry with enforcement)
      mockValidate_1.mockImplementation(() => {
        throw { custom: 'error' }; // Not an Error instance
      });

      const response: UniversalChatResponse = {
        content: JSON.stringify({ name: 'test' }),
        role: 'assistant'
      };

      const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }],
        model: 'test-model',
        responseFormat: 'json',
        jsonSchema: {
          schema: testSchema
        }
      };

      const mockModelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 80,
          outputSpeed: 20,
          firstTokenLatency: 500
        }
      };

      await expect(processor.validateResponse(response, params, mockModelInfo)).rejects.toThrow(
        'Failed to validate response: Unknown error'
      );
    });

    it('should handle wrapped content in named object', async () => {
      const testSchema = z.object({
        name: z.string(),
        age: z.number()
      });

      const validContent = { name: 'test', age: 25 };
      mockValidate_1.mockReturnValueOnce(validContent);

      const response: UniversalChatResponse = {
        role: 'assistant',
        content: JSON.stringify({ userProfile: validContent }),
        metadata: {}
      };

      const params: UniversalChatParams = {
        messages: [],
        model: 'test-model',
        responseFormat: 'json',
        jsonSchema: {
          schema: testSchema,
          name: 'userProfile'
        }
      };

      const mockModelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 80,
          outputSpeed: 20,
          firstTokenLatency: 500
        }
      };

      const result = await processor.validateResponse(response, params, mockModelInfo);
      expect(result.contentObject).toEqual(validContent);
      expect(SchemaValidator.validate).toHaveBeenCalledWith(validContent, testSchema);
    });

    it('should handle case-insensitive schema name matching', async () => {
      const testSchema = z.object({
        name: z.string(),
        age: z.number()
      });

      const validContent = { name: 'test', age: 25 };
      mockValidate_1.mockReturnValueOnce(validContent);

      const response: UniversalChatResponse = {
        role: 'assistant',
        content: JSON.stringify({ UserProfile: validContent }),
        metadata: {}
      };

      const params: UniversalChatParams = {
        messages: [],
        model: 'test-model',
        responseFormat: 'json',
        jsonSchema: {
          schema: testSchema,
          name: 'userProfile'
        }
      };

      const mockModelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 80,
          outputSpeed: 20,
          firstTokenLatency: 500
        }
      };

      const result = await processor.validateResponse(response, params, mockModelInfo);
      expect(result.contentObject).toEqual(validContent);
      expect(SchemaValidator.validate).toHaveBeenCalledWith(validContent, testSchema);
    });

    it('should validate response with schema', async () => {
      const testSchema = z.object({
        name: z.string(),
        age: z.number()
      });

      const validContent = { name: 'test', age: 25 };
      mockValidate_1.mockReturnValueOnce(validContent);

      const response: UniversalChatResponse = {
        content: JSON.stringify(validContent),
        role: 'assistant'
      };

      const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }],
        model: 'test-model',
        responseFormat: 'json',
        jsonSchema: {
          schema: testSchema
        }
      };

      const mockModelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 80,
          outputSpeed: 20,
          firstTokenLatency: 500
        }
      };

      const result = await processor.validateResponse(response, params, mockModelInfo);
      expect(result.contentObject).toEqual(validContent);
      expect(SchemaValidator.validate).toHaveBeenCalledWith(validContent, testSchema);
    });

    it('should validate response without schema', async () => {
      const jsonContent = { message: 'Hello' };
      const response: UniversalChatResponse = {
        content: JSON.stringify(jsonContent),
        role: 'assistant'
      };

      const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }],
        model: 'test-model',
        responseFormat: 'json'
      };

      const mockModelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 80,
          outputSpeed: 20,
          firstTokenLatency: 500
        }
      };

      const result = await processor.validateResponse(response, params, mockModelInfo);
      expect(result.contentObject).toEqual(jsonContent);
      expect(SchemaValidator.validate).not.toHaveBeenCalled();
    });

    it('should return non-JSON response as-is', async () => {
      const response: UniversalChatResponse = {
        content: 'Hello, world!',
        role: 'assistant'
      };

      const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }],
        model: 'test-model'
      };

      const mockModelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 80,
          outputSpeed: 20,
          firstTokenLatency: 500
        }
      };

      const result = await processor.validateResponse(response, params, mockModelInfo);
      expect(result).toEqual(response);
    });

    it('should handle object-style response format', async () => {
      const jsonContent = { message: 'Hello' };
      const response: UniversalChatResponse = {
        content: JSON.stringify(jsonContent),
        role: 'assistant'
      };

      const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }],
        model: 'test-model',
        responseFormat: { type: 'json_object', schema: { type: 'object' } } as ResponseFormat
      };

      const mockModelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 80,
          outputSpeed: 20,
          firstTokenLatency: 500
        }
      };

      const result = await processor.validateResponse(response, params, mockModelInfo);
      expect(result.contentObject).toEqual(jsonContent);
    });

    it('should handle null content in response', async () => {
      const response: UniversalChatResponse = {
        content: null,
        role: 'assistant'
      };

      const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }],
        model: 'test-model',
        responseFormat: 'json'
      };

      const mockModelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 80,
          outputSpeed: 20,
          firstTokenLatency: 500
        }
      };

      await expect(processor.validateResponse(response, params, mockModelInfo)).rejects.toThrow(
        'Failed to parse JSON response: Invalid JSON structure'
      );
    });

    it('should use contentText from stream responses when available', async () => {
      const streamResponse: UniversalChatResponse & { contentText: string } = {
        content: 'original content',
        contentText: JSON.stringify({ name: 'stream_data' }),
        role: 'assistant',
        metadata: { stream: true }
      };

      const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }],
        model: 'test-model',
        responseFormat: 'json'
      };

      const mockModelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 80,
          outputSpeed: 20,
          firstTokenLatency: 500
        }
      };

      const result = await processor.validateResponse(streamResponse, params, mockModelInfo);
      expect(result.contentObject).toEqual({ name: 'stream_data' });
    });

    it('should handle force-prompt JSON mode', async () => {
      const jsonContent = { message: 'Hello' };
      const response: UniversalChatResponse = {
        content: JSON.stringify(jsonContent),
        role: 'assistant'
      };

      const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }],
        model: 'test-model',
        responseFormat: 'json',
        settings: {
          jsonMode: 'force-prompt'
        }
      };

      const mockModelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 80,
          outputSpeed: 20,
          firstTokenLatency: 500
        }
      };

      const result = await processor.validateResponse(response, params, mockModelInfo);
      expect(result.contentObject).toEqual(jsonContent);
    });

    it('should handle response with custom type object responseFormat', async () => {
      const jsonContent = { message: 'Hello' };
      const response: UniversalChatResponse = {
        content: JSON.stringify(jsonContent),
        role: 'assistant'
      };

      const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }],
        model: 'test-model',
        responseFormat: { type: 'json_object', schema: { type: 'object' } } as ResponseFormat
      };

      const mockModelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 80,
          outputSpeed: 20,
          firstTokenLatency: 500
        }
      };

      const result = await processor.validateResponse(response, params, mockModelInfo);
      expect(result.contentObject).toEqual(jsonContent);
    });

    it('should handle non-Error SyntaxError when parsing JSON', async () => {
      const response: UniversalChatResponse = {
        content: '{ invalid json',
        role: 'assistant'
      };

      const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }],
        model: 'test-model',
        responseFormat: 'json'
      };

      const mockModelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 80,
          outputSpeed: 20,
          firstTokenLatency: 500
        }
      };

      await expect(processor.validateResponse(response, params, mockModelInfo)).rejects.toThrow(
        'Failed to parse JSON response: Invalid JSON structure'
      );
    });

    it('should handle schema name matching with nested content', async () => {
      const testSchema = z.object({
        name: z.string(),
        age: z.number()
      });

      const validContent = { name: 'test', age: 25 };
      mockValidate_1.mockReturnValueOnce(validContent);

      // Create a response with nested content that doesn't have the schema name at top level
      const response: UniversalChatResponse = {
        role: 'assistant',
        content: JSON.stringify({
          data: {
            nestedField: {
              userProfile: validContent
            }
          }
        }),
        metadata: {}
      };

      const params: UniversalChatParams = {
        messages: [],
        model: 'test-model',
        responseFormat: 'json',
        jsonSchema: {
          schema: testSchema,
          name: 'userProfile'
        }
      };

      const mockModelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 80,
          outputSpeed: 20,
          firstTokenLatency: 500
        }
      };

      // This should validate the entire parsed content since no matching key is found at top level
      const result = await processor.validateResponse(response, params, mockModelInfo);
      expect(SchemaValidator.validate).toHaveBeenCalled();
    });

    it('should handle null content with log message', async () => {
      const response: UniversalChatResponse = {
        content: null,
        role: 'assistant'
      };

      const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }],
        model: 'test-model'
      };

      const mockModelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 80,
          outputSpeed: 20,
          firstTokenLatency: 500
        }
      };

      // For a null content with no JSON expectations, it should return as-is
      const result = await processor.validateResponse(response, params, mockModelInfo);
      expect(result).toEqual(response);
    });

    it('should extract content from named wrapper with array paths', async () => {
      const testSchema = z.object({
        items: z.array(z.string())
      });

      const validContent = { items: ["one", "two", "three"] };
      mockValidate_1.mockReturnValueOnce(validContent);

      const response: UniversalChatResponse = {
        role: 'assistant',
        content: JSON.stringify({
          itemsList: validContent
        }),
        metadata: {}
      };

      const params: UniversalChatParams = {
        messages: [],
        model: 'test-model',
        responseFormat: 'json',
        jsonSchema: {
          schema: testSchema,
          name: 'itemsList'
        }
      };

      const mockModelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0.02,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 80,
          outputSpeed: 20,
          firstTokenLatency: 500
        }
      };

      const result = await processor.validateResponse(response, params, mockModelInfo);
      expect(result.contentObject).toEqual(validContent);
      expect(SchemaValidator.validate).toHaveBeenCalledWith(validContent, testSchema);
    });

    describe('JSON repair functionality', () => {
      it('should repair and parse slightly malformed JSON without schema', async () => {
        const malformedJson = '{ "name": "test", "age": 25, }'; // trailing comma
        const response: UniversalChatResponse = {
          content: malformedJson,
          role: 'assistant'
        };
        const params: UniversalChatParams = {
          messages: [{ role: 'user', content: 'test message' }],
          model: 'test-model',
          responseFormat: 'json'
        };
        const mockModelInfo: ModelInfo = {
          name: 'test-model',
          inputPricePerMillion: 0.01,
          outputPricePerMillion: 0.02,
          maxRequestTokens: 4000,
          maxResponseTokens: 1000,
          characteristics: {
            qualityIndex: 80,
            outputSpeed: 20,
            firstTokenLatency: 500
          }
        };

        const result = await processor.validateResponse(response, params, mockModelInfo);
        expect(result.contentObject).toEqual({ name: 'test', age: 25 });
        expect(result.metadata?.jsonRepaired).toBe(true);
        expect(result.metadata?.originalContent).toBe(malformedJson);
      });

      it('should repair and parse slightly malformed JSON with schema validation', async () => {
        const testSchema = z.object({
          name: z.string(),
          age: z.number()
        });
        const malformedJson = '{ "name": "test", "age": 25, }'; // trailing comma
        const validContent = { name: 'test', age: 25 };

        mockValidate_1.mockReturnValueOnce(validContent);

        const response: UniversalChatResponse = {
          content: malformedJson,
          role: 'assistant'
        };
        const params: UniversalChatParams = {
          messages: [{ role: 'user', content: 'test message' }],
          model: 'test-model',
          responseFormat: 'json',
          jsonSchema: {
            schema: testSchema
          }
        };
        const mockModelInfo: ModelInfo = {
          name: 'test-model',
          inputPricePerMillion: 0.01,
          outputPricePerMillion: 0.02,
          maxRequestTokens: 4000,
          maxResponseTokens: 1000,
          characteristics: {
            qualityIndex: 80,
            outputSpeed: 20,
            firstTokenLatency: 500
          }
        };

        const result = await processor.validateResponse(response, params, mockModelInfo);
        expect(result.contentObject).toEqual(validContent);
        expect(result.metadata?.jsonRepaired).toBe(true);
        expect(result.metadata?.originalContent).toBe(malformedJson);
        expect(SchemaValidator.validate).toHaveBeenCalledWith(validContent, testSchema);
      });

      it('should handle JSON with trailing commas', async () => {
        const jsonWithTrailingComma = '{ "name": "test", "age": 25, }';
        const response: UniversalChatResponse = {
          content: jsonWithTrailingComma,
          role: 'assistant'
        };
        const params: UniversalChatParams = {
          messages: [{ role: 'user', content: 'test message' }],
          model: 'test-model',
          responseFormat: 'json'
        };
        const mockModelInfo: ModelInfo = {
          name: 'test-model',
          inputPricePerMillion: 0.01,
          outputPricePerMillion: 0.02,
          maxRequestTokens: 4000,
          maxResponseTokens: 1000,
          characteristics: {
            qualityIndex: 80,
            outputSpeed: 20,
            firstTokenLatency: 500
          }
        };

        const result = await processor.validateResponse(response, params, mockModelInfo);
        expect(result.contentObject).toEqual({ name: 'test', age: 25 });
        expect(result.metadata?.jsonRepaired).toBe(true);
      });

      it('should throw error for badly malformed JSON that cannot be repaired', async () => {
        const badJson = 'this is not json at all';
        const response: UniversalChatResponse = {
          content: badJson,
          role: 'assistant'
        };

        const params: UniversalChatParams = {
          messages: [{ role: 'user', content: 'test message' }],
          model: 'test-model',
          responseFormat: 'json'
        };

        const mockModelInfo: ModelInfo = {
          name: 'test-model',
          inputPricePerMillion: 0.01,
          outputPricePerMillion: 0.02,
          maxRequestTokens: 4000,
          maxResponseTokens: 1000,
          characteristics: {
            qualityIndex: 80,
            outputSpeed: 20,
            firstTokenLatency: 500
          }
        };

        await expect(processor.validateResponse(response, params, mockModelInfo)).rejects.toThrow(
          'Failed to parse JSON response: Invalid JSON structure'
        );
      });

      it('should handle schema validation errors after JSON repair', async () => {
        const testSchema = z.object({
          name: z.string(),
          age: z.number()
        });

        const malformedJson = '{ name: "test" }'; // Missing age field
        // Mock must throw BOTH times (validation tries twice: initial + retry with enforcement)
        mockValidate_1.mockImplementation(() => {
          throw new SchemaValidationError('Validation failed', [
            { path: 'age', message: 'Required' }
          ]);
        });

        const response: UniversalChatResponse = {
          content: malformedJson,
          role: 'assistant'
        };

        const params: UniversalChatParams = {
          messages: [{ role: 'user', content: 'test message' }],
          model: 'test-model',
          responseFormat: 'json',
          jsonSchema: {
            schema: testSchema
          }
        };

        const mockModelInfo: ModelInfo = {
          name: 'test-model',
          inputPricePerMillion: 0.01,
          outputPricePerMillion: 0.02,
          maxRequestTokens: 4000,
          maxResponseTokens: 1000,
          characteristics: {
            qualityIndex: 80,
            outputSpeed: 20,
            firstTokenLatency: 500
          }
        };

        const result = await processor.validateResponse(response, params, mockModelInfo);
        expect(result.metadata?.validationErrors).toEqual([
          { path: ['age'], message: 'Required' }
        ]);
        expect(result.metadata?.finishReason).toBe(FinishReason.CONTENT_FILTER);
        expect(result.metadata?.jsonRepaired).toBe(true);
      });
    });

    describe('Handling different error scenarios', () => {
      it('should handle non-SchemaValidationError during validation', async () => {
        const testSchema = z.object({
          name: z.string(),
          age: z.number()
        });

        const validContent = { name: 'test', age: 30 };
        // Mock must throw BOTH times (validation tries twice: initial + retry with enforcement)
        mockValidate_1.mockImplementation(() => {
          throw new Error('Some validation error occurred');
        });

        const response: UniversalChatResponse = {
          content: JSON.stringify(validContent),
          role: 'assistant'
        };

        const params: UniversalChatParams = {
          messages: [{ role: 'user', content: 'test message' }],
          model: 'test-model',
          responseFormat: 'json',
          jsonSchema: {
            schema: testSchema
          }
        };

        const mockModelInfo: ModelInfo = {
          name: 'test-model',
          inputPricePerMillion: 0.01,
          outputPricePerMillion: 0.02,
          maxRequestTokens: 4000,
          maxResponseTokens: 1000,
          characteristics: {
            qualityIndex: 80,
            outputSpeed: 20,
            firstTokenLatency: 500
          }
        };

        await expect(processor.validateResponse(response, params, mockModelInfo)).
          rejects.toThrow('Failed to validate response: Some validation error occurred');
      });

      it('should handle unknown errors during validation', async () => {
        const testSchema = z.object({
          name: z.string()
        });

        // Mock must throw BOTH times (validation tries twice: initial + retry with enforcement)
        mockValidate_1.mockImplementation(() => {
          throw { custom: 'error' }; // Not an Error instance
        });

        const response: UniversalChatResponse = {
          content: JSON.stringify({ name: 'test' }),
          role: 'assistant'
        };

        const params: UniversalChatParams = {
          messages: [{ role: 'user', content: 'test message' }],
          model: 'test-model',
          responseFormat: 'json',
          jsonSchema: {
            schema: testSchema
          }
        };

        const mockModelInfo: ModelInfo = {
          name: 'test-model',
          inputPricePerMillion: 0.01,
          outputPricePerMillion: 0.02,
          maxRequestTokens: 4000,
          maxResponseTokens: 1000,
          characteristics: {
            qualityIndex: 80,
            outputSpeed: 20,
            firstTokenLatency: 500
          }
        };

        await expect(processor.validateResponse(response, params, mockModelInfo)).
          rejects.toThrow('Failed to validate response: Unknown error');
      });
    });
  });

  describe('parseJson', () => {
    it('should parse valid JSON string', async () => {
      const jsonContent = { message: 'Hello' };
      const response: UniversalChatResponse = {
        content: JSON.stringify(jsonContent),
        role: 'assistant'
      };

      const result = await processor['parseJson'](response);
      expect(result.contentObject).toEqual(jsonContent);
    });

    it('should handle malformed JSON', async () => {
      const response: UniversalChatResponse = {
        content: '{ "message": "Hello"', // Missing closing brace
        role: 'assistant'
      };

      await expect(processor['parseJson'](response)).rejects.toThrow('Failed to parse JSON response');
    });

    it('should handle unknown JSON parsing errors', async () => {
      const response: UniversalChatResponse = {
        content: '{}',
        role: 'assistant'
      };

      // Mock JSON.parse to throw a non-Error object
      jest.spyOn(JSON, 'parse').mockImplementationOnce(() => {
        throw { toString: () => 'Unknown error' }; // Non-Error object that will result in 'Unknown error'
      });

      await expect(processor['parseJson'](response)).rejects.toThrow(
        'Failed to parse JSON response: Unknown error'
      );
    });
  });

  describe('validateJsonMode', () => {
    it('should return usePromptInjection: false when model has native JSON support', () => {
      const model: ModelInfo = {
        name: 'test-model',
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
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        maxRequestTokens: 1000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 1,
          outputSpeed: 1,
          firstTokenLatency: 1
        }
      };
      const params: UniversalChatParams = {
        messages: [],
        model: 'test-model',
        responseFormat: 'json'
      };
      expect(processor.validateJsonMode(model, params)).toEqual({ usePromptInjection: false });
    });

    it('should throw error when model does not have native JSON support and fallback is disabled', () => {
      const model: ModelInfo = {
        name: 'test-model',
        capabilities: {
          input: {
            text: true
          },
          output: {
            text: {
              textOutputFormats: ['text']
            }
          }
        },
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        maxRequestTokens: 1000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 1,
          outputSpeed: 1,
          firstTokenLatency: 1
        }
      };
      const params: UniversalChatParams = {
        messages: [],
        model: 'test-model',
        responseFormat: 'json',
        settings: {
          jsonMode: 'native-only'
        }
      };
      expect(() => processor.validateJsonMode(model, params)).toThrow(
        'Selected model does not support native JSON mode and native-only mode is required'
      );
    });

    it('should return usePromptInjection: true when model does not have native JSON support but fallback is enabled', () => {
      const model: ModelInfo = {
        name: 'test-model',
        capabilities: {
          input: {
            text: true
          },
          output: {
            text: {
              textOutputFormats: ['text']
            }
          }
        },
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        maxRequestTokens: 1000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 1,
          outputSpeed: 1,
          firstTokenLatency: 1
        }
      };
      const params: UniversalChatParams = {
        messages: [],
        model: 'test-model',
        responseFormat: 'json',
        settings: {
          jsonMode: 'fallback'
        }
      };
      expect(processor.validateJsonMode(model, params)).toEqual({ usePromptInjection: true });
    });

    it('should handle force-prompt JSON mode', async () => {
      const model: ModelInfo = {
        name: 'test-model',
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
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        maxRequestTokens: 1000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 1,
          outputSpeed: 1,
          firstTokenLatency: 1
        }
      };
      const params: UniversalChatParams = {
        messages: [],
        model: 'test-model',
        responseFormat: 'json',
        settings: {
          jsonMode: 'force-prompt'
        }
      };
      expect(processor.validateJsonMode(model, params)).toEqual({ usePromptInjection: true });
    });

    it('should return false when no JSON is requested', () => {
      const model: ModelInfo = {
        name: 'test-model',
        capabilities: {
          input: {
            text: true
          },
          output: {
            text: {
              textOutputFormats: ['text']
            }
          }
        },
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        maxRequestTokens: 1000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 1,
          outputSpeed: 1,
          firstTokenLatency: 1
        }
      };
      const params: UniversalChatParams = {
        messages: [],
        model: 'test-model'
      };
      expect(processor.validateJsonMode(model, params)).toEqual({ usePromptInjection: false });
    });
  });

  describe('validateWithSchema', () => {
    it('should validate JSON with schema successfully', async () => {
      const testSchema = z.object({
        name: z.string(),
        age: z.number()
      });

      const validContent = { name: 'test', age: 25 };
      mockValidate_1.mockReturnValueOnce(validContent);

      const response: UniversalChatResponse = {
        content: JSON.stringify(validContent),
        role: 'assistant'
      };

      const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }],
        model: 'test-model'
      };

      const result = await processor['validateWithSchema'](response, { schema: testSchema }, params);
      expect(result.contentObject).toEqual(validContent);
      expect(SchemaValidator.validate).toHaveBeenCalledWith(validContent, testSchema);
    });

    it('should handle stream responses with contentText', async () => {
      const testSchema = z.object({
        name: z.string(),
        age: z.number()
      });

      const validContent = { name: 'test', age: 25 };
      mockValidate_1.mockReturnValueOnce(validContent);

      const response: any = {
        content: 'original content',
        contentText: JSON.stringify(validContent),
        role: 'assistant'
      };

      const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }],
        model: 'test-model'
      };

      const result = await processor['validateWithSchema'](response, { schema: testSchema }, params);
      expect(result.contentObject).toEqual(validContent);
      expect(SchemaValidator.validate).toHaveBeenCalledWith(validContent, testSchema);
    });

    it('should throw error for unparseable JSON', async () => {
      const testSchema = z.object({
        name: z.string(),
        age: z.number()
      });

      const response: UniversalChatResponse = {
        content: 'not json',
        role: 'assistant'
      };

      const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }],
        model: 'test-model'
      };

      await expect(processor['validateWithSchema'](response, { schema: testSchema }, params)).
        rejects.toThrow('Failed to parse JSON response: Invalid JSON structure');
    });

    it('should handle SchemaValidationError', async () => {
      const testSchema = z.object({
        name: z.string(),
        age: z.number()
      });

      const invalidContent = { name: 'test' };
      mockValidate_1.mockImplementationOnce(() => {
        throw new SchemaValidationError('Validation failed', [
          { path: 'age', message: 'Required' }
        ]);
      });

      const response: UniversalChatResponse = {
        content: JSON.stringify(invalidContent),
        role: 'assistant'
      };

      const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }],
        model: 'test-model'
      };

      const result = await processor['validateWithSchema'](response, { schema: testSchema }, params);
      expect(result.metadata?.validationErrors).toEqual([
        { message: 'Required', path: ['age'] }
      ]);
      expect(result.metadata?.finishReason).toBe(FinishReason.CONTENT_FILTER);
    });

    it('should handle non-SchemaValidationError', async () => {
      const testSchema = z.object({
        name: z.string(),
        age: z.number()
      });

      const validContent = { name: 'test', age: 25 };
      mockValidate_1.mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const response: UniversalChatResponse = {
        content: JSON.stringify(validContent),
        role: 'assistant'
      };

      const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }],
        model: 'test-model'
      };

      await expect(processor['validateWithSchema'](response, { schema: testSchema }, params)).
        rejects.toThrow('Failed to validate response: Unexpected error');
    });

    it('should handle string-only paths in validation errors', async () => {
      const testSchema = z.object({
        name: z.string(),
        age: z.number()
      });

      const invalidContent = { name: 'test' };
      mockValidate_1.mockImplementationOnce(() => {
        throw new SchemaValidationError('Validation failed', [
          { path: 'age', message: 'Required' }
        ]);
      });

      const response: UniversalChatResponse = {
        content: JSON.stringify(invalidContent),
        role: 'assistant'
      };

      const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }],
        model: 'test-model'
      };

      const result = await processor['validateWithSchema'](response, { schema: testSchema }, params);
      expect(result.metadata?.validationErrors).toEqual([
        { message: 'Required', path: ['age'] }
      ]);
    });

    it('should handle JSON parsing error during validation', async () => {
      const testSchema = z.object({
        name: z.string(),
        age: z.number()
      });

      const response: UniversalChatResponse = {
        content: '{ invalid json',
        role: 'assistant'
      };

      const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test message' }],
        model: 'test-model'
      };

      await expect(processor['validateWithSchema'](response, { schema: testSchema }, params)).
        rejects.toThrow('Failed to parse JSON response: Invalid JSON structure');
    });
  });

  describe('isLikelyRepairable', () => {
    it('should identify repairable JSON', () => {
      const repairableJson = '{ name: "test", age: 25 }'; // Missing quotes around property names
      expect(processor['isLikelyRepairable'](repairableJson)).toBe(true);
    });

    it('should identify unrepairable text', () => {
      const unrepairableText = 'this is not json at all';
      expect(processor['isLikelyRepairable'](unrepairableText)).toBe(false);
    });
  });

  describe('repairJson', () => {
    it('should repair malformed JSON', () => {
      const malformedJson = '{ name: "test", age: 25 }'; // Missing quotes around property names
      const result = processor['repairJson'](malformedJson);
      expect(JSON.parse(result!)).toEqual({ name: 'test', age: 25 });
    });

    it('should return undefined for null input', () => {
      const result = processor['repairJson'](null);
      expect(result).toBeUndefined();
    });

    it('should handle unrepairable input', () => {
      const unrepairableInput = 'completely broken';
      const result = processor['repairJson'](unrepairableInput);
      expect(result).toBe('"completely broken"');
    });
  });
});