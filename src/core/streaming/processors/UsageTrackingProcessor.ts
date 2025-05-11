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
     * Number of input image tokens (if any)
     */
    inputImageTokens?: number;

    /**
     * Number of output image tokens (if any)
     */
    outputImageTokens?: number;

    /**
     * Price per million tokens for image input (if different from regular input)
     */
    imageInputPricePerMillion?: number;

    /**
     * Price per million tokens for image output (if different from regular output)
     */
    imageOutputPricePerMillion?: number;

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
    private inputImageTokens?: number;
    private outputImageTokens?: number;
    private imageInputPricePerMillion?: number;
    private imageOutputPricePerMillion?: number;
    private modelInfo: ModelInfo;
    private lastOutputTokens = 0;
    private lastCallbackTokens = 0;
    private lastOutputReasoningTokens = 0;
    private readonly TOKEN_BATCH_SIZE: number;
    // Flag to ensure input tokens are reported only on the first callback
    private hasReportedFirst = false;

    // Track total reported tokens to calculate final delta
    private totalReportedInputTokens = 0;
    private totalReportedCachedTokens = 0;
    private totalReportedOutputTokens = 0;
    private totalReportedReasoningTokens = 0;
    private totalReportedImageTokens = 0;
    private receivedFinalUsage = false;

    constructor(options: UsageTrackingOptions) {
        this.tokenCalculator = options.tokenCalculator;
        this.usageCallback = options.usageCallback;
        this.callerId = options.callerId ?? Date.now().toString();
        this.inputTokens = options.inputTokens;
        this.inputCachedTokens = options.inputCachedTokens;
        this.inputImageTokens = options.inputImageTokens;
        this.outputImageTokens = options.outputImageTokens;
        this.imageInputPricePerMillion = options.imageInputPricePerMillion;
        this.imageOutputPricePerMillion = options.imageOutputPricePerMillion;
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

            // Check if the chunk already has usage data from the adapter
            let existingUsage: any = undefined;
            if (chunk.metadata?.usage &&
                typeof chunk.metadata.usage === 'object' &&
                chunk.metadata.usage !== null) {
                existingUsage = chunk.metadata.usage;
            }

            // Update reasoning tokens if they're in the metadata
            if (existingUsage?.tokens?.output?.reasoning) {
                this.lastOutputReasoningTokens = existingUsage.tokens.output.reasoning;
            } else if (existingUsage?.tokens?.outputReasoning) {
                // Handle legacy format
                this.lastOutputReasoningTokens = existingUsage.tokens.outputReasoning;
            }

            // Update input tokens from adapter if higher
            if (existingUsage?.tokens?.input?.total && existingUsage.tokens.input.total > this.inputTokens) {
                this.inputTokens = existingUsage.tokens.input.total;
            }

            // Update cached tokens from adapter
            if (existingUsage?.tokens?.input?.cached && existingUsage.tokens.input.cached > (this.inputCachedTokens || 0)) {
                this.inputCachedTokens = existingUsage.tokens.input.cached;
            }

            // Update image tokens from adapter
            if (existingUsage?.tokens?.input?.image) {
                this.inputImageTokens = existingUsage.tokens.input.image;
            }

            // If this is the final chunk with non-incremental data from API, mark it as the source of truth
            if (chunk.isComplete && existingUsage && existingUsage.incremental === false) {
                this.receivedFinalUsage = true;
            }

            // Calculate tokens for content we've accumulated
            const totalOutput = this.tokenCalculator.calculateTokens(accumulatedContent);
            const delta = totalOutput - lastReported;

            // On final chunk, attach metadata.usage
            if (chunk.isComplete) {
                // If we already have usage data from the adapter in the final chunk,
                // respect it rather than completely replacing it
                if (existingUsage && existingUsage.incremental === false) {
                    // The adapter has provided complete usage data, keep it
                    // Just make sure the cost calculation is done
                    if (!existingUsage.costs?.total || existingUsage.costs.total === 0) {
                        // Calculate costs based on the existing token values
                        const outputTokens = existingUsage.tokens.output.total || 0;
                        const reasoningTokens = existingUsage.tokens.output.reasoning || 0;
                        existingUsage.costs = this.calculateCosts(
                            outputTokens,
                            reasoningTokens,
                            true
                        );
                        // Ensure metadata exists before assigning to it
                        chunk.metadata = chunk.metadata || {};
                        chunk.metadata.usage = existingUsage;
                    }
                } else {
                    // Create usage data using both our calculated values and any adapter-provided values
                    const usageData = {
                        tokens: {
                            input: {
                                total: this.inputTokens,
                                cached: this.inputCachedTokens ?? 0,
                                ...(this.inputImageTokens ? { image: this.inputImageTokens } : {})
                            },
                            output: {
                                // Output should include reasoning tokens
                                total: totalOutput + this.lastOutputReasoningTokens,
                                reasoning: this.lastOutputReasoningTokens,
                            },
                            total: this.inputTokens + totalOutput + this.lastOutputReasoningTokens
                        },
                        costs: this.calculateCosts(totalOutput, this.lastOutputReasoningTokens, true),
                        incremental: delta
                    };
                    chunk.metadata = chunk.metadata || {};
                    (chunk.metadata as any).usage = usageData;
                }
            }
            // Yield chunk
            yield chunk;
            // Invoke callback when batch reached or on final
            if (this.TOKEN_BATCH_SIZE > 0 && this.usageCallback && this.callerId) {
                if (delta >= this.TOKEN_BATCH_SIZE || chunk.isComplete) {
                    // Handle the final callback differently if we have received source of truth data
                    if (chunk.isComplete && this.receivedFinalUsage) {
                        // Get the actual token counts from the chunk metadata
                        const actualUsage = (chunk.metadata?.usage as any)?.tokens;
                        if (actualUsage) {
                            // Calculate what we've already reported
                            const unreportedInputTokens = Math.max(0,
                                (actualUsage.input.total || 0) - this.totalReportedInputTokens);
                            const unreportedCachedTokens = Math.max(0,
                                (actualUsage.input.cached || 0) - this.totalReportedCachedTokens);
                            const unreportedImageTokens = Math.max(0,
                                (actualUsage.input.image || 0) - this.totalReportedImageTokens);
                            const unreportedOutputTokens = Math.max(0,
                                (actualUsage.output.total || 0) - this.totalReportedOutputTokens);
                            const unreportedReasoningTokens = Math.max(0,
                                (actualUsage.output.reasoning || 0) - this.totalReportedReasoningTokens);

                            // Create a usage callback with just the unreported tokens
                            const finalUsageForCallback = {
                                tokens: {
                                    input: {
                                        total: unreportedInputTokens,
                                        cached: unreportedCachedTokens,
                                        ...(unreportedImageTokens > 0 ? { image: unreportedImageTokens } : {})
                                    },
                                    output: {
                                        total: unreportedOutputTokens,
                                        reasoning: unreportedReasoningTokens,
                                    },
                                    total: unreportedInputTokens + unreportedOutputTokens + unreportedReasoningTokens
                                },
                                costs: this.calculateCosts(
                                    unreportedOutputTokens,
                                    unreportedReasoningTokens,
                                    true
                                )
                            };

                            // Send the final callback with the unreported tokens
                            this.usageCallback({
                                callerId: this.callerId,
                                usage: finalUsageForCallback as any,
                                timestamp: Date.now(),
                                incremental: unreportedOutputTokens
                            });
                        }
                    } else {
                        // This is a regular (not final) callback or we don't have source of truth data
                        // Get reasoning tokens for this chunk only if it's the final one
                        const chunkReasoningTokens = chunk.isComplete ? this.lastOutputReasoningTokens : 0;

                        // For callbacks, use incremental approach:
                        // - First callback: include input tokens
                        // - Subsequent callbacks: only include incremental delta
                        totalIncrementalOutput += delta;

                        // Update our tracking of what we've reported
                        if (!this.hasReportedFirst) {
                            this.totalReportedInputTokens = this.inputTokens;
                            this.totalReportedCachedTokens = this.inputCachedTokens || 0;
                            this.totalReportedImageTokens = this.inputImageTokens || 0;
                        }
                        this.totalReportedOutputTokens += delta;
                        this.totalReportedReasoningTokens = chunkReasoningTokens; // This is absolute, not incremental

                        const usageForCallback = {
                            tokens: {
                                // Only include input tokens on first callback
                                input: {
                                    total: !this.hasReportedFirst ? this.inputTokens : 0,
                                    cached: !this.hasReportedFirst ? (this.inputCachedTokens ?? 0) : 0,
                                    ...(this.inputImageTokens && !this.hasReportedFirst ? { image: this.inputImageTokens } : {})
                                },
                                // For output, only report the delta since last callback plus reasoning on final
                                output: {
                                    total: delta + chunkReasoningTokens,
                                    reasoning: chunkReasoningTokens,
                                },
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
            input: {
                total: inputCost,
                cached: inputCachedCost,
            },
            output: {
                total: outputCost,
                reasoning: reasoningCost,
            },
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
        this.totalReportedInputTokens = 0;
        this.totalReportedCachedTokens = 0;
        this.totalReportedOutputTokens = 0;
        this.totalReportedReasoningTokens = 0;
        this.totalReportedImageTokens = 0;
        this.receivedFinalUsage = false;
        this.hasReportedFirst = false;
    }
} 