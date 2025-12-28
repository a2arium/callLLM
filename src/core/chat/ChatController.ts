// src/core/caller/chat/ChatController.ts

import { ProviderManager } from '../caller/ProviderManager.ts';
import { ModelManager } from '../models/ModelManager.ts';
import { ResponseProcessor } from '../processors/ResponseProcessor.ts';
import { RetryManager } from '../retry/RetryManager.ts';
import { UsageTracker } from '../telemetry/UsageTracker.ts';
import type { UniversalChatParams, UniversalChatResponse, UniversalMessage, UniversalChatSettings, JSONSchemaDefinition, HistoryMode, JsonModeType, ResponseFormat } from '../../interfaces/UniversalInterfaces.ts';
import { toMessageParts } from '../../interfaces/UniversalInterfaces.ts';
import { FinishReason } from '../../interfaces/UniversalInterfaces.ts';
import { z } from 'zod';
import { shouldRetryDueToContent } from "../retry/utils/ShouldRetryDueToContent.ts";
import { shouldRetryDueToLLMError } from "../retry/utils/ShouldRetryDueToLLMError.ts";
import { logger } from '../../utils/logger.ts';
import { ToolController } from '../tools/ToolController.ts';
import { ToolOrchestrator } from '../tools/ToolOrchestrator.ts';
import { HistoryManager } from '../history/HistoryManager.ts';
import { HistoryTruncator } from '../history/HistoryTruncator.ts';
import { TokenCalculator } from '../models/TokenCalculator.ts';
import { PromptEnhancer } from '../prompt/PromptEnhancer.ts';
import { MCPServiceAdapter } from '../mcp/MCPServiceAdapter.ts';
import type { TelemetryCollector } from '../telemetry/collector/TelemetryCollector.ts'
import type { ConversationContext, LLMCallContext, PromptMessage } from '../telemetry/collector/types.ts'

export class ChatController {
    // Keep track of the orchestrator - needed for recursive calls
    private toolOrchestrator?: ToolOrchestrator;
    private historyTruncator: HistoryTruncator;
    private toolController: ToolController;
    private historyManager: HistoryManager;
    private mcpAdapterProvider: () => MCPServiceAdapter | null = () => null;
    private telemetryCollector?: TelemetryCollector;
    private conversationCtx?: ConversationContext;

    constructor(
        private providerManager: ProviderManager,
        private modelManager: ModelManager,
        private responseProcessor: ResponseProcessor,
        private retryManager: RetryManager,
        private usageTracker: UsageTracker,
        toolController: ToolController,
        toolOrchestrator: ToolOrchestrator | undefined,
        historyManager: HistoryManager,
        mcpAdapterProvider?: () => MCPServiceAdapter | null,
        telemetryCollector?: TelemetryCollector
    ) {
        this.toolController = toolController;
        this.toolOrchestrator = toolOrchestrator;
        this.historyManager = historyManager;
        if (mcpAdapterProvider) {
            this.mcpAdapterProvider = mcpAdapterProvider;
        }
        this.historyTruncator = new HistoryTruncator(new TokenCalculator());
        this.telemetryCollector = telemetryCollector;

        const log = logger.createLogger({
            prefix: 'ChatController.constructor',
            level: process.env.LOG_LEVEL as any || 'info'
        });
        log.debug('Initialized ChatController');
    }

    // Allow LLMCaller to inject telemetry context for a specific conversation
    public setTelemetryContext(collector: TelemetryCollector | undefined, conversationCtx?: ConversationContext): void {
        this.telemetryCollector = collector;
        this.conversationCtx = conversationCtx;
    }

    // Method for LLMCaller to set the orchestrator after initialization
    public setToolOrchestrator(orchestrator: ToolOrchestrator): void {
        this.toolOrchestrator = orchestrator;
    }

    // Add a setter for the adapter provider
    public setMCPAdapterProvider(provider: () => MCPServiceAdapter | null): void {
        this.mcpAdapterProvider = provider;
    }

    // OpenTelemetry is now provided via TelemetryCollector provider; explicit setter removed

    /**
     * Executes a chat call using the provided parameters.
     *
     * @param params - The full UniversalChatParams object containing messages, settings, tools, etc.
     * @returns A promise resolving to the processed chat response.
     */
    async execute<T extends z.ZodType | undefined = undefined>(
        // Update signature to accept UniversalChatParams
        params: UniversalChatParams
    ): Promise<UniversalChatResponse<T extends z.ZodType ? z.infer<T> : unknown>> {
        const log = logger.createLogger({ prefix: 'ChatController.execute' });

        log.debug('Executing chat call with params:', params);

        // Extract necessary info directly from params
        const {
            model,
            messages,
            settings,
            jsonSchema,
            responseFormat,
            tools,
            callerId,
            historyMode
        } = params;

        // Telemetry (Collector) context
        let llmCtx: LLMCallContext | undefined;
        let llmSpanEnded = false;

        try {
            // --- Telemetry: Collector start LLM ---
            const providerName = (this.providerManager.getCurrentProviderName?.() as unknown as string) || this.providerManager.getProvider().constructor.name || 'unknown';
            if (this.telemetryCollector && this.conversationCtx) {
                // Build toolsAvailable list as just tool names
                const toolsAvailable = (tools || []).map(t => t.name);
                llmCtx = this.telemetryCollector.startLLM(this.conversationCtx, {
                    provider: String(providerName).toLowerCase(),
                    model,
                    streaming: false,
                    responseFormat: responseFormat === 'json' ? 'json' : 'text',
                    toolsEnabled: Boolean(tools && tools.length > 0),
                    toolsAvailable: toolsAvailable,
                    settings
                });
                const promptMessages: PromptMessage[] = (messages || []).map((m, idx) => ({
                    role: m.role as any,
                    content: typeof m.content === 'string' ? m.content : String(m.content ?? ''),
                    sequence: idx
                }));
                this.telemetryCollector.addPrompt(llmCtx, promptMessages);
            }

            const mergedSettings = { ...settings }; // Work with a mutable copy

            // Determine effective response format based on jsonSchema or explicit format
            let effectiveResponseFormat = responseFormat || 'text';
            if (jsonSchema) {
                effectiveResponseFormat = 'json';
            }

            // Get the model info early for history truncation
            const modelInfo = this.modelManager.getModel(model);
            if (!modelInfo) throw new Error(`Model ${model} not found`);

            // Validate JSON mode capability if needed and get injection flag
            const { usePromptInjection } = this.responseProcessor.validateJsonMode(modelInfo, params) || { usePromptInjection: false };

            // Get message list according to history mode
            let messagesForProvider = messages;
            // Determine effective history mode from top-level only (default to 'stateless')
            const effectiveHistoryMode: HistoryMode = historyMode ?? 'stateless';

            if (effectiveHistoryMode?.toLowerCase() === 'dynamic' && this.historyManager) {
                log.debug('Using dynamic history mode for chat - intelligently truncating history');

                // Get all historical messages
                const allMessages = this.historyManager.getMessages(true);

                // If we have a truncator and messages to dynamic, do the truncation
                if (allMessages.length > 0) {
                    // Use the history truncator to intelligently truncate messages
                    messagesForProvider = this.historyTruncator.truncate(
                        allMessages,
                        modelInfo,
                        modelInfo.maxResponseTokens
                    );

                    log.debug(`Dynamic mode: sending ${messagesForProvider.length} messages to provider (from original ${allMessages.length})`);
                }
            }

            // Find the system message within the provided messages array
            const systemMessageContent = messagesForProvider.find(m => m.role === 'system')?.content || '';

            // Use PromptEnhancer for adding JSON instructions
            const enhancedMessages = effectiveResponseFormat === 'json'
                ? PromptEnhancer.enhanceMessages(
                    // Ensure system message is first, followed by all other messages
                    [
                        { role: 'system', content: systemMessageContent },
                        ...messagesForProvider.filter(m => m.role !== 'system')
                    ],
                    {
                        responseFormat: 'json',
                        jsonSchema: jsonSchema,
                        isNativeJsonMode: !usePromptInjection
                    })
                : messagesForProvider;

            // Add format instruction to history if present
            if (this.historyManager && effectiveResponseFormat === 'json') {
                const formatInstruction = enhancedMessages.find(msg =>
                    msg.role === 'user' && msg.metadata?.isFormatInstruction);

                if (formatInstruction) {
                    // Only add if we don't already have an instruction with the same content
                    const existingInstructions = this.historyManager.getMessages(true).filter(msg =>
                        msg.metadata?.isFormatInstruction);

                    const alreadyHasInstruction = existingInstructions.some(msg => {
                        const msgParts = toMessageParts(msg.content);
                        const formatParts = toMessageParts(formatInstruction.content);
                        return msg.content === formatInstruction.content;
                    });

                    if (!alreadyHasInstruction) {
                        this.historyManager.addMessage(
                            formatInstruction.role,
                            formatInstruction.content,
                            { metadata: { isFormatInstruction: true } }
                        );
                    }
                }
            }

            // We no longer update the system message from enhanced messages
            // This prevents accumulation of JSON instructions in the system message

            // Validate messages (ensure role, content/tool_calls validity)
            const validatedMessages = enhancedMessages.map(msg => {
                if (!msg.role) throw new Error('Message missing role');
                const parts = toMessageParts(msg.content);
                const hasContent = msg.content && msg.content.trim().length > 0;
                const hasToolCalls = msg.toolCalls && msg.toolCalls.length > 0;
                if (!hasContent && !hasToolCalls && msg.role !== 'assistant' && msg.role !== 'tool') {
                    throw new Error(`Message from role '${msg.role}' must have content or tool calls.`);
                }
                return {
                    ...msg,
                    content: msg.content || '' // Ensure content is always a string
                };
            });

            // Reconstruct chatParams for the provider call, including tools
            const chatParamsForProvider: UniversalChatParams = {
                model: model, // Pass model name
                messages: validatedMessages,
                settings: mergedSettings,
                jsonSchema: jsonSchema, // Pass schema info if provider needs it
                responseFormat: effectiveResponseFormat, // Pass effective format
                tools: tools, // Pass tool definitions
                callerId: callerId,
                historyMode: historyMode // Pass history mode
            };

            log.debug('Sending messages:', JSON.stringify(chatParamsForProvider.messages, null, 2));
            if (tools && tools.length > 0) log.debug('With tools:', tools.map(t => t.name));
            if (historyMode) log.debug('Using history mode:', historyMode);

            // Get last user message content for usage tracking (best effort)
            // Still ignore format instructions for usage tracking, but keep them in history
            const lastUserMessage = [...validatedMessages]
                .reverse()
                .find(m => m.role === 'user' && !m.metadata?.isFormatInstruction)?.content || '';

            const effectiveMaxRetries = mergedSettings?.maxRetries ?? 3;
            const localRetryManager = new RetryManager({ baseDelay: 1000, maxRetries: effectiveMaxRetries });

            // Execute the provider chat call with retry logic
            let response = await localRetryManager.executeWithRetry(
                async () => {
                    const exec = async () => {
                        const resp = await this.providerManager.getProvider().chatCall(model, chatParamsForProvider);
                        if (!resp) {
                            throw new Error('No response received from provider');
                        }
                        if (!resp.metadata) resp.metadata = {};

                        const systemContentForUsage = systemMessageContent;

                        // Only calculate tokens if the provider didn't include usage data
                        if (!resp.metadata?.usage?.tokens?.input?.total) {
                            const usage = await this.usageTracker.trackUsage(
                                systemContentForUsage + '\n' + lastUserMessage,
                                resp.content ?? '',
                                modelInfo,
                                resp.metadata?.usage?.tokens?.input?.cached,
                                resp.metadata?.usage?.tokens?.output?.reasoning,
                                {
                                    inputImageTokens: resp.metadata?.usage?.tokens?.input?.image,
                                    outputImageTokens: resp.metadata?.usage?.tokens?.output?.image
                                }
                            );

                            resp.metadata.usage = usage;
                        } else {
                            // If provider already supplied usage data (e.g., image tokens), calculate costs only
                            if (resp.metadata?.usage && !resp.metadata.usage.costs?.total) {
                                const existingTokens = resp.metadata.usage.tokens;

                                // Calculate costs based on the provider's token counts
                                resp.metadata.usage.costs = this.usageTracker.calculateCosts(
                                    existingTokens.input.total,
                                    existingTokens.output.total,
                                    modelInfo,
                                    existingTokens.input.cached || 0,
                                    existingTokens.output.reasoning || 0
                                );

                                // Add explicit callback trigger for provider-supplied usage data
                                // This ensures the callback is triggered even when the provider returns usage data
                                await this.usageTracker.triggerCallback(resp.metadata.usage);
                            }
                        }

                        // Pass the complete response object to consider tool calls in the retry decision
                        const contentRetryResult = shouldRetryDueToContent(resp);
                        if (contentRetryResult.shouldRetry) {
                            throw new Error(`Response content triggered retry: ${contentRetryResult.reason}. First 255 chars: ${resp.content?.substring(0, 255)}`);
                        }
                        return resp;
                    };

                    return await exec();
                },
                (error: unknown) => {
                    // Use the centralized shouldRetryDueToLLMError utility
                    // This handles both content-triggered retries and HTTP status/network errors
                    return shouldRetryDueToLLMError(error);
                }
            );

            // Ensure we have a valid response object before validation
            if (!response) {
                throw new Error('No response received from provider');
            }

            // Before processing tools, record span output for this LLM call
            // so that each LLM span reflects its own output (tool call request or text)
            const hasToolCalls = Boolean(
                (response.toolCalls?.length ?? 0) > 0 ||
                response.metadata?.finishReason === FinishReason.TOOL_CALLS
            );

            let finalResponse = response; // Assume original response is final unless resubmission happens

            if (this.telemetryCollector && llmCtx) {
                if (hasToolCalls) {
                    const tc = (response.toolCalls || []).map(tc => ({ id: tc.id, name: tc.name, arguments: tc.arguments }));
                    this.telemetryCollector.addChoice(llmCtx, {
                        content: '',
                        contentLength: 0,
                        index: 0,
                        finishReason: response.metadata?.finishReason || 'tool_calls',
                        isChunk: false,
                        isToolCall: true,
                        toolCalls: tc
                    });
                    this.telemetryCollector.endLLM(llmCtx, response.metadata?.usage as any, response.metadata?.model);
                    llmSpanEnded = true;
                }
            }

            // Process tool calls if detected in the response
            if (hasToolCalls && this.toolController && this.toolOrchestrator && this.historyManager) {
                log.debug('Tool calls detected, processing...');

                this.historyManager.addMessage('assistant', response.content ?? '', { toolCalls: response.toolCalls });

                const { requiresResubmission } = await this.toolOrchestrator.processToolCalls(
                    response,
                    params.tools || [], // Pass original tools
                    this.mcpAdapterProvider // Pass the provider function
                );

                if (requiresResubmission) {
                    log.debug('Tool results require resubmission to model.');
                    log.debug('Resubmitting with updated messages including tool results');

                    // Call execute recursively, explicitly passing necessary context
                    finalResponse = await this.execute<T>({
                        ...params, // Spread original params
                        messages: this.historyManager.getMessages(true), // Use updated history
                        tools: undefined, // No tools needed for resubmission
                        settings: {
                            ...params.settings,
                            toolChoice: undefined // No tool choice needed
                        },
                        jsonSchema: jsonSchema, // Explicitly pass original schema
                        responseFormat: effectiveResponseFormat // Explicitly pass original format
                    });
                } else {
                    log.debug('Tool calls processed, no resubmission required.');
                    // If no resubmission, the original `response` might be the final one
                    // (e.g., if toolChoice was 'none' or model decided not to call tools)
                    // Or it might just contain the tool call request without final content.
                    // The validation below should handle this.
                }
            } else if (hasToolCalls) {
                log.warn('Tool calls detected but ToolController, ToolOrchestrator, or HistoryManager is missing. Cannot process tools.');
            }

            // Validate the FINAL response (original or from recursion)
            const validationParams: UniversalChatParams = {
                messages: [],  // Not used in validation
                model: model,
                settings: mergedSettings,
                jsonSchema: jsonSchema, // Use the original schema for validation
                responseFormat: effectiveResponseFormat // Use the original format for validation
            };

            const validatedResponse = await this.responseProcessor.validateResponse<T>(
                finalResponse,
                validationParams,
                modelInfo,
                { usePromptInjection }
            );

            // Ensure we have a valid response after validation
            if (!validatedResponse) {
                throw new Error('Response validation failed or returned null/undefined');
            }

            // Ensure the final assistant message is in history if not already added during tool call flow
            // Check if the *final* response was the one that initiated tool calls
            const finalResponseInitiatedTools = Boolean(
                (validatedResponse.toolCalls?.length ?? 0) > 0 ||
                validatedResponse.metadata?.finishReason === FinishReason.TOOL_CALLS
            );

            if (!finalResponseInitiatedTools && this.historyManager && effectiveHistoryMode !== 'stateless') {
                // If the *final* response doesn't have tool calls, add it to history.
                // This handles cases where the initial response had tool calls, but the *final* one after resubmission doesn't.
                // Also handles cases where there were no tool calls at all.
                this.historyManager.addMessage('assistant', validatedResponse.content ?? '', { toolCalls: validatedResponse.toolCalls });
            }

            // --- Telemetry: Collector end LLM (only if not already ended for tool_calls) ---
            if (this.telemetryCollector && llmCtx && !llmSpanEnded) {
                const content = validatedResponse.content ?? '';
                this.telemetryCollector.addChoice(llmCtx, {
                    content,
                    contentLength: content.length,
                    index: 0,
                    finishReason: validatedResponse.metadata?.finishReason || 'stop'
                });
                this.telemetryCollector.endLLM(llmCtx, validatedResponse.metadata?.usage as any, validatedResponse.metadata?.model);
            }
            log.debug('Final validated response being returned:', validatedResponse);
            return validatedResponse;
        } catch (err) {
            throw err;
        }
    }
}