import { JSONSchemaDefinition } from '../../interfaces/UniversalInterfaces';
import { z } from 'zod';
import { SchemaValidator } from './SchemaValidator';

export type JSONSchemaObject = {
    type?: string;
    properties?: Record<string, JSONSchemaObject>;
    items?: JSONSchemaObject;
    additionalProperties?: boolean;
    [key: string]: unknown;
};

export type FormattedSchema = {
    name: string;
    description: string;
    strict: boolean;
    schema: JSONSchemaObject;
};

export class SchemaFormatter {
    /**
     * Adds additionalProperties: false to all object levels in a JSON schema
     * This ensures strict validation at every level when using structured outputs
     */
    public static addAdditionalPropertiesFalse(schema: JSONSchemaObject): JSONSchemaObject {
        const result = { ...schema, additionalProperties: false };

        // Handle nested objects in properties
        if (typeof result.properties === 'object' && result.properties !== null) {
            result.properties = Object.entries(result.properties).reduce((acc, [key, value]) => {
                if (typeof value === 'object' && value !== null) {
                    // If it's an object type property, recursively add additionalProperties: false
                    if (value.type === 'object') {
                        acc[key] = this.addAdditionalPropertiesFalse(value);
                    }
                    // Handle arrays with object items
                    else if (value.type === 'array' && typeof value.items === 'object' && value.items !== null) {
                        if (value.items.type === 'object') {
                            acc[key] = {
                                ...value,
                                items: this.addAdditionalPropertiesFalse(value.items)
                            };
                        } else {
                            acc[key] = value;
                        }
                    } else {
                        acc[key] = value;
                    }
                } else {
                    acc[key] = value;
                }
                return acc;
            }, {} as Record<string, JSONSchemaObject>);
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

        if (schema instanceof z.ZodType) {
            return this.zodSchemaToString(schema);
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