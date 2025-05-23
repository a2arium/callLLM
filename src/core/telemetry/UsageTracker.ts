import { TokenCalculator } from '../models/TokenCalculator.ts';
import type { ModelInfo, Usage } from '../../interfaces/UniversalInterfaces.ts';
import type { UsageCallback, UsageData } from '../../interfaces/UsageInterfaces.ts';
import { UsageTrackingProcessor } from '../streaming/processors/UsageTrackingProcessor.ts';
import { logger } from '../../utils/logger.ts';

/**
 * UsageTracker
 * 
 * Manages token usage tracking and cost calculations for both streaming and non-streaming LLM calls.
 * This class centralizes all usage-related functionality and can create usage tracking stream processors.
 */
export class UsageTracker {
    constructor(
        private tokenCalculator: TokenCalculator,
        private callback?: UsageCallback,
        private callerId?: string
    ) { }

    /**
     * Track usage for non-streaming LLM calls
     * 
     * @param input Input text to calculate tokens for
     * @param output Output text to calculate tokens for
     * @param modelInfo Model information including pricing
     * @returns Usage data including token counts and costs
     */
    async trackUsage(
        input: string,
        output: string,
        modelInfo: ModelInfo,
        inputCachedTokens: number = 0,
        outputReasoningTokens: number = 0,
        options?: {
            inputImageTokens?: number;
            outputImageTokens?: number;
            imageInputPricePerMillion?: number;
            imageOutputPricePerMillion?: number;
        }
    ): Promise<Usage> {
        const log = logger.createLogger({ prefix: 'UsageTracker.trackUsage' });
        const inputTokens = this.tokenCalculator.calculateTokens(input);
        const outputTokens = this.tokenCalculator.calculateTokens(output);

        const usage: Usage = {
            tokens: {
                input: {
                    total: inputTokens,
                    cached: inputCachedTokens,
                    ...(options?.inputImageTokens ? { image: options.inputImageTokens } : {})
                },
                output: {
                    total: outputTokens,
                    reasoning: outputReasoningTokens,
                    ...(options?.outputImageTokens ? { image: options.outputImageTokens } : {})
                },
                total: inputTokens + outputTokens + outputReasoningTokens +
                    (options?.inputImageTokens || 0) + (options?.outputImageTokens || 0)
            },
            costs: this.tokenCalculator.calculateUsage(
                inputTokens,
                outputTokens,
                modelInfo.inputPricePerMillion,
                modelInfo.outputPricePerMillion,
                inputCachedTokens,
                modelInfo.inputCachedPricePerMillion,
                outputReasoningTokens,
                options?.inputImageTokens,
                options?.outputImageTokens,
                options?.imageInputPricePerMillion || modelInfo.inputPricePerMillion,
                options?.imageOutputPricePerMillion || modelInfo.outputPricePerMillion
            )
        };

        if (this.callback && this.callerId) {
            log.debug(`Invoking usage callback for callerId: ${this.callerId}`);
            console.log(`[DEBUG] Non-streaming usage callback firing for caller: ${this.callerId}`, usage.tokens);

            await Promise.resolve(
                this.callback({
                    callerId: this.callerId,
                    usage,
                    timestamp: Date.now()
                })
            );
        } else {
            log.debug(`No usage callback invoked. Callback: ${Boolean(this.callback)}, CallerId: ${this.callerId}`);
        }

        return usage;
    }

    /**
     * Create a UsageTrackingProcessor for streaming LLM calls
     * 
     * @param inputTokens Number of input tokens
     * @param modelInfo Model information including pricing
     * @param options Additional options
     * @returns A new UsageTrackingProcessor instance
     */
    createStreamProcessor(
        inputTokens: number,
        modelInfo: ModelInfo,
        options?: {
            inputCachedTokens?: number;
            inputImageTokens?: number;
            outputImageTokens?: number;
            imageInputPricePerMillion?: number;
            imageOutputPricePerMillion?: number;
            tokenBatchSize?: number;
            callerId?: string;
        }
    ): UsageTrackingProcessor {
        const effectiveCallerId = options?.callerId || this.callerId;

        return new UsageTrackingProcessor({
            tokenCalculator: this.tokenCalculator,
            usageCallback: this.callback,
            callerId: effectiveCallerId,
            inputTokens,
            inputCachedTokens: options?.inputCachedTokens,
            inputImageTokens: options?.inputImageTokens,
            outputImageTokens: options?.outputImageTokens,
            imageInputPricePerMillion: options?.imageInputPricePerMillion,
            imageOutputPricePerMillion: options?.imageOutputPricePerMillion,
            modelInfo,
            tokenBatchSize: options?.tokenBatchSize
        });
    }

    /**
     * Calculate token count for a given text
     * 
     * @param text Text to calculate tokens for
     * @returns Number of tokens
     */
    calculateTokens(text: string): number {
        return this.tokenCalculator.calculateTokens(text);
    }

    /**
     * Calculate total tokens for an array of messages
     * 
     * @param messages Array of messages to calculate tokens for
     * @returns Total number of tokens
     */
    calculateTotalTokens(messages: { role: string; content: string }[]): number {
        return this.tokenCalculator.calculateTotalTokens(messages);
    }

    /**
     * Calculate costs for token counts
     * 
     * @param inputTokens Number of input tokens
     * @param outputTokens Number of output tokens
     * @param modelInfo Model information including pricing
     * @param inputCachedTokens Number of cached input tokens (optional)
     * @param outputReasoningTokens Number of output reasoning tokens (optional)
     * @returns Cost breakdown
     */
    calculateCosts(
        inputTokens: number,
        outputTokens: number,
        modelInfo: ModelInfo,
        inputCachedTokens: number = 0,
        outputReasoningTokens: number = 0
    ): Usage['costs'] {
        return this.tokenCalculator.calculateUsage(
            inputTokens,
            outputTokens,
            modelInfo.inputPricePerMillion,
            modelInfo.outputPricePerMillion,
            inputCachedTokens,
            modelInfo.inputCachedPricePerMillion,
            outputReasoningTokens
        );
    }

    /**
     * Trigger usage callback directly with provided usage data
     * This is useful when usage data comes directly from the provider
     * 
     * @param usage Usage data to send to the callback
     * @returns Promise that resolves when the callback completes
     */
    async triggerCallback(usage: Usage): Promise<void> {
        const log = logger.createLogger({ prefix: 'UsageTracker.triggerCallback' });

        if (this.callback && this.callerId) {
            log.debug(`Manually triggering usage callback for callerId: ${this.callerId}`);

            await Promise.resolve(
                this.callback({
                    callerId: this.callerId,
                    usage,
                    timestamp: Date.now()
                })
            );
        } else {
            log.debug(`Cannot trigger callback. Callback: ${Boolean(this.callback)}, CallerId: ${this.callerId}`);
        }
    }
}