import { describe, expect, it } from '@jest/globals';
import {
    assertSchemaProjectionSound,
    SchemaProjectionError
} from '@/core/schema/assertSchemaProjection.ts';

describe('assertSchemaProjectionSound', () => {
    it('accepts a projection that only added provable types', () => {
        const before = {
            type: 'object',
            properties: {
                nested: { properties: { a: { type: 'string' } } },
                list: { items: { type: 'string' } },
                choice: { enum: [1, 2] }
            }
        };
        const after = {
            type: 'object',
            properties: {
                nested: { type: 'object', properties: { a: { type: 'string' } } },
                list: { type: 'array', items: { type: 'string' } },
                choice: { type: 'number', enum: [1, 2] }
            }
        };

        expect(() => assertSchemaProjectionSound(before, after)).not.toThrow();
    });

    it('rejects a type added beside a composition', () => {
        const before = { type: 'object', properties: { a: { anyOf: [{ type: 'string' }, { type: 'null' }] } } };
        const after = {
            type: 'object',
            properties: { a: { anyOf: [{ type: 'string' }, { type: 'null' }], type: 'string' } }
        };

        const err = (() => {
            try {
                assertSchemaProjectionSound(before, after);
                return null;
            } catch (e) {
                return e as SchemaProjectionError;
            }
        })();

        expect(err).toBeInstanceOf(SchemaProjectionError);
        expect(err?.pointer).toBe('/properties/a');
        expect(err?.message).toContain('anyOf');
    });

    it('rejects a type added beside $ref, including inside a composition branch', () => {
        const before = {
            type: 'object',
            properties: { a: { anyOf: [{ $ref: '#/$defs/Foo' }, { type: 'null' }] } }
        };
        const after = {
            type: 'object',
            properties: {
                a: { anyOf: [{ $ref: '#/$defs/Foo', type: 'string' }, { type: 'null' }] }
            }
        };

        expect(() => assertSchemaProjectionSound(before, after))
            .toThrow(/properties\/a\/anyOf\/0.*\$ref/s);
    });

    it('rejects a type that excludes every allowed literal', () => {
        const before = { type: 'object', properties: { a: { enum: [1, 2, 3] } } };
        const after = { type: 'object', properties: { a: { enum: [1, 2, 3], type: 'string' } } };

        expect(() => assertSchemaProjectionSound(before, after))
            .toThrow(/unsatisfiable/);
    });

    it('accepts a type that still admits some literal', () => {
        const before = { type: 'object', properties: { a: { enum: ['x', 1] } } };
        const after = { type: 'object', properties: { a: { enum: ['x', 1], type: 'string' } } };

        expect(() => assertSchemaProjectionSound(before, after)).not.toThrow();
    });

    it('does not reject a caller-authored type beside a composition', () => {
        // The caller intersected deliberately; only types the pass introduces are checked.
        const authored = {
            type: 'object',
            properties: { a: { type: 'object', anyOf: [{ required: ['x'] }, { required: ['y'] }] } }
        };

        expect(() => assertSchemaProjectionSound(authored, structuredClone(authored))).not.toThrow();
    });

    it('walks definitions, array items, and additionalProperties', () => {
        const before = {
            type: 'object',
            $defs: { Foo: { anyOf: [{ type: 'string' }, { type: 'null' }] } },
            properties: { list: { type: 'array', items: { anyOf: [{ type: 'string' }] } } },
            additionalProperties: { anyOf: [{ type: 'string' }] }
        };

        const withDefsViolation = structuredClone(before) as Record<string, any>;
        withDefsViolation.$defs.Foo.type = 'string';
        expect(() => assertSchemaProjectionSound(before, withDefsViolation)).toThrow(/\$defs\/Foo/);

        const withItemsViolation = structuredClone(before) as Record<string, any>;
        withItemsViolation.properties.list.items.type = 'string';
        expect(() => assertSchemaProjectionSound(before, withItemsViolation))
            .toThrow(/properties\/list\/items/);

        const withAdditionalViolation = structuredClone(before) as Record<string, any>;
        withAdditionalViolation.additionalProperties.type = 'string';
        expect(() => assertSchemaProjectionSound(before, withAdditionalViolation))
            .toThrow(/additionalProperties/);
    });
});
