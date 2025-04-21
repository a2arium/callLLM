import { LLMCaller } from '../../../../core/caller/LLMCaller';
import type { StreamingService } from '../../../../core/streaming/StreamingService';
import type { ProviderManager } from '../../../../core/caller/ProviderManager';
import { ModelManager } from '../../../../core/models/ModelManager';
import type { ResponseProcessor } from '../../../../core/processors/ResponseProcessor';
import { RetryManager } from '../../../../core/retry/RetryManager';
import type { HistoryManager } from '../../../../core/history/HistoryManager';
import type { TokenCalculator } from '../../../../core/models/TokenCalculator';
import type { UniversalMessage, UniversalStreamResponse, ModelInfo, Usage, UniversalChatResponse, HistoryMode, JSONSchemaDefinition } from '../../../../interfaces/UniversalInterfaces';
import { RegisteredProviders } from '../../../../adapters';
import type { ToolsManager } from '../../../../core/tools/ToolsManager';
import type { ChatController } from '../../../../core/chat/ChatController';
import { UsageTracker } from '../../../../core/telemetry/UsageTracker';
import { RequestProcessor } from '../../../../core/processors/RequestProcessor';
import type { ToolDefinition } from '../../../../types/tooling';

describe('LLMCaller Settings & Configuration', () => {
    let llmCaller: LLMCaller;
    let mockHistoryManager: jest.Mocked<HistoryManager>;
    let mockStreamingService: jest.Mocked<StreamingService>;
    let mockToolsManager: jest.Mocked<ToolsManager>;
    let mockChatController: jest.Mocked<ChatController>;
    let mockRetryManager: jest.SpyInstance;
    let mockTokenCalculator: jest.Mocked<TokenCalculator>;
    let mockResponseProcessor: jest.Mocked<ResponseProcessor>;
    let mockModelManager: jest.Mocked<ModelManager>;
    let mockProviderManager: jest.Mocked<ProviderManager>;
    let mockRequestProcessor: jest.Mocked<RequestProcessor>;

    const mockUsageCallback = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mocks
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

        const mockUsage: Usage = {
            tokens: {
                input: { total: 10, cached: 0 },
                output: { total: 20, reasoning: 0 },
                total: 30,
            },
            costs: {
                input: { total: 0.0001, cached: 0 },
                output: { total: 0.0002, reasoning: 0 },
                total: 0.0003,
            },
        };

        const mockUsageEmpty: Usage = {
            tokens: {
                input: { total: 0, cached: 0 },
                output: { total: 0, reasoning: 0 },
                total: 0,
            },
            costs: {
                input: { total: 0, cached: 0 },
                output: { total: 0, reasoning: 0 },
                total: 0,
            },
        };

        mockStreamingService = {
            createStream: jest.fn().mockImplementation(async () => {
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
            getResponseProcessor: jest.fn().mockReturnValue(mockResponseProcessor),
            setToolOrchestrator: jest.fn()
        } as unknown as jest.Mocked<StreamingService>;

        mockToolsManager = {
            listTools: jest.fn().mockReturnValue([]),
            addTool: jest.fn(),
            removeTool: jest.fn(),
            updateTool: jest.fn(),
            getTool: jest.fn(),
            handler: jest.fn(),
            addTools: jest.fn()
        } as unknown as jest.Mocked<ToolsManager>;

        const mockMessage: UniversalChatResponse = {
            content: 'test response',
            role: 'assistant',
            metadata: {
                created: Date.now()
            }
        };

        mockChatController = {
            execute: jest.fn().mockResolvedValue(mockMessage),
            setToolOrchestrator: jest.fn()
        } as unknown as jest.Mocked<ChatController>;

        // Spy on RetryManager constructor instead of mocking the instance
        mockRetryManager = jest.spyOn(RetryManager.prototype, 'executeWithRetry')
            .mockImplementation((fn) => fn());

        mockTokenCalculator = {
            calculateTokens: jest.fn().mockReturnValue(10),
            calculateUsage: jest.fn(),
            calculateTotalTokens: jest.fn().mockReturnValue(100)
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
            },
            capabilities: {
                streaming: true,
                toolCalls: true,
                parallelToolCalls: true,
                batchProcessing: true,
                input: {
                    text: true
                },
                output: {
                    text: {
                        textOutputFormats: ['text', 'json']
                    }
                }
            }
        };

        mockModelManager = {
            getModel: jest.fn().mockReturnValue(mockModelInfo),
            getAvailableModels: jest.fn().mockReturnValue([mockModelInfo]),
            addModel: jest.fn(),
            updateModel: jest.fn()
        } as unknown as jest.Mocked<ModelManager>;

        mockProviderManager = {
            getCurrentProviderName: jest.fn().mockReturnValue('openai'),
            switchProvider: jest.fn(),
            getProvider: jest.fn()
        } as unknown as jest.Mocked<ProviderManager>;

        // Mock UsageTracker directly instead of spying
        jest.mock('../../../../core/telemetry/UsageTracker', () => ({
            UsageTracker: jest.fn().mockImplementation(() => ({
                trackTokens: jest.fn()
            }))
        }));

        mockRequestProcessor = {
            processRequest: jest.fn().mockResolvedValue(['test message'])
        } as unknown as jest.Mocked<RequestProcessor>;

        // Create the LLMCaller instance
        llmCaller = new LLMCaller('openai' as RegisteredProviders, 'test-model', 'You are a helpful assistant', {
            providerManager: mockProviderManager,
            modelManager: mockModelManager,
            historyManager: mockHistoryManager,
            streamingService: mockStreamingService,
            toolsManager: mockToolsManager,
            chatController: mockChatController,
            retryManager: new RetryManager({ maxRetries: 3 }),
            tokenCalculator: mockTokenCalculator,
            responseProcessor: mockResponseProcessor,
            usageCallback: mockUsageCallback
        });

        // Set the request processor directly
        (llmCaller as any).requestProcessor = mockRequestProcessor;
    });

    describe('setCallerId', () => {
        it('should update callerId and reinitialize controllers', () => {
            // Spy on reinitializeControllers
            const spy = jest.spyOn(llmCaller as any, 'reinitializeControllers');

            // Call the method
            llmCaller.setCallerId('new-caller-id');

            // Verify callerId was updated
            expect((llmCaller as any).callerId).toBe('new-caller-id');

            // Verify controllers were reinitialized
            expect(spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('setUsageCallback', () => {
        it('should update usageCallback and reinitialize controllers', () => {
            // Spy on reinitializeControllers
            const spy = jest.spyOn(llmCaller as any, 'reinitializeControllers');

            // Create a new callback
            const newCallback = jest.fn();

            // Call the method
            llmCaller.setUsageCallback(newCallback);

            // Verify usageCallback was updated
            expect((llmCaller as any).usageCallback).toBe(newCallback);

            // Verify controllers were reinitialized
            expect(spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('updateSettings', () => {
        it('should update settings without reinitializing controllers when maxRetries is unchanged', () => {
            // Spy on reinitializeControllers
            const spy = jest.spyOn(llmCaller as any, 'reinitializeControllers');

            // Call the method with settings that don't change maxRetries
            llmCaller.updateSettings({
                temperature: 0.5,
            });

            // Verify settings were updated
            expect((llmCaller as any).initialSettings).toEqual({
                temperature: 0.5,
            });

            // Verify controllers were NOT reinitialized
            expect(spy).not.toHaveBeenCalled();
        });

        it('should update settings and reinitialize controllers when maxRetries changes', () => {
            // Spy on reinitializeControllers
            const spy = jest.spyOn(llmCaller as any, 'reinitializeControllers');

            // Call the method with settings that change maxRetries
            llmCaller.updateSettings({
                maxRetries: 5,
                temperature: 0.7
            });

            // Verify settings were updated
            expect((llmCaller as any).initialSettings).toEqual({
                maxRetries: 5,
                temperature: 0.7
            });

            // Verify controllers were reinitialized
            expect(spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('stream method', () => {
        it('should stream responses with JSON mode when model supports it', async () => {
            // Setup
            const mockJsonSchema = {
                schema: {} as JSONSchemaDefinition
            };

            // Mock the stream response
            const mockStreamResponse = (async function* () {
                yield {
                    content: '{"name":"John","age":30}',
                    role: 'assistant',
                    isComplete: true
                } as UniversalStreamResponse;
            })();
            mockStreamingService.createStream.mockResolvedValue(mockStreamResponse);

            // Call stream with JSON schema
            const stream = await llmCaller.stream('Get user info', {
                jsonSchema: mockJsonSchema
            });

            // Collect all chunks
            const results: UniversalStreamResponse[] = [];
            for await (const chunk of stream) {
                results.push(chunk);
            }

            // Verify
            expect(mockStreamingService.createStream).toHaveBeenCalledWith(
                expect.objectContaining({
                    jsonSchema: mockJsonSchema,
                    responseFormat: 'json'
                }),
                'test-model',
                undefined
            );

            // Verify the results
            expect(results.length).toBe(1);
            expect(results[0].content).toBe('{"name":"John","age":30}');
        });

        it('should use ChunkController when message is split into multiple chunks', async () => {
            // Setup
            mockRequestProcessor.processRequest.mockResolvedValue(['chunk1', 'chunk2']);

            // Spy on ChunkController.processChunks
            const mockProcessChunks = jest.fn().mockResolvedValue([
                { content: 'Response 1', role: 'assistant' },
                { content: 'Response 2', role: 'assistant' }
            ]);
            (llmCaller as any).chunkController = {
                processChunks: mockProcessChunks
            };

            // Call stream with a message that gets split
            const stream = await llmCaller.stream('Complex message that needs chunking');

            // Collect all chunks
            const results: UniversalStreamResponse[] = [];
            for await (const chunk of stream) {
                results.push(chunk);
            }

            // Verify ChunkController was used
            expect(mockProcessChunks).toHaveBeenCalledTimes(1);

            // Verify multiple responses were returned
            expect(results.length).toBe(2);
            expect(results[0].content).toBe('Response 1');
            expect(results[1].content).toBe('Response 2');
            expect(results[0].isComplete).toBe(false);
            expect(results[1].isComplete).toBe(true);
        });

        it('should reset history when using stateless history mode', async () => {
            // Set up spy on historyManager.initializeWithSystemMessage
            const initializeSpy = jest.spyOn(mockHistoryManager, 'initializeWithSystemMessage');

            // Mock the stream response
            const mockStreamResponse = (async function* () {
                yield {
                    content: 'Stateless response',
                    role: 'assistant',
                    isComplete: true
                } as UniversalStreamResponse;
            })();
            mockStreamingService.createStream.mockResolvedValue(mockStreamResponse);

            // Call stream with stateless mode
            const stream = llmCaller.stream('Test message', {
                historyMode: 'stateless' as HistoryMode
            });

            // Consume the stream to completion
            for await (const chunk of await stream) {
                // Just consume the chunks
            }

            // Verify history was initialized with system message
            expect(initializeSpy).toHaveBeenCalled();
        });
    });

    describe('setModel', () => {
        it('should update the model without provider change', () => {
            // Setup
            const initialModel = (llmCaller as any).model;
            const newModelName = 'gpt-4';
            mockModelManager.getModel.mockReturnValue({
                name: newModelName,
                inputPricePerMillion: 0.01,
                outputPricePerMillion: 0.02,
                maxRequestTokens: 4000,
                maxResponseTokens: 1000,
                characteristics: {
                    qualityIndex: 90,
                    outputSpeed: 30,
                    firstTokenLatency: 300
                },
                capabilities: {
                    streaming: true,
                    toolCalls: true,
                    parallelToolCalls: true,
                    batchProcessing: true,
                    input: {
                        text: true
                    },
                    output: {
                        text: {
                            textOutputFormats: ['text']
                        }
                    }
                }
            } as ModelInfo);

            // Execute
            llmCaller.setModel({ nameOrAlias: newModelName });

            // Verify
            expect((llmCaller as any).model).toBe(newModelName);
            expect(mockProviderManager.switchProvider).not.toHaveBeenCalled();
            expect(mockModelManager.getModel).toHaveBeenCalledWith(newModelName);
        });

        it('should update model and provider with provider change', () => {
            // Setup
            const reinitSpy = jest.spyOn(llmCaller as any, 'reinitializeControllers');
            const newModelName = 'gemini-pro';
            const newProvider = 'openai' as RegisteredProviders;
            const newApiKey = 'new-api-key';

            // Create a new ModelManager instance for this test
            const origModelManagerConstructor = (ModelManager as any).constructor;
            jest.spyOn(ModelManager.prototype, 'getModel').mockReturnValue({
                name: newModelName,
                inputPricePerMillion: 0.01,
                outputPricePerMillion: 0.02,
                maxRequestTokens: 4000,
                maxResponseTokens: 1000,
                characteristics: {
                    qualityIndex: 95,
                    outputSpeed: 25,
                    firstTokenLatency: 350
                }
            } as ModelInfo);

            // Execute
            llmCaller.setModel({
                nameOrAlias: newModelName,
                provider: newProvider,
                apiKey: newApiKey
            });

            // Verify
            expect((llmCaller as any).model).toBe(newModelName);
            expect(mockProviderManager.switchProvider).toHaveBeenCalledWith(newProvider, newApiKey);
            expect(reinitSpy).toHaveBeenCalled();
        });

        it('should throw an error when model is not found', () => {
            // Setup
            const nonExistentModel = 'non-existent-model';
            mockModelManager.getModel.mockReturnValue(undefined);

            // Execute & Verify
            expect(() => {
                llmCaller.setModel({ nameOrAlias: nonExistentModel });
            }).toThrow(`Model ${nonExistentModel} not found in provider openai`);
        });
    });

    describe('JSON schema handling', () => {
        it('should handle JSON schema in stream calls', async () => {
            // Setup
            const jsonSchema = {
                schema: {} as JSONSchemaDefinition
            };

            // Mock the stream response with JSON content
            const mockStreamResponse = (async function* () {
                yield {
                    content: '{"name":"John","age":30}',
                    role: 'assistant',
                    contentObject: { name: 'John', age: 30 },
                    isComplete: true
                } as UniversalStreamResponse;
            })();
            mockStreamingService.createStream.mockResolvedValue(mockStreamResponse);

            // Call stream with JSON schema
            const stream = await llmCaller.stream('Get user info', {
                jsonSchema: jsonSchema
            });

            // Collect all chunks
            const results: UniversalStreamResponse[] = [];
            for await (const chunk of stream) {
                results.push(chunk);
            }

            // Verify the results include the JSON content and object
            expect(results.length).toBe(1);
            expect(results[0].content).toBe('{"name":"John","age":30}');
            expect(results[0].contentObject).toEqual({ name: 'John', age: 30 });

            // Verify createStream was called with jsonSchema
            expect(mockStreamingService.createStream).toHaveBeenCalledWith(
                expect.objectContaining({
                    jsonSchema: jsonSchema,
                    responseFormat: 'json'
                }),
                'test-model',
                undefined
            );
        });
    });

    describe('model management methods', () => {
        it('should delegate getAvailableModels to ModelManager', () => {
            // Setup
            const mockModels = [
                { name: 'model1', inputPricePerMillion: 0.01, outputPricePerMillion: 0.02 },
                { name: 'model2', inputPricePerMillion: 0.02, outputPricePerMillion: 0.03 }
            ] as ModelInfo[];
            mockModelManager.getAvailableModels.mockReturnValue(mockModels);

            // Execute
            const result = llmCaller.getAvailableModels();

            // Verify
            expect(mockModelManager.getAvailableModels).toHaveBeenCalled();
            expect(result).toEqual(mockModels);
        });

        it('should delegate addModel to ModelManager', () => {
            // Setup
            const newModel = {
                name: 'new-model',
                inputPricePerMillion: 0.01,
                outputPricePerMillion: 0.02,
                maxRequestTokens: 4000,
                maxResponseTokens: 1000,
                characteristics: {
                    qualityIndex: 85,
                    outputSpeed: 40,
                    firstTokenLatency: 400
                }
            } as ModelInfo;

            // Execute
            llmCaller.addModel(newModel);

            // Verify
            expect(mockModelManager.addModel).toHaveBeenCalledWith(newModel);
        });

        it('should delegate getModel to ModelManager', () => {
            // Setup
            const modelName = 'gpt-4';
            const mockModel = {
                name: modelName,
                inputPricePerMillion: 0.01,
                outputPricePerMillion: 0.02,
                maxRequestTokens: 4000,
                maxResponseTokens: 1000,
                characteristics: {
                    qualityIndex: 90,
                    outputSpeed: 35,
                    firstTokenLatency: 350
                }
            } as ModelInfo;
            mockModelManager.getModel.mockReturnValue(mockModel);

            // Execute
            const result = llmCaller.getModel(modelName);

            // Verify
            expect(mockModelManager.getModel).toHaveBeenCalledWith(modelName);
            expect(result).toEqual(mockModel);
        });

        it('should delegate updateModel to ModelManager', () => {
            // Setup
            const modelName = 'gpt-4';
            const updates = {
                inputPricePerMillion: 0.015,
                characteristics: {
                    qualityIndex: 95,
                    outputSpeed: 35,
                    firstTokenLatency: 350
                }
            };

            // Execute
            llmCaller.updateModel(modelName, updates);

            // Verify
            expect(mockModelManager.updateModel).toHaveBeenCalledWith(modelName, updates);
        });
    });
}); 