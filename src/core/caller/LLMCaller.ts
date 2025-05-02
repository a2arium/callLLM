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
import { ToolsFolderLoader } from '../tools/toolLoader/ToolsFolderLoader';
import type { StringOrDefinition } from '../tools/toolLoader/types';
import type { MCPDirectAccess } from '../mcp/MCPDirectAccess';
import type { McpToolSchema, MCPServersMap } from '../mcp/MCPConfigTypes';
import { isMCPToolConfig } from '../mcp/MCPConfigTypes';
import { MCPServiceAdapter } from '../mcp/MCPServiceAdapter';
import { MCPToolLoader } from '../mcp/MCPToolLoader';

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
    // Directory containing tool function files
    toolsDir?: string;
    // Add the tools option
    tools?: (ToolDefinition | string | MCPServersMap)[];
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
export class LLMCaller implements MCPDirectAccess {
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
    private folderLoader?: ToolsFolderLoader;
    // Lazy-initialized MCP client manager
    private _mcpAdapter: MCPServiceAdapter | null = null;

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

        // Initialize the folder loader if toolsDir is provided
        if (options?.toolsDir) {
            this.folderLoader = new ToolsFolderLoader(options.toolsDir);
        }

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

        // **Link ToolOrchestrator back to StreamingService using the setter method**
        // This ensures the internal StreamHandler within StreamingService is updated.
        this.streamingService.setToolOrchestrator(this.toolOrchestrator);

        // Initialize ChunkController (now all dependencies should be ready)
        this.chunkController = new ChunkController(
            this.tokenCalculator,
            this.chatController,
            streamControllerAdapter as StreamController,
            this.historyManager,
            20
        );

        // Add tools if provided in options, after core components are set up
        if (options?.tools && options.tools.length > 0) {
            // Call addTools but don't await it here to keep constructor synchronous
            // Note: Tools might not be fully loaded/connected immediately after constructor returns.
            this.addTools(options.tools).catch(err => {
                // Log error if initial tool loading fails
                logger.error('Error adding tools during LLMCaller initialization:', err);
            });
        }
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
            undefined // Don't pass toolOrchestrator here, use the setter method instead
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
     * Resolves string tool names to ToolDefinition objects
     * @param tools - Array of tool names or ToolDefinition objects
     * @param toolsDir - Optional directory to load tool functions from
     * @returns Promise resolving to an array of ToolDefinition objects
     */
    private async resolveToolDefinitions(
        tools?: StringOrDefinition[],
        toolsDir?: string
    ): Promise<ToolDefinition[]> {
        const log = logger.createLogger({ prefix: 'LLMCaller.resolveToolDefinitions' });
        const resolvedTools: ToolDefinition[] = [];

        // If no tools passed, return empty array
        if (!tools || tools.length === 0) {
            return resolvedTools;
        }

        // Initialize loaders if needed
        let folderLoader: ToolsFolderLoader | undefined = undefined;

        // If toolsDir is provided at call level, use it (may override constructor setting)
        if (toolsDir) {
            if (!this.folderLoader) {
                this.folderLoader = new ToolsFolderLoader(toolsDir);
            } else if (toolsDir !== this.folderLoader.getToolsDir()) {
                // A different toolsDir was provided, create a new loader
                this.folderLoader = new ToolsFolderLoader(toolsDir);
            }
            folderLoader = this.folderLoader;
        }
        // If no toolsDir provided at call level but we have a class-level folderLoader, use that
        else if (this.folderLoader) {
            folderLoader = this.folderLoader;
        }

        let mcpToolLoader: MCPToolLoader | undefined = undefined;

        // Resolve each tool
        for (const tool of tools) {
            if (typeof tool === 'string') {
                // It's a string tool name, resolve it from a folder
                if (!folderLoader) {
                    throw new Error(
                        `Tool '${tool}' is specified as a string, but no toolsDir is provided. ` +
                        `Either provide a toolsDir or use a ToolDefinition object.`
                    );
                }

                const resolvedTool = await folderLoader.getTool(tool);
                resolvedTools.push(resolvedTool);
            } else if (tool && typeof tool === 'object' && Object.values(tool).some(value =>
                typeof value === 'object' && value !== null &&
                'command' in value && 'args' in value)) {
                // New format: Direct MCPServersMap object
                if (!mcpToolLoader) {
                    const { MCPToolLoader } = await import('../mcp/MCPToolLoader');
                    mcpToolLoader = new MCPToolLoader(this.getMcpAdapter());
                }

                // Store the MCP adapter reference in _mcpAdapter for proper tracking
                // This ensures we can disconnect from it later
                if (!this._mcpAdapter) {
                    log.debug('Initializing MCP adapter from direct configuration');
                    this._mcpAdapter = mcpToolLoader.getMCPAdapter();
                }

                const mcpTools = await mcpToolLoader.loadTools(tool as unknown as MCPServersMap);
                resolvedTools.push(...mcpTools);
            } else {
                // It's already a ToolDefinition
                resolvedTools.push(tool as ToolDefinition);
            }
        }

        return resolvedTools;
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
        const { usageCallback, data, endingMessage, settings, jsonSchema, responseFormat, tools, historyMode, usageBatchSize, toolsDir } = options;

        // If a usage callback is provided in this call, update the caller to use it
        if (usageCallback) {
            this.setUsageCallback(usageCallback);
        }

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

        // Resolve string tool names to ToolDefinition objects
        const newlyResolvedTools = await this.resolveToolDefinitions(tools, toolsDir);
        let effectiveTools: ToolDefinition[];
        if (!tools || tools.length === 0) {
            // If no tools provided in this call, use the previously added tools
            effectiveTools = this.toolsManager.listTools();
        } else {
            // Merge previously added tools with newly resolved ones, ensuring uniqueness by name
            const existingTools = this.toolsManager.listTools();
            const merged: Map<string, ToolDefinition> = new Map();
            for (const t of [...existingTools, ...newlyResolvedTools]) {
                merged.set(t.name, t);
            }
            effectiveTools = Array.from(merged.values());
        }
        const mergedSettings = this.mergeSettings(settings);
        // Get the effective history mode
        const effectiveHistoryMode = this.mergeHistoryMode(historyMode);

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
        const modelSupportsJsonMode = typeof modelInfo.capabilities?.output?.text === 'object' &&
            modelInfo.capabilities.output.text.textOutputFormats?.includes('json');
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
                responseFormat: jsonRequested ? 'json' : responseFormat,
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
        const log = logger.createLogger({ prefix: 'LLMCaller.call' });

        try {
            log.debug(`Call: ${message.substring(0, 30)}...`);

            // Process MCP tool config from options.tools if present
            if (options.tools) {
                const mcpConfigs = options.tools.filter(tool =>
                    tool && typeof tool === 'object' && !Array.isArray(tool) &&
                    Object.values(tool).some(value =>
                        typeof value === 'object' && value !== null &&
                        'command' in value && 'args' in value
                    )
                ) as MCPServersMap[];

                // If we found any MCP configurations, handle them
                if (mcpConfigs.length > 0) {
                    log.debug('Found MCP server configurations in tools parameter');

                    // Initialize the MCP adapter with each server configuration
                    // This doesn't connect yet, just registers the configs
                    for (const mcpConfig of mcpConfigs) {
                        for (const [serverKey, serverConfig] of Object.entries(mcpConfig)) {
                            log.debug(`Registering MCP server configuration for ${serverKey}`);

                            // Get or create the MCP adapter
                            if (!this._mcpAdapter) {
                                this._mcpAdapter = new MCPServiceAdapter({});
                            }

                            // Only update configs if not already connected
                            if (!this._mcpAdapter.isConnected(serverKey)) {
                                log.debug(`Server ${serverKey} not already connected, registering configuration`);
                                // Store config on the adapter for later connections
                                await this._mcpAdapter.connectToServer(serverKey, serverConfig).catch(err => {
                                    log.warn(`Failed to initialize MCP server ${serverKey}:`, err);
                                });
                            } else {
                                log.debug(`Server ${serverKey} already connected, skipping initialization`);
                            }
                        }
                    }
                }
            }

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
                data: options.data,
                endingMessage: options.endingMessage,
                model: modelInfo,
                maxResponseTokens: options.settings?.maxTokens
            });

            // Resolve string tool names to ToolDefinition objects
            const newlyResolvedTools = await this.resolveToolDefinitions(options.tools, options.toolsDir);
            let effectiveTools: ToolDefinition[];
            if (!options.tools || options.tools.length === 0) {
                // If no tools provided in this call, use the previously added tools
                effectiveTools = this.toolsManager.listTools();
            } else {
                // Merge previously added tools with newly resolved ones, ensuring uniqueness by name
                const existingTools = this.toolsManager.listTools();
                const merged: Map<string, ToolDefinition> = new Map();
                for (const t of [...existingTools, ...newlyResolvedTools]) {
                    merged.set(t.name, t);
                }
                effectiveTools = Array.from(merged.values());
            }
            const mergedSettings = this.mergeSettings(options.settings);
            // Get the effective history mode
            const effectiveHistoryMode = this.mergeHistoryMode(options.historyMode);

            // If in stateless mode, get system message only
            if (effectiveHistoryMode?.toLowerCase() === 'stateless') {
                this.historyManager.initializeWithSystemMessage();
            }

            // Add the original user message to history *before* the call
            this.historyManager.addMessage('user', message, { metadata: { timestamp: Date.now() } });

            // Get the messages from history
            const messages = this.historyManager.getHistoricalMessages();

            // Check if JSON is requested and whether to use native mode
            const jsonRequested = options.responseFormat === 'json' || options.jsonSchema !== undefined;
            const modelSupportsJsonMode = typeof modelInfo.capabilities?.output?.text === 'object' &&
                modelInfo.capabilities.output.text.textOutputFormats?.includes('json');
            const useNativeJsonMode = modelSupportsJsonMode && jsonRequested &&
                !(options.settings?.jsonMode === 'force-prompt');

            // If there's only one chunk (no splitting occurred)
            if (processedMessages.length === 1) {
                const params: UniversalChatParams = {
                    model: this.model,
                    messages: messages,
                    settings: mergedSettings,
                    jsonSchema: options.jsonSchema,
                    responseFormat: useNativeJsonMode ? 'json' : (options.jsonSchema ? 'text' : options.responseFormat),
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
                jsonSchema: options.jsonSchema,
                responseFormat: options.responseFormat,
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
        } catch (error) {
            log.error('Error in call method:', error);
            throw error;
        }
    }

    // Tool management methods - delegated to ToolsManager
    public addTool(tool: ToolDefinition): void {
        this.toolsManager.addTool(tool);
    }

    /**
     * Adds tools configuration including MCP server configurations to the LLMCaller
     * @param tools Array of tool definitions, string identifiers, or MCP configurations
     */
    public async addTools(tools: (ToolDefinition | string | MCPServersMap)[]): Promise<void> {
        const log = logger.createLogger({ prefix: 'LLMCaller.addTools' });

        // Handle MCP configurations
        for (const tool of tools) {
            if (tool && typeof tool === 'object' && !Array.isArray(tool) &&
                Object.values(tool).some(value =>
                    typeof value === 'object' && value !== null &&
                    'command' in value && 'args' in value)) {

                // This is an MCP configuration
                log.debug('Found MCP server configuration');

                // Store the configuration in the MCP adapter but don't connect
                const mcpConfig = tool as MCPServersMap;
                const mcpAdapter = this.getMcpAdapter();

                // Just register the configurations without connecting
                for (const [serverKey, serverConfig] of Object.entries(mcpConfig)) {
                    log.debug(`Registering MCP server configuration for ${serverKey} (not connecting)`);

                    // Just store the configuration in the adapter
                    if (this._mcpAdapter) {
                        // Add config to the adapter's serverConfigs but don't connect
                        this._mcpAdapter.registerServerConfig(serverKey, serverConfig);
                    }
                }
            }
        }

        // Resolve and add tool definitions as usual
        const resolvedTools = await this.resolveToolDefinitions(tools as StringOrDefinition[]);
        this.toolsManager.addTools(resolvedTools);
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

    // Lazy-initialized MCP client manager
    private getMcpAdapter(): MCPServiceAdapter {
        if (!this._mcpAdapter) {
            this._mcpAdapter = new MCPServiceAdapter({});
        }
        return this._mcpAdapter;
    }

    public async getMcpServerToolSchemas(serverKey: string): Promise<McpToolSchema[]> {
        // Ensure MCP is configured (at least one MCP server defined)
        // We might need a more robust way to check if MCP is generally enabled/configured
        // For now, just get the adapter, which will handle initialization on first use
        const mcpAdapter = this.getMcpAdapter();

        // MCPServiceAdapter.getMcpServerToolSchemas handles connection checks and manifest fetching
        try {
            return await mcpAdapter.getMcpServerToolSchemas(serverKey);
        } catch (error) {
            logger.error(`Failed to get tool schemas for MCP server ${serverKey}:`, error);
            // Re-throw or return empty array based on desired API behavior
            throw error;
        }
    }

    /**
     * Executes a specific tool on a connected MCP server directly, bypassing the LLM.
     * Useful for deterministic tool calls or when LLM interaction is not required.
     * 
     * Requires MCP servers to be configured when initializing LLMCaller or through 
     * providing an MCPToolConfig in the `tools` option of a `.call()` or `.stream()`.
     * The specified serverKey must correspond to a configured and running MCP server.
     * 
     * @param serverKey The unique identifier for the MCP server (e.g., 'filesystem').
     * @param toolName The original name of the tool as defined on the MCP server (e.g., 'list_directory').
     * @param args An object containing the arguments required by the tool.
     * @returns A promise that resolves with the raw result payload from the MCP tool.
     * @throws Error if MCP is not configured or the specified server/tool cannot be reached or executed.
     */
    public async callMcpTool(serverKey: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
        const log = logger.createLogger({ prefix: 'LLMCaller.callMcpTool' });
        log.debug(`Initiating direct MCP tool call: ${serverKey}.${toolName}`, { args });

        // Get the MCP adapter (initializes if needed, assumes config is handled)
        const mcpAdapter = this.getMcpAdapter();

        // Delegate the execution to the MCP adapter
        try {
            const result = await mcpAdapter.executeMcpTool(serverKey, toolName, args);
            log.info(`Direct MCP tool call successful: ${serverKey}.${toolName}`);
            return result;
        } catch (error) {
            log.error(`Direct MCP tool call failed: ${serverKey}.${toolName}`, { error });
            // Re-throw the error to the caller
            throw error;
        }
    }

    /**
     * Explicitly connects to a specific MCP server that has been configured during LLMCaller initialization 
     * or in previous LLM calls with 'tools' parameter.
     * Call this method before using callMcpTool to ensure the server connection is established.
     * 
     * @param serverKey The server key to connect to (e.g., 'filesystem')
     * @returns Promise that resolves when connection is complete
     */
    async connectToMcpServer(serverKey: string): Promise<void> {
        const log = logger.createLogger({ prefix: 'LLMCaller.connectToMcpServer' });

        if (!serverKey) {
            throw new Error('Server key is required for connecting to an MCP server');
        }

        // Get the adapter (initializes with empty config if needed)
        const mcpAdapter = this.getMcpAdapter();

        try {
            // Connect to the specified server
            log.debug(`Connecting to MCP server: ${serverKey}`);
            await mcpAdapter.connectToServer(serverKey);
            log.info(`Successfully connected to MCP server: ${serverKey}`);
        } catch (error) {
            // Provide more helpful error message if server configuration is missing
            if (error instanceof Error &&
                error.message.includes('Server configuration not found')) {
                const helpfulError = new Error(
                    `No configuration found for MCP server "${serverKey}". ` +
                    `Please ensure you've provided this server configuration either when initializing LLMCaller ` +
                    `or in a previous call() with the 'tools' parameter.`
                );
                log.error(helpfulError.message);
                throw helpfulError;
            }
            // Otherwise re-throw the original error
            throw error;
        }
    }

    /**
     * Disconnects from all MCP servers and cleans up resources.
     * Call this when you're done with MCP tools to free up resources.
     * 
     * @returns Promise that resolves when all disconnections are complete
     */
    async disconnectMcpServers(): Promise<void> {
        const log = logger.createLogger({ prefix: 'LLMCaller.disconnectMcpServers' });

        // Disconnect all MCP servers if the adapter exists
        if (this._mcpAdapter) {
            log.debug('Disconnecting from all MCP servers');
            await this._mcpAdapter.disconnectAll();

            // Clear the adapter reference
            this._mcpAdapter = null;
        } else {
            log.debug('No MCP connections to disconnect');
        }

        log.debug('Disconnection complete');
    }
} 