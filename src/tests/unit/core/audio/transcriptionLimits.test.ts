import { describe, it, expect } from '@jest/globals';
import {
    OPENAI_TRANSCRIPTION_DOC_MAX_FILE_BYTES,
    TRANSCRIPTION_DURATION_SAFE_RATIO,
    TRANSCRIPTION_FILE_SAFE_RATIO,
    DEFAULT_SPLIT_CHUNK_SECONDS,
    resolveTranscriptionSplitThresholds,
    resolveSplitChunkSeconds
} from '../../../../core/audio/transcriptionLimits.ts';
import type { ModelInfo } from '../../../../interfaces/UniversalInterfaces.ts';

describe('transcriptionLimits', () => {
    it('resolveTranscriptionSplitThresholds uses OpenAI-style defaults when model omits fields', () => {
        const t = resolveTranscriptionSplitThresholds(undefined);
        expect(t.maxFileBytesForSplit).toBe(
            Math.max(1, Math.floor(OPENAI_TRANSCRIPTION_DOC_MAX_FILE_BYTES * TRANSCRIPTION_FILE_SAFE_RATIO))
        );
        expect(t.maxDurationSecondsForSplit).toBeNull();
        expect(t.maxChunkSecondsFromDuration).toBeNull();
    });

    it('applies byte and duration caps from ModelInfo', () => {
        const model: ModelInfo = {
            name: 'x',
            inputPricePerMillion: 0,
            outputPricePerMillion: 0,
            maxRequestTokens: 0,
            maxResponseTokens: 0,
            transcriptionMaxFileBytes: 100,
            transcriptionMaxDurationSeconds: 100,
            characteristics: { qualityIndex: 0, outputSpeed: 0, firstTokenLatency: 0 }
        };
        const t = resolveTranscriptionSplitThresholds(model);
        expect(t.maxFileBytesForSplit).toBe(Math.floor(100 * TRANSCRIPTION_FILE_SAFE_RATIO));
        expect(t.maxDurationSecondsForSplit).toBe(Math.floor(100 * TRANSCRIPTION_DURATION_SAFE_RATIO));
        expect(t.maxChunkSecondsFromDuration).toBe(
            Math.min(DEFAULT_SPLIT_CHUNK_SECONDS, t.maxDurationSecondsForSplit as number)
        );
    });

    it('resolveSplitChunkSeconds caps user value when model enforces duration', () => {
        const thresholds = resolveTranscriptionSplitThresholds({
            name: 'x',
            inputPricePerMillion: 0,
            outputPricePerMillion: 0,
            maxRequestTokens: 0,
            maxResponseTokens: 0,
            transcriptionMaxDurationSeconds: 120,
            characteristics: { qualityIndex: 0, outputSpeed: 0, firstTokenLatency: 0 }
        });
        const cap = thresholds.maxChunkSecondsFromDuration;
        expect(cap).not.toBeNull();
        expect(resolveSplitChunkSeconds(9999, thresholds)).toBe(cap);
        expect(resolveSplitChunkSeconds(undefined, thresholds)).toBe(cap);
    });

    it('resolveSplitChunkSeconds uses user value when no duration cap', () => {
        const thresholds = resolveTranscriptionSplitThresholds(undefined);
        expect(resolveSplitChunkSeconds(42, thresholds)).toBe(42);
    });
});
