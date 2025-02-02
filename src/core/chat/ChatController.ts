// src/core/caller/chat/ChatController.ts

import { ProviderManager } from '../caller/ProviderManager';
import { ModelManager } from '../models/ModelManager';
import { ResponseProcessor } from '../processors/ResponseProcessor';
import { RetryManager } from '../retry/RetryManager';
import { UsageTracker } from '../telemetry/UsageTracker';
import { UniversalChatParams, UniversalChatResponse, FinishReason } from '../../interfaces/UniversalInterfaces';
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
     * @param model - The model name to use.
     * @param systemMessage - The system message to prepend.
     * @param message - The user message.
     * @param settings - Optional chat settings.
     * @returns A promise resolving to the processed chat response.
     */
    async execute<T extends z.ZodType | undefined = undefined>(
        model: string,
        systemMessage: string,
        message: string,
        settings?: UniversalChatParams['settings']
    ): Promise<UniversalChatResponse & { content: T extends z.ZodType ? z.infer<T> : string }> {
        // Use the incoming settings as-is (without defaulting to {}), so that if undefined, it remains undefined.
        const mergedSettings = settings;

        // Compute the full system message. (Check if mergedSettings is defined first.)
        const fullSystemMessage =
            mergedSettings && (mergedSettings.responseFormat === 'json' || mergedSettings.jsonSchema)
                ? `${systemMessage}\n Provide your response in valid JSON format.`
                : systemMessage;

        // Build the chat parameters.
        const params: UniversalChatParams = {
            messages: [
                { role: 'system', content: fullSystemMessage },
                { role: 'user', content: message }
            ],
            settings: mergedSettings // will be undefined if no settings were provided
        };

        const modelInfo = this.modelManager.getModel(model);
        if (!modelInfo) {
            throw new Error(`Model ${model} not found`);
        }

        // Validate JSON mode if needed.
        this.responseProcessor.validateJsonMode(modelInfo, params);

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
                const resp = await this.providerManager.getProvider().chatCall(model, params);
                if (!resp.metadata) {
                    resp.metadata = {};
                }
                // Track usage if needed.
                if (!resp.metadata.usage) {
                    resp.metadata.usage = await this.usageTracker.trackUsage(
                        fullSystemMessage + '\n' + message,
                        resp.content,
                        modelInfo
                    );
                } else {
                    await this.usageTracker.trackUsage(
                        fullSystemMessage + '\n' + message,
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