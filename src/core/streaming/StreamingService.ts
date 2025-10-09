import type { UniversalChatParams, UniversalStreamResponse, ModelInfo, HistoryMode } from '../../interfaces/UniversalInterfaces.ts';
import { ProviderManager } from '../caller/ProviderManager.ts';
import { ModelManager } from '../models/ModelManager.ts';
import { TokenCalculator } from '../models/TokenCalculator.ts';
import { ResponseProcessor } from '../processors/ResponseProcessor.ts';
import { RetryManager } from '../retry/RetryManager.ts';
import type { UsageCallback } from '../../interfaces/UsageInterfaces.ts';
import { StreamHandler } from './StreamHandler.ts';
import { logger } from '../../utils/logger.ts';
import { UsageTracker } from '../telemetry/UsageTracker.ts';
import { ToolController } from '../tools/ToolController.ts';
import { ToolOrchestrator } from '../tools/ToolOrchestrator.ts';
import { HistoryManager } from '../history/HistoryManager.ts';
import { HistoryTruncator } from '../history/HistoryTruncator.ts';
import { MCPServiceAdapter } from '../mcp/MCPServiceAdapter.ts';
import type { TelemetryCollector } from '../telemetry/collector/TelemetryCollector.ts'
import type { ConversationContext, LLMCallContext } from '../telemetry/collector/types.ts'

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
    private mcpAdapterProvider: () => MCPServiceAdapter | null = () => null;
    private telemetryCollector?: TelemetryCollector;
    private conversationCtx?: ConversationContext;
    private llmCtx?: LLMCallContext;

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
        private toolOrchestrator?: ToolOrchestrator,
        mcpAdapterProvider?: () => MCPServiceAdapter | null,
        telemetryCollector?: TelemetryCollector
    ) {
        this.tokenCalculator = new TokenCalculator();
        this.responseProcessor = new ResponseProcessor();
        this.usageTracker = new UsageTracker(
            this.tokenCalculator,
            usageCallback,
            callerId
        );
        if (mcpAdapterProvider) {
            this.mcpAdapterProvider = mcpAdapterProvider;
        }
        this.telemetryCollector = telemetryCollector;
        this.streamHandler = new StreamHandler(
            this.tokenCalculator,
            this.historyManager,
            this.responseProcessor,
            usageCallback,
            callerId,
            this.toolController,
            this.toolOrchestrator,
            this,
            this.mcpAdapterProvider
        );
        this.retryManager = retryManager || new RetryManager({
            maxRetries: 3,
            baseDelay: 1000
        });
        this.historyTruncator = new HistoryTruncator(this.tokenCalculator);

        const log = logger.createLogger({
            level: process.env.LOG_LEVEL as any || 'info',
            prefix: 'StreamingService.constructor'
        });

        log.debug('Initialized StreamingService', {
            callerId,
            tokenBatchSize: options?.tokenBatchSize || 100,
            hasToolController: Boolean(this.toolController),
            hasToolOrchestrator: Boolean(this.toolOrchestrator),
            hasCollector: Boolean(this.telemetryCollector)
        });
    }

    public setTelemetryContext(collector: TelemetryCollector | undefined, conversationCtx?: ConversationContext): void {
        this.telemetryCollector = collector;
        this.conversationCtx = conversationCtx;
    }

    /**
     * Creates a stream from the LLM provider and processes it through the stream pipeline
     */
    public async createStream(
        params: UniversalChatParams,
        model: string,
        systemMessage?: string
    ): Promise<AsyncIterable<UniversalStreamResponse>> {
        const log = logger.createLogger({
            level: process.env.LOG_LEVEL as any || 'info',
            prefix: 'StreamingService.createStream'
        });

        // Collector: start LLM for streaming
        const providerName = (this.providerManager.getCurrentProviderName?.() as unknown as string) || this.providerManager.getProvider()?.constructor?.name || 'unknown';
        if (this.telemetryCollector) {
            // Ensure providers are ready so spans attach correctly
            try { await (this.telemetryCollector as any).awaitReady?.(); } catch { /* ignore */ }
            // Only use the injected conversation context; do not auto-create here to avoid duplicates
            if (!this.conversationCtx) {
                const logMissing = logger.createLogger({ prefix: 'StreamingService.createStream' });
                logMissing.debug('No injected conversationCtx; streaming will proceed without telemetry conversation');
            }
            if (this.conversationCtx) {
                const toolsAvailable = (params.tools || []).map(t => t.name);
                this.llmCtx = this.telemetryCollector.startLLM(this.conversationCtx, {
                    provider: String(providerName).toLowerCase(),
                    model,
                    streaming: true,
                    responseFormat: params.responseFormat === 'json' ? 'json' : 'text',
                    toolsEnabled: Boolean(params.tools && params.tools.length > 0),
                    toolsAvailable: toolsAvailable,
                    settings: params.settings
                });
                // Emit prompt messages
                const msgs = (params.messages || []).map((m, idx) => ({
                    role: m.role as any,
                    content: typeof m.content === 'string' ? m.content : String(m.content ?? ''),
                    sequence: idx
                }));
                this.telemetryCollector.addPrompt(this.llmCtx, msgs);
            }
        }

        // Ensure system message is included if provided
        if (systemMessage && !params.messages.some(m => m.role === 'system')) {
            params.messages = [
                { role: 'system', content: systemMessage },
                ...params.messages
            ];
        }

        // Log the history mode if it's set
        if (params.historyMode) {
            log.debug('Using history mode:', params.historyMode);
        }

        // Calculate input tokens
        const inputTokens = this.tokenCalculator.calculateTotalTokens(params.messages);
        const modelInfo = this.modelManager.getModel(model);

        if (!modelInfo) {
            const err = new Error(`Model ${model} not found for provider ${this.providerManager.getProvider().constructor.name}`);
            throw err;
        }

        log.debug('Creating stream', {
            model,
            inputTokens,
            callerId: params.callerId,
            toolsEnabled: Boolean(params.tools?.length)
        });

        // Collector will handle usage; no-op here

        try {
            const stream = await this.executeWithRetry(model, params, inputTokens, modelInfo);
            return this.wrapStreamWithTelemetry(stream, undefined, model);
        } catch (error) {
            throw error;
        }
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
        const log = logger.createLogger({
            prefix: 'StreamingService.executeWithRetry'
        });

        try {
            const maxRetries = params.settings?.maxRetries ?? 3; // Default to 3 retries

            log.debug('Executing stream with retry', {
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
            log.error('Stream execution failed after retries', {
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
        const log = logger.createLogger({
            prefix: 'StreamingService.executeStreamRequest'
        });

        const provider = this.providerManager.getProvider();
        const startTime = Date.now();

        try {
            // Check for history mode
            const effectiveHistoryMode: HistoryMode = params.historyMode ?? 'stateless';
            if (effectiveHistoryMode === 'dynamic') {
                log.debug('Using dynamic history mode for streaming - intelligently truncating history');

                // Get all historical messages
                const allMessages = this.historyManager.getMessages(true);

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

                    log.debug(`Dynamic mode: streaming with ${params.messages.length} messages to provider (from original ${allMessages.length})`);

                    // Recalculate input tokens based on the truncated messages
                    inputTokens = this.tokenCalculator.calculateTotalTokens(params.messages);
                }
            }

            log.debug('Requesting provider stream', {
                provider: provider.constructor.name,
                model,
                callerId: params.callerId
            });

            // Request stream from provider
            const providerStream = await provider.streamCall(model, params);

            log.debug('Provider stream created', {
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
            log.error('Stream request failed', {
                error: error instanceof Error ? error.message : String(error),
                model,
                timeToFailMs: Date.now() - startTime
            });
            throw error;
        }
    }

    /** Wrap outgoing stream to add telemetry events and final usage */
    private async *wrapStreamWithTelemetry(
        stream: AsyncIterable<UniversalStreamResponse>,
        _span?: unknown,
        model?: string
    ): AsyncIterable<UniversalStreamResponse> {
        let last: UniversalStreamResponse | undefined;
        let count = 0;
        let llmSpanEnded = false;
        try {
            for await (const chunk of stream) {
                count++;
                last = chunk;
                // If this chunk carries tool call requests, record them; end the LLM span only when complete
                if (!llmSpanEnded && this.telemetryCollector && this.llmCtx && (chunk as any).toolCalls && (chunk as any).toolCalls.length > 0) {
                    const toolCalls = (chunk as any).toolCalls.map((tc: any) => ({ id: tc.id, name: tc.name, arguments: tc.arguments }));
                    this.telemetryCollector.addChoice(this.llmCtx, {
                        content: '',
                        contentLength: 0,
                        index: 0,
                        sequence: count,
                        finishReason: (chunk as any).metadata?.finishReason || 'tool_calls',
                        isChunk: false,
                        isToolCall: true,
                        toolCalls
                    });
                    // End the LLM span only if this is the final chunk for the call
                    if ((chunk as any).isComplete) {
                        this.telemetryCollector.endLLM(this.llmCtx, (chunk as any)?.metadata?.usage as any, (chunk as any)?.metadata?.model);
                        llmSpanEnded = true;
                    }
                } else {
                    // Regular content chunk
                    const hasContent = Boolean((chunk as any).contentText || chunk.content?.trim());
                    const choiceContent = (chunk as any).contentText || chunk.content || '';
                    if (this.telemetryCollector && this.llmCtx) {
                        this.telemetryCollector.addChoice(this.llmCtx, {
                            content: hasContent ? String(choiceContent) : '',
                            contentLength: String(choiceContent).length,
                            index: 0,
                            sequence: count,
                            finishReason: (chunk as any).isComplete ? ((chunk as any).metadata?.finishReason ?? 'stop') : 'incomplete',
                            isChunk: true
                        });
                    }
                }
                yield chunk;
            }
        } catch (err) {
            throw err;
        }

        if (this.telemetryCollector && this.llmCtx && !llmSpanEnded) {
            // Ensure we pass full text output and final usage to providers that need it (e.g., Opik)
            const finalText = (last as any)?.contentText || (last as any)?.content || '';
            // Add final choice event so non-stream span has complete output
            this.telemetryCollector.addChoice(this.llmCtx, {
                content: finalText,
                contentLength: String(finalText).length,
                index: 0,
                finishReason: (last as any)?.metadata?.finishReason || 'stop'
            });
            this.telemetryCollector.endLLM(this.llmCtx, (last as any)?.metadata?.usage as any, (last as any)?.metadata?.model);
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
     * Set the tool orchestrator for the streaming service
     */
    public setToolOrchestrator(toolOrchestrator: ToolOrchestrator): void {
        const log = logger.createLogger({
            prefix: 'StreamingService.setToolOrchestrator'
        });

        this.toolOrchestrator = toolOrchestrator;

        // If we have a stream handler, update it with the new orchestrator
        if (this.streamHandler) {
            this.streamHandler = new StreamHandler(
                this.tokenCalculator,
                this.historyManager,
                this.responseProcessor,
                this.usageTracker['callback'],
                undefined, // Keep existing callerId
                this.toolController,
                toolOrchestrator,
                this
            );
        }

        log.debug('ToolOrchestrator set on StreamingService', {
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

    /**
     * Add a setter for the adapter provider
     */
    public setMCPAdapterProvider(provider: () => MCPServiceAdapter | null): void {
        this.mcpAdapterProvider = provider;
        // Also update the StreamHandler if it exists
        if (this.streamHandler) {
            this.streamHandler.setMCPAdapterProvider(provider);
        }
    }
} 