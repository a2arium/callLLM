import { ChatController } from '../../../../core/chat/ChatController';
import { StreamingService } from '../../../../core/streaming/StreamingService';
import { type UniversalChatParams, type UniversalStreamResponse, type ModelInfo, type Usage } from '../../../../interfaces/UniversalInterfaces';
import { type ToolDefinition, type ToolCall } from '../../../../types/tooling';
import { type RegisteredProviders } from '../../../../adapters';
import { UsageTracker } from '../../../../core/telemetry/UsageTracker';
import { RequestProcessor } from '../../../../core/processors/RequestProcessor';
import { ProviderManager } from '../../../../core/caller/ProviderManager';
import { ModelManager } from '../../../../core/models/ModelManager';
import { LLMCaller } from '../../../../core/caller/LLMCaller';
import { HistoryManager } from '../../../../core/history/HistoryManager';
import { ProviderNotFoundError } from '../../../../adapters/types';
import { UniversalChatResponse, UniversalMessage, FinishReason } from '../../../../interfaces/UniversalInterfaces';
import { ContentAccumulator } from '../../../../core/streaming/processors/ContentAccumulator';
import { StreamHandler } from '../../../../core/streaming/StreamHandler';
import { ToolsManager } from '../../../../core/tools/ToolsManager';
import { TokenCalculator } from '../../../../core/models/TokenCalculator';
import { ResponseProcessor } from '../../../../core/processors/ResponseProcessor';
import { RetryManager } from '../../../../core/retry/RetryManager';

describe('LLMCaller - Model Management', () => {
    let mockProviderManager: jest.Mocked<ProviderManager>;
    let mockModelManager: jest.Mocked<ModelManager>;
    let mockTokenCalculator: jest.Mocked<TokenCalculator>;
    let mockResponseProcessor: jest.Mocked<ResponseProcessor>;
    let mockRetryManager: jest.Mocked<RetryManager>;
    let mockHistoryManager: jest.Mocked<HistoryManager>;
    let mockToolsManager: jest.Mocked<ToolsManager>;
    let mockChatController: jest.Mocked<ChatController>;
    let mockStreamingService: jest.Mocked<StreamingService>;
    let mockRequestProcessor: jest.Mocked<RequestProcessor>;
    let llmCaller: LLMCaller;

    beforeEach(() => {
        mockProviderManager = {
            getProvider: jest.fn(),
        } as unknown as jest.Mocked<ProviderManager>;

        mockModelManager = {
            getModel: jest.fn().mockReturnValue({ name: 'test-model', provider: 'test-provider' }),
        } as unknown as jest.Mocked<ModelManager>;

        mockTokenCalculator = {
            calculateTotalTokens: jest.fn().mockResolvedValue(100),
        } as unknown as jest.Mocked<TokenCalculator>;

        mockResponseProcessor = {
            processResponse: jest.fn(),
        } as unknown as jest.Mocked<ResponseProcessor>;

        mockRetryManager = {
            executeWithRetry: jest.fn(),
        } as unknown as jest.Mocked<RetryManager>;

        mockHistoryManager = {
            addMessage: jest.fn(),
            getHistoricalMessages: jest.fn().mockReturnValue([]),
            updateSystemMessage: jest.fn(),
            setHistoricalMessages: jest.fn(),
            clearHistory: jest.fn(),
            getLastMessageByRole: jest.fn(),
            getLastMessages: jest.fn(),
            serializeHistory: jest.fn(),
            getHistorySummary: jest.fn(),
            getMessages: jest.fn().mockReturnValue([]),
            deserializeHistory: jest.fn(),
            initializeWithSystemMessage: jest.fn()
        } as unknown as jest.Mocked<HistoryManager>;

        const mockTool = {
            name: 'test-tool',
            description: 'A test tool',
            parameters: {
                type: 'object',
                properties: {
                    param1: {
                        type: 'string',
                        description: 'Test parameter'
                    }
                },
                required: ['param1']
            }
        };

        mockToolsManager = {
            addTool: jest.fn(),
            removeTool: jest.fn(),
            updateTool: jest.fn(),
            getTool: jest.fn().mockReturnValue(mockTool),
            listTools: jest.fn().mockReturnValue([mockTool])
        } as unknown as jest.Mocked<ToolsManager>;

        mockChatController = {
            execute: jest.fn(),
        } as unknown as jest.Mocked<ChatController>;

        mockStreamingService = {
            createStream: jest.fn(),
        } as unknown as jest.Mocked<StreamingService>;

        mockRequestProcessor = {
            processRequest: jest.fn(),
        } as unknown as jest.Mocked<RequestProcessor>;

        llmCaller = new LLMCaller('openai', 'test-model', 'system message', {
            providerManager: mockProviderManager,
            modelManager: mockModelManager,
            tokenCalculator: mockTokenCalculator,
            responseProcessor: mockResponseProcessor,
            retryManager: mockRetryManager,
            historyManager: mockHistoryManager,
            toolsManager: mockToolsManager,
            chatController: mockChatController,
            streamingService: mockStreamingService
        });
    });

    describe('streaming', () => {
        it('should stream responses without chunking', async () => {
            const message = 'test message';
            const mockStream = [
                { contentText: 'partial', role: 'assistant', isComplete: false },
                { contentText: 'complete', role: 'assistant', isComplete: true }
            ];
            mockStreamingService.createStream.mockResolvedValue(async function* () {
                for (const chunk of mockStream) {
                    yield chunk as UniversalStreamResponse;
                }
            }());

            const stream = await llmCaller.stream(message);
            const responses = [];
            for await (const response of stream) {
                responses.push(response);
            }

            // Verify message was added to history
            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('user', message);

            // Verify stream was created
            expect(mockStreamingService.createStream).toHaveBeenCalledWith(
                expect.objectContaining({
                    callerId: expect.any(String)
                }),
                'test-model',
                undefined
            );

            // Verify responses were collected
            expect(responses).toEqual([
                { contentText: 'partial', role: 'assistant', isComplete: false },
                { contentText: 'complete', role: 'assistant', isComplete: true }
            ]);

            // Verify final message was added to history
            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('user', message);
        });
    });

    test('should handle provider not found error', async () => {
        mockModelManager.getModel.mockReturnValue({
            name: 'gpt-4',
            inputPricePerMillion: 1,
            outputPricePerMillion: 1,
            maxRequestTokens: 1000,
            maxResponseTokens: 1000,
            characteristics: {
                qualityIndex: 1,
                outputSpeed: 1,
                firstTokenLatency: 1
            }
        });
        mockProviderManager.getProvider.mockImplementation(() => {
            throw new ProviderNotFoundError('test-provider');
        });
        mockChatController.execute.mockImplementation(async (params) => {
            throw new ProviderNotFoundError('test-provider');
        });

        await expect(llmCaller.call('test message', {
            settings: { stream: false }
        })).rejects.toThrow('Provider "test-provider" not found in registry');
    });

    describe('tool management', () => {
        const mockTool: ToolDefinition = {
            name: 'test-tool',
            description: 'A test tool',
            parameters: {
                type: 'object',
                properties: {
                    param1: { type: 'string', description: 'Test parameter' }
                },
                required: ['param1']
            }
        };

        it('should add and retrieve a tool', () => {
            llmCaller.addTool(mockTool);
            const retrievedTool = llmCaller.getTool(mockTool.name);

            expect(mockToolsManager.addTool).toHaveBeenCalledWith(mockTool);
            expect(mockToolsManager.getTool).toHaveBeenCalledWith(mockTool.name);
            expect(retrievedTool).toEqual(mockTool);
        });

        it('should remove a tool', () => {
            llmCaller.addTool(mockTool);
            llmCaller.removeTool(mockTool.name);
            expect(mockToolsManager.removeTool).toHaveBeenCalledWith(mockTool.name);
        });

        it('should update a tool', () => {
            llmCaller.addTool(mockTool);
            const update = { description: 'Updated description' };
            llmCaller.updateTool(mockTool.name, update);
            expect(mockToolsManager.updateTool).toHaveBeenCalledWith(mockTool.name, update);
        });

        it('should list all tools', () => {
            llmCaller.addTool(mockTool);
            const tools = llmCaller.listTools();
            expect(mockToolsManager.listTools).toHaveBeenCalled();
            expect(tools).toEqual([mockTool]);
        });
    });

    describe('message chunking and history', () => {
        it('should handle chunked messages in call', async () => {
            const message = 'test message';
            mockRequestProcessor.processRequest.mockResolvedValue(['chunk1', 'chunk2']);
            mockChatController.execute.mockResolvedValue({
                content: 'response1',
                role: 'assistant',
                metadata: { finishReason: FinishReason.TOOL_CALLS },
                toolCalls: [{ id: 'tool1', name: 'test-tool', arguments: { param1: 'value1' } }]
            });

            const responses = await llmCaller.call(message);

            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('user', message);
            expect(mockHistoryManager.getHistoricalMessages).toHaveBeenCalled();
            expect(responses).toHaveLength(1);
            expect(responses[0].content).toBe('response1');
        });

        it('should handle chunked messages in stream', async () => {
            const message = 'test message';
            mockRequestProcessor.processRequest.mockResolvedValue(['chunk1', 'chunk2']);
            const mockStream = [
                { contentText: 'partial', role: 'assistant', isComplete: false },
                { contentText: 'complete', role: 'assistant', isComplete: true }
            ];
            mockStreamingService.createStream.mockResolvedValue(async function* () {
                for (const chunk of mockStream) {
                    yield chunk as UniversalStreamResponse;
                }
            }());

            const stream = await llmCaller.stream(message);
            const responses = [];
            for await (const response of stream) {
                responses.push(response);
            }

            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('user', message);
            expect(mockHistoryManager.getHistoricalMessages).toHaveBeenCalled();
            expect(responses).toHaveLength(2);
        });
    });

    describe('history management', () => {
        const testMessage: UniversalMessage = {
            role: 'user',
            content: 'test message'
        };

        it('should add and retrieve messages', () => {
            llmCaller.addMessage('user', 'test message');
            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('user', 'test message', undefined);
        });

        it('should handle null content in messages', () => {
            llmCaller.addMessage('assistant', null, { toolCalls: [{ id: '1', name: 'test', arguments: { param1: 'value1' } }] });
            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('assistant', '', { toolCalls: [{ id: '1', name: 'test', arguments: { param1: 'value1' } }] });
        });

        it('should clear history and restore system message', () => {
            llmCaller.clearHistory();
            expect(mockHistoryManager.clearHistory).toHaveBeenCalled();
            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('system', 'system message');
        });

        it('should set historical messages', () => {
            const messages = [testMessage];
            llmCaller.setHistoricalMessages(messages);
            expect(mockHistoryManager.setHistoricalMessages).toHaveBeenCalledWith(messages);
        });

        it('should get last message by role', () => {
            mockHistoryManager.getLastMessageByRole.mockReturnValue(testMessage);
            const result = llmCaller.getLastMessageByRole('user');
            expect(mockHistoryManager.getLastMessageByRole).toHaveBeenCalledWith('user');
            expect(result).toEqual(testMessage);
        });

        it('should get last n messages', () => {
            const messages = [testMessage];
            mockHistoryManager.getLastMessages.mockReturnValue(messages);
            const result = llmCaller.getLastMessages(1);
            expect(mockHistoryManager.getLastMessages).toHaveBeenCalledWith(1);
            expect(result).toEqual(messages);
        });
    });

    describe('tool results and history serialization', () => {
        it('should add tool result', () => {
            const toolCallId = 'test-id';
            const result = 'test result';
            const toolName = 'test-tool';

            llmCaller.addToolResult(toolCallId, result, toolName);
            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('tool', result, { toolCallId, name: toolName });
        });

        it('should handle tool result errors', () => {
            const toolCallId = 'test-id';
            const result = 'error message';
            const toolName = 'test-tool';

            llmCaller.addToolResult(toolCallId, result, toolName, true);
            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('tool', `Error processing tool test-tool: error message`, { toolCallId, name: toolName });
        });

        it('should serialize and deserialize history', () => {
            const serializedHistory = '[{"role":"user","content":"test"}]';
            mockHistoryManager.serializeHistory.mockReturnValue(serializedHistory);
            mockHistoryManager.getHistoricalMessages.mockReturnValue([{ role: 'system', content: 'new system message' }]);

            const result = llmCaller.serializeHistory();
            expect(result).toBe(serializedHistory);

            llmCaller.deserializeHistory(serializedHistory);
            expect(mockHistoryManager.deserializeHistory).toHaveBeenCalledWith(serializedHistory);
        });

        it('should update system message', () => {
            const newSystemMessage = 'new system message';
            llmCaller.updateSystemMessage(newSystemMessage);
            expect(mockHistoryManager.updateSystemMessage).toHaveBeenCalledWith(newSystemMessage, true);
        });

        it('should get history summary', () => {
            const summary = [{
                role: 'user',
                contentPreview: 'test',
                hasToolCalls: false
            }];
            mockHistoryManager.getHistorySummary.mockReturnValue(summary);

            const options = { includeSystemMessages: true, maxContentLength: 100 };
            const result = llmCaller.getHistorySummary(options);
            expect(mockHistoryManager.getHistorySummary).toHaveBeenCalledWith(options);
            expect(result).toEqual(summary);
        });

        it('should handle tool result without toolCallId', () => {
            const result = 'test result';
            const toolName = 'test-tool';

            llmCaller.addToolResult('', result, toolName);
            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('tool', result, { name: toolName });
        });

        it('should handle deprecated addToolCallToHistory', () => {
            const toolName = 'test-tool';
            const args = { param1: 'value1' };
            const result = 'test result';

            llmCaller.addToolCallToHistory(toolName, args, result);
            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('tool', result, {
                toolCallId: expect.stringMatching(/^deprecated_tool_\d+$/),
                name: toolName
            });
        });

        it('should handle deprecated addToolCallToHistory with error', () => {
            const toolName = 'test-tool';
            const args = { param1: 'value1' };
            const error = 'test error';

            llmCaller.addToolCallToHistory(toolName, args, undefined, error);
            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('tool', `Error processing tool test-tool: Error: ${error}`, {
                toolCallId: expect.stringMatching(/^deprecated_tool_\d+$/),
                name: toolName
            });
        });

        it('should get HistoryManager instance', () => {
            const historyManager = llmCaller.getHistoryManager();
            expect(historyManager).toBe(mockHistoryManager);
        });
    });

    describe('chunked messages with tool calls', () => {
        it('should handle chunked messages with tool calls and add to history', async () => {
            const message = 'test message';
            mockRequestProcessor.processRequest.mockResolvedValue(['chunk1', 'chunk2']);
            mockChatController.execute.mockResolvedValue({
                content: 'response1',
                role: 'assistant',
                metadata: { finishReason: FinishReason.TOOL_CALLS },
                toolCalls: [{ id: 'tool1', name: 'test-tool', arguments: { param1: 'value1' } }]
            });

            await llmCaller.call(message);

            // Verify that the user message is added to history
            expect(mockHistoryManager.addMessage).toHaveBeenCalledWith('user', message);

            // Since the response contains tool calls, it should not be added to history
            // as tool calls are handled by the ChatController
            expect(mockHistoryManager.addMessage).toHaveBeenCalledTimes(1);
        });
    });
});