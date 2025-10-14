import { z } from 'zod';

export function coerceDataToZodSchema(data: unknown, schema: z.ZodType): unknown {
    const def: any = (schema as any)?._def;
    const typeName: string | undefined = def?.typeName;

    if (typeName === 'ZodOptional' || typeName === 'ZodNullable') {
        const inner: z.ZodType = def.innerType as z.ZodType;
        if (data === undefined || data === null) return data;
        return coerceDataToZodSchema(data, inner);
    }

    if (typeName === 'ZodDefault') {
        const inner: z.ZodType = def.innerType as z.ZodType;
        return coerceDataToZodSchema(data, inner);
    }

    if (typeName === 'ZodLiteral') {
        // Force literal value
        return def.value;
    }

    if (typeName === 'ZodEnum') {
        const values: string[] = Array.isArray(def?.values) ? def.values : (Array.isArray(def?.options) ? def.options : []);
        if (Array.isArray(values) && values.length === 1) return values[0];
        return data;
    }

    if (typeName === 'ZodArray') {
        const inner: z.ZodType = def.type as z.ZodType;
        if (typeof data === 'string') {
            const s = data.trim();
            if (s.startsWith('[') && s.endsWith(']')) {
                try { data = JSON.parse(s); } catch { /* keep raw */ }
            }
        }
        if (!Array.isArray(data)) return data;
        return (data as unknown[]).map(item => coerceDataToZodSchema(item, inner));
    }

    if (typeName === 'ZodRecord') {
        const valueType: z.ZodType = def.valueType as z.ZodType;
        if (typeof data === 'string') {
            const s = data.trim();
            if (s.startsWith('{') && s.endsWith('}')) {
                try { data = JSON.parse(s); } catch { /* keep raw */ }
            }
        }
        if (typeof data !== 'object' || data === null || Array.isArray(data)) return data;
        const result: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
            result[k] = coerceDataToZodSchema(v, valueType);
        }
        return result;
    }

    if (typeName === 'ZodObject') {
        if (typeof data === 'string') {
            const s = data.trim();
            if (s.startsWith('{') && s.endsWith('}')) {
                try { data = JSON.parse(s); } catch { /* keep raw */ }
            }
        }
        if (typeof data !== 'object' || data === null || Array.isArray(data)) return data;
        const shape = typeof def.shape === 'function' ? def.shape() : def.shape;
        const result: Record<string, unknown> = { ...data as Record<string, unknown> };
        if (shape && typeof shape === 'object') {
            for (const [key, subSchema] of Object.entries(shape as Record<string, z.ZodType>)) {
                if (key in result) {
                    result[key] = coerceDataToZodSchema(result[key], subSchema as z.ZodType);
                } else {
                    // Insert missing literals/enums with single choice
                    const subDef: any = (subSchema as any)?._def;
                    const subType = subDef?.typeName;
                    if (subType === 'ZodLiteral') {
                        result[key] = subDef.value;
                    } else if (subType === 'ZodEnum') {
                        const values: string[] = Array.isArray(subDef?.values) ? subDef.values : (Array.isArray(subDef?.options) ? subDef.options : []);
                        if (values.length === 1) result[key] = values[0];
                    } else if (subType === 'ZodDefault') {
                        // Use Zod's default value factory
                        try {
                            result[key] = (subSchema as any)._def.defaultValue();
                        } catch { /* ignore */ }
                    }
                }
            }
        }
        return result;
    }

    return data;
}


