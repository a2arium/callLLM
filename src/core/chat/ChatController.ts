// src/core/caller/chat/ChatController.ts

import { ProviderManager } from '../caller/ProviderManager';
import { ModelManager } from '../models/ModelManager';
import { ResponseProcessor } from '../processors/ResponseProcessor';
import { RetryManager } from '../retry/RetryManager';
import { UsageTracker } from '../telemetry/UsageTracker';
import { UniversalChatParams, UniversalChatResponse, FinishReason, UniversalMessage, UniversalChatSettings, JSONSchemaDefinition, HistoryMode, JsonModeType, ResponseFormat, toMessageParts } from '../../interfaces/UniversalInterfaces';
import { z } from 'zod';
import { shouldRetryDueToContent } from "../retry/utils/ShouldRetryDueToContent";
import { shouldRetryDueToLLMError } from "../retry/utils/ShouldRetryDueToLLMError";
import { logger } from '../../utils/logger';
import { ToolController } from '../tools/ToolController';
import { ToolOrchestrator } from '../tools/ToolOrchestrator';
import { HistoryManager } from '../history/HistoryManager';
import { HistoryTruncator } from '../history/HistoryTruncator';
import { TokenCalculator } from '../models/TokenCalculator';
import { PromptEnhancer } from '../prompt/PromptEnhancer';
import { MCPServiceAdapter } from '../mcp/MCPServiceAdapter';

export class ChatController {
    // Keep track of the orchestrator - needed for recursive calls
    private toolOrchestrator?: ToolOrchestrator;
    private historyTruncator: HistoryTruncator;
    private toolController: ToolController;
    private historyManager: HistoryManager;
    private mcpAdapterProvider: () => MCPServiceAdapter | null = () => null;

    constructor(
        private providerManager: ProviderManager,
        private modelManager: ModelManager,
        private responseProcessor: ResponseProcessor,
        private retryManager: RetryManager,
        private usageTracker: UsageTracker,
        toolController: ToolController,
        toolOrchestrator: ToolOrchestrator | undefined,
        historyManager: HistoryManager,
        mcpAdapterProvider?: () => MCPServiceAdapter | null
    ) {
        this.toolController = toolController;
        this.toolOrchestrator = toolOrchestrator;
        this.historyManager = historyManager;
        if (mcpAdapterProvider) {
            this.mcpAdapterProvider = mcpAdapterProvider;
        }
        this.historyTruncator = new HistoryTruncator(new TokenCalculator());

        const log = logger.createLogger({
            prefix: 'ChatController.constructor',
            level: process.env.LOG_LEVEL as any || 'info'
        });
        log.debug('Initialized ChatController');
    }

    // Method for LLMCaller to set the orchestrator after initialization
    public setToolOrchestrator(orchestrator: ToolOrchestrator): void {
        this.toolOrchestrator = orchestrator;
    }

    // Add a setter for the adapter provider
    public setMCPAdapterProvider(provider: () => MCPServiceAdapter | null): void {
        this.mcpAdapterProvider = provider;
    }

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
            const allMessages = this.historyManager.getMessages();

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
                const existingInstructions = this.historyManager.getMessages().filter(msg =>
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
                        resp.metadata?.usage?.tokens?.input?.image  // Pass image tokens if present
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
                if (shouldRetryDueToContent(resp)) {
                    throw new Error("Response content triggered retry");
                }
                return resp;
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

        // Process tool calls if detected in the response
        const hasToolCalls = Boolean(
            (response.toolCalls?.length ?? 0) > 0 ||
            response.metadata?.finishReason === FinishReason.TOOL_CALLS
        );

        let finalResponse = response; // Assume original response is final unless resubmission happens

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
                    messages: this.historyManager.getMessages(), // Use updated history
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

        log.debug('Final validated response being returned:', validatedResponse);
        return validatedResponse;
    }
}