import type { ModelCapabilities, ModelInfo } from '../../interfaces/UniversalInterfaces.ts';
import type { ModelCandidate } from './ModelCatalog.ts';

export type TextOutputRequirement = {
    required: boolean;
    formats?: ('text' | 'json')[];
    nativeJsonRequired?: boolean;
    structuredOutputsRequired?: boolean;
};

export type RequestRequirements = {
    textInput?: true;
    textOutput?: TextOutputRequirement;
    imageInput?: {
        required: boolean;
        formats?: string[];
    };
    imageOutput?: {
        required: boolean;
        operations?: ('generate' | 'edit' | 'editWithMask')[];
    };
    audioInput?: {
        required: boolean;
        formats?: string[];
    };
    audioOutput?: {
        required: boolean;
        formats?: string[];
    };
    videoOutput?: {
        required: boolean;
        size?: string;
        seconds?: number;
        variant?: 'video' | 'thumbnail' | 'spritesheet';
    };
    embeddings?: {
        required: boolean;
        dimensions?: number;
        encodingFormat?: 'float' | 'base64';
    };
    audioApi?: {
        required: boolean;
        operations?: ('transcribe' | 'translate' | 'synthesize')[];
        inputFormat?: string;
        outputFormat?: string;
        voice?: string;
    };
    toolCalls?: {
        required: boolean;
        streaming?: boolean;
        parallel?: boolean;
    };
    streaming?: {
        required: boolean;
    };
    reasoning?: {
        required: boolean;
    };
    tokenBudget?: {
        estimatedInputTokens?: number;
        requestedOutputTokens?: number;
    };
    providerInterfaces?: {
        imageCall?: boolean;
        videoCall?: boolean;
        embeddingCall?: boolean;
        audioCall?: boolean;
    };
};

export type ProviderInterfaceSupport = {
    imageCall?: boolean;
    videoCall?: boolean;
    embeddingCall?: boolean;
    audioCall?: boolean;
};

export type CapabilityMatchResult = {
    matches: boolean;
    rejectionReasons: string[];
};

const DEFAULT_CAPABILITIES: ModelCapabilities = {
    streaming: true,
    toolCalls: false,
    parallelToolCalls: false,
    batchProcessing: false,
    reasoning: false,
    input: {
        text: true
    },
    output: {
        text: {
            textOutputFormats: ['text']
        }
    }
};

export function getEffectiveCapabilities(model: ModelInfo): ModelCapabilities {
    return model.capabilities ?? DEFAULT_CAPABILITIES;
}

export function candidateMeetsRequirements(
    candidate: ModelCandidate,
    requirements: RequestRequirements,
    providerInterfaces: ProviderInterfaceSupport = {}
): boolean {
    return explainCapabilityMatch(candidate, requirements, providerInterfaces).matches;
}

export function filterCandidatesByRequirements(
    candidates: ModelCandidate[],
    requirements: RequestRequirements,
    providerInterfacesByProvider: Partial<Record<string, ProviderInterfaceSupport>> = {}
): ModelCandidate[] {
    return candidates.filter(candidate => candidateMeetsRequirements(
        candidate,
        requirements,
        providerInterfacesByProvider[candidate.provider] ?? {}
    ));
}

export function explainCapabilityMatch(
    candidate: ModelCandidate,
    requirements: RequestRequirements,
    providerInterfaces: ProviderInterfaceSupport = {}
): CapabilityMatchResult {
    const reasons: string[] = [];
    const model = candidate.model;
    const capabilities = getEffectiveCapabilities(model);

    if (requirements.textInput && !supportsTextInput(capabilities)) {
        reasons.push('text input is not supported');
    }

    if (requirements.textOutput?.required && !supportsTextOutput(capabilities, requirements.textOutput)) {
        reasons.push(formatTextOutputReason(requirements.textOutput));
    }

    if (requirements.imageInput?.required && !supportsImageInput(capabilities, requirements.imageInput.formats)) {
        reasons.push(formatFormatsReason('image input', requirements.imageInput.formats));
    }

    if (requirements.imageOutput?.required && !supportsImageOutput(capabilities, requirements.imageOutput.operations)) {
        reasons.push(formatOperationsReason('image output', requirements.imageOutput.operations));
    }

    if (requirements.audioInput?.required && !supportsAudioInput(capabilities, requirements.audioInput.formats)) {
        reasons.push(formatFormatsReason('audio input', requirements.audioInput.formats));
    }

    if (requirements.audioOutput?.required && !supportsAudioOutput(capabilities, requirements.audioOutput.formats)) {
        reasons.push(formatFormatsReason('audio output', requirements.audioOutput.formats));
    }

    if (requirements.videoOutput?.required && !supportsVideoOutput(capabilities, requirements.videoOutput)) {
        reasons.push(formatVideoReason(requirements.videoOutput));
    }

    if (requirements.embeddings?.required && !supportsEmbeddings(capabilities, requirements.embeddings)) {
        reasons.push(formatEmbeddingReason(requirements.embeddings));
    }

    if (requirements.audioApi?.required && !supportsAudioApi(capabilities, requirements.audioApi)) {
        reasons.push(formatAudioApiReason(requirements.audioApi));
    }

    if (requirements.toolCalls?.required && !supportsToolCalls(capabilities, requirements.toolCalls)) {
        reasons.push(formatToolReason(requirements.toolCalls));
    }

    if (requirements.streaming?.required && capabilities.streaming !== true) {
        reasons.push('streaming is not supported');
    }

    if (requirements.reasoning?.required && capabilities.reasoning !== true) {
        reasons.push('reasoning is not supported');
    }

    const tokenReason = checkTokenBudget(model, requirements.tokenBudget);
    if (tokenReason) {
        reasons.push(tokenReason);
    }

    const interfaceReasons = checkProviderInterfaces(requirements.providerInterfaces, providerInterfaces);
    reasons.push(...interfaceReasons);

    return {
        matches: reasons.length === 0,
        rejectionReasons: reasons
    };
}

export function supportsTextInput(capabilities: ModelCapabilities): boolean {
    return Boolean(capabilities.input.text);
}

export function supportsTextOutput(
    capabilities: ModelCapabilities,
    requirement: TextOutputRequirement = { required: true }
): boolean {
    const textCapability = capabilities.output.text;
    if (textCapability === false) return false;

    const formats = requirement.formats;
    if (textCapability === true) {
        return !formats || formats.every(format => format === 'text');
    }

    if (typeof textCapability === 'object') {
        if (formats && !formats.every(format => textCapability.textOutputFormats.includes(format))) {
            return false;
        }
        if ((requirement.nativeJsonRequired || requirement.structuredOutputsRequired) && textCapability.structuredOutputs !== true) {
            return false;
        }
        return true;
    }

    return false;
}

export function supportsImageInput(capabilities: ModelCapabilities, formats?: string[]): boolean {
    const imageCapability = capabilities.input.image;
    if (!imageCapability) return false;
    if (imageCapability === true) return true;
    return !formats || !imageCapability.formats || formats.every(format => imageCapability.formats!.includes(format));
}

export function supportsImageOutput(
    capabilities: ModelCapabilities,
    operations?: ('generate' | 'edit' | 'editWithMask')[]
): boolean {
    const imageCapability = capabilities.output.image;
    if (!imageCapability) return false;
    if (typeof imageCapability === 'boolean') return imageCapability;
    if (!operations || operations.length === 0) return true;

    return operations.every(operation => {
        if (operation === 'generate') return imageCapability.generate === true;
        if (operation === 'edit') return imageCapability.edit === true;
        if (operation === 'editWithMask') return imageCapability.editWithMask === true;
        return false;
    });
}

export function supportsAudioInput(capabilities: ModelCapabilities, formats?: string[]): boolean {
    const audioCapability = capabilities.input.audio;
    if (!audioCapability) return false;
    if (audioCapability === true) return true;
    return !formats || !audioCapability.formats || formats.every(format => audioCapability.formats!.includes(format));
}

export function supportsAudioOutput(capabilities: ModelCapabilities, formats?: string[]): boolean {
    const audioCapability = capabilities.output.audio;
    if (!audioCapability) return false;
    if (audioCapability === true) return true;
    return !formats || !audioCapability.formats || formats.every(format => audioCapability.formats!.includes(format));
}

export function supportsVideoOutput(
    capabilities: ModelCapabilities,
    requirement: NonNullable<RequestRequirements['videoOutput']>
): boolean {
    const videoCapability = capabilities.output.video;
    if (!videoCapability) return false;
    if (videoCapability === true) return true;

    if (requirement.size && videoCapability.sizes && !videoCapability.sizes.includes(requirement.size)) {
        return false;
    }
    if (requirement.seconds !== undefined && videoCapability.maxSeconds !== undefined && requirement.seconds > videoCapability.maxSeconds) {
        return false;
    }
    if (requirement.variant && videoCapability.variants && !videoCapability.variants.includes(requirement.variant)) {
        return false;
    }
    return true;
}

export function supportsEmbeddings(
    capabilities: ModelCapabilities,
    requirement: NonNullable<RequestRequirements['embeddings']>
): boolean {
    const embeddingCapability = capabilities.embeddings;
    if (!embeddingCapability) return false;
    if (embeddingCapability === true) return true;

    if (
        requirement.dimensions !== undefined &&
        embeddingCapability.dimensions &&
        !embeddingCapability.dimensions.includes(requirement.dimensions)
    ) {
        return false;
    }
    if (
        requirement.encodingFormat &&
        embeddingCapability.encodingFormats &&
        !embeddingCapability.encodingFormats.includes(requirement.encodingFormat)
    ) {
        return false;
    }
    return true;
}

export function supportsAudioApi(
    capabilities: ModelCapabilities,
    requirement: NonNullable<RequestRequirements['audioApi']>
): boolean {
    const audioCapability = capabilities.audio;
    if (!audioCapability) return false;
    if (audioCapability === true) return true;

    const operations = requirement.operations;
    if (operations?.length) {
        const supportsAllOperations = operations.every(operation => {
            if (operation === 'transcribe') return audioCapability.transcribe === true;
            if (operation === 'translate') return audioCapability.translate === true;
            if (operation === 'synthesize') return audioCapability.synthesize === true;
            return false;
        });
        if (!supportsAllOperations) return false;
    } else if (!audioCapability.transcribe && !audioCapability.translate && !audioCapability.synthesize) {
        return false;
    }

    if (requirement.inputFormat && audioCapability.supportedInputFormats && !audioCapability.supportedInputFormats.includes(requirement.inputFormat)) {
        return false;
    }
    if (requirement.outputFormat && audioCapability.supportedOutputFormats && !audioCapability.supportedOutputFormats.includes(requirement.outputFormat)) {
        return false;
    }
    if (requirement.voice && audioCapability.voices && !audioCapability.voices.includes(requirement.voice)) {
        return false;
    }

    return true;
}

export function supportsToolCalls(
    capabilities: ModelCapabilities,
    requirement: NonNullable<RequestRequirements['toolCalls']>
): boolean {
    const toolCapability = capabilities.toolCalls;
    if (!toolCapability) return false;

    if (toolCapability === true) {
        if (requirement.parallel && capabilities.parallelToolCalls === false) {
            return false;
        }
        return true;
    }

    if (!toolCapability.nonStreaming) return false;

    if (requirement.streaming && toolCapability.streamingMode === 'none') {
        return false;
    }

    const supportsParallel = toolCapability.parallel !== undefined
        ? toolCapability.parallel
        : capabilities.parallelToolCalls === true;
    if (requirement.parallel && !supportsParallel) {
        return false;
    }

    return true;
}

function checkTokenBudget(model: ModelInfo, tokenBudget?: RequestRequirements['tokenBudget']): string | undefined {
    if (!tokenBudget) return undefined;

    if (
        tokenBudget.estimatedInputTokens !== undefined &&
        tokenBudget.estimatedInputTokens > model.maxRequestTokens
    ) {
        return `estimated input tokens ${tokenBudget.estimatedInputTokens} exceed max request tokens ${model.maxRequestTokens}`;
    }

    if (
        tokenBudget.requestedOutputTokens !== undefined &&
        tokenBudget.requestedOutputTokens > model.maxResponseTokens
    ) {
        return `requested output tokens ${tokenBudget.requestedOutputTokens} exceed max response tokens ${model.maxResponseTokens}`;
    }

    return undefined;
}

function checkProviderInterfaces(
    required?: RequestRequirements['providerInterfaces'],
    available: ProviderInterfaceSupport = {}
): string[] {
    if (!required) return [];
    const reasons: string[] = [];

    if (required.imageCall && available.imageCall !== true) reasons.push('provider imageCall interface is not available');
    if (required.videoCall && available.videoCall !== true) reasons.push('provider videoCall interface is not available');
    if (required.embeddingCall && available.embeddingCall !== true) reasons.push('provider embeddingCall interface is not available');
    if (required.audioCall && available.audioCall !== true) reasons.push('provider audioCall interface is not available');

    return reasons;
}

function formatTextOutputReason(requirement: TextOutputRequirement): string {
    if (requirement.structuredOutputsRequired || requirement.nativeJsonRequired) {
        return 'structured JSON output is not supported';
    }
    return formatFormatsReason('text output', requirement.formats);
}

function formatFormatsReason(label: string, formats?: string[]): string {
    return formats?.length
        ? `${label} does not support required formats: ${formats.join(', ')}`
        : `${label} is not supported`;
}

function formatOperationsReason(label: string, operations?: string[]): string {
    return operations?.length
        ? `${label} does not support required operations: ${operations.join(', ')}`
        : `${label} is not supported`;
}

function formatVideoReason(requirement: NonNullable<RequestRequirements['videoOutput']>): string {
    const details = [
        requirement.size ? `size ${requirement.size}` : undefined,
        requirement.seconds !== undefined ? `${requirement.seconds}s` : undefined,
        requirement.variant ? `variant ${requirement.variant}` : undefined
    ].filter(Boolean);
    return details.length
        ? `video output does not support required options: ${details.join(', ')}`
        : 'video output is not supported';
}

function formatEmbeddingReason(requirement: NonNullable<RequestRequirements['embeddings']>): string {
    const details = [
        requirement.dimensions !== undefined ? `dimensions ${requirement.dimensions}` : undefined,
        requirement.encodingFormat ? `encoding ${requirement.encodingFormat}` : undefined
    ].filter(Boolean);
    return details.length
        ? `embeddings do not support required options: ${details.join(', ')}`
        : 'embeddings are not supported';
}

function formatAudioApiReason(requirement: NonNullable<RequestRequirements['audioApi']>): string {
    const details = [
        requirement.operations?.length ? `operations ${requirement.operations.join(', ')}` : undefined,
        requirement.inputFormat ? `input ${requirement.inputFormat}` : undefined,
        requirement.outputFormat ? `output ${requirement.outputFormat}` : undefined,
        requirement.voice ? `voice ${requirement.voice}` : undefined
    ].filter(Boolean);
    return details.length
        ? `audio API does not support required options: ${details.join(', ')}`
        : 'audio API is not supported';
}

function formatToolReason(requirement: NonNullable<RequestRequirements['toolCalls']>): string {
    const details = [
        requirement.streaming ? 'streaming' : undefined,
        requirement.parallel ? 'parallel' : undefined
    ].filter(Boolean);
    return details.length
        ? `tool calling does not support required modes: ${details.join(', ')}`
        : 'tool calling is not supported';
}

