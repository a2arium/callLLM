import { UniversalChatParams, UniversalStreamResponse, ModelInfo, HistoryMode } from '../../interfaces/UniversalInterfaces';
import { ProviderManager } from '../caller/ProviderManager';
import { ModelManager } from '../models/ModelManager';
import { TokenCalculator } from '../models/TokenCalculator';
import { ResponseProcessor } from '../processors/ResponseProcessor';
import { RetryManager } from '../retry/RetryManager';
import { UsageCallback } from '../../interfaces/UsageInterfaces';
import { StreamHandler } from './StreamHandler';
import { logger } from '../../utils/logger';
import { StreamPipeline } from './StreamPipeline';
import { UsageTracker } from '../telemetry/UsageTracker';
import { ContentAccumulator } from './processors/ContentAccumulator';
import { ToolController } from '../tools/ToolController';
import { ToolOrchestrator } from '../tools/ToolOrchestrator';
import { HistoryManager } from '../history/HistoryManager';
import { HistoryTruncator } from '../history/HistoryTruncator';

/**
 * StreamingService
 * 
 * A service that encapsulates all streaming functionality for the LLM client.
 * It handles provider interactions, stream processing, and usage tracking.
 */
export type StreamingServiceOptions = {
    usageCallback?: UsageCallback;
    callerId?: string;
    tokenBatchSize?: number;
    maxRetries?: number;
};

export class StreamingService {
    private tokenCalculator: TokenCalculator;
    private responseProcessor: ResponseProcessor;
    private streamHandler: StreamHandler;
    private usageTracker: UsageTracker;
    private retryManager: RetryManager;
    private historyTruncator: HistoryTruncator;

    constructor(
        private providerManager: ProviderManager,
        private modelManager: ModelManager,
        private historyManager: HistoryManager,
        retryManager?: RetryManager,
        usageCallback?: UsageCallback,
        callerId?: string,
        options?: {
            tokenBatchSize?: number;
        },
        private toolController?: ToolController,
        private toolOrchestrator?: ToolOrchestrator
    ) {
        this.tokenCalculator = new TokenCalculator();
        this.responseProcessor = new ResponseProcessor();
        this.usageTracker = new UsageTracker(
            this.tokenCalculator,
            usageCallback,
            callerId
        );
        this.streamHandler = new StreamHandler(
            this.tokenCalculator,
            this.historyManager,
            this.responseProcessor,
            usageCallback,
            callerId,
            this.toolController,
            this.toolOrchestrator,
            this
        );
        this.retryManager = retryManager || new RetryManager({
            maxRetries: 3,
            baseDelay: 1000
        });
        this.historyTruncator = new HistoryTruncator(this.tokenCalculator);

        logger.setConfig({
            level: process.env.LOG_LEVEL as any || 'info',
            prefix: 'StreamingService'
        });

        logger.debug('Initialized StreamingService', {
            callerId,
            tokenBatchSize: options?.tokenBatchSize || 100,
            hasToolController: Boolean(this.toolController),
            hasToolOrchestrator: Boolean(this.toolOrchestrator)
        });
    }

    /**
     * Creates a stream from the LLM provider and processes it through the stream pipeline
     */
    public async createStream(
        params: UniversalChatParams,
        model: string,
        systemMessage?: string
    ): Promise<AsyncIterable<UniversalStreamResponse>> {
        logger.setConfig({
            level: process.env.LOG_LEVEL as any || 'info',
            prefix: 'StreamingService.createStream'
        });

        // Ensure system message is included if provided
        if (systemMessage && !params.messages.some(m => m.role === 'system')) {
            params.messages = [
                { role: 'system', content: systemMessage },
                ...params.messages
            ];
        }

        // Log the history mode if it's set
        if (params.historyMode || (params.settings && params.settings.historyMode)) {
            const effectiveHistoryMode = params.historyMode || params.settings?.historyMode;
            logger.debug('Using history mode:', effectiveHistoryMode);
        }

        // Calculate input tokens
        const inputTokens = this.tokenCalculator.calculateTotalTokens(params.messages);
        const modelInfo = this.modelManager.getModel(model);

        if (!modelInfo) {
            throw new Error(`Model ${model} not found for provider ${this.providerManager.getProvider().constructor.name}`);
        }

        logger.debug('Creating stream', {
            model,
            inputTokens,
            callerId: params.callerId,
            toolsEnabled: Boolean(params.tools?.length)
        });

        return this.executeWithRetry(model, params, inputTokens, modelInfo);
    }

    /**
     * Execute the stream request with retry capability
     */
    private async executeWithRetry(
        model: string,
        params: UniversalChatParams,
        inputTokens: number,
        modelInfo: ModelInfo
    ): Promise<AsyncIterable<UniversalStreamResponse>> {
        try {
            const maxRetries = params.settings?.maxRetries ?? 3; // Default to 3 retries

            logger.debug('Executing stream with retry', {
                model,
                maxRetries,
                callerId: params.callerId
            });

            return await this.retryManager.executeWithRetry(
                async () => {
                    return await this.executeStreamRequest(model, params, inputTokens, modelInfo);
                },
                // No internal retry logic in this function
                () => false
            );
        } catch (error) {
            logger.error('Stream execution failed after retries', {
                error: error instanceof Error ? error.message : String(error),
                model
            });
            throw error;
        }
    }

    /**
     * Execute a single stream request to the provider
     */
    private async executeStreamRequest(
        model: string,
        params: UniversalChatParams,
        inputTokens: number,
        modelInfo: ModelInfo
    ): Promise<AsyncIterable<UniversalStreamResponse>> {
        const provider = this.providerManager.getProvider();
        const startTime = Date.now();

        try {
            // Check for history mode
            const effectiveHistoryMode = params.historyMode || params.settings?.historyMode;

            if (effectiveHistoryMode?.toLowerCase() === 'dynamic') {
                logger.debug('Using dynamic history mode for streaming - intelligently truncating history');

                // Get all historical messages
                const allMessages = this.historyManager.getMessages();

                // If we have messages to truncate, do the truncation
                if (allMessages.length > 0) {
                    // Use the history truncator to intelligently truncate messages
                    const truncatedMessages = this.historyTruncator.truncate(
                        allMessages,
                        modelInfo,
                        modelInfo.maxResponseTokens
                    );

                    // Ensure current user message is included
                    const currentUserMessages = params.messages || [];

                    // Update the params with truncated messages + current user message
                    params = {
                        ...params,
                        messages: [...truncatedMessages, ...currentUserMessages]
                    };

                    logger.debug(`Dynamic mode: streaming with ${params.messages.length} messages to provider (from original ${allMessages.length})`);

                    // Recalculate input tokens based on the truncated messages
                    inputTokens = this.tokenCalculator.calculateTotalTokens(params.messages);
                }
            }

            logger.debug('Requesting provider stream', {
                provider: provider.constructor.name,
                model,
                callerId: params.callerId
            });

            // Request stream from provider
            const providerStream = await provider.streamCall(model, params);

            logger.debug('Provider stream created', {
                timeToCreateMs: Date.now() - startTime,
                model
            });

            // Process the stream through the stream handler
            return this.streamHandler.processStream(
                providerStream,
                params,
                inputTokens,
                modelInfo
            );
        } catch (error) {
            logger.error('Stream request failed', {
                error: error instanceof Error ? error.message : String(error),
                model,
                timeToFailMs: Date.now() - startTime
            });
            throw error;
        }
    }

    /**
     * Update the callerId used for usage tracking
     */
    public setCallerId(newId: string): void {
        // Create new streamHandler with updated ID
        this.streamHandler = new StreamHandler(
            this.tokenCalculator,
            this.historyManager,
            this.responseProcessor,
            this.usageTracker['callback'], // Access the callback from usageTracker
            newId,
            this.toolController,
            this.toolOrchestrator,
            this
        );

        // Update the UsageTracker to use the new callerId
        this.usageTracker = new UsageTracker(
            this.tokenCalculator,
            this.usageTracker['callback'],
            newId
        );
    }

    /**
     * Update the usage callback
     */
    public setUsageCallback(callback: UsageCallback): void {
        this.usageTracker = new UsageTracker(
            this.tokenCalculator,
            callback,
            this.usageTracker['callerId'] // Access the callerId from usageTracker
        );

        this.streamHandler = new StreamHandler(
            this.tokenCalculator,
            this.historyManager,
            this.responseProcessor,
            callback,
            this.usageTracker['callerId'],
            this.toolController,
            this.toolOrchestrator,
            this
        );
    }

    /**
     * Set the tool orchestrator
     */
    public setToolOrchestrator(toolOrchestrator: ToolOrchestrator): void {
        this.toolOrchestrator = toolOrchestrator;

        // Update the StreamHandler with the new toolOrchestrator
        this.streamHandler = new StreamHandler(
            this.tokenCalculator,
            this.historyManager,
            this.responseProcessor,
            this.usageTracker['callback'], // Access the callback from usageTracker
            this.usageTracker['callerId'], // Access the callerId from usageTracker
            this.toolController,
            toolOrchestrator,
            this
        );

        logger.debug('ToolOrchestrator set on StreamingService', {
            hasToolOrchestrator: Boolean(this.toolOrchestrator)
        });
    }

    /**
     * Get the token calculator instance
     */
    public getTokenCalculator(): TokenCalculator {
        return this.tokenCalculator;
    }

    /**
     * Get the response processor instance
     */
    public getResponseProcessor(): ResponseProcessor {
        return this.responseProcessor;
    }
} 