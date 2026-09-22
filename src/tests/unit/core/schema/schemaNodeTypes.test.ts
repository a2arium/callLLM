import { describe, expect, it } from '@jest/globals';
import { inferNodeTypeIfMissing, jsonTypeOfLiteral } from '@/core/schema/schemaNodeTypes.ts';

function inferred(node: Record<string, unknown>): unknown {
    inferNodeTypeIfMissing(node);
    return node.type;
}

describe('inferNodeTypeIfMissing', () => {
    it('leaves an existing type untouched, including array form', () => {
        const scalar = { type: 'number', enum: [1] };
        const union = { type: ['string', 'null'] };
        inferNodeTypeIfMissing(scalar);
        inferNodeTypeIfMissing(union);

        expect(scalar.type).toBe('number');
        expect(union.type).toEqual(['string', 'null']);
    });

    describe('nodes whose type is defined elsewhere', () => {
        it('adds no type beside anyOf, oneOf, or allOf', () => {
            for (const keyword of ['anyOf', 'oneOf', 'allOf'] as const) {
                const node: Record<string, unknown> = { [keyword]: [{ type: 'string' }, { type: 'null' }] };
                expect(inferred(node)).toBeUndefined();
                expect('type' in node).toBe(false);
            }
        });

        it('adds no type beside $ref', () => {
            const node = { $ref: '#/$defs/Foo' };
            expect(inferred(node)).toBeUndefined();
        });

        it('adds no type to a composition of object variants', () => {
            const node = {
                anyOf: [
                    { type: 'object', properties: { a: { type: 'string' } } },
                    { type: 'object', properties: { b: { type: 'number' } } }
                ]
            };
            expect(inferred(node)).toBeUndefined();
        });

        it('prefers the composition over structural evidence on the same node', () => {
            // type: 'object' here would delete the null branch.
            const node = {
                properties: { a: { type: 'string' } },
                anyOf: [{ type: 'object' }, { type: 'null' }]
            };
            expect(inferred(node)).toBeUndefined();
        });
    });

    describe('literal payloads', () => {
        it('reads the type off single-typed enums', () => {
            expect(inferred({ enum: ['a', 'b'] })).toBe('string');
            expect(inferred({ enum: [1, 2, 3] })).toBe('number');
            expect(inferred({ enum: [true, false] })).toBe('boolean');
            expect(inferred({ enum: [null] })).toBe('null');
        });

        it('adds no type to a mixed enum, which already constrains the node', () => {
            const node = { enum: ['a', 1, null] };
            expect(inferred(node)).toBeUndefined();
        });

        it('reads the type off const', () => {
            expect(inferred({ const: 5 })).toBe('number');
            expect(inferred({ const: 'x' })).toBe('string');
            expect(inferred({ const: false })).toBe('boolean');
        });

        it('adds no type to an empty enum, which admits nothing to read a type from', () => {
            expect(inferred({ enum: [] })).toBeUndefined();
        });
    });

    describe('structural evidence', () => {
        it('infers object from properties or patternProperties', () => {
            expect(inferred({ properties: { a: { type: 'string' } } })).toBe('object');
            expect(inferred({ patternProperties: { '^a': { type: 'string' } } })).toBe('object');
        });

        it('infers array from items or prefixItems', () => {
            expect(inferred({ items: { type: 'string' } })).toBe('array');
            expect(inferred({ prefixItems: [{ type: 'string' }] })).toBe('array');
        });
    });

    describe('no evidence at all', () => {
        it('falls back to string and reports that it guessed', () => {
            const node: Record<string, unknown> = { description: 'leaf' };
            expect(inferNodeTypeIfMissing(node)).toBe(true);
            expect(node.type).toBe('string');
        });

        it('reports no guess when the type was established from evidence', () => {
            expect(inferNodeTypeIfMissing({ enum: [1] })).toBe(false);
            expect(inferNodeTypeIfMissing({ properties: {} })).toBe(false);
            expect(inferNodeTypeIfMissing({ anyOf: [{ type: 'string' }] })).toBe(false);
        });
    });

    it('ignores non-node values', () => {
        expect(() => inferNodeTypeIfMissing(null)).not.toThrow();
        expect(() => inferNodeTypeIfMissing('schema')).not.toThrow();
        expect(() => inferNodeTypeIfMissing([{ type: 'string' }])).not.toThrow();
    });
});

describe('jsonTypeOfLiteral', () => {
    it('maps JSON literals to their type names', () => {
        expect(jsonTypeOfLiteral(null)).toBe('null');
        expect(jsonTypeOfLiteral('a')).toBe('string');
        expect(jsonTypeOfLiteral(1.5)).toBe('number');
        expect(jsonTypeOfLiteral(true)).toBe('boolean');
        expect(jsonTypeOfLiteral([1])).toBe('array');
        expect(jsonTypeOfLiteral({ a: 1 })).toBe('object');
    });
});
