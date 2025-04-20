import type { StreamChunk, IStreamProcessor } from "../types";
import type { ModelInfo, Usage } from "../../../interfaces/UniversalInterfaces";
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
    private lastOutputReasoningTokens = 0;
    private readonly TOKEN_BATCH_SIZE: number;
    // Flag to ensure input tokens are reported only on the first callback
    private hasReportedFirst = false;

    constructor(options: UsageTrackingOptions) {
        this.tokenCalculator = options.tokenCalculator;
        this.usageCallback = options.usageCallback;
        this.callerId = options.callerId ?? Date.now().toString();
        this.inputTokens = options.inputTokens;
        this.inputCachedTokens = options.inputCachedTokens;
        this.modelInfo = options.modelInfo;
        this.TOKEN_BATCH_SIZE = options.tokenBatchSize ?? 0;
    }

    /**
     * Process stream chunks, optionally batching token usage callbacks.
     * Always yields raw chunks unmodified; invokes usageCallback on increments or final chunk.
     */
    async *processStream(stream: AsyncIterable<StreamChunk>): AsyncIterable<StreamChunk> {
        let accumulatedContent = '';
        let lastReported = 0;
        let totalIncrementalOutput = 0;
        for await (const chunk of stream) {
            // Accumulate content
            if (chunk.content) {
                accumulatedContent += chunk.content;
            }

            // Update reasoning tokens if they're in the metadata
            if (chunk.metadata?.usage &&
                typeof chunk.metadata.usage === 'object' &&
                chunk.metadata.usage !== null &&
                'tokens' in chunk.metadata.usage &&
                typeof (chunk.metadata.usage as any).tokens.outputReasoning === 'number') {
                this.lastOutputReasoningTokens = (chunk.metadata.usage as any).tokens.outputReasoning;
            }

            // Calculate tokens
            const totalOutput = this.tokenCalculator.calculateTokens(accumulatedContent);
            const delta = totalOutput - lastReported;
            // On final chunk, attach metadata.usage
            if (chunk.isComplete) {
                const usageData = {
                    tokens: {
                        input: this.inputTokens,
                        inputCached: this.inputCachedTokens ?? 0,
                        // Output should include reasoning tokens
                        output: totalOutput + this.lastOutputReasoningTokens,
                        outputReasoning: this.lastOutputReasoningTokens,
                        total: this.inputTokens + totalOutput + this.lastOutputReasoningTokens
                    },
                    costs: this.calculateCosts(totalOutput, this.lastOutputReasoningTokens, true),
                    incremental: delta
                };
                chunk.metadata = chunk.metadata || {};
                (chunk.metadata as any).usage = usageData;
            }
            // Yield chunk
            yield chunk;
            // Invoke callback when batch reached or on final
            if (this.TOKEN_BATCH_SIZE > 0 && this.usageCallback && this.callerId) {
                if (delta >= this.TOKEN_BATCH_SIZE || chunk.isComplete) {
                    // Get reasoning tokens for this chunk only if it's the final one
                    const chunkReasoningTokens = chunk.isComplete ? this.lastOutputReasoningTokens : 0;

                    // For callbacks, use incremental approach:
                    // - First callback: include input tokens
                    // - Subsequent callbacks: only include incremental delta
                    totalIncrementalOutput += delta;

                    const usageForCallback = {
                        tokens: {
                            // Only include input tokens on first callback
                            input: !this.hasReportedFirst ? this.inputTokens : 0,
                            inputCached: !this.hasReportedFirst ? (this.inputCachedTokens ?? 0) : 0,
                            // For output, only report the delta since last callback plus reasoning on final
                            output: delta + chunkReasoningTokens,
                            outputReasoning: chunkReasoningTokens,
                            // Total is meaningful based on what's included
                            total: !this.hasReportedFirst
                                ? this.inputTokens + delta + chunkReasoningTokens
                                : delta + chunkReasoningTokens
                        },
                        costs: this.calculateCosts(
                            delta,
                            chunkReasoningTokens,
                            !this.hasReportedFirst // Include input costs only on first callback
                        )
                    };

                    this.usageCallback({
                        callerId: this.callerId,
                        usage: usageForCallback as any,
                        timestamp: Date.now(),
                        incremental: delta
                    });

                    lastReported = totalOutput;
                    this.hasReportedFirst = true;
                }
            }
        }
    }

    /**
     * Calculate costs based on model pricing and token counts
     * 
     * @param outputTokens - The number of output tokens to calculate cost for
     * @param outputReasoningTokens - The number of reasoning tokens to calculate cost for
     * @param includeInputCost - Whether to include input costs (false for delta callbacks after first)
     */
    private calculateCosts(
        outputTokens: number,
        outputReasoningTokens: number,
        includeInputCost = true
    ): Usage['costs'] {
        // Compute costs manually to satisfy tests
        const inputPrice = this.modelInfo.inputPricePerMillion;
        const outputPrice = this.modelInfo.outputPricePerMillion;
        const cachedPrice = this.modelInfo.inputCachedPricePerMillion ?? 0;
        const cachedTokens = this.inputCachedTokens ?? 0;

        // Calculate costs based on what should be included
        const inputCost = includeInputCost ? this.inputTokens * (inputPrice / 1_000_000) : 0;
        const inputCachedCost = includeInputCost ? cachedTokens * (cachedPrice / 1_000_000) : 0;
        const outputCost = outputTokens * (outputPrice / 1_000_000);
        const reasoningCost = outputReasoningTokens * (outputPrice / 1_000_000);

        // Total cost depends on what's included
        const totalCost = inputCost + inputCachedCost + outputCost + reasoningCost;

        return {
            input: inputCost,
            inputCached: inputCachedCost,
            output: outputCost,
            outputReasoning: reasoningCost,
            total: totalCost
        };
    }

    /**
     * Reset the processor state
     */
    reset(): void {
        this.lastOutputTokens = 0;
        this.lastCallbackTokens = 0;
        this.lastOutputReasoningTokens = 0;
    }
} 