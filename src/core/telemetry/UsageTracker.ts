import { TokenCalculator } from '../models/TokenCalculator';
import { ModelInfo, Usage } from '../../interfaces/UniversalInterfaces';
import { UsageCallback, UsageData } from '../../interfaces/UsageInterfaces';
import { UsageTrackingProcessor } from '../streaming/processors/UsageTrackingProcessor';

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
        outputReasoningTokens: number = 0
    ): Promise<Usage> {
        const inputTokens = this.tokenCalculator.calculateTokens(input);
        const outputTokens = this.tokenCalculator.calculateTokens(output);

        const usage: Usage = {
            tokens: {
                input: inputTokens,
                inputCached: inputCachedTokens,
                output: outputTokens,
                outputReasoning: outputReasoningTokens,
                total: inputTokens + outputTokens + outputReasoningTokens
            },
            costs: this.tokenCalculator.calculateUsage(
                inputTokens,
                outputTokens,
                modelInfo.inputPricePerMillion,
                modelInfo.outputPricePerMillion,
                inputCachedTokens,
                modelInfo.inputCachedPricePerMillion,
                outputReasoningTokens
            )
        };

        if (this.callback && this.callerId) {
            await Promise.resolve(
                this.callback({
                    callerId: this.callerId,
                    usage,
                    timestamp: Date.now()
                })
            );
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
}