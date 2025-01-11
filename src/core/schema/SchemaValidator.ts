import { z } from 'zod';
import { JSONSchemaDefinition } from '../../interfaces/UniversalInterfaces';

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
        const jsonSchema = this.zodTypeToJsonSchema(schema);
        return JSON.stringify(jsonSchema);
    }

    private static zodTypeToJsonSchema(zodType: z.ZodType): Record<string, unknown> {
        const def = (zodType as any)._def;

        // Handle optional types
        if (def.typeName === 'ZodOptional') {
            return this.zodTypeToJsonSchema(def.innerType);
        }

        switch (def.typeName) {
            case 'ZodObject': {
                const shape = def.shape?.();
                if (!shape) {
                    throw new Error('Invalid Zod schema: must be an object schema');
                }

                const properties: Record<string, unknown> = {};
                const required: string[] = [];

                for (const [key, value] of Object.entries(shape)) {
                    const fieldDef = (value as any)._def;
                    properties[key] = this.zodTypeToJsonSchema(value as z.ZodType);

                    // Add to required if not optional
                    if (fieldDef.typeName !== 'ZodOptional') {
                        required.push(key);
                    }
                }

                return {
                    type: 'object',
                    properties,
                    required: required.length > 0 ? required : undefined,
                    additionalProperties: false
                };
            }

            case 'ZodString': {
                const schema: Record<string, unknown> = { type: 'string' };
                if (def.checks?.some((check: any) => check.kind === 'email')) {
                    schema.format = 'email';
                }
                return schema;
            }

            case 'ZodNumber':
                return { type: 'number' };

            case 'ZodBoolean':
                return { type: 'boolean' };

            case 'ZodArray': {
                return {
                    type: 'array',
                    items: this.zodTypeToJsonSchema(def.type)
                };
            }

            case 'ZodEnum':
                return {
                    type: 'string',
                    enum: def.values
                };

            case 'ZodRecord':
                return {
                    type: 'object',
                    additionalProperties: this.zodTypeToJsonSchema(def.valueType)
                };

            default:
                return { type: 'string' }; // fallback
        }
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