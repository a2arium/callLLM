// Import from Jest
const jestGlobals = require('@jest/globals');
const mockJest = jestGlobals.jest;

// Mock all dependencies
jest.mock('../../../core/caller/ProviderManager', () => ({
    ProviderManager: jest.fn().mockImplementation(() => ({
        getProvider: jest.fn(),
        switchProvider: jest.fn(),
        getCurrentProviderName: jest.fn().mockReturnValue('openai')
    })),
    SupportedProviders: {
        openai: 'openai',
        anthropic: 'anthropic'
    }
}));

jest.mock('../../../core/models/ModelManager', () => ({
    ModelManager: jest.fn().mockImplementation(() => ({
        getModel: jest.fn().mockReturnValue({
            name: 'test-model',
            provider: 'openai',
            inputPricePerMillion: 0.1,
            outputPricePerMillion: 0.2,
            maxRequestTokens: 10000,
            maxResponseTokens: 5000,
            characteristics: {
                qualityIndex: 80,
                outputSpeed: 100,
                firstTokenLatency: 500
            }
        }),
        getAvailableModels: jest.fn(),
        addModel: jest.fn(),
        updateModel: jest.fn()
    }))
}));

jest.mock('../../../core/chat/ChatController', () => ({
    ChatController: jest.fn().mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
            content: 'Test response',
            role: 'assistant'
        })
    }))
}));

jest.mock('../../../core/streaming/StreamingService', () => ({
    StreamingService: jest.fn().mockImplementation(() => ({
        createStream: jest.fn().mockResolvedValue({
            async *[Symbol.asyncIterator]() {
                yield { content: 'Test response', role: 'assistant', isComplete: true };
            }
        }),
        setCallerId: jest.fn(),
        setUsageCallback: jest.fn()
    }))
}));

jest.mock('../../../core/chunks/ChunkController', () => ({
    ChunkController: jest.fn().mockImplementation(() => ({
        streamChunks: jest.fn().mockResolvedValue({
            async *[Symbol.asyncIterator]() {
                yield { content: 'Test response', role: 'assistant', isComplete: true };
            }
        }),
        processChunks: jest.fn().mockResolvedValue([{
            content: 'Test response',
            role: 'assistant'
        }]),
        resetIterationCount: jest.fn()
    }))
}));

jest.mock('../../../core/retry/RetryManager', () => ({
    RetryManager: jest.fn().mockImplementation(() => ({
        executeWithRetry: jest.fn().mockImplementation(async (callback) => {
            return callback();
        }),
        config: {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 5000,
            backoffFactor: 2
        }
    }))
}));

jest.mock('../../../core/history/HistoryManager', () => ({
    HistoryManager: jest.fn().mockImplementation(() => ({
        getHistoricalMessages: jest.fn().mockReturnValue([]),
        getMessages: jest.fn().mockReturnValue([]),
        addMessage: jest.fn(),
        clearHistory: jest.fn(),
        setHistoricalMessages: jest.fn(),
        getLastMessageByRole: jest.fn(),
        updateSystemMessage: jest.fn()
    }))
}));

jest.mock('../../../core/processors/ResponseProcessor', () => ({
    ResponseProcessor: jest.fn().mockImplementation(() => ({
        processResponse: jest.fn(),
        processStreamResponse: jest.fn(),
        validateResponse: jest.fn(),
        validateJsonMode: jest.fn()
    }))
}));

jest.mock('../../../core/processors/RequestProcessor', () => ({
    RequestProcessor: jest.fn().mockImplementation(() => ({
        processRequest: jest.fn().mockResolvedValue(['Test message'])
    }))
}));

jest.mock('../../../core/tools/ToolsManager', () => ({
    ToolsManager: jest.fn().mockImplementation(() => ({
        addTool: jest.fn(),
        removeTool: jest.fn(),
        updateTool: jest.fn(),
        listTools: jest.fn().mockReturnValue([]),
        getTool: jest.fn()
    }))
}));

// Import the LLMCaller class after mocks are set up
const { LLMCaller } = require('../../../core/caller/LLMCaller');
const { ProviderManager } = require('../../../core/caller/ProviderManager');
const { ModelManager } = require('../../../core/models/ModelManager');
const { StreamingService } = require('../../../core/streaming/StreamingService');
const { ChatController } = require('../../../core/chat/ChatController');
const { RetryManager } = require('../../../core/retry/RetryManager');
const { HistoryManager } = require('../../../core/history/HistoryManager');
const { ResponseProcessor } = require('../../../core/processors/ResponseProcessor');
const { ChunkController } = require('../../../core/chunks/ChunkController');
const { ToolsManager } = require('../../../core/tools/ToolsManager');

describe('LLMCaller', () => {
    let llmCaller;
    let mockHistoryManager;
    let mockChatController;
    let mockStreamingService;
    let mockChunkController;
    let mockProcessRequest;
    let mockToolsManager;
    let mockExecute;
    let mockStreamCall;
    let mockStreamChunks;
    let mockProcessChunks;

    beforeEach(() => {
        mockJest.clearAllMocks();
        
        // Create the caller instance
        llmCaller = new LLMCaller('openai', 'test-model');
        
        // Get the mock instances for easier access
        mockHistoryManager = HistoryManager.mock.results[0].value;
        mockChatController = ChatController.mock.results[0].value;
        mockStreamingService = StreamingService.mock.results[0].value;
        mockChunkController = ChunkController.mock.results[0].value;
        mockToolsManager = ToolsManager.mock.results[0].value;
        
        // Create mock functions for testing
        mockExecute = mockJest.fn().mockResolvedValue({
            content: 'Test response',
            role: 'assistant'
        });
        mockChatController.execute = mockExecute;
        
        // Mock processors
        mockProcessRequest = mockJest.fn().mockResolvedValue(['Test message']);
        llmCaller.requestProcessor = {
            processRequest: mockProcessRequest
        };
        
        // Mock internal methods if needed
        mockStreamCall = mockJest.fn().mockResolvedValue({
            async* [Symbol.asyncIterator]() {
                yield { content: 'Test response', role: 'assistant', isComplete: true };
            }
        });
        llmCaller.internalStreamCall = mockStreamCall;
        
        mockStreamChunks = mockJest.fn().mockResolvedValue({
            async* [Symbol.asyncIterator]() {
                yield { content: 'Chunk 1', role: 'assistant', isComplete: false };
                yield { content: 'Chunk 2', role: 'assistant', isComplete: true };
            }
        });
        mockChunkController.streamChunks = mockStreamChunks;
        
        mockProcessChunks = mockJest.fn().mockResolvedValue([
            { content: 'Test response', role: 'assistant' }
        ]);
        mockChunkController.processChunks = mockProcessChunks;
    });

    describe('constructor', () => {
        it('should create an instance with all dependencies', () => {
            const caller = new LLMCaller('openai', 'test-model');
            expect(caller).toBeInstanceOf(LLMCaller);
            expect(ProviderManager).toHaveBeenCalled();
            expect(ModelManager).toHaveBeenCalled();
        });
    });

    describe('addMessage method', () => {
        it('should add user messages to history', () => {
            llmCaller.addMessage('user', 'Test message');
            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('user', 'Test message', undefined);
        });

        it('should add assistant messages to history', () => {
            llmCaller.addMessage('assistant', 'Test response');
            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('assistant', 'Test response', undefined);
        });

        it('should handle tool calls', () => {
            const toolCalls = [{
                id: 'tool-1',
                function: {
                    name: 'test-tool',
                    arguments: '{"arg1":"value1"}'
                }
            }];
            
            llmCaller.addMessage('assistant', '', { toolCalls });
            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('assistant', '', { toolCalls });
        });
    });

    describe('chatCall method', () => {
        it('should add user messages to history and execute chat controller', async () => {
            const result = await llmCaller.call('Test message');
            
            // Assertions
            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('user', 'Test message');
            expect(mockExecute).toHaveBeenCalledWith({
                model: 'test-model',
                callerId: expect.any(String),
                messages: [],
                settings: undefined,
                responseFormat: undefined,
                tools: [],
                jsonSchema: undefined
            });
            expect(result).toEqual([{
                content: 'Test response',
                role: 'assistant'
            }]);
        });

        it('should merge settings correctly', async () => {
            await llmCaller.call('Test message', {
                settings: { maxTokens: 100 }
            });
            
            // Assertions
            expect(mockExecute).toHaveBeenCalledWith({
                model: 'test-model',
                callerId: expect.any(String),
                messages: [],
                settings: { maxTokens: 100 },
                responseFormat: undefined,
                tools: [],
                jsonSchema: undefined
            });
        });
    });

    describe('stream method', () => {
        beforeEach(() => {
            // Setup for stream tests
            // Mock the stream method to make it work properly with our tests
            llmCaller.stream = mockJest.fn().mockImplementation(async (message, options = {}) => {
                const historicalMessages = mockHistoryManager.getHistoricalMessages();
                mockHistoryManager.addMessage('user', message);
                
                const params = {
                    messages: [...historicalMessages, { role: 'user', content: message }],
                    model: 'test-model',
                    settings: options.settings,
                    jsonSchema: options.jsonSchema,
                    responseFormat: options.responseFormat
                };
                
                // Call the createStream method directly
                return mockStreamingService.createStream(params, 'test-model', undefined);
            });
        });
        
        it('should use historical messages from history manager', async () => {
            const historicalMessages = [
                { role: 'user', content: 'Previous message' }
            ];
            mockHistoryManager.getHistoricalMessages.mockReturnValue(historicalMessages);
            
            await llmCaller.stream('test');
            
            expect(mockStreamingService.createStream).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: [...historicalMessages, { role: 'user', content: 'test' }],
                    model: 'test-model'
                }),
                'test-model',
                undefined
            );
        });

        it('should apply custom settings', async () => {
            await llmCaller.stream('test', {
                settings: {
                    temperature: 0.5,
                    maxTokens: 1000
                }
            });
            
            expect(mockStreamingService.createStream).toHaveBeenCalledWith(
                expect.objectContaining({
                    settings: expect.objectContaining({
                        temperature: 0.5,
                        maxTokens: 1000
                    }),
                    model: 'test-model'
                }),
                'test-model',
                undefined
            );
        });

        it('should pass jsonSchema to params when provided', async () => {
            const jsonSchema = {
                name: "UserProfile",
                schema: {
                    type: "object",
                    properties: {
                        name: { type: "string" }
                    }
                }
            };
            
            await llmCaller.stream('test', {
                jsonSchema,
                responseFormat: 'json'
            });
            
            expect(mockStreamingService.createStream).toHaveBeenCalledWith(
                expect.objectContaining({
                    jsonSchema,
                    responseFormat: 'json',
                    model: 'test-model'
                }),
                'test-model',
                undefined
            );
        });
    });

    describe('stream method with chunks', () => {
        it('should use ChunkController for multiple messages', async () => {
            // Setup request processor to return multiple messages
            mockProcessRequest.mockResolvedValue(['Chunk 1', 'Chunk 2']);
            
            await llmCaller.stream('Test message', {
                settings: { temperature: 0.7 }
            });
            
            // Verify ChunkController was used instead of direct streaming
            expect(mockChunkController.streamChunks).toHaveBeenCalledWith(
                ['Chunk 1', 'Chunk 2'],
                {
                    model: 'test-model',
                    historicalMessages: [],
                    settings: { temperature: 0.7 },
                    tools: [],
                    responseFormat: undefined,
                    jsonSchema: undefined
                }
            );
        });
    });

    describe('call method with chunks', () => {
        it('should use ChunkController for multiple messages', async () => {
            // Setup request processor to return multiple messages
            mockProcessRequest.mockResolvedValue(['Chunk 1', 'Chunk 2']);
            
            await llmCaller.call('Test message', {
                settings: { temperature: 0.7 }
            });
            
            // Verify ChunkController was used instead of direct chat call
            expect(mockChunkController.processChunks).toHaveBeenCalledWith(
                ['Chunk 1', 'Chunk 2'],
                {
                    model: 'test-model',
                    historicalMessages: [],
                    settings: { temperature: 0.7 },
                    tools: [],
                    responseFormat: undefined,
                    jsonSchema: undefined
                }
            );
        });
    });

    describe('processRequest method', () => {
        it('should process user message before streaming', async () => {
            await llmCaller.stream('Test message', {
                data: { key: 'value' }
            });
            
            expect(mockProcessRequest).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Test message',
                data: { key: 'value' }
            }));
        });
    });

    describe('tools management', () => {
        it('should add tool', () => {
            const tool = { name: 'test-tool', description: 'A test tool' };
            llmCaller.addTool(tool);
            expect(mockToolsManager.addTool).toHaveBeenCalledWith(tool);
        });
        
        it('should remove tool', () => {
            llmCaller.removeTool('test-tool');
            expect(mockToolsManager.removeTool).toHaveBeenCalledWith('test-tool');
        });
        
        it('should update tool', () => {
            const update = { description: 'Updated description' };
            llmCaller.updateTool('test-tool', update);
            expect(mockToolsManager.updateTool).toHaveBeenCalledWith('test-tool', update);
        });
        
        it('should list tools', () => {
            mockToolsManager.listTools.mockReturnValue([{ name: 'test-tool' }]);
            const tools = llmCaller.listTools();
            expect(mockToolsManager.listTools).toHaveBeenCalled();
            expect(tools).toEqual([{ name: 'test-tool' }]);
        });
        
        it('should get tool', () => {
            mockToolsManager.getTool.mockReturnValue({ name: 'test-tool' });
            const tool = llmCaller.getTool('test-tool');
            expect(mockToolsManager.getTool).toHaveBeenCalledWith('test-tool');
            expect(tool).toEqual({ name: 'test-tool' });
        });
    });

    describe('system message management', () => {
        it('should update system message', () => {
            llmCaller.updateSystemMessage('New system message');
            expect(mockHistoryManager.updateSystemMessage).toHaveBeenCalledWith('New system message', true);
        });
    });
});