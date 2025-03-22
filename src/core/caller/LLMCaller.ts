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
import type { ToolDefinition, ToolCall } from '../types';
import { ToolController } from '../tools/ToolController';
import { ToolOrchestrator } from '../tools/ToolOrchestrator';
import { ChunkController } from '../chunks/ChunkController';

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
    private toolController: ToolController;
    private toolOrchestrator: ToolOrchestrator;
    private chunkController: ChunkController;

    constructor(
        providerName: SupportedProviders,
        modelOrAlias: string,
        systemMessage = 'You are a helpful assistant.',
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
            this.responseProcessor,
            options?.usageCallback,
            options?.callerId
        );
        this.retryManager = new RetryManager({
            baseDelay: 1000,
            maxRetries: options?.settings?.maxRetries ?? 3
        });
        this.systemMessage = systemMessage;
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

        this.toolsManager = new ToolsManager();
        this.toolController = new ToolController(this.toolsManager);
        this.toolOrchestrator = new ToolOrchestrator(this.toolController, this.chatController, this.streamController);
        this.chunkController = new ChunkController(this.tokenCalculator, this.chatController, this.streamController, 20);

        this.chatCall = (async (params: {
            message: string;
            settings?: UniversalChatParams['settings'];
            historicalMessages?: UniversalMessage[];
        }) => {
            // Create messages array with historical messages and the current message
            const messages: UniversalMessage[] = [
                ...(params.historicalMessages || []),
                { role: 'user', content: params.message }
            ];

            // Execute the base chat call
            const initialResponse = await this.chatController.execute({
                model: this.model,
                systemMessage: this.systemMessage,
                settings: this.mergeSettings(params.settings),
                historicalMessages: messages
            });

            // Delegate tool orchestration completely to ToolOrchestrator
            const orchestrationResult = await this.toolOrchestrator.processResponse(
                initialResponse,
                {
                    model: this.model,
                    systemMessage: this.systemMessage,
                    historicalMessages: messages,
                    settings: this.mergeSettings(params.settings)
                }
            );
            return orchestrationResult.finalResponse;
        }).bind(this);
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
        // Create new streamHandler with updated ID
        this.streamHandler = new StreamHandler(
            this.tokenCalculator,
            this.responseProcessor,
            this.usageCallback,
            newId
        );
        // Update the UsageTracker to use the new callerId
        this.usageTracker = new UsageTracker(
            this.tokenCalculator,
            this.usageCallback,
            newId
        );
        // Also update chatController with the new usageTracker
        this.chatController = new ChatController(
            this.providerManager,
            this.modelManager,
            this.responseProcessor,
            this.retryManager,
            this.usageTracker
        );
        // Update streamController with new streamHandler
        this.streamController = new StreamController(
            this.providerManager,
            this.modelManager,
            this.streamHandler,
            this.retryManager
        );
        // Rebind chatCall using mergeSettings so that updated settings are used
        this.chatCall = ((params: { message: string; settings?: UniversalChatParams['settings'] }) => {
            return this.chatController.execute({
                model: this.model,
                systemMessage: this.systemMessage,
                settings: this.mergeSettings(params.settings),
                historicalMessages: [{ role: 'user', content: params.message }]
            });
        }).bind(this);
    }

    public setUsageCallback(callback: UsageCallback): void {
        this.usageCallback = callback;
        this.streamHandler = new StreamHandler(
            this.tokenCalculator,
            this.responseProcessor,
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
    public chatCall: (params: { message: string; settings?: UniversalChatParams['settings']; historicalMessages?: UniversalMessage[] }) => Promise<UniversalChatResponse & { content: any }>;

    /**
     * Streams a response from the LLM.
     * If legacy parameters are provided (message and historicalMessages), they will be converted to a messages array
     * with the system message prepended, historical messages in the middle, and the user message appended.
     */
    public async streamCall(params: Omit<UniversalChatParams, 'messages'> & { message?: string; historicalMessages?: UniversalMessage[]; messages?: UniversalMessage[] }): Promise<AsyncIterable<UniversalStreamResponse>> {
        let finalParams: UniversalChatParams;

        // Build messages: system message, historical messages, then user message (or last message from params.messages if provided)
        const userMsg: string = params.message ?? "";
        const history: UniversalMessage[] = params.historicalMessages ?? [];
        const messages: UniversalMessage[] = [
            { role: 'system', content: this.systemMessage },
            ...history
        ];

        if (userMsg) {
            messages.push({ role: 'user', content: userMsg });
        } else if (params.messages?.length) {
            messages.push(params.messages[params.messages.length - 1]);
        }

        const { message: _, historicalMessages: __, messages: ___, ...rest } = params;
        finalParams = {
            ...rest,
            messages,
            callerId: this.callerId // Ensure callerId is passed through
        } as UniversalChatParams;

        // Merge settings and add defaults
        const modelInfo = this.modelManager.getModel(this.model)!;
        finalParams.settings = { maxTokens: modelInfo.maxResponseTokens, ...this.mergeSettings(finalParams.settings) };

        const inputText = finalParams.messages.map(msg => msg.content).join("\n");
        const inputTokens = this.tokenCalculator.calculateTokens(this.systemMessage + "\n" + inputText);

        // Create a new streamHandler with the current callerId
        const streamHandler = new StreamHandler(
            this.tokenCalculator,
            this.responseProcessor,
            this.usageCallback,
            this.callerId
        );

        // Create a new streamController with the updated streamHandler
        const streamController = new StreamController(
            this.providerManager,
            this.modelManager,
            streamHandler,
            this.retryManager
        );

        // Obtain an initial response from chatController (non-streaming) to extract tool call markers
        const initialResponse = await this.chatController.execute({
            model: this.model,
            systemMessage: this.systemMessage,
            settings: finalParams.settings,
            historicalMessages: messages,
            callerId: this.callerId
        });

        // Create a new toolOrchestrator with the updated streamController
        const toolOrchestrator = new ToolOrchestrator(
            this.toolController,
            this.chatController,
            streamController
        );

        // Delegate the streaming tool orchestration to the new toolOrchestrator
        return toolOrchestrator.streamProcessResponse(initialResponse, {
            model: this.model,
            systemMessage: this.systemMessage,
            historicalMessages: messages,
            settings: finalParams.settings,
            callerId: this.callerId
        }, inputTokens);
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

        // Use ChunkController to handle processing instead of manual implementation
        return this.chunkController.processChunks(messages, {
            model: this.model,
            systemMessage: this.systemMessage,
            settings: this.mergeSettings(settings)
        });
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

        // Use ChunkController to handle streaming instead of manual implementation
        return this.chunkController.streamChunks(messages, {
            model: this.model,
            systemMessage: this.systemMessage,
            settings: this.mergeSettings(settings)
        });
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