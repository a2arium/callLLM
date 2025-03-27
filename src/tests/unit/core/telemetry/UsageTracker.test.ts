import { UsageTracker } from '../../../../../src/core/telemetry/UsageTracker';
import { ModelInfo } from '../../../../../src/interfaces/UniversalInterfaces';
import { UsageCallback } from '../../../../../src/interfaces/UsageInterfaces';

type DummyTokenCalculator = {
    calculateTokens: (text: string) => number;
    calculateUsage: (
        inputTokens: number,
        outputTokens: number,
        inputPricePerMillion: number,
        outputPricePerMillion: number,
        cachedTokens?: number,
        cachedPricePerMillion?: number
    ) => {
        input: number;
        inputCached: number;
        output: number;
        total: number;
    };
    calculateTotalTokens: (messages: { role: string; content: string }[]) => number;
};

describe('UsageTracker', () => {
    let dummyTokenCalculator: DummyTokenCalculator;
    let modelInfo: ModelInfo;

    beforeEach(() => {
        // Create a dummy TokenCalculator that returns predetermined values.
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
                    cachedPrice: number = 0
                ) => {
                    const inputCost = (inputTokens * inputPrice) / 1_000_000;
                    const outputCost = (outputTokens * outputPrice) / 1_000_000;
                    const cachedCost = (cachedTokens * cachedPrice) / 1_000_000;
                    return {
                        input: inputCost,
                        inputCached: cachedCost,
                        output: outputCost,
                        total: inputCost + outputCost + cachedCost
                    };
                }
            ),
            calculateTotalTokens: (messages: { role: string; content: string }[]) =>
                messages.reduce(
                    (sum, message) =>
                        sum +
                        (message.content === 'input'
                            ? 10
                            : message.content === 'output'
                                ? 20
                                : 0),
                    0
                ),
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
                systemMessages: false,
                temperature: false,
                jsonMode: false,
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
        expect(dummyTokenCalculator.calculateUsage).toHaveBeenCalledWith(10, 20, 1000, 2000, 0, 500);

        // Verify the usage object returned.
        expect(usage).toEqual({
            tokens: {
                input: 10,
                inputCached: 0,
                output: 20,
                total: 30
            },
            costs: {
                input: 0.01,
                inputCached: 0,
                output: 0.04,
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
                        input: 10,
                        inputCached: 0,
                        output: 20,
                        total: 30
                    },
                    costs: {
                        input: 0.01,
                        inputCached: 0,
                        output: 0.04,
                        total: 0.05
                    }
                },
                timestamp: expect.any(Number),
            })
        );

        // Also verify that the usage object returned by the trackUsage method is correct.
        expect(usage).toEqual({
            tokens: {
                input: 10,
                inputCached: 0,
                output: 20,
                total: 30
            },
            costs: {
                input: 0.01,
                inputCached: 0,
                output: 0.04,
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
        expect(dummyTokenCalculator.calculateUsage).toHaveBeenCalledWith(10, 20, 1000, 2000, 5, 500);

        // Verify the usage object returned.
        expect(usage).toEqual({
            tokens: {
                input: 10,
                inputCached: 5,
                output: 20,
                total: 30
            },
            costs: {
                input: 0.01,
                inputCached: 0.0025,
                output: 0.04,
                total: expect.any(Number)
            }
        });
        expect(usage.costs.total).toBeCloseTo(0.0525, 5);
    });
});