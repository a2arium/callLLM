import { ResponseProcessor } from '../../../../core/processors/ResponseProcessor';
import { UniversalChatResponse, UniversalChatParams, FinishReason, ResponseFormat, ModelInfo } from '../../../../interfaces/UniversalInterfaces';
import { z } from 'zod';

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

describe('ResponseProcessor', () => {
    let processor: ResponseProcessor;

    beforeEach(() => {
        jest.clearAllMocks();
        processor = new ResponseProcessor();
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
            (SchemaValidator.validate as jest.Mock).mockReturnValueOnce(validContent);

            const response: UniversalChatResponse = {
                content: JSON.stringify(validContent),
                role: 'assistant'
            };

            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test message' }],
                model: 'test-model',
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
            (SchemaValidator.validate as jest.Mock).mockImplementationOnce(() => {
                throw new SchemaValidationError('Validation failed', [
                    { path: 'age', message: 'age is required' }
                ]);
            });

            const response: UniversalChatResponse = {
                content: JSON.stringify(invalidContent),
                role: 'assistant'
            };

            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test message' }],
                model: 'test-model',
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
                { path: ['age'], message: 'age is required' }
            ]);
            expect(result.metadata?.finishReason).toBe(FinishReason.CONTENT_FILTER);
        });

        it('should handle non-SchemaValidationError errors', async () => {
            const testSchema = z.object({
                name: z.string()
            });

            (SchemaValidator.validate as jest.Mock).mockImplementationOnce(() => {
                throw new Error('Unexpected validation error');
            });

            const response: UniversalChatResponse = {
                content: JSON.stringify({ name: 'test' }),
                role: 'assistant'
            };

            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test message' }],
                model: 'test-model',
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

            (SchemaValidator.validate as jest.Mock).mockImplementationOnce(() => {
                throw { custom: 'error' };  // Not an Error instance
            });

            const response: UniversalChatResponse = {
                content: JSON.stringify({ name: 'test' }),
                role: 'assistant'
            };

            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test message' }],
                model: 'test-model',
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
            (SchemaValidator.validate as jest.Mock).mockReturnValueOnce(validContent);

            const response: UniversalChatResponse = {
                role: 'assistant',
                content: JSON.stringify({ userProfile: validContent }),
                metadata: {}
            };

            const params: UniversalChatParams = {
                messages: [],
                model: 'test-model',
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
            expect(SchemaValidator.validate).toHaveBeenCalledWith({ name: 'test', age: 25 }, testSchema);
        });

        it('should handle case-insensitive schema name matching', async () => {
            const testSchema = z.object({
                name: z.string(),
                age: z.number()
            });

            const validContent = { name: 'test', age: 25 };
            (SchemaValidator.validate as jest.Mock).mockReturnValueOnce(validContent);

            const response: UniversalChatResponse = {
                role: 'assistant',
                content: JSON.stringify({ UserProfile: validContent }),
                metadata: {}
            };

            const params: UniversalChatParams = {
                messages: [],
                model: 'test-model',
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
            expect(SchemaValidator.validate).toHaveBeenCalledWith({ name: 'test', age: 25 }, testSchema);
        });

        describe('JSON repair functionality', () => {
            it('should repair and parse slightly malformed JSON without schema', async () => {
                const malformedJson = '{ name: "test", age: 25 }'; // Missing quotes around property names
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

                const malformedJson = '{ name: "test", age: 25 }'; // Missing quotes around property names
                const validContent = { name: 'test', age: 25 };
                (SchemaValidator.validate as jest.Mock).mockReturnValueOnce(validContent);

                const response: UniversalChatResponse = {
                    content: malformedJson,
                    role: 'assistant'
                };

                const params: UniversalChatParams = {
                    messages: [{ role: 'user', content: 'test message' }],
                    model: 'test-model',
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
                expect(result.metadata?.originalContent).toBe(jsonWithTrailingComma);
            });

            it('should throw error for badly malformed JSON that cannot be repaired', async () => {
                const badlyMalformedJson = '{ completely broken json )))';
                const response: UniversalChatResponse = {
                    content: badlyMalformedJson,
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

                await expect(processor.validateResponse(response, params, mockModelInfo)).rejects.toThrow('Failed to parse JSON response');
            });

            it('should handle schema validation errors after JSON repair', async () => {
                const testSchema = z.object({
                    name: z.string(),
                    age: z.number()
                });

                const malformedJson = '{ name: "test", age: "25" }'; // age should be number, not string
                (SchemaValidator.validate as jest.Mock).mockImplementationOnce(() => {
                    throw new SchemaValidationError('Validation failed', [
                        { path: 'age', message: 'Expected number, received string' }
                    ]);
                });

                const response: UniversalChatResponse = {
                    content: malformedJson,
                    role: 'assistant'
                };

                const params: UniversalChatParams = {
                    messages: [{ role: 'user', content: 'test message' }],
                    model: 'test-model',
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
                expect(result.metadata?.jsonRepaired).toBe(true);
                expect(result.metadata?.originalContent).toBe(malformedJson);
                expect(result.metadata?.validationErrors).toEqual([
                    { path: ['age'], message: 'Expected number, received string' }
                ]);
                expect(result.metadata?.finishReason).toBe(FinishReason.CONTENT_FILTER);
            });
        });

        it('should validate response with schema', async () => {
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

            const params: UniversalChatParams = {
                messages: [],
                model: 'test-model',
                jsonSchema: { schema: z.object({ name: z.string(), age: z.number() }) }
            };
            const response: UniversalChatResponse = {
                role: 'assistant',
                content: '{"name": "John", "age": 30}',
                metadata: {}
            };
            const result = await processor.validateResponse(response, params, mockModelInfo);
            expect(result.contentObject).toEqual({ name: 'John', age: 30 });
        });

        it('should validate response without schema', async () => {
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

            const params: UniversalChatParams = {
                messages: [],
                model: 'test-model',
                responseFormat: 'json'
            };
            const response: UniversalChatResponse = {
                role: 'assistant',
                content: '{"test": "value"}',
                metadata: {}
            };
            const result = await processor.validateResponse(response, params, mockModelInfo);
            expect(result.contentObject).toEqual({ test: 'value' });
        });

        it('should return non-JSON response as-is', async () => {
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

            const params: UniversalChatParams = {
                messages: [],
                model: 'test-model'
            };
            const response: UniversalChatResponse = {
                role: 'assistant',
                content: 'plain text response',
                metadata: {}
            };
            const result = await processor.validateResponse(response, params, mockModelInfo);
            expect(result).toEqual(response);
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
                content: '{ "message": "Hello"',  // Missing closing brace
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
                capabilities: { jsonMode: true },
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
                capabilities: { jsonMode: false },
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
                settings: { jsonMode: 'native-only' }
            };
            expect(() => processor.validateJsonMode(model, params)).toThrow();
        });

        it('should return usePromptInjection: true when model does not have native JSON support but fallback is enabled', () => {
            const model: ModelInfo = {
                name: 'test-model',
                capabilities: { jsonMode: false },
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
                settings: { jsonMode: 'fallback' }
            };
            expect(processor.validateJsonMode(model, params)).toEqual({ usePromptInjection: true });
        });
    });
}); 