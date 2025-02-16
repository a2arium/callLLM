import { ToolOrchestrator } from '../../../core/tools/ToolOrchestrator';
import { ToolController } from '../../../core/tools/ToolController';
import { ChatController } from '../../../core/chat/ChatController';
import { ToolsManager } from '../../../core/tools/ToolsManager';
import type { ToolDefinition } from '../../../core/types';
import type { UniversalChatResponse, UniversalMessage } from '../../../interfaces/UniversalInterfaces';
import { StreamController } from '../../../core/streaming/StreamController';

// Mock ChatController
class MockChatController {
    constructor(private responses: string[]) {
        this.responses = [...responses];
    }

    async execute(): Promise<UniversalChatResponse> {
        const content = this.responses.shift() || 'No more responses';
        return { role: 'assistant', content, metadata: {} };
    }
}

// Add mock StreamController
const mockStreamController: StreamController = {
    createStream: jest.fn()
} as unknown as StreamController;

describe('ToolOrchestrator Integration', () => {
    let toolsManager: ToolsManager;
    let toolController: ToolController;
    let chatController: ChatController;
    let orchestrator: ToolOrchestrator;

    beforeEach(() => {
        toolsManager = new ToolsManager();
        toolController = new ToolController(toolsManager);
    });

    describe('Tool Execution Flow', () => {
        it('should handle a complete tool execution cycle', async () => {
            // Setup mock tools
            const mockWeatherTool: ToolDefinition = {
                name: 'getWeather',
                description: 'Get weather for a location',
                parameters: {
                    type: 'object',
                    properties: {
                        location: { type: 'string' }
                    }
                },
                callFunction: jest.fn().mockResolvedValue('Sunny, 22°C')
            };

            const mockTimeTool: ToolDefinition = {
                name: 'getTime',
                description: 'Get current time for a location',
                parameters: {
                    type: 'object',
                    properties: {
                        location: { type: 'string' }
                    }
                },
                callFunction: jest.fn().mockResolvedValue('14:30 GMT')
            };

            toolsManager.addTool(mockWeatherTool);
            toolsManager.addTool(mockTimeTool);

            // Setup mock chat responses
            const mockChatController = new MockChatController([
                'Based on the weather and time data: It\'s a sunny afternoon in London!'
            ]);

            orchestrator = new ToolOrchestrator(
                toolController,
                mockChatController as unknown as ChatController,
                mockStreamController
            );

            // Initial response with tool calls
            const initialResponse: UniversalChatResponse = {
                role: 'assistant',
                content: `Let me check the weather and time in London.
                    <tool>getWeather:{"location": "London"}</tool>
                    <tool>getTime:{"location": "London"}</tool>`,
                metadata: {}
            };

            const result = await orchestrator.processResponse(initialResponse, {
                model: 'gpt-4',
                systemMessage: 'You are a helpful assistant.',
                historicalMessages: []
            });

            // Verify tool executions
            expect(result.toolExecutions).toHaveLength(2);
            expect(result.toolExecutions[0].toolName).toBe('getWeather');
            expect(result.toolExecutions[1].toolName).toBe('getTime');
            expect(mockWeatherTool.callFunction).toHaveBeenCalledWith({ location: 'London' });
            expect(mockTimeTool.callFunction).toHaveBeenCalledWith({ location: 'London' });

            // Verify final response
            expect(result.finalResponse.content).toBe(
                'Based on the weather and time data: It\'s a sunny afternoon in London!'
            );
        });

        it('should handle tool execution errors gracefully', async () => {
            // Setup mock tool that throws an error
            const mockErrorTool: ToolDefinition = {
                name: 'errorTool',
                description: 'A tool that throws an error',
                parameters: {
                    type: 'object',
                    properties: {}
                },
                callFunction: jest.fn().mockRejectedValue(new Error('Tool execution failed'))
            };

            toolsManager.addTool(mockErrorTool);

            // Setup mock chat responses
            const mockChatController = new MockChatController([
                'I encountered an error while executing the tool.'
            ]);

            orchestrator = new ToolOrchestrator(
                toolController,
                mockChatController as unknown as ChatController,
                mockStreamController
            );

            const initialResponse: UniversalChatResponse = {
                role: 'assistant',
                content: '<tool>errorTool:{}</tool>',
                metadata: {}
            };

            const result = await orchestrator.processResponse(initialResponse, {
                model: 'gpt-4',
                systemMessage: 'You are a helpful assistant.',
                historicalMessages: []
            });

            expect(result.toolExecutions).toHaveLength(1);
            expect(result.toolExecutions[0].error).toBeDefined();
            expect(result.toolExecutions[0].error).toContain('Tool execution failed');
        });

        it('should handle multiple tool execution cycles', async () => {
            // Setup mock tool
            const mockTool: ToolDefinition = {
                name: 'testTool',
                description: 'Test tool',
                parameters: {
                    type: 'object',
                    properties: {
                        param: { type: 'string' }
                    }
                },
                callFunction: jest.fn()
                    .mockResolvedValueOnce('First result')
                    .mockResolvedValueOnce('Second result')
            };

            toolsManager.addTool(mockTool);

            // Setup mock chat responses that include another tool call
            const mockChatController = new MockChatController([
                'First response with tool call <tool>testTool:{"param": "second"}</tool>',
                'Final response without tool calls'
            ]);

            orchestrator = new ToolOrchestrator(
                toolController,
                mockChatController as unknown as ChatController,
                mockStreamController
            );

            const initialResponse: UniversalChatResponse = {
                role: 'assistant',
                content: '<tool>testTool:{"param": "first"}</tool>',
                metadata: {}
            };

            const result = await orchestrator.processResponse(initialResponse, {
                model: 'gpt-4',
                systemMessage: 'You are a helpful assistant.',
                historicalMessages: []
            });

            expect(result.toolExecutions).toHaveLength(2);
            expect(mockTool.callFunction).toHaveBeenCalledTimes(2);
            expect(result.finalResponse.content).toBe('Final response without tool calls');
        });

        it('should preserve conversation history', async () => {
            const mockTool: ToolDefinition = {
                name: 'testTool',
                description: 'Test tool',
                parameters: {
                    type: 'object',
                    properties: {}
                },
                callFunction: jest.fn().mockResolvedValue('Tool result')
            };

            toolsManager.addTool(mockTool);

            const historicalMessages: UniversalMessage[] = [
                { role: 'user', content: 'Initial question' },
                { role: 'assistant', content: 'Initial response' }
            ];

            const mockChatController = new MockChatController([
                'Final response'
            ]);

            orchestrator = new ToolOrchestrator(
                toolController,
                mockChatController as unknown as ChatController,
                mockStreamController
            );

            const initialResponse: UniversalChatResponse = {
                role: 'assistant',
                content: '<tool>testTool:{}</tool>',
                metadata: {}
            };

            const result = await orchestrator.processResponse(initialResponse, {
                model: 'gpt-4',
                systemMessage: 'You are a helpful assistant.',
                historicalMessages
            });

            expect(result.toolExecutions).toHaveLength(1);
            expect(result.finalResponse.content).toBe('Final response');
        });
    });
}); 