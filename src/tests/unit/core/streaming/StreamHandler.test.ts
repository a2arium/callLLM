import { StreamHandler } from '../../../../core/streaming/StreamHandler';
import { TokenCalculator } from '../../../../core/models/TokenCalculator';
import { UniversalStreamResponse, UniversalChatParams, ModelInfo, FinishReason } from '../../../../interfaces/UniversalInterfaces';
import { z } from 'zod';

// Mock TokenCalculator
jest.mock('../../../../core/models/TokenCalculator');
const mockCalculateTokens = jest.fn();
const mockCalculateUsage = jest.fn();

// Mock SchemaValidator
jest.mock('../../../../core/schema/SchemaValidator', () => {
    class MockSchemaValidationError extends Error {
        constructor(
            message: string,
            public readonly validationErrors: Array<{ path: string; message: string }> = []
        ) {
            super(message);
            this.name = 'SchemaValidationError';
        }
    }

    return {
        SchemaValidator: {
            validate: jest.fn()
        },
        SchemaValidationError: MockSchemaValidationError
    };
});

// Import after mocks are set up
import { SchemaValidator, SchemaValidationError } from '../../../../core/schema/SchemaValidator';

describe('StreamHandler', () => {
    let streamHandler: StreamHandler;
    let tokenCalculator: jest.Mocked<TokenCalculator>;

    const mockModelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 1,
        outputPricePerMillion: 2,
        maxRequestTokens: 1000,
        maxResponseTokens: 1000,
        characteristics: {
            qualityIndex: 80,
            outputSpeed: 150,
            firstTokenLatency: 2000
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        tokenCalculator = {
            calculateTokens: mockCalculateTokens,
            calculateUsage: mockCalculateUsage
        } as any;
        streamHandler = new StreamHandler(tokenCalculator);

        // Default mock implementations
        mockCalculateTokens.mockReturnValue(10);
        mockCalculateUsage.mockReturnValue({ totalCost: 0.001, inputCost: 0.0003, outputCost: 0.0007 });
    });

    describe('JSON Response Handling', () => {
        it('should handle complete JSON response', async () => {
            const mockStream = createMockStream([{
                content: '{"name": "test"}',
                role: 'assistant',
                isComplete: true,
                metadata: { responseFormat: 'json' }
            }]);

            const params: UniversalChatParams = {
                messages: [],
                settings: { responseFormat: 'json' }
            };

            const results = [];
            for await (const chunk of streamHandler.processStream(mockStream, params, 5, mockModelInfo)) {
                results.push(chunk);
            }

            expect(results).toHaveLength(1);
            expect(results[0].content).toEqual({ name: 'test' });
            expect(results[0].metadata?.usage).toBeDefined();
        });

        it('should handle streaming JSON chunks', async () => {
            const mockStream = createMockStream([
                {
                    content: '{"na',
                    role: 'assistant',
                    isComplete: false,
                    metadata: { responseFormat: 'json' }
                },
                {
                    content: 'me": "te',
                    role: 'assistant',
                    isComplete: false,
                    metadata: { responseFormat: 'json' }
                },
                {
                    content: 'st"}',
                    role: 'assistant',
                    isComplete: true,
                    metadata: { responseFormat: 'json' }
                }
            ]);

            const params: UniversalChatParams = {
                messages: [],
                settings: { responseFormat: 'json' }
            };

            const results = [];
            for await (const chunk of streamHandler.processStream(mockStream, params, 5, mockModelInfo)) {
                results.push(chunk);
            }

            expect(results).toHaveLength(3);
            expect(results[0].content).toBe('{"na');
            expect(results[1].content).toBe('me": "te');
            expect(results[2].content).toEqual({ name: 'test' });
        });

        it('should throw error for malformed JSON', async () => {
            const mockStream = createMockStream([{
                content: '{"name": "test"',  // Missing closing brace
                role: 'assistant',
                isComplete: true,
                metadata: { responseFormat: 'json' }
            }]);

            const params: UniversalChatParams = {
                messages: [],
                settings: { responseFormat: 'json' }
            };

            await expect(async () => {
                for await (const _ of streamHandler.processStream(mockStream, params, 5, mockModelInfo)) {
                    // Consume stream
                }
            }).rejects.toThrow('Failed to parse JSON response');
        });
    });

    describe('Schema Validation', () => {
        const testSchema = z.object({
            name: z.string(),
            age: z.number()
        });

        it('should validate content against schema', async () => {
            const validContent = { name: 'test', age: 25 };
            (SchemaValidator.validate as jest.Mock).mockReturnValueOnce(validContent);

            const mockStream = createMockStream([{
                content: JSON.stringify(validContent),
                role: 'assistant',
                isComplete: true,
                metadata: { responseFormat: 'json' }
            }]);

            const params: UniversalChatParams = {
                messages: [],
                settings: {
                    responseFormat: 'json',
                    jsonSchema: { schema: testSchema }
                }
            };

            const results = [];
            for await (const chunk of streamHandler.processStream(mockStream, params, 5, mockModelInfo)) {
                results.push(chunk);
            }

            expect(results).toHaveLength(1);
            expect(results[0].content).toEqual(validContent);
            expect(SchemaValidator.validate).toHaveBeenCalledWith(validContent, testSchema);
        });

        it('should handle validation errors', async () => {
            const invalidContent = { name: 'test' };  // Missing required age field
            (SchemaValidator.validate as jest.Mock).mockImplementationOnce(() => {
                throw new SchemaValidationError('Validation failed', [
                    { path: 'age', message: 'age is required' }
                ]);
            });

            const mockStream = createMockStream([{
                content: JSON.stringify(invalidContent),
                role: 'assistant',
                isComplete: true,
                metadata: { responseFormat: 'json' }
            }]);

            const params: UniversalChatParams = {
                messages: [],
                settings: {
                    responseFormat: 'json',
                    jsonSchema: { schema: testSchema }
                }
            };

            const results = [];
            for await (const chunk of streamHandler.processStream(mockStream, params, 5, mockModelInfo)) {
                results.push(chunk);
            }

            expect(results).toHaveLength(1);
            expect(results[0].metadata?.validationErrors).toEqual([
                { path: 'age', message: 'age is required' }
            ]);
            expect(results[0].metadata?.finishReason).toBe(FinishReason.CONTENT_FILTER);
        });

        it('should pass through content when no schema provided', async () => {
            const content = { name: 'test', extra: 'field' };

            const mockStream = createMockStream([{
                content: JSON.stringify(content),
                role: 'assistant',
                isComplete: true,
                metadata: { responseFormat: 'json' }
            }]);

            const params: UniversalChatParams = {
                messages: [],
                settings: { responseFormat: 'json' }
            };

            const results = [];
            for await (const chunk of streamHandler.processStream(mockStream, params, 5, mockModelInfo)) {
                results.push(chunk);
            }

            expect(results).toHaveLength(1);
            expect(results[0].content).toEqual(content);
            expect(SchemaValidator.validate).not.toHaveBeenCalled();
        });
    });

    describe('Token Usage Calculation', () => {
        it('should calculate token usage for each chunk', async () => {
            const mockStream = createMockStream([
                { content: 'Hello', role: 'assistant', isComplete: false },
                { content: ' world', role: 'assistant', isComplete: true }
            ]);

            const params: UniversalChatParams = { messages: [] };

            const results = [];
            for await (const chunk of streamHandler.processStream(mockStream, params, 5, mockModelInfo)) {
                results.push(chunk);
            }

            expect(results).toHaveLength(2);
            expect(mockCalculateTokens).toHaveBeenCalledWith('Hello');
            expect(mockCalculateTokens).toHaveBeenCalledWith('Hello world');
            expect(mockCalculateUsage).toHaveBeenCalledTimes(2);
            expect(results[0].metadata?.usage).toBeDefined();
            expect(results[1].metadata?.usage).toBeDefined();
        });

        it('should use correct model info for cost calculation', async () => {
            const mockStream = createMockStream([{
                content: 'test',
                role: 'assistant',
                isComplete: true
            }]);

            const params: UniversalChatParams = { messages: [] };

            for await (const _ of streamHandler.processStream(mockStream, params, 5, mockModelInfo)) {
                // Consume stream
            }

            expect(mockCalculateUsage).toHaveBeenCalledWith(
                5,  // inputTokens
                10, // outputTokens (from mock)
                mockModelInfo.inputPricePerMillion,
                mockModelInfo.outputPricePerMillion
            );
        });
    });

    describe('Error Handling', () => {
        it('should handle unknown JSON parsing errors', async () => {
            const mockStream = createMockStream([{
                content: '{"name": "test"}',
                role: 'assistant',
                isComplete: true,
                metadata: { responseFormat: 'json' }
            }]);

            const params: UniversalChatParams = {
                messages: [],
                settings: { responseFormat: 'json' }
            };

            // Simulate a non-Error object being thrown
            jest.spyOn(JSON, 'parse').mockImplementationOnce(() => {
                throw { custom: 'error' };  // Not an Error instance
            });

            await expect(async () => {
                for await (const _ of streamHandler.processStream(mockStream, params, 5, mockModelInfo)) {
                    // Consume stream
                }
            }).rejects.toThrow('Failed to parse JSON response: Unknown error');
        });

        it('should handle unknown schema validation errors', async () => {
            const testSchema = z.object({
                name: z.string()
            });

            const mockStream = createMockStream([{
                content: '{"name": "test"}',
                role: 'assistant',
                isComplete: true,
                metadata: { responseFormat: 'json' }
            }]);

            const params: UniversalChatParams = {
                messages: [],
                settings: {
                    responseFormat: 'json',
                    jsonSchema: { schema: testSchema }
                }
            };

            // Simulate a non-SchemaValidationError being thrown
            (SchemaValidator.validate as jest.Mock).mockImplementationOnce(() => {
                throw new Error('Unexpected validation error');
            });

            await expect(async () => {
                for await (const _ of streamHandler.processStream(mockStream, params, 5, mockModelInfo)) {
                    // Consume stream
                }
            }).rejects.toThrow('Unexpected validation error');
        });
    });

    describe('Non-JSON Response Handling', () => {
        it('should handle text response with schema validation', async () => {
            const testSchema = z.string();
            const validContent = 'Hello, world!';
            (SchemaValidator.validate as jest.Mock).mockReturnValueOnce(validContent);

            const mockStream = createMockStream([{
                content: validContent,
                role: 'assistant',
                isComplete: true
            }]);

            const params: UniversalChatParams = {
                messages: [],
                settings: {
                    jsonSchema: { schema: testSchema }
                }
            };

            const results = [];
            for await (const chunk of streamHandler.processStream(mockStream, params, 5, mockModelInfo)) {
                results.push(chunk);
            }

            expect(results).toHaveLength(1);
            expect(results[0].content).toBe(validContent);
            expect(SchemaValidator.validate).toHaveBeenCalledWith(validContent, testSchema);
        });

        it('should handle text response with schema validation error', async () => {
            const testSchema = z.number();  // Schema expects a number
            (SchemaValidator.validate as jest.Mock).mockImplementationOnce(() => {
                throw new SchemaValidationError('Validation failed', [
                    { path: '', message: 'Expected number, received string' }
                ]);
            });

            const mockStream = createMockStream([{
                content: 'Not a number',
                role: 'assistant',
                isComplete: true
            }]);

            const params: UniversalChatParams = {
                messages: [],
                settings: {
                    jsonSchema: { schema: testSchema }
                }
            };

            const results = [];
            for await (const chunk of streamHandler.processStream(mockStream, params, 5, mockModelInfo)) {
                results.push(chunk);
            }

            expect(results).toHaveLength(1);
            expect(results[0].metadata?.validationErrors).toEqual([
                { path: '', message: 'Expected number, received string' }
            ]);
            expect(results[0].metadata?.finishReason).toBe(FinishReason.CONTENT_FILTER);
        });

        it('should handle text response with unknown validation error', async () => {
            const testSchema = z.string();
            (SchemaValidator.validate as jest.Mock).mockImplementationOnce(() => {
                throw new Error('Unexpected error during validation');
            });

            const mockStream = createMockStream([{
                content: 'Test content',
                role: 'assistant',
                isComplete: true
            }]);

            const params: UniversalChatParams = {
                messages: [],
                settings: {
                    jsonSchema: { schema: testSchema }
                }
            };

            await expect(async () => {
                for await (const _ of streamHandler.processStream(mockStream, params, 5, mockModelInfo)) {
                    // Consume stream
                }
            }).rejects.toThrow('Unexpected error during validation');
        });
    });
});

// Helper function to create a mock AsyncIterable
function createMockStream(chunks: UniversalStreamResponse[]): AsyncIterable<UniversalStreamResponse> {
    return {
        async *[Symbol.asyncIterator]() {
            for (const chunk of chunks) {
                yield chunk;
            }
        }
    };
} 