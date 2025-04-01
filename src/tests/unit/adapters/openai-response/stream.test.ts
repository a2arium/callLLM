import { StreamHandler } from '../../../../adapters/openai/stream';
import { FinishReason } from '../../../../interfaces/UniversalInterfaces';
import { logger } from '../../../../utils/logger';
import type { ToolDefinition } from '../../../../types/tooling';
import type { ResponseStreamEvent } from '../../../../adapters/openai/types';
import type { Stream } from 'openai/streaming';

// Mock the logger
jest.mock('../../../../utils/logger', () => {
    // Create an internal mock logger for the warn test
    const mockWarnFn = jest.fn();

    // Mock the createLogger method to return a logger with our spied warn method
    const mockCreateLogger = jest.fn().mockImplementation(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: mockWarnFn,
        error: jest.fn()
    }));

    return {
        logger: {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            setConfig: jest.fn(),
            createLogger: mockCreateLogger
        }
    };
});

describe('StreamHandler', () => {
    // Sample tool definition for testing
    const testTool: ToolDefinition = {
        name: 'test_tool',
        description: 'A test tool',
        parameters: {
            type: 'object',
            properties: {
                param1: {
                    type: 'string',
                    description: 'A test parameter'
                }
            },
            required: ['param1']
        }
    };

    // Create a mock Stream of ResponseStreamEvent objects
    function createMockStream(events: ResponseStreamEvent[]): Stream<ResponseStreamEvent> {
        // Copy the events array to avoid mutation
        const eventsCopy = [...events];

        // Create proper async iterator
        const asyncIterator = {
            next: async (): Promise<IteratorResult<ResponseStreamEvent>> => {
                if (eventsCopy.length > 0) {
                    return { done: false, value: eventsCopy.shift()! };
                } else {
                    return { done: true, value: undefined };
                }
            }
        };

        // Create a mock stream object using type assertion to bypass property visibility restrictions
        const mockStream = {
            [Symbol.asyncIterator]: () => asyncIterator,
            controller: {} as any,
            tee: () => [
                createMockStream([...eventsCopy]),
                createMockStream([...eventsCopy])
            ],
            toReadableStream: () => new ReadableStream() as any
        } as Stream<ResponseStreamEvent>;

        // Add non-enumerable private property for internal use
        Object.defineProperty(mockStream, 'iterator', {
            value: asyncIterator,
            enumerable: false,
            writable: false
        });

        return mockStream;
    }

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should initialize without tools', () => {
        const streamHandler = new StreamHandler();
        expect((streamHandler as any).tools).toBeUndefined();
    });

    test('should initialize with tools', () => {
        const streamHandler = new StreamHandler([testTool]);
        expect((streamHandler as any).tools).toEqual([testTool]);
    });

    test('should update tools', () => {
        const streamHandler = new StreamHandler();
        streamHandler.updateTools([testTool]);
        expect((streamHandler as any).tools).toEqual([testTool]);
    });

    test('should handle text delta events', async () => {
        const streamHandler = new StreamHandler();

        const mockEvents = [
            {
                type: 'response.output_text.delta',
                delta: 'Hello',
            } as ResponseStreamEvent,
            {
                type: 'response.output_text.delta',
                delta: ' world',
            } as ResponseStreamEvent,
            {
                type: 'response.completed',
                response: {
                    id: 'resp_123',
                    model: 'gpt-4o',
                    status: 'completed'
                }
            } as ResponseStreamEvent
        ];

        const mockStream = createMockStream(mockEvents);
        const results = [];

        for await (const chunk of streamHandler.handleStream(mockStream)) {
            results.push(chunk);
        }

        expect(results.length).toBe(3);
        expect(results[0].content).toBe('Hello');
        expect(results[1].content).toBe(' world');
        expect(results[2].isComplete).toBe(true);
        expect(results[2].metadata?.finishReason).toBe(FinishReason.STOP);
    });

    test('should handle function call events', async () => {
        const streamHandler = new StreamHandler([testTool]);

        const mockEvents = [
            {
                type: 'response.output_item.added',
                item: {
                    type: 'function_call',
                    id: 'call_123',
                    name: 'test_tool'
                }
            } as ResponseStreamEvent,
            {
                type: 'response.function_call_arguments.delta',
                item_id: 'call_123',
                delta: '{"param1":"'
            } as ResponseStreamEvent,
            {
                type: 'response.function_call_arguments.delta',
                item_id: 'call_123',
                delta: 'test"}'
            } as ResponseStreamEvent,
            {
                type: 'response.function_call_arguments.done',
                item_id: 'call_123'
            } as ResponseStreamEvent,
            {
                type: 'response.completed',
                response: {
                    id: 'resp_123',
                    model: 'gpt-4o',
                    status: 'completed',
                    output: [
                        {
                            type: 'function_call',
                            id: 'call_123',
                            name: 'test_tool'
                        }
                    ]
                }
            } as ResponseStreamEvent
        ];

        const mockStream = createMockStream(mockEvents);
        const results = [];

        for await (const chunk of streamHandler.handleStream(mockStream)) {
            results.push(chunk);
        }

        expect(results.length).toBe(4);
        // Check tool call initialization
        expect(results[0].toolCallChunks?.[0].name).toBe('test_tool');
        expect(results[0].toolCallChunks?.[0].id).toBe('call_123');
        // Check first argument chunk
        expect(results[1].toolCallChunks?.[0].argumentsChunk).toBe('{"param1":"');
        // Check second argument chunk
        expect(results[2].toolCallChunks?.[0].argumentsChunk).toBe('test"}');
        // Check completion
        expect(results[3].isComplete).toBe(true);
        expect(results[3].metadata?.finishReason).toBe(FinishReason.TOOL_CALLS);
    });

    test('should handle content_part events', async () => {
        const streamHandler = new StreamHandler();

        // Cast to ResponseStreamEvent to bypass type checking for test mock
        const mockEvents = [
            {
                type: 'response.content_part.added',
                content: 'Hello',
                // Add minimum required properties
                content_index: 0,
                item_id: 'item_1',
                output_index: 0,
                part: {
                    type: 'text',
                    text: 'Hello',
                    annotations: []
                }
            } as unknown as ResponseStreamEvent,
            {
                type: 'response.content_part.added',
                content: ' world',
                content_index: 1,
                item_id: 'item_1',
                output_index: 0,
                part: {
                    type: 'text',
                    text: ' world',
                    annotations: []
                }
            } as unknown as ResponseStreamEvent,
            {
                type: 'response.content_part.done'
            } as ResponseStreamEvent,
            {
                type: 'response.completed',
                response: {
                    id: 'resp_123',
                    model: 'gpt-4o',
                    status: 'completed'
                }
            } as ResponseStreamEvent
        ];

        const mockStream = createMockStream(mockEvents);
        const results = [];

        for await (const chunk of streamHandler.handleStream(mockStream)) {
            results.push(chunk);
        }

        expect(results.length).toBe(3);
        expect(results[0].content).toBe('Hello');
        expect(results[1].content).toBe(' world');
        expect(results[2].isComplete).toBe(true);
    });

    test('should handle response.incomplete finish reason', async () => {
        const streamHandler = new StreamHandler();

        const mockEvents = [
            {
                type: 'response.output_text.delta',
                delta: 'This response is incomplete',
            } as ResponseStreamEvent,
            {
                type: 'response.incomplete'
            } as ResponseStreamEvent
        ];

        const mockStream = createMockStream(mockEvents);
        const results = [];

        for await (const chunk of streamHandler.handleStream(mockStream)) {
            results.push(chunk);
        }

        expect(results.length).toBe(2);
        expect(results[1].isComplete).toBe(true);
        expect(results[1].metadata?.finishReason).toBe(FinishReason.LENGTH);
    });

    test('should handle response.failed events', async () => {
        const streamHandler = new StreamHandler();

        // We're creating a mock that has the properties the code actually uses
        const mockEvents = [
            {
                type: 'response.output_text.delta',
                delta: 'This will fail',
            } as ResponseStreamEvent,
            {
                type: 'response.failed',
                error: { message: 'Test error' },
                // Adding a minimal valid response object with required fields
                response: {
                    id: 'resp_123',
                    created_at: new Date().toISOString(),
                    status: 'failed'
                }
            } as unknown as ResponseStreamEvent
        ];

        const mockStream = createMockStream(mockEvents);
        const results = [];

        for await (const chunk of streamHandler.handleStream(mockStream)) {
            results.push(chunk);
        }

        expect(results.length).toBe(2);
        expect(results[1].isComplete).toBe(true);
        expect(results[1].metadata?.finishReason).toBe(FinishReason.ERROR);
        expect(results[1].metadata?.toolError).toBe('Test error');
    });

    test('should reset state for each stream', async () => {
        const streamHandler = new StreamHandler();

        // First stream
        const mockEvents1 = [
            {
                type: 'response.output_text.delta',
                delta: 'First stream',
            } as ResponseStreamEvent,
            {
                type: 'response.completed',
                response: {
                    id: 'resp_1',
                    model: 'gpt-4o',
                    status: 'completed'
                }
            } as ResponseStreamEvent
        ];

        // Process first stream
        for await (const _ of streamHandler.handleStream(createMockStream(mockEvents1))) {
            // Just iterate
        }

        // Second stream with tool call
        const mockEvents2 = [
            {
                type: 'response.output_item.added',
                item: {
                    type: 'function_call',
                    id: 'call_123',
                    name: 'test_tool'
                }
            } as ResponseStreamEvent,
            {
                type: 'response.completed',
                response: {
                    id: 'resp_2',
                    model: 'gpt-4o',
                    status: 'completed',
                    output: [
                        {
                            type: 'function_call',
                            id: 'call_123',
                            name: 'test_tool'
                        }
                    ]
                }
            } as ResponseStreamEvent
        ];

        // Process second stream
        const results = [];
        for await (const chunk of streamHandler.handleStream(createMockStream(mockEvents2))) {
            results.push(chunk);
        }

        // Verify the second stream starts with a fresh tool call index
        expect(results[0].toolCallChunks?.[0].index).toBe(0);
    });

    test('should warn about unknown item_id in function call arguments', async () => {
        const streamHandler = new StreamHandler();

        // Get the mock logger's createLogger method
        const mockInternalLogger = (logger.createLogger as jest.Mock)().warn;

        const mockEvents = [
            {
                type: 'response.function_call_arguments.delta',
                item_id: 'unknown_id',
                delta: '{"param1":"test"}'
            } as ResponseStreamEvent,
            {
                type: 'response.completed',
                response: {
                    id: 'resp_123',
                    model: 'gpt-4o',
                    status: 'completed'
                }
            } as ResponseStreamEvent
        ];

        const mockStream = createMockStream(mockEvents);

        for await (const _ of streamHandler.handleStream(mockStream)) {
            // Just iterate
        }

        // Verify internal logger's warn was called
        expect(mockInternalLogger).toHaveBeenCalled();
    });

    test('should handle multiple tool calls with different IDs', async () => {
        const streamHandler = new StreamHandler([testTool]);

        const mockEvents = [
            // First tool call
            {
                type: 'response.output_item.added',
                item: {
                    type: 'function_call',
                    id: 'call_1',
                    name: 'tool_1'
                }
            } as ResponseStreamEvent,
            {
                type: 'response.function_call_arguments.delta',
                item_id: 'call_1',
                delta: '{"param1":"value1"}'
            } as ResponseStreamEvent,
            // Second tool call
            {
                type: 'response.output_item.added',
                item: {
                    type: 'function_call',
                    id: 'call_2',
                    name: 'tool_2'
                }
            } as ResponseStreamEvent,
            {
                type: 'response.function_call_arguments.delta',
                item_id: 'call_2',
                delta: '{"param2":"value2"}'
            } as ResponseStreamEvent,
            {
                type: 'response.completed',
                response: {
                    id: 'resp_123',
                    model: 'gpt-4o',
                    status: 'completed',
                    output: [
                        {
                            type: 'function_call',
                            id: 'call_1',
                            name: 'tool_1'
                        },
                        {
                            type: 'function_call',
                            id: 'call_2',
                            name: 'tool_2'
                        }
                    ]
                }
            } as ResponseStreamEvent
        ];

        const mockStream = createMockStream(mockEvents);
        const results = [];

        for await (const chunk of streamHandler.handleStream(mockStream)) {
            results.push(chunk);
        }

        // Verify that we get chunks for both tool calls with correct indices
        const toolCallChunks = results.filter(r => r.toolCallChunks).map(r => r.toolCallChunks?.[0]);

        // First tool call should have index 0
        expect(toolCallChunks[0]?.id).toBe('call_1');
        expect(toolCallChunks[0]?.index).toBe(0);

        // Second tool call should have index 1
        expect(toolCallChunks[2]?.id).toBe('call_2');
        expect(toolCallChunks[2]?.index).toBe(1);
    });
}); 