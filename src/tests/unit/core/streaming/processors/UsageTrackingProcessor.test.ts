import { UsageTrackingProcessor } from '../../../../../core/streaming/processors/UsageTrackingProcessor';
import { StreamChunk } from '../../../../../core/streaming/types';
import { ModelInfo } from '../../../../../interfaces/UniversalInterfaces';
import { UsageCallback } from '../../../../../interfaces/UsageInterfaces';

// Define a type for the usage metadata structure to help with type checking
type UsageMetadata = {
    usage: {
        tokens: {
            input: number;
            inputCached?: number;
            output: number;
            total: number;
        };
        incremental: number;
        costs: {
            input: number;
            inputCached?: number;
            output: number;
            total: number;
        };
    };
};

describe('UsageTrackingProcessor', () => {
    // Mock TokenCalculator
    const mockTokenCalculator = {
        calculateTokens: jest.fn(),
        calculateUsage: jest.fn(),
        calculateTotalTokens: jest.fn()
    };

    // Mock model info
    const mockModelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 1000,
        outputPricePerMillion: 2000,
        inputCachedPricePerMillion: 500,
        maxRequestTokens: 8000,
        maxResponseTokens: 2000,
        tokenizationModel: 'test-model',
        characteristics: {
            qualityIndex: 80,
            outputSpeed: 100,
            firstTokenLatency: 0.5
        },
        capabilities: {
            streaming: true,
            toolCalls: false,
            parallelToolCalls: false,
            batchProcessing: false,
            systemMessages: true,
            temperature: true,
            jsonMode: false
        }
    };

    // Test data
    const inputTokens = 50;
    const inputCachedTokens = 20;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should track token usage and add it to metadata', async () => {
        // Set up mock implementations with exact return values for token calculation
        mockTokenCalculator.calculateTokens
            .mockReturnValueOnce(5)   // First call: "Hello" -> 5 tokens
            .mockReturnValueOnce(11)  // Second call: "Hello world" -> 11 tokens
            .mockReturnValueOnce(11); // Third call: "Hello world!" -> 11 tokens

        // Create processor
        const processor = new UsageTrackingProcessor({
            tokenCalculator: mockTokenCalculator,
            inputTokens,
            modelInfo: mockModelInfo
        });

        // Create mock stream with separate content for each chunk
        const mockStream = createMockStream([
            { content: 'Hello', isComplete: false },
            { content: ' world', isComplete: false },
            { content: '!', isComplete: true }
        ]);

        // Process stream
        const results: StreamChunk[] = [];
        for await (const chunk of processor.processStream(mockStream)) {
            results.push(chunk);
        }

        // Verify results
        expect(results.length).toBe(3);

        // First chunk - 5 tokens
        const firstChunkMetadata = results[0].metadata as UsageMetadata;
        expect(firstChunkMetadata.usage.tokens.output).toBe(5);
        expect(firstChunkMetadata.usage.tokens.input).toBe(inputTokens);
        expect(firstChunkMetadata.usage.tokens.total).toBe(inputTokens + 5);
        expect(firstChunkMetadata.usage.incremental).toBe(5);
        expect(firstChunkMetadata.usage.costs.input).toBeDefined();
        expect(firstChunkMetadata.usage.costs.output).toBeDefined();
        expect(firstChunkMetadata.usage.costs.total).toBeDefined();

        // Second chunk - 11 tokens total (6 incremental)
        const secondChunkMetadata = results[1].metadata as UsageMetadata;
        expect(secondChunkMetadata.usage.tokens.output).toBe(11);
        expect(secondChunkMetadata.usage.incremental).toBe(6);
        expect(secondChunkMetadata.usage.costs.input).toBeDefined();
        expect(secondChunkMetadata.usage.costs.output).toBeDefined();
        expect(secondChunkMetadata.usage.costs.total).toBeDefined();

        // Last chunk - 11 tokens total (0 incremental since we're mocking the same token count)
        const lastChunkMetadata = results[2].metadata as UsageMetadata;
        expect(lastChunkMetadata.usage.tokens.output).toBe(11);
        expect(lastChunkMetadata.usage.incremental).toBe(0);
        expect(lastChunkMetadata.usage.tokens.total).toBe(inputTokens + 11);
        expect(lastChunkMetadata.usage.costs.input).toBeDefined();
        expect(lastChunkMetadata.usage.costs.output).toBeDefined();
        expect(lastChunkMetadata.usage.costs.total).toBeDefined();

        // Check the token calculator was called correctly with the accumulating content
        expect(mockTokenCalculator.calculateTokens).toHaveBeenCalledTimes(3);
    });

    it('should include cached tokens in usage tracking', async () => {
        // Set up token calculation mock
        mockTokenCalculator.calculateTokens.mockReturnValue(4); // 'Test' -> 4 tokens

        // Create processor with cached tokens
        const processor = new UsageTrackingProcessor({
            tokenCalculator: mockTokenCalculator,
            inputTokens,
            inputCachedTokens,
            modelInfo: mockModelInfo
        });

        // Create mock stream
        const mockStream = createMockStream([
            { content: 'Test', isComplete: true }
        ]);

        // Process stream
        const results: StreamChunk[] = [];
        for await (const chunk of processor.processStream(mockStream)) {
            results.push(chunk);
        }

        // Verify results
        const metadata = results[0].metadata as UsageMetadata;
        expect(metadata.usage.tokens.inputCached).toBe(inputCachedTokens);
        expect(metadata.usage.costs.inputCached).toBeDefined();

        // Verify that costs are calculated correctly with cached tokens
        expect(metadata.usage.costs.input).toBe(inputTokens * (mockModelInfo.inputPricePerMillion / 1000000));
        expect(metadata.usage.costs.inputCached).toBe(inputCachedTokens * ((mockModelInfo.inputCachedPricePerMillion || 0) / 1000000));
    });

    it('should trigger usage callback after batch size is reached', async () => {
        // Create mock callback
        const mockCallback: UsageCallback = jest.fn();

        // Set up token calculation mock with exact values
        mockTokenCalculator.calculateTokens
            .mockReturnValueOnce(5)   // First chunk: "12345" -> 5 tokens
            .mockReturnValueOnce(9)   // Second chunk: After adding "6789" -> 9 tokens
            .mockReturnValueOnce(10); // Third chunk: After adding "0" -> 10 tokens

        // Create processor with callback and small batch size
        const processor = new UsageTrackingProcessor({
            tokenCalculator: mockTokenCalculator,
            inputTokens,
            modelInfo: mockModelInfo,
            usageCallback: mockCallback,
            callerId: 'test-caller',
            tokenBatchSize: 5 // Set small batch size to trigger multiple callbacks
        });

        // Create mock stream that sends content in chunks that will trigger callbacks at specific points
        const mockStream = createMockStream([
            { content: '12345', isComplete: false },    // 5 tokens, hits batch size
            { content: '6789', isComplete: false },     // 4 more tokens (9 total)
            { content: '0', isComplete: true }          // 1 more token (10 total) + isComplete
        ]);

        // Process stream
        for await (const chunk of processor.processStream(mockStream)) {
            // Just iterate through
        }

        // Verify callback was called twice (once at batch size and once at completion)
        expect(mockCallback).toHaveBeenCalledTimes(2);

        // First callback should have initial token values
        expect(mockCallback).toHaveBeenNthCalledWith(1, expect.objectContaining({
            callerId: 'test-caller',
            timestamp: expect.any(Number),
            usage: expect.objectContaining({
                tokens: expect.objectContaining({
                    input: 50,
                    output: 5,
                    total: 55
                })
            })
        }));

        // Second callback should have final token values
        expect(mockCallback).toHaveBeenNthCalledWith(2, expect.objectContaining({
            callerId: 'test-caller',
            timestamp: expect.any(Number),
            usage: expect.objectContaining({
                tokens: expect.objectContaining({
                    input: 50,
                    output: 10,
                    total: 60
                })
            })
        }));
    });

    it('should not trigger callback if callerId is not provided', async () => {
        // Create mock callback
        const mockCallback: UsageCallback = jest.fn();

        // Set up token calculation mock
        mockTokenCalculator.calculateTokens.mockReturnValue(4); // 'Test' -> 4 tokens

        // Create processor with callback but no callerId
        const processor = new UsageTrackingProcessor({
            tokenCalculator: mockTokenCalculator,
            inputTokens,
            modelInfo: mockModelInfo,
            usageCallback: mockCallback,
            tokenBatchSize: 1 // Small to ensure it would trigger if callerId was present
        });

        // Create mock stream
        const mockStream = createMockStream([
            { content: 'Test', isComplete: true }
        ]);

        // Process stream
        for await (const chunk of processor.processStream(mockStream)) {
            // Just iterate through
        }

        // Callback should not be called
        expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should reset tracking state when reset is called', () => {
        // Create processor
        const processor = new UsageTrackingProcessor({
            tokenCalculator: mockTokenCalculator,
            inputTokens,
            modelInfo: mockModelInfo
        });

        // Access private properties via type casting for testing
        const processorAsAny = processor as any;
        processorAsAny.lastOutputTokens = 100;
        processorAsAny.lastCallbackTokens = 50;

        // Call reset
        processor.reset();

        // Verify properties are reset
        expect(processorAsAny.lastOutputTokens).toBe(0);
        expect(processorAsAny.lastCallbackTokens).toBe(0);
    });

    it('should handle streams with no content chunks', async () => {
        // Set up token calculation mock
        mockTokenCalculator.calculateTokens.mockReturnValue(0);

        // Create processor
        const processor = new UsageTrackingProcessor({
            tokenCalculator: mockTokenCalculator,
            inputTokens,
            modelInfo: mockModelInfo
        });

        // Create mock stream with chunks that have no content
        const mockStream = createMockStream([
            { content: '', isComplete: false, metadata: { key: 'value' } },
            { content: '', isComplete: true, metadata: { another: 'data' } }
        ]);

        // Process stream
        const results: StreamChunk[] = [];
        for await (const chunk of processor.processStream(mockStream)) {
            results.push(chunk);
        }

        // Verify results
        expect(results.length).toBe(2);
        expect(results[0].content).toBe('');
        expect(results[0].metadata).toHaveProperty('key', 'value');
        expect(results[0].metadata).toHaveProperty('usage');
        expect(results[1].content).toBe('');
        expect(results[1].metadata).toHaveProperty('another', 'data');
        expect(results[1].metadata).toHaveProperty('usage');

        // Check token calculation was correct even with empty content
        const finalMetadata = results[1].metadata as any;
        expect(finalMetadata.usage.tokens.output).toBe(0);
        expect(finalMetadata.usage.incremental).toBe(0);
    });

    it('should handle streams with tool calls', async () => {
        // Set up token calculation mock
        mockTokenCalculator.calculateTokens.mockReturnValue(5);

        // Create processor
        const processor = new UsageTrackingProcessor({
            tokenCalculator: mockTokenCalculator,
            inputTokens,
            modelInfo: mockModelInfo
        });

        // Create mock stream with tool calls
        const mockToolCall = {
            id: 'tool123',
            name: 'testTool',
            arguments: { arg: 'value' }
        };
        const mockStream = createMockStream([
            {
                content: 'Content with tool call',
                isComplete: true,
                toolCalls: [mockToolCall]
            }
        ]);

        // Process stream
        const results: StreamChunk[] = [];
        for await (const chunk of processor.processStream(mockStream)) {
            results.push(chunk);
        }

        // Verify results
        expect(results.length).toBe(1);
        expect(results[0].toolCalls).toEqual([mockToolCall]);
        expect(results[0].metadata).toHaveProperty('usage');
    });

    it('should handle model info without input cached price', async () => {
        // Create model info without inputCachedPricePerMillion
        const modelInfoWithoutCachedPrice: ModelInfo = {
            ...mockModelInfo,
            inputCachedPricePerMillion: undefined
        };

        // Set up token calculation mock
        mockTokenCalculator.calculateTokens.mockReturnValue(4);

        // Create processor with cached tokens but no cached price in model info
        const processor = new UsageTrackingProcessor({
            tokenCalculator: mockTokenCalculator,
            inputTokens,
            inputCachedTokens,
            modelInfo: modelInfoWithoutCachedPrice
        });

        // Create mock stream
        const mockStream = createMockStream([
            { content: 'Test', isComplete: true }
        ]);

        // Process stream
        const results: StreamChunk[] = [];
        for await (const chunk of processor.processStream(mockStream)) {
            results.push(chunk);
        }

        // Verify results - inputCached cost should be 0 when no cached price is defined
        const metadata = results[0].metadata as UsageMetadata;
        expect(metadata.usage.tokens.inputCached).toBe(inputCachedTokens);
        expect(metadata.usage.costs.inputCached).toBe(0);
    });

    it('should directly trigger the callback when token increase exactly matches batch size', async () => {
        // Create mock callback
        const mockCallback: UsageCallback = jest.fn();

        // Set up token calculation mock with exact batch size increases
        mockTokenCalculator.calculateTokens
            .mockReturnValueOnce(5)    // 5 tokens (exactly matches batch size)
            .mockReturnValueOnce(10)   // 10 tokens (exactly matches batch size)
            .mockReturnValueOnce(15);  // 15 tokens (exactly matches batch size)

        // Create processor with batch size of exactly 5
        const processor = new UsageTrackingProcessor({
            tokenCalculator: mockTokenCalculator,
            inputTokens,
            modelInfo: mockModelInfo,
            usageCallback: mockCallback,
            callerId: 'test-caller',
            tokenBatchSize: 5
        });

        // Create mock stream with chunks that will result in token count that matches batch size
        const mockStream = createMockStream([
            { content: 'AAAAA', isComplete: false }, // 5 tokens
            { content: 'BBBBB', isComplete: false }, // +5 tokens = 10 total
            { content: 'CCCCC', isComplete: true }   // +5 tokens = 15 total
        ]);

        // Process stream
        for await (const chunk of processor.processStream(mockStream)) {
            // Just iterate through
        }

        // Verify callback was called for each batch plus completion
        expect(mockCallback).toHaveBeenCalledTimes(3);
    });
});

// Helper function to create a mock async iterable from an array of chunks
async function* createMockStream(chunks: Partial<StreamChunk>[]): AsyncIterable<StreamChunk> {
    let accumulatedContent = '';

    for (const chunk of chunks) {
        accumulatedContent += chunk.content || '';
        yield {
            content: chunk.content || '',
            isComplete: chunk.isComplete || false,
            metadata: chunk.metadata || {},
            toolCalls: chunk.toolCalls
        };
    }
} 