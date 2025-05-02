import { StreamingService } from '../../../core/streaming/StreamingService';
import { HistoryManager } from '../../../core/history/HistoryManager';
import { TokenCalculator } from '../../../core/models/TokenCalculator';
import { ToolController } from '../../../core/tools/ToolController';
import { ToolsManager } from '../../../core/tools/ToolsManager';
import { ToolOrchestrator } from '../../../core/tools/ToolOrchestrator';
import { StreamHandler } from '../../../core/streaming/StreamHandler';
import type { ToolDefinition, ToolCall } from '../../../types/tooling';
import type { UniversalStreamResponse, UniversalChatParams, UniversalMessage } from '../../../interfaces/UniversalInterfaces';

// Mock TokenCalculator implementation
jest.mock('../../../core/models/TokenCalculator', () => {
    return {
        TokenCalculator: jest.fn().mockImplementation(() => ({
            calculateTokens: jest.fn().mockReturnValue({ total: 10 })
        }))
    };
});

// Create a mock adapter for testing
const mockProviderAdapter = {
    streamCall: jest.fn()
};

describe('Tool Calling with Streaming', () => {
    // Set up test data
    const mockToolFunction = jest.fn().mockResolvedValue({ result: 'Tool executed successfully' });
    const testTool: ToolDefinition = {
        name: 'test_streaming_tool',
        description: 'A test tool for streaming integration tests',
        parameters: { type: 'object', properties: { param: { type: 'string' } }, required: ['param'] },
        callFunction: mockToolFunction
    };

    let historyManager: HistoryManager;
    let tokenCalculator: TokenCalculator;
    let toolsManager: ToolsManager;
    let toolController: ToolController;
    let toolOrchestrator: ToolOrchestrator;
    let streamHandler: StreamHandler;
    let streamingService: StreamingService;

    beforeEach(() => {
        jest.clearAllMocks();

        // Initialize components
        historyManager = new HistoryManager('System message');
        tokenCalculator = new TokenCalculator();

        // Create and set up tools
        toolsManager = new ToolsManager();
        toolsManager.addTool(testTool);

        // Create controllers with appropriate dependencies
        toolController = new ToolController(toolsManager);
        toolOrchestrator = new ToolOrchestrator(toolController, historyManager);

        // Create stream handler manually to avoid complex constructor
        streamHandler = new StreamHandler(
            tokenCalculator,
            historyManager,
            undefined,  // responseProcessor - we'll skip this for the test
            undefined,  // usageCallback
            undefined,  // callerId
            toolController,
            toolOrchestrator
        );

        // Create StreamingService with all dependencies
        streamingService = new StreamingService(
            mockProviderAdapter as any,
            tokenCalculator,
            historyManager,
            streamHandler,
            toolController
        );

        // THIS IS THE CRITICAL STEP - Set the ToolOrchestrator on the StreamingService
        // This is what we fixed in LLMCaller.ts
        streamingService.setToolOrchestrator(toolOrchestrator);
    });

    test('should execute tools during streaming and continue with results', async () => {
        // First mock: Return a tool call
        mockProviderAdapter.streamCall.mockImplementationOnce(async function* () {
            yield {
                role: 'assistant',
                content: '',
                toolCalls: [{
                    id: 'tool_call_123',
                    name: 'test_streaming_tool',
                    arguments: { param: 'test_value' }
                }],
                isComplete: true,
                metadata: { finishReason: 'tool_calls' }
            };
        });

        // Second mock: Return response after tool execution
        mockProviderAdapter.streamCall.mockImplementationOnce(async function* () {
            yield {
                role: 'assistant',
                content: 'Tool executed with result: success',
                isComplete: true,
                metadata: { finishReason: 'stop' }
            };
        });

        // Create chat params
        const params: UniversalChatParams = {
            model: 'test-model',
            messages: [
                { role: 'system', content: 'System message' },
                { role: 'user', content: 'Use the test tool with param=test_value' }
            ],
            tools: [testTool]
        };

        // Call createStream and collect the results
        const stream = await streamingService.createStream(params, 'test-model');

        // Collect all chunks from the stream
        const receivedChunks: UniversalStreamResponse[] = [];
        for await (const chunk of stream) {
            receivedChunks.push(chunk);
        }

        // Verify the tool was called with correct arguments
        expect(mockToolFunction).toHaveBeenCalledTimes(1);
        expect(mockToolFunction).toHaveBeenCalledWith({ param: 'test_value' });

        // Verify we got a stream continuation after the tool call
        expect(mockProviderAdapter.streamCall).toHaveBeenCalledTimes(2);

        // Check that we got a "stop" finishReason in one of the chunks
        expect(receivedChunks.some(chunk => chunk.metadata?.finishReason === 'stop')).toBe(true);

        // Check that we got the content from the second stream call
        expect(receivedChunks.some(chunk =>
            chunk.content && chunk.content.includes('Tool executed with result')
        )).toBe(true);

        // Check that the tool result was added to history
        const history = historyManager.getMessages();
        expect(history.some((msg: UniversalMessage) =>
            msg.role === 'tool' &&
            msg.toolCallId === 'tool_call_123' &&
            msg.content && msg.content.includes('Tool executed successfully')
        )).toBe(true);
    });

    // Add a debug test that directly tests StreamHandler
    test('should directly process tool calls in StreamHandler', async () => {
        // Create a direct test of StreamHandler.processStream
        const mockStream = async function* () {
            yield {
                role: 'assistant',
                content: '',
                toolCalls: [{
                    id: 'direct_test_call',
                    name: 'test_streaming_tool',
                    arguments: { param: 'direct_test' }
                }],
                isComplete: true,
                metadata: { finishReason: 'tool_calls' }
            };
        }();

        // Connect StreamHandler to StreamingService so it can make continuation calls
        streamHandler = new StreamHandler(
            tokenCalculator,
            historyManager,
            undefined,
            undefined,
            undefined,
            toolController,
            toolOrchestrator,
            streamingService // Pass streamingService
        );

        // Create mock modelInfo
        const mockModelInfo = {
            name: 'test-model',
            inputPricePerMillion: 0,
            outputPricePerMillion: 0,
            maxRequestTokens: 4000,
            maxResponseTokens: 1000,
            capabilities: {
                toolCalls: true,
                streaming: true,
                input: { text: true },
                output: { text: { textOutputFormats: ['text'] } }
            }
        };

        // Direct call to processStream
        const processedStream = streamHandler.processStream(
            mockStream,
            {
                model: 'test-model',
                messages: [],
                tools: [testTool]
            },
            10,
            mockModelInfo
        );

        // Process the stream
        const receivedChunks: UniversalStreamResponse[] = [];
        for await (const chunk of processedStream) {
            receivedChunks.push(chunk);
            console.log('Received chunk:', JSON.stringify(chunk, null, 2));
        }

        // Verify the tool was called directly
        expect(mockToolFunction).toHaveBeenCalledTimes(1);
        expect(mockToolFunction).toHaveBeenCalledWith({ param: 'direct_test' });

        // Verify we have tool execution in the history
        const history = historyManager.getMessages();
        expect(history.some((msg: UniversalMessage) =>
            msg.role === 'tool' &&
            msg.toolCallId === 'direct_test_call'
        )).toBe(true);

        // Verify the continuation stream was requested
        expect(mockProviderAdapter.streamCall).toHaveBeenCalledTimes(1);
    });
}); 