import { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse, Usage, FinishReason, UniversalMessage } from '../../interfaces/UniversalInterfaces';
import { z } from 'zod';
import { ProviderManager } from './ProviderManager';
import { SupportedProviders } from '../types';
import { ModelManager } from '../models/ModelManager';
import { TokenCalculator } from '../models/TokenCalculator';
import { ResponseProcessor } from '../processors/ResponseProcessor';
import { v4 as uuidv4 } from 'uuid';
import { UsageCallback, UsageData } from '../../interfaces/UsageInterfaces';
import { RequestProcessor } from '../processors/RequestProcessor';
import { DataSplitter } from '../processors/DataSplitter';
import { RetryManager } from '../retry/RetryManager';
import { UsageTracker } from '../telemetry/UsageTracker';
import { ChatController } from '../chat/ChatController';
import { ToolsManager } from '../tools/ToolsManager';
import { ToolController } from '../tools/ToolController';
import { ToolOrchestrator } from '../tools/ToolOrchestrator';
import { ChunkController } from '../chunks/ChunkController';
import { StreamingService } from '../streaming/StreamingService';
import type { ToolDefinition, ToolCall } from '../../types/tooling';
import { StreamController } from '../streaming/StreamController';
import { HistoryManager } from '../history/HistoryManager';

/**
 * Interface that matches the StreamController's required methods
 * Used for dependency injection and adapting StreamingService
 */
interface StreamControllerInterface {
    createStream(
        model: string,
        params: UniversalChatParams,
        inputTokens: number
    ): Promise<AsyncIterable<UniversalStreamResponse>>;
}

/**
 * Options for creating an LLMCaller instance
 */
export type LLMCallerOptions = {
    apiKey?: string;
    callerId?: string;
    usageCallback?: UsageCallback;
    settings?: UniversalChatParams['settings'];
    // Dependency injection options for testing
    providerManager?: ProviderManager;
    modelManager?: ModelManager;
    streamingService?: StreamingService;
    chatController?: ChatController;
    toolsManager?: ToolsManager;
    tokenCalculator?: TokenCalculator;
    responseProcessor?: ResponseProcessor;
    retryManager?: RetryManager;
    historyManager?: HistoryManager; // Make optional in type signature for backward compatibility
};

export class LLMCaller {
    private providerManager: ProviderManager;
    private modelManager: ModelManager;
    private tokenCalculator: TokenCalculator;
    private responseProcessor: ResponseProcessor;
    private retryManager: RetryManager;
    private model: string;
    private systemMessage: string;
    private callerId: string;
    private usageCallback?: UsageCallback;
    private requestProcessor: RequestProcessor;
    private dataSplitter: DataSplitter;
    private settings?: UniversalChatParams['settings'];
    private usageTracker: UsageTracker;
    private streamingService: StreamingService;
    private chatController: ChatController;
    private toolsManager: ToolsManager;
    private toolController: ToolController;
    private toolOrchestrator: ToolOrchestrator;
    private chunkController: ChunkController;
    private historyManager: HistoryManager;

    constructor(
        providerName: SupportedProviders,
        modelOrAlias: string,
        systemMessage = 'You are a helpful assistant.',
        options?: LLMCallerOptions
    ) {
        // Initialize dependencies with dependency injection
        this.providerManager = options?.providerManager ||
            new ProviderManager(providerName, options?.apiKey);

        this.modelManager = options?.modelManager ||
            new ModelManager(providerName);

        // Initialize core processors
        this.tokenCalculator = options?.tokenCalculator ||
            new TokenCalculator();

        this.responseProcessor = options?.responseProcessor ||
            new ResponseProcessor();

        this.retryManager = options?.retryManager ||
            new RetryManager({
                baseDelay: 1000,
                maxRetries: options?.settings?.maxRetries ?? 3
            });

        this.systemMessage = systemMessage;
        this.settings = options?.settings;
        this.callerId = options?.callerId || uuidv4();
        this.usageCallback = options?.usageCallback;

        // Initialize model
        const resolvedModel = this.modelManager.getModel(modelOrAlias);
        if (!resolvedModel) {
            throw new Error(`Model ${modelOrAlias} not found for provider ${providerName}`);
        }
        this.model = resolvedModel.name;

        this.usageTracker = new UsageTracker(
            this.tokenCalculator,
            this.usageCallback,
            this.callerId
        );

        // Initialize request processors
        this.requestProcessor = new RequestProcessor();
        this.dataSplitter = new DataSplitter(this.tokenCalculator);

        // Initialize the Tools subsystem
        this.toolsManager = options?.toolsManager || new ToolsManager();

        // Initialize history manager with system message
        this.historyManager = options?.historyManager || new HistoryManager(systemMessage);

        // Initialize tool controller (doesn't depend on chat or stream controllers)
        this.toolController = new ToolController(this.toolsManager);

        // Initialize ChatController (initially without toolOrchestrator)
        this.chatController = options?.chatController || new ChatController(
            this.providerManager,
            this.modelManager,
            this.responseProcessor,
            this.retryManager,
            this.usageTracker,
            this.toolController,
            undefined, // toolOrchestrator will be set later
            this.historyManager
        );

        // Initialize stream controller adapter
        const streamControllerAdapter: StreamControllerInterface = {
            createStream: async (
                model: string,
                params: UniversalChatParams,
                inputTokens: number
            ): Promise<AsyncIterable<UniversalStreamResponse>> => {
                params.callerId = params.callerId || this.callerId;
                return this.streamingService.createStream(
                    params,
                    model,
                    params.messages.find(m => m.role === 'system')?.content
                );
            }
        };

        // Initialize ToolOrchestrator
        this.toolOrchestrator = new ToolOrchestrator(
            this.toolController,
            this.chatController,
            streamControllerAdapter as StreamController,
            this.historyManager
        );

        // Now we can update the ChatController's toolOrchestrator reference
        if (this.chatController['toolOrchestrator'] === undefined) {
            // Use private field access to update the reference
            (this.chatController as any).toolOrchestrator = this.toolOrchestrator;
        }

        // Initialize StreamingService after toolController and toolOrchestrator
        this.streamingService = options?.streamingService ||
            new StreamingService(
                this.providerManager,
                this.modelManager,
                this.historyManager,
                this.retryManager,
                this.usageCallback,
                this.callerId,
                { tokenBatchSize: 100 },
                this.toolController,
                this.toolOrchestrator
            );

        this.chunkController = new ChunkController(
            this.tokenCalculator,
            this.chatController,
            streamControllerAdapter as StreamController,
            this.historyManager,
            20
        );
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
        // Update the callerId in all relevant services
        this.streamingService.setCallerId(newId);
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
            this.usageTracker,
            this.toolController,
            this.toolOrchestrator,
            this.historyManager
        );
    }

    public setUsageCallback(callback: UsageCallback): void {
        this.usageCallback = callback;
        this.streamingService.setUsageCallback(callback);
    }

    public updateSettings(newSettings: UniversalChatParams['settings']): void {
        this.settings = { ...this.settings, ...newSettings };
    }

    private mergeSettings(methodSettings?: UniversalChatParams['settings']): UniversalChatParams['settings'] | undefined {
        if (!this.settings && !methodSettings) return undefined;
        return { ...this.settings, ...methodSettings };
    }

    // Basic chat completion method - define as a standard method
    public async chatCall(params: {
        message: string;
        settings?: UniversalChatParams['settings'];
        historicalMessages?: UniversalMessage[]
    }): Promise<UniversalChatResponse> {
        // Reset tool iteration counter at the beginning of each chat call
        this.toolController.resetIterationCount();

        if (params.historicalMessages) this.historyManager.setHistoricalMessages(params.historicalMessages);

        this.historyManager.addMessage('user', params.message);

        // Execute the base chat call
        const initialResponse = await this.chatController.execute({
            model: this.model,
            systemMessage: this.systemMessage,
            settings: this.mergeSettings(params.settings)
        });

        return initialResponse;
    }

    /**
     * Streams a response from the LLM.
     * with the system message prepended, historical messages in the middle, and the user message appended.
     */
    public async streamCall(params: Omit<UniversalChatParams, 'messages'> & {
        message?: string;
        historicalMessages?: UniversalMessage[];
        messages?: UniversalMessage[]
    }): Promise<AsyncIterable<UniversalStreamResponse>> {
        // Reset tool iteration counter at the beginning of each stream call
        this.toolController.resetIterationCount();

        let finalParams: UniversalChatParams;

        // Build the final params object based on input
        if (params.messages) {
            // If messages are provided directly, use them
            finalParams = {
                ...params,
                messages: params.messages
            };
        } else if (params.message) {
            // Store user message in history
            this.historyManager.addMessage('user', params.message);

            // Construct messages from internal historical messages or override if provided
            const historicalMessages = params.historicalMessages ||
                this.historyManager.getHistoricalMessages();

            const userMessage: UniversalMessage = {
                role: 'user',
                content: params.message
            };

            finalParams = {
                ...params,
                messages: [
                    ...historicalMessages,
                    userMessage
                ]
            };
        } else {
            throw new Error('Either messages or message must be provided');
        }

        // Ensure settings are merged
        finalParams.settings = this.mergeSettings(finalParams.settings);

        // Use the StreamingService to create the stream, which will automatically
        // use the history manager we provided in its pipeline
        return this.streamingService.createStream(
            finalParams,
            this.model,
            this.systemMessage
        );
    }

    /**
     * Processes a large message by breaking it into chunks and streaming the response.
     */
    public async stream({ message, data, endingMessage, settings }: {
        message: string;
        data?: any;
        endingMessage?: string;
        settings?: UniversalChatParams['settings'];
    }): Promise<AsyncIterable<UniversalStreamResponse>> {
        // Use the RequestProcessor to process the request
        const modelInfo = this.modelManager.getModel(this.model)!;
        const messages = await this.requestProcessor.processRequest({
            message,
            data,
            endingMessage,
            model: modelInfo,
            maxResponseTokens: settings?.maxTokens
        });


        // If there's only one chunk, just do a regular stream call
        if (messages.length === 1) {
            this.historyManager.addMessage('user', message);
            return this.streamCall({
                message: messages[0],
                settings
            });
        }

        // Use ChunkController to stream all chunks with the correct parameter structure
        return this.chunkController.streamChunks(messages, {
            model: this.model,
            systemMessage: this.systemMessage,
            settings: this.mergeSettings(settings),
            historicalMessages: this.historyManager.getHistoricalMessages()
        });
    }

    /**
     * Processes a large message by breaking it into chunks, calling the LLM for each,
     * and aggregating the results.
     */
    public async call({ message, data, endingMessage, settings }: {
        message: string;
        data?: any;
        endingMessage?: string;
        settings?: UniversalChatParams['settings'];
    }): Promise<UniversalChatResponse[]> {
        // Use the RequestProcessor to process the request
        const modelInfo = this.modelManager.getModel(this.model)!;
        const messages = await this.requestProcessor.processRequest({
            message,
            data,
            endingMessage,
            model: modelInfo,
            maxResponseTokens: settings?.maxTokens
        });

        // Add the initial user message to the history
        // this.historyManager.addMessage('user', message);

        // If there's only one chunk, just do a regular chat call
        if (messages.length === 1) {
            const response = await this.chatCall({
                message: messages[0],
                settings
            });
            return [response];
        }

        // Use ChunkController to process all chunks with the correct parameter structure
        const responses = await this.chunkController.processChunks(messages, {
            model: this.model,
            systemMessage: this.systemMessage,
            settings: this.mergeSettings(settings),
            historicalMessages: this.historyManager.getHistoricalMessages()
        });

        // Add each chunk response to our history
        responses.forEach(response => {
            this.historyManager.addMessage('assistant', response.content || '');
        });

        return responses;
    }

    // Tool management methods - delegated to ToolsManager
    public addTool(tool: ToolDefinition): void {
        // Safely add the tool using ToolsManager
        this.toolsManager.addTool(tool as any);
    }

    public removeTool(name: string): void {
        this.toolsManager.removeTool(name);
    }

    public updateTool(name: string, updated: Partial<ToolDefinition>): void {
        // Safely update the tool using ToolsManager
        this.toolsManager.updateTool(name, updated as any);
    }

    public listTools(): ToolDefinition[] {
        return this.toolsManager.listTools();
    }

    public getTool(name: string): ToolDefinition | undefined {
        return this.toolsManager.getTool(name);
    }

    // History management methods - delegated to HistoryManager

    /**
     * Gets the current historical messages
     * @returns Array of historical messages
     */
    public getHistoricalMessages(): UniversalMessage[] {
        return this.historyManager.getHistoricalMessages();
    }

    /**
     * Adds a message to the historical messages
     * @param role The role of the message sender
     * @param content The content of the message
     * @param additionalFields Additional fields to include in the message
     */
    public addMessage(
        role: 'user' | 'assistant' | 'system' | 'tool' | 'function' | 'developer',
        content: string,
        additionalFields?: Partial<UniversalMessage>
    ): void {
        this.historyManager.addMessage(role, content, additionalFields);
    }

    /**
     * Clears all historical messages
     */
    public clearHistory(): void {
        this.historyManager.clearHistory();
    }

    /**
     * Sets the historical messages
     * @param messages The messages to set
     */
    public setHistoricalMessages(messages: UniversalMessage[]): void {
        this.historyManager.setHistoricalMessages(messages);
    }

    /**
     * Gets the last message of a specific role
     * @param role The role to filter by
     * @returns The last message with the specified role, or undefined if none exists
     */
    public getLastMessageByRole(
        role: 'user' | 'assistant' | 'system' | 'tool' | 'function' | 'developer'
    ): UniversalMessage | undefined {
        return this.historyManager.getLastMessageByRole(role);
    }

    /**
     * Gets the last n messages from the history
     * @param count The number of messages to return
     * @returns The last n messages
     */
    public getLastMessages(count: number): UniversalMessage[] {
        return this.historyManager.getLastMessages(count);
    }

    /**
     * Serializes the message history to a JSON string
     * @returns A JSON string representation of the message history
     */
    public serializeHistory(): string {
        return this.historyManager.serializeHistory();
    }

    /**
     * Deserializes a JSON string into message history and replaces the current history
     * @param serialized JSON string containing serialized message history
     */
    public deserializeHistory(serialized: string): void {
        this.historyManager.deserializeHistory(serialized);
    }

    /**
     * Updates the system message and reinitializes history if requested
     * @param systemMessage The new system message
     * @param preserveHistory Whether to preserve the existing history (default: true)
     */
    public updateSystemMessage(systemMessage: string, preserveHistory = true): void {
        this.systemMessage = systemMessage;
        this.historyManager.updateSystemMessage(systemMessage, preserveHistory);
    }

    /**
     * Adds a tool call to the historical messages
     * @param toolName Name of the tool
     * @param args Arguments passed to the tool
     * @param result Result returned by the tool
     * @param error Error from tool execution, if any
     */
    public addToolCallToHistory(
        toolName: string,
        args: Record<string, unknown>,
        result?: string,
        error?: string
    ): void {
        this.historyManager.addToolCallToHistory(toolName, args, result, error);
    }

    /**
     * Gets a condensed summary of the conversation history
     * @param options Options for customizing the summary
     * @returns A summary of the conversation history
     */
    public getHistorySummary(options: {
        includeSystemMessages?: boolean;
        maxContentLength?: number;
        includeToolCalls?: boolean;
    } = {}): Array<{
        role: string;
        contentPreview: string;
        hasToolCalls: boolean;
        timestamp?: number;
    }> {
        return this.historyManager.getHistorySummary(options);
    }
} 