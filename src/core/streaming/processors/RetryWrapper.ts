import type { StreamChunk, IStreamProcessor, IRetryPolicy } from "../types.ts";
import { logger } from "../../../utils/logger.ts";


// TODO: CURRENTLY NOT IN USE. Either use or remove
export class RetryWrapper implements IStreamProcessor {
    private processor: IStreamProcessor;
    private retryPolicy: IRetryPolicy;
    private maxRetries: number;
    private readonly log = logger.createLogger({ prefix: 'RetryWrapper' });

    constructor(processor: IStreamProcessor, retryPolicy: IRetryPolicy, maxRetries = 3) {
        this.processor = processor;
        this.retryPolicy = retryPolicy;
        this.maxRetries = maxRetries;
    }

    async *processStream(stream: AsyncIterable<StreamChunk>): AsyncIterable<StreamChunk> {
        // We need to buffer the stream to allow for retries
        const bufferedChunks: StreamChunk[] = [];

        try {
            // First, buffer the entire input stream
            for await (const chunk of stream) {
                bufferedChunks.push(chunk);
            }

            // Now create an iterable from the buffered chunks
            const bufferedStream = (async function* () {
                for (const chunk of bufferedChunks) {
                    yield chunk;
                }
            })();

            let attempt = 0;
            while (true) {
                try {
                    // Process the stream using the wrapped processor
                    for await (const chunk of this.processor.processStream(bufferedStream)) {
                        yield chunk;
                    }
                    break; // exit loop on successful processing
                } catch (error) {
                    attempt++;

                    const shouldRetry = error instanceof Error &&
                        this.retryPolicy.shouldRetry(error, attempt) &&
                        attempt <= this.maxRetries;

                    if (shouldRetry) {
                        const delayMs = this.retryPolicy.getDelayMs(attempt);
                        this.log.warn(`Retry attempt ${attempt}/${this.maxRetries} after ${delayMs}ms: ${error.message}`);
                        await new Promise((resolve) => setTimeout(resolve, delayMs));

                        // Recreate the buffered stream for the next attempt
                        const retryStream = (async function* () {
                            for (const chunk of bufferedChunks) {
                                yield chunk;
                            }
                        })();

                        bufferedStream[Symbol.asyncIterator] = retryStream[Symbol.asyncIterator].bind(retryStream);
                    } else {
                        this.log.error(`Max retries (${this.maxRetries}) exceeded or retry not allowed: ${error instanceof Error ? error.message : String(error)}`);
                        throw error;
                    }
                }
            }
        } catch (error) {
            this.log.error(`Error in RetryWrapper: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
} 
