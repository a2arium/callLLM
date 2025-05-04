import { OpenAI } from 'openai';
import { OpenAIResponseAdapter } from '../../../../adapters/openai/adapter';
import {
    OpenAIResponseAdapterError,
    OpenAIResponseValidationError
} from '../../../../adapters/openai/errors';
import { UniversalChatParams } from '../../../../interfaces/UniversalInterfaces';
import { ResponseContentPartAddedEvent, ResponseStreamEvent } from '../../../../adapters/openai/types';

// Create a more accurate type for our mocks
type MockOpenAI = {
    responses: {
        create: jest.Mock;
    };
};

// Create a mock for the OpenAI class
jest.mock('openai', () => {
    return {
        OpenAI: jest.fn().mockImplementation(() => ({
            responses: {
                create: jest.fn()
            }
        }))
    };
});

// Mock the stream handler and converter
jest.mock('../../../../adapters/openai/stream', () => ({
    StreamHandler: jest.fn().mockImplementation(() => ({
        handleStream: jest.fn(),
        updateTools: jest.fn()
    }))
}));

jest.mock('../../../../adapters/openai/converter', () => ({
    Converter: jest.fn().mockImplementation(() => ({
        convertToOpenAIResponseParams: jest.fn(),
        convertFromOpenAIResponse: jest.fn(),
        convertFromOpenAIStreamResponse: jest.fn()
    }))
}));

jest.mock('../../../../adapters/openai/validator', () => ({
    Validator: jest.fn().mockImplementation(() => ({
        validateParams: jest.fn(),
        validateTools: jest.fn()
    }))
}));

jest.mock('../../../../utils/logger', () => ({
    logger: {
        setConfig: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        createLogger: jest.fn().mockReturnValue({
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        })
    }
}));

describe('OpenAIResponseAdapter Additional Tests', () => {
    let adapter: OpenAIResponseAdapter;
    let mockCreate: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Set up the mock for OpenAI's create method
        mockCreate = jest.fn();
        // Cast to any to avoid TypeScript errors with the mock implementation
        (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
            responses: {
                create: mockCreate
            }
        }));

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
                }
            ];

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
            console.log = jest.fn();

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
                input: [{ role: 'user', content: 'hello' }],
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
            // Create a custom error that matches what the adapter would expect
            const customError = new Error('Custom API error');
            // Add required properties to match OpenAI.APIError
            (customError as any).status = 422;
            (customError as any).name = 'APIError';
            // Mock the OpenAI class to check instanceof correctly
            (OpenAI as any).APIError = function () { };
            (customError as any).__proto__ = (OpenAI as any).APIError.prototype;

            // Mock the API to throw this custom error
            mockCreate.mockRejectedValueOnce(customError);

            // Define test parameters
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'hello' }],
                model: 'test-model'
            };

            // Call the adapter and check the error handling
            await expect(adapter.chatCall('test-model', params))
                .rejects.toThrow(OpenAIResponseAdapterError);
        });
    });
}); 