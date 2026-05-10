import {
  ModelSelectionConfigError,
  normalizeModelSelection,
  isModelPreset
} from '../../../../core/models/ModelSelection.ts';

describe('ModelSelection', () => {
  describe('isModelPreset', () => {
    it('recognizes built-in presets', () => {
      expect(isModelPreset('cheap')).toBe(true);
      expect(isModelPreset('fast')).toBe(true);
      expect(isModelPreset('balanced')).toBe(true);
      expect(isModelPreset('premium')).toBe(true);
    });

    it('rejects non-presets', () => {
      expect(isModelPreset('gpt-5-mini')).toBe(false);
      expect(isModelPreset('')).toBe(false);
    });
  });

  describe('string normalization', () => {
    it('normalizes preset strings to dynamic selections', () => {
      const normalized = normalizeModelSelection('fast');

      expect(normalized.mode).toBe('dynamic');
      if (normalized.mode === 'dynamic') {
        expect(normalized.preset).toBe('fast');
        expect(normalized.constraints).toEqual({});
        expect(normalized.resolution).toEqual({ explain: false });
        expect(sumWeights(normalized.prefer)).toBeCloseTo(1);
        expect(normalized.prefer.latency).toBeGreaterThan(normalized.prefer.cost);
      }
    });

    it('normalizes non-preset strings to exact selections', () => {
      expect(normalizeModelSelection('gpt-5-mini')).toEqual({
        mode: 'exact',
        model: 'gpt-5-mini'
      });
    });

    it('rejects empty strings', () => {
      expect(() => normalizeModelSelection('')).toThrow(ModelSelectionConfigError);
      expect(() => normalizeModelSelection('   ')).toThrow('Model selection string cannot be empty');
    });
  });

  describe('exact object normalization', () => {
    it('normalizes exact model objects', () => {
      expect(normalizeModelSelection({ model: 'gpt-5-mini' })).toEqual({
        mode: 'exact',
        model: 'gpt-5-mini'
      });
    });

    it('normalizes exact model objects with provider', () => {
      expect(normalizeModelSelection({ provider: 'openai', model: 'gpt-5-mini' })).toEqual({
        mode: 'exact',
        provider: 'openai',
        model: 'gpt-5-mini'
      });
    });

    it('treats preset names in { model } as exact model names', () => {
      expect(normalizeModelSelection({ model: 'fast' })).toEqual({
        mode: 'exact',
        model: 'fast'
      });
    });

    it('rejects malformed exact model objects', () => {
      expect(() => normalizeModelSelection({ model: '' })).toThrow(ModelSelectionConfigError);
      expect(() => normalizeModelSelection({ model: 'gpt-5-mini', preset: 'fast' } as any)).toThrow('Unknown exact model selection property: preset');
      expect(() => normalizeModelSelection({ model: 'gpt-5-mini', provider: '' } as any)).toThrow('provider must be a non-empty provider string');
    });
  });

  describe('dynamic object normalization', () => {
    it('rejects empty objects', () => {
      expect(() => normalizeModelSelection({})).toThrow(ModelSelectionConfigError);
      expect(() => normalizeModelSelection({})).toThrow('Model selection object cannot be empty');
    });

    it('normalizes explicit preset objects', () => {
      const normalized = normalizeModelSelection({ preset: 'balanced' });

      expect(normalized.mode).toBe('dynamic');
      if (normalized.mode === 'dynamic') {
        expect(normalized.preset).toBe('balanced');
        expect(sumWeights(normalized.prefer)).toBeCloseTo(1);
        expect(normalized.prefer.quality).toBeGreaterThan(normalized.prefer.cost);
      }
    });

    it('defaults { prefer } to balanced with preference overlay', () => {
      const normalized = normalizeModelSelection({ prefer: { cost: 0.7 } });

      expect(normalized.mode).toBe('dynamic');
      if (normalized.mode === 'dynamic') {
        expect(normalized.preset).toBe('balanced');
        expect(sumWeights(normalized.prefer)).toBeCloseTo(1);
        expect(normalized.prefer.cost).toBeGreaterThan(normalized.prefer.quality);
      }
    });

    it('defaults { constraints } to balanced', () => {
      const normalized = normalizeModelSelection({
        constraints: {
          maxOutputPricePerMillion: 5,
          allowedModels: ['gpt-5-mini'],
          allowUncensoredModels: true
        }
      });

      expect(normalized.mode).toBe('dynamic');
      if (normalized.mode === 'dynamic') {
        expect(normalized.preset).toBe('balanced');
        expect(normalized.constraints).toEqual({
          maxOutputPricePerMillion: 5,
          allowedModels: ['gpt-5-mini'],
          allowUncensoredModels: true
        });
      }
    });

    it('normalizes resolution options', () => {
      const normalized = normalizeModelSelection({
        preset: 'premium',
        resolution: { explain: true }
      });

      expect(normalized.mode).toBe('dynamic');
      if (normalized.mode === 'dynamic') {
        expect(normalized.resolution).toEqual({ explain: true });
      }
    });
  });

  describe('dynamic object validation', () => {
    it('rejects malformed preferences', () => {
      expect(() => normalizeModelSelection({ prefer: {} })).toThrow('prefer cannot be empty');
      expect(() => normalizeModelSelection({ prefer: { creativity: 1 } as any })).toThrow('Unknown model preference dimension: creativity');
      expect(() => normalizeModelSelection({ prefer: { cost: -1 } })).toThrow('cost');
      expect(() => normalizeModelSelection({ prefer: { cost: Number.NaN } })).toThrow('cost');
      expect(() => normalizeModelSelection({ prefer: { cost: 0, quality: 0 } })).toThrow('At least one model preference weight');
    });

    it('rejects malformed constraints', () => {
      expect(() => normalizeModelSelection({ constraints: {} })).toThrow('constraints cannot be empty');
      expect(() => normalizeModelSelection({ constraints: { maxOutputPricePerMillion: -1 } })).toThrow('maxOutputPricePerMillion');
      expect(() => normalizeModelSelection({ constraints: { allowedModels: [] } })).toThrow('allowedModels');
      expect(() => normalizeModelSelection({ constraints: { allowedModels: [''] } })).toThrow('allowedModels');
      expect(() => normalizeModelSelection({ constraints: { allowPreviewModels: 'yes' } as any })).toThrow('allowPreviewModels');
      expect(() => normalizeModelSelection({ constraints: { unknown: true } as any })).toThrow('Unknown model selection constraints property: unknown');
    });

    it('rejects provider constraints in v1', () => {
      expect(() => normalizeModelSelection({ constraints: { allowedProviders: ['openai'] } as any })).toThrow('Provider constraint "allowedProviders" is not supported in v1');
      expect(() => normalizeModelSelection({ constraints: { excludedProviders: ['gemini'] } as any })).toThrow('Provider constraint "excludedProviders" is not supported in v1');
      expect(() => normalizeModelSelection({ constraints: { onlyProviders: ['openai'] } as any })).toThrow('Provider constraint "onlyProviders" is not supported in v1');
      expect(() => normalizeModelSelection({ constraints: { excludeProviders: ['gemini'] } as any })).toThrow('Provider constraint "excludeProviders" is not supported in v1');
    });

    it('rejects malformed resolution options', () => {
      expect(() => normalizeModelSelection({ resolution: {} })).toThrow('resolution cannot be empty');
      expect(() => normalizeModelSelection({ resolution: { explain: 'yes' } as any })).toThrow('resolution.explain must be a boolean');
      expect(() => normalizeModelSelection({ resolution: { deterministic: true } as any })).toThrow('Unknown model selection resolution property: deterministic');
    });

    it('rejects unknown dynamic properties', () => {
      expect(() => normalizeModelSelection({ preset: 'fast', modelName: 'x' } as any)).toThrow('Unknown dynamic model selection property: modelName');
    });

    it('rejects unknown presets', () => {
      expect(() => normalizeModelSelection({ preset: 'smart' } as any)).toThrow('Unknown model selection preset: smart');
    });
  });
});

function sumWeights(weights: Record<string, number>): number {
  return Object.values(weights).reduce((sum, value) => sum + value, 0);
}

