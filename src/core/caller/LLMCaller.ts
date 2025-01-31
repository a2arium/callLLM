import { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse, Usage, FinishReason } from '../../interfaces/UniversalInterfaces';
import { z } from 'zod';
import { ProviderManager } from './ProviderManager';
import { SupportedProviders } from '../types';
import { ModelManager } from '../models/ModelManager';
import { TokenCalculator } from '../models/TokenCalculator';
import { ResponseProcessor } from '../processors/ResponseProcessor';
import { StreamHandler } from '../streaming/StreamHandler';
import { v4 as uuidv4 } from 'uuid';
import { UsageCallback, UsageData } from '../../interfaces/UsageInterfaces';
import { RequestProcessor } from '../processors/RequestProcessor';
import { DataSplitter } from '../processors/DataSplitter';

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
    private requestProcessor: RequestProcessor;
    private dataSplitter: DataSplitter;
    private settings?: UniversalChatParams['settings'];

    constructor(
        providerName: SupportedProviders,
        modelOrAlias: string,
        systemMessage?: string,
        options?: {
            apiKey?: string;
            callerId?: string;
            usageCallback?: UsageCallback;
            settings?: UniversalChatParams['settings'];
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
        this.settings = options?.settings;

        // Initialize model
        const resolvedModel = this.modelManager.getModel(modelOrAlias);
        if (!resolvedModel) {
            throw new Error(`Model ${modelOrAlias} not found for provider ${providerName}`);
        }
        this.model = resolvedModel.name;

        this.callerId = options?.callerId ?? uuidv4();
        this.usageCallback = options?.usageCallback;
        this.requestProcessor = new RequestProcessor();
        this.dataSplitter = new DataSplitter(this.tokenCalculator);
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

    public updateSettings(newSettings: UniversalChatParams['settings']): void {
        this.settings = { ...this.settings, ...newSettings };
    }

    private mergeSettings(methodSettings?: UniversalChatParams['settings']): UniversalChatParams['settings'] | undefined {
        if (!this.settings && !methodSettings) return undefined;
        return { ...this.settings, ...methodSettings };
    }

    // Basic chat completion method
    public async chatCall<T extends z.ZodType | undefined = undefined>({
        message,
        settings
    }: {
        message: string;
        settings?: UniversalChatParams['settings'];
    }): Promise<UniversalChatResponse & { content: T extends z.ZodType ? z.infer<T> : string }> {
        const mergedSettings = this.mergeSettings(settings);
        const systemMessage = mergedSettings?.responseFormat === 'json' || mergedSettings?.jsonSchema
            ? `${this.systemMessage}\n Provide your response in valid JSON format.`
            : this.systemMessage;

        const params: UniversalChatParams = {
            messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: message }
            ],
            settings: mergedSettings
        };

        // Validate JSON mode support
        const modelInfo = this.modelManager.getModel(this.model);
        if (!modelInfo) {
            throw new Error(`Model ${this.model} not found`);
        }
        this.responseProcessor.validateJsonMode(modelInfo, params);

        // Make the call with retries
        const maxRetries = mergedSettings?.maxRetries ?? 3;
        let lastError: Error | undefined;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const response = await this.providerManager.getProvider().chatCall(this.model, params);

                // Validate basic response structure
                if (!response || typeof response.content !== 'string' || typeof response.role !== 'string') {
                    throw new Error('Invalid response structure from provider: missing required fields');
                }

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
                return this.responseProcessor.validateResponse<T>(response, mergedSettings);
            } catch (error) {
                lastError = error as Error;
                if (attempt === maxRetries) {
                    throw new Error(`Failed after ${maxRetries} retries. Last error: ${lastError.message}`);
                }
                // Wait with exponential backoff before retrying
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }

        // This should never be reached due to the throw in the loop, but TypeScript needs it
        throw lastError;
    }

    /**
     * Streams a response from the LLM with retry logic and discards any partial data from failed attempts.
     */
    public async streamCall({
        message,
        settings
    }: {
        message: string;
        settings?: UniversalChatParams['settings'];
    }): Promise<AsyncIterable<UniversalStreamResponse>> {
        // Resolve model and validate capabilities
        const modelInfo = this.modelManager.getModel(this.model);
        if (!modelInfo) {
            throw new Error(`Model ${this.model} not found`);
        }

        // Check if streaming is supported
        if (modelInfo.capabilities?.streaming === false) {
            throw new Error(`Model ${this.model} does not support streaming. Use chatCall instead.`);
        }

        // Merge global and method-level settings
        const mergedSettings = this.mergeSettings(settings);
        const systemMessage =
            mergedSettings?.responseFormat === 'json' || mergedSettings?.jsonSchema
                ? `${this.systemMessage}\n Provide your response in valid JSON format.`
                : this.systemMessage;

        // Prepare parameters
        const params: UniversalChatParams = {
            messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: message }
            ],
            settings: mergedSettings
        };

        this.responseProcessor.validateJsonMode(modelInfo, params);

        // Calculate input tokens
        const inputTokens = this.tokenCalculator.calculateTokens(
            this.systemMessage + '\n' + message
        );

        const maxRetries = mergedSettings?.maxRetries ?? 3;
        let attempt = 0;

        const createRetryableStream = async (): Promise<AsyncIterable<UniversalStreamResponse>> => {
            let retryCount = 0;

            const executeAttempt = async (): Promise<AsyncIterable<UniversalStreamResponse>> => {
                try {
                    const provider = this.providerManager.getProvider();
                    const providerStream = await provider.streamCall(this.model, params);
                    const processedStream = this.streamHandler.processStream(
                        providerStream,
                        params,
                        inputTokens,
                        modelInfo
                    );

                    const buffer: UniversalStreamResponse[] = [];

                    return {
                        async *[Symbol.asyncIterator]() {
                            let hasErrored = false;
                            try {
                                for await (const chunk of processedStream) {
                                    yield chunk;
                                }
                            } catch (error) {
                                hasErrored = true;
                                if (retryCount < maxRetries) {
                                    retryCount++;
                                    const delay = Math.pow(2, retryCount) * 1000;
                                    await new Promise(resolve => setTimeout(resolve, delay));

                                    // Retry with new stream
                                    const newStream = await executeAttempt();
                                    yield* newStream;
                                } else {
                                    throw new Error(`Failed after ${maxRetries} retries. Last error: ${(error as Error).message}`);
                                }
                            } finally {
                                if (hasErrored) {
                                    // Clear any pending chunks from failed stream
                                    await processedStream[Symbol.asyncIterator]().return?.(undefined);
                                }
                            }
                        }
                    };
                } catch (error) {
                    if (attempt < maxRetries) {
                        attempt++;
                        const delay = Math.pow(2, attempt) * 1000;
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return executeAttempt();
                    }
                    throw new Error(`Failed after ${maxRetries} retries. Last error: ${(error as Error).message}`);
                }
            };

            return executeAttempt();
        };

        return createRetryableStream();
    }

    // Extended call method with additional functionality
    public async call({ message, data, endingMessage, settings }: {
        message: string;
        data?: any;
        endingMessage?: string;
        settings?: UniversalChatParams['settings'];
    }): Promise<UniversalChatResponse[]> {
        const modelInfo = this.modelManager.getModel(this.model)!;
        const maxResponseTokens = settings?.maxTokens ?? modelInfo.maxResponseTokens;

        // Process request into messages
        const messages = await this.requestProcessor.processRequest({
            message,
            data,
            endingMessage,
            model: modelInfo,
            maxResponseTokens
        });

        // Call for each message
        const responses: UniversalChatResponse[] = [];
        for (const msg of messages) {
            const response = await this.chatCall({
                message: msg,
                settings
            });
            responses.push(response);
        }

        return responses;
    }

    // Extended stream method with additional functionality
    public async stream({ message, data, endingMessage, settings }: {
        message: string;
        data?: any;
        endingMessage?: string;
        settings?: UniversalChatParams['settings'];
    }): Promise<AsyncIterable<UniversalStreamResponse>> {
        const modelInfo = this.modelManager.getModel(this.model)!;
        const maxResponseTokens = settings?.maxTokens ?? modelInfo.maxResponseTokens;

        // Process request into messages
        const messages = await this.requestProcessor.processRequest({
            message,
            data,
            endingMessage,
            model: modelInfo,
            maxResponseTokens
        });

        const self = this;
        let currentMessageIndex = 0;
        const totalMessages = messages.length;

        return {
            [Symbol.asyncIterator]() {
                let currentStream: AsyncIterator<UniversalStreamResponse> | null = null;
                let accumulatedContent = '';

                return {
                    async next(): Promise<IteratorResult<UniversalStreamResponse>> {
                        while (currentMessageIndex < totalMessages) {
                            if (!currentStream) {
                                const processedMessage = messages[currentMessageIndex];
                                const stream = await self.streamCall({
                                    message: processedMessage,
                                    settings: settings
                                });
                                currentStream = stream[Symbol.asyncIterator]();
                            }

                            const result = await currentStream!.next();
                            if (!result.done) {
                                const newContent = result.value.content + (result.value.isComplete && currentMessageIndex !== totalMessages - 1 ? '\n' : '');
                                accumulatedContent += newContent;
                                const response: UniversalStreamResponse = {
                                    ...result.value,
                                    content: newContent,
                                    metadata: {
                                        ...result.value.metadata,
                                        processInfo: {
                                            currentChunk: currentMessageIndex + 1,
                                            totalChunks: totalMessages
                                        }
                                    }
                                };
                                return { done: false, value: response };
                            }

                            // Current stream is done, move to next message
                            currentMessageIndex++;
                            currentStream = null;

                            // Add newline after each message is complete
                            if (currentMessageIndex !== totalMessages - 1) accumulatedContent += '\n';

                            // If this was the last message, return the final accumulated content
                            if (currentMessageIndex === totalMessages) {
                                const finalResponse: UniversalStreamResponse = {
                                    content: accumulatedContent,
                                    role: 'assistant',
                                    isComplete: true,
                                    metadata: {
                                        processInfo: {
                                            currentChunk: totalMessages,
                                            totalChunks: totalMessages
                                        }
                                    }
                                };
                                return { done: true, value: finalResponse };
                            }
                        }

                        return { done: true, value: undefined };
                    }
                };
            }
        };
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