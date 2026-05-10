import type { RegisteredProviders } from '../../adapters/index.ts';
import type { ModelInfo } from '../../interfaces/UniversalInterfaces.ts';
import { defaultModels as openAIModels } from '../../adapters/openai/models.ts';
import { defaultModels as cerebrasModels } from '../../adapters/cerebras/models.ts';
import { defaultModels as veniceModels } from '../../adapters/venice/models.ts';
import { defaultModels as openrouterModels } from '../../adapters/openrouter/models.ts';
import { defaultModels as geminiModels } from '../../adapters/gemini/models.ts';
import type { ExactModelSelection, ProviderScope } from './ModelSelection.ts';
import { ModelSelectionConfigError } from './ModelSelection.ts';

export type ModelCandidate = {
    provider: RegisteredProviders;
    model: ModelInfo;
};

export type ProviderModelCatalogs = Partial<Record<RegisteredProviders, readonly ModelInfo[]>>;

export const DEFAULT_PROVIDER_MODEL_CATALOGS: Record<RegisteredProviders, readonly ModelInfo[]> = {
    openai: openAIModels,
    cerebras: cerebrasModels,
    venice: veniceModels,
    openrouter: openrouterModels,
    gemini: geminiModels
};

export class ModelNotFoundError extends Error {
    constructor(
        public readonly model: string,
        public readonly providerScope: readonly RegisteredProviders[]
    ) {
        super(`Model "${model}" not found in provider scope: ${providerScope.join(', ')}`);
        this.name = 'ModelNotFoundError';
    }
}

export class AmbiguousModelError extends Error {
    constructor(
        public readonly model: string,
        public readonly matches: readonly ModelCandidate[]
    ) {
        super(`Model "${model}" is available from multiple providers: ${matches.map(match => `${match.provider}/${match.model.name}`).join(', ')}. Use { provider, model } to select an exact provider.`);
        this.name = 'AmbiguousModelError';
    }
}

export class ModelCatalog {
    private readonly providerScope: RegisteredProviders[];
    private readonly candidates: ModelCandidate[];

    constructor(
        providerScope: ProviderScope,
        private readonly catalogs: ProviderModelCatalogs = DEFAULT_PROVIDER_MODEL_CATALOGS
    ) {
        this.providerScope = normalizeProviderScope(providerScope, catalogs);
        this.candidates = loadModelCandidates(this.providerScope, catalogs);
    }

    public getProviderScope(): RegisteredProviders[] {
        return [...this.providerScope];
    }

    public getCandidates(): ModelCandidate[] {
        return this.candidates.map(candidate => ({ ...candidate }));
    }

    public getProviderModels(provider: RegisteredProviders): ModelInfo[] {
        if (!this.providerScope.includes(provider)) {
            throw new ModelSelectionConfigError(`Provider "${provider}" is outside the constructor provider scope: ${this.providerScope.join(', ')}`);
        }
        const models = this.catalogs[provider];
        if (!models) {
            throw new ModelSelectionConfigError(`Provider "${provider}" has no model catalog`);
        }
        return [...models];
    }

    public resolveExactModel(selection: ExactModelSelection): ModelCandidate {
        return resolveExactModel(this.providerScope, selection, this.catalogs);
    }
}

export function normalizeProviderScope(
    providerScope: ProviderScope,
    catalogs: ProviderModelCatalogs = DEFAULT_PROVIDER_MODEL_CATALOGS
): RegisteredProviders[] {
    const providers = Array.isArray(providerScope) ? providerScope : [providerScope];

    if (providers.length === 0) {
        throw new ModelSelectionConfigError('Provider scope cannot be empty');
    }

    const knownProviders = new Set(Object.keys(catalogs));
    const normalized: RegisteredProviders[] = [];

    for (const provider of providers) {
        if (typeof provider !== 'string' || provider.trim().length === 0) {
            throw new ModelSelectionConfigError('Provider scope must contain only non-empty provider names');
        }
        if (!knownProviders.has(provider)) {
            throw new ModelSelectionConfigError(`Provider "${provider}" is not registered in the model catalog`);
        }
        if (!normalized.includes(provider as RegisteredProviders)) {
            normalized.push(provider as RegisteredProviders);
        }
    }

    return normalized;
}

export function loadModelCandidates(
    providerScope: ProviderScope,
    catalogs: ProviderModelCatalogs = DEFAULT_PROVIDER_MODEL_CATALOGS
): ModelCandidate[] {
    const providers = normalizeProviderScope(providerScope, catalogs);
    const candidates: ModelCandidate[] = [];

    for (const provider of providers) {
        const models = catalogs[provider];
        if (!models) {
            throw new ModelSelectionConfigError(`Provider "${provider}" has no model catalog`);
        }
        for (const model of models) {
            candidates.push({ provider, model });
        }
    }

    return candidates;
}

export function resolveExactModel(
    providerScope: ProviderScope,
    selection: ExactModelSelection,
    catalogs: ProviderModelCatalogs = DEFAULT_PROVIDER_MODEL_CATALOGS
): ModelCandidate {
    const providers = normalizeProviderScope(providerScope, catalogs);

    if (typeof selection.model !== 'string' || selection.model.trim().length === 0) {
        throw new ModelSelectionConfigError('Exact model selection requires a non-empty model string');
    }

    if (selection.provider !== undefined) {
        if (!providers.includes(selection.provider)) {
            throw new ModelSelectionConfigError(`Provider "${selection.provider}" is outside the constructor provider scope: ${providers.join(', ')}`);
        }
        const providerModels = catalogs[selection.provider];
        if (!providerModels) {
            throw new ModelSelectionConfigError(`Provider "${selection.provider}" has no model catalog`);
        }
        const model = providerModels.find(candidate => candidate.name === selection.model);
        if (!model) {
            throw new ModelNotFoundError(selection.model, [selection.provider]);
        }
        return { provider: selection.provider, model };
    }

    const matches = loadModelCandidates(providers, catalogs)
        .filter(candidate => candidate.model.name === selection.model);

    if (matches.length === 0) {
        throw new ModelNotFoundError(selection.model, providers);
    }
    if (matches.length > 1) {
        throw new AmbiguousModelError(selection.model, matches);
    }

    return matches[0];
}

