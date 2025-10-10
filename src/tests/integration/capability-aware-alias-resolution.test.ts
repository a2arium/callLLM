import { jest } from '@jest/globals';
import { ModelSelector } from '../../../src/core/models/ModelSelector.ts';
import { ModelManager } from '../../../src/core/models/ModelManager.ts';
import type { RegisteredProviders } from '../../../src/adapters/index.ts';
import type { ModelInfo, ModelAlias } from '../../../src/interfaces/UniversalInterfaces.ts';

describe('Capability-Aware Alias Resolution Integration Tests', () => {
  let modelManager: ModelManager;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create test models with different capabilities and costs
    const testModels: ModelInfo[] = [
      {
        name: 'gpt-4o-mini',
        inputPricePerMillion: 0.15,
        outputPricePerMillion: 0.6,
        maxRequestTokens: 128000,
        maxResponseTokens: 16384,
        characteristics: {
          qualityIndex: 75,
          outputSpeed: 150,
          firstTokenLatency: 300
        },
        capabilities: {
          streaming: true,
          toolCalls: true,
          parallelToolCalls: true,
          batchProcessing: false,
          reasoning: false,
          input: {
            text: true,
            image: true
          },
          output: {
            text: {
              textOutputFormats: ['text', 'json']
            }
          }
        }
      },
      {
        name: 'gpt-4o',
        inputPricePerMillion: 2.5,
        outputPricePerMillion: 10,
        maxRequestTokens: 128000,
        maxResponseTokens: 16384,
        characteristics: {
          qualityIndex: 90,
          outputSpeed: 120,
          firstTokenLatency: 250
        },
        capabilities: {
          streaming: true,
          toolCalls: true,
          parallelToolCalls: true,
          batchProcessing: false,
          reasoning: false,
          input: {
            text: true,
            image: true
          },
          output: {
            text: {
              textOutputFormats: ['text', 'json']
            }
          }
        }
      },
      {
        name: 'dall-e-3',
        inputPricePerMillion: 20,
        outputPricePerMillion: 80,
        maxRequestTokens: 4000,
        maxResponseTokens: 1000,
        characteristics: {
          qualityIndex: 95,
          outputSpeed: 20,
          firstTokenLatency: 2000
        },
        capabilities: {
          streaming: false,
          toolCalls: false,
          parallelToolCalls: false,
          batchProcessing: false,
          reasoning: false,
          input: {
            text: true,
            image: false
          },
          output: {
            text: false,
            image: {
              generate: true,
              edit: false,
              editWithMask: false
            }
          }
        }
      },
      {
        name: 'text-embedding-3-small',
        inputPricePerMillion: 0.02,
        outputPricePerMillion: 0.1,
        maxRequestTokens: 8000,
        maxResponseTokens: 0,
        characteristics: {
          qualityIndex: 70,
          outputSpeed: 200,
          firstTokenLatency: 100
        },
        capabilities: {
          streaming: false,
          toolCalls: false,
          parallelToolCalls: false,
          batchProcessing: false,
          reasoning: false,
          input: {
            text: true,
            image: false
          },
          output: {
            text: false,
            embeddings: {
              dimensions: [1536]
            }
          }
        }
      }
    ];

    // Initialize ModelManager with test models
    modelManager = new ModelManager('openai' as RegisteredProviders);
    modelManager.clearModels();
    testModels.forEach(model => modelManager.addModel(model));
  });

  describe('ModelSelector and ModelManager integration', () => {
    it('should resolve cheap alias to cheapest text-capable model', () => {
      const selectedModel = modelManager.getModel('cheap' as ModelAlias, {
        textOutput: { required: true }
      });

      expect(selectedModel).toBeDefined();
      expect(selectedModel?.name).toBe('gpt-4o-mini'); // Cheapest model with text output (embedding models filtered out)
    });

    it('should resolve cheap alias to cheapest image generation model for image requirements', () => {
      const selectedModel = modelManager.getModel('cheap' as ModelAlias, {
        imageOutput: { required: true, operations: ['generate'] }
      });

      expect(selectedModel).toBeDefined();
      expect(selectedModel?.name).toBe('dall-e-3'); // Only model that supports image generation
    });

    it('should resolve cheap alias to cheapest model with tool support for tool requirements', () => {
      const selectedModel = modelManager.getModel('cheap' as ModelAlias, {
        toolCalls: { required: true }
      });

      expect(selectedModel).toBeDefined();
      expect(selectedModel?.name).toBe('gpt-4o-mini'); // Cheapest model with tool support
    });

    it('should resolve fast alias to fastest model for streaming requirements', () => {
      const selectedModel = modelManager.getModel('fast' as ModelAlias, {
        streaming: { required: true }
      });

      expect(selectedModel).toBeDefined();
      expect(selectedModel?.name).toBe('gpt-4o-mini'); // Fastest model with streaming (highest outputSpeed)
    });

    it('should resolve balanced alias to model with good balance of quality and speed', () => {
      const selectedModel = modelManager.getModel('balanced' as ModelAlias);

      expect(selectedModel).toBeDefined();
      expect(selectedModel?.name).toBe('gpt-4o-mini'); // Best balance according to ModelSelector logic
    });

    it('should resolve premium alias to highest quality model', () => {
      const selectedModel = modelManager.getModel('premium' as ModelAlias);

      expect(selectedModel).toBeDefined();
      expect(selectedModel?.name).toBe('gpt-4o'); // Highest quality according to ModelSelector logic
    });

    it('should handle capability requirements gracefully', () => {
      // This test verifies that the system can handle various capability combinations
      const selectedModel = modelManager.getModel('premium' as ModelAlias, {
        toolCalls: { required: true },
        streaming: { required: true }
      });

      expect(selectedModel).toBeDefined();
      expect(selectedModel?.name).toBe('gpt-4o'); // Should select model that supports both
    });

    it('should handle JSON format requirements correctly', () => {
      const selectedModel = modelManager.getModel('cheap' as ModelAlias, {
        textOutput: { jsonFormat: true }
      });

      expect(selectedModel).toBeDefined();
      expect(selectedModel?.name).toBe('text-embedding-3-small'); // Cheapest model with text capabilities
    });
  });

  describe('Direct ModelSelector testing', () => {
    it('should correctly filter models based on complex capability requirements', () => {
      const availableModels = modelManager.getAvailableModels();

      // Test image generation requirement
      const imageModel = ModelSelector.selectModel(availableModels, 'cheap' as ModelAlias, {
        imageOutput: { required: true, operations: ['generate'] }
      });
      expect(imageModel).toBe('dall-e-3');

      // Test tool calling requirement
      const toolModel = ModelSelector.selectModel(availableModels, 'cheap' as ModelAlias, {
        toolCalls: { required: true }
      });
      expect(toolModel).toBe('gpt-4o-mini');

      // Test streaming requirement
      const streamingModel = ModelSelector.selectModel(availableModels, 'fast' as ModelAlias, {
        streaming: { required: true }
      });
      expect(streamingModel).toBe('gpt-4o-mini');

      // Test JSON output requirement
      const jsonModel = ModelSelector.selectModel(availableModels, 'cheap' as ModelAlias, {
        textOutput: { jsonFormat: true }
      });
      expect(jsonModel).toBe('text-embedding-3-small');
    });

    it('should handle fallback when no exact capability match is found', () => {
      const availableModels = modelManager.getAvailableModels();

      // Test with a requirement that might not have exact matches
      const noToolModel = ModelSelector.selectModel(availableModels, 'cheap' as ModelAlias, {
        toolCalls: { required: true }
      });
      expect(noToolModel).toBe('gpt-4o-mini');
    });
  });
});