// src/core/caller/chat/ChatController.ts

import { ProviderManager } from '../caller/ProviderManager';
import { ModelManager } from '../models/ModelManager';
import { ResponseProcessor } from '../processors/ResponseProcessor';
import { RetryManager } from '../retry/RetryManager';
import { UsageTracker } from '../telemetry/UsageTracker';
import { UniversalChatParams, UniversalChatResponse, FinishReason, UniversalMessage, UniversalChatSettings } from '../../interfaces/UniversalInterfaces';
import { z } from 'zod';
import { shouldRetryDueToContent } from "../retry/utils/ShouldRetryDueToContent";
import { logger } from '../../utils/logger';
import { ToolController } from '../tools/ToolController';
import { ToolOrchestrator } from '../tools/ToolOrchestrator';
import { HistoryManager } from '../history/HistoryManager';

export class ChatController {
    constructor(
        private providerManager: ProviderManager,
        private modelManager: ModelManager,
        private responseProcessor: ResponseProcessor,
        private retryManager: RetryManager, // injected default retry manager (for defaults)
        private usageTracker: UsageTracker,
        private toolController?: ToolController,
        private toolOrchestrator?: ToolOrchestrator,
        private historyManager?: HistoryManager
    ) {
        logger.setConfig({
            prefix: 'ChatController',
            level: process.env.LOG_LEVEL as any || 'info'
        });
    }

    /**
     * Executes a chat call using the given parameters.
     *
     * @param params - An object containing the model, system message, and optional settings and historical messages.
     * @returns A promise resolving to the processed chat response.
     */
    async execute<T extends z.ZodType | undefined = undefined>(params: {
        model: string;
        systemMessage: string;
        settings?: UniversalChatSettings;
        callerId?: string;
    }): Promise<UniversalChatResponse<T extends z.ZodType ? z.infer<T> : unknown>> {
        const { model, systemMessage, settings, callerId } = params;
        const mergedSettings = settings;

        if (settings?.jsonSchema && mergedSettings) {
            mergedSettings.responseFormat = 'json';
        }

        const fullSystemMessage =
            mergedSettings && (mergedSettings.responseFormat === 'json' || mergedSettings.jsonSchema)
                ? `${systemMessage}\n Provide your response in valid JSON format.`
                : systemMessage;

        const historicalMessages = this.historyManager?.getHistoricalMessages() || [];

        // Validate all messages have role and content
        const validatedMessages = historicalMessages.map(msg => {
            if (!msg.role) {
                logger.warn('Message missing role:', msg);
                throw new Error('Each message must have a role');
            }

            // If message has tool calls or is a tool response, empty content is valid
            if (msg.toolCalls?.length || msg.role === 'tool' ||
                // Also allow assistant messages with empty or space-only content in tool call flows
                (msg.role === 'assistant' && (!msg.content || msg.content.trim() === ''))) {
                return {
                    ...msg,
                    role: msg.role,
                    content: msg.content || ''
                };
            }

            // Otherwise, content is required
            if (!msg.content?.trim()) {
                logger.warn('Message missing content:', msg);
                throw new Error('Each message must have either content or tool calls');
            }
            return msg;
        });

        // Build the chat parameters
        const chatParams: UniversalChatParams = {
            messages: [
                { role: 'system', content: fullSystemMessage },
                ...validatedMessages
            ],
            settings: mergedSettings
        };

        // Log the messages for debugging
        logger.debug('Sending messages:', JSON.stringify(chatParams.messages, null, 2));

        const modelInfo = this.modelManager.getModel(model);
        if (!modelInfo) {
            throw new Error(`Model ${model} not found`);
        }

        // Get the last user message for usage tracking
        // TODO: Check if this is correct
        const lastUserMessage = this.historyManager?.getLastMessageByRole('user')?.content || '';

        // Validate JSON mode if needed.
        this.responseProcessor.validateJsonMode(modelInfo, chatParams);

        // Determine effective maxRetries from merged settings.
        const effectiveMaxRetries = mergedSettings && mergedSettings.maxRetries !== undefined ? mergedSettings.maxRetries : 3;

        // Create a local RetryManager that uses the effective maxRetries.
        const localRetryManager = new RetryManager({
            baseDelay: 1000,
            maxRetries: effectiveMaxRetries
        });

        // Execute the provider chat call with retry logic.
        const response = await localRetryManager.executeWithRetry(
            async () => {
                const resp = await this.providerManager.getProvider().chatCall(model, chatParams);
                if (!resp.metadata) {
                    resp.metadata = {};
                }
                // Track usage if needed.
                if (!resp.metadata.usage) {
                    resp.metadata.usage = await this.usageTracker.trackUsage(
                        systemMessage + '\n' + lastUserMessage,
                        resp.content,
                        modelInfo
                    );
                } else {
                    // Track usage and update the existing metadata
                    const trackResult = await this.usageTracker.trackUsage(
                        systemMessage + '\n' + lastUserMessage,
                        resp.content,
                        modelInfo
                    );
                    // Update the response metadata with the tracked usage
                    resp.metadata.usage = trackResult;
                }
                // Check if the response content triggers a retry
                if (shouldRetryDueToContent(resp)) {
                    throw new Error("Response content triggered retry due to unsatisfactory answer");
                }
                return resp;
            },
            (error: unknown) => true // Retry on all errors.
        );

        // Process tool calls if present in the response
        if (this.toolController &&
            this.toolOrchestrator &&
            this.historyManager &&
            ((response.toolCalls && response.toolCalls.length > 0) || response.metadata?.finishReason === FinishReason.TOOL_CALLS)) {

            logger.debug('Tool calls detected in non-streaming response, processing');

            // Add initial assistant response to history
            if (response.content) {
                this.historyManager.addMessage('assistant', response.content);
            }

            // Process tool calls
            const { requiresResubmission } = await this.toolOrchestrator.processToolCalls(response);

            if (requiresResubmission) {

                // Make a recursive call with updated messages
                return this.execute<T>({
                    model,
                    systemMessage,
                    settings: {
                        ...settings,
                        // Don't include tools in the continuation to avoid infinite loops
                        tools: undefined,
                        toolChoice: undefined
                    },
                    callerId
                });
            }
        }

        const validatedResponse = this.responseProcessor.validateResponse<T>(response, mergedSettings);
        this.historyManager?.addMessage('assistant', response.content || '');
        return validatedResponse;
    }
}