import type { ModelInfo } from '../../interfaces/UniversalInterfaces.ts';

/** OpenAI documented max upload for `audio/transcriptions` (25 MiB). */
export const OPENAI_TRANSCRIPTION_DOC_MAX_FILE_BYTES = 25 * 1024 * 1024;

/** Margin below provider file cap before we treat the file as “too large” for one request. */
export const TRANSCRIPTION_FILE_SAFE_RATIO = 0.96;

/** Margin below provider duration cap (when defined) for split detection and chunk sizing. */
export const TRANSCRIPTION_DURATION_SAFE_RATIO = 0.92;

export const DEFAULT_SPLIT_CHUNK_SECONDS = 600;

export type TranscriptionSplitThresholds = {
    /** Compare `stat.size` to this; split if larger */
    maxFileBytesForSplit: number;
    /** If set, compare ffprobe duration to this; split if longer */
    maxDurationSecondsForSplit: number | null;
    /**
     * Max seconds per output segment when the model has a duration cap (never above this).
     * `null` when only file size is enforced (e.g. whisper-1); then segment length follows `splitChunkSeconds` only.
     */
    maxChunkSecondsFromDuration: number | null;
};

/**
 * Derives split thresholds from {@link ModelInfo} (provider limits). Falls back to OpenAI-style defaults.
 */
export function resolveTranscriptionSplitThresholds(model: ModelInfo | undefined): TranscriptionSplitThresholds {
    const rawFileBytes = model?.transcriptionMaxFileBytes ?? OPENAI_TRANSCRIPTION_DOC_MAX_FILE_BYTES;
    const maxFileBytesForSplit = Math.max(1, Math.floor(rawFileBytes * TRANSCRIPTION_FILE_SAFE_RATIO));

    const rawDuration = model?.transcriptionMaxDurationSeconds;
    const maxDurationSecondsForSplit =
        rawDuration !== undefined && rawDuration !== null && Number.isFinite(rawDuration) && rawDuration > 0
            ? Math.max(1, Math.floor(rawDuration * TRANSCRIPTION_DURATION_SAFE_RATIO))
            : null;

    /** Upper bound on one segment’s duration when the model enforces a max request duration; null if not enforced. */
    const maxChunkSecondsFromDuration =
        maxDurationSecondsForSplit !== null
            ? Math.min(DEFAULT_SPLIT_CHUNK_SECONDS, maxDurationSecondsForSplit)
            : null;

    return {
        maxFileBytesForSplit,
        maxDurationSecondsForSplit,
        maxChunkSecondsFromDuration
    };
}

/**
 * Effective segment length: user override capped by model duration limit (when any).
 */
export function resolveSplitChunkSeconds(
    userSeconds: number | undefined,
    thresholds: TranscriptionSplitThresholds
): number {
    const requested = userSeconds ?? DEFAULT_SPLIT_CHUNK_SECONDS;
    const cap = thresholds.maxChunkSecondsFromDuration;
    if (cap === null) {
        return Math.max(1, requested);
    }
    return Math.max(1, Math.min(requested, cap));
}
