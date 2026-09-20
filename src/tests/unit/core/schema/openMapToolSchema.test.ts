import { z } from 'zod';
import {
    assertToolRootIsNotOpenMap,
    decodeOpenMapToolArguments,
    isOpenMapJsonSchema,
    OpenMapDecodeError,
    OpenMapToolSchemaError,
    rewriteOpenMapsToJsonStrings
} from '../../../../core/schema/openMapToolSchema.ts';

describe('openMapToolSchema', () => {
    describe('isOpenMapJsonSchema', () => {
        it('detects additionalProperties true', () => {
            expect(isOpenMapJsonSchema({ type: 'object', additionalProperties: true })).toBe(true);
        });

        it('detects additionalProperties schema object including empty {}', () => {
            expect(isOpenMapJsonSchema({ type: 'object', additionalProperties: {} })).toBe(true);
            expect(isOpenMapJsonSchema({
                type: 'object',
                additionalProperties: { type: 'string' }
            })).toBe(true);
        });

        it('detects propertyNames without declared properties', () => {
            expect(isOpenMapJsonSchema({
                type: 'object',
                propertyNames: { type: 'string' },
                additionalProperties: {}
            })).toBe(true);
            expect(isOpenMapJsonSchema({
                type: 'object',
                propertyNames: { type: 'string' }
            })).toBe(true);
        });

        it('does not treat omitted additionalProperties as open', () => {
            expect(isOpenMapJsonSchema({
                type: 'object',
                properties: { id: { type: 'string' } },
                required: ['id']
            })).toBe(false);
        });

        it('does not treat closed empty objects as open', () => {
            expect(isOpenMapJsonSchema({
                type: 'object',
                properties: {},
                additionalProperties: false
            })).toBe(false);
        });
    });

    describe('rewriteOpenMapsToJsonStrings', () => {
        it('rewrites Zod z.record nested under id+patch without mutating input', () => {
            const zodSchema = z.object({
                id: z.string(),
                patch: z.record(z.string(), z.unknown())
            });
            const { $schema: _meta, ...generated } = z.toJSONSchema(zodSchema);
            const original = generated as Record<string, unknown>;
            const originalPatch = (original.properties as Record<string, unknown>).patch;
            const originalPatchSnapshot = JSON.parse(JSON.stringify(originalPatch));

            const { schema, encodedPaths } = rewriteOpenMapsToJsonStrings(original);

            expect(encodedPaths).toEqual(['patch']);
            expect((schema.properties as Record<string, unknown>).patch).toEqual({
                type: 'string',
                description: expect.stringContaining('JSON-encoded object')
            });
            expect((schema.properties as Record<string, unknown>).id).toEqual({ type: 'string' });
            // Input identity and nested open-map node unchanged
            expect((original.properties as Record<string, unknown>).patch).toBe(originalPatch);
            expect(originalPatch).toEqual(originalPatchSnapshot);
        });

        it('encodes additionalProperties true / {} / schema; skips omitted', () => {
            const withTrue = rewriteOpenMapsToJsonStrings({
                type: 'object',
                properties: {
                    a: { type: 'object', additionalProperties: true },
                    b: { type: 'object', additionalProperties: {} },
                    c: { type: 'object', additionalProperties: { type: 'string' } },
                    d: { type: 'object', properties: { x: { type: 'string' } } }
                },
                required: ['a', 'b', 'c', 'd']
            });

            expect(withTrue.encodedPaths.sort()).toEqual(['a', 'b', 'c']);
            expect((withTrue.schema.properties as Record<string, unknown>).a).toMatchObject({ type: 'string' });
            expect((withTrue.schema.properties as Record<string, unknown>).d).toMatchObject({
                type: 'object',
                properties: { x: { type: 'string' } }
            });
        });

        it('encodes propertyNames-only open maps', () => {
            const { schema, encodedPaths } = rewriteOpenMapsToJsonStrings({
                type: 'object',
                properties: {
                    meta: {
                        type: 'object',
                        propertyNames: { type: 'string' }
                    }
                },
                required: ['meta']
            });
            expect(encodedPaths).toEqual(['meta']);
            expect((schema.properties as Record<string, unknown>).meta).toMatchObject({ type: 'string' });
        });

        it('encodes array items that are records', () => {
            const { schema, encodedPaths } = rewriteOpenMapsToJsonStrings({
                type: 'object',
                properties: {
                    patches: {
                        type: 'array',
                        items: {
                            type: 'object',
                            additionalProperties: {}
                        }
                    }
                },
                required: ['patches']
            });
            expect(encodedPaths).toEqual(['patches[*]']);
            expect(
                ((schema.properties as Record<string, unknown>).patches as Record<string, unknown>).items
            ).toMatchObject({ type: 'string' });
        });

        it('encodes mixed nested object (properties + open additionalProperties) as one string', () => {
            const { schema, encodedPaths } = rewriteOpenMapsToJsonStrings({
                type: 'object',
                properties: {
                    payload: {
                        type: 'object',
                        properties: { known: { type: 'string' } },
                        required: ['known'],
                        additionalProperties: true
                    }
                },
                required: ['payload']
            });
            expect(encodedPaths).toEqual(['payload']);
            expect((schema.properties as Record<string, unknown>).payload).toMatchObject({ type: 'string' });
        });

        it('does not encode string-typed workaround fields', () => {
            const { schema, encodedPaths } = rewriteOpenMapsToJsonStrings({
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    patch: { type: 'string', description: 'A JSON-encoded object.' }
                },
                required: ['id', 'patch']
            });
            expect(encodedPaths).toEqual([]);
            expect((schema.properties as Record<string, unknown>).patch).toEqual({
                type: 'string',
                description: 'A JSON-encoded object.'
            });
        });
    });

    describe('assertToolRootIsNotOpenMap', () => {
        it('throws for root open maps', () => {
            expect(() => assertToolRootIsNotOpenMap({
                type: 'object',
                additionalProperties: true
            }, 'update_account')).toThrow(OpenMapToolSchemaError);
            expect(() => assertToolRootIsNotOpenMap({
                type: 'object',
                additionalProperties: {}
            }, 'update_account')).toThrow(/update_account/);
        });

        it('allows normal tool roots', () => {
            expect(() => assertToolRootIsNotOpenMap({
                type: 'object',
                properties: { id: { type: 'string' } },
                required: ['id']
            })).not.toThrow();
        });
    });

    describe('decodeOpenMapToolArguments', () => {
        const recordSchema = {
            type: 'object',
            properties: {
                id: { type: 'string' },
                patch: {
                    type: 'object',
                    propertyNames: { type: 'string' },
                    additionalProperties: {}
                }
            },
            required: ['id', 'patch'],
            additionalProperties: false
        } as Record<string, unknown>;

        it('parses JSON strings at open-map paths', () => {
            const args = {
                id: 'acct-1',
                patch: '{"status":"closed"}'
            };
            decodeOpenMapToolArguments(args, recordSchema);
            expect(args).toEqual({
                id: 'acct-1',
                patch: { status: 'closed' }
            });
        });

        it('passes through already-object values (idempotent)', () => {
            const args = {
                id: 'acct-1',
                patch: { status: 'closed' }
            };
            decodeOpenMapToolArguments(args, recordSchema);
            expect(args.patch).toEqual({ status: 'closed' });
        });

        it('throws OpenMapDecodeError with path for invalid JSON', () => {
            const args = {
                id: 'acct-1',
                patch: 'not-json{'
            };
            expect(() => decodeOpenMapToolArguments(args, recordSchema)).toThrow(OpenMapDecodeError);
            try {
                decodeOpenMapToolArguments(args, recordSchema);
            } catch (error) {
                expect(error).toBeInstanceOf(OpenMapDecodeError);
                expect((error as OpenMapDecodeError).path).toBe('patch');
            }
        });

        it('decodes array item open maps', () => {
            const schema = {
                type: 'object',
                properties: {
                    patches: {
                        type: 'array',
                        items: {
                            type: 'object',
                            additionalProperties: true
                        }
                    }
                },
                required: ['patches']
            } as Record<string, unknown>;
            const args = {
                patches: ['{"a":1}', '{"b":2}']
            };
            decodeOpenMapToolArguments(args, schema);
            expect(args.patches).toEqual([{ a: 1 }, { b: 2 }]);
        });

        it('does not auto-parse string-typed workaround fields', () => {
            const workaroundSchema = {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    patch: { type: 'string', description: 'A JSON-encoded object.' }
                },
                required: ['id', 'patch']
            } as Record<string, unknown>;
            const args = {
                id: 'acct-1',
                patch: '{"status":"closed"}'
            };
            decodeOpenMapToolArguments(args, workaroundSchema);
            expect(args.patch).toBe('{"status":"closed"}');
        });

        it('repairs lightly malformed JSON via jsonrepair', () => {
            const args = {
                id: 'acct-1',
                patch: "{'status':'closed'}"
            };
            decodeOpenMapToolArguments(args, recordSchema);
            expect(args.patch).toEqual({ status: 'closed' });
        });

        it.each([
            ['[]', []],
            ['null', null],
            ['42', 42],
            ['true', true],
            ['"text"', 'text']
        ] as const)('rejects encoded non-object JSON %j', (encoded) => {
            const args = { id: 'acct-1', patch: encoded };
            expect(() => decodeOpenMapToolArguments(args, recordSchema)).toThrow(OpenMapDecodeError);
            try {
                decodeOpenMapToolArguments(args, recordSchema);
            } catch (error) {
                expect(error).toBeInstanceOf(OpenMapDecodeError);
                expect((error as OpenMapDecodeError).path).toBe('patch');
                expect((error as OpenMapDecodeError).message).toMatch(/must decode to an object/);
            }
        });

        it.each([
            [[], 'array'],
            [null, 'null'],
            [42, 'number'],
            [true, 'boolean'],
            ['already-a-string', 'string']
        ] as const)('rejects already-decoded non-object %s', (value) => {
            const args = { id: 'acct-1', patch: value as unknown };
            expect(() => decodeOpenMapToolArguments(args, recordSchema)).toThrow(OpenMapDecodeError);
            try {
                decodeOpenMapToolArguments(args, recordSchema);
            } catch (error) {
                expect(error).toBeInstanceOf(OpenMapDecodeError);
                expect((error as OpenMapDecodeError).path).toBe('patch');
            }
        });

        it('rejects non-object values at open-map items nested in arrays', () => {
            const schema = {
                type: 'object',
                properties: {
                    patches: {
                        type: 'array',
                        items: {
                            type: 'object',
                            additionalProperties: true
                        }
                    }
                },
                required: ['patches']
            } as Record<string, unknown>;

            for (const bad of ['[]', 'null', '42', true, null, []]) {
                const args = { patches: [bad] };
                expect(() => decodeOpenMapToolArguments(args, schema)).toThrow(OpenMapDecodeError);
                try {
                    decodeOpenMapToolArguments(args, schema);
                } catch (error) {
                    expect(error).toBeInstanceOf(OpenMapDecodeError);
                    expect((error as OpenMapDecodeError).path).toBe('patches[0]');
                }
            }
        });

        it('rejects jsonrepair results that are not objects', () => {
            // Single-quoted bare value repairs to a JSON string / scalar, not an object.
            const args = {
                id: 'acct-1',
                patch: "'not-an-object'"
            };
            expect(() => decodeOpenMapToolArguments(args, recordSchema)).toThrow(OpenMapDecodeError);
            try {
                decodeOpenMapToolArguments(args, recordSchema);
            } catch (error) {
                expect(error).toBeInstanceOf(OpenMapDecodeError);
                expect((error as OpenMapDecodeError).path).toBe('patch');
                expect((error as OpenMapDecodeError).message).toMatch(/must decode to an object/);
            }
        });
    });
});
