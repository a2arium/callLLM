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
    HistoryMode,
    TextPart,
    toMessageParts,
    MessagePart,
    ImagePart,
    ImageSource,
    UrlSource,
    FilePathSource,
} from '../../interfaces/UniversalInterfaces.js';
import { z } from 'zod';
import { ProviderManager } from './ProviderManager.js';
import { RegisteredProviders } from '../../adapters/index.js';
import { ProviderNotFoundError } from '../../adapters/types.js';
import { ModelManager } from '../models/ModelManager.js';
import { CapabilityError } from '../models/CapabilityError.js';
import { TokenCalculator } from '../models/TokenCalculator.js';
import { ResponseProcessor } from '../processors/ResponseProcessor.js';
import { v4 as uuidv4 } from 'uuid';
import { UsageCallback } from '../../interfaces/UsageInterfaces.js';
import { RequestProcessor } from '../processors/RequestProcessor.js';
import { DataSplitter } from '../processors/DataSplitter.js';
import { RetryManager } from '../retry/RetryManager.js';
import { UsageTracker } from '../telemetry/UsageTracker.js';
import { ChatController } from '../chat/ChatController.js';
import { ToolsManager } from '../tools/ToolsManager.js';
import { ToolController } from '../tools/ToolController.js';
import { ToolOrchestrator } from '../tools/ToolOrchestrator.js';
import { ChunkController, ChunkProcessingParams } from '../chunks/ChunkController.js';
import { StreamingService } from '../streaming/StreamingService.js';
import type { ToolDefinition, ToolCall } from '../../types/tooling.js';
import { StreamController } from '../streaming/StreamController.js';
import { HistoryManager } from '../history/HistoryManager.js';
import { logger } from '../../utils/logger.js';
import { PromptEnhancer } from '../prompt/PromptEnhancer.js';
import { ToolsFolderLoader } from '../tools/toolLoader/ToolsFolderLoader.js';
import type { StringOrDefinition } from '../tools/toolLoader/types.js';
import type { MCPDirectAccess } from '../mcp/MCPDirectAccess.js';
import type { McpToolSchema, MCPServersMap } from '../mcp/MCPConfigTypes.js';
import { isMCPToolConfig } from '../mcp/MCPConfigTypes.js';
import { MCPServiceAdapter } from '../mcp/MCPServiceAdapter.js';
import { MCPToolLoader } from '../mcp/MCPToolLoader.js';
import {
    normalizeImageSource,
    filePathToBase64,
    estimateImageTokens,
    saveBase64ToFile,
    validateImageFile
} from '../file-data/fileData.js';
import { BaseAdapter } from '../../adapters/base/baseAdapter.js';
import { ImageOp, ImageCallParams } from '../../interfaces/LLMProvider.js';

/**
 * Interface that matches the core functionality of StreamController
 * Used for dependency injection
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
    maxIterations?: number;
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
    private maxIterations: number; // Store maxIterations for tool controller
    private mcpSchemaCache: Map<string, ToolDefinition[]> = new Map();

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
        this.maxIterations = options?.maxIterations ?? 5; // Initialize maxIterations
        this.historyManager = options?.historyManager || new HistoryManager(systemMessage);
        this.toolsManager = options?.toolsManager || new ToolsManager();
        this.usageTracker = new UsageTracker(this.tokenCalculator, this.usageCallback, this.callerId);
        this.requestProcessor = new RequestProcessor();
        // Initialize ToolController with only ToolsManager and maxIterations
        this.toolController = new ToolController(
            this.toolsManager,
            this.maxIterations
        );

        // Initialize the folder loader if toolsDir is provided
        if (options?.toolsDir) {
            this.folderLoader = new ToolsFolderLoader(options.toolsDir);
        }

        const resolvedModel = this.modelManager.getModel(modelOrAlias);
        if (!resolvedModel) throw new Error(`Model ${modelOrAlias} not found for provider ${providerName}`);
        this.model = resolvedModel.name;

        // **Initialize StreamingService early, passing adapter provider**
        this.streamingService = options?.streamingService ||
            new StreamingService(
                this.providerManager, this.modelManager, this.historyManager, this.retryManager,
                this.usageCallback, this.callerId, { tokenBatchSize: 100 }, this.toolController,
                undefined, // toolOrchestrator is set later
                () => this.getMcpAdapter() // Pass adapter provider
            );

        // **Initialize ChatController, passing adapter provider**
        this.chatController = options?.chatController || new ChatController(
            this.providerManager, this.modelManager, this.responseProcessor, this.retryManager,
            this.usageTracker, this.toolController,
            undefined, // Pass undefined for toolOrchestrator for now
            this.historyManager,
            () => this.getMcpAdapter() // Pass adapter provider
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

        // **Initialize ToolOrchestrator**
        this.toolOrchestrator = new ToolOrchestrator(
            this.toolController,
            this.chatController,
            streamControllerAdapter as StreamController,
            this.historyManager
        );

        // **Link ToolOrchestrator back to ChatController & StreamingService**
        if (typeof this.chatController.setToolOrchestrator === 'function') {
            this.chatController.setToolOrchestrator(this.toolOrchestrator);
        } else {
            // For architecture versions without setToolOrchestrator
            const log = logger.createLogger({ prefix: 'LLMCaller.constructor' });
            log.debug('ChatController.setToolOrchestrator not found - may be using newer API');
        }
        this.streamingService.setToolOrchestrator(this.toolOrchestrator);
        // No need to set adapter provider here again, passed in constructor

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
        // Re-initialize ToolController
        this.toolController = new ToolController(
            this.toolsManager,
            this.maxIterations
        );

        // Re-initialize ChatController, passing adapter provider
        this.chatController = new ChatController(
            this.providerManager,
            this.modelManager,
            this.responseProcessor,
            this.retryManager,
            this.usageTracker,
            this.toolController,
            undefined, // Orchestrator needs to be re-linked
            this.historyManager,
            () => this.getMcpAdapter() // Pass adapter provider
        );

        // Re-initialize StreamingService, passing adapter provider
        this.streamingService = new StreamingService(
            this.providerManager,
            this.modelManager,
            this.historyManager,
            this.retryManager,
            this.usageCallback,
            this.callerId,
            { tokenBatchSize: 100 },
            this.toolController,
            undefined, // Don't pass toolOrchestrator here, use the setter method instead
            () => this.getMcpAdapter() // Pass adapter provider
        );

        // *** Define streamControllerAdapter needed for ToolOrchestrator and ChunkController ***
        const streamControllerAdapter: StreamControllerInterface = {
            createStream: async (
                model: string,
                params: UniversalChatParams,
                inputTokens: number
            ): Promise<AsyncIterable<UniversalStreamResponse>> => {
                params.callerId = params.callerId || this.callerId;
                if (!this.streamingService) {
                    throw new Error('StreamingService is not initialized');
                }
                return this.streamingService.createStream(params, model, undefined);
            }
        };

        // Re-initialize ToolOrchestrator
        this.toolOrchestrator = new ToolOrchestrator(
            this.toolController,
            this.chatController,
            streamControllerAdapter as StreamController, // Use the defined adapter
            this.historyManager
        );

        // Link the new orchestrator back to the new controllers
        if (typeof this.chatController.setToolOrchestrator === 'function') {
            this.chatController.setToolOrchestrator(this.toolOrchestrator);
        } else {
            // For architecture versions without setToolOrchestrator
            const log = logger.createLogger({ prefix: 'LLMCaller.reinitializeControllers' });
            log.debug('ChatController.setToolOrchestrator not found - may be using newer API');
        }
        this.streamingService.setToolOrchestrator(this.toolOrchestrator);
        // Set adapter provider again via setter after reinitialization if needed (optional, constructor should handle)
        // this.chatController.setMCPAdapterProvider(() => this.getMcpAdapter());
        // this.streamingService.setMCPAdapterProvider(() => this.getMcpAdapter());

        // Re-initialize ChunkController with the new ChatController and adapter
        this.chunkController = new ChunkController(
            this.tokenCalculator,
            this.chatController,
            streamControllerAdapter as StreamController, // Use the defined adapter
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
        const log = logger.createLogger({ prefix: 'LLMCaller.internalChatCall' });
        log.debug(`Calling chat with ${params.messages?.length} messages`);

        this.toolController.resetIterationCount(); // Reset tool iteration

        // Ensure essential parameters are present
        params.callerId = params.callerId || this.callerId;
        params.model = params.model || this.model;

        const { systemMessage, ...paramsForController } = params;
        const chatResponse = await this.chatController.execute(paramsForController as any);

        // Process image output if present (save to file if outputPath provided)
        // Note: outputPath handling will be moved to the public call/stream methods
        // to use the original LLMCallOptions.outputPath directly.
        // This internalChatCall will just return the response from ChatController.

        return chatResponse;
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
     * Does NOT handle MCP configurations anymore.
     * @param tools - Array of tool names or ToolDefinition objects
     * @param toolsDir - Optional directory to load tool functions from
     * @returns Promise resolving to an array of ToolDefinition objects
     */
    private async resolveToolDefinitions(
        tools?: (ToolDefinition | string)[], // Removed MCPServersMap from type
        toolsDir?: string
    ): Promise<ToolDefinition[]> {
        const log = logger.createLogger({ prefix: 'LLMCaller.resolveToolDefinitions' });
        const resolvedTools: ToolDefinition[] = [];

        if (!tools || tools.length === 0) {
            return resolvedTools;
        }

        // Initialize folderLoader ONLY if needed
        let folderLoader: ToolsFolderLoader | undefined = undefined;
        const needsFolderLoader = tools.some(t => typeof t === 'string');

        if (needsFolderLoader) {
            // If toolsDir is provided at call level, use it (may override constructor setting)
            if (toolsDir) {
                if (!this.folderLoader || toolsDir !== this.folderLoader.getToolsDir()) {
                    this.folderLoader = new ToolsFolderLoader(toolsDir);
                }
                folderLoader = this.folderLoader;
            }
            // If no toolsDir provided at call level but we have a class-level folderLoader, use that
            else if (this.folderLoader) {
                folderLoader = this.folderLoader;
            }

            if (!folderLoader) {
                throw new Error(
                    `Tools specified as strings require a toolsDir to be provided ` +
                    `either during LLMCaller initialization or in the call options.`
                );
            }
        }

        // REMOVED: mcpToolLoader initialization

        // Resolve each tool
        for (const tool of tools) {
            if (typeof tool === 'string') {
                // It's a string tool name, resolve it from the folder loader
                const resolvedTool = await folderLoader!.getTool(tool); // folderLoader is guaranteed defined here if needed
                resolvedTools.push(resolvedTool);
            } else if (tool && typeof tool === 'object' && tool.name && tool.description && tool.parameters) {
                // It's already a ToolDefinition (basic check)
                resolvedTools.push(tool as ToolDefinition);
            } else {
                // Ignore other types (like MCPServersMap)
                log.warn('Skipping item in tools array that is not a string or valid ToolDefinition:', tool);
            }
        }

        return resolvedTools;
    }

    /**
     * Helper method to build chat params and process files consistently for both call() and stream()
     * @private
     */
    private async processImageFiles(
        actualOptions: LLMCallOptions,
        messageParts: MessagePart[]
    ): Promise<{
        messageParts: MessagePart[];
        totalImageTokens: number;
        imageOperation: 'generate' | 'edit' | 'edit-masked' | 'composite';
    }> {
        const log = logger.createLogger({ prefix: 'LLMCaller.processImageFiles' });
        let totalImageTokens = 0;
        let imageOperation: 'generate' | 'edit' | 'edit-masked' | 'composite' = 'generate';

        const allFileSources: (string | ImageSource)[] = [];

        if (actualOptions.file) {
            allFileSources.push(actualOptions.file);
        }
        if (actualOptions.files && Array.isArray(actualOptions.files)) {
            allFileSources.push(...actualOptions.files);
        }

        if (actualOptions.mask) {
            imageOperation = 'edit-masked';
        } else if (allFileSources.length > 1) {
            imageOperation = 'composite';
        } else if (allFileSources.length === 1) {
            imageOperation = 'edit';
        } else {
            imageOperation = 'generate';
        }

        log.debug(`Inferred image operation: ${imageOperation}, processing ${allFileSources.length} sources.`);

        for (const source of allFileSources) {
            log.debug(`Processing source: ${typeof source === 'string' ? source.substring(0, 50) : source.type}...`);
            try {
                let fileSourceInput: ImageSource;
                if (typeof source === 'string') {
                    fileSourceInput = source.startsWith('http')
                        ? { type: 'url', url: source }
                        : { type: 'file_path', path: source };
                } else {
                    fileSourceInput = source;
                }

                // Normalize the image source (e.g., read file to base64 if it's a path)
                const normalizedSource = await normalizeImageSource(fileSourceInput);

                const imagePart: ImagePart = {
                    type: 'image', // Internal type is 'image'
                    data: normalizedSource // Containing kind, value, mime
                };
                messageParts.push(imagePart);

                const imageTokens = estimateImageTokens(1024, 1024);
                totalImageTokens += imageTokens;
                log.debug(
                    `Estimated image tokens: ${imageTokens} for source, detail level: ${actualOptions.input?.image?.detail || 'auto'
                    }`
                );
            } catch (error) {
                log.error('Failed to process image file/source:', error);
                throw new Error(`Failed to process image: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        if (actualOptions.mask) {
            log.debug(`Processing mask file: ${actualOptions.mask.substring(0, 50)}...`);
            try {
                const maskSource: ImageSource = actualOptions.mask.startsWith('http')
                    ? { type: 'url', url: actualOptions.mask }
                    : { type: 'file_path', path: actualOptions.mask };

                const normalizedMask = await normalizeImageSource(maskSource);

                const maskPart: ImagePart = {
                    type: 'image',
                    data: normalizedMask,
                    _isMask: true // Custom property to identify this as a mask internally
                };
                messageParts.push(maskPart);

                const maskTokens = estimateImageTokens(1024, 1024);
                totalImageTokens += maskTokens;
                log.debug(`Estimated mask tokens: ${maskTokens}`);
            } catch (error) {
                log.error('Failed to process mask file:', error);
                throw new Error(`Failed to process mask: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        return { messageParts, totalImageTokens, imageOperation };
    }

    /**
     * Helper method to build chat parameters consistently for both call() and stream()
     * Consolidates all pre-processing into a single code path to prevent divergence
     * 
     * REFACTORING NOTE (2023):
     * This helper was introduced to fix several critical issues caused by the 
     * divergent code paths between single-chunk and multi-chunk processing:
     * 
     * 1. callerId consistency: Now always included in chatParams for usage tracking
     * 2. Image/file handling: Consistent inclusion in history for all paths
     * 3. JSON mode handling: Consistent determination of native vs prompt-based JSON
     * 4. Tool resolution: Single source of truth for tool definitions
     * 5. History management: Consistent system message and message handling
     * 
     * The function centralizes parameter building, ensuring that both the direct 
     * call path (internalChatCall/internalStreamCall) and the chunking path use
     * identical parameters for consistent behavior regardless of prompt size.
     */
    private async buildChatParams(opts: LLMCallOptions & {
        userText?: string;
        processedMessages: any[]; // TextPart[]
    }): Promise<{ chatParams: UniversalChatParams; processedMessages: any[] }> {
        const log = logger.createLogger({ prefix: 'LLMCaller.buildChatParams' });
        const actualMessage = opts.userText || opts.text || '';

        // Get model info for capability checks
        const modelInfo = this.modelManager.getModel(this.model);
        if (!modelInfo) {
            throw new Error(`Model ${this.model} not found`);
        }

        // --- Tool Resolution and MCP Schema Fetching ---
        // Filter out MCP configs before resolving standard tools
        const standardToolsToResolve = opts.tools?.filter(t =>
            typeof t === 'string' ||
            (typeof t === 'object' && t && 'name' in t && 'description' in t && 'parameters' in t)
        ) as (string | ToolDefinition)[] | undefined;

        // Resolve ONLY standard tool definitions
        const newlyResolvedTools = await this.resolveToolDefinitions(standardToolsToResolve, opts.toolsDir);

        // Start merging: base tools + call-specific standard tools
        let finalEffectiveTools: ToolDefinition[] = [];
        const baseTools = this.toolsManager.listTools(); // Tools added via addTools()
        const callSpecificStandardTools = newlyResolvedTools; // Tools from options.tools (excluding MCP)

        // Merge base and call-specific standard tools
        const mergedStandardToolsMap: Map<string, ToolDefinition> = new Map();
        [...baseTools, ...callSpecificStandardTools].forEach(t => mergedStandardToolsMap.set(t.name, t));
        finalEffectiveTools = Array.from(mergedStandardToolsMap.values());

        // Now fetch and merge MCP tools
        const mcpAdapter = this.getMcpAdapter();
        // Get all configured servers
        const configuredServers = mcpAdapter.listConfiguredServers();
        const mcpToolsForCall: ToolDefinition[] = [];

        for (const serverKey of configuredServers) {
            // Auto-connect on first use if needed
            if (!mcpAdapter.isConnected(serverKey)) {
                try {
                    log.debug(`Auto-connecting to MCP server ${serverKey} for tool usage`);
                    await mcpAdapter.connectToServer(serverKey);
                } catch (error) {
                    log.warn(`Failed to auto-connect to MCP server ${serverKey}`, { error });
                    // Continue with other servers rather than failing completely
                    continue;
                }
            }

            let serverTools = this.mcpSchemaCache.get(serverKey);
            if (!serverTools) {
                try {
                    log.debug(`Cache miss for MCP schemas: ${serverKey}. Fetching...`);
                    // Fetch tools (connects implicitly if needed)
                    serverTools = await mcpAdapter.getServerTools(serverKey);
                    this.mcpSchemaCache.set(serverKey, serverTools);
                    log.debug(`Fetched and cached ${serverTools.length} tools for ${serverKey}`);
                } catch (error) {
                    log.error(`Failed to fetch tools for MCP server ${serverKey}`, { error });
                    // Decide whether to throw or continue without this server's tools
                    // Let's continue for now
                    serverTools = [];
                }
            } else {
                log.debug(`Cache hit for MCP schemas: ${serverKey}`);
            }
            mcpToolsForCall.push(...serverTools);
        }

        // Finalize the tool list with MCP tools
        const finalToolsMap: Map<string, ToolDefinition> = new Map();
        [...finalEffectiveTools, ...mcpToolsForCall].forEach(t => finalToolsMap.set(t.name, t));
        finalEffectiveTools = Array.from(finalToolsMap.values());
        const effectiveTools = finalEffectiveTools.length > 0 ? finalEffectiveTools : undefined;

        // Merge the settings with any defaults
        const mergedSettings = this.mergeSettings(opts.settings);

        // Get the effective history mode
        const effectiveHistoryMode = this.mergeHistoryMode(opts.historyMode);

        // Get messages from history manager (which already has the latest user message)
        let messages = this.historyManager.getHistoricalMessages();

        // When there's only one processed message and it contains the 'data' field,
        // we should use the processed message instead of the history manager's version
        // to ensure the 'data' parameter is properly included
        if (opts.processedMessages.length === 1 && opts.data) {
            const dataStr = typeof opts.data === 'string'
                ? opts.data
                : JSON.stringify(opts.data);

            log.debug(`Using processed message with data: ${dataStr.substring(0, 30)}...`);
            log.debug(`Processed message structure:`, JSON.stringify(opts.processedMessages[0]));

            // Get all messages except the most recent user message
            const previousMessages = messages.filter(msg =>
                !(msg.role === 'user' && msg.content === actualMessage));

            // processedMessages is an array of strings (not objects with a text property)
            // directly use the processed string as content
            const processedContent = opts.processedMessages[0];

            log.debug(`Final processed content: ${processedContent}`);

            const processedUserMessage: UniversalMessage = {
                role: 'user',
                content: processedContent
            };

            // Combine previous messages with the processed user message
            messages = [...previousMessages, processedUserMessage];
        }

        // Check if JSON is requested and whether to use native mode
        const jsonRequested = opts.responseFormat === 'json' || opts.jsonSchema !== undefined;
        const modelSupportsJsonMode = typeof modelInfo.capabilities?.output?.text === 'object' &&
            modelInfo.capabilities.output.text.textOutputFormats?.includes('json');
        const useNativeJsonMode = modelSupportsJsonMode && jsonRequested &&
            !(opts.settings?.jsonMode === 'force-prompt');

        // Build final chat parameters - everything in one place
        const chatParams: UniversalChatParams = {
            model: this.model,
            messages: messages,
            settings: mergedSettings,
            jsonSchema: opts.jsonSchema,
            responseFormat: useNativeJsonMode ? 'json' : (opts.jsonSchema ? 'text' : opts.responseFormat),
            tools: effectiveTools,
            callerId: this.callerId, // Important: Always include callerId
            historyMode: effectiveHistoryMode
        };

        return { chatParams, processedMessages: opts.processedMessages };
    }

    /**
     * Processes a message and streams the response.
     * This is the standardized public API for streaming responses.
     * @param input A string message or options object containing prompt and/or file 
     * @param options Optional settings for the call
     */
    public async *stream<T extends z.ZodType<any, z.ZodTypeDef, any> = z.ZodType<any, z.ZodTypeDef, any>>(
        input: string | LLMCallOptions,
        options: LLMCallOptions = {}
    ): AsyncGenerator<UniversalStreamResponse<T extends z.ZodType<any, z.ZodTypeDef, any> ? z.TypeOf<T> : unknown>> {
        const log = logger.createLogger({ prefix: 'LLMCaller.stream' });

        try {
            let actualOptions: LLMCallOptions;
            let messageParts: MessagePart[] = [];

            if (typeof input === 'string') {
                actualOptions = { text: input, ...options };
                messageParts = toMessageParts(input);
            } else {
                actualOptions = input;
                messageParts = actualOptions.text ? toMessageParts(actualOptions.text) : [];
            }

            const modelToUse = actualOptions.settings?.providerOptions?.model as string || this.model;
            if (typeof ModelManager.getCapabilities === 'function') {
                const capabilities = ModelManager.getCapabilities(modelToUse);
                const hasImageInput = actualOptions.file || (actualOptions.files && actualOptions.files.length > 0);
                const hasImageOutput = Boolean(actualOptions.output?.image);
                if (hasImageInput && !capabilities.input.image) {
                    throw new CapabilityError(`Model "${modelToUse}" does not support image inputs.`);
                }
                if (hasImageOutput && !capabilities.output.image) {
                    throw new CapabilityError(`Model "${modelToUse}" does not support image outputs.`);
                }

                // If this is going to be an image operation, determine which one and check capability
                if (hasImageOutput) {
                    let imageOperation: ImageOp = 'generate';
                    if (actualOptions.mask) {
                        imageOperation = 'edit-masked';
                    } else if (actualOptions.files && actualOptions.files.length > 1) {
                        imageOperation = 'composite';
                    } else if (actualOptions.file || (actualOptions.files && actualOptions.files.length === 1)) {
                        imageOperation = 'edit';
                    }

                    // Check if the model supports this specific image operation
                    if (typeof capabilities.output.image === 'object') {
                        if (imageOperation === 'generate' && !capabilities.output.image.generate) {
                            throw new CapabilityError(`Model "${modelToUse}" does not support image generation.`);
                        } else if (imageOperation === 'edit' && !capabilities.output.image.edit) {
                            throw new CapabilityError(`Model "${modelToUse}" does not support image editing.`);
                        } else if (imageOperation === 'edit-masked' && !capabilities.output.image.editWithMask) {
                            throw new CapabilityError(`Model "${modelToUse}" does not support masked image editing.`);
                        } else if (imageOperation === 'composite') {
                            // Composite operation requires edit capability with multiple images
                            if (!capabilities.output.image.edit) {
                                throw new CapabilityError(`Model "${modelToUse}" does not support editing multiple images.`);
                            }
                        }
                    }
                }
            }

            let totalImageTokens = 0;
            let imageOperation: 'generate' | 'edit' | 'edit-masked' | 'composite' = 'generate';

            if (actualOptions.file || (actualOptions.files && actualOptions.files.length > 0) || actualOptions.mask) {
                const result = await this.processImageFiles(actualOptions, messageParts);
                messageParts = result.messageParts;
                totalImageTokens = result.totalImageTokens;
                imageOperation = result.imageOperation;
                if (!actualOptions.settings) actualOptions.settings = {};
                if (!actualOptions.settings.providerOptions) actualOptions.settings.providerOptions = {};
                actualOptions.settings.providerOptions.imageOperation = imageOperation;
            }

            if (actualOptions.usageCallback) this.setUsageCallback(actualOptions.usageCallback);
            if (this.toolOrchestrator) this.toolOrchestrator.resetCalledTools();

            if (actualOptions.file) this.historyManager.addMessage('user', `<file:${actualOptions.file}>`, {});
            if (actualOptions.files && Array.isArray(actualOptions.files)) {
                for (const file of actualOptions.files) this.historyManager.addMessage('user', `<file:${file}>`, {});
            }
            if (actualOptions.mask) this.historyManager.addMessage('user', `<mask:${actualOptions.mask}>`, {});
            const originalUserText = actualOptions.text;
            if (originalUserText) this.historyManager.addMessage('user', originalUserText, {});

            const processedMessages = await this.requestProcessor.processRequest({
                message: actualOptions.text || '',
                data: actualOptions.data,
                endingMessage: actualOptions.endingMessage,
                model: this.modelManager.getModel(this.model) || (() => { throw new Error(`Model ${this.model} not found`); })(),
                maxResponseTokens: actualOptions.settings?.maxTokens,
                maxCharsPerChunk: actualOptions.maxCharsPerChunk
            });
            log.debug('Processed messages', { count: processedMessages.length });

            const { chatParams, processedMessages: finalProcessedMessages } =
                await this.buildChatParams({
                    ...actualOptions,
                    userText: actualOptions.text || '',
                    processedMessages
                });

            if (finalProcessedMessages.length <= 1) {
                const stream = await this.internalStreamCall(chatParams);
                for await (const chunk of stream as AsyncIterable<UniversalStreamResponse<T extends z.ZodType<any, z.ZodTypeDef, any> ? z.TypeOf<T> : unknown>>) {
                    if (chunk.isComplete && actualOptions.outputPath && chunk.image) {
                        // Create a temporary UniversalChatResponse to use with processImageOutput
                        const tempResponse: UniversalChatResponse = {
                            content: chunk.contentText || null,
                            role: chunk.role,
                            image: chunk.image,
                            metadata: chunk.metadata
                        };
                        const processedOutputResponse = await this.processImageOutput(tempResponse, actualOptions.outputPath);
                        // Update chunk with imageSavedPath from metadata if present
                        if (processedOutputResponse.metadata?.imageSavedPath) {
                            if (!chunk.metadata) chunk.metadata = {};
                            chunk.metadata.imageSavedPath = processedOutputResponse.metadata.imageSavedPath;
                        }
                    }
                    yield chunk;
                }
            } else {
                const chunkStreamParams = { ...chatParams, historicalMessages: chatParams.messages };
                const responses = await this.chunkController.processChunks(finalProcessedMessages, chunkStreamParams);
                responses.forEach(response => {
                    if (response.content && (!response.toolCalls || response.toolCalls.length === 0) && response.metadata?.finishReason !== 'tool_calls') {
                        this.historyManager.addMessage('assistant', response.content);
                    }
                });

                for (let i = 0; i < responses.length; i++) {
                    const response = responses[i];
                    const isLast = i === responses.length - 1;
                    const streamResponseChunk: UniversalStreamResponse<T extends z.ZodType<any, z.ZodTypeDef, any> ? z.TypeOf<T> : unknown> = {
                        content: response.content || '',
                        contentText: isLast ? response.content || '' : undefined,
                        contentObject: isLast ? response.contentObject as T extends z.ZodType<any, z.ZodTypeDef, any> ? z.TypeOf<T> : unknown : undefined,
                        role: response.role,
                        isComplete: isLast,
                        messages: chatParams.messages,
                        toolCalls: response.toolCalls,
                        image: isLast ? response.image : undefined, // Include image only on the last chunk
                        metadata: {
                            ...response.metadata,
                            processInfo: { currentChunk: i + 1, totalChunks: responses.length }
                        }
                    };

                    if (streamResponseChunk.isComplete && actualOptions.outputPath && streamResponseChunk.image) {
                        const processedOutputResponse = await this.processImageOutput(response, actualOptions.outputPath); // Pass full response for processImageOutput
                        if (processedOutputResponse.metadata?.imageSavedPath) {
                            if (!streamResponseChunk.metadata) streamResponseChunk.metadata = {};
                            streamResponseChunk.metadata.imageSavedPath = processedOutputResponse.metadata.imageSavedPath;
                        }
                    }
                    yield streamResponseChunk;
                }
            }

            if (chatParams.historyMode?.toLowerCase() === 'stateless') {
                this.historyManager.initializeWithSystemMessage();
            }
        } catch (error) {
            logger.error('Error in stream method:', error);
            throw error;
        }
    }

    /**
     * Processes a message and returns the response(s).
     * This is the standardized public API for getting responses.
     */
    public async call<T extends z.ZodType<any, z.ZodTypeDef, any> = z.ZodType<any, z.ZodTypeDef, any>>(
        message: string | LLMCallOptions,
        options: LLMCallOptions = {}
    ): Promise<UniversalChatResponse[]> {
        const log = logger.createLogger({ prefix: 'LLMCaller.call' });

        try {
            const opts: LLMCallOptions = typeof message === 'string'
                ? { text: message, ...options }
                : { ...message };

            const modelToUse = opts.settings?.providerOptions?.model as string || this.model;
            if (typeof ModelManager.getCapabilities === 'function') {
                const capabilities = ModelManager.getCapabilities(modelToUse);
                const hasImageInput = opts.file || (opts.files && opts.files.length > 0);
                const hasImageOutput = Boolean(opts.output?.image);
                if (hasImageInput && !capabilities.input.image) {
                    throw new CapabilityError(`Model "${modelToUse}" does not support image inputs.`);
                }
                if (hasImageOutput && !capabilities.output.image) {
                    throw new CapabilityError(`Model "${modelToUse}" does not support image outputs.`);
                }

                // If this is an image output request, route it to the image generation API directly
                if (hasImageOutput) {
                    log.debug('Image output requested, routing to image generation API');

                    // Determine the image operation type
                    let imageOperation: ImageOp = 'generate';
                    if (opts.mask) {
                        imageOperation = 'edit-masked';
                    } else if (opts.files && opts.files.length > 1) {
                        imageOperation = 'composite';
                    } else if (opts.file || (opts.files && opts.files.length === 1)) {
                        imageOperation = 'edit';
                    }

                    // Check if the model supports this specific image operation
                    if (typeof capabilities.output.image === 'object') {
                        if (imageOperation === 'generate' && !capabilities.output.image.generate) {
                            throw new CapabilityError(`Model "${modelToUse}" does not support image generation.`);
                        } else if (imageOperation === 'edit' && !capabilities.output.image.edit) {
                            throw new CapabilityError(`Model "${modelToUse}" does not support image editing.`);
                        } else if (imageOperation === 'edit-masked' && !capabilities.output.image.editWithMask) {
                            throw new CapabilityError(`Model "${modelToUse}" does not support masked image editing.`);
                        } else if (imageOperation === 'composite') {
                            // Composite operation requires edit capability with multiple images
                            if (!capabilities.output.image.edit) {
                                throw new CapabilityError(`Model "${modelToUse}" does not support editing multiple images.`);
                            }
                        }
                    }

                    // Create parameters for the image operation
                    const imageParams: ImageCallParams = {
                        prompt: opts.text || '',
                        outputPath: opts.outputPath,
                        // Add callback parameters for usage tracking
                        callerId: this.callerId,
                        usageCallback: this.usageCallback
                    };

                    // Process image options
                    if (opts.output?.image || opts.input?.image) {
                        // Define the mapped options with correct types
                        const mappedOptions: ImageCallParams['options'] = {};

                        // Map size if present
                        if (opts.output?.image?.size) {
                            const size = opts.output.image.size;
                            const validSizes = ['256x256', '512x512', '1024x1024', '1024x1792', '1792x1024'];
                            if (validSizes.includes(size)) {
                                mappedOptions.size = size as any; // Type assertion to match expected format
                            } else {
                                mappedOptions.size = '1024x1024'; // Default size
                            }
                        }

                        // Map quality if present
                        if (opts.output?.image?.quality) {
                            // Pass quality directly, let the adapter handle model-specific conversions
                            mappedOptions.quality = opts.output.image.quality as any; // Use type assertion for flexibility
                            log.debug(`Using quality setting for image: ${opts.output.image.quality}`);
                        }

                        // Map style if present
                        if (opts.output?.image?.style === 'vivid' || opts.output?.image?.style === 'natural') {
                            mappedOptions.style = opts.output.image.style;
                        }

                        // Map background if present
                        if (opts.output?.image?.background) {
                            mappedOptions.background = opts.output.image.background;
                        }

                        // Set the options on the params object
                        imageParams.options = mappedOptions;
                    }

                    // Add files if present
                    if (opts.files && opts.files.length > 0) {
                        imageParams.files = [];
                        for (const file of opts.files) {
                            // Convert string paths to FilePathSource or UrlSource objects
                            if (typeof file === 'string') {
                                const source: FilePathSource | UrlSource = file.startsWith('http')
                                    ? { type: 'url', url: file }
                                    : { type: 'file_path', path: file };

                                // If it's a URL, we can add it directly
                                if (source.type === 'url') {
                                    imageParams.files.push(source);
                                } else {
                                    // For file paths, we need to normalize them first
                                    const normalized = await normalizeImageSource(source);
                                    imageParams.files.push(normalized);
                                }
                            } else {
                                // If it's already a DataSource, normalize it if needed
                                const normalized = await normalizeImageSource(file as ImageSource);
                                imageParams.files.push(normalized);
                            }
                        }
                    } else if (opts.file) {
                        // Convert string path to FilePathSource or UrlSource
                        const source: FilePathSource | UrlSource = opts.file.startsWith('http')
                            ? { type: 'url', url: opts.file }
                            : { type: 'file_path', path: opts.file };

                        const normalized = await normalizeImageSource(source);
                        imageParams.files = [normalized];
                    }

                    // Add mask if present
                    if (opts.mask) {
                        const maskSource: FilePathSource | UrlSource = opts.mask.startsWith('http')
                            ? { type: 'url', url: opts.mask }
                            : { type: 'file_path', path: opts.mask };

                        imageParams.mask = await normalizeImageSource(maskSource);
                    }

                    // Call the image operation directly
                    const response = await this.providerManager.callImageOperation(
                        modelToUse,
                        imageOperation,
                        imageParams
                    );

                    // Process image output if needed
                    const processedResponse = opts.outputPath && response.image
                        ? await this.processImageOutput(response, opts.outputPath)
                        : response;

                    return [processedResponse];
                }
            }

            let messageParts: MessagePart[] = opts.text ? toMessageParts(opts.text) : [];
            let imageOperation: 'generate' | 'edit' | 'edit-masked' | 'composite' = 'generate';

            if (opts.file || (opts.files && opts.files.length > 0) || opts.mask) {
                const result = await this.processImageFiles(opts, messageParts);
                messageParts = result.messageParts;
                imageOperation = result.imageOperation;
                if (!opts.settings) opts.settings = {};
                if (!opts.settings.providerOptions) opts.settings.providerOptions = {};
                opts.settings.providerOptions.imageOperation = imageOperation;
            }

            if (opts.file) this.historyManager.addMessage('user', `<file:${opts.file}>`, {});
            if (opts.files && Array.isArray(opts.files)) {
                for (const file of opts.files) this.historyManager.addMessage('user', `<file:${file}>`, {});
            }
            if (opts.mask) this.historyManager.addMessage('user', `<mask:${opts.mask}>`, {});
            const originalUserText = opts.text;
            if (originalUserText) this.historyManager.addMessage('user', originalUserText, {});

            log.debug(`Call with text: ${(opts.text || '').substring(0, 30)}... and files: ${opts.file || (opts.files?.length ? opts.files.length + ' files' : 'none')}`);

            if (this.toolOrchestrator) this.toolOrchestrator.resetCalledTools();

            const processedMessages = await this.requestProcessor.processRequest({
                message: opts.text || '',
                data: opts.data,
                endingMessage: opts.endingMessage,
                model: this.modelManager.getModel(this.model) || (() => { throw new Error(`Model ${this.model} not found`); })(),
                maxResponseTokens: opts.settings?.maxTokens,
                maxCharsPerChunk: opts.maxCharsPerChunk
            });
            log.debug('Processed messages', { count: processedMessages.length });

            const { chatParams, processedMessages: finalProcessedMessages } =
                await this.buildChatParams({
                    ...opts,
                    userText: opts.text || '',
                    processedMessages
                });

            let responses: UniversalChatResponse[];
            if (finalProcessedMessages.length <= 1) {
                log.debug('Calling internalChatCall (single chunk)');
                const response = await this.internalChatCall<T>(chatParams);
                responses = [response];
            } else {
                log.debug('Calling chunkController.processChunks (multi-chunk)', { chunkCount: finalProcessedMessages.length });
                responses = await this.chunkController.processChunks(finalProcessedMessages, {
                    ...chatParams,
                    historicalMessages: chatParams.messages
                });
                responses.forEach(response => {
                    if (response.content && (!response.toolCalls || response.toolCalls.length === 0) && response.metadata?.finishReason !== 'tool_calls') {
                        this.historyManager.addMessage('assistant', response.content);
                    }
                });
            }

            // After getting all responses, process image output for each if applicable
            const processedResponses = await Promise.all(responses.map(async (res) => {
                if (opts.outputPath && res.image) {
                    return await this.processImageOutput(res, opts.outputPath);
                }
                return res;
            }));

            if (chatParams.historyMode?.toLowerCase() === 'stateless') {
                this.historyManager.initializeWithSystemMessage();
            }

            return processedResponses;
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
     * MCP configs are only registered; standard tools are added to ToolsManager.
     * @param tools Array of tool definitions, string identifiers, or MCP configurations
     */
    public async addTools(tools: (ToolDefinition | string | MCPServersMap)[]): Promise<void> {
        const log = logger.createLogger({ prefix: 'LLMCaller.addTools' });
        const standardTools: (ToolDefinition | string)[] = [];

        // Separate MCP configs and standard tools
        for (const tool of tools) {
            if (tool && typeof tool === 'object' && !Array.isArray(tool) &&
                !('name' in tool && 'description' in tool && 'parameters' in tool) && // Check if NOT ToolDefinition like
                Object.values(tool).some(value =>
                    typeof value === 'object' && value !== null &&
                    ('command' in value || 'url' in value))) {

                // --- This is likely an MCP configuration --- 
                log.debug('Found MCP server configuration to register');
                const mcpConfig = tool as MCPServersMap;
                const mcpAdapter = this.getMcpAdapter(); // Get/initialize adapter

                // Register the configurations with the adapter
                for (const [serverKey, serverConfig] of Object.entries(mcpConfig)) {
                    log.debug(`Registering MCP server configuration for ${serverKey}`);
                    mcpAdapter.registerServerConfig(serverKey, serverConfig);
                }
            } else if (typeof tool === 'string' || (tool && typeof tool === 'object' && 'name' in tool)) {
                // It's a string or looks like a ToolDefinition
                standardTools.push(tool as ToolDefinition | string);
            } else {
                log.warn('Skipping item in addTools array:', tool);
            }
        }

        // Resolve and add standard tool definitions to ToolsManager
        // Use the constructor's toolsDir if none provided here (resolveToolDefinitions handles this)
        if (standardTools.length > 0) {
            const resolvedStandardTools = await this.resolveToolDefinitions(standardTools /*, uses this.folderLoader internally */);
            this.toolsManager.addTools(resolvedStandardTools);
        }
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
            logger.debug('Lazily initialized MCPServiceAdapter in getMcpAdapter');
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
        const log = logger.createLogger({ prefix: 'LLMCaller.disconnectMcpServer' });

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

    /**
     * Processes image output from a response, including saving to file if outputPath provided
     * @param response The chat response that might contain image data
     * @param outputPath Optional path to save the image to
     * @private
     */
    private async processImageOutput(
        response: UniversalChatResponse,
        outputPath?: string
    ): Promise<UniversalChatResponse> {
        const log = logger.createLogger({ prefix: 'LLMCaller.processImageOutput' });

        // If there's no image in the response or no outputPath, return as-is
        if (!response.image || !outputPath) {
            return response;
        }

        try {
            log.debug(`Processing image output, saving to: ${outputPath}`);

            // Save the image to the specified path
            await saveBase64ToFile(
                response.image.data,
                outputPath,
                response.image.mime
            );

            log.debug(`Successfully saved image to ${outputPath}`);

            // Add the saved path to the response metadata for reference
            if (!response.metadata) {
                response.metadata = {};
            }

            response.metadata.imageSavedPath = outputPath;

            return response;
        } catch (error) {
            log.error('Failed to save image output:', error);
            throw new Error(`Failed to save image to ${outputPath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}