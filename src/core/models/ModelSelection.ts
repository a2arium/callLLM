import type { RegisteredProviders } from '../../adapters/index.ts';

export const MODEL_PRESETS = ['cheap', 'fast', 'balanced', 'premium'] as const;
export type ModelPreset = typeof MODEL_PRESETS[number];

export const PREFERENCE_DIMENSIONS = ['cost', 'latency', 'throughput', 'quality', 'context'] as const;
export type PreferenceDimension = typeof PREFERENCE_DIMENSIONS[number];

export type ProviderScope = RegisteredProviders | RegisteredProviders[];
export type ModelPreferences = Partial<Record<PreferenceDimension, number>>;

export type ModelConstraints = {
    maxInputPricePerMillion?: number;
    maxOutputPricePerMillion?: number;
    maxImagePricePerImage?: number;
    maxVideoPricePerSecond?: number;
    maxAudioPricePerSecond?: number;
    maxTtsPricePerMillionChars?: number;
    minQuality?: number;
    minContextTokens?: number;
    minOutputTokens?: number;
    allowedModels?: string[];
    excludedModels?: string[];
    allowPreviewModels?: boolean;
    allowDeprecatedModels?: boolean;
    allowUncensoredModels?: boolean;
};

export type ModelResolutionOptions = {
    explain?: boolean;
};

export type ExactModelSelection = {
    model: string;
    provider?: RegisteredProviders;
};

export type DynamicModelSelection = {
    preset?: ModelPreset;
    prefer?: ModelPreferences;
    constraints?: ModelConstraints;
    resolution?: ModelResolutionOptions;
};

export type ModelOrSelection = string | ExactModelSelection | DynamicModelSelection;

export type NormalizedModelSelection =
    | {
        mode: 'exact';
        provider?: RegisteredProviders;
        model: string;
    }
    | {
        mode: 'dynamic';
        preset: ModelPreset;
        prefer: Required<ModelPreferences>;
        constraints: ModelConstraints;
        resolution: Required<ModelResolutionOptions>;
    };

export class ModelSelectionConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ModelSelectionConfigError';
    }
}

export const MODEL_SELECTION_PRESETS: Record<ModelPreset, Required<ModelPreferences>> = {
    cheap: {
        cost: 0.75,
        latency: 0.10,
        throughput: 0,
        quality: 0.15,
        context: 0
    },
    fast: {
        cost: 0.10,
        latency: 0.45,
        throughput: 0.40,
        quality: 0.05,
        context: 0
    },
    balanced: {
        cost: 0.25,
        latency: 0.20,
        throughput: 0.20,
        quality: 0.35,
        context: 0
    },
    premium: {
        cost: 0,
        latency: 0.10,
        throughput: 0,
        quality: 0.80,
        context: 0.10
    }
};

const CONSTRAINT_KEYS = [
    'maxInputPricePerMillion',
    'maxOutputPricePerMillion',
    'maxImagePricePerImage',
    'maxVideoPricePerSecond',
    'maxAudioPricePerSecond',
    'maxTtsPricePerMillionChars',
    'minQuality',
    'minContextTokens',
    'minOutputTokens',
    'allowedModels',
    'excludedModels',
    'allowPreviewModels',
    'allowDeprecatedModels',
    'allowUncensoredModels'
] as const;

const FORBIDDEN_PROVIDER_CONSTRAINT_KEYS = ['allowedProviders', 'excludedProviders', 'onlyProviders', 'excludeProviders'] as const;
const DYNAMIC_SELECTION_KEYS = ['preset', 'prefer', 'constraints', 'resolution'] as const;
const EXACT_SELECTION_KEYS = ['model', 'provider'] as const;

export function isModelPreset(value: string): value is ModelPreset {
    return (MODEL_PRESETS as readonly string[]).includes(value);
}

export function normalizeModelSelection(selection: ModelOrSelection): NormalizedModelSelection {
    if (typeof selection === 'string') {
        if (selection.trim().length === 0) {
            throw new ModelSelectionConfigError('Model selection string cannot be empty');
        }
        if (isModelPreset(selection)) {
            return normalizeDynamicSelection({ preset: selection });
        }
        return { mode: 'exact', model: selection };
    }

    if (!isPlainRecord(selection)) {
        throw new ModelSelectionConfigError('Model selection must be a string or plain object');
    }

    const keys = Object.keys(selection);
    if (keys.length === 0) {
        throw new ModelSelectionConfigError('Model selection object cannot be empty. Use "balanced" or { preset: "balanced" }.');
    }

    if ('model' in selection) {
        assertOnlyKeys(selection, EXACT_SELECTION_KEYS, 'exact model selection');
        return normalizeExactSelection(selection);
    }

    assertOnlyKeys(selection, DYNAMIC_SELECTION_KEYS, 'dynamic model selection');
    return normalizeDynamicSelection(selection as DynamicModelSelection);
}

function normalizeExactSelection(selection: Record<string, unknown>): NormalizedModelSelection {
    if (typeof selection.model !== 'string' || selection.model.trim().length === 0) {
        throw new ModelSelectionConfigError('Exact model selection requires a non-empty model string');
    }
    if ('provider' in selection && (typeof selection.provider !== 'string' || selection.provider.trim().length === 0)) {
        throw new ModelSelectionConfigError('Exact model selection provider must be a non-empty provider string');
    }

    return {
        mode: 'exact',
        model: selection.model,
        ...(selection.provider !== undefined ? { provider: selection.provider as RegisteredProviders } : {})
    };
}

function normalizeDynamicSelection(selection: DynamicModelSelection): NormalizedModelSelection {
    const preset = selection.preset ?? 'balanced';
    if (!isModelPreset(preset)) {
        throw new ModelSelectionConfigError(`Unknown model selection preset: ${String(preset)}`);
    }

    const userPreferences = normalizePreferenceInput(selection.prefer);
    const prefer = mergePreferences(MODEL_SELECTION_PRESETS[preset], userPreferences);
    const constraints = normalizeConstraints(selection.constraints);
    const resolution = normalizeResolution(selection.resolution);

    return {
        mode: 'dynamic',
        preset,
        prefer,
        constraints,
        resolution
    };
}

function normalizePreferenceInput(prefer: unknown): ModelPreferences {
    if (prefer === undefined) return {};
    if (!isPlainRecord(prefer)) {
        throw new ModelSelectionConfigError('Model selection prefer must be a plain object');
    }
    if (Object.keys(prefer).length === 0) {
        throw new ModelSelectionConfigError('Model selection prefer cannot be empty');
    }

    const normalized: ModelPreferences = {};
    for (const [key, value] of Object.entries(prefer)) {
        if (!isPreferenceDimension(key)) {
            throw new ModelSelectionConfigError(`Unknown model preference dimension: ${key}`);
        }
        if (!isNonNegativeFiniteNumber(value)) {
            throw new ModelSelectionConfigError(`Model preference "${key}" must be a non-negative finite number`);
        }
        normalized[key] = value;
    }

    if (Object.values(normalized).every(value => value === 0)) {
        throw new ModelSelectionConfigError('At least one model preference weight must be greater than zero');
    }

    return normalized;
}

function mergePreferences(
    presetPreferences: Required<ModelPreferences>,
    userPreferences: ModelPreferences
): Required<ModelPreferences> {
    const merged: Required<ModelPreferences> = {
        ...presetPreferences,
        ...userPreferences
    };

    const total = Object.values(merged).reduce((sum, value) => sum + value, 0);
    if (total <= 0) {
        throw new ModelSelectionConfigError('At least one model preference weight must be greater than zero');
    }

    return {
        cost: merged.cost / total,
        latency: merged.latency / total,
        throughput: merged.throughput / total,
        quality: merged.quality / total,
        context: merged.context / total
    };
}

function normalizeConstraints(constraints: unknown): ModelConstraints {
    if (constraints === undefined) return {};
    if (!isPlainRecord(constraints)) {
        throw new ModelSelectionConfigError('Model selection constraints must be a plain object');
    }
    if (Object.keys(constraints).length === 0) {
        throw new ModelSelectionConfigError('Model selection constraints cannot be empty');
    }

    for (const key of FORBIDDEN_PROVIDER_CONSTRAINT_KEYS) {
        if (key in constraints) {
            throw new ModelSelectionConfigError(`Provider constraint "${key}" is not supported in v1. Use the constructor provider scope instead.`);
        }
    }

    assertOnlyKeys(constraints, CONSTRAINT_KEYS, 'model selection constraints');

    const normalized: ModelConstraints = {};
    for (const [key, value] of Object.entries(constraints)) {
        switch (key) {
            case 'allowedModels':
            case 'excludedModels':
                normalized[key] = validateStringArray(value, key);
                break;
            case 'allowPreviewModels':
            case 'allowDeprecatedModels':
            case 'allowUncensoredModels':
                if (typeof value !== 'boolean') {
                    throw new ModelSelectionConfigError(`Constraint "${key}" must be a boolean`);
                }
                normalized[key] = value;
                break;
            default:
                if (!isNonNegativeFiniteNumber(value)) {
                    throw new ModelSelectionConfigError(`Constraint "${key}" must be a non-negative finite number`);
                }
                (normalized as Record<string, number>)[key] = value;
        }
    }

    return normalized;
}

function normalizeResolution(resolution: unknown): Required<ModelResolutionOptions> {
    if (resolution === undefined) {
        return { explain: false };
    }
    if (!isPlainRecord(resolution)) {
        throw new ModelSelectionConfigError('Model selection resolution must be a plain object');
    }
    if (Object.keys(resolution).length === 0) {
        throw new ModelSelectionConfigError('Model selection resolution cannot be empty');
    }
    assertOnlyKeys(resolution, ['explain'] as const, 'model selection resolution');
    if (typeof resolution.explain !== 'boolean') {
        throw new ModelSelectionConfigError('Model selection resolution.explain must be a boolean');
    }
    return { explain: resolution.explain };
}

function assertOnlyKeys<T extends readonly string[]>(
    value: Record<string, unknown>,
    allowedKeys: T,
    label: string
): void {
    const allowed = allowedKeys as readonly string[];
    for (const key of Object.keys(value)) {
        if (!allowed.includes(key)) {
            throw new ModelSelectionConfigError(`Unknown ${label} property: ${key}`);
        }
    }
}

function validateStringArray(value: unknown, key: string): string[] {
    if (!Array.isArray(value)) {
        throw new ModelSelectionConfigError(`Constraint "${key}" must be an array of model names`);
    }
    if (value.length === 0) {
        throw new ModelSelectionConfigError(`Constraint "${key}" cannot be empty`);
    }
    for (const item of value) {
        if (typeof item !== 'string' || item.trim().length === 0) {
            throw new ModelSelectionConfigError(`Constraint "${key}" must contain only non-empty model names`);
        }
    }
    return [...value];
}

function isPreferenceDimension(value: string): value is PreferenceDimension {
    return (PREFERENCE_DIMENSIONS as readonly string[]).includes(value);
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

