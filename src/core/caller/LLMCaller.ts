import {
    UniversalChatParams,
    UniversalChatResponse,
    UniversalStreamResponse,
    Usage,
    FinishReason,
    UniversalMessage,
    // Import the new types
    UniversalChatSettings,
    LLMCallOptions,
    JSONSchemaDefinition,
    ResponseFormat,
    HistoryMode
} from '../../interfaces/UniversalInterfaces';
import { z } from 'zod';
import { ProviderManager } from './ProviderManager';
import { RegisteredProviders } from '../../adapters/index';
import { ProviderNotFoundError } from '../../adapters/types';
import { ModelManager } from '../models/ModelManager';
import { TokenCalculator } from '../models/TokenCalculator';
import { ResponseProcessor } from '../processors/ResponseProcessor';
import { v4 as uuidv4 } from 'uuid';
import { UsageCallback } from '../../interfaces/UsageInterfaces';
import { RequestProcessor } from '../processors/RequestProcessor';
import { DataSplitter } from '../processors/DataSplitter';
import { RetryManager } from '../retry/RetryManager';
import { UsageTracker } from '../telemetry/UsageTracker';
import { ChatController } from '../chat/ChatController';
import { ToolsManager } from '../tools/ToolsManager';
import { ToolController } from '../tools/ToolController';
import { ToolOrchestrator } from '../tools/ToolOrchestrator';
import { ChunkController, ChunkProcessingParams } from '../chunks/ChunkController';
import { StreamingService } from '../streaming/StreamingService';
import type { ToolDefinition, ToolCall } from '../../types/tooling';
import { StreamController } from '../streaming/StreamController';
import { HistoryManager } from '../history/HistoryManager';
import { logger } from '../../utils/logger';
import { PromptEnhancer } from '../prompt/PromptEnhancer';

/**
 * Interface that matches the StreamController's required methods
 * Used for dependency injection and adapting StreamingService
 */
interface StreamControllerInterface {
    createStream(
        model: string,
        params: UniversalChatParams,
        inputTokens: number // Might be calculated within the service now
    ): Promise<AsyncIterable<UniversalStreamResponse>>;
}

/**
 * Options for creating an LLMCaller instance
 */
export type LLMCallerOptions = {
    apiKey?: string;
    callerId?: string;
    usageCallback?: UsageCallback;
    // Use the refined UniversalChatSettings here for initial settings
    settings?: UniversalChatSettings;
    // Default history mode for all calls
    historyMode?: HistoryMode;
    // Dependency injection options for testing
    providerManager?: ProviderManager;
    modelManager?: ModelManager;
    streamingService?: StreamingService;
    chatController?: ChatController;
    toolsManager?: ToolsManager;
    tokenCalculator?: TokenCalculator;
    responseProcessor?: ResponseProcessor;
    retryManager?: RetryManager;
    historyManager?: HistoryManager;
};

/**
 * Main LLM Caller class
 */
export class LLMCaller {
    private providerManager: ProviderManager;
    private modelManager: ModelManager;
    private tokenCalculator: TokenCalculator;
    private responseProcessor: ResponseProcessor;
    private retryManager: RetryManager;
    private model: string;
    private systemMessage: string; // Keep track of the initial system message
    private callerId: string;
    private usageCallback?: UsageCallback;
    private requestProcessor: RequestProcessor;
    private dataSplitter: DataSplitter;
    // Store initial settings using the refined type
    private initialSettings?: UniversalChatSettings;
    private usageTracker: UsageTracker;
    private streamingService!: StreamingService;
    private chatController!: ChatController;
    private toolsManager: ToolsManager;
    private toolController: ToolController;
    private toolOrchestrator!: ToolOrchestrator;
    private chunkController!: ChunkController;
    private historyManager: HistoryManager; // HistoryManager now manages system message internally
    private historyMode: HistoryMode; // Store the default history mode

    constructor(
        providerName: RegisteredProviders,
        modelOrAlias: string,
        systemMessage = 'You are a helpful assistant.',
        options?: LLMCallerOptions
    ) {
        // Initialize dependencies that don't depend on each other first
        this.providerManager = options?.providerManager ||
            new ProviderManager(providerName as RegisteredProviders, options?.apiKey);
        this.modelManager = options?.modelManager ||
            new ModelManager(providerName as RegisteredProviders);
        this.tokenCalculator = options?.tokenCalculator ||
            new TokenCalculator();
        this.responseProcessor = options?.responseProcessor ||
            new ResponseProcessor();
        this.retryManager = options?.retryManager ||
            new RetryManager({
                baseDelay: 1000,
                maxRetries: options?.settings?.maxRetries ?? 3
            });
        this.dataSplitter = new DataSplitter(this.tokenCalculator);
        this.initialSettings = options?.settings;
        this.callerId = options?.callerId || uuidv4();
        this.usageCallback = options?.usageCallback;
        this.historyMode = options?.historyMode || 'stateless';
        this.systemMessage = systemMessage;
        this.historyManager = options?.historyManager || new HistoryManager(systemMessage);
        this.toolsManager = options?.toolsManager || new ToolsManager();
        this.usageTracker = new UsageTracker(this.tokenCalculator, this.usageCallback, this.callerId);
        this.requestProcessor = new RequestProcessor();
        this.toolController = new ToolController(this.toolsManager);

        const resolvedModel = this.modelManager.getModel(modelOrAlias);
        if (!resolvedModel) throw new Error(`Model ${modelOrAlias} not found for provider ${providerName}`);
        this.model = resolvedModel.name;

        // **Initialize StreamingService early**
        this.streamingService = options?.streamingService ||
            new StreamingService(
                this.providerManager, this.modelManager, this.historyManager, this.retryManager,
                this.usageCallback, this.callerId, { tokenBatchSize: 100 }, this.toolController,
                undefined // toolOrchestrator is set later
            );

        // **Initialize ChatController (without orchestrator initially)**
        this.chatController = options?.chatController || new ChatController(
            this.providerManager, this.modelManager, this.responseProcessor, this.retryManager,
            this.usageTracker, this.toolController,
            undefined, // Pass undefined for toolOrchestrator for now
            this.historyManager
        );

        // **Create the adapter using initialized streamingService**
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        const streamControllerAdapter: StreamControllerInterface = {
            createStream: async (
                model: string,
                params: UniversalChatParams,
                inputTokens: number
            ): Promise<AsyncIterable<UniversalStreamResponse>> => {
                params.callerId = params.callerId || self.callerId;
                if (!self.streamingService) {
                    throw new Error('StreamingService is not initialized');
                }
                return self.streamingService.createStream(params, model, undefined);
            }
        };

        // **Initialize ToolOrchestrator, passing the ChatController**
        this.toolOrchestrator = new ToolOrchestrator(
            this.toolController,
            this.chatController, // Pass the initialized chatController
            streamControllerAdapter as StreamController,
            this.historyManager
        );

        // **Link ToolOrchestrator back to ChatController**
        (this.chatController as any).toolOrchestrator = this.toolOrchestrator;

        // **Link ToolOrchestrator back to StreamingService (if not mocked)**
        if (!(options?.streamingService)) {
            this.streamingService.setToolOrchestrator(this.toolOrchestrator);
        }

        // Initialize ChunkController (now all dependencies should be ready)
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
        provider?: RegisteredProviders;
        nameOrAlias: string;
        apiKey?: string;
    }): void {
        const { provider, nameOrAlias, apiKey } = options;

        if (provider) {
            this.providerManager.switchProvider(provider as RegisteredProviders, apiKey);
            this.modelManager = new ModelManager(provider as RegisteredProviders);
        }

        // Resolve and set new model
        const resolvedModel = this.modelManager.getModel(nameOrAlias);
        if (!resolvedModel) {
            throw new Error(`Model ${nameOrAlias} not found in provider ${provider || this.providerManager.getCurrentProviderName()}`);
        }
        const modelChanged = this.model !== resolvedModel.name;
        this.model = resolvedModel.name;

        // If provider changed, we need to re-initialize dependent components
        if (provider) {
            this.reinitializeControllers();
        }
        // If only the model changed, typically controllers don't need full re-init,
        // as the model name is passed per-request.
    }

    // Helper to re-initialize controllers after major changes (e.g., provider switch)
    private reinitializeControllers(): void {
        // Re-initialize ChatController
        this.chatController = new ChatController(
            this.providerManager,
            this.modelManager,
            this.responseProcessor,
            this.retryManager,
            this.usageTracker,
            this.toolController,
            undefined, // Orchestrator needs to be re-linked
            this.historyManager
        );

        // Re-initialize StreamingService
        this.streamingService = new StreamingService(
            this.providerManager,
            this.modelManager,
            this.historyManager,
            this.retryManager,
            this.usageCallback,
            this.callerId,
            { tokenBatchSize: 100 },
            this.toolController,
            this.toolOrchestrator // ToolOrchestrator itself might not need re-init if its deps are stable
        );

        // Re-link ToolOrchestrator to the new ChatController instance
        // The adapter used by ToolOrchestrator also needs to point to the new StreamingService
        const streamControllerAdapter: StreamControllerInterface = {
            createStream: async (
                model: string,
                params: UniversalChatParams,
                inputTokens: number
            ): Promise<AsyncIterable<UniversalStreamResponse>> => {
                params.callerId = params.callerId || this.callerId;

                // Check if streamingService exists before trying to access it
                if (!this.streamingService) {
                    throw new Error('StreamingService is not initialized');
                }

                return this.streamingService.createStream(params, model, undefined);
            }
        };
        this.toolOrchestrator = new ToolOrchestrator(
            this.toolController,
            this.chatController,
            streamControllerAdapter as StreamController,
            this.historyManager
        );

        // Link the new orchestrator back to the new chat controller
        (this.chatController as any).toolOrchestrator = this.toolOrchestrator; // Use workaround if no setter

        // Link orchestrator to StreamingService using the proper setter
        this.streamingService.setToolOrchestrator(this.toolOrchestrator);

        // Re-initialize ChunkController with the new ChatController and adapter
        this.chunkController = new ChunkController(
            this.tokenCalculator,
            this.chatController,
            streamControllerAdapter as StreamController,
            this.historyManager,
            20 // Keep batch size or make configurable
        );
    }


    // Add methods to manage ID and callback
    public setCallerId(newId: string): void {
        this.callerId = newId;

        // Update the UsageTracker to use the new callerId
        this.usageTracker = new UsageTracker(
            this.tokenCalculator,
            this.usageCallback,
            newId
        );

        // Update components that depend on UsageTracker or callerId
        // Re-initialize controllers as they depend on usageTracker
        this.reinitializeControllers();
    }

    public setUsageCallback(callback: UsageCallback): void {
        this.usageCallback = callback;

        // Update the UsageTracker to use the new callback
        this.usageTracker = new UsageTracker(
            this.tokenCalculator,
            callback, // Pass new callback
            this.callerId
        );

        // Re-initialize controllers as they depend on usageTracker/usageCallback
        this.reinitializeControllers();
    }

    public updateSettings(newSettings: UniversalChatSettings): void {
        // Update the stored initial/class-level settings
        const oldMaxRetries = this.initialSettings?.maxRetries ?? 3;
        this.initialSettings = { ...this.initialSettings, ...newSettings };

        // Update RetryManager if maxRetries changed
        const newMaxRetries = this.initialSettings?.maxRetries ?? 3;
        if (newSettings.maxRetries !== undefined && newMaxRetries !== oldMaxRetries) {
            this.retryManager = new RetryManager({
                baseDelay: 1000, // Or get from existing config
                maxRetries: newMaxRetries
            });
            // Re-initialize controllers as they depend on retryManager
            this.reinitializeControllers();
        }
        // Other settings changes usually don't require controller re-initialization
        // as they are passed per-request via the settings object.
    }

    // Merge initial/class-level settings with method-level settings
    private mergeSettings(methodSettings?: UniversalChatSettings): UniversalChatSettings | undefined {
        if (!this.initialSettings && !methodSettings) return undefined;
        // Method settings take precedence
        return { ...this.initialSettings, ...methodSettings };
    }

    // Merge the history mode setting from class-level and method-level options
    private mergeHistoryMode(methodHistoryMode?: HistoryMode): HistoryMode {
        // Method-level setting takes precedence over class-level setting
        return methodHistoryMode || this.historyMode;
    }

    // Basic chat completion method - internal helper
    private async internalChatCall<T extends z.ZodType<any, z.ZodTypeDef, any>>(
        params: UniversalChatParams
    ): Promise<UniversalChatResponse> {
        this.toolController.resetIterationCount(); // Reset tool iteration

        // Ensure essential parameters are present
        params.callerId = params.callerId || this.callerId;
        params.model = params.model || this.model;
        // System message is typically part of params.messages handled by HistoryManager

        // Pass params excluding systemMessage if ChatController doesn't expect it explicitly
        // Assuming ChatController gets system message from params.messages
        const { systemMessage, ...paramsForController } = params;

        // Ensure the type passed matches ChatController.execute's expectation
        const response = await this.chatController.execute(paramsForController as any); // Cast needed if signature mismatch persists

        return response;
    }


    /**
     * Internal streaming method.
     */
    private async internalStreamCall(
        // Takes the full parameter object
        params: UniversalChatParams
    ): Promise<AsyncIterable<UniversalStreamResponse>> {
        this.toolController.resetIterationCount(); // Reset tool iteration

        // Ensure essential parameters are present
        params.callerId = params.callerId || this.callerId;
        params.model = params.model || this.model;

        // Calculate tokens for usage tracking
        const inputTokens = await this.tokenCalculator.calculateTotalTokens(params.messages);

        // Use the StreamingService to create the stream
        try {
            return await this.streamingService.createStream(
                params,
                params.model,
                undefined  // System message comes from history manager via params
            );
        } catch (error) {
            // Enhance error with context
            if (error instanceof ProviderNotFoundError) {
                throw new Error(`Provider for model "${params.model}" not found in registry`);
            }
            throw error;
        }
    }


    /**
     * Processes a message and streams the response.
     * This is the standardized public API for streaming responses.
     * @param input A string message or array of messages to process
     * @param options Optional settings for the call
     */
    public async *stream<T extends z.ZodType<any, z.ZodTypeDef, any> = z.ZodType<any, z.ZodTypeDef, any>>(
        input: string | UniversalMessage[],
        options: LLMCallOptions = {}
    ): AsyncGenerator<UniversalStreamResponse<T extends z.ZodType<any, z.ZodTypeDef, any> ? z.TypeOf<T> : unknown>> {
        const { data, endingMessage, settings, jsonSchema, responseFormat, tools, historyMode } = options;

        // Reset tool call tracking at the beginning of each stream call
        if (this.toolOrchestrator) {
            this.toolOrchestrator.resetCalledTools();
        }

        // Use the RequestProcessor to process the request (handles chunking if needed)
        const modelInfo = this.modelManager.getModel(this.model);
        if (!modelInfo) {
            throw new Error(`Model ${this.model} not found`);
        }

        // Convert string message to UniversalMessage array if needed
        const messages = typeof input === 'string'
            ? [{ role: 'user', content: input }]
            : input;

        // Get message content for processing
        const messageContent = typeof input === 'string'
            ? input
            : messages.map(m => m.content || '').join('\n');

        const processedMessages = await this.requestProcessor.processRequest({
            message: messageContent,
            data,
            endingMessage,
            model: modelInfo,
            maxResponseTokens: settings?.maxTokens
        });

        const effectiveTools = tools ?? this.toolsManager.listTools();
        const mergedSettings = this.mergeSettings(settings);
        // Get the effective history mode
        const effectiveHistoryMode = this.mergeHistoryMode(historyMode);

        // If mergedSettings exists, add the history mode to it
        if (mergedSettings) {
            mergedSettings.historyMode = effectiveHistoryMode;
        }

        // Check if we're in stateless mode, where we only send the current message
        // In this case, we need to make sure the system message is included
        if (effectiveHistoryMode?.toLowerCase() === 'stateless') {
            this.historyManager.initializeWithSystemMessage();
        }

        // Add the original user message to history *before* the call
        this.historyManager.addMessage('user', messageContent, { metadata: { timestamp: Date.now() } });

        // Get the messages from history
        let historyMessages = this.historyManager.getHistoricalMessages();

        // Check if JSON is requested and whether to use native mode
        const jsonRequested = responseFormat === 'json' || jsonSchema !== undefined;
        const modelSupportsJsonMode = modelInfo.capabilities?.jsonMode ?? false;
        const useNativeJsonMode = modelSupportsJsonMode && jsonRequested &&
            !(settings?.jsonMode === 'force-prompt');

        // When streaming JSON, we need to ensure we're using the direct streaming path
        // even if native JSON mode is supported
        if (useNativeJsonMode) {
            // For JSON streaming, we need to use the direct streaming path if we're in stream()
            // but for call(), we use the regular JSON path
            const params: UniversalChatParams = {
                model: this.model,
                messages: historyMessages,
                settings: mergedSettings,
                jsonSchema: jsonSchema,
                responseFormat: 'json', // Keep using simple 'json' format
                tools: effectiveTools,
                historyMode: effectiveHistoryMode
            };

            // Use direct streaming for JSON with schema in stream()
            const stream = await this.internalStreamCall(params);
            yield* stream as AsyncIterable<UniversalStreamResponse<T extends z.ZodType<any, z.ZodTypeDef, any> ? z.TypeOf<T> : unknown>>;
            return;
        }

        // Use direct streaming when there's only one message (no chunking needed)
        if (processedMessages.length === 1) {
            const params: UniversalChatParams = {
                model: this.model,
                messages: historyMessages,
                settings: mergedSettings,
                jsonSchema: jsonSchema,
                responseFormat: responseFormat,
                tools: effectiveTools,
                historyMode: effectiveHistoryMode
            };

            // Use direct streaming via StreamingService
            const stream = await this.internalStreamCall(params);
            yield* stream as AsyncIterable<UniversalStreamResponse<T extends z.ZodType<any, z.ZodTypeDef, any> ? z.TypeOf<T> : unknown>>;
            return;
        }

        // If chunking occurred, use ChunkController
        const historyForChunks = this.historyManager.getHistoricalMessages(); // Get history *before* the latest user msg

        // ChunkController processes chunks and returns responses
        const responses = await this.chunkController.processChunks(processedMessages, {
            model: this.model,
            settings: mergedSettings,
            jsonSchema: jsonSchema,
            responseFormat: responseFormat,
            tools: effectiveTools,
            historicalMessages: historyForChunks
        });

        // Add assistant responses from all chunks to history AFTER all chunks are processed
        // This ensures history is consistent after the multi-chunk operation completes
        // BUT skip this history addition for tool calls, as the ChatController already adds these
        if (responses.length > 1) {
            responses.forEach(response => {
                // Only add non-tool response messages, since tool messages are already added in ChatController
                if (response.content && (!response.toolCalls || response.toolCalls.length === 0) &&
                    response.metadata?.finishReason !== 'tool_calls') {
                    this.historyManager.addMessage('assistant', response.content);
                }
            });
        }

        // Reset history if stateless mode was used for this call
        if (effectiveHistoryMode?.toLowerCase() === 'stateless') {
            this.historyManager.initializeWithSystemMessage();
        }

        // Convert array of responses to stream format
        for (let i = 0; i < responses.length; i++) {
            const response = responses[i];
            const isLast = i === responses.length - 1;

            const streamResponse: UniversalStreamResponse<T extends z.ZodType<any, z.ZodTypeDef, any> ? z.TypeOf<T> : unknown> = {
                content: response.content || '',
                contentText: isLast ? response.content || '' : undefined,
                contentObject: isLast ? response.contentObject as T extends z.ZodType<any, z.ZodTypeDef, any> ? z.TypeOf<T> : unknown : undefined,
                role: response.role,
                isComplete: isLast,
                messages: historyMessages,
                toolCalls: response.toolCalls,
                metadata: {
                    ...response.metadata,
                    processInfo: {
                        currentChunk: i + 1,
                        totalChunks: responses.length
                    }
                }
            };

            yield streamResponse;
        }
    }

    /**
     * Processes a message and returns the response(s).
     * This is the standardized public API for getting responses.
     */
    public async call<T extends z.ZodType<any, z.ZodTypeDef, any> = z.ZodType<any, z.ZodTypeDef, any>>(
        message: string,
        // Use the new LLMCallOptions type
        options: LLMCallOptions = {}
    ): Promise<UniversalChatResponse[]> {
        const { data, endingMessage, settings, jsonSchema, responseFormat, tools, historyMode } = options;

        // Reset tool call tracking at the beginning of each call
        if (this.toolOrchestrator) {
            this.toolOrchestrator.resetCalledTools();
        }

        // Use the RequestProcessor to process the request
        const modelInfo = this.modelManager.getModel(this.model);
        if (!modelInfo) {
            throw new Error(`Model ${this.model} not found`);
        }
        const processedMessages = await this.requestProcessor.processRequest({
            message,
            data,
            endingMessage,
            model: modelInfo,
            maxResponseTokens: settings?.maxTokens
        });

        const effectiveTools = tools ?? this.toolsManager.listTools();
        const mergedSettings = this.mergeSettings(settings);
        // Get the effective history mode
        const effectiveHistoryMode = this.mergeHistoryMode(historyMode);

        // If mergedSettings exists, add the history mode to it
        if (mergedSettings) {
            mergedSettings.historyMode = effectiveHistoryMode;
        }

        // If in stateless mode, get system message only
        if (effectiveHistoryMode?.toLowerCase() === 'stateless') {
            this.historyManager.initializeWithSystemMessage();
        }


        // Add the original user message to history *before* the call
        this.historyManager.addMessage('user', message, { metadata: { timestamp: Date.now() } });

        // Get the messages from history
        let messages = this.historyManager.getHistoricalMessages();

        // Check if JSON is requested and whether to use native mode
        const jsonRequested = responseFormat === 'json' || jsonSchema !== undefined;
        const modelSupportsJsonMode = modelInfo.capabilities?.jsonMode ?? false;
        const useNativeJsonMode = modelSupportsJsonMode && jsonRequested &&
            !(settings?.jsonMode === 'force-prompt');

        // If there's only one chunk (no splitting occurred)
        if (processedMessages.length === 1) {
            const params: UniversalChatParams = {
                model: this.model,
                messages: messages,
                settings: mergedSettings,
                jsonSchema: jsonSchema,
                responseFormat: useNativeJsonMode ? 'json' : (jsonSchema ? 'text' : responseFormat),
                tools: effectiveTools,
                callerId: this.callerId,
                historyMode: effectiveHistoryMode
            };
            // History update for assistant happens inside internalChatCall
            const response = await this.internalChatCall<T>(params);
            return [response]; // Convert single response to array
        }

        // If chunking occurred, use ChunkController
        const historyForChunks = this.historyManager.getHistoricalMessages(); // Get history *before* the latest user msg

        // ChunkController processes chunks and returns responses
        const responses = await this.chunkController.processChunks(processedMessages, {
            model: this.model,
            settings: mergedSettings,
            jsonSchema: jsonSchema,
            responseFormat: responseFormat,
            tools: effectiveTools,
            historicalMessages: historyForChunks
        });

        // Add assistant responses from all chunks to history AFTER all chunks are processed
        // This ensures history is consistent after the multi-chunk operation completes
        // BUT skip this history addition for tool calls, as the ChatController already adds these
        if (processedMessages.length > 1) {
            responses.forEach(response => {
                // Only add non-tool response messages, since tool messages are already added in ChatController
                if (response.content && (!response.toolCalls || response.toolCalls.length === 0) &&
                    response.metadata?.finishReason !== 'tool_calls') {
                    this.historyManager.addMessage('assistant', response.content);
                }
            });
        }

        // Reset history if stateless mode was used for this call
        if (effectiveHistoryMode?.toLowerCase() === 'stateless') {
            this.historyManager.initializeWithSystemMessage();
        }

        return responses;
    }

    // Tool management methods - delegated to ToolsManager
    public addTool(tool: ToolDefinition): void {
        this.toolsManager.addTool(tool);
    }

    public addTools(tools: ToolDefinition[]): void {
        this.toolsManager.addTools(tools);
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

    // History management methods - delegated to HistoryManager

    /**
     * Gets the current historical messages (excluding the initial system message unless requested)
     * Check HistoryManager implementation for exact behavior.
     * @returns Array of historical messages (typically user/assistant/tool roles)
     */
    public getHistoricalMessages(): UniversalMessage[] {
        return this.historyManager.getHistoricalMessages();
    }

    /**
     * Gets all messages including the system message.
     * @returns Array of all messages.
     */
    public getMessages(): UniversalMessage[] {
        // Use the HistoryManager's getMessages method which already includes the system message
        return this.historyManager.getMessages();
    }


    /**
     * Adds a message to the historical messages
     * @param role The role of the message sender
     * @param content The content of the message
     * @param additionalFields Additional fields to include in the message (e.g., toolCalls, toolCallId)
     */
    public addMessage(
        role: 'user' | 'assistant' | 'system' | 'tool' | 'function' | 'developer',
        content: string | null, // Allow null content, e.g., for assistant messages with only tool calls
        additionalFields?: Partial<UniversalMessage>
    ): void {
        // History manager should handle null content appropriately
        this.historyManager.addMessage(role, content ?? '', additionalFields);
    }

    /**
     * Clears all historical messages, including the system message.
     * Use updateSystemMessage to reset the system message if needed.
     */
    public clearHistory(): void {
        this.historyManager.clearHistory();
        // Re-add the initial system message after clearing if desired
        this.historyManager.addMessage('system', this.systemMessage);
    }

    /**
     * Sets the historical messages, replacing existing ones.
     * Note: This typically replaces the system message as well if present in the input array.
     * Consider using clearHistory and addMessage if you want to preserve the original system message.
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
        // Update the local systemMessage variable if the deserialized history contains a system message
        const systemMsgInHistory = this.historyManager.getHistoricalMessages().find((m: UniversalMessage) => m.role === 'system');
        this.systemMessage = systemMsgInHistory ? systemMsgInHistory.content : 'You are a helpful assistant.'; // Use default if none found
    }

    /**
     * Updates the system message in the history.
     * @param systemMessage The new system message
     * @param preserveHistory Whether to keep the rest of the history (default: true)
     */
    public updateSystemMessage(systemMessage: string, preserveHistory = true): void {
        // Update the local variable as well
        this.systemMessage = systemMessage;
        this.historyManager.updateSystemMessage(systemMessage, preserveHistory);
    }

    /**
     * Adds a tool result to the message history
     * @param toolCallId The ID of the tool call (MUST match the exact ID provided by the LLM)
     * @param result The stringified result returned by the tool
     * @param isError Optional flag indicating if the result is an error message
     */
    public addToolResult(
        toolCallId: string,
        result: string,
        toolName?: string, // Make name optional as it might not always be needed by the role message
        isError = false // Consider how to represent errors in the content string
    ): void {
        const content = isError ? `Error processing tool ${toolName || 'call'}: ${result}` : result;

        // Ensure we have a valid toolCallId that exactly matches the original assistant message's tool call
        // This is crucial for OpenAI to recognize the response is linked to the original tool call
        if (!toolCallId) {
            logger.warn('Adding tool result without toolCallId - this may cause message history issues');
            this.historyManager.addMessage('tool', content, { name: toolName });
            return;
        }

        // OpenAI format requires role: 'tool', tool_call_id: exact_id, and content: result
        // This is enforced through our adapter layer
        this.historyManager.addMessage('tool', content, { toolCallId, name: toolName });

        // Log for debugging
        logger.debug(`Added tool result for ${toolCallId} with content ${content.substring(0, 30)}...`);
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
        hasToolCalls: boolean; // Indicates if the original message had tool calls *requested*
        timestamp?: number; // Timestamp from message metadata if available
    }> {
        return this.historyManager.getHistorySummary(options);
    }

    // Deprecate old addToolCallToHistory if addToolResult is preferred
    /** @deprecated Use addToolResult instead */
    public addToolCallToHistory(
        toolName: string,
        args: Record<string, unknown>, // Keep old signature for compatibility if needed
        result?: string,
        error?: string
    ): void {
        // Basic adaptation: Assumes a single tool call/result structure
        // This might need a more robust mapping if the old usage was complex
        const toolCallId = `deprecated_tool_${Date.now()}`; // Generate a placeholder ID
        const content = error ? `Error: ${error}` : result ?? 'Tool executed successfully (no textual result).';
        this.addToolResult(toolCallId, content, toolName, !!error);
    }

    /**
     * Gets the HistoryManager instance for direct operations
     * @returns The HistoryManager instance
     */
    public getHistoryManager(): HistoryManager {
        return this.historyManager;
    }

} 