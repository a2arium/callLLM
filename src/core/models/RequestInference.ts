import type {
    EmbeddingCallOptions,
    LLMCallOptions,
    SpeechCallOptions,
    TranscriptionCallOptions,
    TranslationCallOptions
} from '../../interfaces/UniversalInterfaces.ts';
import type { RequestRequirements } from './CapabilityMatcher.ts';
import type { SelectionOperation, ScoreContext } from './ModelScoring.ts';

export type ChatOperationKind = 'call' | 'stream';
export type ImageOperationRequirement = 'generate' | 'edit' | 'editWithMask' | 'composite';

export type InferredModelRequest = {
    requirements: RequestRequirements;
    operation: SelectionOperation;
    scoreContext: ScoreContext;
    imageOperation?: ImageOperationRequirement;
};

export type ToolInferenceOptions = {
    hasTools?: boolean;
    hasParallelTools?: boolean;
};

export function inferChatRequestRequirements(
    kind: ChatOperationKind,
    options: LLMCallOptions,
    toolOptions: ToolInferenceOptions = {}
): InferredModelRequest {
    const requirements: RequestRequirements = {
        textInput: true
    };

    const imageOperation = inferImageOperation(options);
    const hasImageInput = hasImageInputFiles(options);
    const hasImageOutput = Boolean(options.output?.image);
    const hasVideoOutput = Boolean(options.output?.video);

    let operation: SelectionOperation = 'text';

    if (hasVideoOutput) {
        const video = options.output?.video;
        requirements.videoOutput = {
            required: true,
            size: video?.size,
            seconds: video?.seconds,
            variant: video?.variant
        };
        requirements.providerInterfaces = {
            ...requirements.providerInterfaces,
            videoCall: true
        };
        if (hasImageInput) {
            requirements.imageInput = { required: true };
        }
        operation = 'video';
    } else if (hasImageOutput) {
        const imageRequirement = imageOperationToRequirement(imageOperation ?? 'generate');
        requirements.imageOutput = {
            required: true,
            operations: imageRequirement.operations
        };
        requirements.providerInterfaces = {
            ...requirements.providerInterfaces,
            imageCall: true
        };
        if (imageRequirement.requiresImageInput || hasImageInput) {
            requirements.imageInput = { required: true };
        }
        operation = 'imageOutput';
    } else {
        requirements.textOutput = inferTextOutputRequirement(options);
        if (hasImageInput) {
            requirements.imageInput = { required: true };
            operation = 'imageInput';
        }
    }

    if (kind === 'stream' && !hasImageOutput && !hasVideoOutput) {
        requirements.streaming = { required: true };
    }

    const hasTools = toolOptions.hasTools === true || Boolean(options.tools?.length);
    if (hasTools && !hasImageOutput && !hasVideoOutput) {
        requirements.toolCalls = {
            required: true,
            streaming: kind === 'stream',
            parallel: toolOptions.hasParallelTools
        };
        operation = 'tools';
    }

    if (options.settings?.reasoning && !hasImageOutput && !hasVideoOutput) {
        requirements.reasoning = { required: true };
        operation = 'reasoning';
    }

    if (options.settings?.maxTokens !== undefined) {
        requirements.tokenBudget = {
            ...requirements.tokenBudget,
            requestedOutputTokens: options.settings.maxTokens
        };
    }

    return {
        requirements,
        operation,
        scoreContext: {
            operation
        },
        ...(imageOperation ? { imageOperation } : {})
    };
}

export function inferEmbeddingRequestRequirements(options: EmbeddingCallOptions): InferredModelRequest {
    const requirements: RequestRequirements = {
        textInput: true,
        embeddings: {
            required: true,
            dimensions: options.dimensions,
            encodingFormat: options.encodingFormat
        },
        providerInterfaces: {
            embeddingCall: true
        }
    };

    return {
        requirements,
        operation: 'embeddings',
        scoreContext: { operation: 'embeddings' }
    };
}

export function inferTranscriptionRequestRequirements(options: TranscriptionCallOptions): InferredModelRequest {
    const inputFormat = inferFileExtension(options.file);
    const requirements: RequestRequirements = {
        audioApi: {
            required: true,
            operations: ['transcribe'],
            inputFormat
        },
        providerInterfaces: {
            audioCall: true
        }
    };

    return {
        requirements,
        operation: 'audioTranscribe',
        scoreContext: { operation: 'audioTranscribe' }
    };
}

export function inferTranslationRequestRequirements(options: TranslationCallOptions): InferredModelRequest {
    const inputFormat = inferFileExtension(options.file);
    const requirements: RequestRequirements = {
        audioApi: {
            required: true,
            operations: ['translate'],
            inputFormat
        },
        providerInterfaces: {
            audioCall: true
        }
    };

    return {
        requirements,
        operation: 'audioTranslate',
        scoreContext: { operation: 'audioTranslate' }
    };
}

export function inferSpeechRequestRequirements(options: SpeechCallOptions): InferredModelRequest {
    const requirements: RequestRequirements = {
        audioApi: {
            required: true,
            operations: ['synthesize']
        },
        providerInterfaces: {
            audioCall: true
        }
    };

    return {
        requirements,
        operation: 'audioSpeech',
        scoreContext: { operation: 'audioSpeech' }
    };
}

export function inferImageOperation(options: LLMCallOptions): ImageOperationRequirement | undefined {
    if (!options.output?.image) return undefined;
    if (options.mask) return 'editWithMask';
    if (options.files && options.files.length > 1) return 'composite';
    if (options.file || (options.files && options.files.length === 1)) return 'edit';
    return 'generate';
}

function inferTextOutputRequirement(options: LLMCallOptions): RequestRequirements['textOutput'] {
    const jsonRequested = options.responseFormat === 'json' || options.jsonSchema !== undefined;
    const jsonMode = options.settings?.jsonMode ?? 'fallback';

    if (!jsonRequested || jsonMode === 'force-prompt') {
        return {
            required: true,
            formats: ['text']
        };
    }

    if (jsonMode === 'native-only') {
        return {
            required: true,
            formats: ['json'],
            nativeJsonRequired: true,
            structuredOutputsRequired: Boolean(options.jsonSchema)
        };
    }

    return {
        required: true,
        formats: ['text']
    };
}

function imageOperationToRequirement(operation: ImageOperationRequirement): {
    operations: ('generate' | 'edit' | 'editWithMask')[];
    requiresImageInput: boolean;
} {
    if (operation === 'generate') {
        return { operations: ['generate'], requiresImageInput: false };
    }
    if (operation === 'editWithMask') {
        return { operations: ['editWithMask'], requiresImageInput: true };
    }
    return { operations: ['edit'], requiresImageInput: true };
}

function hasImageInputFiles(options: LLMCallOptions): boolean {
    return Boolean(options.file || options.mask || (options.files && options.files.length > 0));
}

function inferFileExtension(file: string | undefined): string | undefined {
    if (!file) return undefined;
    const withoutQuery = file.split(/[?#]/)[0];
    const lastSegment = withoutQuery.split('/').pop();
    const extension = lastSegment?.includes('.') ? lastSegment.split('.').pop() : undefined;
    return extension?.trim().toLowerCase() || undefined;
}
