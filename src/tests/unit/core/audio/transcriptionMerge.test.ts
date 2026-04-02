import { describe, it, expect } from '@jest/globals';
import { mergeTranscriptionUsages, mergeTranscriptionResponses } from '../../../../core/audio/transcriptionMerge.ts';
import type { TranscriptionResponse, Usage } from '../../../../interfaces/UniversalInterfaces.ts';

const baseUsage = (input: number, output: number, cost: number): Usage => ({
    tokens: {
        input: { total: input, cached: 0, audio: input },
        output: { total: output, reasoning: 0, audio: output },
        total: input + output
    },
    costs: {
        input: { total: cost / 2, cached: 0, audio: cost / 2 },
        output: { total: cost / 2, reasoning: 0, audio: cost / 2 },
        total: cost
    }
});

describe('transcriptionMerge', () => {
    it('mergeTranscriptionUsages sums token and cost totals', () => {
        const a = baseUsage(10, 5, 0.02);
        const b = baseUsage(20, 8, 0.04);
        const m = mergeTranscriptionUsages([a, b]);
        expect(m.tokens.input.total).toBe(30);
        expect(m.tokens.output.total).toBe(13);
        expect(m.tokens.total).toBe(43);
        expect(m.costs.total).toBeCloseTo(0.06);
        expect(m.tokens.input.audio).toBe(30);
    });

    it('mergeTranscriptionResponses joins text and sets chunk count', () => {
        const p1: TranscriptionResponse = {
            text: 'Hello.',
            language: 'en',
            duration: 1,
            usage: baseUsage(1, 1, 0.01),
            model: 'm'
        };
        const p2: TranscriptionResponse = {
            text: 'World.',
            duration: 2,
            usage: baseUsage(2, 2, 0.02),
            model: 'm'
        };
        const merged = mergeTranscriptionResponses([p1, p2], 'm');
        expect(merged.text).toBe('Hello.\n\nWorld.');
        expect(merged.language).toBe('en');
        expect(merged.duration).toBe(3);
        expect(merged.metadata?.transcriptionChunkCount).toBe(2);
    });

    it('mergeTranscriptionResponses returns single part unchanged', () => {
        const p: TranscriptionResponse = {
            text: 'Only',
            usage: baseUsage(1, 0, 0),
            model: 'm'
        };
        expect(mergeTranscriptionResponses([p], 'm')).toBe(p);
    });
});
