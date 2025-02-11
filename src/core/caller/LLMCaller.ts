import { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse, Usage, FinishReason, UniversalMessage } from '../../interfaces/UniversalInterfaces';
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
import { RetryManager } from '../retry/RetryManager';
import { UsageTracker } from '../telemetry/UsageTracker';
import { StreamController } from '../streaming/StreamController';
import { ChatController } from '../chat/ChatController';
import { ToolsManager } from '../tools/ToolsManager';
import type { ToolDefinition } from '../types';

export class LLMCaller {
    private providerManager: ProviderManager;
    private modelManager: ModelManager;
    private tokenCalculator: TokenCalculator;
    private responseProcessor: ResponseProcessor;
    private streamHandler: StreamHandler;
    private retryManager: RetryManager;
    private model: string;
    private systemMessage: string;
    private callerId: string;
    private usageCallback?: UsageCallback;
    private requestProcessor: RequestProcessor;
    private dataSplitter: DataSplitter;
    private settings?: UniversalChatParams['settings'];
    private usageTracker: UsageTracker;
    private streamController: StreamController;
    private chatController: ChatController;
    private toolsManager: ToolsManager;

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
        this.retryManager = new RetryManager({
            baseDelay: 1000,
            maxRetries: options?.settings?.maxRetries ?? 3
        });
        this.systemMessage = systemMessage ?? 'You are a helpful assistant.';
        this.settings = options?.settings;
        this.streamController = new StreamController(
            this.providerManager,
            this.modelManager,
            this.streamHandler,
            this.retryManager
        );

        // Initialize model
        const resolvedModel = this.modelManager.getModel(modelOrAlias);
        if (!resolvedModel) {
            throw new Error(`Model ${modelOrAlias} not found for provider ${providerName}`);
        }
        this.model = resolvedModel.name;

        this.callerId = options?.callerId ?? uuidv4();
        this.usageCallback = options?.usageCallback;
        // Initialize UsageTracker
        this.usageTracker = new UsageTracker(
            this.tokenCalculator,
            this.usageCallback,
            this.callerId
        );
        this.requestProcessor = new RequestProcessor();
        this.dataSplitter = new DataSplitter(this.tokenCalculator);

        this.chatController = new ChatController(
            this.providerManager,
            this.modelManager,
            this.responseProcessor,
            this.retryManager,
            this.usageTracker
        );

        this.chatCall = ((params: { message: string; settings?: UniversalChatParams['settings'] }) => {
            return this.chatController.execute({
                model: this.model,
                systemMessage: this.systemMessage,
                message: params.message,
                settings: this.mergeSettings(params.settings)
            });
        }).bind(this);

        this.toolsManager = new ToolsManager();
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
        // Update the UsageTracker to use the new callerId
        this.usageTracker = new UsageTracker(
            this.tokenCalculator,
            this.usageCallback,
            newId
        );
        // Also update chatController with the new usageTracker.
        this.chatController = new ChatController(
            this.providerManager,
            this.modelManager,
            this.responseProcessor,
            this.retryManager,
            this.usageTracker
        );
        // Rebind chatCall using mergeSettings so that updated settings are used.
        this.chatCall = ((params: { message: string; settings?: UniversalChatParams['settings'] }) => {
            return this.chatController.execute({
                model: this.model,
                systemMessage: this.systemMessage,
                message: params.message,
                settings: this.mergeSettings(params.settings)
            });
        }).bind(this);
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
    public chatCall: (params: { message: string; settings?: UniversalChatParams['settings'] }) => Promise<UniversalChatResponse & { content: any }>;

    /**
     * Streams a response from the LLM.
     */
    public async streamCall({
        message,
        settings,
        historicalMessages,
    }: {
        message: string;
        settings?: UniversalChatParams['settings'];
        historicalMessages?: UniversalMessage[];
    }): Promise<AsyncIterable<UniversalStreamResponse>> {
        const modelInfo = this.modelManager.getModel(this.model);
        if (!modelInfo) {
            throw new Error(`Model ${this.model} not found`);
        }
        if (modelInfo.capabilities?.streaming === false) {
            throw new Error(`Model ${this.model} does not support streaming. Use chatCall instead.`);
        }

        const mergedSettings = this.mergeSettings(settings);
        const systemMsg =
            mergedSettings?.responseFormat === 'json' || mergedSettings?.jsonSchema
                ? `${this.systemMessage}\n Provide your response in valid JSON format.`
                : this.systemMessage;

        const params: UniversalChatParams = {
            messages: [
                { role: 'system', content: systemMsg },
                ...(historicalMessages || []),
                { role: 'user', content: message }
            ],
            settings: mergedSettings,
        };

        this.responseProcessor.validateJsonMode(modelInfo, params);
        const inputTokens = this.tokenCalculator.calculateTokens(this.systemMessage + '\n' + message);
        return this.streamController.createStream(this.model, params, inputTokens);
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
        for (const [index, msg] of messages.entries()) {
            if (messages.length > 1) {
                console.log(`Processing message ${index + 1} of ${messages.length} chunks`);
            }
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
                                if (messages.length > 1) {
                                    console.log(`Processing message ${currentMessageIndex + 1} of ${totalMessages} chunks`);
                                }
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

    // Tool management methods
    public addTool(tool: ToolDefinition): void {
        this.toolsManager.addTool(tool);
    }

    public removeTool(name: string): void {
        this.toolsManager.removeTool(name);
    }

    public updateTool(name: string, updated: Partial<ToolDefinition>): void {
        this.toolsManager.updateTool(name, updated);
    }

    public listTools(): ToolDefinition[] {
        return this.toolsManager.listTools();
    }

    public getTool(name: string): ToolDefinition | undefined {
        return this.toolsManager.getTool(name);
    }
} 