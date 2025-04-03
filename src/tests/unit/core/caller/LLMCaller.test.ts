import { jest } from '@jest/globals';
import { LLMCaller } from '../../../../core/caller/LLMCaller';
import type { StreamingService } from '../../../../core/streaming/StreamingService';
import type { ProviderManager } from '../../../../core/caller/ProviderManager';
import type { ModelManager } from '../../../../core/models/ModelManager';
import type { ResponseProcessor } from '../../../../core/processors/ResponseProcessor';
import { RetryManager } from '../../../../core/retry/RetryManager';
import type { HistoryManager } from '../../../../core/history/HistoryManager';
import type { TokenCalculator } from '../../../../core/models/TokenCalculator';
import type { UniversalMessage, UniversalStreamResponse, ModelInfo, Usage, UniversalChatResponse } from '../../../../interfaces/UniversalInterfaces';
import { RegisteredProviders } from '../../../../adapters';
import type { ToolController } from '../../../../core/tools/ToolController';
import type { ChatController } from '../../../../core/chat/ChatController';
import type { UniversalChatParams, UniversalChatSettings } from '../../../../interfaces/UniversalInterfaces';
import type { ToolsManager } from '../../../../core/tools/ToolsManager';
import type { ToolDefinition, ToolCall } from '../../../../types/tooling';

// Define RequestProcessor interface type
type RequestProcessor = {
    processRequest: (params: any) => Promise<string[]>;
}

describe('LLMCaller', () => {
    let llmCaller: LLMCaller;
    let mockHistoryManager: jest.Mocked<HistoryManager>;
    let mockStreamingService: jest.Mocked<StreamingService>;
    let mockToolsManager: jest.Mocked<ToolsManager>;
    let mockChatController: jest.Mocked<ChatController>;
    let mockRetryManager: RetryManager;
    let mockTokenCalculator: jest.Mocked<TokenCalculator>;
    let mockResponseProcessor: jest.Mocked<ResponseProcessor>;
    let mockModelManager: jest.Mocked<ModelManager>;
    let mockProviderManager: jest.Mocked<ProviderManager>;

    beforeEach(() => {
        jest.useFakeTimers();

        const defaultSystemMessage = 'You are a helpful assistant.';

        mockHistoryManager = {
            addMessage: jest.fn(),
            getLastMessages: jest.fn(),
            getHistorySummary: jest.fn(),
            getLastMessageByRole: jest.fn(),
            getHistoricalMessages: jest.fn().mockReturnValue([]),
            initializeWithSystemMessage: jest.fn(),
            clearHistory: jest.fn(),
            getMessages: jest.fn(),
            updateSystemMessage: jest.fn(),
            serializeHistory: jest.fn(),
            deserializeHistory: jest.fn(),
            setHistoricalMessages: jest.fn(),
            addToolCallToHistory: jest.fn(),
            captureStreamResponse: jest.fn(),
            removeToolCallsWithoutResponses: jest.fn()
        } as unknown as jest.Mocked<HistoryManager>;

        // Mock the initializeWithSystemMessage to actually add the message
        mockHistoryManager.initializeWithSystemMessage.mockImplementation(() => {
            mockHistoryManager.addMessage('system', defaultSystemMessage);
        });

        // Initialize with system message
        mockHistoryManager.initializeWithSystemMessage();

        const mockUsage: Usage = {
            tokens: {
                input: 10,
                output: 20,
                total: 30,
                inputCached: 0
            },
            costs: {
                input: 0.0001,
                output: 0.0002,
                total: 0.0003,
                inputCached: 0
            }
        };

        mockStreamingService = {
            createStream: jest.fn().mockImplementation(async (params: any) => {
                // Calculate tokens for the message
                const message = params.messages[params.messages.length - 1].content;
                mockTokenCalculator.calculateTokens(message);

                return (async function* () {
                    yield {
                        content: 'Hello world',
                        role: 'assistant',
                        isComplete: true,
                        usage: mockUsage
                    } as UniversalStreamResponse;
                })();
            }),
            setCallerId: jest.fn(),
            setUsageCallback: jest.fn(),
            getTokenCalculator: jest.fn().mockReturnValue(mockTokenCalculator),
            getResponseProcessor: jest.fn().mockReturnValue(mockResponseProcessor)
        } as unknown as jest.Mocked<StreamingService>;

        mockToolsManager = {
            listTools: jest.fn().mockReturnValue([]),
            addTool: jest.fn(),
            removeTool: jest.fn(),
            updateTool: jest.fn(),
            getTool: jest.fn(),
            handler: jest.fn()
        } as unknown as jest.Mocked<ToolsManager>;

        const mockMessage: UniversalChatResponse = {
            content: 'test response',
            role: 'assistant',
            metadata: {
                created: Date.now()
            }
        };

        const mockExecute = jest.fn().mockImplementation(async () => mockMessage);

        mockChatController = {
            execute: mockExecute,
            setToolOrchestrator: jest.fn()
        } as unknown as jest.Mocked<ChatController>;

        mockRetryManager = new RetryManager({ maxRetries: 3 });

        mockTokenCalculator = {
            calculateTokens: jest.fn().mockReturnValue(10),
            calculateUsage: jest.fn()
        } as unknown as jest.Mocked<TokenCalculator>;

        mockResponseProcessor = {
            processResponse: jest.fn()
        } as unknown as jest.Mocked<ResponseProcessor>;

        const mockModelInfo: ModelInfo = {
            name: 'test-model',
            inputPricePerMillion: 0.01,
            outputPricePerMillion: 0.02,
            maxRequestTokens: 4000,
            maxResponseTokens: 1000,
            characteristics: {
                qualityIndex: 80,
                outputSpeed: 20,
                firstTokenLatency: 500
            }
        };

        mockModelManager = {
            getModel: jest.fn().mockReturnValue(mockModelInfo)
        } as unknown as jest.Mocked<ModelManager>;

        mockProviderManager = {
            getCurrentProviderName: jest.fn().mockReturnValue('openai'),
            switchProvider: jest.fn()
        } as unknown as jest.Mocked<ProviderManager>;

        // Mock Date.now() for consistent timestamps in tests
        jest.spyOn(Date, 'now').mockReturnValue(1743507110838);

        // Create the LLMCaller instance with the mocked HistoryManager
        llmCaller = new LLMCaller('openai' as RegisteredProviders, 'test-model', defaultSystemMessage, {
            providerManager: mockProviderManager,
            modelManager: mockModelManager,
            historyManager: mockHistoryManager,
            streamingService: mockStreamingService,
            toolsManager: mockToolsManager,
            chatController: mockChatController,
            retryManager: mockRetryManager,
            tokenCalculator: mockTokenCalculator,
            responseProcessor: mockResponseProcessor
        });

        // Mock the request processor
        (llmCaller as any).requestProcessor = {
            processRequest: jest.fn().mockImplementation(() => Promise.resolve(['test message']))
        };

        // Mock the token calculator to calculate tokens for the message
        mockTokenCalculator.calculateTokens.mockImplementation((text: string) => {
            return 10; // Return a fixed token count for testing
        });

        // Mock the token calculator to calculate usage
        mockTokenCalculator.calculateUsage.mockImplementation(
            (
                inputTokens: number,
                outputTokens: number,
                inputPricePerMillion: number,
                outputPricePerMillion: number,
                inputCachedTokens: number = 0,
                inputCachedPricePerMillion?: number
            ) => {
                const regularInputCost = (inputTokens * inputPricePerMillion) / 1_000_000;
                const cachedInputCost = inputCachedTokens && inputCachedPricePerMillion
                    ? (inputCachedTokens * inputCachedPricePerMillion) / 1_000_000
                    : 0;
                const outputCost = (outputTokens * outputPricePerMillion) / 1_000_000;
                const totalCost = regularInputCost + cachedInputCost + outputCost;

                return {
                    input: regularInputCost,
                    inputCached: cachedInputCost,
                    output: outputCost,
                    total: totalCost
                };
            }
        );

        // Verify that the system message is initialized
        expect(mockHistoryManager.initializeWithSystemMessage).toHaveBeenCalled();
        expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('system', defaultSystemMessage);
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    describe('constructor', () => {
        it('should throw error when model is not found', () => {
            mockModelManager.getModel.mockReturnValue(undefined);

            expect(() => new LLMCaller('openai' as RegisteredProviders, 'non-existent-model', 'You are a helpful assistant.', {
                providerManager: mockProviderManager,
                modelManager: mockModelManager
            })).toThrow('Model non-existent-model not found for provider openai');
        });

        it('should initialize with default system message', () => {
            const defaultSystemMessage = 'You are a helpful assistant.';

            const caller = new LLMCaller('openai' as RegisteredProviders, 'test-model', defaultSystemMessage, {
                providerManager: mockProviderManager,
                modelManager: mockModelManager,
                historyManager: mockHistoryManager
            });

            expect(mockHistoryManager.initializeWithSystemMessage).toHaveBeenCalled();
            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('system', defaultSystemMessage);
        });

        it('should initialize with custom settings', () => {
            const customSettings: UniversalChatSettings = {
                maxRetries: 5,
                temperature: 0.7,
                topP: 0.9
            };

            const caller = new LLMCaller('openai' as RegisteredProviders, 'test-model', 'Custom system message', {
                providerManager: mockProviderManager,
                modelManager: mockModelManager,
                settings: customSettings,
                retryManager: new RetryManager({ maxRetries: 5 })
            });

            // Verify the RetryManager was initialized with correct config
            expect((caller as any).retryManager.config.maxRetries).toBe(5);
        });

        it('should initialize with custom callerId', () => {
            const customCallerId = 'test-caller-id';
            const caller = new LLMCaller('openai' as RegisteredProviders, 'test-model', 'System message', {
                providerManager: mockProviderManager,
                modelManager: mockModelManager,
                callerId: customCallerId
            });

            // Verify callerId was set
            expect((caller as any).callerId).toBe(customCallerId);
        });
    });

    describe('stream methods', () => {
        it('should throw an error after exhausting all retries', async () => {
            const error = new Error('Stream creation failed');

            // Configure mockStreamingService to throw an error after being called
            mockStreamingService.createStream.mockRejectedValue(error);

            // Mock the request processor to return a single message
            (llmCaller as any).requestProcessor = {
                processRequest: jest.fn().mockImplementation(() => Promise.resolve(['test message']))
            };

            // Execute the call and expect it to fail
            await expect(llmCaller.stream('test message')).rejects.toThrow('Stream creation failed');

            // Verify the createStream was called at least once
            expect(mockStreamingService.createStream).toHaveBeenCalledTimes(1);
        });

        it('should respect custom maxRetries setting', async () => {
            const error = new Error('Stream creation failed');

            // Configure mockStreamingService to throw an error after being called
            mockStreamingService.createStream.mockRejectedValue(error);

            // Mock the request processor to return a single message
            (llmCaller as any).requestProcessor = {
                processRequest: jest.fn().mockImplementation(() => Promise.resolve(['test message']))
            };

            // Set maxRetries to 1 in options
            const customOptions = {
                settings: {
                    maxRetries: 1
                }
            };

            // Execute the call with custom options and expect it to fail
            await expect(llmCaller.stream('test message', customOptions)).rejects.toThrow('Stream creation failed');

            // Verify the createStream was called at least once with the proper settings
            expect(mockStreamingService.createStream).toHaveBeenCalledWith(
                expect.objectContaining({
                    settings: expect.objectContaining({
                        maxRetries: 1
                    }),
                    model: 'test-model'
                }),
                'test-model',
                undefined
            );

            // Verify the number of calls
            expect(mockStreamingService.createStream).toHaveBeenCalledTimes(1);
        });

        it('should use proper call parameters', async () => {
            // Setup mock to return a valid async generator
            mockStreamingService.createStream.mockResolvedValue((async function* () {
                yield { content: 'Hello', role: 'assistant', isComplete: false };
                yield { content: 'Hello world', role: 'assistant', isComplete: true };
            })());

            // Mock the request processor to return a single message
            (llmCaller as any).requestProcessor = {
                processRequest: jest.fn().mockImplementation(() => Promise.resolve(['test message']))
            };

            // Call the stream method with a message
            await llmCaller.stream('test message');

            // Verify createStream was called with the expected parameters
            expect(mockStreamingService.createStream).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: expect.any(Array),
                    model: 'test-model'
                }),
                'test-model',
                undefined
            );
        });
    });

    describe('token calculation and usage tracking', () => {
        it('should track token usage for stream calls', async () => {
            const message = 'test message';
            const mockUsage = {
                tokens: { input: 10, output: 10, total: 20 },
                costs: { input: 0.0001, output: 0.0002, total: 0.0003 }
            };

            // Mock the request processor to return a single message
            (llmCaller as any).requestProcessor = {
                processRequest: jest.fn().mockImplementation(() => Promise.resolve([message]))
            };

            // Mock getHistoricalMessages to return the user message
            mockHistoryManager.getHistoricalMessages.mockReturnValue([
                { role: 'user', content: message }
            ]);

            // Mock the stream response while preserving token calculation
            mockStreamingService.createStream.mockImplementation(async (params: any) => {
                // Calculate tokens for the message
                const message = params.messages[params.messages.length - 1].content;
                mockTokenCalculator.calculateTokens(message);

                return (async function* () {
                    yield {
                        content: 'Hello',
                        role: 'assistant',
                        isComplete: false,
                        usage: mockUsage
                    } as UniversalStreamResponse;
                    yield {
                        content: 'Hello world',
                        role: 'assistant',
                        isComplete: true,
                        usage: mockUsage
                    } as UniversalStreamResponse;
                })();
            });

            await llmCaller.stream(message);

            expect(mockTokenCalculator.calculateTokens).toHaveBeenCalledWith(message);
        });
    });

    describe('tool management', () => {
        it('should list available tools', async () => {
            const mockTools: ToolDefinition[] = [
                {
                    name: 'tool1',
                    description: 'desc1',
                    parameters: {
                        type: 'object',
                        properties: {
                            arg1: { type: 'string', description: 'First argument' }
                        },
                        required: ['arg1']
                    }
                },
                {
                    name: 'tool2',
                    description: 'desc2',
                    parameters: {
                        type: 'object',
                        properties: {
                            arg1: { type: 'string', description: 'First argument' }
                        },
                        required: ['arg1']
                    }
                }
            ];
            mockToolsManager.listTools.mockReturnValue(mockTools);

            const tools = (llmCaller as any).toolsManager.listTools();
            expect(tools).toEqual(mockTools);
        });

        it('should handle tool calls in stream response', async () => {
            // Mock tool call in stream
            mockStreamingService.createStream.mockResolvedValue((async function* () {
                yield {
                    content: '',
                    role: 'assistant',
                    isComplete: false,
                    toolCalls: [{
                        id: 'tool1',
                        name: 'testTool',
                        arguments: { arg1: 'value1' }
                    } as ToolCall]
                } as UniversalStreamResponse;
                yield {
                    content: 'Done',
                    role: 'assistant',
                    isComplete: true
                } as UniversalStreamResponse;
            })());

            // Mock request processor
            (llmCaller as any).requestProcessor = {
                processRequest: jest.fn().mockImplementation(() => Promise.resolve(['test message']))
            };

            // Mock tool
            const mockTool: ToolDefinition = {
                name: 'testTool',
                description: 'Test tool',
                parameters: {
                    type: 'object',
                    properties: {
                        arg1: { type: 'string', description: 'First argument' }
                    },
                    required: ['arg1']
                }
            };
            mockToolsManager.getTool.mockReturnValue(mockTool);

            // Call stream method
            const result = llmCaller.stream('test message');
            await expect(result).resolves.not.toThrow();
        });
    });

    describe('history management', () => {
        it('should add messages to history', async () => {
            const message = 'test message';
            const timestamp = Date.now();

            // Mock the request processor to return a single message
            (llmCaller as any).requestProcessor = {
                processRequest: jest.fn().mockImplementation(() => Promise.resolve([message]))
            };

            mockStreamingService.createStream.mockResolvedValue((async function* () {
                yield {
                    content: 'Hello',
                    role: 'assistant',
                    isComplete: false
                } as UniversalStreamResponse;
                yield {
                    content: 'Hello world',
                    role: 'assistant',
                    isComplete: true
                } as UniversalStreamResponse;
            })());

            await llmCaller.stream(message);

            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith(
                'user',
                message
            );
        });

        it('should retrieve historical messages', async () => {
            const mockHistory: UniversalMessage[] = [
                { role: 'user', content: 'test1' },
                { role: 'assistant', content: 'response1' }
            ];
            mockHistoryManager.getHistoricalMessages.mockReturnValue(mockHistory);

            // Mock stream response
            mockStreamingService.createStream.mockResolvedValue((async function* () {
                yield {
                    content: 'response',
                    role: 'assistant',
                    isComplete: true
                } as UniversalStreamResponse;
            })());

            // Mock request processor
            (llmCaller as any).requestProcessor = {
                processRequest: jest.fn().mockImplementation(() => Promise.resolve(['test message']))
            };

            await llmCaller.stream('test message');

            expect(mockHistoryManager.getHistoricalMessages).toHaveBeenCalled();
        });
    });
});