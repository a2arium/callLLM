// src/core/caller/chat/ChatController.ts

import { ProviderManager } from '../caller/ProviderManager';
import { ModelManager } from '../models/ModelManager';
import { ResponseProcessor } from '../processors/ResponseProcessor';
import { RetryManager } from '../retry/RetryManager';
import { UsageTracker } from '../telemetry/UsageTracker';
import { UniversalChatParams, UniversalChatResponse, FinishReason, UniversalMessage } from '../../interfaces/UniversalInterfaces';
import { z } from 'zod';

export class ChatController {
    constructor(
        private providerManager: ProviderManager,
        private modelManager: ModelManager,
        private responseProcessor: ResponseProcessor,
        private retryManager: RetryManager, // injected default retry manager (for defaults)
        private usageTracker: UsageTracker
    ) { }

    /**
     * Executes a chat call using the given parameters.
     *
     * @param params - An object containing the model, system message, user message, and optional settings and historical messages.
     * @returns A promise resolving to the processed chat response.
     */
    async execute<T extends z.ZodType | undefined = undefined>(params: {
        model: string,
        systemMessage: string,
        message: string,
        settings?: UniversalChatParams['settings'],
        historicalMessages?: UniversalMessage[]
    }): Promise<UniversalChatResponse & { content: T extends z.ZodType ? z.infer<T> : string }> {
        const { model, systemMessage, message, settings, historicalMessages } = params;
        const mergedSettings = settings;

        const fullSystemMessage =
            mergedSettings && (mergedSettings.responseFormat === 'json' || mergedSettings.jsonSchema)
                ? `${systemMessage}\n Provide your response in valid JSON format.`
                : systemMessage;

        // Build the chat parameters with historical messages inserted
        const chatParams: UniversalChatParams = {
            messages: [
                { role: 'system', content: fullSystemMessage },
                ...(historicalMessages || []),
                { role: 'user', content: message }
            ],
            settings: mergedSettings
        };

        const modelInfo = this.modelManager.getModel(model);
        if (!modelInfo) {
            throw new Error(`Model ${model} not found`);
        }

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
                        systemMessage + '\n' + message,
                        resp.content,
                        modelInfo
                    );
                } else {
                    await this.usageTracker.trackUsage(
                        systemMessage + '\n' + message,
                        resp.content,
                        modelInfo
                    );
                }
                return resp;
            },
            (error: unknown) => true // Retry on all errors.
        );

        return this.responseProcessor.validateResponse<T>(response, mergedSettings);
    }
}