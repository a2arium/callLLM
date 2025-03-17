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
        logger.debug('Initialized');
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
        logger.debug('Starting stream processing', {
            inputTokens,
            jsonMode: params.settings?.responseFormat === 'json',
            hasSchema: Boolean(params.settings?.jsonSchema)
        });

        let accumulatedContent = '';
        let lastOutputTokens = 0;
        let lastCallbackTokens = 0;
        let isFirstCallback = true;
        const schema = params.settings?.jsonSchema?.schema;

        // Add total usage tracking
        let totalUsage: Usage = {
            inputTokens,
            outputTokens: 0,
            totalTokens: inputTokens,
            inputCachedTokens: params.inputCachedTokens ?? 0,
            costs: { inputCost: 0, outputCost: 0, totalCost: 0 }
        };

        try {
            for await (const chunk of stream) {
                accumulatedContent += chunk.content;
                const currentOutputTokens = this.tokenCalculator.calculateTokens(accumulatedContent);
                const incrementalTokens = currentOutputTokens - lastOutputTokens;

                logger.debug('Processing chunk', {
                    isComplete: chunk.isComplete,
                    incrementalTokens,
                    currentOutputTokens
                });

                // Calculate incremental costs for callback
                const incrementalCosts = this.tokenCalculator.calculateUsage(
                    isFirstCallback ? inputTokens : 0,
                    incrementalTokens,
                    modelInfo.inputPricePerMillion,
                    modelInfo.outputPricePerMillion,
                    isFirstCallback ? params.inputCachedTokens ?? 0 : 0,
                    isFirstCallback ? params.inputCachedPricePerMillion : undefined
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

                // Incremental usage for callback
                const usage: Usage = {
                    inputTokens: isFirstCallback ? inputTokens : 0,
                    outputTokens: currentOutputTokens - lastCallbackTokens,
                    totalTokens: (isFirstCallback ? inputTokens : 0) + (currentOutputTokens - lastCallbackTokens),
                    inputCachedTokens: isFirstCallback ? (params.inputCachedTokens ?? 0) : 0,
                    costs: isFirstCallback ? incrementalCosts : {
                        inputCost: 0,
                        outputCost: incrementalCosts.outputCost,
                        totalCost: incrementalCosts.outputCost
                    }
                };

                if (this.usageCallback && this.callerId &&
                    (currentOutputTokens - lastCallbackTokens >= StreamHandler.TOKEN_BATCH_SIZE || chunk.isComplete)) {
                    logger.debug('Triggering usage callback', {
                        callerId: this.callerId,
                        usageTokens: usage.totalTokens,
                        isFirstCallback
                    });
                    await Promise.resolve(this.usageCallback({ callerId: this.callerId, usage, timestamp: Date.now() }));
                    lastCallbackTokens = currentOutputTokens;
                    isFirstCallback = false;
                }

                lastOutputTokens = currentOutputTokens;

                // Add usage to metadata
                const metadata = {
                    ...chunk.metadata,
                    usage: totalUsage
                };

                let contentObject = undefined;

                // Only try to parse JSON when the stream is complete and we're in JSON mode
                if (chunk.isComplete && params.settings?.responseFormat === 'json') {
                    logger.debug('Stream complete, attempting JSON validation', {
                        contentLength: accumulatedContent.length,
                        hasSchema: Boolean(schema)
                    });

                    try {
                        // Improved duplicate detection for multiple repeated JSON objects
                        let cleanedContent = accumulatedContent;

                        // Log more details about the content
                        logger.debug('Content details', {
                            length: cleanedContent.length,
                            startsWithBrace: cleanedContent.startsWith('{'),
                            includesBraces: cleanedContent.includes('}{'),
                            firstCurlyIndex: cleanedContent.indexOf('{'),
                            firstCloseCurlyIndex: cleanedContent.indexOf('}')
                        });

                        // Find if there are multiple JSON objects by counting pairs of braces
                        const matches = cleanedContent.match(/{/g);
                        const closingMatches = cleanedContent.match(/}/g);
                        const openBraceCount = matches ? matches.length : 0;
                        const closeBraceCount = closingMatches ? closingMatches.length : 0;

                        logger.debug('Brace pattern analysis', {
                            openBraceCount,
                            closeBraceCount,
                            hasDuplicateObjects: openBraceCount > 1 && openBraceCount === closeBraceCount
                        });

                        // If multiple full objects detected
                        if (cleanedContent.startsWith('{') && openBraceCount > 1 && closeBraceCount > 1) {
                            logger.debug('Content contains multiple JSON objects, attempting to extract first one');

                            // Find the first complete JSON object using balanced braces
                            let braceCount = 0;
                            let firstJsonEnd = -1;

                            for (let i = 0; i < cleanedContent.length; i++) {
                                if (cleanedContent[i] === '{') braceCount++;
                                else if (cleanedContent[i] === '}') {
                                    braceCount--;
                                    if (braceCount === 0) {
                                        firstJsonEnd = i + 1;
                                        break;
                                    }
                                }
                            }

                            logger.debug('Brace counting result', {
                                firstJsonEnd,
                                finalBraceCount: braceCount
                            });

                            // If we found a complete JSON object and there's more text after it
                            if (firstJsonEnd > 0 && firstJsonEnd < cleanedContent.length) {
                                logger.debug('Extracted first complete JSON object', {
                                    length: firstJsonEnd,
                                    totalLength: cleanedContent.length,
                                    remainingContent: cleanedContent.length - firstJsonEnd
                                });

                                // Save the original in case parsing fails
                                const originalContent = cleanedContent;
                                cleanedContent = cleanedContent.substring(0, firstJsonEnd);

                                // Attempt to parse it to verify it's valid
                                try {
                                    JSON.parse(cleanedContent);
                                    logger.debug('Successfully parsed extracted JSON object');
                                } catch (parseError) {
                                    logger.warn('Extracted content is not valid JSON, reverting to original', {
                                        error: parseError instanceof Error ? parseError.message : 'Unknown error',
                                        extractedContent: cleanedContent
                                    });
                                    cleanedContent = originalContent;
                                }
                            }
                        }

                        // Create temporary response object for validation
                        const tempResponse: UniversalChatResponse = {
                            content: cleanedContent,
                            metadata: { ...metadata },
                            role: 'assistant'
                        };

                        // Use existing validateResponse method
                        logger.debug('Calling ResponseProcessor.validateResponse');
                        const validatedResponse = await this.responseProcessor.validateResponse(
                            tempResponse,
                            params.settings
                        );

                        // Extract validated contentObject and any validation errors
                        contentObject = validatedResponse.contentObject;

                        // If we successfully extracted the first JSON object and had it validated,
                        // we should use it for the final response content too
                        if (cleanedContent !== accumulatedContent && contentObject) {
                            logger.debug('Using cleaned content for final response', {
                                originalLength: accumulatedContent.length,
                                cleanedLength: cleanedContent.length
                            });
                            accumulatedContent = cleanedContent;
                        }

                        logger.debug('JSON validation successful', {
                            hasValidationErrors: Boolean(validatedResponse.metadata?.validationErrors),
                            hasContentObject: Boolean(contentObject)
                        });

                        // Update metadata with any validation errors
                        if (validatedResponse.metadata?.validationErrors) {
                            metadata.validationErrors = validatedResponse.metadata.validationErrors;
                            metadata.finishReason = validatedResponse.metadata.finishReason;
                            logger.warn('Schema validation errors', {
                                errors: validatedResponse.metadata.validationErrors
                            });
                        }
                    } catch (error) {
                        logger.error('JSON validation error', {
                            error: error instanceof Error ? error.message : 'Unknown error'
                        });

                        // Still try to parse as JSON even if validation failed
                        try {
                            logger.debug('Attempting fallback JSON parse');
                            contentObject = JSON.parse(accumulatedContent);
                            logger.debug('Fallback JSON parse successful');
                        } catch (parseError) {
                            logger.error('JSON parse error', {
                                error: parseError instanceof Error ? parseError.message : 'Unknown error'
                            });
                        }
                    }
                }

                // For the final chunk in JSON mode, provide both the content and parsed object
                // For intermediate chunks, just pass through the original content
                const responseContent = chunk.isComplete
                    ? chunk.content
                    : chunk.content;

                if (chunk.isComplete) {
                    logger.info('Stream completed', {
                        totalTokens: totalUsage.totalTokens,
                        totalCost: totalUsage.costs.totalCost,
                        finishReason: metadata.finishReason
                    });
                }

                // Log the contentObject right before yielding
                if (chunk.isComplete) {
                    logger.debug('Final content before yielding', {
                        contentLength: accumulatedContent.length,
                        hasContentObject: Boolean(contentObject),
                        contentObjectType: typeof contentObject
                    });
                }

                // Create final response object with all properties
                const streamResponse = {
                    ...chunk,
                    content: responseContent,
                    contentText: chunk.isComplete ? accumulatedContent : undefined,
                    contentObject,
                    metadata
                } as UniversalStreamResponse<T extends z.ZodType ? z.infer<T> : unknown>;

                // Final log of the content object in the response
                if (chunk.isComplete) {
                    logger.debug('Response content check', {
                        hasResponseContentText: Boolean(streamResponse.contentText),
                        hasResponseContentObject: Boolean(streamResponse.contentObject)
                    });
                }

                yield streamResponse;
            }
        } catch (error) {
            logger.error('Stream processing error', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });

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
                logger.debug('Final error usage callback', {
                    tokens: lastOutputTokens - lastCallbackTokens
                });
                await Promise.resolve(this.usageCallback({ callerId: this.callerId, usage, timestamp: Date.now() }));
            }
            throw error;
        }
    }
} 