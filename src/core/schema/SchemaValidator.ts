import { z } from 'zod';
import { SchemaFormatter, isZodSchema } from './SchemaFormatter';
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
            } else if (isZodSchema(schema)) {
                // Validate using Zod
                const zodSchema = schema as z.ZodType;
                const result = zodSchema.safeParse(data);
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
    public static zodToJsonSchemaString(schema: z.ZodType): string {
        const jsonSchema = this.zodTypeToJsonSchema(schema);
        return JSON.stringify(jsonSchema);
    }

    private static zodTypeToJsonSchema(zodType: z.ZodType): Record<string, unknown> {
        const def = (zodType as any)._def;

        // Handle optional types
        if (def.typeName === 'ZodOptional') {
            return this.zodTypeToJsonSchema(def.innerType);
        }

        let schema: Record<string, unknown>;

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

                schema = {
                    type: 'object',
                    properties,
                    required: required.length > 0 ? required : undefined,
                    additionalProperties: false
                };
                break;
            }

            case 'ZodString': {
                schema = { type: 'string' };
                if (def.checks?.some((check: any) => check.kind === 'email')) {
                    schema.format = 'email';
                }
                break;
            }

            case 'ZodNumber':
                schema = { type: 'number' };
                break;

            case 'ZodBoolean':
                schema = { type: 'boolean' };
                break;

            case 'ZodArray': {
                schema = {
                    type: 'array',
                    items: this.zodTypeToJsonSchema(def.type)
                };
                break;
            }

            case 'ZodEnum':
                schema = {
                    type: 'string',
                    enum: def.values
                };
                break;

            case 'ZodRecord':
                schema = {
                    type: 'object',
                    additionalProperties: this.zodTypeToJsonSchema(def.valueType)
                };
                break;

            default:
                schema = { type: 'string' }; // fallback
                break;
        }

        // Add description if present
        if (zodType.description) {
            schema.description = zodType.description;
        }

        return schema;
    }

    /**
     * Gets the appropriate schema format for a provider
     */
    public static getSchemaString(schema: JSONSchemaDefinition): string {
        if (typeof schema === 'string') {
            return schema;
        }
        return this.zodToJsonSchemaString(schema as z.ZodType);
    }

    public static getSchemaObject(schema: JSONSchemaDefinition): object {
        if (typeof schema === 'string') {
            return SchemaFormatter.addAdditionalPropertiesFalse(JSON.parse(schema));
        }

        if (isZodSchema(schema)) {
            return this.zodTypeToJsonSchema(schema as z.ZodType);
        }

        throw new Error('Unsupported schema type');
    }
} 