import { Converter } from '../../../../adapters/openai/converter';
import { UniversalChatParams, JSONSchemaDefinition } from '../../../../interfaces/UniversalInterfaces';
import { z } from 'zod';

// Mock SchemaValidator
jest.mock('../../../../core/schema/SchemaValidator', () => ({
    SchemaValidator: {
        getSchemaObject: jest.fn((schema) => {
            if (typeof schema === 'string') {
                try {
                    return JSON.parse(schema);
                } catch {
                    return null;
                }
            }
            return schema;
        })
    }
}));

// Mock SchemaFormatter
jest.mock('../../../../core/schema/SchemaFormatter', () => ({
    SchemaFormatter: {
        addAdditionalPropertiesFalse: jest.fn((schema) => {
            // Simple implementation that just returns the schema with additionalProperties: false
            if (schema && typeof schema === 'object') {
                return { ...schema, additionalProperties: false };
            }
            return schema;
        })
    }
}));

describe('JSON Schema Support', () => {
    test('should handle simple JSON response format', () => {
        const params: Partial<UniversalChatParams> = {
            model: 'gpt-4o',
            messages: [{ role: 'user', content: 'Hello' }],
            responseFormat: 'json'
        };

        const converter = new Converter();
        const result = converter.convertToOpenAIResponseParams('gpt-4o', params as UniversalChatParams);

        expect(result.text).toBeDefined();
        if (result.text?.format) {
            expect(result.text.format.type).toBe('json_object');
        } else {
            fail('Text format should be defined');
        }
    });

    test('should handle JSON schema string', () => {
        const jsonSchema = {
            type: 'object',
            properties: {
                name: { type: 'string' },
                age: { type: 'number' }
            },
            required: ['name', 'age'],
            additionalProperties: false
        };

        const params: Partial<UniversalChatParams> = {
            messages: [{ role: 'user', content: 'Hello' }],
            jsonSchema: {
                name: 'Person',
                schema: JSON.stringify(jsonSchema) as JSONSchemaDefinition
            },
            model: 'gpt-4o'
        };

        const converter = new Converter();
        const result = converter.convertToOpenAIResponseParams('gpt-4o', params as UniversalChatParams);

        expect(result.text).toBeDefined();
        if (result.text?.format) {
            expect(result.text.format.type).toBe('json_schema');
            expect((result.text.format as any).name).toBe('Person');
            expect((result.text.format as any).schema).toBeDefined();
        } else {
            fail('Text format should be defined');
        }
    });

    test('should handle Zod schema', () => {
        const zodSchema = z.object({
            name: z.string(),
            age: z.number()
        });

        const params: Partial<UniversalChatParams> = {
            messages: [{ role: 'user', content: 'Hello' }],
            jsonSchema: {
                name: 'Person',
                schema: zodSchema
            },
            model: 'gpt-4o'
        };

        const converter = new Converter();
        const result = converter.convertToOpenAIResponseParams('gpt-4o', params as UniversalChatParams);

        expect(result.text).toBeDefined();
        if (result.text?.format) {
            expect(result.text.format.type).toBe('json_schema');
            expect((result.text.format as any).name).toBe('Person');
        } else {
            fail('Text format should be defined');
        }
    });

    test('should handle object schema', () => {
        const objectSchema = {
            type: 'object',
            properties: {
                name: { type: 'string' },
                age: { type: 'number' }
            },
            required: ['name', 'age']
        };

        const params: Partial<UniversalChatParams> = {
            messages: [{ role: 'user', content: 'Hello' }],
            jsonSchema: {
                name: 'Person',
                schema: JSON.stringify(objectSchema) as JSONSchemaDefinition
            },
            model: 'gpt-4o'
        };

        const converter = new Converter();
        const result = converter.convertToOpenAIResponseParams('gpt-4o', params as UniversalChatParams);

        expect(result.text).toBeDefined();
        if (result.text?.format) {
            expect(result.text.format.type).toBe('json_schema');
            expect((result.text.format as any).name).toBe('Person');
        } else {
            fail('Text format should be defined');
        }
    });

    test('should handle invalid JSON schema string', () => {
        const params: Partial<UniversalChatParams> = {
            messages: [{ role: 'user', content: 'Hello' }],
            jsonSchema: {
                name: 'Person',
                schema: 'not a valid json'
            },
            model: 'gpt-4o'
        };

        const converter = new Converter();
        const result = converter.convertToOpenAIResponseParams('gpt-4o', params as UniversalChatParams);

        expect(result.text).toBeDefined();
        if (result.text?.format) {
            expect(result.text.format.type).toBe('json_object');
        } else {
            fail('Text format should be defined');
        }
    });

    test('should ensure additionalProperties is false in all schema objects', () => {
        const objectSchema = {
            type: 'object',
            properties: {
                name: { type: 'string' },
                age: { type: 'number' }
            },
            required: ['name', 'age']
            // Intentionally omitting additionalProperties to test it gets added
        };

        const params: Partial<UniversalChatParams> = {
            messages: [{ role: 'user', content: 'Hello' }],
            jsonSchema: {
                name: 'Person',
                schema: JSON.stringify(objectSchema) as JSONSchemaDefinition
            },
            model: 'gpt-4o'
        };

        const converter = new Converter();
        const result = converter.convertToOpenAIResponseParams('gpt-4o', params as UniversalChatParams);

        expect(result.text).toBeDefined();
        if (result.text?.format) {
            expect(result.text.format.type).toBe('json_schema');
            expect((result.text.format as any).schema?.additionalProperties).toBe(false);
        } else {
            fail('Text format should be defined');
        }
    });
}); 