import { StreamHistoryProcessor } from '../../../../../core/streaming/processors/StreamHistoryProcessor.js';
import { HistoryManager } from '../../../../../core/history/HistoryManager.js';
import { StreamChunk } from '../../../../../core/streaming/types.js';
import { UniversalStreamResponse } from '../../../../../interfaces/UniversalInterfaces.js';

// Import logger to mock it
import { logger } from '../../../../../utils/logger.js';

// Create a mock for HistoryManager
jest.mock('../../../../../core/history/HistoryManager', () => {
    return {
        HistoryManager: jest.fn().mockImplementation(() => ({
            captureStreamResponse: jest.fn()
        }))
    };
});

// Mock the logger
jest.mock('../../../../../utils/logger', () => {
    return {
        logger: {
            createLogger: jest.fn().mockReturnValue({
                debug: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn()
            })
        }
    };
});

describe('StreamHistoryProcessor', () => {
    let streamHistoryProcessor: StreamHistoryProcessor;
    let mockHistoryManager: jest.Mocked<HistoryManager>;
    const originalEnv = process.env;

    beforeEach(() => {
        // Clear mocks
        jest.clearAllMocks();
        // Restore process.env
        process.env = { ...originalEnv };

        // Create a new HistoryManager mock
        mockHistoryManager = new HistoryManager() as jest.Mocked<HistoryManager>;

        // Create StreamHistoryProcessor with mock HistoryManager
        streamHistoryProcessor = new StreamHistoryProcessor(mockHistoryManager);
    });

    afterAll(() => {
        // Restore original process.env
        process.env = originalEnv;
    });

    describe('constructor', () => {
        it('should initialize with a history manager', () => {
            expect(streamHistoryProcessor).toBeDefined();
        });

        it('should use LOG_LEVEL from environment variable when provided', () => {
            // Set the LOG_LEVEL environment variable
            process.env.LOG_LEVEL = 'info';

            // Create a new instance with the environment variable set
            const processor = new StreamHistoryProcessor(mockHistoryManager);

            // Verify the logger was created with the correct options
            expect(logger.createLogger).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: 'info',
                    prefix: 'StreamHistoryProcessor.constructor'
                })
            );
        });

        it('should use default debug level when LOG_LEVEL is not provided', () => {
            // Ensure LOG_LEVEL is not set
            delete process.env.LOG_LEVEL;

            // Create a new instance without the environment variable
            const processor = new StreamHistoryProcessor(mockHistoryManager);

            // Verify the logger was created with the correct options
            expect(logger.createLogger).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: 'debug',
                    prefix: 'StreamHistoryProcessor.constructor'
                })
            );
        });
    });

    describe('processStream', () => {
        it('should process a stream with a single complete chunk', async () => {
            // Create a chunk with content and isComplete flag
            const chunk: StreamChunk & Partial<UniversalStreamResponse> = {
                content: 'This is a test response',
                role: 'assistant',
                isComplete: true
            };

            // Create stream
            const stream = {
                [Symbol.asyncIterator]: async function* () {
                    yield chunk;
                }
            };

            // Process the stream
            const resultChunks: StreamChunk[] = [];
            for await (const resultChunk of streamHistoryProcessor.processStream(stream)) {
                resultChunks.push(resultChunk);
            }

            // Verify that captureStreamResponse was called
            expect(mockHistoryManager.captureStreamResponse).toHaveBeenCalledTimes(1);
            expect(mockHistoryManager.captureStreamResponse).toHaveBeenCalledWith(
                'This is a test response',
                true
            );

            // Verify that the chunk was returned unmodified
            expect(resultChunks.length).toBe(1);
            expect(resultChunks[0]).toEqual(chunk);
        });

        it('should process a stream with multiple chunks', async () => {
            // Create chunks with content
            const chunks: (StreamChunk & Partial<UniversalStreamResponse>)[] = [
                { content: 'This is ', role: 'assistant', isComplete: false },
                { content: 'a multi-chunk ', role: 'assistant', isComplete: false },
                { content: 'response', role: 'assistant', isComplete: true }
            ];

            // Create stream
            const stream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of chunks) {
                        yield chunk;
                    }
                }
            };

            // Process the stream
            const resultChunks: StreamChunk[] = [];
            for await (const resultChunk of streamHistoryProcessor.processStream(stream)) {
                resultChunks.push(resultChunk);
            }

            // Verify that captureStreamResponse was called only on complete chunk
            expect(mockHistoryManager.captureStreamResponse).toHaveBeenCalledTimes(1);
            expect(mockHistoryManager.captureStreamResponse).toHaveBeenCalledWith(
                'This is a multi-chunk response',
                true
            );

            // Verify that all chunks were returned unmodified
            expect(resultChunks.length).toBe(3);
            expect(resultChunks).toEqual(chunks);
        });

        it('should handle empty content in chunks', async () => {
            // Create chunks with some empty content
            const chunks: (StreamChunk & Partial<UniversalStreamResponse>)[] = [
                { content: '', role: 'assistant', isComplete: false },
                { content: 'Some content', role: 'assistant', isComplete: false },
                { content: '', role: 'assistant', isComplete: true }
            ];

            // Create stream
            const stream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of chunks) {
                        yield chunk;
                    }
                }
            };

            // Process the stream
            const resultChunks: StreamChunk[] = [];
            for await (const resultChunk of streamHistoryProcessor.processStream(stream)) {
                resultChunks.push(resultChunk);
            }

            // Verify that captureStreamResponse was called with correct content
            expect(mockHistoryManager.captureStreamResponse).toHaveBeenCalledTimes(1);
            expect(mockHistoryManager.captureStreamResponse).toHaveBeenCalledWith(
                'Some content',
                true
            );

            // Verify that all chunks were returned unmodified
            expect(resultChunks.length).toBe(3);
            expect(resultChunks).toEqual(chunks);
        });

        it('should handle chunks with undefined content', async () => {
            // Create chunks with undefined content
            const chunks: StreamChunk[] = [
                { isComplete: false },
                { isComplete: true }
            ];

            // Create stream
            const stream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of chunks) {
                        yield chunk;
                    }
                }
            };

            // Process the stream
            const resultChunks: StreamChunk[] = [];
            for await (const resultChunk of streamHistoryProcessor.processStream(stream)) {
                resultChunks.push(resultChunk);
            }

            // Verify that captureStreamResponse was called with empty content
            expect(mockHistoryManager.captureStreamResponse).toHaveBeenCalledTimes(1);
            expect(mockHistoryManager.captureStreamResponse).toHaveBeenCalledWith(
                '',
                true
            );

            // Verify that all chunks were returned unmodified
            expect(resultChunks.length).toBe(2);
            expect(resultChunks).toEqual(chunks);
        });

        it('should not call captureStreamResponse for non-complete chunks', async () => {
            // Create non-complete chunks
            const chunks: (StreamChunk & Partial<UniversalStreamResponse>)[] = [
                { content: 'This is ', role: 'assistant', isComplete: false },
                { content: 'a multi-chunk response', role: 'assistant', isComplete: false }
            ];

            // Create stream
            const stream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of chunks) {
                        yield chunk;
                    }
                }
            };

            // Process the stream
            const resultChunks: StreamChunk[] = [];
            for await (const resultChunk of streamHistoryProcessor.processStream(stream)) {
                resultChunks.push(resultChunk);
            }

            // Verify that captureStreamResponse was not called
            expect(mockHistoryManager.captureStreamResponse).not.toHaveBeenCalled();

            // Verify that all chunks were returned unmodified
            expect(resultChunks.length).toBe(2);
            expect(resultChunks).toEqual(chunks);
        });

        it('should handle empty streams', async () => {
            // Create an empty stream
            const chunks: StreamChunk[] = [];
            const stream = {
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of chunks) {
                        yield chunk;
                    }
                }
            };

            // Process the stream
            const resultChunks: StreamChunk[] = [];
            for await (const resultChunk of streamHistoryProcessor.processStream(stream)) {
                resultChunks.push(resultChunk);
            }

            // Verify that captureStreamResponse was not called
            expect(mockHistoryManager.captureStreamResponse).not.toHaveBeenCalled();

            // Verify that no chunks were returned
            expect(resultChunks.length).toBe(0);
        });

        it('should handle errors in the stream', async () => {
            // Create a stream that throws an error
            const stream = {
                [Symbol.asyncIterator]: async function* () {
                    yield { content: 'Initial content', isComplete: false };
                    throw new Error('Stream error');
                }
            };

            // Process the stream and catch the error
            const resultChunks: StreamChunk[] = [];
            let error: Error | null = null;

            try {
                for await (const resultChunk of streamHistoryProcessor.processStream(stream)) {
                    resultChunks.push(resultChunk);
                }
            } catch (e) {
                error = e as Error;
            }

            // Verify that an error was caught
            expect(error).not.toBeNull();
            expect(error?.message).toBe('Stream error');

            // Verify that captureStreamResponse was not called
            expect(mockHistoryManager.captureStreamResponse).not.toHaveBeenCalled();

            // Verify that only one chunk was processed before the error
            expect(resultChunks.length).toBe(1);
        });
    });
}); 