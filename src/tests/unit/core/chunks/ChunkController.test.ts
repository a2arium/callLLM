import { ChunkController, ChunkIterationLimitError } from '../../../../core/chunks/ChunkController';
import { TokenCalculator } from '../../../../core/models/TokenCalculator';
import { ChatController } from '../../../../core/chat/ChatController';
import { StreamController } from '../../../../core/streaming/StreamController';
import { HistoryManager } from '../../../../core/history/HistoryManager';
import type { UniversalChatResponse, UniversalStreamResponse, UniversalMessage } from '../../../../interfaces/UniversalInterfaces';
import { FinishReason } from '../../../../interfaces/UniversalInterfaces';

jest.mock('../../../../core/models/TokenCalculator');
jest.mock('../../../../core/chat/ChatController');
jest.mock('../../../../core/streaming/StreamController');
jest.mock('../../../../core/history/HistoryManager');
jest.mock('../../../../core/processors/DataSplitter');

describe('ChunkController', () => {
    let chunkController: ChunkController;
    let mockTokenCalculator: jest.Mocked<TokenCalculator>;
    let mockChatController: jest.Mocked<ChatController>;
    let mockStreamController: jest.Mocked<StreamController>;
    let mockHistoryManager: jest.Mocked<HistoryManager>;

    beforeEach(() => {
        // Clear mocks
        jest.clearAllMocks();

        // Setup mocks
        mockTokenCalculator = {
            calculateTokens: jest.fn(),
            getTokenCount: jest.fn()
        } as unknown as jest.Mocked<TokenCalculator>;

        mockChatController = {
            execute: jest.fn()
        } as unknown as jest.Mocked<ChatController>;

        mockStreamController = {
            createStream: jest.fn()
        } as unknown as jest.Mocked<StreamController>;

        mockHistoryManager = {
            addMessage: jest.fn(),
            getHistoricalMessages: jest.fn(),
            setHistoricalMessages: jest.fn(),
            clearHistory: jest.fn()
        } as unknown as jest.Mocked<HistoryManager>;

        // Initialize controller with mocks
        chunkController = new ChunkController(
            mockTokenCalculator,
            mockChatController,
            mockStreamController,
            mockHistoryManager,
            5 // Lower max iterations for testing
        );
    });

    describe('constructor', () => {
        it('should initialize with default maxIterations', () => {
            const controller = new ChunkController(
                mockTokenCalculator,
                mockChatController,
                mockStreamController,
                mockHistoryManager
            );

            // Default is 20, but we can only test this indirectly
            expect(controller).toBeDefined();
        });

        it('should initialize with custom maxIterations', () => {
            const customMaxIterations = 10;
            const controller = new ChunkController(
                mockTokenCalculator,
                mockChatController,
                mockStreamController,
                mockHistoryManager,
                customMaxIterations
            );

            expect(controller).toBeDefined();
        });
    });

    describe('processChunks', () => {
        it('should process chunks and return responses', async () => {
            const messages = ['chunk1', 'chunk2'];
            const params = {
                model: 'model-id',
                systemMessage: 'system message'
            };

            const mockResponse: UniversalChatResponse = {
                content: 'Mock response',
                role: 'assistant',
                metadata: {
                    finishReason: FinishReason.STOP
                }
            };

            mockChatController.execute.mockResolvedValue(mockResponse);

            const results = await chunkController.processChunks(messages, params);

            expect(results).toHaveLength(2);
            expect(results[0]).toEqual(mockResponse);
            expect(results[1]).toEqual(mockResponse);
            expect(mockHistoryManager.addMessage).toHaveBeenCalledTimes(2);
            expect(mockChatController.execute).toHaveBeenCalledTimes(2);
            expect(mockChatController.execute).toHaveBeenCalledWith({
                model: params.model,
                systemMessage: params.systemMessage,
                settings: undefined
            });
        });

        it('should pass historical messages and settings to the chat controller', async () => {
            const messages = ['test message'];
            const historicalMessages: UniversalMessage[] = [
                { role: 'user', content: 'previous message' }
            ];
            const settings = { temperature: 0.7 };
            const params = {
                model: 'model-id',
                systemMessage: 'system message',
                historicalMessages,
                settings
            };

            mockChatController.execute.mockResolvedValue({
                content: 'response',
                role: 'assistant',
                metadata: {
                    finishReason: FinishReason.STOP
                }
            });

            await chunkController.processChunks(messages, params);

            expect(mockChatController.execute).toHaveBeenCalledWith({
                model: params.model,
                systemMessage: params.systemMessage,
                settings
            });
        });

        it('should throw ChunkIterationLimitError when max iterations exceeded', async () => {
            // Create more messages than the maxIterations limit (5)
            const messages = ['chunk1', 'chunk2', 'chunk3', 'chunk4', 'chunk5', 'chunk6'];
            const params = {
                model: 'model-id',
                systemMessage: 'system message'
            };

            mockChatController.execute.mockResolvedValue({
                content: 'response',
                role: 'assistant',
                metadata: {
                    finishReason: FinishReason.STOP
                }
            });

            await expect(chunkController.processChunks(messages, params))
                .rejects.toThrow(ChunkIterationLimitError);

            // Should only process up to max iterations (5)
            expect(mockHistoryManager.addMessage).toHaveBeenCalledTimes(5);
            expect(mockChatController.execute).toHaveBeenCalledTimes(5);
        });

        it('should handle empty message array', async () => {
            const messages: string[] = [];
            const params = {
                model: 'model-id',
                systemMessage: 'system message'
            };

            const results = await chunkController.processChunks(messages, params);

            expect(results).toEqual([]);
            expect(mockHistoryManager.addMessage).not.toHaveBeenCalled();
            expect(mockChatController.execute).not.toHaveBeenCalled();
        });
    });

    describe('streamChunks', () => {
        it('should stream chunks and yield responses', async () => {
            const messages = ['chunk1', 'chunk2'];
            const params = {
                model: 'model-id',
                systemMessage: 'system message'
            };

            const mockStreamChunks: UniversalStreamResponse[] = [
                { content: 'chunk ', isComplete: false, role: 'assistant' },
                { content: 'response', isComplete: true, role: 'assistant' }
            ];

            mockStreamController.createStream.mockResolvedValue({
                [Symbol.asyncIterator]: async function* () {
                    for (const chunk of mockStreamChunks) {
                        yield chunk;
                    }
                }
            });

            const streamGenerator = chunkController.streamChunks(messages, params);
            const results: UniversalStreamResponse[] = [];

            for await (const chunk of streamGenerator) {
                results.push(chunk);
            }

            expect(results).toHaveLength(4); // 2 chunks per message, 2 messages
            expect(results[0].content).toBe('chunk ');
            expect(results[0].isComplete).toBe(false);
            expect(results[1].content).toBe('response');
            expect(results[1].isComplete).toBe(false); // Not the last message
            expect(results[2].content).toBe('chunk ');
            expect(results[2].isComplete).toBe(false);
            expect(results[3].content).toBe('response');
            expect(results[3].isComplete).toBe(true); // Last chunk of last message

            expect(mockStreamController.createStream).toHaveBeenCalledTimes(2);
            expect(mockStreamController.createStream).toHaveBeenCalledWith(
                params.model,
                expect.objectContaining({
                    messages: expect.arrayContaining([
                        { role: 'system', content: params.systemMessage },
                        { role: 'user', content: expect.any(String) }
                    ])
                }),
                0
            );
        });

        it('should pass historical messages to the stream controller', async () => {
            const messages = ['test message'];
            const historicalMessages: UniversalMessage[] = [
                { role: 'user', content: 'previous message' }
            ];
            const params = {
                model: 'model-id',
                systemMessage: 'system message',
                historicalMessages
            };

            mockStreamController.createStream.mockResolvedValue({
                [Symbol.asyncIterator]: async function* () {
                    yield { content: 'response', isComplete: true, role: 'assistant' };
                }
            });

            const streamGenerator = chunkController.streamChunks(messages, params);
            for await (const _ of streamGenerator) {
                // Just consume the generator
            }

            expect(mockStreamController.createStream).toHaveBeenCalledWith(
                params.model,
                expect.objectContaining({
                    messages: expect.arrayContaining([
                        { role: 'system', content: params.systemMessage },
                        historicalMessages[0],
                        { role: 'user', content: messages[0] }
                    ])
                }),
                0
            );
        });

        it('should throw ChunkIterationLimitError when max iterations exceeded', async () => {
            // Create more messages than the maxIterations limit (5)
            const messages = ['chunk1', 'chunk2', 'chunk3', 'chunk4', 'chunk5', 'chunk6'];
            const params = {
                model: 'model-id',
                systemMessage: 'system message'
            };

            mockStreamController.createStream.mockResolvedValue({
                [Symbol.asyncIterator]: async function* () {
                    yield { content: 'response', isComplete: true, role: 'assistant' };
                }
            });

            const streamGenerator = chunkController.streamChunks(messages, params);

            // Function to consume generator until error
            const consumeUntilError = async () => {
                for await (const _ of streamGenerator) {
                    // Just consume the generator
                }
            };

            await expect(consumeUntilError()).rejects.toThrow(ChunkIterationLimitError);
            expect(mockStreamController.createStream).toHaveBeenCalledTimes(5);
        });
    });

    describe('resetIterationCount', () => {
        it('should reset the iteration count', async () => {
            // First, process some chunks to increase the counter
            const messages = ['chunk1', 'chunk2'];
            const params = {
                model: 'model-id',
                systemMessage: 'system message'
            };

            mockChatController.execute.mockResolvedValue({
                content: 'response',
                role: 'assistant',
                metadata: {
                    finishReason: FinishReason.STOP
                }
            });

            await chunkController.processChunks(messages, params);

            // Now process more chunks - this will start with iteration count of 2
            const moreMessages = ['chunk3', 'chunk4'];

            // Reset iteration count explicitly
            chunkController.resetIterationCount();

            // This should work because we reset the iteration count
            await chunkController.processChunks(moreMessages, params);

            // Should have processed all 4 chunks (2 in first call, 2 in second call)
            expect(mockHistoryManager.addMessage).toHaveBeenCalledTimes(4);
            expect(mockChatController.execute).toHaveBeenCalledTimes(4);
        });
    });

    describe('ChunkIterationLimitError', () => {
        it('should create error with correct message', () => {
            const maxIterations = 10;
            const error = new ChunkIterationLimitError(maxIterations);

            expect(error.message).toBe(`Chunk iteration limit of ${maxIterations} exceeded`);
            expect(error.name).toBe('ChunkIterationLimitError');
        });
    });
}); 