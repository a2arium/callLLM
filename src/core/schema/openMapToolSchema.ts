import { jsonrepair } from 'jsonrepair';

export type JsonSchemaNode = Record<string, unknown>;

export type RewriteOpenMapsResult = {
    schema: JsonSchemaNode;
    encodedPaths: string[];
};

export class OpenMapToolSchemaError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'OpenMapToolSchemaError';
    }
}

export class OpenMapDecodeError extends Error {
    readonly path: string;

    constructor(path: string, message: string) {
        super(message);
        this.name = 'OpenMapDecodeError';
        this.path = path;
    }
}

const JSON_STRING_DESCRIPTION =
    'A JSON-encoded object. Pass a JSON string representing an arbitrary object (keys not known at tool declaration time).';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasDeclaredProperties(node: Record<string, unknown>): boolean {
    return isRecord(node.properties) && Object.keys(node.properties).length > 0;
}

/**
 * An open map is an object schema that explicitly allows unknown keys.
 * Omitted `additionalProperties` is NOT treated as open (most tools omit it and
 * closed-object providers already force `false`).
 */
export function isOpenMapJsonSchema(node: unknown): boolean {
    if (!isRecord(node)) return false;
    if (node.type !== 'object' && node.type !== undefined) return false;

    const additional = node.additionalProperties;
    if (additional === true) return true;
    if (isRecord(additional)) return true;

    // Zod `z.record` emits propertyNames + additionalProperties:{} (schema object),
    // already covered above. Also treat propertyNames-only open maps with no properties.
    if (isRecord(node.propertyNames) && !hasDeclaredProperties(node)) {
        return true;
    }

    return false;
}

function toJsonStringSchema(original: Record<string, unknown>): JsonSchemaNode {
    const description =
        typeof original.description === 'string' && original.description.trim().length > 0
            ? `${original.description} (${JSON_STRING_DESCRIPTION})`
            : JSON_STRING_DESCRIPTION;

    return {
        type: 'string',
        description
    };
}

function rewriteSchemaContainer(
    node: unknown,
    path: string,
    encodedPaths: string[]
): unknown {
    if (Array.isArray(node)) {
        return node.map((item, index) => rewriteSchemaContainer(item, `${path}[${index}]`, encodedPaths));
    }
    if (!isRecord(node)) {
        return node;
    }

    // Encode this entire node as a JSON string (do not recurse into its children).
    if (isOpenMapJsonSchema(node)) {
        encodedPaths.push(path || '$');
        return toJsonStringSchema(node);
    }

    const result: JsonSchemaNode = { ...node };

    if (isRecord(result.properties)) {
        const nextProperties: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(result.properties)) {
            const childPath = path ? `${path}.${key}` : key;
            nextProperties[key] = rewriteSchemaContainer(value, childPath, encodedPaths);
        }
        result.properties = nextProperties;
    }

    if ('items' in result) {
        const itemsPath = path ? `${path}[*]` : '[*]';
        result.items = rewriteSchemaContainer(result.items, itemsPath, encodedPaths);
    }

    for (const defsKey of ['$defs', 'definitions'] as const) {
        if (isRecord(result[defsKey])) {
            const defs = result[defsKey] as Record<string, unknown>;
            const nextDefs: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(defs)) {
                nextDefs[key] = rewriteSchemaContainer(value, path ? `${path}.${defsKey}.${key}` : `${defsKey}.${key}`, encodedPaths);
            }
            result[defsKey] = nextDefs;
        }
    }

    return result;
}

/**
 * Deep-clones `schema` and rewrites nested open-map object nodes to JSON strings.
 * Does not mutate the input. Root open maps are left for the caller to reject —
 * this function still rewrites them and reports path `$`.
 */
export function rewriteOpenMapsToJsonStrings(schema: JsonSchemaNode): RewriteOpenMapsResult {
    const encodedPaths: string[] = [];
    const clone = JSON.parse(JSON.stringify(schema)) as JsonSchemaNode;
    const rewritten = rewriteSchemaContainer(clone, '', encodedPaths) as JsonSchemaNode;
    return {
        schema: rewritten,
        encodedPaths
    };
}

/**
 * Assert that tool root parameters are not themselves an open map.
 * Tool roots must remain `type: 'object'` with named properties.
 */
export function assertToolRootIsNotOpenMap(
    schema: JsonSchemaNode,
    toolName?: string
): void {
    if (!isOpenMapJsonSchema(schema)) return;
    const where = toolName ? `Tool "${toolName}"` : 'Tool';
    throw new OpenMapToolSchemaError(
        `${where} parameters root is an open map (additionalProperties/propertyNames). ` +
        'Nest the free-form object under a named property instead.'
    );
}

function parseJsonObject(value: string, path: string): unknown {
    try {
        return JSON.parse(value);
    } catch {
        try {
            return JSON.parse(jsonrepair(value));
        } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            throw new OpenMapDecodeError(
                path,
                `Failed to parse JSON-encoded open-map field at "${path}": ${detail}`
            );
        }
    }
}

function decodeValue(
    value: unknown,
    schemaNode: unknown,
    path: string
): unknown {
    if (!isRecord(schemaNode)) {
        return value;
    }

    if (isOpenMapJsonSchema(schemaNode)) {
        if (typeof value === 'string') {
            return parseJsonObject(value, path || '$');
        }
        // Already an object (or other non-string): leave as-is for idempotency.
        return value;
    }

    if (Array.isArray(value) && 'items' in schemaNode) {
        const itemsSchema = schemaNode.items;
        return value.map((item, index) =>
            decodeValue(item, itemsSchema, path ? `${path}[${index}]` : `[${index}]`)
        );
    }

    if (isRecord(value) && isRecord(schemaNode.properties)) {
        const result: Record<string, unknown> = { ...value };
        for (const [key, propSchema] of Object.entries(schemaNode.properties)) {
            if (!(key in result)) continue;
            const childPath = path ? `${path}.${key}` : key;
            result[key] = decodeValue(result[key], propSchema, childPath);
        }
        return result;
    }

    return value;
}

/**
 * Walks `originalSchema` and JSON-parses values at open-map paths.
 * Mutates and returns `args` for in-place decoding (toolCalls share the same object).
 * String-typed fields that are not open maps are left alone (ATGAI workaround).
 */
export function decodeOpenMapToolArguments(
    args: Record<string, unknown>,
    originalSchema: JsonSchemaNode
): Record<string, unknown> {
    const decoded = decodeValue(args, originalSchema, '');
    if (!isRecord(decoded)) {
        return args;
    }
    // Mutate in place so callers sharing the args reference see decoded values.
    for (const key of Object.keys(args)) {
        delete args[key];
    }
    Object.assign(args, decoded);
    return args;
}
