import { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse } from '../../interfaces/UniversalInterfaces';
import { z } from 'zod';
import { ProviderManager } from './ProviderManager';
import { SupportedProviders } from '../types';
import { ModelManager } from '../models/ModelManager';
import { TokenCalculator } from '../models/TokenCalculator';
import { ResponseProcessor } from './ResponseProcessor';
import { StreamHandler } from '../streaming/StreamHandler';

export class LLMCaller {
    private providerManager: ProviderManager;
    private modelManager: ModelManager;
    private tokenCalculator: TokenCalculator;
    private responseProcessor: ResponseProcessor;
    private streamHandler: StreamHandler;
    private model: string;
    private systemMessage: string;

    constructor(providerName: SupportedProviders, modelOrAlias: string, systemMessage: string, apiKey?: string) {
        this.providerManager = new ProviderManager(providerName, apiKey);
        this.modelManager = new ModelManager(providerName);
        this.tokenCalculator = new TokenCalculator();
        this.responseProcessor = new ResponseProcessor();
        this.streamHandler = new StreamHandler(this.tokenCalculator);
        this.systemMessage = systemMessage;

        // Initialize model
        const resolvedModel = this.modelManager.getModel(modelOrAlias);
        if (!resolvedModel) {
            throw new Error(`Model ${modelOrAlias} not found for provider ${providerName}`);
        }
        this.model = resolvedModel.name;
    }

    // Model management methods - delegated to ModelManager
    public getAvailableModels() {
        return this.modelManager.getAvailableModels();
    }

    public addModel(model: Parameters<ModelManager['addModel']>[0]) {
        this.modelManager.addModel(model);
    }

    public getModel(nameOrAlias: string) {
        return this.modelManager.getModel(nameOrAlias);
    }

    public updateModel(modelName: string, updates: Parameters<ModelManager['updateModel']>[1]) {
        this.modelManager.updateModel(modelName, updates);
    }

    public setModel(options: {
        provider?: SupportedProviders;
        nameOrAlias: string;
        apiKey?: string;
    }): void {
        const { provider, nameOrAlias, apiKey } = options;

        // If provider is specified and different, switch provider
        if (provider) {
            this.providerManager.switchProvider(provider, apiKey);
            this.modelManager = new ModelManager(provider);
        }

        // Resolve and set new model
        const resolvedModel = this.modelManager.getModel(nameOrAlias);
        if (!resolvedModel) {
            throw new Error(`Model ${nameOrAlias} not found in provider ${provider || 'current'}`);
        }
        this.model = resolvedModel.name;
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
        const modelInfo = this.modelManager.getModel(this.model);
        this.responseProcessor.validateJsonMode(modelInfo!, params);

        // Make the call
        const response = await this.providerManager.getProvider().chatCall(this.model, params);

        // Calculate usage if not provided
        if (!response.metadata?.usage) {
            const inputTokens = this.tokenCalculator.calculateTokens(this.systemMessage + '\n' + message);
            const outputTokens = this.tokenCalculator.calculateTokens(response.content);
            const modelInfo = this.modelManager.getModel(this.model)!;
            const usage = this.tokenCalculator.calculateUsage(
                inputTokens,
                outputTokens,
                modelInfo.inputPricePerMillion,
                modelInfo.outputPricePerMillion
            );
            response.metadata = { ...response.metadata, usage };
        }

        // Validate response against schema if provided
        return this.responseProcessor.validateResponse<T>(response, settings);
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
        const modelInfo = this.modelManager.getModel(this.model);
        this.responseProcessor.validateJsonMode(modelInfo!, params);

        // Get the stream
        const stream = await this.providerManager.getProvider().streamCall(this.model, params);

        // Calculate input tokens
        const inputTokens = this.tokenCalculator.calculateTokens(this.systemMessage + '\n' + message);

        // Process the stream
        return this.streamHandler.processStream<T>(stream, params, inputTokens);
    }

    // Extended call method with additional functionality
    public async call({ message, data, endingMessage, settings }: {
        message: string;
        data?: any;
        endingMessage?: string;
        settings?: any;
    }): Promise<UniversalChatResponse[]> {
        const responses: UniversalChatResponse[] = [];

        // First message
        const firstResponse = await this.chatCall({ message, data, settings });
        responses.push(firstResponse);

        // Ending message if provided
        if (endingMessage) {
            const endResponse = await this.chatCall({ message: endingMessage, data, settings });
            responses.push(endResponse);
        }

        return responses;
    }

    // Extended stream method with additional functionality
    public async stream({ message, data, endingMessage, settings }: {
        message: string;
        data?: any;
        endingMessage?: string;
        settings?: any;
    }): Promise<AsyncIterable<UniversalStreamResponse>> {
        const firstStream = await this.streamCall({ message, data, settings });

        if (!endingMessage) {
            return firstStream;
        }

        const endStream = await this.streamCall({ message: endingMessage, data, settings });

        return {
            [Symbol.asyncIterator]: async function* () {
                for await (const chunk of firstStream) {
                    yield chunk;
                }
                for await (const chunk of endStream) {
                    yield chunk;
                }
            }
        };
    }
} 