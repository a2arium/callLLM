export type JsonSchemaTypeName =
    | 'string'
    | 'number'
    | 'boolean'
    | 'object'
    | 'array'
    | 'null';

/** Keywords whose branches already define which types a node permits. */
const TYPE_DEFINING_KEYWORDS = ['anyOf', 'oneOf', 'allOf'] as const;

/** JSON type of a literal as used by `enum` / `const`. */
export function jsonTypeOfLiteral(value: unknown): JsonSchemaTypeName {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    switch (typeof value) {
        case 'string': return 'string';
        case 'number': return 'number';
        case 'bigint': return 'number';
        case 'boolean': return 'boolean';
        default: return 'object';
    }
}

/** Single JSON type shared by every literal, or undefined when they differ. */
function sharedLiteralType(literals: unknown[]): JsonSchemaTypeName | undefined {
    if (literals.length === 0) return undefined;
    const first = jsonTypeOfLiteral(literals[0]);
    return literals.every(value => jsonTypeOfLiteral(value) === first) ? first : undefined;
}

/**
 * Give a schema node an explicit `type` when it has none, as strict provider
 * schemas require, using only evidence already present on that node.
 *
 * A sibling `type` is intersected with the rest of the node, so a guess can
 * silently narrow or even empty the caller's contract. The rules are therefore:
 *
 * - `$ref` / `anyOf` / `oneOf` / `allOf`: the type is defined elsewhere, leave untouched;
 * - `enum` / `const`: read the type off the literals, and only when they agree
 *   (a mixed enum already constrains the node exactly, so nothing is added);
 * - `properties` / `items` and friends: infer object / array from the structure;
 * - nothing at all to go on: fall back to `string`, the historical behavior.
 *
 * Shared by SchemaSanitizer and the OpenAI Responses schema pass so the two
 * normalizations cannot drift apart.
 *
 * @returns true when a truly untyped node received the `string` fallback.
 */
export function inferNodeTypeIfMissing(node: unknown): boolean {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return false;
    const schemaNode = node as Record<string, unknown>;
    if ('type' in schemaNode) return false;

    // The node's permitted types are already defined by a reference or a composition.
    if (typeof schemaNode.$ref === 'string') return false;
    if (TYPE_DEFINING_KEYWORDS.some(keyword => Array.isArray(schemaNode[keyword]))) return false;

    if (Array.isArray(schemaNode.enum)) {
        const literalType = sharedLiteralType(schemaNode.enum);
        if (literalType) schemaNode.type = literalType;
        return false;
    }
    if ('const' in schemaNode) {
        schemaNode.type = jsonTypeOfLiteral(schemaNode.const);
        return false;
    }

    if (typeof schemaNode.properties === 'object' || typeof schemaNode.patternProperties === 'object') {
        schemaNode.type = 'object';
        return false;
    }
    if (schemaNode.items || Array.isArray(schemaNode.prefixItems)) {
        schemaNode.type = 'array';
        return false;
    }

    schemaNode.type = 'string';
    return true;
}
