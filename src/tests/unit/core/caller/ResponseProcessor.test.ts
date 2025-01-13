import { ResponseProcessor } from '../../../../core/caller/ResponseProcessor';
import { UniversalChatResponse, UniversalChatParams, FinishReason } from '../../../../interfaces/UniversalInterfaces';
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

            const settings: UniversalChatParams['settings'] = {};

            const result = await processor.validateResponse(response, settings);
            expect(result).toEqual(response);
        });

        it('should parse JSON when responseFormat is json', async () => {
            const jsonContent = { message: 'Hello' };
            const response: UniversalChatResponse = {
                content: JSON.stringify(jsonContent),
                role: 'assistant',
                metadata: { responseFormat: 'json' }
            };

            const settings: UniversalChatParams['settings'] = {
                responseFormat: 'json'
            };

            const result = await processor.validateResponse(response, settings);
            expect(result.content).toEqual(jsonContent);
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

            const settings: UniversalChatParams['settings'] = {
                jsonSchema: {
                    schema: testSchema
                }
            };

            const result = await processor.validateResponse(response, settings);
            expect(result.content).toEqual(validContent);
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

            const settings: UniversalChatParams['settings'] = {
                jsonSchema: {
                    schema: testSchema
                }
            };

            const result = await processor.validateResponse(response, settings);
            expect(result.metadata?.validationErrors).toEqual([
                { path: 'age', message: 'age is required' }
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

            const settings: UniversalChatParams['settings'] = {
                jsonSchema: {
                    schema: testSchema
                }
            };

            await expect(processor.validateResponse(response, settings)).rejects.toThrow(
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

            const settings: UniversalChatParams['settings'] = {
                jsonSchema: {
                    schema: testSchema
                }
            };

            await expect(processor.validateResponse(response, settings)).rejects.toThrow(
                'Failed to validate response: Unknown error'
            );
        });

        it('should handle wrapped content in named object', async () => {
            const testSchema = z.object({
                name: z.string(),
                age: z.number()
            });

            const validContent = { name: 'test', age: 25 };
            const wrappedContent = { userProfile: validContent };  // Content wrapped in named object
            (SchemaValidator.validate as jest.Mock).mockReturnValueOnce(validContent);

            const response: UniversalChatResponse = {
                content: JSON.stringify(wrappedContent),
                role: 'assistant'
            };

            const settings: UniversalChatParams['settings'] = {
                jsonSchema: {
                    name: 'userProfile',  // Schema name matches wrapper object key
                    schema: testSchema
                }
            };

            const result = await processor.validateResponse(response, settings);
            expect(result.content).toEqual(validContent);
            expect(SchemaValidator.validate).toHaveBeenCalledWith(validContent, testSchema);
        });

        it('should handle case-insensitive schema name matching', async () => {
            const testSchema = z.object({
                name: z.string(),
                age: z.number()
            });

            const validContent = { name: 'test', age: 25 };
            const wrappedContent = { UserProfile: validContent };  // Different case in wrapper
            (SchemaValidator.validate as jest.Mock).mockReturnValueOnce(validContent);

            const response: UniversalChatResponse = {
                content: JSON.stringify(wrappedContent),
                role: 'assistant'
            };

            const settings: UniversalChatParams['settings'] = {
                jsonSchema: {
                    name: 'userProfile',  // Schema name in different case
                    schema: testSchema
                }
            };

            const result = await processor.validateResponse(response, settings);
            expect(result.content).toEqual(validContent);
            expect(SchemaValidator.validate).toHaveBeenCalledWith(validContent, testSchema);
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
            expect(result.content).toEqual(jsonContent);
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

            // Simulate a non-Error object being thrown
            jest.spyOn(JSON, 'parse').mockImplementationOnce(() => {
                throw { custom: 'error' };  // Not an Error instance
            });

            await expect(processor['parseJson'](response)).rejects.toThrow(
                'Failed to parse JSON response: Unknown error'
            );
        });
    });

    describe('validateJsonMode', () => {
        it('should not throw error when JSON mode is not required', () => {
            const model = { jsonMode: false };
            const params: UniversalChatParams = { messages: [] };

            expect(() => processor.validateJsonMode(model, params)).not.toThrow();
        });

        it('should not throw error when model supports JSON mode', () => {
            const model = { jsonMode: true };
            const params: UniversalChatParams = {
                messages: [],
                settings: { responseFormat: 'json' }
            };

            expect(() => processor.validateJsonMode(model, params)).not.toThrow();
        });

        it('should throw error when JSON mode is required but not supported', () => {
            const model = { jsonMode: false };
            const params: UniversalChatParams = {
                messages: [],
                settings: { responseFormat: 'json' }
            };

            expect(() => processor.validateJsonMode(model, params)).toThrow(
                'Selected model does not support JSON mode'
            );
        });

        it('should throw error when JSON schema is used but JSON mode not supported', () => {
            const model = { jsonMode: false };
            const params: UniversalChatParams = {
                messages: [],
                settings: {
                    jsonSchema: {
                        schema: z.object({})
                    }
                }
            };

            expect(() => processor.validateJsonMode(model, params)).toThrow(
                'Selected model does not support JSON mode'
            );
        });
    });
}); 