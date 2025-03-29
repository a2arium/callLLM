import { RetryWrapper } from '../../../../../core/streaming/processors/RetryWrapper';
import { StreamChunk, IStreamProcessor, IRetryPolicy } from '../../../../../core/streaming/types';
import { logger } from '../../../../../utils/logger';

// Mock dependencies
jest.mock('../../../../../utils/logger', () => ({
    logger: {
        setConfig: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    }
}));

describe('RetryWrapper', () => {
    let mockProcessor: jest.Mocked<IStreamProcessor>;
    let mockRetryPolicy: jest.Mocked<IRetryPolicy>;
    let retryWrapper: RetryWrapper;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mock processor
        mockProcessor = {
            processStream: jest.fn()
        };

        // Create mock retry policy
        mockRetryPolicy = {
            shouldRetry: jest.fn(),
            getDelayMs: jest.fn()
        };

        // Initialize RetryWrapper with mocks
        retryWrapper = new RetryWrapper(mockProcessor, mockRetryPolicy, 3);
    });

    describe('constructor', () => {
        it('should initialize with default max retries', () => {
            const wrapper = new RetryWrapper(mockProcessor, mockRetryPolicy);
            expect(wrapper).toBeDefined();
            expect(logger.setConfig).toHaveBeenCalledWith(
                expect.objectContaining({ prefix: 'RetryWrapper' })
            );
        });

        it('should initialize with custom max retries', () => {
            const wrapper = new RetryWrapper(mockProcessor, mockRetryPolicy, 5);
            expect(wrapper).toBeDefined();
        });
    });

    describe('processStream', () => {
        it('should process stream successfully on first attempt', async () => {
            // Setup input stream
            const inputChunks: StreamChunk[] = [
                { content: 'chunk1', isComplete: false },
                { content: 'chunk2', isComplete: true }
            ];

            const inputStream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of inputChunks) {
                        yield chunk;
                    }
                }
            };

            // Setup output from the wrapped processor
            const outputChunks: StreamChunk[] = [
                { content: 'processed1', isComplete: false },
                { content: 'processed2', isComplete: true }
            ];

            mockProcessor.processStream.mockImplementation(() => ({
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of outputChunks) {
                        yield chunk;
                    }
                }
            }));

            // Process the stream
            const result: StreamChunk[] = [];
            for await (const chunk of retryWrapper.processStream(inputStream)) {
                result.push(chunk);
            }

            // Verify results
            expect(result).toEqual(outputChunks);
            expect(mockProcessor.processStream).toHaveBeenCalledTimes(1);
            expect(mockRetryPolicy.shouldRetry).not.toHaveBeenCalled();
            expect(mockRetryPolicy.getDelayMs).not.toHaveBeenCalled();
        });

        it('should retry processing when an error occurs and retry policy allows', async () => {
            // Setup input stream
            const inputChunks: StreamChunk[] = [
                { content: 'chunk1', isComplete: false },
                { content: 'chunk2', isComplete: true }
            ];

            const inputStream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of inputChunks) {
                        yield chunk;
                    }
                }
            };

            // Error on first attempt, success on second
            let attempt = 0;
            mockProcessor.processStream.mockImplementation(() => {
                if (attempt === 0) {
                    attempt++;
                    throw new Error('Processing error');
                }

                return {
                    [Symbol.asyncIterator]: async function* () {
                        yield { content: 'retry success', isComplete: true };
                    }
                };
            });

            // Configure retry policy
            mockRetryPolicy.shouldRetry.mockReturnValue(true);
            mockRetryPolicy.getDelayMs.mockReturnValue(0); // No delay for tests

            // Process the stream
            const result: StreamChunk[] = [];
            for await (const chunk of retryWrapper.processStream(inputStream)) {
                result.push(chunk);
            }

            // Verify results
            expect(result).toEqual([{ content: 'retry success', isComplete: true }]);
            expect(mockProcessor.processStream).toHaveBeenCalledTimes(2);
            expect(mockRetryPolicy.shouldRetry).toHaveBeenCalledTimes(1);
            expect(mockRetryPolicy.shouldRetry).toHaveBeenCalledWith(expect.any(Error), 1);
            expect(mockRetryPolicy.getDelayMs).toHaveBeenCalledTimes(1);
            expect(mockRetryPolicy.getDelayMs).toHaveBeenCalledWith(1);
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Retry attempt 1/3'));
        });

        it('should throw error after max retries exceeded', async () => {
            // Setup input stream
            const inputChunks: StreamChunk[] = [
                { content: 'chunk1', isComplete: true }
            ];

            const inputStream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of inputChunks) {
                        yield chunk;
                    }
                }
            };

            // Always throw error
            mockProcessor.processStream.mockImplementation(() => {
                throw new Error('Persistent error');
            });

            // Configure retry policy
            mockRetryPolicy.shouldRetry.mockReturnValue(true);
            mockRetryPolicy.getDelayMs.mockReturnValue(0); // No delay for tests

            // Process the stream
            const result: StreamChunk[] = [];
            let error: Error | undefined;

            try {
                for await (const chunk of retryWrapper.processStream(inputStream)) {
                    result.push(chunk);
                }
            } catch (e) {
                error = e as Error;
            }

            // Verify results
            expect(error).toBeDefined();
            expect(error?.message).toBe('Persistent error');
            expect(mockProcessor.processStream).toHaveBeenCalledTimes(4); // Initial + 3 retries
            expect(mockRetryPolicy.shouldRetry).toHaveBeenCalledTimes(4); // Called for each process attempt
            expect(mockRetryPolicy.getDelayMs).toHaveBeenCalledTimes(3);
            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Max retries (3) exceeded'));
        });

        it('should not retry when retry policy returns false', async () => {
            // Setup input stream
            const inputChunks: StreamChunk[] = [
                { content: 'chunk1', isComplete: true }
            ];

            const inputStream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of inputChunks) {
                        yield chunk;
                    }
                }
            };

            // Throw error
            mockProcessor.processStream.mockImplementation(() => {
                throw new Error('Not retryable error');
            });

            // Configure retry policy to not retry
            mockRetryPolicy.shouldRetry.mockReturnValue(false);

            // Process the stream
            const result: StreamChunk[] = [];
            let error: Error | undefined;

            try {
                for await (const chunk of retryWrapper.processStream(inputStream)) {
                    result.push(chunk);
                }
            } catch (e) {
                error = e as Error;
            }

            // Verify results
            expect(error).toBeDefined();
            expect(error?.message).toBe('Not retryable error');
            expect(mockProcessor.processStream).toHaveBeenCalledTimes(1);
            expect(mockRetryPolicy.shouldRetry).toHaveBeenCalledTimes(1);
            expect(mockRetryPolicy.getDelayMs).not.toHaveBeenCalled();
            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Max retries (3) exceeded or retry not allowed'));
        });

        it('should handle errors in input stream', async () => {
            // Setup input stream that throws
            const inputStream = {
                [Symbol.asyncIterator]: async function* () {
                    throw new Error('Input stream error');
                }
            };

            // Process the stream
            const result: StreamChunk[] = [];
            let error: Error | undefined;

            try {
                for await (const chunk of retryWrapper.processStream(inputStream)) {
                    result.push(chunk);
                }
            } catch (e) {
                error = e as Error;
            }

            // Verify results
            expect(error).toBeDefined();
            expect(error?.message).toBe('Input stream error');
            expect(mockProcessor.processStream).not.toHaveBeenCalled();
            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error in RetryWrapper'));
        });

        it('should handle non-Error exceptions', async () => {
            // Setup input stream
            const inputChunks: StreamChunk[] = [
                { content: 'chunk1', isComplete: true }
            ];

            const inputStream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of inputChunks) {
                        yield chunk;
                    }
                }
            };

            // Throw string instead of Error
            mockProcessor.processStream.mockImplementation(() => {
                throw 'String exception';
            });

            // Configure retry policy
            mockRetryPolicy.shouldRetry.mockReturnValue(false);

            // Process the stream
            const result: StreamChunk[] = [];
            let error: unknown;

            try {
                for await (const chunk of retryWrapper.processStream(inputStream)) {
                    result.push(chunk);
                }
            } catch (e) {
                error = e;
            }

            // Verify results
            expect(error).toBe('String exception');
            expect(mockProcessor.processStream).toHaveBeenCalledTimes(1);
            expect(mockRetryPolicy.shouldRetry).not.toHaveBeenCalled(); // shouldRetry only called with Error instances
            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Max retries (3) exceeded or retry not allowed: String exception'));
        });
    });
}); 