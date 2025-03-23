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
            inputCost: number;
            inputCachedCost?: number;
            outputCost: number;
            totalCost: number;
        };
    };
};

describe('UsageTrackingProcessor', () => {
    // Mock TokenCalculator
    const mockTokenCalculator = {
        calculateTokens: jest.fn((text: string) => {
            // Simple mock that returns length of text as token count
            return text.length;
        }),
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
        // Create processor
        const processor = new UsageTrackingProcessor({
            tokenCalculator: mockTokenCalculator,
            inputTokens,
            modelInfo: mockModelInfo
        });

        // Create mock stream
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

        // First chunk - use type assertion to access metadata properties
        const firstChunkMetadata = results[0].metadata as UsageMetadata;
        expect(firstChunkMetadata.usage.tokens.output).toBe(5); // "Hello" is 5 chars
        expect(firstChunkMetadata.usage.tokens.input).toBe(inputTokens);
        expect(firstChunkMetadata.usage.tokens.total).toBe(inputTokens + 5);
        expect(firstChunkMetadata.usage.incremental).toBe(5);

        // Second chunk
        const secondChunkMetadata = results[1].metadata as UsageMetadata;
        expect(secondChunkMetadata.usage.tokens.output).toBe(11); // "Hello world" is 11 chars
        expect(secondChunkMetadata.usage.incremental).toBe(6); // " world" is 6 chars

        // Last chunk
        const lastChunkMetadata = results[2].metadata as UsageMetadata;
        expect(lastChunkMetadata.usage.tokens.output).toBe(12); // "Hello world!" is 12 chars
        expect(lastChunkMetadata.usage.incremental).toBe(1); // "!" is 1 char
        expect(lastChunkMetadata.usage.tokens.total).toBe(inputTokens + 12);

        // Costs should be calculated correctly
        expect(lastChunkMetadata.usage.costs.inputCost).toBeDefined();
        expect(lastChunkMetadata.usage.costs.outputCost).toBeDefined();
        expect(lastChunkMetadata.usage.costs.totalCost).toBeDefined();

        // Token calculator should be called correctly
        expect(mockTokenCalculator.calculateTokens).toHaveBeenCalledWith('Hello');
        expect(mockTokenCalculator.calculateTokens).toHaveBeenCalledWith('Hello world');
        expect(mockTokenCalculator.calculateTokens).toHaveBeenCalledWith('Hello world!');
    });

    it('should include cached tokens in usage tracking', async () => {
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
        expect(metadata.usage.costs.inputCachedCost).toBeDefined();
    });

    it('should trigger usage callback after batch size is reached', async () => {
        // Create mock callback
        const mockCallback: UsageCallback = jest.fn();

        // Create processor with callback and small batch size
        const processor = new UsageTrackingProcessor({
            tokenCalculator: mockTokenCalculator,
            inputTokens,
            modelInfo: mockModelInfo,
            usageCallback: mockCallback,
            callerId: 'test-caller',
            tokenBatchSize: 5 // Set small batch size to trigger multiple callbacks
        });

        // Create mock stream with content that will trigger multiple callbacks
        const mockStream = createMockStream([
            { content: '12345', isComplete: false }, // 5 tokens, hits batch size
            { content: '6789', isComplete: false },  // 9 tokens total, doesn't hit new batch
            { content: '0', isComplete: true }       // 10 tokens total + isComplete triggers callback
        ]);

        // Process stream
        for await (const chunk of processor.processStream(mockStream)) {
            // Just iterate through
        }

        // Callback should be called twice
        expect(mockCallback).toHaveBeenCalledTimes(2);

        // First call - after first chunk hits batch size
        expect(mockCallback).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                callerId: 'test-caller',
                usage: expect.objectContaining({
                    inputTokens,
                    outputTokens: 5, // First chunk
                }),
                timestamp: expect.any(Number)
            })
        );

        // Second call - after stream completes
        expect(mockCallback).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                callerId: 'test-caller',
                usage: expect.objectContaining({
                    inputTokens,
                    outputTokens: 10, // All chunks
                }),
                timestamp: expect.any(Number)
            })
        );
    });

    it('should not trigger callback if callerId is not provided', async () => {
        // Create mock callback
        const mockCallback: UsageCallback = jest.fn();

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
});

// Helper function to create a mock async iterable from an array of chunks
async function* createMockStream(chunks: Partial<StreamChunk>[]): AsyncIterable<StreamChunk> {
    for (const chunk of chunks) {
        yield {
            content: chunk.content || '',
            isComplete: chunk.isComplete || false,
            metadata: chunk.metadata || {},
            toolCalls: chunk.toolCalls
        };
    }
} 