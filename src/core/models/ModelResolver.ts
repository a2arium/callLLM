import type { RegisteredProviders } from '../../adapters/index.ts';
import type { ModelInfo } from '../../interfaces/UniversalInterfaces.ts';
import {
    explainCapabilityMatch,
    type CapabilityMatchResult,
    type ProviderInterfaceSupport,
    type RequestRequirements
} from './CapabilityMatcher.ts';
import {
    ModelCatalog,
    type ModelCandidate,
    type ProviderModelCatalogs
} from './ModelCatalog.ts';
import {
    ModelScoringError,
    rankCandidates,
    type ConstraintResult,
    type RankedModelSelection,
    type ScoreContext,
    type ScoredModelCandidate
} from './ModelScoring.ts';
import {
    normalizeModelSelection,
    type ModelOrSelection,
    type ModelPreset,
    type NormalizedModelSelection,
    type ProviderScope
} from './ModelSelection.ts';

export type ModelResolutionMode = 'exact' | 'preset' | 'policy';

export type ModelResolverInput = {
    providerScope: ProviderScope;
    selection: ModelOrSelection;
    requirements: RequestRequirements;
    scoreContext?: ScoreContext;
    catalogs?: ProviderModelCatalogs;
    providerInterfacesByProvider?: Partial<Record<RegisteredProviders, ProviderInterfaceSupport>>;
};

export type ResolvedModel = {
    provider: RegisteredProviders;
    model: string;
    modelInfo: ModelInfo;
    mode: ModelResolutionMode;
    preset?: ModelPreset;
    resolution?: ModelResolution;
};

export type ModelResolution = {
    selected: {
        provider: RegisteredProviders;
        model: string;
    };
    mode: ModelResolutionMode;
    preset?: ModelPreset;
    requiredByRequest: string[];
    appliedConstraints: string[];
    candidates?: ModelResolutionCandidate[];
};

export type ModelResolutionCandidate = {
    provider: RegisteredProviders;
    model: string;
    score?: number;
    selected?: boolean;
    rejected?: boolean;
    rejectionReasons?: string[];
};

export type ModelResolutionErrorDetails = {
    providerScope: readonly RegisteredProviders[];
    requiredByRequest: readonly string[];
    rejected: readonly ModelResolutionCandidate[];
};

export class ModelSelectionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ModelSelectionError';
    }
}

export class ModelResolutionError extends ModelSelectionError {
    constructor(
        message: string,
        public readonly details: ModelResolutionErrorDetails
    ) {
        super(formatModelResolutionErrorMessage(message, details));
        this.name = 'ModelResolutionError';
    }
}

export function formatModelResolutionErrorMessage(
    message: string,
    details: ModelResolutionErrorDetails
): string {
    const lines = [message];

    if (details.providerScope.length > 0) {
        lines.push('', 'Provider scope:');
        for (const provider of details.providerScope) {
            lines.push(`- ${provider}`);
        }
    }

    if (details.requiredByRequest.length > 0) {
        lines.push('', 'Required by request:');
        for (const requirement of details.requiredByRequest) {
            lines.push(`- ${requirement}`);
        }
    }

    if (details.rejected.length > 0) {
        lines.push('', 'Rejected candidates:');
        for (const candidate of details.rejected) {
            const reasons = candidate.rejectionReasons?.length
                ? candidate.rejectionReasons.join('; ')
                : 'no rejection reason recorded';
            lines.push(`- ${candidate.provider}/${candidate.model}: ${reasons}`);
        }
    }

    return lines.join('\n');
}

export function resolveModel(input: ModelResolverInput): ResolvedModel {
    const catalog = new ModelCatalog(input.providerScope, input.catalogs);
    const selection = normalizeModelSelection(input.selection);
    const providerScope = catalog.getProviderScope();
    const providerInterfacesByProvider = input.providerInterfacesByProvider ?? {};

    if (selection.mode === 'exact') {
        return resolveExact(catalog, selection, input.requirements, providerInterfacesByProvider);
    }

    return resolveDynamic(catalog, selection, input.requirements, providerInterfacesByProvider, input.scoreContext);
}

function resolveExact(
    catalog: ModelCatalog,
    selection: Extract<NormalizedModelSelection, { mode: 'exact' }>,
    requirements: RequestRequirements,
    providerInterfacesByProvider: Partial<Record<RegisteredProviders, ProviderInterfaceSupport>>
): ResolvedModel {
    const candidate = catalog.resolveExactModel(selection);
    const match = explainCandidate(candidate, requirements, providerInterfacesByProvider);

    if (!match.matches) {
        throw new ModelResolutionError(
            `Exact model ${candidate.provider}/${candidate.model.name} does not satisfy the request requirements`,
            {
                providerScope: catalog.getProviderScope(),
                requiredByRequest: describeRequestRequirements(requirements),
                rejected: [candidateToResolutionCandidate(candidate, {
                    rejected: true,
                    rejectionReasons: match.rejectionReasons
                })]
            }
        );
    }

    return {
        provider: candidate.provider,
        model: candidate.model.name,
        modelInfo: candidate.model,
        mode: 'exact',
        resolution: {
            selected: {
                provider: candidate.provider,
                model: candidate.model.name
            },
            mode: 'exact',
            requiredByRequest: describeRequestRequirements(requirements),
            appliedConstraints: [],
            candidates: [candidateToResolutionCandidate(candidate, { selected: true })]
        }
    };
}

function resolveDynamic(
    catalog: ModelCatalog,
    selection: Extract<NormalizedModelSelection, { mode: 'dynamic' }>,
    requirements: RequestRequirements,
    providerInterfacesByProvider: Partial<Record<RegisteredProviders, ProviderInterfaceSupport>>,
    scoreContext: ScoreContext = {}
): ResolvedModel {
    const candidates = catalog.getCandidates();
    const capabilityAccepted: ModelCandidate[] = [];
    const capabilityRejected: ModelResolutionCandidate[] = [];

    for (const candidate of candidates) {
        const match = explainCandidate(candidate, requirements, providerInterfacesByProvider);
        if (match.matches) {
            capabilityAccepted.push(candidate);
        } else {
            capabilityRejected.push(candidateToResolutionCandidate(candidate, {
                rejected: true,
                rejectionReasons: match.rejectionReasons
            }));
        }
    }

    if (capabilityAccepted.length === 0) {
        throw new ModelResolutionError(
            'No model matched the request requirements',
            {
                providerScope: catalog.getProviderScope(),
                requiredByRequest: describeRequestRequirements(requirements),
                rejected: capabilityRejected
            }
        );
    }

    let ranked: RankedModelSelection;
    try {
        ranked = rankCandidates(capabilityAccepted, selection, {
            ...scoreContext,
            providerOrder: scoreContext.providerOrder ?? catalog.getProviderScope()
        });
    } catch (error) {
        if (error instanceof ModelScoringError) {
            throw new ModelResolutionError(
                error.message,
                {
                    providerScope: catalog.getProviderScope(),
                    requiredByRequest: describeRequestRequirements(requirements),
                    rejected: [
                        ...constraintResultsToResolutionCandidates(error.rejected),
                        ...capabilityRejected
                    ]
                }
            );
        }
        throw error;
    }
    const selected = ranked.selected;
    const mode: ModelResolutionMode = selection.preset ? 'preset' : 'policy';

    return {
        provider: selected.provider,
        model: selected.model.name,
        modelInfo: selected.model,
        mode,
        preset: selection.preset,
        resolution: {
            selected: {
                provider: selected.provider,
                model: selected.model.name
            },
            mode,
            preset: selection.preset,
            requiredByRequest: describeRequestRequirements(requirements),
            appliedConstraints: describeConstraints(selection.constraints),
            candidates: [
                ...ranked.candidates.map(candidate => scoredCandidateToResolutionCandidate(candidate, selected)),
                ...constraintResultsToResolutionCandidates(ranked.rejected),
                ...capabilityRejected
            ]
        }
    };
}

function explainCandidate(
    candidate: ModelCandidate,
    requirements: RequestRequirements,
    providerInterfacesByProvider: Partial<Record<RegisteredProviders, ProviderInterfaceSupport>>
): CapabilityMatchResult {
    return explainCapabilityMatch(
        candidate,
        requirements,
        providerInterfacesByProvider[candidate.provider] ?? {}
    );
}

function scoredCandidateToResolutionCandidate(
    candidate: ScoredModelCandidate,
    selected: ScoredModelCandidate
): ModelResolutionCandidate {
    return candidateToResolutionCandidate(candidate, {
        score: candidate.totalScore,
        selected: candidate.provider === selected.provider && candidate.model.name === selected.model.name
    });
}

function constraintResultsToResolutionCandidates(results: ConstraintResult[]): ModelResolutionCandidate[] {
    return results.map(result => candidateToResolutionCandidate(result.candidate, {
        rejected: true,
        rejectionReasons: result.rejectionReasons
    }));
}

function candidateToResolutionCandidate(
    candidate: ModelCandidate,
    details: Omit<ModelResolutionCandidate, 'provider' | 'model'> = {}
): ModelResolutionCandidate {
    return {
        provider: candidate.provider,
        model: candidate.model.name,
        ...details
    };
}

export function describeRequestRequirements(requirements: RequestRequirements): string[] {
    const descriptions: string[] = [];

    if (requirements.textInput) descriptions.push('text input');
    if (requirements.textOutput?.required) descriptions.push(describeTextOutput(requirements.textOutput));
    if (requirements.imageInput?.required) descriptions.push('image input');
    if (requirements.imageOutput?.required) descriptions.push('image output');
    if (requirements.audioInput?.required) descriptions.push('audio input');
    if (requirements.audioOutput?.required) descriptions.push('audio output');
    if (requirements.videoOutput?.required) descriptions.push('video output');
    if (requirements.embeddings?.required) descriptions.push('embeddings');
    if (requirements.audioApi?.required) descriptions.push(`audio API${requirements.audioApi.operations?.length ? ` (${requirements.audioApi.operations.join(', ')})` : ''}`);
    if (requirements.toolCalls?.required) descriptions.push(`tool calling${requirements.toolCalls.streaming ? ' with streaming' : ''}${requirements.toolCalls.parallel ? ' with parallel calls' : ''}`);
    if (requirements.streaming?.required) descriptions.push('streaming');
    if (requirements.reasoning?.required) descriptions.push('reasoning');
    if (requirements.tokenBudget?.estimatedInputTokens !== undefined) descriptions.push(`estimated input tokens <= ${requirements.tokenBudget.estimatedInputTokens}`);
    if (requirements.tokenBudget?.requestedOutputTokens !== undefined) descriptions.push(`requested output tokens <= ${requirements.tokenBudget.requestedOutputTokens}`);
    if (requirements.providerInterfaces?.imageCall) descriptions.push('provider image interface');
    if (requirements.providerInterfaces?.videoCall) descriptions.push('provider video interface');
    if (requirements.providerInterfaces?.embeddingCall) descriptions.push('provider embedding interface');
    if (requirements.providerInterfaces?.audioCall) descriptions.push('provider audio interface');

    return descriptions;
}

function describeTextOutput(textOutput: NonNullable<RequestRequirements['textOutput']>): string {
    if (textOutput.structuredOutputsRequired) return 'structured JSON output';
    if (textOutput.nativeJsonRequired) return 'native JSON output';
    if (textOutput.formats?.includes('json')) return 'JSON output';
    return 'text output';
}

function describeConstraints(constraints: Extract<NormalizedModelSelection, { mode: 'dynamic' }>['constraints']): string[] {
    const descriptions: string[] = [];

    for (const [key, value] of Object.entries(constraints)) {
        if (Array.isArray(value)) {
            descriptions.push(`${key}: ${value.join(', ')}`);
        } else {
            descriptions.push(`${key}: ${String(value)}`);
        }
    }

    return descriptions;
}
