import {
  ModelScoringError,
  applyModelConstraints,
  getConstraintRejectionReasons,
  getOperationCost,
  normalizeMetric,
  rankCandidates,
  scoreCandidates,
  sortScoredCandidates
} from '../../../../core/models/ModelScoring.ts';
import type { ModelCandidate } from '../../../../core/models/ModelCatalog.ts';
import { normalizeModelSelection } from '../../../../core/models/ModelSelection.ts';
import type { ModelInfo } from '../../../../interfaces/UniversalInterfaces.ts';

describe('ModelScoring', () => {
  const cheap = candidate('openai', model('cheap', {
    input: 0.1,
    output: 0.2,
    quality: 60,
    speed: 100,
    latency: 300,
    context: 4000
  }));
  const balanced = candidate('gemini', model('balanced', {
    input: 1,
    output: 2,
    quality: 80,
    speed: 200,
    latency: 200,
    context: 32000
  }));
  const premium = candidate('venice', model('premium', {
    input: 4,
    output: 8,
    quality: 95,
    speed: 150,
    latency: 400,
    context: 128000
  }));

  describe('constraints', () => {
    it('accepts candidates that satisfy constraints', () => {
      const result = applyModelConstraints([cheap, balanced], {
        maxOutputPricePerMillion: 3,
        minQuality: 60,
        minContextTokens: 4000
      });

      expect(result.accepted.map(c => c.model.name)).toEqual(['cheap', 'balanced']);
      expect(result.rejected).toEqual([]);
    });

    it('rejects candidates with detailed constraint reasons', () => {
      const reasons = getConstraintRejectionReasons(premium, {
        maxOutputPricePerMillion: 5,
        minContextTokens: 200000,
        excludedModels: ['premium']
      });

      expect(reasons).toEqual([
        'model is in excludedModels',
        'outputPricePerMillion 8 exceeds maximum 5',
        'maxRequestTokens 128000 is below minimum 200000'
      ]);
    });

    it('rejects missing optional price metadata when constrained', () => {
      const noImagePrice = candidate('openai', model('image', {
        input: 1,
        output: 1,
        quality: 80,
        speed: 0,
        latency: 0,
        context: 4000
      }));

      expect(getConstraintRejectionReasons(noImagePrice, {
        maxImagePricePerImage: 0.05
      })).toEqual(['imagePricePerImage metadata is unavailable for requested constraint']);
    });

    it('enforces allowed models and uncensored defaults', () => {
      const uncensored = candidate('venice', {
        ...model('venice-uncensored', {
          input: 1,
          output: 1,
          quality: 70,
          speed: 100,
          latency: 200,
          context: 4000
        }),
        isUncensored: true
      });

      expect(getConstraintRejectionReasons(uncensored, {
        allowedModels: ['other']
      })).toContain('model is not in allowedModels: other');
      expect(getConstraintRejectionReasons(uncensored, {})).toContain('uncensored models are not allowed');
      expect(getConstraintRejectionReasons(uncensored, { allowUncensoredModels: true })).not.toContain('uncensored models are not allowed');
    });

    it('throws when no candidates remain after constraints', () => {
      const selection = normalizeModelSelection({
        constraints: { maxOutputPricePerMillion: 0.01 }
      });

      expect(selection.mode).toBe('dynamic');
      if (selection.mode === 'dynamic') {
        expect(() => rankCandidates([cheap], selection)).toThrow(ModelScoringError);
      }
    });
  });

  describe('operation cost', () => {
    it('uses default text cost blend without estimates', () => {
      expect(getOperationCost(balanced.model, 'text')).toBeCloseTo(1.6);
    });

    it('uses token-weighted text cost when estimates are available', () => {
      expect(getOperationCost(balanced.model, 'text', {
        estimatedInputTokens: 100,
        estimatedOutputTokens: 300
      })).toBeCloseTo(1.75);
    });

    it('uses media-specific cost fallbacks', () => {
      const media = model('media', {
        input: 1,
        output: 2,
        quality: 80,
        speed: 0,
        latency: 0,
        context: 4000,
        imagePrice: 0.04,
        videoPrice: 0.2,
        audioSecondPrice: 0.006,
        ttsCharPrice: 15
      });

      expect(getOperationCost(media, 'imageOutput')).toBe(0.04);
      expect(getOperationCost(media, 'video')).toBe(0.2);
      expect(getOperationCost(media, 'audioTranscribe')).toBe(0.006);
      expect(getOperationCost(media, 'audioSpeech')).toBe(15);
      expect(getOperationCost(media, 'embeddings')).toBe(1);
    });
  });

  describe('normalization and scoring', () => {
    it('normalizes higher-is-better and lower-is-better metrics', () => {
      expect(normalizeMetric(10, [10, 20], true)).toBe(0);
      expect(normalizeMetric(20, [10, 20], true)).toBe(1);
      expect(normalizeMetric(10, [10, 20], false)).toBe(1);
      expect(normalizeMetric(undefined, [10, 20], true)).toBe(0.5);
      expect(normalizeMetric(10, [10, 10], true)).toBe(1);
    });

    it('cheap preset ranks lowest-cost candidate highest for text', () => {
      const selection = normalizeModelSelection('cheap');
      expect(selection.mode).toBe('dynamic');

      if (selection.mode === 'dynamic') {
        const ranked = rankCandidates([premium, balanced, cheap], selection, {
          operation: 'text',
          providerOrder: ['openai', 'gemini', 'venice']
        });
        expect(ranked.selected.model.name).toBe('cheap');
      }
    });

    it('premium preset ranks highest quality candidate highest', () => {
      const selection = normalizeModelSelection('premium');
      expect(selection.mode).toBe('dynamic');

      if (selection.mode === 'dynamic') {
        const ranked = rankCandidates([cheap, balanced, premium], selection, {
          operation: 'text'
        });
        expect(ranked.selected.model.name).toBe('premium');
      }
    });

    it('user preference overlay affects ranking', () => {
      const selection = normalizeModelSelection({
        preset: 'premium',
        prefer: { cost: 10 }
      });
      expect(selection.mode).toBe('dynamic');

      if (selection.mode === 'dynamic') {
        const ranked = rankCandidates([cheap, premium], selection, {
          operation: 'text'
        });
        expect(ranked.selected.model.name).toBe('cheap');
      }
    });

    it('uses neutral latency and throughput for media placeholder zeros', () => {
      const fastPlaceholder = candidate('openai', model('media-a', {
        input: 1,
        output: 1,
        quality: 70,
        speed: 0,
        latency: 0,
        context: 4000,
        imagePrice: 0.02
      }));
      const slowPlaceholder = candidate('gemini', model('media-b', {
        input: 1,
        output: 1,
        quality: 90,
        speed: 0,
        latency: 0,
        context: 4000,
        imagePrice: 0.03
      }));
      const selection = normalizeModelSelection('fast');
      expect(selection.mode).toBe('dynamic');

      if (selection.mode === 'dynamic') {
        const scored = scoreCandidates([fastPlaceholder, slowPlaceholder], selection, {
          operation: 'imageOutput'
        });
        expect(scored[0].scores.latency).toBe(0.5);
        expect(scored[0].scores.throughput).toBe(0.5);
        expect(scored[1].scores.latency).toBe(0.5);
        expect(scored[1].scores.throughput).toBe(0.5);
      }
    });
  });

  describe('deterministic tie-breaking', () => {
    it('uses provider order before model name after score ties', () => {
      const a = scored(candidate('gemini', model('a-model', {
        input: 1,
        output: 1,
        quality: 80,
        speed: 100,
        latency: 100,
        context: 1000
      })));
      const b = scored(candidate('openai', model('b-model', {
        input: 1,
        output: 1,
        quality: 80,
        speed: 100,
        latency: 100,
        context: 1000
      })));

      expect(sortScoredCandidates([a, b], ['openai', 'gemini']).map(c => c.provider)).toEqual(['openai', 'gemini']);
    });

    it('uses lexicographic model name as final tie-breaker', () => {
      const z = scored(candidate('openai', model('z-model', {
        input: 1,
        output: 1,
        quality: 80,
        speed: 100,
        latency: 100,
        context: 1000
      })));
      const a = scored(candidate('openai', model('a-model', {
        input: 1,
        output: 1,
        quality: 80,
        speed: 100,
        latency: 100,
        context: 1000
      })));

      expect(sortScoredCandidates([z, a], ['openai']).map(c => c.model.name)).toEqual(['a-model', 'z-model']);
    });
  });
});

function scored(candidate: ModelCandidate) {
  return {
    ...candidate,
    totalScore: 1,
    estimatedCost: 1,
    scores: {
      cost: 1,
      latency: 1,
      throughput: 1,
      quality: 1,
      context: 1
    }
  };
}

function candidate(provider: 'openai' | 'gemini' | 'venice', model: ModelInfo): ModelCandidate {
  return { provider, model };
}

function model(name: string, options: {
  input: number;
  output: number;
  quality: number;
  speed: number;
  latency: number;
  context: number;
  imagePrice?: number;
  videoPrice?: number;
  audioSecondPrice?: number;
  ttsCharPrice?: number;
}): ModelInfo {
  return {
    name,
    inputPricePerMillion: options.input,
    outputPricePerMillion: options.output,
    imagePricePerImage: options.imagePrice,
    videoPricePerSecond: options.videoPrice,
    audioPricePerSecond: options.audioSecondPrice,
    ttsPricePerMillionChars: options.ttsCharPrice,
    maxRequestTokens: options.context,
    maxResponseTokens: Math.floor(options.context / 2),
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
      qualityIndex: options.quality,
      outputSpeed: options.speed,
      firstTokenLatency: options.latency
    }
  };
}

