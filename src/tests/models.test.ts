import { mockModels } from './mocks/mockModels';
import { OpenAIAdapter } from '../adapters/openai/OpenAIAdapter';

// Mock OpenAI adapter and its models
jest.mock('../adapters/openai/OpenAIAdapter', () => ({
    OpenAIAdapter: jest.fn().mockImplementation(() => ({
        chatCall: jest.fn(),
        streamCall: jest.fn()
    }))
}));

jest.mock('../adapters/openai/models', () => ({
    defaultModels: mockModels
}));

import { LLMCaller } from '../core/LLMCaller';
import { ModelInfo, ModelAlias } from '../interfaces/UniversalInterfaces';

describe('Model Management', () => {
    let caller: LLMCaller;

    beforeEach(() => {
        caller = new LLMCaller('openai', 'mock-model-1', 'You are a helpful assistant.');
    });

    describe('Model Information', () => {
        it('should return correct model info for default models', () => {
            const model = caller.getModel('mock-model-1');
            expect(model).toBeDefined();
            expect(model?.inputPricePerMillion).toBe(30.0);
            expect(model?.outputPricePerMillion).toBe(60.0);
            expect(model?.tokenizationModel).toBe('mock-tokenizer');
            expect(model?.jsonMode).toBe(true);
            expect(model?.characteristics).toBeDefined();
            expect(model?.characteristics.qualityIndex).toBe(95);
            expect(model?.characteristics.outputSpeed).toBe(15);
            expect(model?.characteristics.firstTokenLatency).toBe(2000);
        });

        it('should return undefined for non-existent model', () => {
            const model = caller.getModel('non-existent-model');
            expect(model).toBeUndefined();
        });

        it('should resolve model aliases correctly', () => {
            const fastModel = caller.getModel('fast');
            expect(fastModel).toBeDefined();
            expect(fastModel?.characteristics.outputSpeed).toBeGreaterThanOrEqual(25);
            expect(fastModel?.characteristics.firstTokenLatency).toBeLessThanOrEqual(1000);

            const premiumModel = caller.getModel('premium');
            expect(premiumModel).toBeDefined();
            expect(premiumModel?.characteristics.qualityIndex).toBeGreaterThanOrEqual(95);
        });

        it('should resolve cheap model alias correctly', () => {
            const cheapModel = caller.getModel('cheap');
            expect(cheapModel).toBeDefined();
            expect(cheapModel?.name).toBe('mock-model-2');

            const totalCost = cheapModel!.inputPricePerMillion + cheapModel!.outputPricePerMillion;
            expect(totalCost).toBe(45.0);
        });

        it('should consider both input and output costs when selecting cheap model', () => {
            // Add a test model with low input but high output cost
            caller.addModel({
                name: "expensive-output-model",
                inputPricePerMillion: 1.0,
                outputPricePerMillion: 100.0,
                maxRequestTokens: 4000,
                maxResponseTokens: 2000,
                characteristics: {
                    qualityIndex: 80,
                    outputSpeed: 20,
                    firstTokenLatency: 1000
                }
            });

            const cheapModel = caller.getModel('cheap');
            expect(cheapModel).toBeDefined();
            expect(cheapModel?.name).not.toBe('expensive-output-model');
        });

        it('should resolve balanced model alias correctly', () => {
            const balancedModel = caller.getModel('balanced');
            expect(balancedModel).toBeDefined();

            // Should have reasonable scores across all metrics
            expect(balancedModel?.characteristics.qualityIndex).toBeGreaterThanOrEqual(80);
            expect(balancedModel?.characteristics.outputSpeed).toBeGreaterThanOrEqual(15);
            expect(balancedModel?.characteristics.firstTokenLatency).toBeLessThanOrEqual(2500);
        });

        it('should penalize unbalanced models in balanced selection', () => {
            // Add an unbalanced model with extreme variations in metrics
            caller.addModel({
                name: "unbalanced-model",
                inputPricePerMillion: 20.0,
                outputPricePerMillion: 40.0,
                maxRequestTokens: 4000,
                maxResponseTokens: 2000,
                characteristics: {
                    qualityIndex: 100,    // Extremely high quality
                    outputSpeed: 5,       // Very slow
                    firstTokenLatency: 3000 // High latency
                }
            });

            const balancedModel = caller.getModel('balanced');
            expect(balancedModel).toBeDefined();
            expect(balancedModel?.name).not.toBe('unbalanced-model');
        });

        it('should handle models with equal scores correctly', () => {
            // Add a model with identical metrics to mock-model-1
            caller.addModel({
                name: "identical-model",
                inputPricePerMillion: 30.0,
                outputPricePerMillion: 60.0,
                maxRequestTokens: 8192,
                maxResponseTokens: 4096,
                characteristics: {
                    qualityIndex: 100,    // Same as mock-model-3
                    outputSpeed: 10,      // Same as mock-model-3
                    firstTokenLatency: 2500 // Same as mock-model-3
                }
            });

            // Should consistently select one of them for premium (both have highest quality)
            const premiumModel = caller.getModel('premium');
            expect(premiumModel).toBeDefined();
            expect(['mock-model-3', 'identical-model']).toContain(premiumModel?.name);
        });

        it('should handle edge cases in model characteristics', () => {
            // Add models with edge case values
            caller.addModel({
                name: "edge-case-model",
                inputPricePerMillion: 0.1,  // Very low price
                outputPricePerMillion: 0.2,
                maxRequestTokens: 1000,
                maxResponseTokens: 500,
                characteristics: {
                    qualityIndex: 1,        // Minimum quality
                    outputSpeed: 100,       // Very high speed
                    firstTokenLatency: 100  // Very low latency
                }
            });

            // Test different aliases with edge case model
            const fastModel = caller.getModel('fast');
            const cheapModel = caller.getModel('cheap');
            const premiumModel = caller.getModel('premium');
            const balancedModel = caller.getModel('balanced');

            // Edge case model should be selected for 'fast' due to high speed
            expect(fastModel?.name).toBe('edge-case-model');
            // Edge case model should be selected for 'cheap' due to low price
            expect(cheapModel?.name).toBe('edge-case-model');
            // Edge case model should NOT be selected for 'premium' due to low quality
            expect(premiumModel?.name).not.toBe('edge-case-model');
            // Edge case model should NOT be selected for 'balanced' due to extreme variations
            expect(balancedModel?.name).not.toBe('edge-case-model');
        });

        it('should handle single model selection correctly', () => {
            // Create a new LLMCaller instance to avoid affecting other tests
            const isolatedCaller = new LLMCaller('openai', 'mock-model-1', 'You are a helpful assistant.');

            // Clear all existing models
            const models = isolatedCaller.getAvailableModels();
            models.forEach(model => {
                isolatedCaller.updateModel(model.name, {
                    characteristics: {
                        qualityIndex: 0,
                        outputSpeed: 0,
                        firstTokenLatency: 9999
                    },
                    inputPricePerMillion: 999999,
                    outputPricePerMillion: 999999,
                    maxRequestTokens: 1,
                    maxResponseTokens: 1
                });
            });

            // Add our test model with good characteristics
            const testModel = {
                name: "only-good-model",
                inputPricePerMillion: 50.0,
                outputPricePerMillion: 100.0,
                maxRequestTokens: 4000,
                maxResponseTokens: 2000,
                characteristics: {
                    qualityIndex: 90,
                    outputSpeed: 50,
                    firstTokenLatency: 1500
                }
            };
            isolatedCaller.addModel(testModel);

            // Should select our model regardless of alias since it's the only viable option
            const aliases: ModelAlias[] = ['fast', 'premium', 'balanced', 'cheap'];
            aliases.forEach(alias => {
                const model = isolatedCaller.getModel(alias);
                expect(model).toEqual(testModel);
            });
        });
    });

    describe('Model Management', () => {
        const customModel: ModelInfo = {
            name: 'custom-model',
            inputPricePerMillion: 30.0,
            outputPricePerMillion: 60.0,
            maxRequestTokens: 8192,
            maxResponseTokens: 4096,
            tokenizationModel: 'mock-tokenizer',
            jsonMode: true,
            characteristics: {
                qualityIndex: 85,
                outputSpeed: 50,
                firstTokenLatency: 500
            }
        };

        it('should add a new model successfully', () => {
            caller.addModel(customModel);
            const model = caller.getModel('custom-model');
            expect(model).toEqual(customModel);
        });

        it('should update existing model', () => {
            caller.addModel({
                ...customModel,
                inputPricePerMillion: 40.0,
                outputPricePerMillion: 80.0,
                characteristics: {
                    ...customModel.characteristics,
                    qualityIndex: 95
                }
            });
            const model = caller.getModel('custom-model');
            expect(model?.inputPricePerMillion).toBe(40.0);
            expect(model?.outputPricePerMillion).toBe(80.0);
            expect(model?.characteristics.qualityIndex).toBe(95);
        });

        it('should list all available models', () => {
            const models = caller.getAvailableModels();
            expect(models).toContainEqual(expect.objectContaining({
                name: 'mock-model-1',
                tokenizationModel: 'mock-tokenizer',
                characteristics: expect.objectContaining({
                    qualityIndex: 95,
                    outputSpeed: 15,
                    firstTokenLatency: 2000
                })
            }));
        });

        it('should set model with provider change', () => {
            caller.setModel({
                provider: 'openai',
                nameOrAlias: 'fast',
                apiKey: 'test-key'
            });
            const model = caller.getModel('fast');
            expect(model).toBeDefined();
            expect(model?.characteristics.outputSpeed).toBeGreaterThanOrEqual(25);
        });
    });
});

describe('OpenAI Adapter', () => {
    let adapter: OpenAIAdapter;

    beforeEach(() => {
        adapter = new OpenAIAdapter('test-key');
    });

    describe('Parameter Validation', () => {
        it('should use default temperature when not provided', () => {
            const params = adapter.convertToProviderParams('gpt-4o', {
                messages: [{ role: 'user', content: 'test' }]
            });
            expect(params.temperature).toBe(1);
        });

        it('should clamp temperature to valid range', () => {
            const tooHigh = adapter.convertToProviderParams('gpt-4o', {
                messages: [{ role: 'user', content: 'test' }],
                settings: { temperature: 2.5 }
            });
            expect(tooHigh.temperature).toBe(2);

            const tooLow = adapter.convertToProviderParams('gpt-4o', {
                messages: [{ role: 'user', content: 'test' }],
                settings: { temperature: -0.5 }
            });
            expect(tooLow.temperature).toBe(0);

            const valid = adapter.convertToProviderParams('gpt-4o', {
                messages: [{ role: 'user', content: 'test' }],
                settings: { temperature: 0.7 }
            });
            expect(valid.temperature).toBe(0.7);
        });
    });
}); 