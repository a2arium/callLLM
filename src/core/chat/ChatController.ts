// src/core/caller/chat/ChatController.ts

import { ProviderManager } from '../caller/ProviderManager';
import { ModelManager } from '../models/ModelManager';
import { ResponseProcessor } from '../processors/ResponseProcessor';
import { RetryManager } from '../retry/RetryManager';
import { UsageTracker } from '../telemetry/UsageTracker';
import { UniversalChatParams, UniversalChatResponse, FinishReason, UniversalMessage, UniversalChatSettings, JSONSchemaDefinition, HistoryMode } from '../../interfaces/UniversalInterfaces';
import { z } from 'zod';
import { shouldRetryDueToContent } from "../retry/utils/ShouldRetryDueToContent";
import { logger } from '../../utils/logger';
import { ToolController } from '../tools/ToolController';
import { ToolOrchestrator } from '../tools/ToolOrchestrator';
import { HistoryManager } from '../history/HistoryManager';
import { HistoryTruncator } from '../history/HistoryTruncator';
import { TokenCalculator } from '../models/TokenCalculator';
import { PromptEnhancer } from '../prompt/PromptEnhancer';

export class ChatController {
    // Keep track of the orchestrator - needed for recursive calls
    private toolOrchestrator?: ToolOrchestrator;
    private historyTruncator: HistoryTruncator;

    constructor(
        private providerManager: ProviderManager,
        private modelManager: ModelManager,
        private responseProcessor: ResponseProcessor,
        private retryManager: RetryManager,
        private usageTracker: UsageTracker,
        private toolController?: ToolController,
        // ToolOrchestrator is injected after construction in LLMCaller
        toolOrchestrator?: ToolOrchestrator,
        private historyManager?: HistoryManager // Keep optional for flexibility
    ) {
        this.toolOrchestrator = toolOrchestrator; // Store the orchestrator
        this.historyTruncator = new HistoryTruncator(new TokenCalculator());

        logger.setConfig({
            prefix: 'ChatController',
            level: process.env.LOG_LEVEL as any || 'info'
        });
    }

    // Method for LLMCaller to set the orchestrator after initialization
    public setToolOrchestrator(orchestrator: ToolOrchestrator): void {
        this.toolOrchestrator = orchestrator;
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

        // Store the history mode setting in mergedSettings if it exists
        if (historyMode) {
            mergedSettings.historyMode = historyMode;
        }

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
        const effectiveHistoryMode = historyMode || mergedSettings.historyMode;

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
                // Only include the system message once to avoid duplication
                messagesForProvider.filter(m => m.role !== 'system').concat([
                    { role: 'system', content: systemMessageContent }
                ]),
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

                const alreadyHasInstruction = existingInstructions.some(msg =>
                    msg.content === formatInstruction.content);

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
        const response = await localRetryManager.executeWithRetry(
            async () => {
                const resp = await this.providerManager.getProvider().chatCall(model, chatParamsForProvider);
                if (!resp) {
                    throw new Error('No response received from provider');
                }
                if (!resp.metadata) resp.metadata = {};

                const systemContentForUsage = systemMessageContent;
                const usage = await this.usageTracker.trackUsage(
                    systemContentForUsage + '\n' + lastUserMessage,
                    resp.content ?? '',
                    modelInfo,
                    resp.metadata?.usage?.tokens.inputCached,
                    resp.metadata?.usage?.tokens.outputReasoning
                );

                resp.metadata.usage = usage;

                // Pass the complete response object to consider tool calls in the retry decision
                if (shouldRetryDueToContent(resp)) {
                    throw new Error("Response content triggered retry");
                }
                return resp;
            },
            (error: unknown) => {
                // Only retry if the error is due to content triggering retry
                if (error instanceof Error) {
                    return error.message === "Response content triggered retry";
                }
                return false;
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

        if (hasToolCalls && this.toolController && this.toolOrchestrator && this.historyManager) {
            log.debug('Tool calls detected, processing...');

            this.historyManager.addMessage('assistant', response.content ?? '', { toolCalls: response.toolCalls });

            const { requiresResubmission } = await this.toolOrchestrator.processToolCalls(response);

            if (requiresResubmission) {
                log.debug('Tool results require resubmission to model.');

                // Get the updated messages including the tool results that were just added
                const updatedMessages = this.historyManager.getMessages();

                // No longer filtering out format instruction messages
                // We want to keep them in the history for clarity

                // Create a new params object with the updated messages that include tool results
                const recursiveParams: UniversalChatParams = {
                    ...params,
                    messages: updatedMessages,
                    settings: {
                        ...mergedSettings,
                        toolChoice: undefined,
                    },
                    tools: undefined,
                    jsonSchema: undefined,
                    responseFormat: 'text',
                };

                log.debug('Resubmitting with updated messages including tool results');
                return this.execute<T>(recursiveParams);
            }
        }

        // Validate the FINAL response (original or from recursion)
        const validationParams: UniversalChatParams = {
            messages: [],  // Required by UniversalChatParams but not used in validation
            model: model,  // Pass actual model name
            settings: mergedSettings,
            jsonSchema: params.jsonSchema,
            responseFormat: params.responseFormat
        };

        const validatedResponse = await this.responseProcessor.validateResponse<T>(
            response,
            validationParams,
            modelInfo,
            { usePromptInjection }
        );

        // Ensure we have a valid response after validation
        if (!validatedResponse) {
            throw new Error('Response validation failed');
        }

        // Ensure the final assistant message (if not already added during tool call flow) is in history
        if (!hasToolCalls) {
            // If there were no tool calls, add the final assistant response now
            this.historyManager?.addMessage('assistant', validatedResponse.content || '');
        }

        return validatedResponse;
    }
}