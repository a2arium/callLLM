import { ToolOrchestrator } from '../../../../core/tools/ToolOrchestrator';
import { ToolController } from '../../../../core/tools/ToolController';
import { ChatController } from '../../../../core/chat/ChatController';
import { ToolsManager } from '../../../../core/tools/ToolsManager';
import type { ToolDefinition } from '../../../../core/types';
import type { UniversalChatResponse, UniversalMessage, UniversalChatParams } from '../../../../interfaces/UniversalInterfaces';
import type { ProviderManager } from '../../../../core/caller/ProviderManager';
import type { ModelManager } from '../../../../core/models/ModelManager';
import type { ResponseProcessor } from '../../../../core/processors/ResponseProcessor';
import type { RetryManager } from '../../../../core/retry/RetryManager';
import type { UsageTracker } from '../../../../core/telemetry/UsageTracker';

describe('ToolOrchestrator', () => {
    let toolOrchestrator: ToolOrchestrator;
    let chatController: jest.Mocked<ChatController>;
    let toolController: jest.Mocked<ToolController>;

    beforeEach(() => {
        chatController = {
            execute: jest.fn(),
        } as unknown as jest.Mocked<ChatController>;

        toolController = {
            processToolCalls: jest.fn(),
            resetIterationCount: jest.fn(),
            toolsManager: {} as any,
            iterationCount: 0,
            maxIterations: 10,
            toolCallParser: {} as any,
        } as unknown as jest.Mocked<ToolController>;

        toolOrchestrator = new ToolOrchestrator(toolController, chatController);
    });

    describe('processResponse', () => {
        it('should handle a complete tool execution cycle', async () => {
            const initialResponse: UniversalChatResponse = {
                role: 'assistant',
                content: '<tool>testTool:{}</tool>',
                metadata: {},
            };

            toolController.processToolCalls.mockResolvedValueOnce({
                toolCalls: [{
                    name: 'testTool',
                    parameters: {},
                    result: 'Tool execution successful',
                }],
                messages: [{ role: 'tool', content: 'Tool execution successful' }],
                requiresResubmission: true,
            });

            const finalResponse: UniversalChatResponse = {
                role: 'assistant',
                content: 'Final response',
                metadata: {},
            };
            chatController.execute.mockResolvedValueOnce(finalResponse);

            const result = await toolOrchestrator.processResponse(initialResponse, {
                model: 'gpt-4',
                systemMessage: 'System message',
                historicalMessages: [{ role: 'system', content: 'System message' }],
            });

            expect(result.toolExecutions).toHaveLength(1);
            expect(result.toolExecutions[0].result).toBe('Tool execution successful');
            expect(result.finalResponse.content).toBe('Final response');
        });

        it('should handle history trimming when exceeding maxHistoryLength', async () => {
            const historicalMessages: UniversalMessage[] = [
                { role: 'system', content: 'System message' },
                ...Array.from({ length: 20 }, (_, i) => ({
                    role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
                    content: `Message ${i}`,
                })),
            ];

            const initialResponse: UniversalChatResponse = {
                role: 'assistant',
                content: '<tool>testTool:{}</tool>',
                metadata: {},
            };

            toolController.processToolCalls.mockResolvedValueOnce({
                toolCalls: [{
                    name: 'testTool',
                    parameters: {},
                    result: 'Tool execution successful',
                }],
                messages: [{ role: 'tool', content: 'Tool execution successful' }],
                requiresResubmission: true,
            });

            const finalResponse: UniversalChatResponse = {
                role: 'assistant',
                content: 'Final response',
                metadata: {},
            };
            chatController.execute.mockResolvedValueOnce(finalResponse);

            await toolOrchestrator.processResponse(initialResponse, {
                model: 'gpt-4',
                systemMessage: 'System message',
                historicalMessages,
                maxHistoryLength: 10,
            });

            expect(chatController.execute).toHaveBeenCalled();
            const executeCall = chatController.execute.mock.calls[0]?.[0];
            expect(executeCall?.historicalMessages).toBeDefined();
            expect(executeCall?.historicalMessages?.length).toBeLessThanOrEqual(11); // 10 + system message
            expect(executeCall?.historicalMessages?.[0].role).toBe('system');
        });

        it('should handle errors and clean up resources', async () => {
            const initialResponse: UniversalChatResponse = {
                role: 'assistant',
                content: '<tool>testTool:{"shouldFail": true}</tool>',
                metadata: {},
            };

            const error = new Error('Tool error');
            toolController.processToolCalls.mockRejectedValueOnce(error);

            const result = await toolOrchestrator.processResponse(initialResponse, {
                model: 'gpt-4',
                systemMessage: 'System message',
                historicalMessages: [{ role: 'system', content: 'System message' }],
            });

            expect(result.toolExecutions).toHaveLength(1);
            expect(result.toolExecutions[0].error).toBe('Tool error');
            expect(result.finalResponse.content).toBe('An error occurred during tool execution: Tool error');
            expect(toolController.resetIterationCount).toHaveBeenCalled();
        });

        it('should handle null/undefined tool result', async () => {
            const initialResponse: UniversalChatResponse = {
                role: 'assistant',
                content: '<tool>testTool:{}</tool>',
                metadata: {},
            };

            toolController.processToolCalls.mockResolvedValueOnce({
                toolCalls: [],
                messages: [],
                requiresResubmission: false,
            });

            const result = await toolOrchestrator.processResponse(initialResponse, {
                model: 'gpt-4',
                systemMessage: 'System message',
                historicalMessages: [{ role: 'system', content: 'System message' }],
            });

            expect(result.toolExecutions).toHaveLength(0);
            expect(result.finalResponse.content).toBe('<tool>testTool:{}</tool>');
        });

        it('should handle tool result without toolCalls or messages', async () => {
            const initialResponse: UniversalChatResponse = {
                role: 'assistant',
                content: '<tool>testTool:{}</tool>',
                metadata: {},
            };

            toolController.processToolCalls.mockResolvedValueOnce({
                toolCalls: [],
                messages: [],
                requiresResubmission: false,
            });

            const result = await toolOrchestrator.processResponse(initialResponse, {
                model: 'gpt-4',
                systemMessage: 'System message',
                historicalMessages: [{ role: 'system', content: 'System message' }],
            });

            expect(result.toolExecutions).toHaveLength(0);
            expect(result.finalResponse.content).toBe('<tool>testTool:{}</tool>');
        });

        it('should handle non-Error errors', async () => {
            const initialResponse: UniversalChatResponse = {
                role: 'assistant',
                content: '<tool>testTool:{}</tool>',
                metadata: {},
            };

            toolController.processToolCalls.mockRejectedValueOnce('String error');

            const result = await toolOrchestrator.processResponse(initialResponse, {
                model: 'gpt-4',
                systemMessage: 'System message',
                historicalMessages: [{ role: 'system', content: 'System message' }],
            });

            expect(result.toolExecutions).toHaveLength(1);
            expect(result.toolExecutions[0].error).toBe('String error');
            expect(result.finalResponse.content).toBe('An error occurred during tool execution: String error');
        });

        describe('trimHistory', () => {
            it('should handle empty messages array', async () => {
                const initialResponse: UniversalChatResponse = {
                    role: 'assistant',
                    content: '<tool>testTool:{}</tool>',
                    metadata: {},
                };

                toolController.processToolCalls.mockResolvedValueOnce({
                    toolCalls: [{
                        name: 'testTool',
                        parameters: {},
                        result: 'Tool execution successful',
                    }],
                    messages: [{ role: 'tool', content: 'Tool execution successful' }],
                    requiresResubmission: true,
                });

                const finalResponse: UniversalChatResponse = {
                    role: 'assistant',
                    content: 'Final response',
                    metadata: {},
                };
                chatController.execute.mockResolvedValueOnce(finalResponse);

                await toolOrchestrator.processResponse(initialResponse, {
                    model: 'gpt-4',
                    systemMessage: '',
                    historicalMessages: [],
                });

                expect(chatController.execute).toHaveBeenCalled();
                const executeCall = chatController.execute.mock.calls[0]?.[0];
                expect(executeCall?.historicalMessages).toBeDefined();
                expect(executeCall?.historicalMessages?.length).toBe(2); // Assistant + tool message
            });

            it('should handle only system messages', async () => {
                const messages: UniversalMessage[] = [
                    { role: 'system', content: 'System 1' },
                    { role: 'system', content: 'System 2' },
                ];

                const initialResponse: UniversalChatResponse = {
                    role: 'assistant',
                    content: '<tool>testTool:{}</tool>',
                    metadata: {},
                };

                toolController.processToolCalls.mockResolvedValueOnce({
                    toolCalls: [{
                        name: 'testTool',
                        parameters: {},
                        result: 'Tool execution successful',
                    }],
                    messages: [{ role: 'tool', content: 'Tool execution successful' }],
                    requiresResubmission: true,
                });

                const finalResponse: UniversalChatResponse = {
                    role: 'assistant',
                    content: 'Final response',
                    metadata: {},
                };
                chatController.execute.mockResolvedValueOnce(finalResponse);

                await toolOrchestrator.processResponse(initialResponse, {
                    model: 'gpt-4',
                    systemMessage: '',
                    historicalMessages: messages,
                });

                const executeCall = chatController.execute.mock.calls[0]?.[0];
                expect(executeCall?.historicalMessages).toBeDefined();
                expect(executeCall?.historicalMessages?.length).toBe(4); // 2 system + assistant + tool message
            });

            it('should handle no system messages', async () => {
                const messages: UniversalMessage[] = [
                    { role: 'user', content: 'User 1' },
                    { role: 'assistant', content: 'Assistant 1' },
                    { role: 'user', content: 'User 2' },
                ];

                const initialResponse: UniversalChatResponse = {
                    role: 'assistant',
                    content: '<tool>testTool:{}</tool>',
                    metadata: {},
                };

                toolController.processToolCalls.mockResolvedValueOnce({
                    toolCalls: [{
                        name: 'testTool',
                        parameters: {},
                        result: 'Tool execution successful',
                    }],
                    messages: [{ role: 'tool', content: 'Tool execution successful' }],
                    requiresResubmission: true,
                });

                const finalResponse: UniversalChatResponse = {
                    role: 'assistant',
                    content: 'Final response',
                    metadata: {},
                };
                chatController.execute.mockResolvedValueOnce(finalResponse);

                await toolOrchestrator.processResponse(initialResponse, {
                    model: 'gpt-4',
                    systemMessage: '',
                    historicalMessages: messages,
                });

                const executeCall = chatController.execute.mock.calls[0]?.[0];
                expect(executeCall?.historicalMessages).toBeDefined();
                expect(executeCall?.historicalMessages?.length).toBe(5); // 3 original + assistant + tool message
            });
        });

        describe('Assistant Message Handling', () => {
            it('should not add assistant message when content only contains tool calls', async () => {
                const initialResponse: UniversalChatResponse = {
                    role: 'assistant',
                    content: '<tool>testTool:{}</tool>',
                    metadata: {},
                };

                toolController.processToolCalls.mockResolvedValueOnce({
                    toolCalls: [{
                        name: 'testTool',
                        parameters: {},
                        result: 'Tool execution successful',
                    }],
                    messages: [{ role: 'tool', content: 'Tool execution successful' }],
                    requiresResubmission: true,
                });

                const finalResponse: UniversalChatResponse = {
                    role: 'assistant',
                    content: 'Final response',
                    metadata: {},
                };
                chatController.execute.mockResolvedValueOnce(finalResponse);

                await toolOrchestrator.processResponse(initialResponse, {
                    model: 'gpt-4',
                    systemMessage: '',
                    historicalMessages: [],
                });

                const executeCall = chatController.execute.mock.calls[0]?.[0];
                expect(executeCall?.historicalMessages).toBeDefined();
                // Should only have tool messages, no assistant message
                expect(executeCall?.historicalMessages?.filter(m => m.role === 'assistant')).toHaveLength(0);
            });

            it('should add assistant message when content has text besides tool calls', async () => {
                const initialResponse: UniversalChatResponse = {
                    role: 'assistant',
                    content: 'Let me check that for you.\n<tool>testTool:{}</tool>',
                    metadata: {},
                };

                toolController.processToolCalls.mockResolvedValueOnce({
                    toolCalls: [{
                        name: 'testTool',
                        parameters: {},
                        result: 'Tool execution successful',
                    }],
                    messages: [{ role: 'tool', content: 'Tool execution successful' }],
                    requiresResubmission: true,
                });

                const finalResponse: UniversalChatResponse = {
                    role: 'assistant',
                    content: 'Final response',
                    metadata: {},
                };
                chatController.execute.mockResolvedValueOnce(finalResponse);

                await toolOrchestrator.processResponse(initialResponse, {
                    model: 'gpt-4',
                    systemMessage: '',
                    historicalMessages: [],
                });

                const executeCall = chatController.execute.mock.calls[0]?.[0];
                expect(executeCall?.historicalMessages).toBeDefined();
                // Should have the assistant message because it contains meaningful text
                const assistantMessages = executeCall?.historicalMessages?.filter(m => m.role === 'assistant');
                expect(assistantMessages).toHaveLength(1);
                expect(assistantMessages?.[0].content).toBe('Let me check that for you.\n<tool>testTool:{}</tool>');
            });

            it('should handle multiple tool calls without adding assistant message', async () => {
                const initialResponse: UniversalChatResponse = {
                    role: 'assistant',
                    content: '<tool>testTool1:{}</tool>\n<tool>testTool2:{}</tool>',
                    metadata: {},
                };

                toolController.processToolCalls.mockResolvedValueOnce({
                    toolCalls: [
                        {
                            name: 'testTool1',
                            parameters: {},
                            result: 'Tool 1 execution successful',
                        },
                        {
                            name: 'testTool2',
                            parameters: {},
                            result: 'Tool 2 execution successful',
                        }
                    ],
                    messages: [
                        { role: 'tool', content: 'Tool 1 execution successful' },
                        { role: 'tool', content: 'Tool 2 execution successful' }
                    ],
                    requiresResubmission: true,
                });

                const finalResponse: UniversalChatResponse = {
                    role: 'assistant',
                    content: 'Final response',
                    metadata: {},
                };
                chatController.execute.mockResolvedValueOnce(finalResponse);

                await toolOrchestrator.processResponse(initialResponse, {
                    model: 'gpt-4',
                    systemMessage: '',
                    historicalMessages: [],
                });

                const executeCall = chatController.execute.mock.calls[0]?.[0];
                expect(executeCall?.historicalMessages).toBeDefined();
                // Should have no assistant messages as content only contains tool calls
                expect(executeCall?.historicalMessages?.filter(m => m.role === 'assistant')).toHaveLength(0);
                // Should have both tool messages
                expect(executeCall?.historicalMessages?.filter(m => m.role === 'tool')).toHaveLength(2);
            });

            it('should handle OpenAI format tool calls', async () => {
                const initialResponse: UniversalChatResponse = {
                    role: 'assistant',
                    content: '',
                    metadata: {},
                    toolCalls: [
                        { name: 'testTool', arguments: { param: 'value' } }
                    ]
                };

                toolController.processToolCalls.mockResolvedValueOnce({
                    toolCalls: [{
                        name: 'testTool',
                        parameters: { param: 'value' },
                        result: 'Tool execution successful',
                    }],
                    messages: [{ role: 'tool', content: 'Tool execution successful' }],
                    requiresResubmission: true,
                });

                const finalResponse: UniversalChatResponse = {
                    role: 'assistant',
                    content: 'Final response',
                    metadata: {},
                };
                chatController.execute.mockResolvedValueOnce(finalResponse);

                await toolOrchestrator.processResponse(initialResponse, {
                    model: 'gpt-4',
                    systemMessage: '',
                    historicalMessages: [],
                });

                const executeCall = chatController.execute.mock.calls[0]?.[0];
                expect(executeCall?.historicalMessages).toBeDefined();
                // Should have no assistant messages as it's a pure tool call
                expect(executeCall?.historicalMessages?.filter(m => m.role === 'assistant')).toHaveLength(0);
            });
        });
    });
}); 