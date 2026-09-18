import type { ModelInfo } from '../../interfaces/UniversalInterfaces.ts';
import { SchemaSanitizer } from './SchemaSanitizer.ts';
import { SchemaValidator } from './SchemaValidator.ts';
import { getJsonSchemaUnions, type JsonSchemaUnionsMode } from './jsonSchemaUnions.ts';
import {
    flattenUnions,
    type FlattenResult,
    type JSONSchemaLike,
    type UnionMapping
} from './UnionTransformer.ts';

export type PreparedStructuredOutputSchema = {
    schema: JSONSchemaLike;
    mapping: UnionMapping;
    unionsMode: JsonSchemaUnionsMode;
    didFlatten: boolean;
};

export type PrepareStructuredOutputSchemaOptions = {
    modelInfo?: ModelInfo | null;
    /** Override capability lookup when testing or forcing a mode. */
    unionsMode?: JsonSchemaUnionsMode;
    /**
     * When true (default), force all properties required except optional union option fields
     * (handled later by provider-specific prepare when flattening).
     */
    forceAllRequiredWhenNoFlatten?: boolean;
};

/**
 * Prepare a caller-supplied JSON/Zod schema for a provider's native structured-output API.
 * - anyOf mode: keep compositions; normalize nullable type arrays to anyOf (Cerebras-portable)
 * - flatten mode: collapse nullables to type arrays; rewrite multi-variant unions
 */
export function prepareStructuredOutputSchema(
    schemaInput: unknown,
    options: PrepareStructuredOutputSchemaOptions = {}
): PreparedStructuredOutputSchema {
    const raw = SchemaValidator.getSchemaObject(schemaInput as any) as JSONSchemaLike;
    const unionsMode = options.unionsMode ?? getJsonSchemaUnions(options.modelInfo);

    if (unionsMode === 'anyOf') {
        const withAnyOfNullables = normalizeNullableTypeArraysToAnyOf(
            JSON.parse(JSON.stringify(raw)) as JSONSchemaLike
        );
        const sanitized = SchemaSanitizer.sanitize(withAnyOfNullables, {
            addHintsToDescriptions: true,
            forceAllRequired: true,
            forceNoAdditionalProps: true,
            normalizeDefs: true,
            stripMetaKeys: true,
            stripCompositionKeywords: false
        });
        return {
            schema: sanitized,
            mapping: [],
            unionsMode,
            didFlatten: false
        };
    }

    const flattened: FlattenResult = flattenUnions(raw);
    const forceAllRequired = options.forceAllRequiredWhenNoFlatten === false
        ? false
        : !flattened.didFlatten;

    const sanitized = SchemaSanitizer.sanitize(flattened.schema, {
        addHintsToDescriptions: true,
        // When multi-variant unions were flattened, do not force option fields required
        forceAllRequired,
        forceNoAdditionalProps: true,
        normalizeDefs: true,
        stripMetaKeys: true,
        stripCompositionKeywords: true
    });

    return {
        schema: sanitized,
        mapping: flattened.mapping,
        unionsMode,
        didFlatten: flattened.didFlatten
    };
}

/**
 * Convert `type: [T, 'null']` (Zod 4.6+) into `anyOf: [{type:T}, {type:'null'}]` so
 * providers like Cerebras that reject type-array nullables still work.
 */
function normalizeNullableTypeArraysToAnyOf(schema: JSONSchemaLike): JSONSchemaLike {
    const walk = (node: any): void => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) {
            node.forEach(walk);
            return;
        }

        if (Array.isArray(node.type) && node.type.length === 2 && node.type.includes('null')) {
            const nonNull = node.type.find((t: unknown) => t !== 'null');
            if (typeof nonNull === 'string') {
                const { type: _type, anyOf: _anyOf, oneOf: _oneOf, description, ...rest } = node;
                for (const key of Object.keys(node)) {
                    if (key !== 'description') delete node[key];
                }
                node.anyOf = [
                    { ...rest, type: nonNull },
                    { type: 'null' }
                ];
                if (typeof description === 'string') {
                    node.description = description;
                } else {
                    delete node.description;
                }
            }
        }

        for (const value of Object.values(node)) {
            walk(value);
        }
    };

    walk(schema);
    return schema;
}
