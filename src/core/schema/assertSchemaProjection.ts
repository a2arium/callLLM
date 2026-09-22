import { jsonTypeOfLiteral, type JsonSchemaTypeName } from './schemaNodeTypes.ts';

/**
 * Thrown when a provider-specific schema pass produced a contract that is
 * narrower than the caller's. Indicates a bug in the projection, not bad input.
 */
export class SchemaProjectionError extends Error {
    public readonly name = 'SchemaProjectionError';
    public readonly code = 'SCHEMA_PROJECTION_ERROR' as const;
    /** JSON pointer of the offending node in the projected schema. */
    public readonly pointer: string;

    constructor(pointer: string, detail: string) {
        super(`Provider schema projection narrowed the caller schema at ${pointer}: ${detail}`);
        this.pointer = pointer;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

type SchemaNode = Record<string, unknown>;

const CHILD_ARRAY_KEYWORDS = ['anyOf', 'oneOf', 'allOf', 'prefixItems'] as const;
const CHILD_MAP_KEYWORDS = ['properties', 'patternProperties', '$defs', 'definitions'] as const;
const CHILD_SINGLE_KEYWORDS = ['items', 'additionalProperties', 'not'] as const;

function isNode(value: unknown): value is SchemaNode {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function typeNames(type: unknown): JsonSchemaTypeName[] {
    const raw = Array.isArray(type) ? type : [type];
    return raw.filter((name): name is JsonSchemaTypeName => typeof name === 'string');
}

function pointerFor(path: string[]): string {
    return path.length === 0 ? '<root>' : `/${path.join('/')}`;
}

/**
 * Verify that a provider schema pass only added types it could prove, by
 * comparing the prepared input with the projected output node by node.
 *
 * Two invariants, both scoped to types the pass itself introduced or changed, so
 * a caller's own unusual-but-intentional schema is never rejected:
 *
 * 1. no `type` is added beside a `$ref` or a composition, which JSON Schema
 *    intersects and which can therefore delete branches;
 * 2. an added `type` is never disjoint from the node's own `enum` / `const`
 *    literals, which would leave the node unsatisfiable.
 */
export function assertSchemaProjectionSound(before: unknown, after: unknown): void {
    const visit = (source: unknown, projected: unknown, path: string[]): void => {
        if (!isNode(projected)) return;
        const original = isNode(source) ? source : undefined;

        const projectedType = projected.type;
        const originalType = original?.type;
        const typeWasIntroduced = projectedType !== undefined
            && JSON.stringify(projectedType) !== JSON.stringify(originalType);

        if (typeWasIntroduced && original) {
            const composition = CHILD_ARRAY_KEYWORDS
                .filter(keyword => keyword !== 'prefixItems')
                .find(keyword => Array.isArray(original[keyword]));
            if (composition) {
                throw new SchemaProjectionError(
                    pointerFor(path),
                    `added type ${JSON.stringify(projectedType)} beside \`${composition}\`, `
                    + 'which intersects with the composition instead of annotating it'
                );
            }
            if (typeof original.$ref === 'string') {
                throw new SchemaProjectionError(
                    pointerFor(path),
                    `added type ${JSON.stringify(projectedType)} beside \`$ref\`, `
                    + 'which intersects with the referenced schema'
                );
            }

            const literals = Array.isArray(projected.enum)
                ? projected.enum
                : 'const' in projected ? [projected.const] : [];
            const permitted = typeNames(projectedType);
            if (literals.length > 0 && permitted.length > 0) {
                const satisfiable = literals.some(value => permitted.includes(jsonTypeOfLiteral(value)));
                if (!satisfiable) {
                    throw new SchemaProjectionError(
                        pointerFor(path),
                        `added type ${JSON.stringify(projectedType)} excludes every allowed literal, `
                        + 'leaving the node unsatisfiable'
                    );
                }
            }
        }

        for (const keyword of CHILD_SINGLE_KEYWORDS) {
            if (isNode(projected[keyword])) {
                visit(original?.[keyword], projected[keyword], [...path, keyword]);
            }
        }
        for (const keyword of CHILD_ARRAY_KEYWORDS) {
            const children = projected[keyword];
            if (!Array.isArray(children)) continue;
            const sourceChildren = Array.isArray(original?.[keyword]) ? original![keyword] as unknown[] : [];
            children.forEach((child, index) => {
                visit(sourceChildren[index], child, [...path, keyword, String(index)]);
            });
        }
        for (const keyword of CHILD_MAP_KEYWORDS) {
            const children = projected[keyword];
            if (!isNode(children)) continue;
            const sourceChildren = isNode(original?.[keyword]) ? original![keyword] as SchemaNode : {};
            for (const key of Object.keys(children)) {
                visit(sourceChildren[key], children[key], [...path, keyword, key]);
            }
        }
    };

    visit(before, after, []);
}
