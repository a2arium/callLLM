import { ModelManager } from '../../../../core/models/ModelManager';
import { ModelInfo, ModelAlias } from '../../../../interfaces/UniversalInterfaces';
import { SupportedProviders } from '../../../../core/types';

// Mock the ModelSelector
const mockSelectModel = jest.fn();
jest.mock('../../../../core/models/ModelSelector', () => ({
    ModelSelector: {
        selectModel: (...args: any[]) => mockSelectModel(...args)
    }
}));

// Mock OpenAI models
jest.mock('../../../../adapters/openai/models', () => ({
    defaultModels: [
        {
            name: "mock-model-1",
            inputPricePerMillion: 1,
            outputPricePerMillion: 2,
            maxRequestTokens: 1000,
            maxResponseTokens: 1000,
            characteristics: {
                qualityIndex: 70,
                outputSpeed: 100,
                firstTokenLatency: 1000
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
        manager = new ModelManager('openai');
    });

    describe('constructor', () => {
        it('should initialize with mock models', () => {
            const models = manager.getAvailableModels();
            expect(models.length).toBe(1);
            expect(models[0].name).toBe('mock-model-1');
        });

        it('should throw error for unsupported provider', () => {
            expect(() => new ModelManager('unsupported' as SupportedProviders))
                .toThrow('Provider unsupported is not supported yet');
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

        it('should throw error for invalid model configuration', () => {
            const invalidModel = { ...validModel, inputPricePerMillion: -1 };
            expect(() => manager.addModel(invalidModel))
                .toThrow('Invalid model configuration');
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
            manager.addModel(validModel);
            expect(manager.getAvailableModels().length).toBeGreaterThan(0);

            manager.clearModels();
            expect(manager.getAvailableModels().length).toBe(0);
            expect(manager.hasModel('test-model')).toBe(false);
        });
    });

    describe('hasModel', () => {
        it('should return true for existing model', () => {
            manager.clearModels(); // Start with a clean slate
            manager.addModel(validModel);
            expect(manager.hasModel('test-model')).toBe(true);
        });

        it('should return false for non-existent model', () => {
            manager.clearModels(); // Start with a clean slate
            expect(manager.hasModel('non-existent')).toBe(false);
        });
    });

    describe('getAvailableModels', () => {
        it('should return all models', () => {
            manager.clearModels(); // Start with a clean slate
            manager.addModel(validModel);
            const models = manager.getAvailableModels();
            expect(models.length).toBe(1);
            expect(models).toContainEqual(validModel);
        });

        it('should return empty array when no models', () => {
            manager.clearModels();
            expect(manager.getAvailableModels()).toEqual([]);
        });
    });
}); 