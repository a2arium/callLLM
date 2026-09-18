export type JSONSchemaLike = Record<string, unknown>;

export type UnionOption = {
    key: string; // human-friendly option key, e.g., "text", "markup", or "option1"
    originalIndex: number;
};

export type UnionMapping = Array<{
    path: string[]; // path to the property containing the union in the original schema
    prop: string; // property name in parent object
    options: UnionOption[];
}>;

export type FlattenResult = {
    schema: JSONSchemaLike;
    mapping: UnionMapping;
    /** True when at least one multi-variant union was rewritten into selector fields. */
    didFlatten: boolean;
};

/** Marker read by OpenAI processSchemaForOpenAI; stripped before sending to the provider. */
export const OPTIONAL_UNION_OPTION_KEY = 'x-callllm-optional-union-option';

/**
 * Detects union (anyOf/oneOf) under object properties and:
 * - collapses nullable unions (`T | null`) to `type: [base, 'null']`
 * - flattens multi-variant unions into selector + optional option fields
 */
export function flattenUnions(schema: JSONSchemaLike): FlattenResult {
    const cloned = JSON.parse(JSON.stringify(schema)) as JSONSchemaLike;
    const mapping: UnionMapping = [];
    let didFlatten = false;

    const walk = (node: any, path: string[]) => {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'object' && node.properties && typeof node.properties === 'object') {
            let props = node.properties as Record<string, any>;
            let required: string[] = Array.isArray(node.required) ? [...node.required] : [];
            let flattenedInThisObject = false;

            // Snapshot keys so we can mutate props safely while iterating
            for (const propName of Object.keys(props)) {
                const propSchema = props[propName];
                const collapsed = collapseNullableUnion(propSchema);
                if (collapsed) {
                    props[propName] = collapsed;
                    walk(collapsed, [...path, 'properties', propName]);
                    continue;
                }

                const unionList = (propSchema as any)?.anyOf || (propSchema as any)?.oneOf;
                if (Array.isArray(unionList) && unionList.length > 0) {
                    flattenedInThisObject = true;
                    didFlatten = true;
                    const optionKeys: UnionOption[] = unionList.map((opt: any, idx: number) => ({
                        key: deriveOptionKey(opt, idx, propName),
                        originalIndex: idx
                    }));
                    const selectorName = `${propName}_selected`;

                    const newProps: Record<string, any> = { ...props };
                    delete newProps[propName];
                    newProps[selectorName] = {
                        type: 'string',
                        enum: optionKeys.map(o => o.key),
                        description: [
                            `Select which ${propName} variant is used.`,
                            `You MUST set this to one of: ${optionKeys.map(o => `'${o.key}'`).join(', ')}.`,
                            `After selecting, you MUST provide ONLY the matching field '${propName}_<selected>' and you MUST NOT include any other '${propName}_<option>' fields.`,
                            `If a non-selected option field is present, remove it.`
                        ].join(' ')
                    };

                    optionKeys.forEach((opt, idx) => {
                        const optionField = `${propName}_${opt.key}`;
                        const originalOption = unionList[idx];
                        const optClone = JSON.parse(JSON.stringify(originalOption));
                        const base = typeof optClone.description === 'string' ? optClone.description : '';
                        optClone.description = [
                            base,
                            `(Only include this field if ${selectorName} == "${opt.key}")`,
                            `(If ${selectorName} != "${opt.key}", you MUST omit this field entirely)`,
                            `(When included, all constraints inside this field MUST be satisfied)`
                        ].filter(Boolean).join(' ');
                        optClone[OPTIONAL_UNION_OPTION_KEY] = true;
                        newProps[optionField] = optClone;
                    });

                    node.properties = newProps;
                    props = newProps;
                    required = required.filter(k => k !== propName);
                    if (!required.includes(selectorName)) required.push(selectorName);
                    node.required = required;
                    mapping.push({ path: [...path], prop: propName, options: optionKeys });

                    for (const opt of optionKeys) {
                        const optionField = `${propName}_${opt.key}`;
                        walk(newProps[optionField], [...path, 'properties', optionField]);
                    }
                } else {
                    walk(propSchema, [...path, 'properties', propName]);
                }
            }

            if (flattenedInThisObject) {
                const unionParentNote =
                    'Exactly one variant must be chosen for union fields in this object: set the <field>_selected to the chosen option, ' +
                    'then provide ONLY the corresponding <field>_<option> field. Omit all other <field>_<option> fields entirely.';
                if (typeof node.description === 'string') {
                    if (!node.description.includes('Exactly one variant must be chosen')) {
                        node.description = `${node.description} (Guidance: ${unionParentNote})`;
                    }
                } else {
                    node.description = `(Guidance: ${unionParentNote})`;
                }
            }
        }
        if (node.type === 'array' && node.items && typeof node.items === 'object') {
            walk(node.items, [...path, 'items']);
        }
    };

    walk(cloned, []);
    return { schema: cloned, mapping, didFlatten };
}

/**
 * Reconstructs union properties from flattened output data using mapping
 * produced by flattenUnions on the original schema.
 */
export function unflattenData(data: unknown, mapping: UnionMapping): unknown {
    if (typeof data !== 'object' || data === null) return data;
    const obj = { ...(data as Record<string, unknown>) };

    for (const m of mapping) {
        const parent = getResponseParent(obj, m.path) as Record<string, unknown> | undefined;
        if (!parent || typeof parent !== 'object') continue;

        const selectorName = `${m.prop}_selected`;
        const selectedKey = parent[selectorName];
        let chosenKey = typeof selectedKey === 'string' ? selectedKey : undefined;

        if (!chosenKey) {
            for (const opt of m.options) {
                const fieldName = `${m.prop}_${opt.key}`;
                if (fieldName in parent) {
                    chosenKey = opt.key;
                    break;
                }
            }
        }
        if (!chosenKey) continue;
        const chosenField = `${m.prop}_${chosenKey}`;
        const value = (parent as any)[chosenField];

        (parent as any)[m.prop] = value;

        delete (parent as any)[selectorName];
        for (const opt of m.options) {
            const fieldName = `${m.prop}_${opt.key}`;
            if (fieldName in parent) delete (parent as any)[fieldName];
        }
    }

    return obj;
}

/**
 * Returns true when the response object contains at least one flattened selector
 * field for the given mapping (so unflatten is safe to apply).
 */
export function responseHasFlattenedUnionKeys(data: unknown, mapping: UnionMapping): boolean {
    if (!mapping.length || typeof data !== 'object' || data === null) return false;
    const root = data as Record<string, unknown>;
    for (const m of mapping) {
        const parent = getResponseParent(root, m.path);
        if (!parent || typeof parent !== 'object') continue;
        const selectorName = `${m.prop}_selected`;
        if (selectorName in (parent as Record<string, unknown>)) return true;
        for (const opt of m.options) {
            if (`${m.prop}_${opt.key}` in (parent as Record<string, unknown>)) return true;
        }
    }
    return false;
}

/**
 * Collapse `anyOf`/`oneOf` of exactly `[T, {type:'null'}]` into `type: [base, 'null']`.
 * Returns null when the schema is not a simple nullable union.
 */
export function collapseNullableUnion(propSchema: any): Record<string, unknown> | null {
    if (!propSchema || typeof propSchema !== 'object') return null;
    const unionList = propSchema.anyOf || propSchema.oneOf;
    if (!Array.isArray(unionList) || unionList.length !== 2) return null;

    const nullIdx = unionList.findIndex((o: any) => o && typeof o === 'object' && o.type === 'null');
    if (nullIdx < 0) return null;
    const other = unionList[1 - nullIdx];
    if (!other || typeof other !== 'object') return null;
    if (typeof other.type !== 'string') return null;

    const collapsed: Record<string, unknown> = { ...other };
    collapsed.type = [other.type, 'null'];
    if (typeof propSchema.description === 'string') {
        collapsed.description = propSchema.description;
    }
    delete collapsed.anyOf;
    delete collapsed.oneOf;
    return collapsed;
}

/**
 * Mapping paths are schema-relative (include 'properties'/'items' keywords).
 * Response objects do not have those wrappers, so skip them when navigating data.
 */
function getResponseParent(root: Record<string, unknown>, path: string[]): unknown {
    let cur: any = root;
    for (const seg of path) {
        if (seg === 'properties' || seg === 'items') continue;
        if (!cur || typeof cur !== 'object') return undefined;
        cur = cur[seg];
    }
    return cur;
}

function deriveOptionKey(option: any, idx: number, propName: string): string {
    if (option && typeof option === 'object') {
        if (option.type === 'null') return 'null';
        if (typeof option.type === 'string' && !option.properties && !option.items) {
            return safeKey(option.type);
        }
        if (Array.isArray(option.enum) && option.enum.length === 1 && typeof option.enum[0] === 'string') {
            return safeKey(option.enum[0]);
        }
        if (option.properties && typeof option.properties === 'object') {
            const props = option.properties as Record<string, any>;
            if (props.type) {
                const ev = Array.isArray(props.type.enum) ? props.type.enum : undefined;
                const cv = props.type.const;
                if (ev && ev.length === 1 && typeof ev[0] === 'string') return safeKey(ev[0]);
                if (typeof cv === 'string') return safeKey(cv);
            }
            for (const pval of Object.values(props)) {
                if (!pval || typeof pval !== 'object') continue;
                const ev = Array.isArray((pval as any).enum) ? (pval as any).enum : undefined;
                const cv = (pval as any).const;
                if (ev && ev.length === 1 && typeof ev[0] === 'string') return safeKey(ev[0]);
                if (typeof cv === 'string') return safeKey(cv);
            }
        }
    }
    return `${propName}_option_${idx + 1}`;
}

function safeKey(value: string): string {
    return value.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
}
