export type JsonSchema = Record<string, unknown>;

function looksLikeJsonArray(s: string): boolean {
    const t = s.trim();
    return t.startsWith('[') && t.endsWith(']');
}
function looksLikeJsonObject(s: string): boolean {
    const t = s.trim();
    return t.startsWith('{') && t.endsWith('}');
}

export function coerceDataToJsonSchema(data: unknown, schema: JsonSchema): unknown {
    if (!schema || typeof schema !== 'object') return data;
    const type = (schema as any).type as string | undefined;
    const enumVals = Array.isArray((schema as any).enum) ? ((schema as any).enum as unknown[]) : undefined;

    // Single enum literal
    if (enumVals && enumVals.length === 1) return enumVals[0];

    if (type === 'array') {
        if (typeof data === 'string' && looksLikeJsonArray(data)) {
            try { data = JSON.parse(data); } catch { /* ignore */ }
        }
        if (!Array.isArray(data)) return data;
        const itemSchema = (schema as any).items as JsonSchema | undefined;
        if (itemSchema && typeof itemSchema === 'object') {
            return (data as unknown[]).map(item => coerceDataToJsonSchema(item, itemSchema));
        }
        return data;
    }

    if (type === 'object') {
        if (typeof data === 'string' && looksLikeJsonObject(data)) {
            try { data = JSON.parse(data); } catch { /* ignore */ }
        }
        if (typeof data !== 'object' || data === null || Array.isArray(data)) return data;
        const props = (schema as any).properties as Record<string, JsonSchema> | undefined;
        const addl = (schema as any).additionalProperties as JsonSchema | boolean | undefined;
        const result: Record<string, unknown> = { ...(data as Record<string, unknown>) };
        if (props && typeof props === 'object') {
            for (const [k, subSchema] of Object.entries(props)) {
                if (k in result) result[k] = coerceDataToJsonSchema(result[k], subSchema as JsonSchema);
            }
        }
        if (addl && typeof addl === 'object') {
            for (const [k, v] of Object.entries(result)) {
                if (!props || !(k in props)) result[k] = coerceDataToJsonSchema(v, addl as JsonSchema);
            }
        }
        return result;
    }

    // Recurse composition if present
    for (const key of ['oneOf', 'anyOf', 'allOf']) {
        const list = (schema as any)[key];
        if (Array.isArray(list) && list.length === 1 && typeof list[0] === 'object') {
            return coerceDataToJsonSchema(data, list[0] as JsonSchema);
        }
    }

    return data;
}


