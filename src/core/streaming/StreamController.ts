import { ProviderManager } from '../caller/ProviderManager';
import { ModelManager } from '../models/ModelManager';
import { StreamHandler } from './StreamHandler';
import { UniversalChatParams, UniversalStreamResponse } from '../../interfaces/UniversalInterfaces';
import { RetryManager } from '../retry/RetryManager';
import { shouldRetryDueToContent } from "../retry/utils/ShouldRetryDueToContent";
import { logger } from '../../utils/logger';

export class StreamController {
    constructor(
        private providerManager: ProviderManager,
        private modelManager: ModelManager,
        private streamHandler: StreamHandler,
        private retryManager: RetryManager
    ) {
        logger.setConfig({
            level: process.env.LOG_LEVEL as any || 'info',
            prefix: 'StreamController'
        });
        logger.debug('Initialized StreamController', {
            providerManager: providerManager.constructor.name,
            modelManager: modelManager.constructor.name,
            streamHandler: streamHandler.constructor.name,
            retryManager: retryManager.constructor.name,
            logLevel: process.env.LOG_LEVEL || 'info'
        });
    }

    async createStream(
        model: string,
        params: UniversalChatParams,
        inputTokens: number
    ): Promise<AsyncIterable<UniversalStreamResponse>> {
        // Use maxRetries from settings (if provided)
        const maxRetries = params.settings?.maxRetries ?? 3;
        const startTime = Date.now();
        const requestId = params.callerId || `req_${Date.now()}`;

        logger.debug('Creating stream', {
            model,
            inputTokens,
            maxRetries,
            stream: params.settings?.stream,
            tools: params.settings?.tools ? params.settings.tools.map((t: { name: string }) => t.name) : [],
            toolChoice: params.settings?.toolChoice,
            callerId: params.callerId,
            requestId,
            responseFormat: params.settings?.responseFormat,
            hasJsonSchema: Boolean(params.settings?.jsonSchema),
            messagesCount: params.messages.length,
            isDirectStreaming: true,  // Flag to track true streaming vs fake streaming
            shouldRetryContent: params.settings?.shouldRetryDueToContent !== false,
            initializationTimeMs: Date.now() - startTime
        });

        // Helper function: call provider.streamCall and process the stream.
        const getStream = async (): Promise<AsyncIterable<UniversalStreamResponse>> => {
            const provider = this.providerManager.getProvider();
            const providerType = provider.constructor.name;

            logger.debug('Requesting provider stream', {
                provider: providerType,
                model,
                callerId: params.callerId,
                requestId,
                toolsCount: params.settings?.tools?.length || 0,
                hasJsonSchema: Boolean(params.settings?.jsonSchema),
                responseFormat: params.settings?.responseFormat || 'none'
            });

            const streamStartTime = Date.now();
            let providerRequestError: Error | null = null;
            let providerStream;

            try {
                providerStream = await provider.streamCall(model, params);
                logger.debug('Provider stream created', {
                    timeToCreateMs: Date.now() - streamStartTime,
                    model,
                    provider: providerType,
                    requestId
                });
            } catch (error) {
                providerRequestError = error as Error;
                logger.error('Provider stream creation failed', {
                    error: providerRequestError.message,
                    provider: providerType,
                    model,
                    requestId,
                    timeToFailMs: Date.now() - streamStartTime
                });
                throw providerRequestError;
            }

            // Wrap providerStream in a debug wrapper to log raw chunks as they are received
            const debugProviderStream = (async function* () {
                let hasStarted = false;
                let chunkCount = 0;
                let totalContentLength = 0;
                let totalToolCalls = 0;
                const chunkTimes: number[] = [];
                const startStreamProcessingTime = Date.now();

                for await (const chunk of providerStream) {
                    logger.debug('Provider chunk', {
                        chunkIndex: chunkCount,
                        chunk: chunk,
                        requestId
                    });
                    chunkCount++;
                    chunkTimes.push(Date.now());
                    const contentLength = chunk.content?.length || 0;
                    totalContentLength += contentLength;
                    const hasContent = contentLength > 0;
                    const toolCallCount = chunk.toolCallDeltas?.length || 0;
                    totalToolCalls += toolCallCount;

                    if (!hasStarted && (hasContent || toolCallCount > 0)) {
                        hasStarted = true;
                        logger.debug('First meaningful chunk received from provider', {
                            chunkIndex: chunkCount,
                            timeToFirstChunkMs: Date.now() - streamStartTime,
                            contentLength,
                            hasToolCalls: Boolean(toolCallCount),
                            toolCallCount,
                            provider: providerType,
                            requestId
                        });
                    }

                    // Only yield chunks that have actual content or are completion signals
                    if (hasStarted || chunk.isComplete || toolCallCount > 0) {
                        logger.debug('Provider chunk on actual content', {
                            chunkIndex: chunkCount,
                            contentLength,
                            isComplete: chunk.isComplete,
                            hasToolCalls: Boolean(toolCallCount),
                            toolCallCount,
                            finishReason: chunk.metadata?.finishReason,
                            timeSinceLastChunkMs: chunkTimes.length > 1 ? chunkTimes[chunkTimes.length - 1] - chunkTimes[chunkTimes.length - 2] : 0,
                            totalContentLength,
                            totalToolCalls,
                            requestId
                        });
                        yield chunk;
                    } else {
                        logger.debug('Skipping empty provider chunk', {
                            chunkIndex: chunkCount,
                            requestId
                        });
                    }
                }

                // Calculate timing statistics
                const totalTimeMs = Date.now() - startStreamProcessingTime;
                const avgTimeBetweenChunksMs = chunkTimes.length > 1
                    ? (chunkTimes[chunkTimes.length - 1] - chunkTimes[0]) / (chunkTimes.length - 1)
                    : 0;

                logger.debug('Provider stream ended', {
                    totalChunks: chunkCount,
                    totalTimeMs,
                    totalContentLength,
                    totalToolCalls,
                    avgTimeBetweenChunksMs,
                    finishReason: chunkCount > 0 ? 'completed' : 'empty_stream',
                    provider: providerType,
                    model,
                    requestId
                });
            })();

            logger.debug('Processing provider stream through StreamHandler', {
                model,
                callerId: params.callerId,
                requestId,
                processingStartTime: Date.now() - startTime
            });

            const handlerStartTime = Date.now();
            let result;

            try {
                result = this.streamHandler.processStream(
                    debugProviderStream,
                    params,
                    inputTokens,
                    this.modelManager.getModel(model)!
                );

                logger.debug('Stream handler processing completed', {
                    processingTimeMs: Date.now() - handlerStartTime,
                    model,
                    requestId
                });
            } catch (error) {
                logger.error('Error in stream handler processing', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    processingTimeMs: Date.now() - handlerStartTime,
                    model,
                    requestId
                });
                throw error;
            }

            if (result == null) {
                logger.error('Processed stream is undefined', {
                    model,
                    requestId,
                    processingTimeMs: Date.now() - handlerStartTime
                });
                throw new Error("Processed stream is undefined");
            }
            return result;
        };

        // A wrapper that uses RetryManager to call getStream exactly once per attempt.
        // (By setting shouldRetry to always return false, no internal retries occur.)
        const acquireStream = async (): Promise<AsyncIterable<UniversalStreamResponse>> => {
            try {
                logger.debug('Acquiring stream with retry manager', {
                    maxRetries,
                    model,
                    callerId: params.callerId,
                    requestId,
                    retryManagerType: this.retryManager.constructor.name
                });

                const retryStartTime = Date.now();
                const result = await this.retryManager.executeWithRetry(
                    async () => {
                        const res = await getStream();
                        if (res == null) {
                            logger.error('Stream acquisition failed, result is null', {
                                model,
                                requestId
                            });
                            throw new Error("Processed stream is undefined");
                        }
                        return res;
                    },
                    () => false // Do not retry internally.
                );

                logger.debug('Stream acquired successfully', {
                    acquireTimeMs: Date.now() - retryStartTime,
                    model,
                    requestId
                });

                return result;
            } catch (error) {
                logger.error('Error acquiring stream', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    model,
                    callerId: params.callerId,
                    requestId,
                    totalTimeMs: Date.now() - startTime
                });
                // Ensure errors from processStream are propagated
                throw error;
            }
        };

        // Outer recursive async generator: if an error occurs during acquisition or iteration,
        // and we haven't exceeded maxRetries, wait (with exponential backoff) and try once more.
        const outerRetryStream = async function* (this: StreamController, attempt: number): AsyncGenerator<UniversalStreamResponse> {
            try {
                logger.debug('Starting stream attempt', {
                    attempt: attempt + 1,
                    maxRetries,
                    model,
                    callerId: params.callerId,
                    requestId,
                    timeSinceStartMs: Date.now() - startTime
                });

                const stream = await acquireStream();
                let accumulatedContent = "";
                let chunkCount = 0;
                let totalToolCalls = 0;
                const streamStartTime = Date.now();
                const chunkTimings: number[] = [];

                try {
                    for await (const chunk of stream) {
                        chunkCount++;
                        chunkTimings.push(Date.now());
                        // Still accumulate content from each chunk for retry purposes
                        // but prefer contentText for the final chunk if available
                        accumulatedContent += chunk.content || '';
                        totalToolCalls += chunk.toolCalls?.length || 0;

                        if (chunk.isComplete) {
                            const totalStreamTimeMs = Date.now() - streamStartTime;
                            const avgTimeBetweenChunksMs = chunkTimings.length > 1
                                ? (chunkTimings[chunkTimings.length - 1] - chunkTimings[0]) / (chunkTimings.length - 1)
                                : 0;

                            logger.debug('Stream completed successfully', {
                                attempt: attempt + 1,
                                totalChunks: chunkCount,
                                contentLength: accumulatedContent.length,
                                timeMs: totalStreamTimeMs,
                                finishReason: chunk.metadata?.finishReason,
                                model,
                                callerId: params.callerId,
                                requestId,
                                totalToolCalls,
                                avgChunkTimeMs: avgTimeBetweenChunksMs,
                                totalProcessingTimeMs: Date.now() - startTime
                            });
                        }

                        yield chunk;
                    }
                } catch (streamError) {
                    logger.error('Error during stream iteration', {
                        error: streamError instanceof Error ? streamError.message : 'Unknown error',
                        attempt: attempt + 1,
                        chunkCount,
                        model,
                        callerId: params.callerId,
                        requestId,
                        streamDurationMs: Date.now() - streamStartTime,
                        accumulatedContentLength: accumulatedContent.length,
                        totalToolCalls
                    });

                    // Propagate validation errors immediately without retry
                    if (streamError instanceof Error && streamError.message.includes('validation error')) {
                        logger.warn('Validation error, not retrying', {
                            error: streamError.message,
                            attempt: attempt + 1,
                            requestId
                        });
                        throw streamError;
                    }
                    throw streamError;
                }

                // After the stream is complete, check if the accumulated content triggers a retry
                // Only check content if shouldRetryDueToContent is not explicitly disabled
                if (params.settings?.shouldRetryDueToContent !== false) {
                    // Use the last chunk's contentText if available (it should have the complete content)
                    // Otherwise, use our accumulated content
                    const contentToCheck = accumulatedContent;
                    const shouldRetry = shouldRetryDueToContent({ content: contentToCheck });

                    logger.debug('Content retry check', {
                        shouldRetry,
                        contentLength: contentToCheck.length,
                        attempt: attempt + 1,
                        requestId
                    });

                    if (shouldRetry) {
                        logger.warn('Triggering retry due to content', {
                            attempt: attempt + 1,
                            contentLength: contentToCheck.length,
                            model,
                            callerId: params.callerId,
                            requestId,
                            totalProcessingTimeMs: Date.now() - startTime
                        });
                        throw new Error("Stream response content triggered retry due to unsatisfactory answer");
                    }
                }
                return;
            } catch (error) {
                // Propagate validation errors immediately without retry
                if (error instanceof Error && error.message.includes('validation error')) {
                    throw error;
                }

                if (attempt >= maxRetries) {
                    // Extract underlying error message if present.
                    const errMsg = (error as Error).message;
                    const underlyingMessage = errMsg.includes('Last error: ')
                        ? errMsg.split('Last error: ')[1]
                        : errMsg;

                    logger.error('All retry attempts failed', {
                        maxRetries,
                        totalAttempts: attempt + 1,
                        model,
                        callerId: params.callerId,
                        requestId,
                        lastError: underlyingMessage,
                        totalTimeMs: Date.now() - startTime,
                        failureCategory: error instanceof Error ? error.constructor.name : 'Unknown'
                    });

                    throw new Error(`Failed after ${maxRetries} retries. Last error: ${underlyingMessage}`);
                }

                // Wait before retrying (exponential backoff).
                const baseDelay = process.env.NODE_ENV === 'test' ? 1 : 1000;
                const delayMs = baseDelay * Math.pow(2, attempt + 1);
                const nextAttemptNumber = attempt + 2;

                logger.warn('Retrying stream after error', {
                    attempt: attempt + 1,
                    nextAttempt: nextAttemptNumber,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    delayMs,
                    model,
                    callerId: params.callerId,
                    requestId,
                    totalElapsedTimeMs: Date.now() - startTime,
                    errorType: error instanceof Error ? error.constructor.name : 'Unknown'
                });

                await new Promise((resolve) => setTimeout(resolve, delayMs));

                logger.debug('Starting next retry attempt', {
                    attempt: nextAttemptNumber,
                    maxRetries,
                    model,
                    requestId,
                    totalElapsedTimeMs: Date.now() - startTime
                });

                yield* outerRetryStream.call(this, attempt + 1);
            }
        };

        // Return an async iterable that uses the outerRetryStream generator.
        return { [Symbol.asyncIterator]: () => outerRetryStream.call(this, 0) };
    }
}