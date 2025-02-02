import { ProviderManager } from '../caller/ProviderManager';
import { ModelManager } from '../models/ModelManager';
import { StreamHandler } from './StreamHandler';
import { UniversalChatParams, UniversalStreamResponse } from '../../interfaces/UniversalInterfaces';

export class StreamController {
    constructor(
        private providerManager: ProviderManager,
        private modelManager: ModelManager,
        private streamHandler: StreamHandler
    ) { }

    async createStream(
        model: string,
        params: UniversalChatParams,
        inputTokens: number
    ): Promise<AsyncIterable<UniversalStreamResponse>> {
        // maxRetries comes from settings or defaults to 3; note: total attempts = maxRetries + 1.
        const maxRetries = params.settings?.maxRetries ?? 3;

        // Helper function to call provider.streamCall and process the stream.
        const getStream = async (): Promise<AsyncIterable<UniversalStreamResponse>> => {
            const provider = this.providerManager.getProvider();
            const providerStream = await provider.streamCall(model, params);
            const result = this.streamHandler.processStream(
                providerStream,
                params,
                inputTokens,
                this.modelManager.getModel(model)!
            );
            if (!result) {
                throw new Error("Processed stream is undefined");
            }
            return result;
        };

        // Recursive async generator that attempts to get and yield from the stream.
        async function* retryStream(
            attempt: number,
            streamPromise: Promise<AsyncIterable<UniversalStreamResponse>>
        ): AsyncGenerator<UniversalStreamResponse> {
            try {
                const stream = await streamPromise;
                for await (const chunk of stream) {
                    yield chunk;
                }
            } catch (error) {
                if (attempt >= maxRetries) {
                    throw new Error(`Failed after ${maxRetries} retries. Last error: ${(error as Error).message}`);
                }
                // Wait with exponential backoff before retrying.
                const delayMs = Math.pow(2, attempt + 1) * 1000;
                await new Promise((resolve) => setTimeout(resolve, delayMs));
                yield* retryStream(attempt + 1, getStream());
            }
        }

        // Eagerly call getStream so that provider.streamCall is invoked immediately.
        const initialPromise = getStream();
        return { [Symbol.asyncIterator]: () => retryStream(0, initialPromise) };
    }
}