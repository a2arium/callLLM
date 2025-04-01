import { OpenAI } from 'openai';
import { OpenAIResponseAdapter } from '../../../../adapters/openai/adapter';
import { Converter } from '../../../../adapters/openai/converter';
import { StreamHandler } from '../../../../adapters/openai/stream';
import { Validator } from '../../../../adapters/openai/validator';
import { UniversalChatParams, FinishReason } from '../../../../interfaces/UniversalInterfaces';
import {
    OpenAIResponseAdapterError
} from '../../../../adapters/openai/errors';

// Mock functions
const mockCreate = jest.fn();
const mockValidateParams = jest.fn();
const mockValidateTools = jest.fn();
const mockConvertToParams = jest.fn();
const mockConvertFromResponse = jest.fn();
const mockHandleStream = jest.fn();

// Add APIError to our mock to avoid the instanceof check failing
class MockAPIError extends Error {
    status: number;
    headers: Record<string, string>;

    constructor(message: string, status: number, headers: Record<string, string> = {}) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.headers = headers;
    }
}

// Mocks
jest.mock('openai', () => {
    return {
        OpenAI: jest.fn().mockImplementation(() => ({
            responses: {
                create: mockCreate
            }
        }))
    };
});

jest.mock('../../../../adapters/openai/converter', () => {
    return {
        Converter: jest.fn().mockImplementation(() => ({
            convertToOpenAIResponseParams: mockConvertToParams,
            convertFromOpenAIResponse: mockConvertFromResponse
        }))
    };
});

jest.mock('../../../../adapters/openai/validator', () => {
    return {
        Validator: jest.fn().mockImplementation(() => ({
            validateParams: mockValidateParams,
            validateTools: mockValidateTools
        }))
    };
});

jest.mock('../../../../adapters/openai/stream', () => {
    return {
        StreamHandler: jest.fn().mockImplementation(() => ({
            handleStream: mockHandleStream,
            updateTools: jest.fn() // Add this to avoid the error
        }))
    };
});

jest.mock('../../../../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        setConfig: jest.fn(),
        createLogger: jest.fn().mockReturnValue({
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        })
    }
}));

describe('OpenAIResponseAdapter', () => {
    let adapter: OpenAIResponseAdapter;

    const defaultParams: UniversalChatParams = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'test-model'
    };

    const mockResponse = {
        role: 'assistant',
        content: 'Hello, how can I help you?',
        metadata: {
            finishReason: FinishReason.STOP,
            model: 'gpt-4o',
            usage: {
                tokens: {
                    input: 5,
                    output: 10,
                    total: 15,
                    inputCached: 0
                },
                costs: {
                    input: 0,
                    output: 0,
                    total: 0,
                    inputCached: 0
                }
            }
        }
    };

    // Mock stream generator
    async function* mockStreamGenerator() {
        yield {
            role: 'assistant',
            content: 'Hello',
            isComplete: false
        };
        yield {
            role: 'assistant',
            content: ', how can I help you?',
            isComplete: true,
            metadata: {
                finishReason: FinishReason.STOP
            }
        };
    }

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Set up mock return values
        mockConvertToParams.mockReturnValue({
            model: 'test-model',
            input: [{ role: 'user', content: 'Hello' }]
        });
        mockConvertFromResponse.mockReturnValue(mockResponse);
        mockHandleStream.mockImplementation(() => mockStreamGenerator());

        // Set OpenAI.APIError
        (OpenAI as any).APIError = MockAPIError;

        // Create a new adapter instance for each test
        adapter = new OpenAIResponseAdapter('test-api-key');
    });

    describe('constructor', () => {
        test('should initialize with API key from constructor', () => {
            expect(OpenAI).toHaveBeenCalledWith(expect.objectContaining({
                apiKey: 'test-api-key'
            }));
        });

        test('should initialize with config object', () => {
            adapter = new OpenAIResponseAdapter({
                apiKey: 'test-api-key',
                organization: 'test-org',
                baseUrl: 'https://test-url.com'
            });

            expect(OpenAI).toHaveBeenCalledWith(expect.objectContaining({
                apiKey: 'test-api-key',
                organization: 'test-org',
                baseURL: 'https://test-url.com'
            }));
        });

        test('should throw if API key is not provided', () => {
            const originalEnv = process.env.OPENAI_API_KEY;
            delete process.env.OPENAI_API_KEY;

            expect(() => {
                new OpenAIResponseAdapter({});
            }).toThrow(OpenAIResponseAdapterError);

            process.env.OPENAI_API_KEY = originalEnv;
        });
    });

    describe('chatCall', () => {
        test('should call OpenAI responses.create with converted params', async () => {
            mockCreate.mockResolvedValueOnce({});

            const result = await adapter.chatCall('test-model', defaultParams);

            expect(mockValidateParams).toHaveBeenCalledWith(defaultParams);
            expect(mockConvertToParams).toHaveBeenCalledWith('test-model', defaultParams);
            expect(mockCreate).toHaveBeenCalled();
            expect(mockConvertFromResponse).toHaveBeenCalled();
            expect(result).toEqual(mockResponse);
        });

        test('should validate tools when provided', async () => {
            mockCreate.mockResolvedValueOnce({});
            const paramsWithTools = {
                ...defaultParams,
                tools: [
                    {
                        name: 'get_weather',
                        description: 'Get weather for a location',
                        parameters: {
                            type: 'object' as const,
                            properties: {
                                location: {
                                    type: 'string',
                                    description: 'The location to get weather for'
                                }
                            },
                            required: ['location']
                        }
                    }
                ]
            };

            await adapter.chatCall('test-model', paramsWithTools);

            expect(mockValidateTools).toHaveBeenCalledWith(paramsWithTools.tools);
        });

        test('should handle authentication errors (401)', async () => {
            // Set up mock to throw an APIError with status 401
            const authError = new MockAPIError('Invalid API key', 401);
            mockCreate.mockRejectedValueOnce(authError);

            // Test that the adapter throws the correct error type
            await expect(adapter.chatCall('test-model', defaultParams))
                .rejects.toThrow(/Invalid API key or authentication error/);
        });

        test('should handle rate limit errors (429)', async () => {
            // Set up mock to throw an APIError with status 429 and retry-after header
            const rateLimitError = new MockAPIError('Rate limit exceeded', 429, {
                'retry-after': '30'
            });
            mockCreate.mockRejectedValueOnce(rateLimitError);

            // Test that the adapter throws the correct error type
            await expect(adapter.chatCall('test-model', defaultParams))
                .rejects.toThrow(/Rate limit exceeded/);
        });

        test('should handle server errors (5xx)', async () => {
            // Set up mock to throw an APIError with status 500
            const serverError = new MockAPIError('Internal server error', 500);
            mockCreate.mockRejectedValueOnce(serverError);

            // Test that the adapter throws the correct error type
            await expect(adapter.chatCall('test-model', defaultParams))
                .rejects.toThrow(/OpenAI server error/);
        });

        test('should handle validation errors (400)', async () => {
            // Set up mock to throw an APIError with status 400
            const validationError = new MockAPIError('Invalid request parameters', 400);
            mockCreate.mockRejectedValueOnce(validationError);

            // Test that the adapter throws the correct error type
            await expect(adapter.chatCall('test-model', defaultParams))
                .rejects.toThrow(/Invalid request parameters/);
        });

        test('should handle generic errors', async () => {
            // Set up mock to throw a generic error
            mockCreate.mockRejectedValueOnce(new Error('Generic error'));

            // Test that the adapter throws the correct error type
            await expect(adapter.chatCall('test-model', defaultParams))
                .rejects.toThrow(/OpenAI API error/);
        });
    });

    describe('converter methods', () => {
        test('should call convertToOpenAIResponseParams with correct model and params', async () => {
            mockCreate.mockResolvedValueOnce({});

            await adapter.chatCall('test-model', defaultParams);

            expect(mockConvertToParams).toHaveBeenCalledWith('test-model', defaultParams);
        });

        test('should call convertFromOpenAIResponse with API response', async () => {
            const mockApiResponse = { id: 'resp_123', content: 'Hello world' };
            mockCreate.mockResolvedValueOnce(mockApiResponse);

            await adapter.chatCall('test-model', defaultParams);

            expect(mockConvertFromResponse).toHaveBeenCalledWith(mockApiResponse);
        });
    });

    describe('streamCall', () => {
        test('should call OpenAI responses.create with streaming enabled', async () => {
            mockCreate.mockResolvedValueOnce({});

            const stream = await adapter.streamCall('test-model', defaultParams);

            expect(mockValidateParams).toHaveBeenCalledWith(defaultParams);
            expect(mockConvertToParams).toHaveBeenCalledWith('test-model', defaultParams);
            expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
                stream: true
            }));
            expect(mockHandleStream).toHaveBeenCalled();

            // Check we can iterate the returned stream
            let chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            expect(chunks.length).toBe(2);
            expect(chunks[0].content).toBe('Hello');
            expect(chunks[1].isComplete).toBe(true);
        });

        test('should validate tools when provided', async () => {
            // Create a properly mocked tool handler
            const mockUpdateTools = jest.fn();
            const toolsHandler = {
                handleStream: mockHandleStream,
                updateTools: mockUpdateTools
            };
            // Use a fresh mock implementation for this specific test
            (StreamHandler as jest.Mock).mockImplementation(() => toolsHandler);

            mockCreate.mockResolvedValueOnce({});
            const paramsWithTools = {
                ...defaultParams,
                tools: [
                    {
                        name: 'get_weather',
                        description: 'Get weather for a location',
                        parameters: {
                            type: 'object' as const,
                            properties: {
                                location: {
                                    type: 'string',
                                    description: 'The location to get weather for'
                                }
                            },
                            required: ['location']
                        }
                    }
                ]
            };

            await adapter.streamCall('test-model', paramsWithTools);

            expect(mockValidateTools).toHaveBeenCalledWith(paramsWithTools.tools);
        });

        test('should handle authentication errors (401) in streaming', async () => {
            // Set up mock to throw an APIError with status 401
            const authError = new MockAPIError('Invalid API key', 401);
            mockCreate.mockRejectedValueOnce(authError);

            // Test that the adapter throws the correct error type
            await expect(adapter.streamCall('test-model', defaultParams))
                .rejects.toThrow(/Invalid API key or authentication error/);
        });

        test('should handle rate limit errors (429) in streaming', async () => {
            // Set up mock to throw an APIError with status 429 and retry-after header
            const rateLimitError = new MockAPIError('Rate limit exceeded', 429, {
                'retry-after': '30'
            });
            mockCreate.mockRejectedValueOnce(rateLimitError);

            // Test that the adapter throws the correct error type
            await expect(adapter.streamCall('test-model', defaultParams))
                .rejects.toThrow(/Rate limit exceeded/);
        });

        test('should handle server errors (5xx) in streaming', async () => {
            // Set up mock to throw an APIError with status 500
            const serverError = new MockAPIError('Internal server error', 500);
            mockCreate.mockRejectedValueOnce(serverError);

            // Test that the adapter throws the correct error type
            await expect(adapter.streamCall('test-model', defaultParams))
                .rejects.toThrow(/OpenAI server error/);
        });

        test('should handle validation errors (400) in streaming', async () => {
            // Set up mock to throw an APIError with status 400
            const validationError = new MockAPIError('Invalid request parameters', 400);
            mockCreate.mockRejectedValueOnce(validationError);

            // Test that the adapter throws the correct error type
            await expect(adapter.streamCall('test-model', defaultParams))
                .rejects.toThrow(/Invalid request parameters/);
        });

        test('should handle generic errors in streaming', async () => {
            // Set up mock to throw a generic error
            mockCreate.mockRejectedValueOnce(new Error('Generic error'));

            // Test that the adapter throws the correct error type
            await expect(adapter.streamCall('test-model', defaultParams))
                .rejects.toThrow(/OpenAI API stream error/);
        });

        test('should create a new StreamHandler when tools are provided', async () => {
            mockCreate.mockResolvedValueOnce({});
            const paramsWithTools = {
                ...defaultParams,
                tools: [
                    {
                        name: 'get_weather',
                        description: 'Get weather for a location',
                        parameters: {
                            type: 'object' as const,
                            properties: {
                                location: {
                                    type: 'string',
                                    description: 'The location to get weather for'
                                }
                            },
                            required: ['location']
                        }
                    }
                ]
            };

            // Reset StreamHandler mock to track new instances
            (StreamHandler as jest.Mock).mockClear();

            await adapter.streamCall('test-model', paramsWithTools);

            // Check that a new StreamHandler was created with the tools
            expect(StreamHandler).toHaveBeenCalledWith(paramsWithTools.tools);
        });
    });

    describe('environment and config handling', () => {
        const originalEnv = { ...process.env };

        beforeEach(() => {
            // Reset environment variables before each test
            process.env = { ...originalEnv };
        });

        afterAll(() => {
            // Restore original environment variables after all tests
            process.env = originalEnv;
        });

        test('should use API key from environment if not in config', () => {
            process.env.OPENAI_API_KEY = 'env-api-key';

            const envAdapter = new OpenAIResponseAdapter({});

            expect(OpenAI).toHaveBeenLastCalledWith(expect.objectContaining({
                apiKey: 'env-api-key'
            }));
        });

        test('should use organization from environment if not in config', () => {
            process.env.OPENAI_API_KEY = 'env-api-key';
            process.env.OPENAI_ORGANIZATION = 'env-org';

            const envAdapter = new OpenAIResponseAdapter({});

            expect(OpenAI).toHaveBeenLastCalledWith(expect.objectContaining({
                apiKey: 'env-api-key',
                organization: 'env-org'
            }));
        });

        test('should use baseUrl from environment if not in config', () => {
            process.env.OPENAI_API_KEY = 'env-api-key';
            process.env.OPENAI_API_BASE = 'https://env-base-url.com';

            const envAdapter = new OpenAIResponseAdapter({});

            expect(OpenAI).toHaveBeenLastCalledWith(expect.objectContaining({
                apiKey: 'env-api-key',
                baseURL: 'https://env-base-url.com'
            }));
        });

        test('should prioritize config values over environment variables', () => {
            process.env.OPENAI_API_KEY = 'env-api-key';
            process.env.OPENAI_ORGANIZATION = 'env-org';
            process.env.OPENAI_API_BASE = 'https://env-base-url.com';

            const configAdapter = new OpenAIResponseAdapter({
                apiKey: 'config-api-key',
                organization: 'config-org',
                baseUrl: 'https://config-base-url.com'
            });

            expect(OpenAI).toHaveBeenLastCalledWith(expect.objectContaining({
                apiKey: 'config-api-key',
                organization: 'config-org',
                baseURL: 'https://config-base-url.com'
            }));
        });
    });
}); 