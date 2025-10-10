import type { ModelInfo, ModelAlias, ModelCapabilities } from '../../interfaces/UniversalInterfaces.ts';
import { ModelSelector, type CapabilityRequirement } from './ModelSelector.ts';
import { defaultModels as openAIResponseModels } from '../../adapters/openai/models.ts';
import type { RegisteredProviders } from '../../adapters/index.ts';

export class ModelManager {
    private static instance: ModelManager;
    private models: Map<string, ModelInfo>;

    constructor(providerName: RegisteredProviders) {
        this.models = new Map();
        this.initializeModels(providerName);
        ModelManager.instance = this;
    }

    // Static method to get model capabilities with defaults for missing values
    public static getCapabilities(modelId: string): ModelCapabilities {
        const model = this.instance?.getModel(modelId);

        // Default capabilities if model not found or capabilities not defined
        const defaultCapabilities: ModelCapabilities = {
            streaming: true,
            toolCalls: false,
            parallelToolCalls: false,
            batchProcessing: false,
            reasoning: false,
            input: {
                text: true,
                // By default, models don't support image input
                image: undefined
            },
            output: {
                text: true
            }
        };

        // Return model capabilities if found, otherwise return defaults
        return model?.capabilities || defaultCapabilities;
    }

    private initializeModels(providerName: RegisteredProviders): void {
        switch (providerName) {
            case 'openai':
                openAIResponseModels.forEach(model => this.models.set(model.name, model));
                break;
            // Add other providers here when implemented
            default:
                throw new Error(`Unsupported provider: ${providerName}`);
        }
    }

    public getAvailableModels(): ModelInfo[] {
        return Array.from(this.models.values());
    }

    public addModel(model: ModelInfo): void {
        this.validateModelConfiguration(model);
        this.models.set(model.name, model);
    }

    public getModel(nameOrAlias: string, capabilityRequirements?: CapabilityRequirement): ModelInfo | undefined {
        try {
            const modelName = ModelSelector.selectModel(
                Array.from(this.models.values()),
                nameOrAlias as ModelAlias,
                capabilityRequirements
            );
            return this.models.get(modelName);
        } catch {
            return this.models.get(nameOrAlias);
        }
    }

    public updateModel(modelName: string, updates: Partial<Omit<ModelInfo, 'name'>>): void {
        const model = this.models.get(modelName);
        if (!model) {
            throw new Error(`Model ${modelName} not found`);
        }
        this.models.set(modelName, { ...model, ...updates });
    }

    public clearModels(): void {
        this.models.clear();
    }

    public hasModel(modelName: string): boolean {
        return this.models.has(modelName);
    }

    private validateModelConfiguration(model: ModelInfo): void {
        if (!model.name) throw new Error('Model name is required');
        if (model.inputPricePerMillion === undefined) throw new Error('Input price is required');
        if (model.outputPricePerMillion === undefined) throw new Error('Output price is required');
        if (!model.maxRequestTokens) throw new Error('Max request tokens is required');
        if (model.maxResponseTokens === undefined) throw new Error('Max response tokens is required');
        if (!model.characteristics) throw new Error('Model characteristics are required');

        // Check for negative prices
        if (model.inputPricePerMillion < 0) throw new Error('Invalid model configuration');
        if (model.outputPricePerMillion < 0) throw new Error('Invalid model configuration');

        // Check for negative token values
        if (model.maxRequestTokens < 0) throw new Error('Invalid model configuration');
        if (model.maxResponseTokens < 0) throw new Error('Invalid model configuration');
    }

    public resolveModel(nameOrAlias: string, capabilityRequirements?: CapabilityRequirement): string {
        try {
            return ModelSelector.selectModel(
                Array.from(this.models.values()),
                nameOrAlias as ModelAlias,
                capabilityRequirements
            );
        } catch {
            if (!this.models.has(nameOrAlias)) {
                throw new Error(`Model ${nameOrAlias} not found`);
            }
            return nameOrAlias;
        }
    }
} 