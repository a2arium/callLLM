import { z } from 'zod';

/**
 * Converts a JSON Schema object to a Zod schema at runtime.
 * Supports the subset of JSON Schema commonly used in tool definitions:
 * objects, strings, numbers, booleans, arrays, enums, descriptions, required/optional.
 */
export function jsonSchemaToZod(schema: Record<string, unknown>): z.ZodTypeAny {
    if (!schema || typeof schema !== 'object') {
        return z.any();
    }

    let zodSchema = convertNode(schema);

    if (schema.description && typeof schema.description === 'string') {
        zodSchema = zodSchema.describe(schema.description);
    }

    return zodSchema;
}

function convertNode(node: Record<string, unknown>): z.ZodTypeAny {
    const type = node.type as string | undefined;

    // Handle enum before type check (enum can appear with or without type)
    if (Array.isArray(node.enum) && node.enum.length > 0) {
        return z.enum(node.enum as any);
    }

    switch (type) {
        case 'string':
            return z.string();

        case 'number':
        case 'integer':
            return z.number();

        case 'boolean':
            return z.boolean();

        case 'null':
            return z.null();

        case 'array': {
            const items = node.items as Record<string, unknown> | undefined;
            if (items && typeof items === 'object') {
                return z.array(jsonSchemaToZod(items));
            }
            return z.array(z.any());
        }

        case 'object': {
            const properties = node.properties as Record<string, Record<string, unknown>> | undefined;
            const required = (node.required as string[]) || [];

            if (!properties || Object.keys(properties).length === 0) {
                return z.record(z.string(), z.any());
            }

            const shape: Record<string, z.ZodTypeAny> = {};
            for (const [key, propSchema] of Object.entries(properties)) {
                let field = jsonSchemaToZod(propSchema);
                if (!required.includes(key)) {
                    field = field.optional();
                }
                shape[key] = field;
            }
            return z.object(shape);
        }

        default:
            return z.any();
    }
}
