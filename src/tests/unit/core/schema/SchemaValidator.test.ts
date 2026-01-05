import { jest } from '@jest/globals';
import { z } from 'zod';
import { SchemaValidator, SchemaValidationError } from '../../../../core/schema/SchemaValidator.ts';

describe('SchemaValidator', () => {
  describe('validate', () => {
    it('should validate data against a Zod schema', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });
      const validData = { name: 'test', age: 25 };

      const result = SchemaValidator.validate(validData, schema);
      expect(result).toEqual(validData);
    });

    it('should throw SchemaValidationError for invalid data', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });
      const invalidData = { name: 'test' };

      expect(() => SchemaValidator.validate(invalidData, schema)).
        toThrow(SchemaValidationError);
    });

    it('should include validation error details', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        email: z.string().email()
      });
      const invalidData = { name: 'test', age: 'not-a-number', email: 'invalid-email' };

      try {
        SchemaValidator.validate(invalidData, schema);
        throw new Error('Expected validation to fail');
      } catch (error) {
        expect(error).toBeInstanceOf(SchemaValidationError);
        if (error instanceof SchemaValidationError) {
          expect(error.validationErrors).toHaveLength(2);
          expect(error.validationErrors).toContainEqual(
            expect.objectContaining({
              path: 'age',
              message: expect.any(String)
            })
          );
          expect(error.validationErrors).toContainEqual(
            expect.objectContaining({
              path: 'email',
              message: expect.any(String)
            })
          );
        }
      }
    });

    it('should handle string-based JSON schema (TODO implementation)', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name', 'age']
      });
      const data = { name: 'test', age: 25 };

      const result = SchemaValidator.validate(data, schema);
      expect(result).toEqual(data); // Currently returns data as-is
    });

    it('should throw error for invalid schema type', () => {
      const invalidSchema = { type: 'object' }; // Not a string or Zod schema
      const data = { name: 'test' };

      expect(() => SchemaValidator.validate(data, invalidSchema as any)).
        toThrow('Invalid schema type');
    });

    it('should wrap unknown errors in SchemaValidationError', () => {
      const schema = z.object({
        name: z.string()
      });
      const data = { name: 'test' };

      // Mock the Zod schema's safeParse to throw a non-Error
      jest.spyOn(schema, 'safeParse').mockImplementation(() => {
        throw { custom: 'error' };
      });

      try {
        SchemaValidator.validate(data, schema);
        throw new Error('Expected validation to fail');
      } catch (error) {
        expect(error).toBeInstanceOf(SchemaValidationError);
        if (error instanceof SchemaValidationError) {
          expect(error.message).toBe('Unknown validation error');
        }
      }
    });
  });

  describe('zodToJsonSchema', () => {
    it('should convert object schema with required fields', () => {
      const zodSchema = z.object({
        name: z.string(),
        age: z.number()
      });

      const jsonSchema = JSON.parse(SchemaValidator.zodToJsonSchemaString(zodSchema));
      expect(jsonSchema).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name', 'age'],
        additionalProperties: false
      });
    });

    it('should handle optional fields', () => {
      const zodSchema = z.object({
        name: z.string(),
        age: z.number().optional()
      });

      const jsonSchema = JSON.parse(SchemaValidator.zodToJsonSchemaString(zodSchema));
      expect(jsonSchema).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name'],
        additionalProperties: false
      });
    });

    it('should handle email format', () => {
      const zodSchema = z.object({
        email: z.string().email()
      });

      const jsonSchema = JSON.parse(SchemaValidator.zodToJsonSchemaString(zodSchema));
      expect(jsonSchema.properties.email).toEqual({
        type: 'string',
        format: 'email'
      });
    });

    it('should handle arrays', () => {
      const zodSchema = z.object({
        tags: z.array(z.string())
      });

      const jsonSchema = JSON.parse(SchemaValidator.zodToJsonSchemaString(zodSchema));
      expect(jsonSchema.properties.tags).toEqual({
        type: 'array',
        items: { type: 'string' }
      });
    });

    it('should handle enums', () => {
      const zodSchema = z.object({
        role: z.enum(['admin', 'user'])
      });

      const jsonSchema = JSON.parse(SchemaValidator.zodToJsonSchemaString(zodSchema));
      expect(jsonSchema.properties.role).toEqual({
        type: 'string',
        enum: ['admin', 'user']
      });
    });

    it('should handle records', () => {
      const zodSchema = z.object({
        metadata: z.record(z.string())
      });

      const jsonSchema = JSON.parse(SchemaValidator.zodToJsonSchemaString(zodSchema));
      expect(jsonSchema.properties.metadata).toEqual({
        type: 'object',
        additionalProperties: { type: 'string' }
      });
    });

    it('should handle nested objects', () => {
      const zodSchema = z.object({
        user: z.object({
          name: z.string(),
          address: z.object({
            street: z.string(),
            city: z.string()
          })
        })
      });

      const jsonSchema = JSON.parse(SchemaValidator.zodToJsonSchemaString(zodSchema));
      expect(jsonSchema.properties.user.properties.address).toEqual({
        type: 'object',
        properties: {
          street: { type: 'string' },
          city: { type: 'string' }
        },
        required: ['street', 'city'],
        additionalProperties: false
      });
    });

    it('should handle unknown types', () => {
      const zodSchema = z.object({
        unknown: z.any()
      });

      const jsonSchema = JSON.parse(SchemaValidator.zodToJsonSchemaString(zodSchema));
      expect(jsonSchema.properties.unknown).toEqual({
        type: 'string' // fallback type
      });
    });

    it('should include descriptions from Zod schema', () => {
      const zodSchema = z.object({
        name: z.string().describe('The user\'s full name'),
        email: z.string().email().describe('The user\'s email address'),
        age: z.number().describe('The user\'s age in years')
      }).describe('A user profile schema with personal information');

      const jsonSchema = JSON.parse(SchemaValidator.zodToJsonSchemaString(zodSchema));

      // Check schema-level description
      expect(jsonSchema.description).toBe('A user profile schema with personal information');

      // Check field-level descriptions
      expect(jsonSchema.properties.name.description).toBe('The user\'s full name');
      expect(jsonSchema.properties.email.description).toBe('The user\'s email address');
      expect(jsonSchema.properties.age.description).toBe('The user\'s age in years');
    });
  });

  describe('getSchemaString', () => {
    it('should return string schema as-is', () => {
      const schema = '{"type":"object"}';
      expect(SchemaValidator.getSchemaString(schema)).toBe(schema);
    });

    it('should convert Zod schema to JSON schema string', () => {
      const zodSchema = z.object({
        name: z.string()
      });

      const result = SchemaValidator.getSchemaString(zodSchema);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        required: ['name'],
        additionalProperties: false
      });
    });
  });

  describe('robustness', () => {
    it('should correctly identify duck-typed Zod objects', () => {
      // Simulate an object that looks like a ZodObject but fails instanceof check
      const duckTypedSchema = {
        _def: {
          typeName: 'ZodObject',
          shape: () => ({
            name: {
              _def: { typeName: 'ZodString' },
              description: 'The user\'s name'
            }
          })
        },
        description: 'A duck-typed schema'
      };

      const result = JSON.parse(SchemaValidator.zodToJsonSchemaString(duckTypedSchema as any));
      expect(result).toEqual({
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The user\'s name'
          }
        },
        required: ['name'],
        additionalProperties: false,
        description: 'A duck-typed schema'
      });
    });
  });
});