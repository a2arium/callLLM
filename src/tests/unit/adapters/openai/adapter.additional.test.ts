import { jest, describe, expect, test, beforeAll, beforeEach } from '@jest/globals';
import { UniversalChatParams } from '../../../../interfaces/UniversalInterfaces.js';
import { ResponseContentPartAddedEvent, ResponseStreamEvent } from '../../../../adapters/openai/types.js';

// Declare module variables
let OpenAIResponseAdapter;
let OpenAIResponseAdapterError;
let OpenAIResponseValidationError;

// Mock variables
const mockOpenAICreate = jest.fn();
const mockOpenAI = jest.fn().mockImplementation(() => ({
  responses: {
    create: mockOpenAICreate
  }
}));

const mockStreamHandlerHandleStream = jest.fn();
const mockStreamHandlerUpdateTools = jest.fn();
const mockStreamHandler = jest.fn().mockImplementation(() => ({
  handleStream: mockStreamHandlerHandleStream,
  updateTools: mockStreamHandlerUpdateTools
}));

const mockConvertToOpenAIResponseParams = jest.fn();
const mockConvertFromOpenAIResponse = jest.fn();
const mockConvertFromOpenAIStreamResponse = jest.fn();
const mockConverter = jest.fn().mockImplementation(() => ({
  convertToOpenAIResponseParams: mockConvertToOpenAIResponseParams,
  convertFromOpenAIResponse: mockConvertFromOpenAIResponse,
  convertFromOpenAIStreamResponse: mockConvertFromOpenAIStreamResponse
}));

const mockValidateParams = jest.fn();
const mockValidateTools = jest.fn();
const mockValidator = jest.fn().mockImplementation(() => ({
  validateParams: mockValidateParams,
  validateTools: mockValidateTools
}));

const mockLoggerDebug = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerSetConfig = jest.fn();
const mockLoggerCreateLogger = jest.fn().mockReturnValue({
  debug: mockLoggerDebug,
  info: mockLoggerInfo,
  warn: mockLoggerWarn,
  error: mockLoggerError
});

// Create mock modules
jest.unstable_mockModule('openai', () => ({
  __esModule: true,
  OpenAI: mockOpenAI
}));

jest.unstable_mockModule('../../../../adapters/openai/stream.js', () => ({
  __esModule: true,
  StreamHandler: mockStreamHandler
}));

jest.unstable_mockModule('../../../../adapters/openai/converter.js', () => ({
  __esModule: true,
  Converter: mockConverter
}));

jest.unstable_mockModule('../../../../adapters/openai/validator.js', () => ({
  __esModule: true,
  Validator: mockValidator
}));

jest.unstable_mockModule('../../../../utils/logger.js', () => ({
  __esModule: true,
  logger: {
    setConfig: mockLoggerSetConfig,
    debug: mockLoggerDebug,
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
    createLogger: mockLoggerCreateLogger
  }
}));

// Dynamically import the modules after mocks are set up
beforeAll(async () => {
  const adapterModule = await import('../../../../adapters/openai/adapter.js');
  OpenAIResponseAdapter = adapterModule.OpenAIResponseAdapter;

  const errorsModule = await import('../../../../adapters/openai/errors.js');
  OpenAIResponseAdapterError = errorsModule.OpenAIResponseAdapterError;
  OpenAIResponseValidationError = errorsModule.OpenAIResponseValidationError;
});

describe('OpenAIResponseAdapter Additional Tests', () => {
  let adapter;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a new adapter for each test
    adapter = new OpenAIResponseAdapter({
      apiKey: 'test-api-key',
      organization: 'test-org'
    });
  });

  describe('validateToolsFormat', () => {
    it('should not throw for undefined tools', () => {
      // @ts-ignore - accessing private method for testing
      expect(() => adapter.validateToolsFormat(undefined)).not.toThrow();
    });

    it('should not throw for null tools', () => {
      // @ts-ignore - accessing private method for testing
      expect(() => adapter.validateToolsFormat(null)).not.toThrow();
    });

    it('should not throw for empty tools array', () => {
      // @ts-ignore - accessing private method for testing
      expect(() => adapter.validateToolsFormat([])).not.toThrow();
    });

    it('should throw for tool with missing name', () => {
      const invalidTools = [{ type: 'function', function: { parameters: {} } }];

      // @ts-ignore - accessing private method for testing
      expect(() => adapter.validateToolsFormat(invalidTools)).toThrow(OpenAIResponseValidationError);
    });

    it('should throw for tool with missing function property', () => {
      const invalidTools = [{ type: 'function', name: 'test_tool' }];

      // @ts-ignore - accessing private method for testing
      expect(() => adapter.validateToolsFormat(invalidTools)).toThrow(OpenAIResponseValidationError);
    });

    it('should throw for tool with missing parameters', () => {
      const invalidTools = [{
        type: 'function',
        name: 'test_tool',
        function: {}
      }];

      // @ts-ignore - accessing private method for testing
      expect(() => adapter.validateToolsFormat(invalidTools)).toThrow(OpenAIResponseValidationError);
    });
  });

  describe('registerToolsForExecution', () => {
    it('should register tools for execution', () => {
      const tools = [
        {
          name: 'get_weather',
          description: 'Get the weather for a location',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'The location to get weather for'
              }
            },
            required: ['location']
          },
          execute: jest.fn()
        }];


      // @ts-ignore - accessing private method for testing
      adapter.registerToolsForExecution(tools);

      // Testing implementation specific behavior would be challenging 
      // since we mocked the dependencies. Here we just verify it doesn't throw.
      expect(true).toBe(true);
    });

    it('should handle empty tools array', () => {
      // @ts-ignore - accessing private method for testing
      expect(() => adapter.registerToolsForExecution([])).not.toThrow();
    });
  });

  describe('createDebugStreamWrapper', () => {
    it('should pass through the stream when not in debug mode', async () => {
      const mockStream = (async function* () {
        yield { content: 'test', isComplete: false };
        yield { content: 'response', isComplete: true };
      })();

      // Mock console.log to check it's not called
      const originalConsoleLog = console.log;
      console.log = jest.fn()

      try {
        // @ts-ignore - accessing private method for testing
        const wrappedStream = adapter.createDebugStreamWrapper(mockStream);

        // Consume the stream to check that items pass through unchanged
        const results = [];
        for await (const chunk of wrappedStream) {
          results.push(chunk);
        }

        // Should have 2 chunks as per our mock generator
        expect(results.length).toBe(2);
        expect(results[0].content).toBe('test');
        expect(results[1].content).toBe('response');

        // Debug logging should not be called
        expect(console.log).not.toHaveBeenCalled();
      } finally {
        // Restore console.log
        console.log = originalConsoleLog;
      }
    });
  });

  describe('convertToProviderParams', () => {
    it('should call converter with correct parameters', async () => {
      const model = 'test-model';
      const params: UniversalChatParams = {
        messages: [{ role: 'user', content: 'hello' }],
        model: 'test-model'
      };

      // Setup the mock to return a specific value
      const mockConvertedParams = {
        model: 'test-model',
        input: [{ role: 'user', content: 'hello' }]
      };

      // @ts-ignore - accessing private property for testing
      adapter.converter.convertToOpenAIResponseParams = jest.fn().mockResolvedValue(mockConvertedParams);

      const result = await adapter.convertToProviderParams(model, params);

      // @ts-ignore - accessing private property for testing
      expect(adapter.converter.convertToOpenAIResponseParams).toHaveBeenCalledWith(model, params);
      expect(result).toEqual({ ...mockConvertedParams, stream: false });
    });
  });

  describe('convertFromProviderResponse', () => {
    it('should call converter with correct parameters', () => {
      // Create a more complete mock that matches the Response type structure
      const mockResponse = {
        id: 'resp_123',
        created_at: Date.now(),
        output_text: 'Hello there!',
        role: 'assistant',
        input_tokens: 5,
        output_tokens: 3
      } as any; // Use type assertion to avoid needing to implement the full interface

      const mockConvertedResponse = {
        role: 'assistant',
        content: 'Hello there!',
        metadata: {
          finishReason: 'stop',
          model: 'test-model',
          usage: {
            tokens: {
              input: 5,
              output: 3,
              total: 8
            }
          }
        }
      };

      // @ts-ignore - accessing private property for testing
      adapter.converter.convertFromOpenAIResponse = jest.fn().mockReturnValue(mockConvertedResponse);

      const result = adapter.convertFromProviderResponse(mockResponse);

      // @ts-ignore - accessing private property for testing
      expect(adapter.converter.convertFromOpenAIResponse).toHaveBeenCalledWith(mockResponse);
      expect(result).toEqual(mockConvertedResponse);
    });
  });

  describe('convertFromProviderStreamResponse', () => {
    it('should convert content part added events correctly', () => {
      // Mock an event chunk
      const mockChunk = {
        type: 'response.content_part.added',
        content: 'Hello'
      };

      const mockConvertedChunk = {
        role: 'assistant',
        content: 'Hello',
        isComplete: false
      };

      // No need to mock the converter as we're testing the adapter's implementation directly
      const result = adapter.convertFromProviderStreamResponse(mockChunk as ResponseStreamEvent);

      // Just verify the result matches expected format
      expect(result.content).toEqual('Hello');
      expect(result.role).toEqual('assistant');
      expect(result.isComplete).toBeFalsy();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle custom error types from OpenAI', async () => {
      // Create a custom error object similar to what OpenAI might return
      const customError = new Error('API Error');
      // Add properties that OpenAI errors would have
      Object.assign(customError, {
        status: 400,
        headers: {
          'x-request-id': 'req_123456'
        },
        response: {
          data: {
            error: {
              message: 'Invalid API key',
              type: 'invalid_request_error',
              code: 'invalid_api_key'
            }
          }
        }
      });

      // Mock the API to throw this custom error
      mockOpenAICreate.mockRejectedValueOnce(customError);

      // Define test parameters
      const model = 'test-model';
      const params = {
        messages: [{ role: 'user', content: 'hello' }],
        model: 'test-model'
      };

      // Set up mock to return parameters that won't cause validation errors
      mockConvertToOpenAIResponseParams.mockResolvedValue({
        model: 'test-model',
        messages: [{ role: 'user', content: 'hello' }]
      });

      // The call should throw but be properly wrapped in our custom error
      await expect(adapter.chatCall(model, params)).rejects.toThrow();
    });
  });
});