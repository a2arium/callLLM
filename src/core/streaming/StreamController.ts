import { ProviderManager } from '../caller/ProviderManager.js';
import { ModelManager } from '../models/ModelManager.js';
import { StreamHandler } from './StreamHandler.js';
import { UniversalChatParams, UniversalStreamResponse } from '../../interfaces/UniversalInterfaces.js';
import { RetryManager } from '../retry/RetryManager.js';
import { shouldRetryDueToContent } from "../retry/utils/ShouldRetryDueToContent.js";
import { logger } from '../../utils/logger.js';

/**
 * StreamController is responsible for managing the creation and processing of streaming LLM responses.
 * It handles the low-level details of:
 * 1. Provider interaction (getting streams from LLM APIs)
 * 2. Stream processing (through StreamHandler)
 * 3. Retry management (for failed requests or problematic responses)
 * 
 * NOTE: StreamController is often used by ChunkController for handling large inputs that need
 * to be broken into multiple smaller requests.
 */
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

    /**
     * Creates a stream of responses from an LLM provider
     * 
     * This method returns an AsyncIterable, but no processing happens
     * until the returned generator is actually consumed. This is due to JavaScript's
     * lazy evaluation of generators.
     * 
     * Flow:
     * 1. Set up retry parameters
     * 2. Create nested functions for stream creation, acquisition and retry logic
     * 3. Return an AsyncIterable that will produce stream chunks when consumed
     * 
     * When ChunkController calls this method, it immediately returns the generator,
     * but actual provider calls only happen when ChunkController starts iterating over
     * the returned generator.
     */
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
            tools: params.tools ? params.tools.map((t: { name: string }) => t.name) : [],
            toolChoice: params.settings?.toolChoice,
            callerId: params.callerId,
            requestId,
            responseFormat: params.responseFormat,
            hasJsonSchema: Boolean(params.jsonSchema),
            messagesCount: params.messages.length,
            isDirectStreaming: true,  // Flag to track true streaming vs fake streaming
            shouldRetryContent: params.settings?.shouldRetryDueToContent !== false,
            initializationTimeMs: Date.now() - startTime
        });

        /**
         * Internal helper function: calls provider.streamCall and processes the stream.
         * 
         * IMPORTANT: This function sets up the stream processing pipeline but due to
         * async generator lazy evaluation, the actual processing doesn't start until
         * the returned generator is consumed.
         * 
         * Flow:
         * 1. Get provider instance
         * 2. Request a stream from the provider
         * 3. Process the provider stream through StreamHandler
         * 4. Return the processed stream (which is an async generator)
         */
        const getStream = async (): Promise<AsyncIterable<UniversalStreamResponse>> => {
            logger.setConfig({
                level: process.env.LOG_LEVEL as any || 'info',
                prefix: 'StreamController.getStream'
            });
            const provider = this.providerManager.getProvider();
            const providerType = provider.constructor.name;

            logger.debug('Requesting provider stream', {
                provider: providerType,
                model,
                callerId: params.callerId,
                requestId,
                toolsCount: params.tools?.length || 0,
                hasJsonSchema: Boolean(params.jsonSchema),
                responseFormat: params.responseFormat || 'none'
            });

            const streamStartTime = Date.now();
            let providerRequestError: Error | null = null;
            let providerStream;

            try {
                // Get the raw provider stream - this actually makes the API call
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

            // This log message might not appear if ChunkController is used because
            // it might never reach this point in the code if it's using its own
            // stream processing logic
            logger.debug('Processing provider stream through StreamHandler', {
                model,
                callerId: params.callerId,
                requestId,
                processingStartTime: Date.now() - startTime
            });

            const handlerStartTime = Date.now();
            let result;

            try {
                // IMPORTANT: This returns an async generator but doesn't start processing
                // until the generator is consumed by iterating over it. The actual processing
                // will only start when something begins iterating over 'result'.
                // This is why the log message below may execute BEFORE any actual processing happens.
                result = this.streamHandler.processStream(
                    providerStream,
                    params,
                    inputTokens,
                    this.modelManager.getModel(model)!
                );

                // This log executes right after the generator is created, but BEFORE
                // any processing actually happens. That's why this log message may appear
                // to be out of order or missing if you're looking at a complete trace.
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

        /**
         * A wrapper that uses RetryManager to call getStream exactly once per attempt.
         * This encapsulates the retry logic around stream acquisition.
         * 
         * By setting shouldRetry to always return false, no internal retries occur;
         * instead, retries are managed by the outer retry mechanism.
         */
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

        /**
         * Outer recursive async generator: if an error occurs during acquisition or iteration,
         * and we haven't exceeded maxRetries, wait (with exponential backoff) and try once more.
         * 
         * This is where the actual iteration over the stream happens, and where the
         * lazy evaluation of the async generators finally starts executing.
         * 
         * Flow:
         * 1. Acquire stream through acquireStream()
         * 2. Iterate through the stream, yielding each chunk
         * 3. Handle errors and retry if needed
         * 4. Check content quality and retry if needed
         */
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

                // This gets the async generator from acquireStream but doesn't start
                // consuming it yet
                const stream = await acquireStream();
                let accumulatedContent = "";
                let chunkCount = 0;
                let totalToolCalls = 0;
                const streamStartTime = Date.now();
                const chunkTimings: number[] = [];

                try {
                    // THIS is where the actual processing begins! When we start
                    // iterating over the stream, all the generator functions up the chain
                    // start executing.
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

                        // Forward the chunk to the caller
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

                // Recursively try again with the next attempt number
                yield* outerRetryStream.call(this, attempt + 1);
            }
        };

        // Return an async iterable that uses the outerRetryStream generator.
        // This is a lazy operation - no actual work happens until
        // something begins iterating over the returned generator.
        // When ChunkController calls this method and gets this generator,
        // it won't start processing until ChunkController begins its for-await loop.
        return { [Symbol.asyncIterator]: () => outerRetryStream.call(this, 0) };
    }
}