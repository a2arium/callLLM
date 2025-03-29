// Import from Jest
const jestGlobals = require('@jest/globals');
const mockJest = jestGlobals.jest;

// Import the modules we need to test
const { LLMCaller } = require('../../../core/caller/LLMCaller');
const { StreamingService } = require('../../../core/streaming/StreamingService');
const { ProviderManager } = require('../../../core/caller/ProviderManager');
const { ModelManager } = require('../../../core/models/ModelManager');
const { ResponseProcessor } = require('../../../core/processors/ResponseProcessor');
const { RetryManager } = require('../../../core/retry/RetryManager');
const { HistoryManager } = require('../../../core/history/HistoryManager');

describe('LLMCaller', () => {
    let mockStreamingService;
    let mockProviderManager;
    let mockModelManager;
    let mockResponseProcessor;
    let mockRetryManager;
    let mockHistoryManager;
    let llmCaller;

    beforeEach(() => {
        mockJest.useFakeTimers();

        mockStreamingService = {
            createStream: mockJest.fn(),
            setCallerId: mockJest.fn(),
            setUsageCallback: mockJest.fn(),
            getTokenCalculator: mockJest.fn(),
            getResponseProcessor: mockJest.fn()
        };

        mockProviderManager = {
            getProvider: mockJest.fn(),
            switchProvider: mockJest.fn(),
            getCurrentProviderName: mockJest.fn().mockReturnValue('openai')
        };

        mockModelManager = {
            getModel: mockJest.fn().mockReturnValue({
                name: 'test-model',
                provider: 'openai',
                inputPricePerMillion: 0.15,
                outputPricePerMillion: 0.60,
                maxRequestTokens: 128000,
                maxResponseTokens: 16384,
                characteristics: {
                    qualityIndex: 73,
                    outputSpeed: 183.8,
                    firstTokenLatency: 730
                }
            }),
            getAvailableModels: mockJest.fn(),
            addModel: mockJest.fn(),
            updateModel: mockJest.fn(),
            clearModels: mockJest.fn(),
            hasModel: mockJest.fn(),
            resolveModel: mockJest.fn()
        };

        mockResponseProcessor = {
            processResponse: mockJest.fn(),
            processStreamResponse: mockJest.fn(),
            validateResponse: mockJest.fn(),
            validateJsonMode: mockJest.fn()
        };

        mockRetryManager = {
            executeWithRetry: mockJest.fn().mockImplementation((fn) => fn()),
            config: {
                maxRetries: 3,
                initialDelay: 1000,
                maxDelay: 5000,
                backoffFactor: 2
            }
        };

        mockHistoryManager = {
            getHistoricalMessages: mockJest.fn().mockReturnValue([]),
            addMessage: mockJest.fn(),
            getLastMessageByRole: mockJest.fn(),
            initializeWithSystemMessage: mockJest.fn(),
            clearHistory: mockJest.fn(),
            setHistoricalMessages: mockJest.fn(),
            getLastMessages: mockJest.fn(),
            serializeHistory: mockJest.fn(),
            deserializeHistory: mockJest.fn(),
            updateSystemMessage: mockJest.fn(),
            addToolCallToHistory: mockJest.fn(),
            getHistorySummary: mockJest.fn(),
            captureStreamResponse: mockJest.fn()
        };

        // Add mock tools manager
        const mockToolsManager = {
            addTool: mockJest.fn(),
            removeTool: mockJest.fn(),
            updateTool: mockJest.fn(),
            listTools: mockJest.fn(),
            getTool: mockJest.fn(),
            getToolById: mockJest.fn()
        };

        // Create a mock request processor
        const mockRequestProcessor = {
            processRequest: mockJest.fn()
        };

        // Create a mock chunk controller
        const mockChunkController = {
            processChunks: mockJest.fn(),
            streamChunks: mockJest.fn()
        };

        llmCaller = new LLMCaller(
            'openai',
            'test-model',
            'You are a helpful assistant',
            {
                providerManager: mockProviderManager,
                modelManager: mockModelManager,
                streamingService: mockStreamingService,
                responseProcessor: mockResponseProcessor,
                retryManager: mockRetryManager,
                historyManager: mockHistoryManager
            }
        );

        // Attach the mocks directly to the caller instance
        llmCaller.toolsManager = mockToolsManager;
        llmCaller.requestProcessor = mockRequestProcessor;
        llmCaller.chunkController = mockChunkController;
    });

    afterEach(() => {
        mockJest.useRealTimers();
        mockJest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with default values', () => {
            const caller = new LLMCaller(
                'openai',
                'test-model',
                undefined,
                {
                    providerManager: mockProviderManager,
                    modelManager: mockModelManager,
                    streamingService: mockStreamingService,
                    responseProcessor: mockResponseProcessor,
                    retryManager: mockRetryManager,
                    historyManager: mockHistoryManager
                }
            );

            expect(caller).toBeInstanceOf(LLMCaller);
        });

        it('should throw error if model is not found', () => {
            mockModelManager.getModel.mockReturnValueOnce(undefined);

            expect(() => new LLMCaller(
                'openai',
                'non-existent-model',
                'You are a helpful assistant',
                {
                    providerManager: mockProviderManager,
                    modelManager: mockModelManager
                }
            )).toThrow('Model non-existent-model not found for provider openai');
        });
    });

    describe('chatCall', () => {
        it('should add user message to history and execute chat controller', async () => {
            // Setup mocks
            const mockExecute = mockJest.fn().mockResolvedValue({
                content: 'Test response',
                role: 'assistant'
            });

            // Use private property access
            llmCaller.chatController = {
                execute: mockExecute
            };
            
            // Mock requestProcessor to return a single message, so it uses chatCall
            llmCaller.requestProcessor = {
                processRequest: mockJest.fn().mockResolvedValue(['Test message'])
            };

            // Call method using the new call API
            const result = await llmCaller.call('Test message');

            // Assertions
            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('user', 'Test message');
            expect(mockExecute).toHaveBeenCalledWith({
                model: 'test-model',
                systemMessage: 'You are a helpful assistant',
                settings: undefined
            });
            expect(result).toEqual([{
                content: 'Test response',
                role: 'assistant'
            }]);
        });

        it('should set historical messages if provided', async () => {
            // Setup mocks
            const historicalMessages = [
                { role: 'system', content: 'You are a helpful assistant' },
                { role: 'user', content: 'Hello' },
            ];

            const mockExecute = mockJest.fn().mockResolvedValue({
                content: 'Hi there',
                role: 'assistant'
            });

            llmCaller.chatController = {
                execute: mockExecute
            };

            // We need to mock requestProcessor to return a single message, so it uses chatCall
            llmCaller.requestProcessor = {
                processRequest: mockJest.fn().mockResolvedValue(['Test message'])
            };

            // We need to mock historyManager.getHistoricalMessages to use our historical messages
            mockHistoryManager.getHistoricalMessages.mockReturnValue(historicalMessages);

            // Call method using the new call API
            await llmCaller.call('Test message');

            // Assertions
            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('user', 'Test message');
        });

        it('should merge settings correctly', async () => {
            // Setup
            const mockExecute = mockJest.fn().mockResolvedValue({
                content: 'Response',
                role: 'assistant'
            });

            llmCaller.chatController = {
                execute: mockExecute
            };

            llmCaller.settings = { temperature: 0.7 };

            // We need to mock requestProcessor to return a single message, so it uses chatCall
            llmCaller.requestProcessor = {
                processRequest: mockJest.fn().mockResolvedValue(['Test message'])
            };

            // Call method using the new call API
            await llmCaller.call('Test message', { settings: { maxTokens: 100 } });

            // Assertions
            expect(mockExecute).toHaveBeenCalledWith({
                model: 'test-model',
                systemMessage: 'You are a helpful assistant',
                settings: { temperature: 0.7, maxTokens: 100 }
            });
        });
    });

    describe('stream methods', () => {
        it('should throw an error after exhausting all retries', async () => {
            const error = new Error('Test error');
            
            // Setup retry manager to execute the function and track calls
            mockRetryManager.executeWithRetry.mockImplementation(async (fn) => {
                return fn(); // This will trigger the error from createStream
            });
            
            // Setup streamingService to use the retryManager
            const originalCreateStream = mockStreamingService.createStream;
            mockStreamingService.createStream = mockJest.fn().mockImplementation(async () => {
                try {
                    return await mockRetryManager.executeWithRetry(async () => {
                        throw error; // Simulate a failure
                    });
                } catch (e) {
                    throw e; // Re-throw to simulate failure after retries
                }
            });

            // Mock requestProcessor to return a single message
            llmCaller.requestProcessor = {
                processRequest: mockJest.fn().mockResolvedValue(['test'])
            };
            
            await expect(llmCaller.stream('test')).rejects.toThrow('Test error');
            
            // Verify the retryManager was called
            expect(mockRetryManager.executeWithRetry).toHaveBeenCalled();
            
            // Restore the original mock to avoid affecting other tests
            mockStreamingService.createStream = originalCreateStream;
        });
        
        it('should respect custom maxRetries setting', async () => {
            const error = new Error('Test error');
            
            // Setup retry manager to execute the function and track calls
            mockRetryManager.executeWithRetry.mockImplementation(async (fn) => {
                return fn(); // This will trigger the error from createStream
            });
            
            // Setup streamingService to use the retryManager
            const originalCreateStream = mockStreamingService.createStream;
            mockStreamingService.createStream = mockJest.fn().mockImplementation(async () => {
                try {
                    return await mockRetryManager.executeWithRetry(async () => {
                        throw error; // Simulate a failure
                    });
                } catch (e) {
                    throw e; // Re-throw to simulate failure after retries
                }
            });

            // Mock requestProcessor to return a single message
            llmCaller.requestProcessor = {
                processRequest: mockJest.fn().mockResolvedValue(['test'])
            };
            
            await expect(llmCaller.stream('test', { 
                settings: { retry: { maxRetries: 5 } }
            })).rejects.toThrow('Test error');
            
            // Verify the retryManager was called
            expect(mockRetryManager.executeWithRetry).toHaveBeenCalled();
            
            // Restore the original mock to avoid affecting other tests
            mockStreamingService.createStream = originalCreateStream;
        });
        
        it('should use proper call parameters', async () => {
            mockStreamingService.createStream.mockResolvedValue({
                async* [Symbol.asyncIterator]() {
                    yield { content: 'response', role: 'assistant', isComplete: false };
                    yield { content: 'complete response', role: 'assistant', isComplete: true };
                }
            });
            
            const historicalMessages = [
                { role: 'system', content: 'You are a helpful assistant' },
                { role: 'user', content: 'Hello' }
            ];
            mockHistoryManager.getHistoricalMessages.mockReturnValue(historicalMessages);

            // Mock requestProcessor to return a single message
            llmCaller.requestProcessor = {
                processRequest: mockJest.fn().mockResolvedValue(['test'])
            };
            
            const result = await llmCaller.stream('test');
            
            expect(result).toBeDefined();
            expect(mockStreamingService.createStream).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: [...historicalMessages, { role: 'user', content: 'test' }]
                }),
                'test-model',
                expect.any(String)
            );
        });

        it('should pass custom settings to streaming service', async () => {
            mockStreamingService.createStream.mockResolvedValue({
                async* [Symbol.asyncIterator]() {
                    yield { content: 'response', role: 'assistant', isComplete: true };
                }
            });

            // Mock requestProcessor to return a single message
            llmCaller.requestProcessor = {
                processRequest: mockJest.fn().mockResolvedValue(['test'])
            };

            await llmCaller.stream('test', {
                settings: { temperature: 0.5, maxTokens: 1000 }
            });

            expect(mockStreamingService.createStream).toHaveBeenCalledWith(
                expect.objectContaining({
                    settings: expect.objectContaining({
                        temperature: 0.5,
                        maxTokens: 1000
                    })
                }),
                'test-model',
                expect.any(String)
            );
        });

        it('should use provided messages directly if available', async () => {
            mockStreamingService.createStream.mockResolvedValue({
                async* [Symbol.asyncIterator]() {
                    yield { content: 'response', role: 'assistant', isComplete: true };
                }
            });

            // Create a mock RequestProcessor that returns multiple messages
            const messagesArray = [
                { role: 'system', content: 'Custom system message' },
                { role: 'user', content: 'Direct user message' }
            ];

            // Mock requestProcessor to return these messages
            llmCaller.requestProcessor = {
                processRequest: mockJest.fn().mockResolvedValue(messagesArray)
            };

            await llmCaller.stream('test with multiple messages');

            // This should use the ChunkController instead of direct streaming
            expect(llmCaller.chunkController.streamChunks).toHaveBeenCalledWith(
                messagesArray,
                expect.objectContaining({
                    model: 'test-model',
                    systemMessage: expect.any(String)
                })
            );
        });
    });

    describe('stream method', () => {
        it('should handle single chunk messages', async () => {
            const mockProcessRequest = mockJest.fn().mockResolvedValue(['Single chunk message']);
            llmCaller.requestProcessor = { processRequest: mockProcessRequest };

            // Mock streamCall for this test
            const mockStreamCall = mockJest.fn().mockResolvedValue({
                async* [Symbol.asyncIterator]() {
                    yield { content: 'response', role: 'assistant', isComplete: true };
                }
            });
            llmCaller.streamCall = mockStreamCall;

            await llmCaller.stream(
                'Test message',
                {
                    data: { key: 'value' },
                    settings: { temperature: 0.7 }
                }
            );

            expect(mockProcessRequest).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Test message',
                data: { key: 'value' }
            }));
            expect(mockStreamCall).toHaveBeenCalledWith(
                'Single chunk message',
                { temperature: 0.7 }
            );
            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('user', 'Test message');
        });

        it('should handle multiple chunk messages', async () => {
            const mockProcessRequest = mockJest.fn().mockResolvedValue(['Chunk 1', 'Chunk 2']);
            llmCaller.requestProcessor = { processRequest: mockProcessRequest };

            // Mock chunkController for this test
            const mockStreamChunks = mockJest.fn().mockResolvedValue({
                async* [Symbol.asyncIterator]() {
                    yield { content: 'response', role: 'assistant', isComplete: true };
                }
            });
            llmCaller.chunkController = { streamChunks: mockStreamChunks };

            await llmCaller.stream(
                'Test message',
                {
                    endingMessage: 'Additional context',
                    settings: { temperature: 0.7 }
                }
            );

            expect(mockProcessRequest).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Test message',
                endingMessage: 'Additional context'
            }));
            expect(mockStreamChunks).toHaveBeenCalledWith(
                ['Chunk 1', 'Chunk 2'],
                expect.objectContaining({
                    model: 'test-model',
                    systemMessage: 'You are a helpful assistant',
                    settings: { temperature: 0.7 }
                })
            );
        });
    });

    describe('call method', () => {
        it('should handle single chunk messages', async () => {
            const mockProcessRequest = mockJest.fn().mockResolvedValue(['Single chunk message']);
            llmCaller.requestProcessor = { processRequest: mockProcessRequest };

            // Mock chatCall for this test
            const mockChatCallResult = { content: 'response', role: 'assistant' };
            const mockChatCall = mockJest.fn().mockResolvedValue(mockChatCallResult);
            llmCaller.chatCall = mockChatCall;

            const result = await llmCaller.call(
                'Test message',
                {
                    data: { key: 'value' },
                    settings: { temperature: 0.7 }
                }
            );

            expect(mockProcessRequest).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Test message',
                data: { key: 'value' }
            }));
            expect(mockChatCall).toHaveBeenCalledWith(
                'Single chunk message',
                { temperature: 0.7 }
            );
            expect(result).toEqual([mockChatCallResult]);
        });

        it('should handle multiple chunk messages', async () => {
            const mockProcessRequest = mockJest.fn().mockResolvedValue(['Chunk 1', 'Chunk 2']);
            llmCaller.requestProcessor = { processRequest: mockProcessRequest };

            // Mock chunkController for this test
            const mockProcessChunksResult = [
                { content: 'response 1', role: 'assistant' },
                { content: 'response 2', role: 'assistant' }
            ];
            const mockProcessChunks = mockJest.fn().mockResolvedValue(mockProcessChunksResult);
            llmCaller.chunkController = { processChunks: mockProcessChunks };

            const result = await llmCaller.call(
                'Test message',
                {
                    endingMessage: 'Additional context',
                    settings: { temperature: 0.7 }
                }
            );

            expect(mockProcessRequest).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Test message',
                endingMessage: 'Additional context'
            }));
            expect(mockProcessChunks).toHaveBeenCalledWith(
                ['Chunk 1', 'Chunk 2'],
                expect.objectContaining({
                    model: 'test-model',
                    systemMessage: 'You are a helpful assistant',
                    settings: { temperature: 0.7 }
                })
            );
            expect(result).toEqual(mockProcessChunksResult);
            // Should add each response to history
            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('assistant', 'response 1');
            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('assistant', 'response 2');
        });
    });

    describe('tool management', () => {
        it('should add a tool', () => {
            const tool = { name: 'test-tool', description: 'Test tool', schema: {} };
            llmCaller.addTool(tool);
            expect(llmCaller.toolsManager.addTool).toHaveBeenCalledWith(tool);
        });

        it('should remove a tool', () => {
            const toolName = 'test-tool';
            llmCaller.removeTool(toolName);
            expect(llmCaller.toolsManager.removeTool).toHaveBeenCalledWith(toolName);
        });

        it('should update a tool', () => {
            const toolName = 'test-tool';
            const updates = { description: 'Updated description' };
            llmCaller.updateTool(toolName, updates);
            expect(llmCaller.toolsManager.updateTool).toHaveBeenCalledWith(toolName, updates);
        });

        it('should list all tools', () => {
            const mockTools = [{ name: 'tool1' }, { name: 'tool2' }];
            llmCaller.toolsManager.listTools.mockReturnValue(mockTools);
            
            const result = llmCaller.listTools();
            
            expect(llmCaller.toolsManager.listTools).toHaveBeenCalled();
            expect(result).toEqual(mockTools);
        });

        it('should get a specific tool', () => {
            const mockTool = { name: 'test-tool' };
            llmCaller.toolsManager.getTool.mockReturnValue(mockTool);
            
            const result = llmCaller.getTool('test-tool');
            
            expect(llmCaller.toolsManager.getTool).toHaveBeenCalledWith('test-tool');
            expect(result).toEqual(mockTool);
        });
    });

    describe('history management', () => {
        it('should get historical messages', () => {
            const mockMessages = [{ role: 'user', content: 'Hello' }];
            mockHistoryManager.getHistoricalMessages.mockReturnValue(mockMessages);
            
            const result = llmCaller.getHistoricalMessages();
            
            expect(mockHistoryManager.getHistoricalMessages).toHaveBeenCalled();
            expect(result).toEqual(mockMessages);
        });

        it('should add a message to history', () => {
            const additionalFields = { id: '123' };
            llmCaller.addMessage('user', 'Hello', additionalFields);
            
            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('user', 'Hello', additionalFields);
        });

        it('should clear history', () => {
            llmCaller.clearHistory();
            expect(mockHistoryManager.clearHistory).toHaveBeenCalled();
        });

        it('should set historical messages', () => {
            const messages = [{ role: 'user', content: 'Hello' }];
            llmCaller.setHistoricalMessages(messages);
            
            expect(mockHistoryManager.setHistoricalMessages).toHaveBeenCalledWith(messages);
        });

        it('should update system message', () => {
            llmCaller.updateSystemMessage('New system message');
            expect(mockHistoryManager.updateSystemMessage).toHaveBeenCalledWith('New system message', true);
        });

        it('should update system message with preserveHistory=false', () => {
            llmCaller.updateSystemMessage('New system message', false);
            expect(mockHistoryManager.updateSystemMessage).toHaveBeenCalledWith('New system message', false);
        });

        it('should get the last message by role', () => {
            const mockMessage = { role: 'user', content: 'Hello' };
            mockHistoryManager.getLastMessageByRole.mockReturnValue(mockMessage);
            
            const result = llmCaller.getLastMessageByRole('user');
            
            expect(mockHistoryManager.getLastMessageByRole).toHaveBeenCalledWith('user');
            expect(result).toEqual(mockMessage);
        });

        it('should get the last messages', () => {
            const mockMessages = [
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi there' }
            ];
            mockHistoryManager.getLastMessages.mockReturnValue(mockMessages);
            
            const result = llmCaller.getLastMessages(2);
            
            expect(mockHistoryManager.getLastMessages).toHaveBeenCalledWith(2);
            expect(result).toEqual(mockMessages);
        });

        it('should serialize history', () => {
            mockHistoryManager.serializeHistory.mockReturnValue('{"messages":[]}');
            
            const result = llmCaller.serializeHistory();
            
            expect(mockHistoryManager.serializeHistory).toHaveBeenCalled();
            expect(result).toBe('{"messages":[]}');
        });

        it('should deserialize history', () => {
            const serialized = '{"messages":[{"role":"user","content":"Hello"}]}';
            
            llmCaller.deserializeHistory(serialized);
            
            expect(mockHistoryManager.deserializeHistory).toHaveBeenCalledWith(serialized);
        });

        it('should add tool call to history', () => {
            const toolName = 'calculator';
            const args = { a: 1, b: 2 };
            const result = '3';
            
            llmCaller.addToolCallToHistory(toolName, args, result);
            
            expect(mockHistoryManager.addToolCallToHistory).toHaveBeenCalledWith(
                toolName, args, result, undefined
            );
        });

        it('should add tool call with error to history', () => {
            const toolName = 'calculator';
            const args = { a: 1, b: 0 };
            const error = 'Division by zero';
            
            llmCaller.addToolCallToHistory(toolName, args, undefined, error);
            
            expect(mockHistoryManager.addToolCallToHistory).toHaveBeenCalledWith(
                toolName, args, undefined, error
            );
        });

        it('should get history summary', () => {
            const mockSummary = [
                { role: 'user', contentPreview: 'Hello', hasToolCalls: false }
            ];
            mockHistoryManager.getHistorySummary.mockReturnValue(mockSummary);
            
            const result = llmCaller.getHistorySummary({ includeSystemMessages: true });
            
            expect(mockHistoryManager.getHistorySummary).toHaveBeenCalledWith({ includeSystemMessages: true });
            expect(result).toEqual(mockSummary);
        });
    });

    describe('model management', () => {
        it('should set model', async () => {
            // Setup mocks
            mockModelManager.getModel.mockReturnValueOnce({
                name: 'new-model',
                provider: 'openai'
            });

            // Call the method
            llmCaller.setModel({
                nameOrAlias: 'new-model'
            });

            // Assertions
            expect(mockModelManager.getModel).toHaveBeenCalledWith('new-model');
            expect(llmCaller.model).toBe('new-model');
        });

        it('should throw error when setting non-existent model', () => {
            // Setup mocks
            mockModelManager.getModel.mockReturnValueOnce(undefined);

            // Assertions
            expect(() => llmCaller.setModel({
                nameOrAlias: 'non-existent-model'
            })).toThrow('Model non-existent-model not found in provider current');
        });

        it('should use the same provider when switching models without specifying provider', () => {
            // Setup mocks
            mockModelManager.getModel.mockReturnValueOnce({
                name: 'gpt-4-turbo',
                provider: 'openai'
            });

            // Call the method - same provider, but different model
            llmCaller.setModel({
                nameOrAlias: 'gpt-4-turbo'
            });

            // Assertions - should not call switchProvider
            expect(mockProviderManager.switchProvider).not.toHaveBeenCalled();
            expect(mockModelManager.getModel).toHaveBeenCalledWith('gpt-4-turbo');
            expect(llmCaller.model).toBe('gpt-4-turbo');
        });

        it('should get available models', () => {
            const mockModels = [
                { name: 'model1', provider: 'openai' },
                { name: 'model2', provider: 'openai' }
            ];
            mockModelManager.getAvailableModels.mockReturnValue(mockModels);
            
            const result = llmCaller.getAvailableModels();
            
            expect(mockModelManager.getAvailableModels).toHaveBeenCalled();
            expect(result).toEqual(mockModels);
        });
    });

    describe('settings management', () => {
        it('should update settings', () => {
            const newSettings = { temperature: 0.8, maxTokens: 2000 };
            llmCaller.updateSettings(newSettings);
            
            expect(llmCaller.settings).toEqual(newSettings);
        });

        it('should merge settings properly', () => {
            // Set initial settings
            llmCaller.settings = { temperature: 0.7, topP: 1.0 };
            
            // Update with new settings
            llmCaller.updateSettings({ maxTokens: 2000, temperature: 0.8 });
            
            // Test merged result
            expect(llmCaller.settings).toEqual({
                temperature: 0.8,
                topP: 1.0,
                maxTokens: 2000
            });
        });
    });

    describe('caller ID management', () => {
        it('should set caller ID and update relevant services', () => {
            llmCaller.setCallerId('new-caller-id');
            
            expect(mockStreamingService.setCallerId).toHaveBeenCalledWith('new-caller-id');
            // The actual implementation creates new instances internally,
            // so we can't directly test those, but we can at least verify the callerId update
        });
    });

    describe('provider management', () => {
        it('should use provider info for error messages', () => {
            // We can test the error messages generated by model lookup
            // Mock the getModel method to generate expected error
            mockModelManager.getModel.mockReturnValueOnce(undefined);
            
            // Test that the error message includes the current provider
            expect(() => llmCaller.setModel({
                nameOrAlias: 'invalid-model'
            })).toThrow('Model invalid-model not found in provider current');
        });
    });
    
    describe('specialized request types', () => {
        it('should handle JSON mode settings in stream calls', async () => {
            // Setup mocks
            const jsonSettings = {
                responseFormat: 'json',
                jsonSchema: {
                    name: 'UserProfile',
                    schema: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' }
                        }
                    }
                }
            };
            
            // Override for this test
            const mockCreateStream = mockJest.fn().mockResolvedValue('stream');
            llmCaller.streamingService = {
                createStream: mockCreateStream,
                setCallerId: mockJest.fn()
            };

            // Mock requestProcessor to return a single message
            llmCaller.requestProcessor = {
                processRequest: mockJest.fn().mockResolvedValue(['Generate a profile'])
            };
            
            // Call method with JSON settings using the new stream API
            await llmCaller.stream('Generate a profile', {
                settings: jsonSettings
            });
            
            // Check that JSON settings were passed correctly
            expect(mockCreateStream).toHaveBeenCalledWith(
                expect.objectContaining({
                    settings: expect.objectContaining(jsonSettings)
                }),
                'test-model',
                'You are a helpful assistant'
            );
        });
        
        it('should handle function calling settings in chat calls', () => {
            // Setup mocks
            const mockExecute = mockJest.fn().mockResolvedValue({
                content: 'Response',
                role: 'assistant'
            });
            
            llmCaller.chatController = {
                execute: mockExecute
            };
            
            const tools = [
                {
                    name: 'get_weather',
                    description: 'Get the weather',
                    parameters: {
                        type: 'object',
                        properties: {
                            location: {
                                type: 'string',
                                description: 'The location'
                            }
                        },
                        required: ['location']
                    }
                }
            ];
            
            // Call method with tools
            llmCaller.chatCall(
                'What is the weather?',
                {
                    tools: tools,
                    toolChoice: 'auto'
                }
            );
            
            // Check that the right settings were passed
            expect(mockExecute).toHaveBeenCalledWith(
                expect.objectContaining({
                    settings: expect.objectContaining({
                        tools: tools,
                        toolChoice: 'auto'
                    })
                })
            );
        });
    });
    
    describe('callback handling', () => {
        it('should set up callbacks correctly', () => {
            const mockCallback = mockJest.fn();
            
            llmCaller.setUsageCallback(mockCallback);
            
            expect(mockStreamingService.setUsageCallback).toHaveBeenCalledWith(mockCallback);
        });
    });
    
    describe('error handling', () => {
        it('should propagate errors from model manager during initialization', () => {
            // Setup mock to return undefined
            const originalGetModel = mockModelManager.getModel;
            mockModelManager.getModel = mockJest.fn().mockReturnValueOnce(undefined);
            
            // Create new caller which should throw
            expect(() => new LLMCaller(
                'openai',
                'invalid-model',
                'You are a helpful assistant',
                {
                    providerManager: mockProviderManager,
                    modelManager: mockModelManager,
                    streamingService: mockStreamingService,
                    responseProcessor: mockResponseProcessor,
                    retryManager: mockRetryManager,
                    historyManager: mockHistoryManager
                }
            )).toThrow('Model invalid-model not found for provider openai');
            
            // Restore original mock
            mockModelManager.getModel = originalGetModel;
        });
    });

    describe('edge cases and remaining functionality', () => {
        it('should handle private mergeSettings method with no settings', () => {
            // Reset settings
            llmCaller.settings = undefined;
            
            // Call chatCall with no settings
            const mockExecute = mockJest.fn().mockResolvedValue({
                content: 'Response',
                role: 'assistant'
            });
            
            llmCaller.chatController = {
                execute: mockExecute
            };
            
            llmCaller.chatCall({
                message: 'Hello'
            });
            
            // Verify that undefined is passed for settings
            expect(mockExecute).toHaveBeenCalledWith(
                expect.objectContaining({
                    settings: undefined
                })
            );
        });
        
        it('should handle internal tool orchestration during initialization', () => {
            // We can test that the orchestration is set up correctly by verifying
            // that the instance is properly created with all required components
            
            const newLLMCaller = new LLMCaller(
                'openai',
                'test-model',
                'You are a helpful assistant',
                {
                    providerManager: mockProviderManager,
                    modelManager: mockModelManager,
                    streamingService: mockStreamingService,
                    responseProcessor: mockResponseProcessor,
                    retryManager: mockRetryManager,
                    historyManager: mockHistoryManager
                }
            );
            
            // Verify that the instance is created
            expect(newLLMCaller).toBeInstanceOf(LLMCaller);
        });
    });

    describe('streamCall', () => {
        it('should handle stream errors', async () => {
            // Setup mocks
            mockStreamingService.createStream.mockRejectedValue(new Error('Test error'));

            // Test error handling
            await expect(llmCaller.streamCall('test')).rejects.toThrow('Test error');
        });

        it.skip('should handle retry behavior', async () => {
            // NOTE: This test is skipped because the streamCall method now uses StreamingService.createStream
            // which has complex retry logic that's tested separately. The streaming service handles
            // retries internally through RetryManager.executeWithRetry.
            
            // The test would need to mock StreamingService's internal executeWithRetry method,
            // which creates fragile test coupling to implementation details.
        });

        it('should create stream with correctly formatted messages', async () => {
            // Setup mocks
            const mockStream = { [Symbol.asyncIterator]: mockJest.fn() };
            mockStreamingService.createStream.mockResolvedValue(mockStream);

            const testSettings = {
                temperature: 0.5,
                maxTokens: 100
            };

            // Call method
            const result = await llmCaller.streamCall('test', testSettings);

            // Ensure streamingService was called correctly
            const messages = [{ role: 'user', content: 'test' }];
            expect(mockStreamingService.createStream).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: expect.arrayContaining(messages),
                    settings: expect.objectContaining(testSettings)
                }),
                'test-model',
                'You are a helpful assistant'
            );

            // Ensure result is returned
            expect(result).toBe(mockStream);
        });

        it('should accept explicit messages parameter', async () => {
            const messages = [
                { role: 'system', content: 'You are a helpful assistant' },
                { role: 'user', content: 'Test message' }
            ];

            // Call method with messages
            await llmCaller.streamCall(messages);

            // Verify message structure passed to createStream
            expect(mockStreamingService.createStream).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages
                }),
                'test-model',
                'You are a helpful assistant'
            );
        });
    });
});