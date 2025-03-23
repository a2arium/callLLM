import type { StreamChunk, IStreamProcessor } from "../types";
import type { ModelInfo } from "../../../interfaces/UniversalInterfaces";
import type { UsageCallback } from "../../../interfaces/UsageInterfaces";
import type { TokenCalculator } from "../../models/TokenCalculator";

/**
 * UsageTrackingProcessor
 * 
 * A stream processor that tracks token usage and provides usage metrics
 * in the stream metadata. It can also trigger callbacks based on token
 * consumption for real-time usage tracking.
 * 
 * This processor ensures usage tracking is a cross-cutting concern that
 * can be attached to any stream pipeline.
 */
export type UsageTrackingOptions = {
    /**
     * Token calculator instance to count tokens
     */
    tokenCalculator: TokenCalculator;

    /**
     * Optional callback that will be triggered periodically with usage data
     */
    usageCallback?: UsageCallback;

    /**
     * Optional caller ID to identify the source of the tokens in usage tracking
     */
    callerId?: string;

    /**
     * Number of input tokens already processed/used
     */
    inputTokens: number;

    /**
     * Number of cached input tokens (if any)
     */
    inputCachedTokens?: number;

    /**
     * Model information including pricing data
     */
    modelInfo: ModelInfo;

    /**
     * Number of tokens to batch before triggering a callback
     * Used to reduce callback frequency while maintaining granularity
     * Default: 100
     */
    tokenBatchSize?: number;
}

export class UsageTrackingProcessor implements IStreamProcessor {
    private tokenCalculator: TokenCalculator;
    private usageCallback?: UsageCallback;
    private callerId?: string;
    private inputTokens: number;
    private inputCachedTokens?: number;
    private modelInfo: ModelInfo;
    private lastOutputTokens = 0;
    private lastCallbackTokens = 0;
    private readonly TOKEN_BATCH_SIZE: number;

    constructor(options: UsageTrackingOptions) {
        this.tokenCalculator = options.tokenCalculator;
        this.usageCallback = options.usageCallback;
        this.callerId = options.callerId;
        this.inputTokens = options.inputTokens;
        this.inputCachedTokens = options.inputCachedTokens;
        this.modelInfo = options.modelInfo;
        this.TOKEN_BATCH_SIZE = options.tokenBatchSize || 100;
    }

    /**
     * Process stream chunks, tracking token usage and updating metadata
     */
    async *processStream(stream: AsyncIterable<StreamChunk>): AsyncIterable<StreamChunk> {
        let accumulatedContent = '';
        let isFirstChunk = true;

        for await (const chunk of stream) {
            // Add current chunk content to accumulated content
            if (chunk.content) {
                accumulatedContent += chunk.content;
            }

            // Calculate current tokens and incremental tokens
            const currentOutputTokens = this.tokenCalculator.calculateTokens(accumulatedContent);
            const incrementalTokens = currentOutputTokens - this.lastOutputTokens;

            // Calculate costs based on model pricing
            const costs = this.calculateCosts(currentOutputTokens);

            // Call the usage callback when appropriate - either when we've 
            // accumulated enough tokens or when the stream is complete
            if (this.usageCallback &&
                this.callerId &&
                (currentOutputTokens - this.lastCallbackTokens >= this.TOKEN_BATCH_SIZE ||
                    chunk.isComplete)) {

                // Create usage data for callback
                this.triggerUsageCallback(currentOutputTokens, costs);
                this.lastCallbackTokens = currentOutputTokens;
            }

            // Update last output tokens for next iteration
            this.lastOutputTokens = currentOutputTokens;
            isFirstChunk = false;

            // Yield the chunk with updated metadata
            yield {
                ...chunk,
                metadata: {
                    ...(chunk.metadata || {}),
                    usage: {
                        tokens: {
                            input: this.inputTokens,
                            inputCached: this.inputCachedTokens,
                            output: currentOutputTokens,
                            total: this.inputTokens + currentOutputTokens
                        },
                        incremental: incrementalTokens,
                        costs
                    }
                }
            };
        }
    }

    /**
     * Calculate costs based on model pricing and token counts
     */
    private calculateCosts(outputTokens: number) {
        // Calculate input costs
        const regularInputCost = (this.inputTokens * this.modelInfo.inputPricePerMillion) / 1_000_000;

        // Calculate cached input costs if available
        const cachedInputCost = this.inputCachedTokens && this.modelInfo.inputCachedPricePerMillion
            ? (this.inputCachedTokens * this.modelInfo.inputCachedPricePerMillion) / 1_000_000
            : undefined;

        // Calculate output cost
        const outputCost = (outputTokens * this.modelInfo.outputPricePerMillion) / 1_000_000;

        // Calculate total cost
        const totalCost = regularInputCost + (cachedInputCost || 0) + outputCost;

        return {
            inputCost: regularInputCost,
            inputCachedCost: cachedInputCost,
            outputCost,
            totalCost
        };
    }

    /**
     * Trigger the usage callback with current usage data
     */
    private triggerUsageCallback(outputTokens: number, costs: any) {
        if (!this.usageCallback || !this.callerId) return;

        this.usageCallback({
            callerId: this.callerId,
            usage: {
                inputTokens: this.inputTokens,
                inputCachedTokens: this.inputCachedTokens,
                outputTokens,
                totalTokens: this.inputTokens + outputTokens,
                costs
            },
            timestamp: Date.now()
        });
    }

    /**
     * Reset the processor state
     */
    reset(): void {
        this.lastOutputTokens = 0;
        this.lastCallbackTokens = 0;
    }
} 