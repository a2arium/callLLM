import { jest } from "@jest/globals";import { ModelSelector } from '../../../../core/models/ModelSelector.js';
import { ModelInfo, ModelAlias } from '../../../../interfaces/UniversalInterfaces.js';

describe('ModelSelector', () => {
  // Test models with various characteristics
  const models: ModelInfo[] = [
  {
    name: 'cheap-model',
    inputPricePerMillion: 10,
    outputPricePerMillion: 15,
    maxRequestTokens: 1000,
    maxResponseTokens: 1000,
    characteristics: {
      qualityIndex: 75,
      outputSpeed: 120,
      firstTokenLatency: 2000
    }
  },
  {
    name: 'balanced-model',
    inputPricePerMillion: 50,
    outputPricePerMillion: 75,
    maxRequestTokens: 2000,
    maxResponseTokens: 2000,
    characteristics: {
      qualityIndex: 85,
      outputSpeed: 150,
      firstTokenLatency: 1500
    }
  },
  {
    name: 'fast-model',
    inputPricePerMillion: 100,
    outputPricePerMillion: 150,
    maxRequestTokens: 3000,
    maxResponseTokens: 3000,
    characteristics: {
      qualityIndex: 80,
      outputSpeed: 200,
      firstTokenLatency: 1000
    }
  },
  {
    name: 'premium-model',
    inputPricePerMillion: 200,
    outputPricePerMillion: 300,
    maxRequestTokens: 4000,
    maxResponseTokens: 4000,
    characteristics: {
      qualityIndex: 95,
      outputSpeed: 180,
      firstTokenLatency: 1200
    }
  }];


  describe('selectModel', () => {
    it('should select the cheapest model', () => {
      const selected = ModelSelector.selectModel(models, 'cheap');
      expect(selected).toBe('cheap-model');
    });

    it('should select the balanced model', () => {
      const selected = ModelSelector.selectModel(models, 'balanced');
      expect(selected).toBe('balanced-model');
    });

    it('should select the fastest model', () => {
      const selected = ModelSelector.selectModel(models, 'fast');
      expect(selected).toBe('fast-model');
    });

    it('should select the premium model', () => {
      const selected = ModelSelector.selectModel(models, 'premium');
      expect(selected).toBe('premium-model');
    });

    it('should throw error for unknown alias', () => {
      expect(() => ModelSelector.selectModel(models, 'unknown' as ModelAlias)).
      toThrow('Unknown model alias: unknown');
    });

    it('should throw error for empty model list', () => {
      expect(() => ModelSelector.selectModel([], 'fast')).
      toThrow('No models meet the balanced criteria');
    });
  });

  describe('edge cases', () => {
    it('should handle extremely cheap model', () => {
      const modelsWithExtremeCheap = [
      ...models,
      {
        name: 'extremely-cheap',
        inputPricePerMillion: 1,
        outputPricePerMillion: 1,
        maxRequestTokens: 1000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 60,
          outputSpeed: 100,
          firstTokenLatency: 3000
        }
      }];

      const selected = ModelSelector.selectModel(modelsWithExtremeCheap, 'cheap');
      expect(selected).toBe('extremely-cheap');
    });

    it('should handle extremely fast model', () => {
      const modelsWithExtremeFast = [
      ...models,
      {
        name: 'extremely-fast',
        inputPricePerMillion: 300,
        outputPricePerMillion: 450,
        maxRequestTokens: 1000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 75,
          outputSpeed: 500,
          firstTokenLatency: 500
        }
      }];

      const selected = ModelSelector.selectModel(modelsWithExtremeFast, 'fast');
      expect(selected).toBe('extremely-fast');
    });

    it('should handle extremely high quality model', () => {
      const modelsWithExtremeQuality = [
      ...models,
      {
        name: 'extremely-premium',
        inputPricePerMillion: 500,
        outputPricePerMillion: 750,
        maxRequestTokens: 1000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 100,
          outputSpeed: 150,
          firstTokenLatency: 2000
        }
      }];

      const selected = ModelSelector.selectModel(modelsWithExtremeQuality, 'premium');
      expect(selected).toBe('extremely-premium');
    });
  });

  describe('balanced selection', () => {
    it('should reject models with low quality for balanced selection', () => {
      const modelsWithLowQuality = models.map((m) => ({
        ...m,
        characteristics: { ...m.characteristics, qualityIndex: 60 }
      }));
      expect(() => ModelSelector.selectModel(modelsWithLowQuality, 'balanced')).
      toThrow('No models meet the balanced criteria');
    });

    it('should reject models with low speed for balanced selection', () => {
      const modelsWithLowSpeed = models.map((m) => ({
        ...m,
        characteristics: { ...m.characteristics, outputSpeed: 50 }
      }));
      expect(() => ModelSelector.selectModel(modelsWithLowSpeed, 'balanced')).
      toThrow('No models meet the balanced criteria');
    });

    it('should reject models with high latency for balanced selection', () => {
      const modelsWithHighLatency = models.map((m) => ({
        ...m,
        characteristics: { ...m.characteristics, firstTokenLatency: 30000 }
      }));
      expect(() => ModelSelector.selectModel(modelsWithHighLatency, 'balanced')).
      toThrow('No models meet the balanced criteria');
    });

    it('should select model with best balance of characteristics', () => {
      const selected = ModelSelector.selectModel(models, 'balanced');
      expect(selected).toBe('balanced-model');
    });
  });
});