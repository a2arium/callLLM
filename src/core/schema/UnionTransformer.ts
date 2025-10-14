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
};

/**
 * Detects union (anyOf/oneOf) under object properties and flattens into:
 * - selector field: <prop>_selected (string enum of option keys)
 * - per-option object field: <prop>_<key> with the option schema
 * Removes the original union field.
 */
export function flattenUnions(schema: JSONSchemaLike): FlattenResult {
    const cloned = JSON.parse(JSON.stringify(schema)) as JSONSchemaLike;
    const mapping: UnionMapping = [];

    const walk = (node: any, path: string[]) => {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'object' && node.properties && typeof node.properties === 'object') {
            const props = node.properties as Record<string, any>;
            const required: string[] = Array.isArray(node.required) ? [...node.required] : [];
            // Strengthen parent object description for union exclusivity guidance
            const unionParentNote =
                'Exactly one variant must be chosen for union fields in this object: set the <field>_selected to the chosen option, ' +
                'then provide ONLY the corresponding <field>_<option> object. Omit all other <field>_<option> objects entirely.';
            if (typeof node.description === 'string') {
                if (!node.description.includes('Exactly one variant must be chosen')) {
                    node.description = `${node.description} (Guidance: ${unionParentNote})`;
                }
            } else {
                node.description = `(Guidance: ${unionParentNote})`;
            }
            for (const [propName, propSchema] of Object.entries(props)) {
                const unionList = (propSchema as any)?.anyOf || (propSchema as any)?.oneOf;
                if (Array.isArray(unionList) && unionList.length > 0) {
                    const optionKeys: UnionOption[] = unionList.map((opt: any, idx: number) => ({
                        key: deriveOptionKey(opt, idx, propName),
                        originalIndex: idx
                    }));
                    const selectorName = `${propName}_selected`;

                    // Build new properties: selector and per-option
                    const newProps: Record<string, any> = { ...props };
                    // Remove original union property
                    delete newProps[propName];
                    // Selector enum
                    newProps[selectorName] = {
                        type: 'string',
                        enum: optionKeys.map(o => o.key),
                        description: [
                            `Select which ${propName} variant is used.`,
                            `You MUST set this to one of: ${optionKeys.map(o => `'${o.key}'`).join(', ')}.`,
                            `After selecting, you MUST provide ONLY the matching object '${propName}_<selected>' and you MUST NOT include any other '${propName}_<option>' objects.`,
                            `If a non-selected option object is present, remove it. If the selected option is '${propName}_X', include only that object and ensure it satisfies all field constraints.`
                        ].join(' ')
                    };
                    // Per option objects
                    optionKeys.forEach((opt, idx) => {
                        const optionField = `${propName}_${opt.key}`;
                        const originalOption = unionList[idx];
                        const optClone = JSON.parse(JSON.stringify(originalOption));
                        const base = typeof optClone.description === 'string' ? optClone.description : '';
                        optClone.description = [
                            base,
                            `(Only include this object if ${selectorName} == "${opt.key}")`,
                            `(If ${selectorName} != "${opt.key}", you MUST omit this object entirely)`,
                            `(When included, all constraints inside this object MUST be satisfied)`
                        ].filter(Boolean).join(' ');
                        newProps[optionField] = optClone;
                    });

                    // Update node
                    node.properties = newProps;
                    // Fix required: remove original prop, require selector
                    const idxReq = required.indexOf(propName);
                    if (idxReq >= 0) required.splice(idxReq, 1);
                    if (!required.includes(selectorName)) required.push(selectorName);
                    node.required = required;

                    // Save mapping
                    mapping.push({ path: [...path], prop: propName, options: optionKeys });
                } else {
                    // Recurse into nested objects
                    walk(propSchema, [...path, 'properties', propName]);
                }
            }
        }
        // Recurse into arrays
        if (node.type === 'array' && node.items && typeof node.items === 'object') {
            walk(node.items, [...path, 'items']);
        }
    };

    walk(cloned, []);
    return { schema: cloned, mapping };
}

/**
 * Reconstructs union properties from flattened output data using mapping
 * produced by flattenUnions on the original schema.
 */
export function unflattenData(data: unknown, mapping: UnionMapping): unknown {
    if (typeof data !== 'object' || data === null) return data;
    const obj = { ...(data as Record<string, unknown>) };

    // Only supports unions at object property level (not arrays) for now
    for (const m of mapping) {
        // We only handle unions at current object level path == [] or nested via properties path
        // Navigate to parent object from data following mapping.path
        const parent = getAtPath(obj, m.path) as Record<string, unknown> | undefined;
        if (!parent || typeof parent !== 'object') continue;

        const selectorName = `${m.prop}_selected`;
        const selectedKey = parent[selectorName];
        let chosenKey = typeof selectedKey === 'string' ? selectedKey : undefined;

        if (!chosenKey) {
            // Try to infer by checking which option field exists/non-empty
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

        // Set reconstructed union field
        (parent as any)[m.prop] = value;

        // Cleanup auxiliary fields
        delete (parent as any)[selectorName];
        for (const opt of m.options) {
            const fieldName = `${m.prop}_${opt.key}`;
            if (fieldName in parent) delete (parent as any)[fieldName];
        }
    }

    return obj;
}

function getAtPath(root: Record<string, unknown>, path: string[]): unknown {
    let cur: any = root;
    for (const seg of path) {
        if (!cur || typeof cur !== 'object') return undefined;
        cur = cur[seg];
    }
    return cur;
}

function deriveOptionKey(option: any, idx: number, propName: string): string {
    // Try to derive from a literal type property if present
    if (option && typeof option === 'object' && option.properties && typeof option.properties === 'object') {
        const props = option.properties as Record<string, any>;
        if (props.type) {
            // enum single or const
            const ev = Array.isArray(props.type.enum) ? props.type.enum : undefined;
            const cv = props.type.const;
            if (ev && ev.length === 1 && typeof ev[0] === 'string') return safeKey(ev[0]);
            if (typeof cv === 'string') return safeKey(cv);
        }
    }
    return `${propName}_option_${idx + 1}`;
}

function safeKey(value: string): string {
    return value.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
}


