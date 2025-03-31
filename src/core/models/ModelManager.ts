import { ModelInfo, ModelAlias } from '../../interfaces/UniversalInterfaces';
import { ModelSelector } from './ModelSelector';
import { defaultModels as openAIModels } from '../../adapters/openai/models';
import { defaultModels as openAIResponseModels } from '../../adapters/openai-response/models';
import { SupportedProviders } from '../types';

export class ModelManager {
    private models: Map<string, ModelInfo>;

    constructor(providerName: SupportedProviders) {
        this.models = new Map();
        this.initializeModels(providerName);
    }

    private initializeModels(providerName: SupportedProviders): void {
        switch (providerName) {
            case 'openai':
                openAIModels.forEach(model => this.models.set(model.name, model));
                break;
            case 'openai-response':
                openAIResponseModels.forEach(model => this.models.set(model.name, model));
                break;
            // Add other providers here when implemented
            default:
                throw new Error(`Provider ${providerName} is not supported yet`);
        }
    }

    public getAvailableModels(): ModelInfo[] {
        return Array.from(this.models.values());
    }

    public addModel(model: ModelInfo): void {
        this.validateModelConfiguration(model);
        this.models.set(model.name, model);
    }

    public getModel(nameOrAlias: string): ModelInfo | undefined {
        try {
            const modelName = ModelSelector.selectModel(
                Array.from(this.models.values()),
                nameOrAlias as ModelAlias
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
        if (!model.maxResponseTokens) throw new Error('Max response tokens is required');
        if (!model.characteristics) throw new Error('Model characteristics are required');
    }

    public resolveModel(nameOrAlias: string): string {
        try {
            return ModelSelector.selectModel(
                Array.from(this.models.values()),
                nameOrAlias as ModelAlias
            );
        } catch {
            if (!this.models.has(nameOrAlias)) {
                throw new Error(`Model ${nameOrAlias} not found`);
            }
            return nameOrAlias;
        }
    }
} 