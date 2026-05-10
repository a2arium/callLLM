import {
  AmbiguousModelError,
  ModelCatalog,
  ModelNotFoundError,
  loadModelCandidates,
  normalizeProviderScope,
  resolveExactModel,
  type ProviderModelCatalogs
} from '../../../../core/models/ModelCatalog.ts';
import { ModelSelectionConfigError } from '../../../../core/models/ModelSelection.ts';
import type { ModelInfo } from '../../../../interfaces/UniversalInterfaces.ts';

describe('ModelCatalog', () => {
  const catalogs: ProviderModelCatalogs = {
    openai: [
      model('shared-model', 90),
      model('openai-only', 80)
    ],
    gemini: [
      model('shared-model', 85),
      model('gemini-only', 75)
    ],
    venice: [
      model('venice-only', 70)
    ]
  };

  describe('normalizeProviderScope', () => {
    it('normalizes a single provider', () => {
      expect(normalizeProviderScope('openai', catalogs)).toEqual(['openai']);
    });

    it('preserves provider order and removes duplicates', () => {
      expect(normalizeProviderScope(['gemini', 'openai', 'gemini'], catalogs)).toEqual(['gemini', 'openai']);
    });

    it('rejects empty provider arrays', () => {
      expect(() => normalizeProviderScope([], catalogs)).toThrow(ModelSelectionConfigError);
      expect(() => normalizeProviderScope([], catalogs)).toThrow('Provider scope cannot be empty');
    });

    it('rejects blank provider names', () => {
      expect(() => normalizeProviderScope(['openai', '' as any], catalogs)).toThrow('Provider scope must contain only non-empty provider names');
    });

    it('rejects providers outside the catalog source', () => {
      expect(() => normalizeProviderScope('cerebras', catalogs)).toThrow('Provider "cerebras" is not registered in the model catalog');
    });
  });

  describe('loadModelCandidates', () => {
    it('loads provider-qualified candidates in provider order', () => {
      const candidates = loadModelCandidates(['gemini', 'openai'], catalogs);

      expect(candidates.map(candidate => `${candidate.provider}/${candidate.model.name}`)).toEqual([
        'gemini/shared-model',
        'gemini/gemini-only',
        'openai/shared-model',
        'openai/openai-only'
      ]);
    });

    it('preserves model object identity for downstream metadata access', () => {
      const candidates = loadModelCandidates('openai', catalogs);

      expect(candidates[0].model).toBe(catalogs.openai![0]);
    });
  });

  describe('resolveExactModel', () => {
    it('resolves an exact model in a single-provider scope', () => {
      const resolved = resolveExactModel('openai', { model: 'openai-only' }, catalogs);

      expect(resolved.provider).toBe('openai');
      expect(resolved.model.name).toBe('openai-only');
    });

    it('resolves an exact model in multi-provider scope when unique', () => {
      const resolved = resolveExactModel(['openai', 'gemini'], { model: 'gemini-only' }, catalogs);

      expect(resolved.provider).toBe('gemini');
      expect(resolved.model.name).toBe('gemini-only');
    });

    it('resolves provider-qualified exact models even when model names are shared', () => {
      const resolved = resolveExactModel(['openai', 'gemini'], {
        provider: 'gemini',
        model: 'shared-model'
      }, catalogs);

      expect(resolved.provider).toBe('gemini');
      expect(resolved.model.characteristics.qualityIndex).toBe(85);
    });

    it('throws ModelNotFoundError when no scoped provider contains the model', () => {
      expect(() => resolveExactModel(['openai', 'gemini'], { model: 'missing-model' }, catalogs)).toThrow(ModelNotFoundError);
      expect(() => resolveExactModel(['openai', 'gemini'], { model: 'missing-model' }, catalogs)).toThrow('Model "missing-model" not found in provider scope: openai, gemini');
    });

    it('throws ModelNotFoundError when a provider-qualified model is missing from that provider', () => {
      expect(() => resolveExactModel(['openai', 'gemini'], {
        provider: 'openai',
        model: 'gemini-only'
      }, catalogs)).toThrow(ModelNotFoundError);
    });

    it('throws AmbiguousModelError when a model is present in multiple scoped providers', () => {
      expect(() => resolveExactModel(['openai', 'gemini'], { model: 'shared-model' }, catalogs)).toThrow(AmbiguousModelError);
      expect(() => resolveExactModel(['openai', 'gemini'], { model: 'shared-model' }, catalogs)).toThrow('Use { provider, model }');
    });

    it('does not consider providers outside the constructor scope for ambiguity', () => {
      const resolved = resolveExactModel(['openai', 'venice'], { model: 'shared-model' }, catalogs);

      expect(resolved.provider).toBe('openai');
    });

    it('rejects provider-qualified exact model when provider is outside scope', () => {
      expect(() => resolveExactModel(['openai'], {
        provider: 'gemini',
        model: 'gemini-only'
      }, catalogs)).toThrow('Provider "gemini" is outside the constructor provider scope: openai');
    });

    it('rejects empty exact model names', () => {
      expect(() => resolveExactModel('openai', { model: '' }, catalogs)).toThrow('Exact model selection requires a non-empty model string');
    });
  });

  describe('ModelCatalog class', () => {
    it('exposes normalized provider scope', () => {
      const catalog = new ModelCatalog(['gemini', 'openai', 'gemini'], catalogs);

      expect(catalog.getProviderScope()).toEqual(['gemini', 'openai']);
    });

    it('exposes provider-qualified candidates', () => {
      const catalog = new ModelCatalog(['openai', 'venice'], catalogs);

      expect(catalog.getCandidates().map(candidate => `${candidate.provider}/${candidate.model.name}`)).toEqual([
        'openai/shared-model',
        'openai/openai-only',
        'venice/venice-only'
      ]);
    });

    it('resolves exact models through the instance provider scope', () => {
      const catalog = new ModelCatalog(['openai', 'gemini'], catalogs);

      expect(catalog.resolveExactModel({ provider: 'openai', model: 'shared-model' }).provider).toBe('openai');
    });

    it('rejects getProviderModels for providers outside scope', () => {
      const catalog = new ModelCatalog('openai', catalogs);

      expect(() => catalog.getProviderModels('gemini')).toThrow('Provider "gemini" is outside the constructor provider scope: openai');
    });
  });
});

function model(name: string, qualityIndex: number): ModelInfo {
  return {
    name,
    inputPricePerMillion: 1,
    outputPricePerMillion: 2,
    maxRequestTokens: 1000,
    maxResponseTokens: 500,
    capabilities: {
      streaming: true,
      toolCalls: false,
      parallelToolCalls: false,
      batchProcessing: false,
      reasoning: false,
      input: { text: true },
      output: { text: { textOutputFormats: ['text'] } }
    },
    characteristics: {
      qualityIndex,
      outputSpeed: 100,
      firstTokenLatency: 1000
    }
  };
}

