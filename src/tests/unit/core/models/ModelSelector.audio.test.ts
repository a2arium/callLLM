import { describe, it, expect } from '@jest/globals';
import { ModelSelector } from '../../../../core/models/ModelSelector.ts';
import type { ModelCapabilities } from '../../../../interfaces/UniversalInterfaces.ts';

const baseCap = (over: Partial<ModelCapabilities>): ModelCapabilities => ({
    input: { text: true },
    output: { text: true },
    ...over
});

describe('ModelSelector.supportsAudio', () => {
    it('returns false when no audio capability', () => {
        const c = baseCap({});
        expect(ModelSelector.supportsAudio(c)).toBe(false);
    });

    it('returns true for boolean audio', () => {
        expect(ModelSelector.supportsAudio(baseCap({ audio: true }))).toBe(true);
    });

    it('returns true when object has any op and no operations filter', () => {
        const c = baseCap({
            audio: { transcribe: true }
        });
        expect(ModelSelector.supportsAudio(c)).toBe(true);
    });

    it('requires specific operations when provided', () => {
        const c = baseCap({
            audio: { transcribe: true, synthesize: false }
        });
        expect(ModelSelector.supportsAudio(c, { operations: ['transcribe'] })).toBe(true);
        expect(ModelSelector.supportsAudio(c, { operations: ['synthesize'] })).toBe(false);
    });

    it('meetsRequirements with audio requirement', () => {
        const model = {
            name: 'whisper-1',
            inputPricePerMillion: 0,
            outputPricePerMillion: 0,
            maxRequestTokens: 0,
            maxResponseTokens: 0,
            characteristics: { qualityIndex: 0, outputSpeed: 0, firstTokenLatency: 0 },
            capabilities: baseCap({
                audio: { transcribe: true, translate: true }
            })
        };
        expect(ModelSelector.meetsRequirements(model, {
            audio: { required: true, operations: ['translate'] }
        })).toBe(true);
        expect(ModelSelector.meetsRequirements(model, {
            audio: { required: true, operations: ['synthesize'] }
        })).toBe(false);
    });
});
