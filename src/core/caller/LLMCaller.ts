import { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse, Usage, FinishReason } from '../../interfaces/UniversalInterfaces';
import { z } from 'zod';
import { ProviderManager } from './ProviderManager';
import { SupportedProviders } from '../types';
import { ModelManager } from '../models/ModelManager';
import { TokenCalculator } from '../models/TokenCalculator';
import { ResponseProcessor } from './ResponseProcessor';
import { StreamHandler } from '../streaming/StreamHandler';
import { v4 as uuidv4 } from 'uuid';
import { UsageCallback, UsageData } from '../../interfaces/UsageInterfaces';

export class LLMCaller {
    private providerManager: ProviderManager;
    private modelManager: ModelManager;
    private tokenCalculator: TokenCalculator;
    private responseProcessor: ResponseProcessor;
    private streamHandler: StreamHandler;
    private model: string;
    private systemMessage: string;
    private callerId: string;
    private usageCallback?: UsageCallback;

    constructor(
        providerName: SupportedProviders,
        modelOrAlias: string,
        systemMessage?: string,
        options?: {
            apiKey?: string;
            callerId?: string;
            usageCallback?: UsageCallback;
        }
    ) {
        this.providerManager = new ProviderManager(providerName, options?.apiKey);
        this.modelManager = new ModelManager(providerName);
        this.tokenCalculator = new TokenCalculator();
        this.responseProcessor = new ResponseProcessor();
        this.streamHandler = new StreamHandler(
            this.tokenCalculator,
            options?.usageCallback,
            options?.callerId
        );
        this.systemMessage = systemMessage ?? 'You are a helpful assistant.';

        // Initialize model
        const resolvedModel = this.modelManager.getModel(modelOrAlias);
        if (!resolvedModel) {
            throw new Error(`Model ${modelOrAlias} not found for provider ${providerName}`);
        }
        this.model = resolvedModel.name;

        this.callerId = options?.callerId ?? uuidv4();
        this.usageCallback = options?.usageCallback;
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
        settings
    }: {
        message: string;
        settings?: UniversalChatParams['settings'];
    }): Promise<UniversalChatResponse & { content: T extends z.ZodType ? z.infer<T> : string }> {

        const systemMessage = settings?.responseFormat === 'json' || settings?.jsonSchema
            ? `${this.systemMessage}\n Provide your response in valid JSON format.`
            : this.systemMessage;

        const params: UniversalChatParams = {
            messages: [
                { role: 'system', content: systemMessage },
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
            const costs = this.tokenCalculator.calculateUsage(
                inputTokens,
                outputTokens,
                modelInfo.inputPricePerMillion,
                modelInfo.outputPricePerMillion
            );
            const usage: Usage = {
                inputTokens,
                outputTokens,
                totalTokens: inputTokens + outputTokens,
                costs
            };
            response.metadata = { ...response.metadata, usage };

            // Notify about usage
            await this.notifyUsage(usage);
        } else {
            // If usage was provided by the provider, still notify
            await this.notifyUsage(response.metadata.usage);
        }

        // Validate response against schema if provided
        return this.responseProcessor.validateResponse<T>(response, settings);
    }

    // Basic streaming method
    public async streamCall<T extends z.ZodType | undefined = undefined>({
        message,
        settings
    }: {
        message: string;
        settings?: UniversalChatParams['settings'];
    }): Promise<AsyncIterable<UniversalStreamResponse & { content: T extends z.ZodType ? z.infer<T> : string }>> {

        const systemMessage = settings?.responseFormat === 'json' || settings?.jsonSchema
            ? `${this.systemMessage}\n Provide your response in valid JSON format.`
            : this.systemMessage;

        const params: UniversalChatParams = {
            messages: [
                { role: 'system', content: systemMessage },
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
        return this.streamHandler.processStream<T>(stream, params, inputTokens, modelInfo!);
    }

    // Extended call method with additional functionality
    public async call({ message, data, endingMessage, settings }: {
        message: string;
        data?: any;
        endingMessage?: string;
        settings?: any;
    }): Promise<UniversalChatResponse[]> {
        const response = await this.chatCall({ message, settings });
        return [response];
    }

    // Extended stream method with additional functionality
    public async stream({ message, data, endingMessage, settings }: {
        message: string;
        data?: any;
        endingMessage?: string;
        settings?: any;
    }): Promise<AsyncIterable<UniversalStreamResponse>> {
        const stream = await this.streamCall({ message, settings });
        let accumulatedContent = '';

        return {
            [Symbol.asyncIterator]: async function* () {
                for await (const chunk of stream) {
                    accumulatedContent += chunk.content;
                    if (chunk.isComplete) {
                        yield { ...chunk, content: accumulatedContent };
                    } else {
                        yield chunk;
                    }
                }
            }
        };
    }

    // Add methods to manage ID and callback
    public setCallerId(newId: string): void {
        this.callerId = newId;
        this.streamHandler = new StreamHandler(
            this.tokenCalculator,
            this.usageCallback,
            newId
        );
    }

    public setUsageCallback(callback: UsageCallback): void {
        this.usageCallback = callback;
        this.streamHandler = new StreamHandler(
            this.tokenCalculator,
            callback,
            this.callerId
        );
    }

    private async notifyUsage(usage: UsageData['usage']): Promise<void> {
        if (this.usageCallback) {
            const usageData: UsageData = {
                callerId: this.callerId,
                usage,
                timestamp: Date.now()
            };
            await Promise.resolve(this.usageCallback(usageData));
        }
    }
} 