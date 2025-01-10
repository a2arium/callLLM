import { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse, ModelInfo, Usage, ModelAlias, JSONSchemaDefinition, FinishReason } from '../interfaces/UniversalInterfaces';
import { LLMProvider } from '../interfaces/LLMProvider';
import { OpenAIAdapter } from '../adapters/openai/OpenAIAdapter';
import { defaultModels as openAIModels } from '../adapters/openai/models';
import { ModelSelector } from './ModelSelector';
import { encoding_for_model } from '@dqbd/tiktoken';
import { SchemaValidator, SchemaValidationError } from './SchemaValidator';
import { z } from 'zod';

export type SupportedProviders = 'openai' | 'anthropic' | 'google';

export class LLMCaller {
    private provider: LLMProvider;
    private model: string;
    private systemMessage: string;
    private models: Map<string, ModelInfo>;

    constructor(providerName: SupportedProviders, modelOrAlias: string, systemMessage: string, apiKey?: string) {
        this.provider = this.createProvider(providerName, apiKey);
        this.systemMessage = systemMessage;
        this.models = new Map();

        // Initialize with default models based on provider
        switch (providerName) {
            case 'openai':
                openAIModels.forEach(model => this.models.set(model.name, model));
                break;
            // Add other providers here when implemented
            default:
                throw new Error(`Provider ${providerName} is not supported yet`);
        }

        // Try to resolve model alias or use direct model name
        try {
            // Only select from models of the current provider
            const modelName = ModelSelector.selectModel(
                Array.from(this.models.values()),
                modelOrAlias as ModelAlias
            );
            if (!this.models.has(modelName)) {
                throw new Error(`Selected model ${modelName} not found in provider ${providerName}`);
            }
            this.model = modelName;
        } catch (error) {
            // If not an alias, try as direct model name
            if (!this.models.has(modelOrAlias)) {
                throw new Error(`Model ${modelOrAlias} not found for provider ${providerName}`);
            }
            this.model = modelOrAlias;
        }
    }

    private createProvider(providerName: SupportedProviders, apiKey?: string): LLMProvider {
        switch (providerName) {
            case 'openai':
                return new OpenAIAdapter(apiKey);
            default:
                throw new Error(`Provider ${providerName} is not supported yet`);
        }
    }

    // Model management methods
    public getAvailableModels(): ModelInfo[] {
        return Array.from(this.models.values());
    }

    public addModel(model: ModelInfo): void {
        // Validate model configuration
        if (model.inputPricePerMillion < 0 ||
            model.outputPricePerMillion < 0 ||
            model.maxRequestTokens <= 0 ||
            model.maxResponseTokens <= 0) {
            throw new Error('Invalid model configuration');
        }
        this.models.set(model.name, model);
    }

    public getModel(nameOrAlias: string): ModelInfo | undefined {
        try {
            // Try to resolve as alias first
            const modelName = ModelSelector.selectModel(
                Array.from(this.models.values()),
                nameOrAlias as ModelAlias
            );
            return this.models.get(modelName);
        } catch {
            // If not an alias, try as direct model name
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

    public setModel(options: {
        provider?: SupportedProviders;
        nameOrAlias: string;
        apiKey?: string;
    }): void {
        const { provider, nameOrAlias, apiKey } = options;

        // If provider is specified and different from current, switch provider
        if (provider) {
            this.provider = this.createProvider(provider, apiKey);
            this.models.clear(); // Clear existing models

            // Initialize with new provider's models
            switch (provider) {
                case 'openai':
                    openAIModels.forEach(model => this.models.set(model.name, model));
                    break;
                // Add other providers here when implemented
                default:
                    throw new Error(`Provider ${provider} is not supported yet`);
            }
        }

        // Try to resolve model name (either from alias or direct name)
        try {
            const modelName = ModelSelector.selectModel(
                Array.from(this.models.values()),
                nameOrAlias as ModelAlias
            );
            if (!this.models.has(modelName)) {
                throw new Error(`Selected model ${modelName} not found in provider ${provider || 'current'}`);
            }
            this.model = modelName;
        } catch {
            // If not an alias, try as direct model name
            if (!this.models.has(nameOrAlias)) {
                throw new Error(`Model ${nameOrAlias} not found in provider ${provider || 'current'}`);
            }
            this.model = nameOrAlias;
        }
    }

    private calculateUsage(inputTokens: number, outputTokens: number): Usage {
        const modelInfo = this.models.get(this.model)!;
        const inputCost = (inputTokens / 1_000_000) * modelInfo.inputPricePerMillion;
        const outputCost = (outputTokens / 1_000_000) * modelInfo.outputPricePerMillion;

        return {
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
            costs: {
                inputCost,
                outputCost,
                totalCost: inputCost + outputCost
            }
        };
    }

    private calculateTokens(text: string): number {
        try {
            const enc = encoding_for_model('gpt-4');
            const tokens = enc.encode(text);
            enc.free();
            return tokens.length;
        } catch (error) {
            console.warn('Failed to calculate tokens, using approximate count:', error);
            return Math.ceil(text.length / 4); // Rough approximation
        }
    }

    // New method for JSON mode validation
    private validateJsonMode(params: UniversalChatParams): void {
        if (params.settings?.jsonSchema || params.settings?.responseFormat === 'json') {
            const model = this.models.get(this.model);
            if (!model?.jsonMode) {
                throw new Error(`Model ${this.model} does not support JSON mode`);
            }
        }
    }

    // New method for response validation
    private async validateResponse<T extends z.ZodType | undefined = undefined>(
        response: UniversalChatResponse,
        schema?: JSONSchemaDefinition
    ): Promise<UniversalChatResponse & { content: T extends z.ZodType ? z.infer<T> : string }> {
        if (!schema || response.metadata?.finishReason === FinishReason.NULL) {
            return response as any;
        }

        try {
            const validatedContent = SchemaValidator.validate(
                response.metadata?.responseFormat === 'json' ? JSON.parse(response.content) : response.content,
                schema
            );

            return {
                ...response,
                content: validatedContent
            } as any;
        } catch (error) {
            if (error instanceof SchemaValidationError) {
                return {
                    ...response,
                    metadata: {
                        ...response.metadata,
                        validationErrors: error.validationErrors,
                        finishReason: FinishReason.CONTENT_FILTER
                    }
                } as any;
            }
            throw error;
        }
    }

    // Basic chat completion method
    public async chatCall<T extends z.ZodType | undefined = undefined>({
        message,
        data,
        settings
    }: {
        message: string;
        data?: any;
        settings?: UniversalChatParams['settings'];
    }): Promise<UniversalChatResponse & { content: T extends z.ZodType ? z.infer<T> : string }> {
        const params: UniversalChatParams = {
            messages: [
                { role: 'system', content: this.systemMessage },
                { role: 'user', content: message }
            ],
            settings
        };

        // Validate JSON mode support
        this.validateJsonMode(params);

        const response = await this.provider.chatCall(this.model, params);

        // Use provider's token counts if available, otherwise calculate
        const usage = response.metadata?.usage || this.calculateUsage(
            this.calculateTokens(this.systemMessage + '\n' + message),
            this.calculateTokens(response.content)
        );

        const responseWithUsage = {
            ...response,
            metadata: {
                ...response.metadata,
                usage
            }
        };

        // Validate response against schema if provided
        return this.validateResponse<T>(responseWithUsage, settings?.jsonSchema);
    }

    // Basic streaming method
    public async streamCall<T extends z.ZodType | undefined = undefined>({
        message,
        data,
        settings
    }: {
        message: string;
        data?: any;
        settings?: UniversalChatParams['settings'];
    }): Promise<AsyncIterable<UniversalStreamResponse & { content: T extends z.ZodType ? z.infer<T> : string }>> {
        const params: UniversalChatParams = {
            messages: [
                { role: 'system', content: this.systemMessage },
                { role: 'user', content: message }
            ],
            settings
        };

        // Validate JSON mode support
        this.validateJsonMode(params);

        const stream = await this.provider.streamCall(this.model, params);
        const schema = settings?.jsonSchema;
        const inputTokens = this.calculateTokens(this.systemMessage + '\n' + message);
        let accumulatedOutput = '';

        // If no schema validation is needed, return original stream with usage tracking
        if (!schema) {
            return {
                [Symbol.asyncIterator]: async function* (this: LLMCaller) {
                    for await (const chunk of stream) {
                        accumulatedOutput += chunk.content;
                        const outputTokens = this.calculateTokens(accumulatedOutput);
                        const usage = this.calculateUsage(inputTokens, outputTokens);

                        yield {
                            ...chunk,
                            metadata: {
                                ...chunk.metadata,
                                usage
                            }
                        } as any;
                    }
                }.bind(this)
            };
        }

        // Create a new stream that validates chunks and tracks usage
        return {
            [Symbol.asyncIterator]: async function* (this: LLMCaller) {
                let accumulatedJson = '';

                for await (const chunk of stream) {
                    accumulatedOutput += chunk.content;
                    const outputTokens = this.calculateTokens(accumulatedOutput);
                    const usage = this.calculateUsage(inputTokens, outputTokens);

                    if (settings?.responseFormat === 'json') {
                        accumulatedJson += chunk.content;

                        if (chunk.isComplete) {
                            try {
                                const validatedContent = SchemaValidator.validate(
                                    JSON.parse(accumulatedJson),
                                    schema
                                );

                                yield {
                                    ...chunk,
                                    content: validatedContent,
                                    metadata: {
                                        ...chunk.metadata,
                                        usage
                                    }
                                } as any;
                            } catch (error) {
                                if (error instanceof SchemaValidationError) {
                                    yield {
                                        ...chunk,
                                        metadata: {
                                            ...chunk.metadata,
                                            validationErrors: error.validationErrors,
                                            finishReason: FinishReason.CONTENT_FILTER,
                                            usage
                                        }
                                    } as any;
                                } else {
                                    throw error;
                                }
                            }
                        } else {
                            yield {
                                ...chunk,
                                metadata: {
                                    ...chunk.metadata,
                                    usage
                                }
                            } as any;
                        }
                    } else {
                        try {
                            const validatedContent = SchemaValidator.validate(
                                chunk.content,
                                schema
                            );

                            yield {
                                ...chunk,
                                content: validatedContent,
                                metadata: {
                                    ...chunk.metadata,
                                    usage
                                }
                            } as any;
                        } catch (error) {
                            if (error instanceof SchemaValidationError) {
                                yield {
                                    ...chunk,
                                    metadata: {
                                        ...chunk.metadata,
                                        validationErrors: error.validationErrors,
                                        finishReason: FinishReason.CONTENT_FILTER,
                                        usage
                                    }
                                } as any;
                            } else {
                                throw error;
                            }
                        }
                    }
                }
            }.bind(this)
        };
    }

    // Extended call method with additional functionality
    public async call({ message, data, endingMessage, settings }: {
        message: string;
        data?: any;
        endingMessage?: string;
        settings?: any;
    }): Promise<UniversalChatResponse[]> {
        // Here you can implement additional logic, like:
        // - Handling multiple messages
        // - Processing data
        // - Adding ending messages
        // - Implementing retry logic
        // - Adding logging
        // - Implementing rate limiting
        // etc.

        const response = await this.chatCall({ message, data, settings });
        return [response];
    }

    // Extended stream method with additional functionality
    public async stream({ message, data, endingMessage, settings }: {
        message: string;
        data?: any;
        endingMessage?: string;
        settings?: any;
    }): Promise<AsyncIterable<UniversalStreamResponse>> {
        // Here you can implement additional logic, similar to the call method
        return await this.streamCall({ message, data, settings });
    }
} 