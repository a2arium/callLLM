import { ProviderManager } from '../caller/ProviderManager';
import { ModelManager } from '../models/ModelManager';
import { StreamHandler } from './StreamHandler';
import { UniversalChatParams, UniversalStreamResponse } from '../../interfaces/UniversalInterfaces';
import { RetryManager } from '../retry/RetryManager';
import { shouldRetryDueToContent } from "../retry/utils/ShouldRetryDueToContent";

export class StreamController {
    constructor(
        private providerManager: ProviderManager,
        private modelManager: ModelManager,
        private streamHandler: StreamHandler,
        private retryManager: RetryManager
    ) { }

    async createStream(
        model: string,
        params: UniversalChatParams,
        inputTokens: number
    ): Promise<AsyncIterable<UniversalStreamResponse>> {
        // Use maxRetries from settings (if provided)
        const maxRetries = params.settings?.maxRetries ?? 3;

        // Helper function: call provider.streamCall and process the stream.
        const getStream = async (): Promise<AsyncIterable<UniversalStreamResponse>> => {
            const provider = this.providerManager.getProvider();
            const providerStream = await provider.streamCall(model, params);
            const result = this.streamHandler.processStream(
                providerStream,
                params,
                inputTokens,
                this.modelManager.getModel(model)!
            );
            if (result == null) {
                throw new Error("Processed stream is undefined");
            }
            return result;
        };

        // A wrapper that uses RetryManager to call getStream exactly once per attempt.
        // (By setting shouldRetry to always return false, no internal retries occur.)
        const acquireStream = async (): Promise<AsyncIterable<UniversalStreamResponse>> => {
            return await this.retryManager.executeWithRetry(
                async () => {
                    const res = await getStream();
                    if (res == null) {
                        throw new Error("Processed stream is undefined");
                    }
                    return res;
                },
                () => false // Do not retry internally.
            );
        };

        // Outer recursive async generator: if an error occurs during acquisition or iteration,
        // and we haven't exceeded maxRetries, wait (with exponential backoff) and try once more.
        const outerRetryStream = async function* (this: StreamController, attempt: number): AsyncGenerator<UniversalStreamResponse> {
            try {
                const stream = await acquireStream();
                let accumulatedContent = "";
                for await (const chunk of stream) {
                    accumulatedContent += chunk.content;
                    yield chunk;
                }
                // After the stream is complete, check if the accumulated content triggers a retry
                if (shouldRetryDueToContent(accumulatedContent)) {
                    throw new Error("Stream response content triggered retry due to unsatisfactory answer");
                }
                return;
            } catch (error) {
                if (attempt >= maxRetries) {
                    // Extract underlying error message if present.
                    const errMsg = (error as Error).message;
                    const underlyingMessage = errMsg.includes('Last error: ')
                        ? errMsg.split('Last error: ')[1]
                        : errMsg;
                    throw new Error(`Failed after ${maxRetries} retries. Last error: ${underlyingMessage}`);
                }
                // Wait before retrying (exponential backoff).
                const baseDelay = process.env.NODE_ENV === 'test' ? 1 : 1000;
                const delayMs = baseDelay * Math.pow(2, attempt + 1);
                await new Promise((resolve) => setTimeout(resolve, delayMs));
                yield* outerRetryStream.call(this, attempt + 1);
            }
        };

        // Return an async iterable that uses the outerRetryStream generator.
        return { [Symbol.asyncIterator]: () => outerRetryStream.call(this, 0) };
    }
}