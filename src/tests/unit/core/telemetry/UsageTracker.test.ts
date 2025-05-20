import { UsageTracker } from '../../../../../src/core/telemetry/UsageTracker.js';
import { ModelInfo } from '../../../../../src/interfaces/UniversalInterfaces.js';
import { UsageCallback } from '../../../../../src/interfaces/UsageInterfaces.js';
import { UsageTrackingProcessor } from '../../../../../src/core/streaming/processors/UsageTrackingProcessor.js';

type DummyTokenCalculator = {
    calculateTokens: (text: string) => number;
    calculateUsage: (
        inputTokens: number,
        outputTokens: number,
        inputPricePerMillion: number,
        outputPricePerMillion: number,
        cachedTokens?: number,
        cachedPricePerMillion?: number,
        outputReasoningTokens?: number,
        imageInputTokens?: number,
        imageOutputTokens?: number,
        imageInputPricePerMillion?: number,
        imageOutputPricePerMillion?: number
    ) => {
        input: {
            total: number;
            cached: number;
        };
        output: {
            total: number;
            reasoning: number;
        };
        total: number;
    };
    calculateTotalTokens: (messages: { role: string; content: string }[]) => number;
};

describe('UsageTracker', () => {
    let dummyTokenCalculator: DummyTokenCalculator;
    let modelInfo: ModelInfo;

    beforeEach(() => {
        // Create a mock token calculator
        dummyTokenCalculator = {
            calculateTokens: jest.fn((text: string) => {
                if (text === 'input') return 10;
                if (text === 'output') return 20;
                return 0;
            }),
            calculateUsage: jest.fn(
                (
                    inputTokens: number,
                    outputTokens: number,
                    inputPrice: number,
                    outputPrice: number,
                    cachedTokens: number = 0,
                    cachedPrice: number = 0,
                    outputReasoningTokens: number = 0,
                    // Additional parameters for image tokens that we'll ignore in tests
                    _imageInputTokens?: number,
                    _imageOutputTokens?: number,
                    _imageInputPrice?: number,
                    _imageOutputPrice?: number
                ) => {
                    // For the purposes of our tests, we'll ignore the image tokens
                    // to keep the expected values consistent with older test cases
                    const inputCost = ((inputTokens - cachedTokens) * inputPrice) / 1_000_000;
                    const cachedCost = (cachedTokens * cachedPrice) / 1_000_000;
                    const outputCost = (outputTokens * outputPrice) / 1_000_000;
                    const reasoningCost = (outputReasoningTokens * outputPrice) / 1_000_000;
                    return {
                        input: {
                            total: inputCost,
                            cached: cachedCost
                        },
                        output: {
                            total: outputCost,
                            reasoning: reasoningCost
                        },
                        total: inputCost + outputCost + cachedCost + reasoningCost
                    };
                }
            ),
            calculateTotalTokens: jest.fn((messages: { role: string; content: string }[]) => {
                if (!messages || messages.length === 0) return 0;
                return messages.reduce(
                    (sum, message) =>
                        sum +
                        (message.content === 'input'
                            ? 10
                            : message.content === 'output'
                                ? 20
                                : 0),
                    0
                );
            })
        };

        // Define a dummy modelInfo with required properties.
        modelInfo = {
            name: 'test-model',
            inputPricePerMillion: 1000,
            outputPricePerMillion: 2000,
            maxRequestTokens: 1000,
            maxResponseTokens: 500,
            tokenizationModel: 'test',
            characteristics: { qualityIndex: 80, outputSpeed: 100, firstTokenLatency: 50 },
            capabilities: {
                streaming: true,
                toolCalls: false,
                parallelToolCalls: false,
                batchProcessing: false,
                input: {
                    text: true
                },
                output: {
                    text: true
                }
            },
            inputCachedPricePerMillion: 500 // Add cached price
        };
    });

    it('should calculate usage correctly without a callback', async () => {
        const tracker = new UsageTracker(dummyTokenCalculator, undefined, 'dummy-caller');
        const usage = await tracker.trackUsage('input', 'output', modelInfo);

        // Verify the tokenCalculator functions were called with the expected inputs.
        expect(dummyTokenCalculator.calculateTokens).toHaveBeenCalledWith('input');
        expect(dummyTokenCalculator.calculateTokens).toHaveBeenCalledWith('output');

        // Use a more flexible matcher for calculateUsage that checks the first 7 args only
        expect(dummyTokenCalculator.calculateUsage).toHaveBeenCalledWith(
            10, 20, 1000, 2000, 0, 500, 0,
            undefined, undefined, 1000, 2000
        );

        // Verify the usage object returned.
        expect(usage).toEqual({
            tokens: {
                input: {
                    total: 10,
                    cached: 0
                },
                output: {
                    total: 20,
                    reasoning: 0
                },
                total: 30
            },
            costs: {
                input: {
                    total: 0.01,
                    cached: 0
                },
                output: {
                    total: 0.04,
                    reasoning: 0
                },
                total: 0.05
            }
        });
    });

    it('should call the callback with correct usage data', async () => {
        const mockCallback: UsageCallback = jest.fn();
        const tracker = new UsageTracker(dummyTokenCalculator, mockCallback, 'test-caller-id');
        const usage = await tracker.trackUsage('input', 'output', modelInfo);

        // Verify the callback was called exactly once.
        expect(mockCallback).toHaveBeenCalledTimes(1);
        // Verify the callback was called with an object containing the expected usage data.
        expect(mockCallback).toHaveBeenCalledWith(
            expect.objectContaining({
                callerId: 'test-caller-id',
                usage: {
                    tokens: {
                        input: {
                            total: 10,
                            cached: 0
                        },
                        output: {
                            total: 20,
                            reasoning: 0
                        },
                        total: 30
                    },
                    costs: {
                        input: {
                            total: 0.01,
                            cached: 0
                        },
                        output: {
                            total: 0.04,
                            reasoning: 0
                        },
                        total: 0.05
                    }
                },
                timestamp: expect.any(Number),
            })
        );

        // Also verify that the usage object returned by the trackUsage method is correct.
        expect(usage).toEqual({
            tokens: {
                input: {
                    total: 10,
                    cached: 0
                },
                output: {
                    total: 20,
                    reasoning: 0
                },
                total: 30
            },
            costs: {
                input: {
                    total: 0.01,
                    cached: 0
                },
                output: {
                    total: 0.04,
                    reasoning: 0
                },
                total: 0.05
            }
        });
    });

    it('should handle cached tokens correctly', async () => {
        const tracker = new UsageTracker(dummyTokenCalculator, undefined, 'dummy-caller');
        const usage = await tracker.trackUsage('input', 'output', modelInfo, 5);

        // Verify the tokenCalculator functions were called with the expected inputs.
        expect(dummyTokenCalculator.calculateTokens).toHaveBeenCalledWith('input');
        expect(dummyTokenCalculator.calculateTokens).toHaveBeenCalledWith('output');

        // Use a more flexible matcher for calculateUsage that checks the first 7 args only
        expect(dummyTokenCalculator.calculateUsage).toHaveBeenCalledWith(
            10, 20, 1000, 2000, 5, 500, 0,
            undefined, undefined, 1000, 2000
        );

        // Verify the usage object returned with flexible cost matching
        expect(usage).toMatchObject({
            tokens: {
                input: {
                    total: 10,
                    cached: 5
                },
                output: {
                    total: 20,
                    reasoning: 0
                },
                total: 30
            },
            costs: {
                input: {
                    cached: 0.0025
                },
                output: {
                    total: 0.04,
                    reasoning: 0
                }
            }
        });

        // Use approximation for values that might vary slightly due to calculation differences
        expect(usage.costs.input.total).toBeCloseTo(0.005, 4);
        expect(usage.costs.total).toBeCloseTo(0.0475, 4);
    });

    // Tests for the createStreamProcessor method
    describe('createStreamProcessor', () => {
        it('should create a UsageTrackingProcessor with default options', () => {
            const tracker = new UsageTracker(dummyTokenCalculator, undefined, 'caller-id');
            const processor = tracker.createStreamProcessor(10, modelInfo);

            // Check that processor is an instance of UsageTrackingProcessor
            expect(processor).toBeInstanceOf(UsageTrackingProcessor);
        });

        it('should create a processor with input cached tokens', () => {
            const tracker = new UsageTracker(dummyTokenCalculator, undefined, 'caller-id');
            const processor = tracker.createStreamProcessor(10, modelInfo, { inputCachedTokens: 5 });

            // Force TypeScript to allow us to inspect these private properties
            const processorAny = processor as any;
            expect(processorAny.inputTokens).toBe(10);
            expect(processorAny.inputCachedTokens).toBe(5);
        });

        it('should create a processor with custom token batch size', () => {
            const tracker = new UsageTracker(dummyTokenCalculator, undefined, 'caller-id');
            const processor = tracker.createStreamProcessor(10, modelInfo, { tokenBatchSize: 100 });

            // Force TypeScript to allow us to inspect these private properties
            const processorAny = processor as any;
            expect(processorAny.TOKEN_BATCH_SIZE).toBe(100);
        });

        it('should use caller ID from options over the one from constructor', () => {
            const tracker = new UsageTracker(dummyTokenCalculator, undefined, 'default-caller-id');
            const processor = tracker.createStreamProcessor(10, modelInfo, { callerId: 'option-caller-id' });

            // Force TypeScript to allow us to inspect these private properties
            const processorAny = processor as any;
            expect(processorAny.callerId).toBe('option-caller-id');
        });

        it('should use default caller ID if not specified in options', () => {
            const tracker = new UsageTracker(dummyTokenCalculator, undefined, 'default-caller-id');
            const processor = tracker.createStreamProcessor(10, modelInfo);

            // Force TypeScript to allow us to inspect these private properties
            const processorAny = processor as any;
            expect(processorAny.callerId).toBe('default-caller-id');
        });
    });

    // Tests for the calculateTokens method
    describe('calculateTokens', () => {
        it('should call tokenCalculator.calculateTokens with the provided text', () => {
            const tracker = new UsageTracker(dummyTokenCalculator);
            const result = tracker.calculateTokens('sample text');

            expect(dummyTokenCalculator.calculateTokens).toHaveBeenCalledWith('sample text');
            expect(result).toBe(0); // returns 0 for text that isn't 'input' or 'output'
        });

        it('should return the correct token count for known inputs', () => {
            const tracker = new UsageTracker(dummyTokenCalculator);

            expect(tracker.calculateTokens('input')).toBe(10);
            expect(tracker.calculateTokens('output')).toBe(20);
        });
    });

    // Tests for the calculateTotalTokens method
    describe('calculateTotalTokens', () => {
        it('should call tokenCalculator.calculateTotalTokens with the provided messages', () => {
            const tracker = new UsageTracker(dummyTokenCalculator);
            const messages = [
                { role: 'user', content: 'input' },
                { role: 'assistant', content: 'output' }
            ];

            const result = tracker.calculateTotalTokens(messages);

            expect(dummyTokenCalculator.calculateTotalTokens).toHaveBeenCalledWith(messages);
            expect(result).toBe(30); // 10 + 20
        });

        it('should handle empty message array', () => {
            const tracker = new UsageTracker(dummyTokenCalculator);
            const result = tracker.calculateTotalTokens([]);

            expect(dummyTokenCalculator.calculateTotalTokens).toHaveBeenCalledWith([]);
            expect(result).toBe(0);
        });
    });

    test('should include image tokens in usage data when provided', async () => {
        // Mock model info
        const modelInfo = {
            name: 'test-model',
            inputPricePerMillion: 1,
            outputPricePerMillion: 2,
            maxRequestTokens: 1000,
            maxResponseTokens: 2000,
            characteristics: {
                qualityIndex: 10,
                outputSpeed: 10,
                firstTokenLatency: 100
            }
        };

        // Create mock token calculator
        const tokenCalculator = {
            calculateTokens: jest.fn().mockReturnValue(10),
            calculateTotalTokens: jest.fn().mockReturnValue(20),
            calculateUsage: jest.fn().mockReturnValue({
                input: {
                    total: 0.00001,
                    cached: 0.000005
                },
                output: {
                    total: 0.00002,
                    reasoning: 0.00001
                },
                total: 0.000045
            })
        };

        // Create mock callback
        const mockCallback = jest.fn();

        // Create usage tracker
        const tracker = new UsageTracker(
            tokenCalculator as any,
            mockCallback,
            'test-caller'
        );

        // Test with image tokens
        const usage = await tracker.trackUsage('Hello', 'World', modelInfo, 5, 2, { inputImageTokens: 85 });

        // Verify usage data includes image tokens
        expect(usage.tokens.input.image).toBe(85);

        // Verify callback was called with correct data
        expect(mockCallback).toHaveBeenCalledTimes(1);
        const callbackData = mockCallback.mock.calls[0][0];
        expect(callbackData.usage.tokens.input.image).toBe(85);
    });
});