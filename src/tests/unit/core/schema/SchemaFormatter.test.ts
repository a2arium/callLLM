import { jest } from "@jest/globals";import { SchemaFormatter } from '../../../../core/schema/SchemaFormatter.js';
import type { JSONSchemaObject } from '../../../../core/schema/SchemaFormatter.js';
import { z } from 'zod';

describe('SchemaFormatter', () => {
  describe('addAdditionalPropertiesFalse', () => {
    it('should add additionalProperties: false to root level object', () => {
      const input: JSONSchemaObject = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      };

      const result = SchemaFormatter.addAdditionalPropertiesFalse(input);

      expect(result).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        additionalProperties: false
      });
    });

    it('should handle nested object properties', () => {
      const input: JSONSchemaObject = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number' }
            }
          }
        }
      };

      const result = SchemaFormatter.addAdditionalPropertiesFalse(input);

      expect(result).toEqual({
        type: 'object',
        additionalProperties: false,
        properties: {
          user: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              age: { type: 'number' }
            }
          }
        }
      });
    });

    it('should handle arrays with object items', () => {
      const input: JSONSchemaObject = {
        type: 'object',
        properties: {
          users: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' }
              }
            }
          }
        }
      };

      const result = SchemaFormatter.addAdditionalPropertiesFalse(input);

      expect(result).toEqual({
        type: 'object',
        additionalProperties: false,
        properties: {
          users: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                name: { type: 'string' }
              }
            }
          }
        }
      });
    });

    it('should not modify non-object properties', () => {
      const input: JSONSchemaObject = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          tags: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      };

      const result = SchemaFormatter.addAdditionalPropertiesFalse(input);

      expect(result).toEqual({
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          tags: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      });
    });

    it('should handle empty properties', () => {
      const input: JSONSchemaObject = {
        type: 'object',
        properties: {
          emptyProp: { type: 'null' },
          optionalProp: { type: 'string', nullable: true }
        }
      };

      const result = SchemaFormatter.addAdditionalPropertiesFalse(input);

      expect(result).toEqual({
        type: 'object',
        additionalProperties: false,
        properties: {
          emptyProp: { type: 'null' },
          optionalProp: { type: 'string', nullable: true }
        }
      });
    });
  });

  describe('schemaToString', () => {
    it('should return string schema as-is', () => {
      const schema = '{"type":"object","properties":{"name":{"type":"string"}}}';
      expect(SchemaFormatter.schemaToString(schema)).toBe(schema);
    });

    it('should convert Zod schema with description to string', () => {
      const zodSchema = z.object({
        name: z.string(),
        age: z.number()
      }).describe('A user profile schema');

      const result = SchemaFormatter.schemaToString(zodSchema);
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name', 'age'],
        additionalProperties: false,
        description: 'A user profile schema'
      });
    });

    it('should convert Zod schema without description to JSON string', () => {
      const zodSchema = z.object({
        name: z.string(),
        age: z.number()
      });

      const result = SchemaFormatter.schemaToString(zodSchema);
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name', 'age'],
        additionalProperties: false
      });
    });

    it('should throw error for unsupported schema type', () => {
      const invalidSchema = { type: 'object' };
      expect(() => SchemaFormatter.schemaToString(invalidSchema as any)).
      toThrow('Unsupported schema type');
    });
  });

  describe('zodSchemaToString', () => {
    it('should convert schema to JSON Schema format with description', () => {
      const zodSchema = z.object({
        name: z.string().describe('The user\'s name'),
        age: z.number().describe('The user\'s age')
      }).describe('A user profile schema');

      const result = SchemaFormatter.zodSchemaToString(zodSchema);
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string', description: "The user's name" },
          age: { type: 'number', description: "The user's age" }
        },
        required: ['name', 'age'],
        additionalProperties: false,
        description: 'A user profile schema'
      });
    });

    it('should convert schema to JSON Schema format without description', () => {
      const zodSchema = z.object({
        name: z.string(),
        age: z.number()
      });

      const result = SchemaFormatter.zodSchemaToString(zodSchema);
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name', 'age'],
        additionalProperties: false
      });
    });
  });
});