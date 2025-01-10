import { z } from 'zod';
import { JSONSchemaDefinition } from '../interfaces/UniversalInterfaces';

export class SchemaValidationError extends Error {
    constructor(
        message: string,
        public readonly validationErrors: Array<{ path: string; message: string }> = []
    ) {
        super(message);
        this.name = 'SchemaValidationError';
    }
}

export class SchemaValidator {
    /**
     * Validates data against a schema
     * @throws SchemaValidationError if validation fails
     */
    public static validate(data: unknown, schema: JSONSchemaDefinition): unknown {
        try {
            if (typeof schema === 'string') {
                // Parse JSON Schema string and validate
                const jsonSchema = JSON.parse(schema);
                // TODO: Implement JSON Schema validation
                // For now, just return the data as we'll implement proper JSON Schema validation later
                return data;
            } else if (schema instanceof z.ZodType) {
                // Validate using Zod
                const result = schema.safeParse(data);
                if (!result.success) {
                    throw new SchemaValidationError(
                        'Validation failed',
                        result.error.errors.map(err => ({
                            path: err.path.join('.'),
                            message: err.message
                        }))
                    );
                }
                return result.data;
            }
            throw new Error('Invalid schema type');
        } catch (error) {
            if (error instanceof SchemaValidationError) {
                throw error;
            }
            throw new SchemaValidationError(
                error instanceof Error ? error.message : 'Unknown validation error'
            );
        }
    }

    /**
     * Converts a Zod schema to JSON Schema string
     */
    public static zodToJsonSchema(schema: z.ZodType): string {
        // TODO: Implement proper Zod to JSON Schema conversion
        // For now return a basic schema that accepts any object
        return JSON.stringify({
            type: 'object',
            additionalProperties: true
        });
    }

    /**
     * Gets the appropriate schema format for a provider
     */
    public static getProviderSchema(schema: JSONSchemaDefinition, provider: string): string {
        if (typeof schema === 'string') {
            return schema;
        }
        return this.zodToJsonSchema(schema);
    }
} 