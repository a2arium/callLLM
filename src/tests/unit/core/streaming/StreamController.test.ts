import { StreamController } from '../../../../core/streaming/StreamController';
import { UniversalChatParams, UniversalStreamResponse, FinishReason } from '../../../../interfaces/UniversalInterfaces';
import type { ProviderManager } from '../../../../core/caller/ProviderManager';
import type { ModelManager } from '../../../../core/models/ModelManager';
import type { StreamHandler } from '../../../../core/streaming/StreamHandler';
import type { RetryManager } from '../../../../core/retry/RetryManager';

// Define stub types for dependencies
type ProviderStub = {
    streamCall: (model: string, params: UniversalChatParams) => Promise<AsyncIterable<UniversalStreamResponse>>;
};

type ProviderManagerStub = {
    getProvider: () => ProviderStub;
    provider: ProviderStub;
    createProvider: () => void;
    switchProvider: () => void;
    getCurrentProviderName: () => string;
};

type ModelStub = {
    name: string;
    inputPricePerMillion: number;
    outputPricePerMillion: number;
    maxRequestTokens: number;
    maxResponseTokens: number;
    tokenizationModel?: string;
    characteristics: { qualityIndex: number; outputSpeed: number; firstTokenLatency: number };
};

type ModelManagerStub = {
    getModel: (model: string) => ModelStub | undefined;
};

type StreamHandlerStub = {
    processStream: (
        providerStream: AsyncIterable<UniversalStreamResponse>,
        params: UniversalChatParams,
        inputTokens: number,
        model: ModelStub
    ) => AsyncIterable<UniversalStreamResponse> | null;
};

type RetryManagerStub = {
    executeWithRetry: <T>(
        fn: () => Promise<T>,
        shouldRetry: () => boolean
    ) => Promise<T>;
};

// A helper async generator that simulates a processed stream returning one chunk.
const fakeProcessedStream = async function* (): AsyncGenerator<UniversalStreamResponse> {
    yield {
        content: 'chunk1',
        role: 'assistant',
        isComplete: true,
        metadata: { finishReason: FinishReason.STOP, responseFormat: 'text' }
    };
};

// A helper async generator simulating a provider stream (not used directly by tests).
const fakeProviderStream = async function* (): AsyncGenerator<UniversalStreamResponse> {
    yield {
        content: 'provider chunk',
        role: 'assistant',
        isComplete: true,
        metadata: { finishReason: FinishReason.STOP, responseFormat: 'text' }
    };
};

describe('StreamController', () => {
    let providerManager: ProviderManagerStub;
    let modelManager: ModelManagerStub;
    let streamHandler: StreamHandlerStub;
    let retryManager: RetryManagerStub;
    let streamController: StreamController;
    let callCount = 0; // Declare callCount before using it

    // Create a dummy model to be returned by modelManager.getModel().
    const dummyModel: ModelStub = {
        name: 'test-model',
        inputPricePerMillion: 100,
        outputPricePerMillion: 200,
        maxRequestTokens: 1000,
        maxResponseTokens: 1000,
        tokenizationModel: 'test',
        characteristics: { qualityIndex: 80, outputSpeed: 50, firstTokenLatency: 10 }
    };

    const dummyParams: UniversalChatParams = { messages: [{ role: 'user', content: 'test' }], settings: {} };

    beforeEach(() => {
        // Create a provider stub that has a streamCall method.
        const providerStub: ProviderStub = {
            streamCall: jest.fn().mockResolvedValue(fakeProviderStream())
        };

        providerManager = {
            getProvider: jest.fn().mockReturnValue(providerStub),
            provider: providerStub,
            createProvider: jest.fn(),
            switchProvider: jest.fn(),
            getCurrentProviderName: jest.fn().mockReturnValue('test-provider')
        };

        modelManager = {
            getModel: jest.fn().mockReturnValue(dummyModel)
        };

        streamHandler = {
            processStream: jest.fn().mockReturnValue(fakeProcessedStream())
        };

        retryManager = {
            executeWithRetry: jest.fn().mockImplementation(async <T>(
                fn: () => Promise<T>,
                shouldRetry: () => boolean
            ): Promise<T> => {
                if (callCount === 0) {
                    callCount++;
                    throw new Error('Test error');
                }
                return fn();
            })
        };

        streamController = new StreamController(
            providerManager as unknown as ProviderManager,
            modelManager as unknown as ModelManager,
            streamHandler as unknown as StreamHandler,
            retryManager as unknown as RetryManager
        );
    });

    it('should return processed stream on success', async () => {
        const resultIterable = await streamController.createStream('test-model', dummyParams, 10);
        const chunks: UniversalStreamResponse[] = [];
        for await (const chunk of resultIterable) {
            chunks.push(chunk);
        }
        expect(chunks).toHaveLength(1);
        expect(chunks[0]).toEqual({
            content: 'chunk1',
            role: 'assistant',
            isComplete: true,
            metadata: { finishReason: FinishReason.STOP, responseFormat: 'text' }
        });

        // Verify that the provider's streamCall and streamHandler.processStream were called correctly.
        expect(providerManager.getProvider).toHaveBeenCalled();
        expect(streamHandler.processStream).toHaveBeenCalledWith(expect.anything(), dummyParams, 10, dummyModel);
    });

    it('should retry on acquireStream error and eventually succeed', async () => {
        jest.useFakeTimers();
        // Override retryManager.executeWithRetry so that the first call fails and the second call succeeds.
        (retryManager.executeWithRetry as jest.Mock).mockImplementation(async <T>(
            fn: () => Promise<T>,
            _shouldRetry: () => boolean
        ): Promise<T> => {
            if (callCount === 0) {
                callCount++;
                throw new Error('Test error');
            }
            return fn();
        });

        const resultIterable = await streamController.createStream('test-model', dummyParams, 10);
        // Advance fake timers to cover the delay (baseDelay is 1 in "test" environment, so 2 ms for the first retry).
        await jest.advanceTimersByTimeAsync(10);

        const chunks: UniversalStreamResponse[] = [];
        for await (const chunk of resultIterable) {
            chunks.push(chunk);
        }
        expect(callCount).toBe(1);
        expect(chunks).toHaveLength(1);
        expect(chunks[0]).toEqual({
            content: 'chunk1',
            role: 'assistant',
            isComplete: true,
            metadata: { finishReason: FinishReason.STOP, responseFormat: 'text' }
        });
        jest.useRealTimers();
    });

    it('should throw error after max retries exceeded', async () => {
        // Override retryManager.executeWithRetry to always fail.
        (retryManager.executeWithRetry as jest.Mock).mockImplementation(async (_fn: () => Promise<AsyncIterable<UniversalStreamResponse>>, _shouldRetry: () => boolean) => {
            throw new Error('Always fail');
        });
        // Set maxRetries to 2 via params.
        const paramsWithRetries: UniversalChatParams = { messages: dummyParams.messages, settings: { maxRetries: 2 } };

        const resultIterable = await streamController.createStream('test-model', paramsWithRetries, 10);
        let error: Error | null = null;
        try {
            for await (const _ of resultIterable) {
                // Consume the stream (expected to eventually throw)
            }
        } catch (err) {
            error = err as Error;
        }
        expect(error).toBeTruthy();
        expect(error!.message).toMatch(/Failed after 2 retries\. Last error: Always fail/);
    });

    it('should throw error if processStream returns null', async () => {
        // Simulate a scenario where processStream returns null.
        (streamHandler.processStream as jest.Mock).mockReturnValue(null);

        const resultIterable = await streamController.createStream('test-model', dummyParams, 10);
        let error: Error | null = null;
        try {
            for await (const _ of resultIterable) {
                // Consume stream (expected to throw immediately)
            }
        } catch (err) {
            error = err as Error;
        }
        expect(error).toBeTruthy();
        expect(error!.message).toMatch(/Processed stream is undefined/);
    });

    // New tests for content-based retry in streams
    describe('Content-based retry', () => {
        let processStreamSpy: jest.SpyInstance;

        beforeEach(() => {
            let attempt = 0;
            processStreamSpy = jest.spyOn(streamHandler, 'processStream').mockImplementation((providerStream, params, inputTokens, model) => {
                attempt++;
                if (attempt < 3) {
                    return (async function* (): AsyncGenerator<UniversalStreamResponse> {
                        yield {
                            content: "I cannot assist with that",
                            role: "assistant",
                            isComplete: true,
                            metadata: { finishReason: FinishReason.STOP, responseFormat: "text" }
                        };
                    })();
                } else {
                    return (async function* (): AsyncGenerator<UniversalStreamResponse> {
                        yield {
                            content: "Here is a complete answer",
                            role: "assistant",
                            isComplete: true,
                            metadata: { finishReason: FinishReason.STOP, responseFormat: "text" }
                        };
                    })();
                }
            });
        });

        afterEach(() => {
            processStreamSpy.mockRestore();
        });

        it('should retry on unsatisfactory stream responses and eventually succeed', async () => {
            const resultIterable = await streamController.createStream('test-model', dummyParams, 10);
            const chunks: UniversalStreamResponse[] = [];
            for await (const chunk of resultIterable) {
                chunks.push(chunk);
            }
            expect(chunks).toHaveLength(3);
            expect(chunks[0].content).toBe("I cannot assist with that");
            expect(chunks[1].content).toBe("I cannot assist with that");
            expect(chunks[2].content).toBe("Here is a complete answer");
            expect(processStreamSpy).toHaveBeenCalledTimes(3);
        });

        it('should fail after max retries if stream responses remain unsatisfactory', async () => {
            processStreamSpy.mockImplementation((): AsyncIterable<UniversalStreamResponse> => {
                return (async function* (): AsyncGenerator<UniversalStreamResponse> {
                    yield {
                        content: "I cannot assist with that",
                        role: "assistant",
                        isComplete: true,
                        metadata: { finishReason: FinishReason.STOP, responseFormat: "text" }
                    };
                })();
            });
            const paramsWithRetries: UniversalChatParams = { messages: dummyParams.messages, settings: { maxRetries: 2 } };
            const resultIterable = await streamController.createStream('test-model', paramsWithRetries, 10);
            let error: Error | null = null;
            try {
                for await (const _ of resultIterable) { }
            } catch (err) {
                error = err as Error;
            }
            expect(error).toBeTruthy();
            expect(error!.message).toMatch(/Failed after 2 retries\. Last error: Stream response content triggered retry due to unsatisfactory answer/);
            expect(processStreamSpy).toHaveBeenCalledTimes(3);
        });
    });
});