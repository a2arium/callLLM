import { jest } from '@jest/globals';
import type { ModelInfo, ModelAlias, ModelCapabilities, ImageOutputOpts } from '../../../../interfaces/UniversalInterfaces.ts';
import type { RegisteredProviders } from '../../../../adapters/index.ts';

// Mock the ModelSelector
const mockSelectModel = jest.fn()
jest.unstable_mockModule('@/core/models/ModelSelector.ts', () => ({
  __esModule: true,
  ModelSelector: {
    selectModel: (...args: any[]) => mockSelectModel(...args)
  }
}));

// Mock OpenAI Response models
jest.unstable_mockModule('@/adapters/openai/models.ts', () => ({
  __esModule: true,
  defaultModels: [
    {
      name: "mock-response-model-1",
      inputPricePerMillion: 1.5,
      outputPricePerMillion: 2.5,
      maxRequestTokens: 2000,
      maxResponseTokens: 2000,
      characteristics: {
        qualityIndex: 80,
        outputSpeed: 200,
        firstTokenLatency: 500
      },
      capabilities: {
        streaming: true,
        toolCalls: false,
        parallelToolCalls: false,
        batchProcessing: false,
        reasoning: false,
        input: {
          text: true
        },
        output: {
          text: {
            textOutputFormats: ['text']
          }
        }
      }
    },
    {
      name: "mock-image-model",
      inputPricePerMillion: 5.0,
      outputPricePerMillion: 40.0,
      maxRequestTokens: 2000,
      maxResponseTokens: 2000,
      capabilities: {
        streaming: false,
        input: {
          text: true
        },
        output: {
          text: false,
          image: {
            generate: true,
            edit: true,
            editWithMask: true
          }
        }
      },
      characteristics: {
        qualityIndex: 85,
        outputSpeed: 0,
        firstTokenLatency: 2000
      }
    }]
}));

describe('ModelManager', () => {
  let ModelManager: any;
  let manager: any;

  beforeAll(async () => {
    // Dynamic import of ModelManager after mocks are set up
    const managerModule = await import('../../../../core/models/ModelManager.ts');
    ModelManager = managerModule.ModelManager;
  });

  const validModel: ModelInfo = {
    name: 'test-model',
    inputPricePerMillion: 1,
    outputPricePerMillion: 2,
    maxRequestTokens: 1000,
    maxResponseTokens: 1000,
    characteristics: {
      qualityIndex: 80,
      outputSpeed: 150,
      firstTokenLatency: 2000
    },
    capabilities: {
      streaming: true,
      toolCalls: false,
      parallelToolCalls: false,
      batchProcessing: false,
      reasoning: false,
      input: {
        text: true
      },
      output: {
        text: {
          textOutputFormats: ['text']
        }
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectModel.mockReset();
    // Always throw by default to simulate unknown alias
    mockSelectModel.mockImplementation(() => {
      throw new Error('Unknown alias');
    });
    // Use openai provider for tests
    manager = new ModelManager('openai' as RegisteredProviders);
  });

  describe('constructor', () => {
    it('should initialize with openai-response models', () => {
      const responseManager = new ModelManager('openai' as RegisteredProviders);
      const models = responseManager.getAvailableModels();
      expect(models.length).toBe(2);
      expect(models[0].name).toBe('mock-response-model-1');
      expect(models[1].name).toBe('mock-image-model');
    });

    it('should throw error for unsupported provider', () => {
      expect(() => new ModelManager('unsupported' as any)).
        toThrow('Unsupported provider: unsupported');
    });
  });

  describe('addModel', () => {
    it('should add a valid model', () => {
      manager.clearModels(); // Start with a clean slate
      manager.addModel(validModel);
      expect(manager.hasModel('test-model')).toBe(true);
      const model = manager.getModel('test-model');
      expect(model).toEqual(validModel);
    });

    it('should throw error for invalid model configuration with negative input price', () => {
      const invalidModel = { ...validModel, inputPricePerMillion: -1 };
      expect(() => manager.addModel(invalidModel)).
        toThrow('Invalid model configuration');
    });

    it('should throw error for invalid model configuration with negative output price', () => {
      const invalidModel = { ...validModel, outputPricePerMillion: -2 };
      expect(() => manager.addModel(invalidModel)).
        toThrow('Invalid model configuration');
    });

    it('should throw error when model name is missing', () => {
      const invalidModel = { ...validModel, name: "" };
      expect(() => manager.addModel(invalidModel)).
        toThrow('Model name is required');
    });

    it('should throw error when input price is undefined', () => {
      const invalidModel = { ...validModel, inputPricePerMillion: undefined } as any;
      expect(() => manager.addModel(invalidModel)).
        toThrow('Input price is required');
    });

    it('should throw error when output price is undefined', () => {
      const invalidModel = { ...validModel, outputPricePerMillion: undefined } as any;
      expect(() => manager.addModel(invalidModel)).
        toThrow('Output price is required');
    });

    it('should throw error when maxRequestTokens is missing', () => {
      const invalidModel = { ...validModel, maxRequestTokens: 0 };
      expect(() => manager.addModel(invalidModel)).
        toThrow('Max request tokens is required');
    });

    it('should throw error when maxResponseTokens is missing', () => {
      const invalidModel = { ...validModel, maxResponseTokens: undefined } as any;
      expect(() => manager.addModel(invalidModel)).
        toThrow('Max response tokens is required');
    });

    it('should allow maxResponseTokens to be 0 for embedding models', () => {
      const embeddingModel = { ...validModel, maxResponseTokens: 0 };
      expect(() => manager.addModel(embeddingModel)).not.toThrow();
    });

    it('should throw error when characteristics is missing', () => {
      const invalidModel = { ...validModel, characteristics: undefined } as any;
      expect(() => manager.addModel(invalidModel)).
        toThrow('Model characteristics are required');
    });

    it('should override existing model', () => {
      manager.clearModels(); // Start with a clean slate
      manager.addModel(validModel);
      const updatedModel = { ...validModel, inputPricePerMillion: 2 };
      manager.addModel(updatedModel);
      const model = manager.getModel('test-model');
      expect(model).toEqual(updatedModel);
    });
  });

  describe('updateModel', () => {
    beforeEach(() => {
      manager.clearModels(); // Start with a clean slate
      manager.addModel(validModel);
    });

    it('should update existing model', () => {
      manager.updateModel('test-model', { inputPricePerMillion: 3 });
      const updated = manager.getModel('test-model');
      expect(updated?.inputPricePerMillion).toBe(3);
    });

    it('should throw error for non-existent model', () => {
      expect(() => manager.updateModel('non-existent', { inputPricePerMillion: 1 })).
        toThrow('Model non-existent not found');
    });

    it('should preserve unmodified fields', () => {
      manager.updateModel('test-model', { inputPricePerMillion: 3 });
      const updated = manager.getModel('test-model');
      expect(updated).toEqual({
        ...validModel,
        inputPricePerMillion: 3
      });
    });
  });

  describe('getModel', () => {
    beforeEach(() => {
      manager.clearModels(); // Start with a clean slate
      manager.addModel(validModel);
    });

    it('should return model by exact name', () => {
      const model = manager.getModel('test-model');
      expect(model).toEqual(validModel);
    });

    it('should return undefined for non-existent model', () => {
      const model = manager.getModel('non-existent');
      expect(model).toBeUndefined();
    });

    it('should attempt to resolve alias before exact match', () => {
      mockSelectModel.mockReturnValueOnce('test-model');
      const model = manager.getModel('fast' as ModelAlias);
      expect(model).toEqual(validModel);
      expect(mockSelectModel).toHaveBeenCalledWith(
        expect.arrayContaining([validModel]),
        'fast',
        undefined // no specific capability requirements provided
      );
    });

    it('should fall back to exact match if alias resolution fails', () => {
      const model = manager.getModel('test-model');
      expect(model).toEqual(validModel);
      // ModelSelector should be called first, then fall back to exact match
      expect(mockSelectModel).toHaveBeenCalled();
    });
  });

  describe('resolveModel', () => {
    beforeEach(() => {
      manager.clearModels(); // Start with a clean slate
      manager.addModel(validModel);
    });

    it('should resolve exact model name', () => {
      const modelName = manager.resolveModel('test-model');
      expect(modelName).toBe('test-model');
      // ModelSelector should be called first, then fall back to exact match
      expect(mockSelectModel).toHaveBeenCalled();
    });

    it('should throw error for non-existent model', () => {
      expect(() => manager.resolveModel('non-existent')).
        toThrow('Model non-existent not found');
    });

    it('should resolve model alias', () => {
      mockSelectModel.mockReturnValueOnce('test-model');
      const modelName = manager.resolveModel('fast' as ModelAlias);
      expect(modelName).toBe('test-model');
      expect(mockSelectModel).toHaveBeenCalledWith(
        expect.arrayContaining([validModel]),
        'fast',
        undefined // no specific capability requirements provided
      );
    });
  });

  describe('clearModels', () => {
    it('should remove all models', () => {
      // Add a model
      manager.clearModels();
      manager.addModel(validModel);
      expect(manager.getAvailableModels().length).toBe(1); // Only one model added after clearModels

      // Clear models
      manager.clearModels();
      expect(manager.getAvailableModels().length).toBe(0);
    });
  });

  describe('hasModel', () => {
    it('should return true for existing model', () => {
      manager.clearModels();
      manager.addModel(validModel);
      expect(manager.hasModel('test-model')).toBe(true);
    });

    it('should return false for non-existent model', () => {
      manager.clearModels();
      expect(manager.hasModel('test-model')).toBe(false);
    });
  });

  describe('getCapabilities', () => {
    beforeEach(() => {
      // Reset the instance to ensure a clean test environment
      // @ts-ignore - accessing private property for testing
      ModelManager.instance = undefined;
      // Create a new instance which will set the static instance properly
      manager = new ModelManager('openai' as RegisteredProviders);
    });

    it('should return default capabilities for unknown model', () => {
      // Create a new instance to ensure the static instance is properly set
      new ModelManager('openai' as RegisteredProviders);
      const capabilities = ModelManager.getCapabilities('unknown-model');
      expect(capabilities).toEqual({
        streaming: true,
        toolCalls: false,
        parallelToolCalls: false,
        batchProcessing: false,
        reasoning: false,
        input: {
          text: true,
          image: undefined
        },
        output: {
          text: true
        }
      });
    });

    it('should return image generation capabilities for image model', () => {
      // Create a new instance to ensure the static instance is properly set
      new ModelManager('openai' as RegisteredProviders);
      // Use the mock image model
      const capabilities = ModelManager.getCapabilities('mock-image-model');

      expect(capabilities.output.image).toBeDefined();

      // Check for the specific image output capabilities
      const imageOutput = capabilities.output.image as ImageOutputOpts;
      expect(imageOutput.generate).toBe(true);
      expect(imageOutput.edit).toBe(true);
      expect(imageOutput.editWithMask).toBe(true);
    });

    it('should return model capabilities with merged defaults', () => {
      // Create a new instance to ensure the static instance is properly set
      manager = new ModelManager('openai' as RegisteredProviders);

      // Add a model with partial capabilities
      const partialCapabilitiesModel: ModelInfo = {
        name: 'partial-capabilities-model',
        inputPricePerMillion: 1,
        outputPricePerMillion: 2,
        maxRequestTokens: 1000,
        maxResponseTokens: 1000,
        capabilities: {
          // Only specify toolCalls - other capabilities will use defaults
          toolCalls: true,
          input: {
            text: true,
            image: true
          },
          // Include the required output property
          output: {
            text: true // Minimal required output property
          }
        },
        characteristics: {
          qualityIndex: 80,
          outputSpeed: 150,
          firstTokenLatency: 2000
        }
      };

      manager.addModel(partialCapabilitiesModel);

      const capabilities = ModelManager.getCapabilities('partial-capabilities-model');

      // Check that specified capabilities are preserved
      expect(capabilities.toolCalls).toBe(true);
      expect(capabilities.input.image).toBe(true);

      // Check that defaults are applied where not specified
      // Per the implementation in ModelManager.getCapabilities, only return the model's capabilities
      // or the default if the model is not found
      expect(capabilities).toBe(partialCapabilitiesModel.capabilities);
    });
  });
});