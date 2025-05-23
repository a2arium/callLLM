import type { JSONSchemaDefinition } from '../../interfaces/UniversalInterfaces.ts';
import { z } from 'zod';
import { SchemaValidator } from './SchemaValidator.ts';

export type JSONSchemaObject = {
    type?: string;
    properties?: Record<string, JSONSchemaObject>;
    items?: JSONSchemaObject;
    additionalProperties?: boolean;
    [key: string]: unknown;
};

/**
 * Detects if an object is a Zod schema by first trying instanceof check and falling back to structure checks
 * This works with different instances of Zod
 */
export function isZodSchema(obj: unknown): boolean {
    // First try the faster instanceof check (when Zod instances match)
    if (obj instanceof z.ZodType) {
        return true;
    }

    // Fall back to duck typing if the instanceof check fails
    return Boolean(
        obj &&
        typeof obj === 'object' &&
        obj !== null &&
        // Check for typical Zod internals
        '_def' in obj &&
        // Additional Zod method checks
        typeof (obj as any).safeParse === 'function' &&
        typeof (obj as any).parse === 'function'
    );
}

export type FormattedSchema = {
    name: string;
    description: string;
    strict: boolean;
    schema: JSONSchemaObject;
};

export class SchemaFormatter {
    /**
     * Adds additionalProperties: false to all objects in a schema
     */
    public static addAdditionalPropertiesFalse(schema: unknown): Record<string, unknown> {
        if (!schema || typeof schema !== 'object') {
            return schema as Record<string, unknown>;
        }

        if (Array.isArray(schema)) {
            return schema.map(item => this.addAdditionalPropertiesFalse(item)) as unknown as Record<string, unknown>;
        }

        const result: Record<string, unknown> = { ...schema as Record<string, unknown> };

        // If it's an object schema, add additionalProperties: false
        if (result.type === 'object' && result.properties) {
            result.additionalProperties = false;

            // Process nested properties
            const properties = result.properties as Record<string, unknown>;
            for (const key in properties) {
                properties[key] = this.addAdditionalPropertiesFalse(properties[key]);
            }
        }

        // If it's an array schema, process items
        if (result.type === 'array' && result.items) {
            result.items = this.addAdditionalPropertiesFalse(result.items);
        }

        return result;
    }

    /**
     * Converts a schema definition to a readable string format
     */
    public static schemaToString(schema: JSONSchemaDefinition): string {
        if (typeof schema === 'string') {
            return schema;
        }

        if (isZodSchema(schema)) {
            return this.zodSchemaToString(schema as z.ZodType);
        }

        throw new Error('Unsupported schema type');
    }

    /**
     * Converts a Zod schema to a readable string format
     */
    public static zodSchemaToString(schema: z.ZodType): string {
        // Convert Zod schema to JSON Schema format
        const jsonSchema = SchemaValidator.getSchemaObject(schema);

        // Add any description as a property in the schema
        if (schema.description) {
            (jsonSchema as any).description = schema.description;
        }

        return JSON.stringify(jsonSchema);
    }
} 