import { z } from 'zod';

export function enforceZodLiterals(data: unknown, schema: z.ZodType): unknown {
    const def: any = (schema as any)?._def;
    const typeName: string | undefined = def?.typeName;

    if (typeName === 'ZodOptional' || typeName === 'ZodNullable' || typeName === 'ZodDefault') {
        const inner: z.ZodType = def.innerType as z.ZodType;
        const coerced = enforceZodLiterals(data, inner);
        return coerced;
    }

    // If this field itself is a literal and data is undefined/null, return the literal value
    if (typeName === 'ZodLiteral') return def.value;
    if (typeName === 'ZodEnum') {
        const values: string[] = Array.isArray(def?.values) ? def.values : (Array.isArray(def?.options) ? def.options : []);
        if (values.length === 1) return values[0];
        return data;
    }

    if (typeName === 'ZodArray') {
        const inner: z.ZodType = def.type as z.ZodType;
        if (!Array.isArray(data)) return data;
        return (data as unknown[]).map(item => enforceZodLiterals(item, inner));
    }

    if (typeName === 'ZodRecord') {
        const valueType: z.ZodType = def.valueType as z.ZodType;
        if (typeof data !== 'object' || data === null || Array.isArray(data)) return data;
        const result: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
            result[k] = enforceZodLiterals(v, valueType);
        }
        return result;
    }

    if (typeName === 'ZodObject') {
        if (typeof data !== 'object' || data === null || Array.isArray(data)) return data;
        const shape = typeof def.shape === 'function' ? def.shape() : def.shape;
        const result: Record<string, unknown> = { ...(data as Record<string, unknown>) };
        if (shape && typeof shape === 'object') {
            for (const [key, subSchema] of Object.entries(shape as Record<string, z.ZodType>)) {
                const sub = subSchema as z.ZodType;
                if (key in result) {
                    // Always recurse into existing fields to enforce nested literals
                    result[key] = enforceZodLiterals(result[key], sub);
                } else {
                    // Add missing fields if they are literals/single enums
                    const subDef: any = (sub as any)?._def;
                    const subType = subDef?.typeName;
                    // Also check for ZodObject with only literal fields (like z.object({format: z.literal('markdown')}))
                    if (subType === 'ZodLiteral') {
                        result[key] = subDef.value;
                    } else if (subType === 'ZodEnum') {
                        const values: string[] = Array.isArray(subDef?.values) ? subDef.values : (Array.isArray(subDef?.options) ? subDef.options : []);
                        if (values.length === 1) result[key] = values[0];
                    } else if (subType === 'ZodOptional' || subType === 'ZodNullable' || subType === 'ZodDefault') {
                        // For optional wrappers, check the inner type for single-literal
                        const inner: z.ZodType = subDef.innerType as z.ZodType;
                        const innerDef: any = (inner as any)?._def;
                        const innerType = innerDef?.typeName;
                        if (innerType === 'ZodLiteral') {
                            result[key] = innerDef.value;
                        } else if (innerType === 'ZodEnum') {
                            const values: string[] = Array.isArray(innerDef?.values) ? innerDef.values : (Array.isArray(innerDef?.options) ? innerDef.options : []);
                            if (values.length === 1) result[key] = values[0];
                        }
                    } else if (subType === 'ZodObject') {
                        // If the missing field is an object, create an empty object and enforce its literals
                        result[key] = enforceZodLiterals({}, sub);
                    }
                }
            }
        }
        return result;
    }

    return data;
}

export type JsonSchema = Record<string, unknown>;

export function enforceJsonLiterals(data: unknown, schema: JsonSchema): unknown {
    if (!schema || typeof schema !== 'object') return data;
    const enumVals = Array.isArray((schema as any).enum) ? ((schema as any).enum as unknown[]) : undefined;
    if (enumVals && enumVals.length === 1) return enumVals[0];

    const type = (schema as any).type as string | undefined;
    if (type === 'array') {
        if (!Array.isArray(data)) return data;
        const itemSchema = (schema as any).items as JsonSchema | undefined;
        if (itemSchema && typeof itemSchema === 'object') return (data as unknown[]).map(i => enforceJsonLiterals(i, itemSchema));
        return data;
    }
    if (type === 'object') {
        if (typeof data !== 'object' || data === null || Array.isArray(data)) return data;
        const props = (schema as any).properties as Record<string, JsonSchema> | undefined;
        const addl = (schema as any).additionalProperties as JsonSchema | boolean | undefined;
        const result: Record<string, unknown> = { ...(data as Record<string, unknown>) };
        if (props && typeof props === 'object') {
            for (const [k, subSchema] of Object.entries(props)) {
                if (k in result) {
                    // Always recurse into existing fields to enforce nested literals
                    result[k] = enforceJsonLiterals(result[k], subSchema as JsonSchema);
                } else {
                    // Add missing fields if they are single-literal enums or const values
                    const sub = subSchema as JsonSchema;
                    const ev = Array.isArray((sub as any).enum) ? ((sub as any).enum as unknown[]) : undefined;
                    const constVal = (sub as any).const;
                    if (ev && ev.length === 1) {
                        result[k] = ev[0];
                    } else if (constVal !== undefined) {
                        result[k] = constVal;
                    }
                }
            }
        }
        if (addl && typeof addl === 'object') {
            for (const [k, v] of Object.entries(result)) {
                if (!props || !(k in props)) result[k] = enforceJsonLiterals(v, addl as JsonSchema);
            }
        }
        return result;
    }
    return data;
}


