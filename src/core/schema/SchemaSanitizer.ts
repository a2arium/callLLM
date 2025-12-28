export type JSONSchemaLike = Record<string, unknown>;

export type SanitizeOptions = {
    // When true, add human-readable hints for stripped constraints to descriptions
    addHintsToDescriptions?: boolean;
    // When true, enforce required includes all properties on object nodes
    forceAllRequired?: boolean;
    // When true, force additionalProperties=false on object nodes
    forceNoAdditionalProps?: boolean;
    // Rewrite definitions to $defs and fix $ref
    normalizeDefs?: boolean;
    // Remove vendor/meta keys like $schema, $anchor and ~*
    stripMetaKeys?: boolean;
    // When true, remove JSON Schema composition keywords (allOf/anyOf/oneOf)
    stripCompositionKeywords?: boolean;
};

const DEFAULT_OPTIONS: SanitizeOptions = {
    addHintsToDescriptions: true,
    forceAllRequired: true,
    forceNoAdditionalProps: true,
    normalizeDefs: true,
    stripMetaKeys: true,
    stripCompositionKeywords: false,
};

export class SchemaSanitizer {
    public static sanitize(schema: JSONSchemaLike, opts?: SanitizeOptions): JSONSchemaLike {
        const options = { ...DEFAULT_OPTIONS, ...(opts || {}) };
        const clone = JSON.parse(JSON.stringify(schema)) as JSONSchemaLike;

        if (options.normalizeDefs) this.normalizeDefs(clone);
        if (options.stripMetaKeys) this.stripMeta(clone);
        this.stripConstraints(clone, options);
        if (options.stripCompositionKeywords) this.stripCompositions(clone, options);
        // Ensure all nodes have a type and object nodes meet provider requirements
        this.ensureTypes(clone);
        this.normalizeByType(clone);
        if (options.forceAllRequired || options.forceNoAdditionalProps) this.enforceObjectRules(clone, options);
        return clone;
    }

    private static normalizeDefs(node: any): void {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(this.normalizeDefs.bind(this)); return; }
        if (node.definitions && !node.$defs) {
            node.$defs = node.definitions;
            delete node.definitions;
        }
        if (typeof node.$ref === 'string' && node.$ref.startsWith('#/definitions/')) {
            node.$ref = node.$ref.replace('#/definitions/', '#/$defs/');
        }
        for (const k of Object.keys(node)) this.normalizeDefs(node[k]);
    }

    private static stripMeta(node: any): void {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(this.stripMeta.bind(this)); return; }
        if ('$schema' in node) delete node.$schema;
        if ('$anchor' in node) delete node.$anchor;
        if ('def' in node) delete node.def;
        for (const key of Object.keys(node)) if (key.startsWith('~')) delete node[key];
        for (const k of Object.keys(node)) this.stripMeta(node[k]);
    }

    private static stripConstraints(node: any, options: SanitizeOptions): void {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(n => this.stripConstraints(n, options)); return; }

        // Convert 'const' to single-value 'enum' (more widely supported)
        if ('const' in node && !('enum' in node)) {
            node.enum = [node.const];
            delete node.const;
        }

        // Remove 'default' keyword (not supported in all strict modes)
        if ('default' in node) {
            delete node.default;
        }

        const removedHints: string[] = [];
        const removeAndHint = (key: string, hintTemplate: (v: unknown) => string, predicate: (v: unknown) => boolean) => {
            if (key in node && predicate((node as any)[key])) {
                const value = (node as any)[key];
                delete (node as any)[key];
                if (options.addHintsToDescriptions) removedHints.push(hintTemplate(value));
            }
        };

        removeAndHint('minLength', v => `minimum ${v} characters`, v => typeof v === 'number');
        removeAndHint('maxLength', v => `maximum ${v} characters`, v => typeof v === 'number');
        removeAndHint('pattern', v => `must match pattern: ${v}`, v => typeof v === 'string');
        removeAndHint('format', v => `format: ${v}`, v => typeof v === 'string');
        removeAndHint('minimum', v => `minimum value: ${v}`, v => typeof v === 'number');
        removeAndHint('maximum', v => `maximum value: ${v}`, v => typeof v === 'number');
        removeAndHint('exclusiveMinimum', v => `must be greater than ${v}`, v => typeof v === 'number');
        removeAndHint('exclusiveMaximum', v => `must be less than ${v}`, v => typeof v === 'number');
        removeAndHint('multipleOf', v => `must be multiple of ${v}`, v => typeof v === 'number');
        removeAndHint('minItems', v => `minimum ${v} items`, v => typeof v === 'number');
        removeAndHint('maxItems', v => `maximum ${v} items`, v => typeof v === 'number');
        removeAndHint('uniqueItems', v => v ? 'items must be unique' : '', v => typeof v === 'boolean' && v);
        removeAndHint('propertyNames', () => 'has property name constraints', v => typeof v === 'object');
        removeAndHint('patternProperties', () => 'has pattern property constraints', v => typeof v === 'object');
        removeAndHint('dependencies', () => 'has field dependencies', v => typeof v === 'object');
        removeAndHint('dependentSchemas', () => 'has conditional schema requirements', v => typeof v === 'object');
        removeAndHint('dependentRequired', () => 'has conditional required fields', v => Array.isArray(v) || typeof v === 'object');

        if (removedHints.length > 0) {
            const suffix = ` (constraints: ${removedHints.join(', ')})`;
            if (typeof node.description === 'string') node.description += suffix;
            else node.description = suffix.trim();
        }

        for (const k of Object.keys(node)) this.stripConstraints(node[k], options);
    }

    private static stripCompositions(node: any, options: SanitizeOptions): void {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(n => this.stripCompositions(n, options)); return; }

        const compositionKeys: Array<'allOf' | 'anyOf' | 'oneOf'> = ['allOf', 'anyOf', 'oneOf'];
        const removed: string[] = [];
        for (const key of compositionKeys) {
            if (key in node) {
                removed.push(key);
                delete node[key];
            }
        }

        if (removed.length > 0 && options.addHintsToDescriptions) {
            const suffix = ` (composition keywords removed: ${removed.join(', ')})`;
            if (typeof node.description === 'string') node.description += suffix;
            else node.description = suffix.trim();
        }

        for (const k of Object.keys(node)) this.stripCompositions(node[k], options);
    }

    private static enforceObjectRules(node: any, options: SanitizeOptions): void {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(n => this.enforceObjectRules(n, options)); return; }

        if (node.type === 'object') {
            // Ensure properties exists (Cerebras requires properties or anyOf)
            if (!node.properties || typeof node.properties !== 'object') node.properties = {};
            const propKeys = Object.keys(node.properties as Record<string, unknown>);
            if (options.forceAllRequired) node.required = propKeys.length > 0 ? Array.from(new Set(propKeys)) : [];
            if (options.forceNoAdditionalProps) node.additionalProperties = false;
            if (Array.isArray(node.required)) {
                node.required = (node.required as any[]).filter(k => propKeys.includes(k as string));
            }
        }
        for (const k of Object.keys(node)) this.enforceObjectRules(node[k], options);
    }

    private static ensureTypes(node: any): void {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(this.ensureTypes.bind(this)); return; }

        const setTypeIfMissing = (n: any) => {
            if (!n || typeof n !== 'object') return;
            if (!('type' in n)) {
                const hasProps = typeof n.properties === 'object';
                const hasItems = Boolean(n.items);
                const hasEnum = Array.isArray(n.enum);
                if (hasProps) n.type = 'object';
                else if (hasItems) n.type = 'array';
                else if (hasEnum) n.type = 'string';
                else n.type = 'string';
            }
        };

        setTypeIfMissing(node);

        // Recurse into known schema containers
        if (node.properties && typeof node.properties === 'object') {
            for (const key of Object.keys(node.properties)) this.ensureTypes(node.properties[key]);
        }
        if (node.items) this.ensureTypes(node.items);
        for (const key of ['oneOf', 'anyOf', 'allOf'] as const) {
            if (Array.isArray(node[key])) node[key].forEach((o: any) => this.ensureTypes(o));
        }
        if (node.additionalProperties && typeof node.additionalProperties === 'object') this.ensureTypes(node.additionalProperties);
    }

    private static normalizeByType(node: any): void {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(this.normalizeByType.bind(this)); return; }

        if (node.type === 'object') {
            // Objects shouldn't carry array-specific keys
            if ('items' in node) delete node.items;
            // Ensure properties exists for object nodes
            if (!node.properties || typeof node.properties !== 'object') node.properties = {};
        }
        if (node.type === 'array') {
            // Arrays shouldn't carry object-specific keys
            if (!node.items) node.items = { type: 'string' };
            if ('properties' in node) delete node.properties;
            if ('required' in node) delete node.required;
            if ('additionalProperties' in node) delete node.additionalProperties;
        }

        // Recurse to children
        if (node.properties && typeof node.properties === 'object') {
            for (const key of Object.keys(node.properties)) this.normalizeByType(node.properties[key]);
        }
        if (node.items) this.normalizeByType(node.items);
        for (const key of ['oneOf', 'anyOf', 'allOf'] as const) {
            if (Array.isArray(node[key])) node[key].forEach((o: any) => this.normalizeByType(o));
        }
        if (node.additionalProperties && typeof node.additionalProperties === 'object') this.normalizeByType(node.additionalProperties);
    }
}

