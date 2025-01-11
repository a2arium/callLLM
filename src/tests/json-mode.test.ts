import { z } from 'zod';
import { SchemaValidator } from '../core/schema/SchemaValidator';
import { SchemaFormatter } from '../core/schema/SchemaFormatter';
import { OpenAIAdapter } from '../adapters/openai/OpenAIAdapter';
import { SchemaValidationError } from '../core/schema/SchemaValidator';
import { defaultModels } from '../adapters/openai/models';

// Mock OpenAI
const mockOpenAI = {
    chat: {
        completions: {
            create: jest.fn()
        }
    }
};

// Mock the OpenAI module
jest.mock('openai', () => ({
    OpenAI: jest.fn().mockImplementation(() => mockOpenAI)
}));

// Mock the zodResponseFormat helper
jest.mock('openai/helpers/zod', () => ({
    zodResponseFormat: jest.fn().mockImplementation((schema) => ({
        type: 'json_schema',
        schema: { type: 'object' }
    }))
}));

describe('JSON Mode', () => {
    describe('Schema Validation', () => {
        const UserSchema = z.object({
            name: z.string(),
            age: z.number(),
            interests: z.array(z.string())
        });

        const validUserData = {
            name: 'Alice',
            age: 25,
            interests: ['reading', 'coding']
        };

        const invalidUserData = {
            name: 'Bob',
            age: '30', // Should be number
            interests: ['gaming']
        };

        it('should validate data against Zod schema', () => {
            const result = SchemaValidator.validate(validUserData, UserSchema);
            expect(result).toEqual(validUserData);
        });

        it('should reject invalid data with Zod schema', () => {
            expect(() => SchemaValidator.validate(invalidUserData, UserSchema))
                .toThrow(SchemaValidationError);
        });

        it('should validate data against JSON schema', () => {
            const jsonSchema = JSON.stringify({
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    age: { type: 'number' },
                    interests: {
                        type: 'array',
                        items: { type: 'string' }
                    }
                },
                required: ['name', 'age', 'interests']
            });

            const result = SchemaValidator.validate(validUserData, jsonSchema);
            expect(result).toEqual(validUserData);
        });

        it('should handle complex Zod schemas with nested objects and arrays', () => {
            const ComplexSchema = z.object({
                id: z.number(),
                user: z.object({
                    name: z.string().email(),
                    settings: z.object({
                        theme: z.enum(['light', 'dark']),
                        notifications: z.boolean().optional()
                    })
                }),
                tags: z.array(z.string()).min(1),
                metadata: z.record(z.string(), z.unknown()).optional()
            });

            const validData = {
                id: 1,
                user: {
                    name: 'test@example.com',
                    settings: {
                        theme: 'dark',
                        notifications: true
                    }
                },
                tags: ['test'],
                metadata: { custom: 'value' }
            };

            const result = SchemaValidator.validate(validData, ComplexSchema);
            expect(result).toEqual(validData);

            // Test conversion to JSON Schema
            const jsonSchema = SchemaValidator.zodToJsonSchema(ComplexSchema);
            const parsed = JSON.parse(jsonSchema);
            expect(parsed.type).toBe('object');
            expect(parsed.properties.user.properties.name.format).toBe('email');
            expect(parsed.properties.user.properties.settings.properties.theme.enum).toEqual(['light', 'dark']);
            expect(parsed.required).not.toContain('metadata');
        });

        it('should handle various Zod types in schema conversion', () => {
            const MixedSchema = z.object({
                string: z.string(),
                number: z.number(),
                boolean: z.boolean(),
                enum: z.enum(['A', 'B', 'C']),
                array: z.array(z.number()),
                nested: z.object({
                    field: z.string()
                }),
                optional: z.string().optional()
            });

            const jsonSchema = SchemaValidator.zodToJsonSchema(MixedSchema);
            const parsed = JSON.parse(jsonSchema);

            expect(parsed.properties.string.type).toBe('string');
            expect(parsed.properties.number.type).toBe('number');
            expect(parsed.properties.boolean.type).toBe('boolean');
            expect(parsed.properties.enum.enum).toEqual(['A', 'B', 'C']);
            expect(parsed.properties.array.type).toBe('array');
            expect(parsed.properties.array.items.type).toBe('number');
            expect(parsed.properties.nested.type).toBe('object');
            expect(parsed.required).not.toContain('optional');
        });

        it('should handle error cases in schema validation', () => {
            // Invalid schema type
            expect(() => SchemaValidator.validate({}, 'invalid json'))
                .toThrow(SchemaValidationError);

            // Invalid data type
            const numberSchema = z.number();
            expect(() => SchemaValidator.validate('not a number', numberSchema))
                .toThrow(SchemaValidationError);

            // Missing required fields
            const requiredSchema = z.object({
                required: z.string()
            });
            expect(() => SchemaValidator.validate({}, requiredSchema))
                .toThrow(SchemaValidationError);
        });

        it('should handle provider-specific schema formatting', () => {
            const schema = z.object({
                name: z.string(),
                age: z.number()
            });

            // Test OpenAI format
            const openaiSchema = SchemaValidator.getProviderSchema(schema, 'openai');
            expect(typeof openaiSchema).toBe('string');
            const parsed = JSON.parse(openaiSchema);
            expect(parsed.type).toBe('object');
            expect(parsed.additionalProperties).toBe(false);

            // Test raw JSON schema
            const rawSchema = JSON.stringify({ type: 'object' });
            const unchanged = SchemaValidator.getProviderSchema(rawSchema, 'any');
            expect(unchanged).toBe(rawSchema);
        });
    });

    describe('Schema Formatting', () => {
        it('should add additionalProperties: false to all object levels', () => {
            const inputSchema = {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    details: {
                        type: 'object',
                        properties: {
                            age: { type: 'number' }
                        }
                    }
                }
            };

            const formattedSchema = SchemaFormatter.addAdditionalPropertiesFalse(inputSchema);
            expect(formattedSchema.additionalProperties).toBe(false);
            expect(formattedSchema.properties?.details.additionalProperties).toBe(false);
        });

        it('should format schema with name and description', () => {
            const schema = JSON.stringify({
                type: 'object',
                properties: {
                    test: { type: 'string' }
                }
            });

            const formattedSchema = SchemaFormatter.formatJsonSchema('TestSchema', schema);
            expect(formattedSchema.name).toBe('TestSchema');
            expect(formattedSchema.description).toBe('TestSchema');
            expect(formattedSchema.strict).toBe(true);
        });
    });

    describe('OpenAI Adapter JSON Mode', () => {
        let adapter: OpenAIAdapter;

        beforeEach(() => {
            // Reset mocks
            jest.clearAllMocks();
            adapter = new OpenAIAdapter('test-key');
            // Ensure the adapter has the test model
            const testModel = defaultModels.find(m => m.name === 'gpt-4o');
            if (testModel) {
                (adapter as any).models.set('gpt-4o', { ...testModel, jsonMode: true });
            }
        });

        it('should format params correctly for JSON mode', () => {
            const params = adapter.convertToProviderParams('gpt-4o', {
                messages: [{ role: 'user', content: 'test' }],
                settings: {
                    jsonSchema: {
                        name: 'Test',
                        schema: JSON.stringify({
                            type: 'object',
                            properties: {
                                test: { type: 'string' }
                            }
                        })
                    },
                    responseFormat: 'json'
                }
            });

            expect(params).toHaveProperty('response_format');
            expect(params).toHaveProperty('response_format.type', 'json_schema');
        });

        it('should handle Zod schema in JSON mode', () => {
            const TestSchema = z.object({
                test: z.string()
            });

            const params = adapter.convertToProviderParams('gpt-4o', {
                messages: [{ role: 'user', content: 'test' }],
                settings: {
                    jsonSchema: {
                        name: 'Test',
                        schema: TestSchema
                    },
                    responseFormat: 'json'
                }
            });

            expect(params).toHaveProperty('response_format');
            expect(params).toHaveProperty('response_format.type', 'json_schema');
        });
    });
}); 