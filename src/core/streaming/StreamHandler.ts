import { UniversalStreamResponse, UniversalChatParams, FinishReason, Usage, UniversalChatResponse } from '../../interfaces/UniversalInterfaces';
import { SchemaValidator, SchemaValidationError } from '../schema/SchemaValidator';
import { TokenCalculator } from '../models/TokenCalculator';
import { ResponseProcessor } from '../processors/ResponseProcessor';
import { logger } from '../../utils/logger';
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
        private responseProcessor: ResponseProcessor = new ResponseProcessor(),
        private usageCallback?: UsageCallback,
        private callerId?: string
    ) {
        logger.setConfig({
            level: process.env.LOG_LEVEL as any || 'info',
            prefix: 'StreamHandler'
        });
        logger.debug('Initialized StreamHandler', { callerId });
    }

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
    ): AsyncGenerator<UniversalStreamResponse<T extends z.ZodType ? z.infer<T> : unknown>> {
        const startTime = Date.now();
        logger.debug('Starting stream processing', {
            inputTokens,
            jsonMode: params.settings?.responseFormat === 'json',
            hasSchema: Boolean(params.settings?.jsonSchema),
            callerId: params.callerId || this.callerId,
            isStreamModeEnabled: params.settings?.stream === true,
            toolsEnabled: Boolean(params.settings?.tools?.length),
            modelName: modelInfo.name
        });

        let accumulatedContent = '';
        let lastOutputTokens = 0;
        let lastCallbackTokens = 0;
        let isFirstChunk = true;
        let hasStartedContent = false;
        let chunkCount = 0;
        let toolCallsReceived = 0;
        const schema = params.settings?.jsonSchema?.schema;
        // Use callerId from params if available, otherwise fall back to instance callerId
        const effectiveCallerId = params.callerId || this.callerId;

        // Initialize total usage tracking
        let totalUsage: Usage = {
            inputTokens,
            outputTokens: 0,
            totalTokens: inputTokens,
            inputCachedTokens: params.inputCachedTokens ?? 0,
            costs: { inputCost: 0, outputCost: 0, totalCost: 0 }
        };

        try {
            logger.debug('Stream iterator starting', { effectiveCallerId });
            for await (const chunk of stream) {
                logger.debug('Processing chunk in stream handler', { chunk });
                chunkCount++;
                const trimmedContent = chunk.content?.trim() || '';
                const hasToolCalls = Boolean(chunk.toolCalls?.length);

                if (hasToolCalls) {
                    toolCallsReceived += chunk.toolCalls!.length;
                    logger.debug('Received tool calls in stream', {
                        count: chunk.toolCalls!.length,
                        totalReceived: toolCallsReceived,
                        chunkIndex: chunkCount,
                        toolNames: chunk.toolCalls!.map(tc => tc.name),
                        isComplete: chunk.isComplete
                    });
                }

                if (trimmedContent || chunk.isComplete) {
                    accumulatedContent += chunk.content || '';
                    const currentOutputTokens = this.tokenCalculator.calculateTokens(accumulatedContent);
                    const incrementalTokens = currentOutputTokens - lastOutputTokens;

                    // Only mark as started if we have actual content
                    if (trimmedContent && !hasStartedContent) {
                        hasStartedContent = true;
                        logger.debug('First content received', {
                            chunkIndex: chunkCount,
                            timeElapsed: Date.now() - startTime,
                            contentLength: trimmedContent.length
                        });
                    }

                    logger.debug('Processing chunk', {
                        chunkIndex: chunkCount,
                        isComplete: chunk.isComplete,
                        incrementalTokens,
                        currentOutputTokens,
                        isFirstChunk,
                        contentLength: trimmedContent.length,
                        callerId: effectiveCallerId,
                        hasStartedContent,
                        chunkHasToolCalls: hasToolCalls,
                        responseFormat: chunk.metadata?.responseFormat,
                        finishReason: chunk.metadata?.finishReason
                    });

                    // Only calculate costs if we have actual content or it's the completion chunk
                    if ((hasStartedContent && incrementalTokens > 0) || chunk.isComplete) {
                        // Calculate costs and update usage for every non-empty chunk
                        const incrementalCosts = this.tokenCalculator.calculateUsage(
                            isFirstChunk && hasStartedContent ? inputTokens : 0,
                            incrementalTokens,
                            modelInfo.inputPricePerMillion,
                            modelInfo.outputPricePerMillion,
                            isFirstChunk && hasStartedContent ? params.inputCachedTokens ?? 0 : 0,
                            isFirstChunk && hasStartedContent ? params.inputCachedPricePerMillion : undefined
                        );

                        // Update total usage for metadata
                        totalUsage = {
                            inputTokens,
                            outputTokens: currentOutputTokens,
                            totalTokens: inputTokens + currentOutputTokens,
                            inputCachedTokens: params.inputCachedTokens ?? 0,
                            costs: this.tokenCalculator.calculateUsage(
                                inputTokens,
                                currentOutputTokens,
                                modelInfo.inputPricePerMillion,
                                modelInfo.outputPricePerMillion,
                                params.inputCachedTokens ?? 0,
                                params.inputCachedPricePerMillion
                            )
                        };

                        // Prepare incremental usage for callback
                        const usage: Usage = {
                            inputTokens: isFirstChunk && hasStartedContent ? inputTokens : 0,
                            outputTokens: currentOutputTokens - lastCallbackTokens,
                            totalTokens: (isFirstChunk && hasStartedContent ? inputTokens : 0) + (currentOutputTokens - lastCallbackTokens),
                            inputCachedTokens: isFirstChunk && hasStartedContent ? (params.inputCachedTokens ?? 0) : 0,
                            costs: isFirstChunk && hasStartedContent ? incrementalCosts : {
                                inputCost: 0,
                                outputCost: incrementalCosts.outputCost,
                                totalCost: incrementalCosts.outputCost
                            }
                        };

                        // Only trigger callback if we have meaningful content and meet the batch criteria
                        if (this.usageCallback && effectiveCallerId && hasStartedContent &&
                            (currentOutputTokens - lastCallbackTokens >= StreamHandler.TOKEN_BATCH_SIZE || chunk.isComplete)) {
                            logger.debug('Triggering usage callback', {
                                callerId: effectiveCallerId,
                                usageTokens: usage.totalTokens,
                                isFirstChunk,
                                incrementalTokens,
                                hasStartedContent,
                                chunkIndex: chunkCount
                            });
                            await Promise.resolve(this.usageCallback({
                                callerId: effectiveCallerId,
                                usage,
                                timestamp: Date.now()
                            }));
                            lastCallbackTokens = currentOutputTokens;
                            isFirstChunk = false;
                        }
                    }

                    lastOutputTokens = currentOutputTokens;

                    // Always include usage in metadata for non-empty chunks
                    const metadata = {
                        ...chunk.metadata,
                        usage: hasStartedContent ? totalUsage : undefined
                    };

                    // Create final response object with all properties
                    const streamResponse = {
                        ...chunk,
                        content: chunk.content || '',
                        contentText: chunk.isComplete ? accumulatedContent : undefined,
                        contentObject: undefined, // Will be set later for JSON responses
                        metadata
                    } as UniversalStreamResponse<T extends z.ZodType ? z.infer<T> : unknown>;

                    if (chunk.isComplete) {
                        logger.debug('Stream completed', {
                            totalChunks: chunkCount,
                            totalOutputTokens: totalUsage.outputTokens,
                            totalContentLength: accumulatedContent.length,
                            totalToolCalls: toolCallsReceived,
                            totalCost: totalUsage.costs.totalCost,
                            totalTimeMs: Date.now() - startTime,
                            finishReason: chunk.metadata?.finishReason
                        });
                    }

                    yield streamResponse;
                } else {
                    // Empty chunk with no content - could be control chunk or empty
                    logger.debug('Received empty chunk', {
                        chunkIndex: chunkCount,
                        hasToolCalls,
                        isComplete: chunk.isComplete,
                        metadata: chunk.metadata ? JSON.stringify(chunk.metadata) : undefined
                    });

                    if (hasToolCalls || chunk.isComplete) {
                        // Need to yield chunks with tool calls or completion signals
                        const streamResponse = {
                            ...chunk,
                            content: '',
                            metadata: {
                                ...chunk.metadata,
                                usage: hasStartedContent ? totalUsage : undefined
                            }
                        } as UniversalStreamResponse<T extends z.ZodType ? z.infer<T> : unknown>;

                        yield streamResponse;
                    }
                }
            }
        } catch (error) {
            logger.error('Stream processing error', {
                error: error instanceof Error ? error.message : 'Unknown error',
                errorStack: error instanceof Error ? error.stack : undefined,
                totalChunks: chunkCount,
                totalTokens: totalUsage.totalTokens,
                totalCost: totalUsage.costs.totalCost,
                callerId: effectiveCallerId,
                hasStartedContent,
                timeElapsed: Date.now() - startTime
            });
            throw error;
        }
    }
} 