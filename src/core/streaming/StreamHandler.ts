import { UniversalStreamResponse, UniversalChatParams, FinishReason, Usage } from '../../interfaces/UniversalInterfaces';
import { SchemaValidator, SchemaValidationError } from '../schema/SchemaValidator';
import { TokenCalculator } from '../models/TokenCalculator';
import { z } from 'zod';
import { ModelInfo } from '../../interfaces/UniversalInterfaces';
import { UsageCallback, UsageData } from '../../interfaces/UsageInterfaces';

export class StreamHandler {
    /**
     * Number of tokens to accumulate before triggering a usage callback.
     * This helps reduce callback frequency while maintaining reasonable granularity.
     */
    private static readonly TOKEN_BATCH_SIZE = 100;

    constructor(
        private tokenCalculator: TokenCalculator,
        private usageCallback?: UsageCallback,
        private callerId?: string
    ) { }

    /**
     * Processes a stream of responses with usage tracking.
     * - First chunk includes both input and output costs
     * - Subsequent chunks only include output costs
     * - Usage callbacks are triggered every TOKEN_BATCH_SIZE tokens or on completion
     * - Metadata contains cumulative usage for the entire stream
     */
    public async *processStream<T extends z.ZodType | undefined = undefined>(
        stream: AsyncIterable<UniversalStreamResponse>,
        params: UniversalChatParams,
        inputTokens: number,
        modelInfo: ModelInfo
    ): AsyncGenerator<UniversalStreamResponse & { content: T extends z.ZodType ? z.infer<T> : string }> {
        let accumulatedContent = '';
        let lastOutputTokens = 0;
        let lastCallbackTokens = 0;
        let isFirstCallback = true;
        const schema = params.settings?.jsonSchema;

        // Add total usage tracking
        let totalUsage: Usage = {
            inputTokens,
            outputTokens: 0,
            totalTokens: inputTokens,
            inputCachedTokens: params.inputCachedTokens ?? 0,  // Default to 0 if not provided
            costs: { inputCost: 0, outputCost: 0, totalCost: 0 }
        };

        try {
            for await (const chunk of stream) {
                accumulatedContent += chunk.content;
                const currentOutputTokens = this.tokenCalculator.calculateTokens(accumulatedContent);
                const incrementalTokens = currentOutputTokens - lastOutputTokens;

                // Calculate incremental costs for callback
                const incrementalCosts = this.tokenCalculator.calculateUsage(
                    isFirstCallback ? inputTokens : 0,
                    incrementalTokens,
                    modelInfo.inputPricePerMillion,
                    modelInfo.outputPricePerMillion,
                    isFirstCallback ? params.inputCachedTokens ?? 0 : 0,  // Default to 0 if not provided
                    isFirstCallback ? params.inputCachedPricePerMillion : undefined
                );

                // Update total usage for metadata
                totalUsage = {
                    inputTokens,
                    outputTokens: currentOutputTokens,
                    totalTokens: inputTokens + currentOutputTokens,
                    inputCachedTokens: params.inputCachedTokens ?? 0,  // Default to 0 if not provided
                    costs: this.tokenCalculator.calculateUsage(
                        inputTokens,
                        currentOutputTokens,
                        modelInfo.inputPricePerMillion,
                        modelInfo.outputPricePerMillion,
                        params.inputCachedTokens ?? 0,  // Default to 0 if not provided
                        params.inputCachedPricePerMillion
                    )
                };

                // Incremental usage for callback
                const usage: Usage = {
                    inputTokens: isFirstCallback ? inputTokens : 0,
                    outputTokens: currentOutputTokens - lastCallbackTokens,
                    totalTokens: (isFirstCallback ? inputTokens : 0) + (currentOutputTokens - lastCallbackTokens),
                    inputCachedTokens: isFirstCallback ? (params.inputCachedTokens ?? 0) : 0,  // Default to 0 if not provided
                    costs: isFirstCallback ? incrementalCosts : {
                        inputCost: 0,
                        outputCost: incrementalCosts.outputCost,
                        totalCost: incrementalCosts.outputCost
                    }
                };

                if (this.usageCallback && this.callerId &&
                    (currentOutputTokens - lastCallbackTokens >= StreamHandler.TOKEN_BATCH_SIZE || chunk.isComplete)) {
                    await Promise.resolve(this.usageCallback({ callerId: this.callerId, usage, timestamp: Date.now() }));
                    lastCallbackTokens = currentOutputTokens;
                    isFirstCallback = false;
                }

                lastOutputTokens = currentOutputTokens;

                let content: T extends z.ZodType ? z.infer<T> : string = chunk.content as any;
                const metadata = {
                    ...chunk.metadata,
                    usage: totalUsage  // Use total usage in metadata
                };

                if (chunk.isComplete && params.settings?.responseFormat === 'json') {
                    try {
                        const parsedContent = JSON.parse(accumulatedContent);
                        if (schema) {
                            content = SchemaValidator.validate(
                                parsedContent,
                                schema.schema
                            ) as T extends z.ZodType ? z.infer<T> : string;
                        } else {
                            content = parsedContent as T extends z.ZodType ? z.infer<T> : string;
                        }
                    } catch (error) {
                        if (error instanceof SchemaValidationError) {
                            metadata.validationErrors = error.validationErrors;
                            metadata.finishReason = FinishReason.CONTENT_FILTER;
                        } else {
                            throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        }
                    }
                }

                yield {
                    ...chunk,
                    content,
                    metadata
                } as UniversalStreamResponse & { content: T extends z.ZodType ? z.infer<T> : string };
            }
        } catch (error) {
            // Call callback one final time with accumulated tokens
            if (this.usageCallback && this.callerId && lastOutputTokens > lastCallbackTokens) {
                const costs = this.tokenCalculator.calculateUsage(
                    0,
                    lastOutputTokens - lastCallbackTokens,
                    modelInfo.inputPricePerMillion,
                    modelInfo.outputPricePerMillion
                );
                const usage: Usage = {
                    inputTokens: 0,
                    outputTokens: lastOutputTokens - lastCallbackTokens,
                    totalTokens: lastOutputTokens - lastCallbackTokens,
                    costs
                };
                await Promise.resolve(this.usageCallback({ callerId: this.callerId, usage, timestamp: Date.now() }));
            }
            throw error;
        }
    }
} 