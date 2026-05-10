import type { ModelInfo } from '../../interfaces/UniversalInterfaces.ts';
import type { ModelCandidate } from './ModelCatalog.ts';
import type { ModelConstraints, NormalizedModelSelection, PreferenceDimension } from './ModelSelection.ts';

export type SelectionOperation =
    | 'text'
    | 'json'
    | 'tools'
    | 'reasoning'
    | 'embeddings'
    | 'imageInput'
    | 'imageOutput'
    | 'video'
    | 'audioTranscribe'
    | 'audioTranslate'
    | 'audioSpeech';

export type ScoreContext = {
    operation?: SelectionOperation;
    estimatedInputTokens?: number;
    estimatedOutputTokens?: number;
    providerOrder?: readonly string[];
};

export type CandidateScores = Record<PreferenceDimension, number>;

export type ScoredModelCandidate = ModelCandidate & {
    totalScore: number;
    scores: CandidateScores;
    estimatedCost?: number;
    rejectionReasons?: string[];
};

export type ConstraintResult = {
    candidate: ModelCandidate;
    rejected: boolean;
    rejectionReasons: string[];
};

export type RankedModelSelection = {
    selected: ScoredModelCandidate;
    candidates: ScoredModelCandidate[];
    rejected: ConstraintResult[];
};

const NEUTRAL_SCORE = 0.5;

export function rankCandidates(
    candidates: ModelCandidate[],
    selection: Extract<NormalizedModelSelection, { mode: 'dynamic' }>,
    context: ScoreContext = {}
): RankedModelSelection {
    const { accepted, rejected } = applyModelConstraints(candidates, selection.constraints);
    if (accepted.length === 0) {
        throw new ModelScoringError('No model candidates remain after applying constraints', rejected);
    }

    const scored = scoreCandidates(accepted, selection, context);
    const sorted = sortScoredCandidates(scored, context.providerOrder);
    const selected = sorted[0];
    if (!selected) {
        throw new ModelScoringError('No model candidates available to rank', rejected);
    }

    return {
        selected,
        candidates: sorted,
        rejected
    };
}

export function applyModelConstraints(
    candidates: ModelCandidate[],
    constraints: ModelConstraints = {}
): { accepted: ModelCandidate[]; rejected: ConstraintResult[] } {
    const accepted: ModelCandidate[] = [];
    const rejected: ConstraintResult[] = [];

    for (const candidate of candidates) {
        const rejectionReasons = getConstraintRejectionReasons(candidate, constraints);
        if (rejectionReasons.length > 0) {
            rejected.push({ candidate, rejected: true, rejectionReasons });
        } else {
            accepted.push(candidate);
        }
    }

    return { accepted, rejected };
}

export function getConstraintRejectionReasons(
    candidate: ModelCandidate,
    constraints: ModelConstraints = {}
): string[] {
    const model = candidate.model;
    const reasons: string[] = [];

    if (constraints.allowedModels && !constraints.allowedModels.includes(model.name)) {
        reasons.push(`model is not in allowedModels: ${constraints.allowedModels.join(', ')}`);
    }
    if (constraints.excludedModels?.includes(model.name)) {
        reasons.push('model is in excludedModels');
    }
    if (constraints.maxInputPricePerMillion !== undefined) {
        checkOptionalPrice(reasons, 'inputPricePerMillion', model.inputPricePerMillion, constraints.maxInputPricePerMillion);
    }
    if (constraints.maxOutputPricePerMillion !== undefined) {
        checkOptionalPrice(reasons, 'outputPricePerMillion', model.outputPricePerMillion, constraints.maxOutputPricePerMillion);
    }
    if (constraints.maxImagePricePerImage !== undefined) {
        checkOptionalPrice(reasons, 'imagePricePerImage', model.imagePricePerImage, constraints.maxImagePricePerImage);
    }
    if (constraints.maxVideoPricePerSecond !== undefined) {
        checkOptionalPrice(reasons, 'videoPricePerSecond', model.videoPricePerSecond, constraints.maxVideoPricePerSecond);
    }
    if (constraints.maxAudioPricePerSecond !== undefined) {
        checkOptionalPrice(reasons, 'audioPricePerSecond', model.audioPricePerSecond, constraints.maxAudioPricePerSecond);
    }
    if (constraints.maxTtsPricePerMillionChars !== undefined) {
        checkOptionalPrice(reasons, 'ttsPricePerMillionChars', model.ttsPricePerMillionChars, constraints.maxTtsPricePerMillionChars);
    }
    if (constraints.minQuality !== undefined && model.characteristics.qualityIndex < constraints.minQuality) {
        reasons.push(`qualityIndex ${model.characteristics.qualityIndex} is below minimum ${constraints.minQuality}`);
    }
    if (constraints.minContextTokens !== undefined && model.maxRequestTokens < constraints.minContextTokens) {
        reasons.push(`maxRequestTokens ${model.maxRequestTokens} is below minimum ${constraints.minContextTokens}`);
    }
    if (constraints.minOutputTokens !== undefined && model.maxResponseTokens < constraints.minOutputTokens) {
        reasons.push(`maxResponseTokens ${model.maxResponseTokens} is below minimum ${constraints.minOutputTokens}`);
    }
    if (constraints.allowUncensoredModels !== true && model.isUncensored === true) {
        reasons.push('uncensored models are not allowed');
    }

    return reasons;
}

export function scoreCandidates(
    candidates: ModelCandidate[],
    selection: Extract<NormalizedModelSelection, { mode: 'dynamic' }>,
    context: ScoreContext = {}
): ScoredModelCandidate[] {
    const operation = context.operation ?? 'text';
    const rawMetrics = candidates.map(candidate => getRawMetrics(candidate.model, operation, context));
    const relevance = getDimensionRelevance(operation);

    return candidates.map((candidate, index) => {
        const raw = rawMetrics[index];
        const scores: CandidateScores = {
            cost: relevance.cost ? normalizeMetric(raw.cost, rawMetrics.map(m => m.cost), false) : NEUTRAL_SCORE,
            latency: relevance.latency ? normalizeMetric(raw.latency, rawMetrics.map(m => m.latency), false) : NEUTRAL_SCORE,
            throughput: relevance.throughput ? normalizeMetric(raw.throughput, rawMetrics.map(m => m.throughput), true) : NEUTRAL_SCORE,
            quality: relevance.quality ? normalizeMetric(raw.quality, rawMetrics.map(m => m.quality), true) : NEUTRAL_SCORE,
            context: relevance.context ? normalizeMetric(raw.context, rawMetrics.map(m => m.context), true) : NEUTRAL_SCORE
        };

        const totalScore = Object.entries(selection.prefer).reduce((sum, [dimension, weight]) => {
            return sum + scores[dimension as PreferenceDimension] * weight;
        }, 0);

        return {
            ...candidate,
            totalScore,
            scores,
            estimatedCost: raw.cost
        };
    });
}

export function sortScoredCandidates(
    candidates: ScoredModelCandidate[],
    providerOrder: readonly string[] = []
): ScoredModelCandidate[] {
    return [...candidates].sort((a, b) => {
        return compareDescending(a.totalScore, b.totalScore)
            || compareDescending(a.scores.quality, b.scores.quality)
            || compareAscending(a.estimatedCost ?? Number.POSITIVE_INFINITY, b.estimatedCost ?? Number.POSITIVE_INFINITY)
            || compareAscending(a.model.characteristics.firstTokenLatency, b.model.characteristics.firstTokenLatency)
            || compareAscending(providerIndex(a.provider, providerOrder), providerIndex(b.provider, providerOrder))
            || a.model.name.localeCompare(b.model.name);
    });
}

export function getRawMetrics(model: ModelInfo, operation: SelectionOperation, context: ScoreContext = {}): {
    cost?: number;
    latency?: number;
    throughput?: number;
    quality?: number;
    context?: number;
} {
    return {
        cost: getOperationCost(model, operation, context),
        latency: getLatencyMetric(model, operation),
        throughput: getThroughputMetric(model, operation),
        quality: getQualityMetric(model, operation),
        context: model.maxRequestTokens
    };
}

export function getOperationCost(
    model: ModelInfo,
    operation: SelectionOperation,
    context: ScoreContext = {}
): number | undefined {
    switch (operation) {
        case 'imageOutput':
            return firstDefined(model.imagePricePerImage, model.imageOutputPricePerMillion, model.outputPricePerMillion);
        case 'imageInput':
            return firstDefined(model.imageInputPricePerMillion, model.inputPricePerMillion);
        case 'video':
            return firstDefined(model.videoPricePerSecond, model.outputPricePerMillion);
        case 'audioTranscribe':
        case 'audioTranslate':
            return firstDefined(model.audioPricePerSecond, model.audioInputPricePerMillion, model.inputPricePerMillion);
        case 'audioSpeech':
            return firstDefined(model.ttsPricePerMillionChars, model.audioOutputPricePerMillion, model.outputPricePerMillion);
        case 'embeddings':
            return model.inputPricePerMillion;
        case 'text':
        case 'json':
        case 'tools':
        case 'reasoning':
        default:
            return getTextCost(model, context);
    }
}

export function normalizeMetric(
    value: number | undefined,
    values: Array<number | undefined>,
    higherIsBetter: boolean
): number {
    if (value === undefined) {
        return NEUTRAL_SCORE;
    }

    const known = values.filter((item): item is number => item !== undefined && Number.isFinite(item));
    if (known.length === 0) {
        return NEUTRAL_SCORE;
    }

    const min = Math.min(...known);
    const max = Math.max(...known);
    if (max === min) {
        return 1;
    }

    const normalized = (value - min) / (max - min);
    return higherIsBetter ? normalized : 1 - normalized;
}

export class ModelScoringError extends Error {
    constructor(
        message: string,
        public readonly rejected: ConstraintResult[] = []
    ) {
        super(message);
        this.name = 'ModelScoringError';
    }
}

function getTextCost(model: ModelInfo, context: ScoreContext): number {
    const estimatedInput = context.estimatedInputTokens;
    const estimatedOutput = context.estimatedOutputTokens;
    if (estimatedInput !== undefined || estimatedOutput !== undefined) {
        const input = estimatedInput ?? 0;
        const output = estimatedOutput ?? 0;
        const total = Math.max(input + output, 1);
        return ((model.inputPricePerMillion * input) + (model.outputPricePerMillion * output)) / total;
    }
    return (model.inputPricePerMillion * 0.4) + (model.outputPricePerMillion * 0.6);
}

function getLatencyMetric(model: ModelInfo, operation: SelectionOperation): number | undefined {
    if (isNonTextMediaOperation(operation) && model.characteristics.firstTokenLatency === 0) {
        return undefined;
    }
    return model.characteristics.firstTokenLatency;
}

function getThroughputMetric(model: ModelInfo, operation: SelectionOperation): number | undefined {
    if (isNonTextMediaOperation(operation) && model.characteristics.outputSpeed === 0) {
        return undefined;
    }
    return model.characteristics.outputSpeed;
}

function getQualityMetric(model: ModelInfo, _operation: SelectionOperation): number | undefined {
    return model.characteristics.qualityIndex;
}

function getDimensionRelevance(operation: SelectionOperation): Record<PreferenceDimension, boolean> {
    switch (operation) {
        case 'embeddings':
            return { cost: true, latency: true, throughput: false, quality: true, context: true };
        case 'imageOutput':
        case 'video':
            return { cost: true, latency: false, throughput: false, quality: true, context: false };
        case 'audioTranscribe':
        case 'audioTranslate':
        case 'audioSpeech':
            return { cost: true, latency: true, throughput: false, quality: true, context: false };
        case 'imageInput':
        case 'text':
        case 'json':
        case 'tools':
        case 'reasoning':
        default:
            return { cost: true, latency: true, throughput: true, quality: true, context: true };
    }
}

function isNonTextMediaOperation(operation: SelectionOperation): boolean {
    return operation === 'imageOutput'
        || operation === 'video'
        || operation === 'audioTranscribe'
        || operation === 'audioTranslate'
        || operation === 'audioSpeech';
}

function checkOptionalPrice(reasons: string[], label: string, value: number | undefined, max: number): void {
    if (value === undefined) {
        reasons.push(`${label} metadata is unavailable for requested constraint`);
        return;
    }
    if (value > max) {
        reasons.push(`${label} ${value} exceeds maximum ${max}`);
    }
}

function compareDescending(a: number, b: number): number {
    return b - a;
}

function compareAscending(a: number, b: number): number {
    return a - b;
}

function providerIndex(provider: string, providerOrder: readonly string[]): number {
    const index = providerOrder.indexOf(provider);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function firstDefined(...values: Array<number | undefined>): number | undefined {
    return values.find(value => value !== undefined);
}

