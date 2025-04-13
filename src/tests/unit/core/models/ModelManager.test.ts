import { ModelManager } from '../../../../core/models/ModelManager';
import { ModelInfo, ModelAlias } from '../../../../interfaces/UniversalInterfaces';
import { RegisteredProviders } from '../../../../adapters';

// Mock the ModelSelector
const mockSelectModel = jest.fn();
jest.mock('../../../../core/models/ModelSelector', () => ({
    ModelSelector: {
        selectModel: (...args: any[]) => mockSelectModel(...args)
    }
}));

// Mock OpenAI Response models
jest.mock('../../../../adapters/openai/models', () => ({
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
            }
        }
    ]
}));

describe('ModelManager', () => {
    let manager: ModelManager;
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
            expect(models.length).toBe(1);
            expect(models[0].name).toBe('mock-response-model-1');
        });

        it('should throw error for unsupported provider', () => {
            // @ts-expect-error Testing invalid provider
            expect(() => new ModelManager('unsupported'))
                .toThrow('Unsupported provider: unsupported');
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
            expect(() => manager.addModel(invalidModel))
                .toThrow('Invalid model configuration');
        });

        it('should throw error for invalid model configuration with negative output price', () => {
            const invalidModel = { ...validModel, outputPricePerMillion: -2 };
            expect(() => manager.addModel(invalidModel))
                .toThrow('Invalid model configuration');
        });

        it('should throw error when model name is missing', () => {
            const invalidModel = { ...validModel, name: "" };
            expect(() => manager.addModel(invalidModel))
                .toThrow('Model name is required');
        });

        it('should throw error when input price is undefined', () => {
            const invalidModel = { ...validModel, inputPricePerMillion: undefined } as any;
            expect(() => manager.addModel(invalidModel))
                .toThrow('Input price is required');
        });

        it('should throw error when output price is undefined', () => {
            const invalidModel = { ...validModel, outputPricePerMillion: undefined } as any;
            expect(() => manager.addModel(invalidModel))
                .toThrow('Output price is required');
        });

        it('should throw error when maxRequestTokens is missing', () => {
            const invalidModel = { ...validModel, maxRequestTokens: 0 };
            expect(() => manager.addModel(invalidModel))
                .toThrow('Max request tokens is required');
        });

        it('should throw error when maxResponseTokens is missing', () => {
            const invalidModel = { ...validModel, maxResponseTokens: 0 };
            expect(() => manager.addModel(invalidModel))
                .toThrow('Max response tokens is required');
        });

        it('should throw error when characteristics is missing', () => {
            const invalidModel = { ...validModel, characteristics: undefined } as any;
            expect(() => manager.addModel(invalidModel))
                .toThrow('Model characteristics are required');
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
            expect(() => manager.updateModel('non-existent', { inputPricePerMillion: 1 }))
                .toThrow('Model non-existent not found');
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
                'fast'
            );
        });

        it('should fall back to exact match if alias resolution fails', () => {
            const model = manager.getModel('test-model');
            expect(model).toEqual(validModel);
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
            expect(mockSelectModel).toHaveBeenCalled();
        });

        it('should throw error for non-existent model', () => {
            expect(() => manager.resolveModel('non-existent'))
                .toThrow('Model non-existent not found');
        });

        it('should resolve model alias', () => {
            mockSelectModel.mockReturnValueOnce('test-model');
            const modelName = manager.resolveModel('fast' as ModelAlias);
            expect(modelName).toBe('test-model');
            expect(mockSelectModel).toHaveBeenCalledWith(
                expect.arrayContaining([validModel]),
                'fast'
            );
        });
    });

    describe('clearModels', () => {
        it('should remove all models', () => {
            // Add a model
            manager.clearModels();
            manager.addModel(validModel);
            expect(manager.getAvailableModels().length).toBe(1);

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
}); 