import type {
    FinishReason,
    OutputTextProvenance,
    RetryAttemptEvent,
    UniversalChatResponse,
    Usage
} from '../../interfaces/UniversalInterfaces.ts';

/**
 * Stable machine-readable reasons for structured-output / JSON-schema failures.
 * Callers (e.g. CallAgent) should branch on `reason`, not message text.
 */
export type StructuredOutputFailureReason =
    | 'refusal'
    | 'max_output_tokens'
    | 'empty'
    | 'non_json'
    | 'json_parse'
    | 'schema_validation'
    | 'multiple_structured_outputs';

export type StructuredOutputValidationError = {
    message: string;
    path: (string | number)[];
};

export type StructuredOutputErrorOptions = {
    reason: StructuredOutputFailureReason;
    message?: string;
    /** Converted response at the point of failure (content may be bounded). */
    response?: UniversalChatResponse;
    validationErrors?: StructuredOutputValidationError[];
    cause?: unknown;
    /** Max characters of raw content retained on the error (default 4096). */
    maxRawContentLength?: number;
    retryHistory?: RetryAttemptEvent[];
    /** Bounded native multi-item text summary when reason is multiple_structured_outputs. */
    outputTextProvenance?: OutputTextProvenance;
};

const DEFAULT_MESSAGES: Record<StructuredOutputFailureReason, string> = {
    refusal: 'Structured output failed: model refused to produce content',
    max_output_tokens: 'Structured output failed: response incomplete due to max_output_tokens',
    empty: 'Structured output failed: empty response content',
    non_json: 'Failed to parse JSON response: Invalid JSON structure',
    json_parse: 'Failed to parse JSON response: Invalid JSON structure',
    schema_validation: 'Failed to validate response',
    multiple_structured_outputs: 'Structured output failed: more than one native output_text item'
};

/**
 * Typed failure for JSON / schema structured-output paths.
 * Preserves provider provenance (status, finish reason, usage, refusal, model)
 * so paid responses remain accountable when validation fails.
 */
export class StructuredOutputError extends Error {
    public readonly name = 'StructuredOutputError';
    public readonly code = 'STRUCTURED_OUTPUT_ERROR' as const;
    public readonly reason: StructuredOutputFailureReason;
    public readonly response?: UniversalChatResponse;
    public readonly validationErrors?: StructuredOutputValidationError[];
    public readonly rawContent?: string | null;
    public readonly nativeStatus?: string;
    public readonly incompleteReason?: string;
    public readonly finishReason?: FinishReason;
    public readonly model?: string;
    public readonly usage?: Usage;
    public readonly refusal?: unknown;
    public readonly outputTextProvenance?: OutputTextProvenance;
    public readonly retryHistory: RetryAttemptEvent[];
    public readonly cause?: unknown;

    constructor(options: StructuredOutputErrorOptions) {
        const message = options.message ?? DEFAULT_MESSAGES[options.reason];
        super(message);
        this.reason = options.reason;
        this.validationErrors = options.validationErrors;
        this.cause = options.cause;
        this.retryHistory = options.retryHistory ?? [];

        const maxLen = options.maxRawContentLength ?? 4096;
        const response = options.response
            ? StructuredOutputError.boundResponse(options.response, maxLen)
            : undefined;
        this.response = response;

        const meta = response?.metadata;
        this.rawContent = response?.content ?? null;
        this.nativeStatus = typeof meta?.providerStatus === 'string' ? meta.providerStatus : undefined;
        this.incompleteReason = typeof meta?.incompleteReason === 'string' ? meta.incompleteReason : undefined;
        this.finishReason = meta?.finishReason;
        this.model = meta?.model;
        this.usage = meta?.usage;
        this.refusal = meta?.refusal;
        this.outputTextProvenance = options.outputTextProvenance ?? meta?.outputTextProvenance;

        Object.setPrototypeOf(this, new.target.prototype);
    }

    /**
     * Re-wrap with a new message (e.g. RetryManager terminal wrap) while
     * preserving classification fields and chaining the prior instance as cause.
     */
    withMessage(message: string, retryHistory?: RetryAttemptEvent[]): StructuredOutputError {
        return new StructuredOutputError({
            reason: this.reason,
            message,
            response: this.response,
            validationErrors: this.validationErrors,
            cause: this,
            retryHistory: retryHistory ?? this.retryHistory,
            outputTextProvenance: this.outputTextProvenance
        });
    }

    /** Serializable projection for stream soft-failure metadata. */
    toMetadataFields(): {
        structuredOutputReason: StructuredOutputFailureReason;
        validationErrors?: StructuredOutputValidationError[];
        providerStatus?: string;
        incompleteReason?: string;
        finishReason?: FinishReason;
        model?: string;
        usage?: Usage;
        refusal?: unknown;
        originalContent?: string | null;
        outputTextProvenance?: OutputTextProvenance;
    } {
        return {
            structuredOutputReason: this.reason,
            validationErrors: this.validationErrors,
            providerStatus: this.nativeStatus,
            incompleteReason: this.incompleteReason,
            finishReason: this.finishReason,
            model: this.model,
            usage: this.usage,
            refusal: this.refusal,
            originalContent: this.rawContent,
            outputTextProvenance: this.outputTextProvenance
        };
    }

    private static boundResponse(
        response: UniversalChatResponse,
        maxLen: number
    ): UniversalChatResponse {
        const content = response.content;
        if (typeof content !== 'string' || content.length <= maxLen) {
            return response;
        }
        return {
            ...response,
            content: `${content.slice(0, maxLen)}…[truncated ${content.length - maxLen} chars]`
        };
    }
}

export function isStructuredOutputError(error: unknown): error is StructuredOutputError {
    return error instanceof StructuredOutputError;
}
