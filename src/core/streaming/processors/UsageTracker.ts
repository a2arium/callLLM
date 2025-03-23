import type { StreamChunk, IStreamProcessor } from "../types";

export type TokenCalculator = {
    calculateTokens: (text: string) => number;
};

export type UsageCallback = (usageData: {
    tokens: number;
    incrementalTokens: number;
    modelInfo?: {
        provider: string;
        model: string;
        costPer1KTokens?: number;
    }
}) => void;

export class UsageTracker implements IStreamProcessor {
    private tokenCalculator: TokenCalculator;
    private usageCallback?: UsageCallback;
    private lastTokenCount = 0;
    private inputTokens: number;
    private modelInfo?: {
        provider: string;
        model: string;
        costPer1KTokens?: number;
    };
    private batchSize: number;
    private lastCallbackTokens = 0;

    constructor(options: {
        tokenCalculator: TokenCalculator;
        usageCallback?: UsageCallback;
        inputTokens: number;
        modelInfo?: {
            provider: string;
            model: string;
            costPer1KTokens?: number;
        };
        batchSize?: number;
    }) {
        this.tokenCalculator = options.tokenCalculator;
        this.usageCallback = options.usageCallback;
        this.inputTokens = options.inputTokens;
        this.modelInfo = options.modelInfo;
        this.batchSize = options.batchSize || 10;
    }

    async *processStream(stream: AsyncIterable<StreamChunk>): AsyncIterable<StreamChunk> {
        let accumulatedText = "";
        for await (const chunk of stream) {
            const text = chunk.content ?? "";
            accumulatedText += text;

            const currentTokens = this.tokenCalculator.calculateTokens(accumulatedText);
            const incrementalTokens = currentTokens - this.lastTokenCount;
            this.lastTokenCount = currentTokens;

            // Call callback when we've accumulated enough tokens
            if (this.usageCallback &&
                (currentTokens - this.lastCallbackTokens >= this.batchSize || chunk.isComplete)) {
                this.usageCallback({
                    tokens: currentTokens,
                    incrementalTokens,
                    modelInfo: this.modelInfo
                });
                this.lastCallbackTokens = currentTokens;
            }

            // Calculate cost if available
            let cost: number | undefined;
            if (this.modelInfo?.costPer1KTokens) {
                const totalTokens = this.inputTokens + currentTokens;
                cost = (totalTokens / 1000) * this.modelInfo.costPer1KTokens;
            }

            yield {
                ...chunk,
                metadata: {
                    ...(chunk.metadata ?? {}),
                    usage: {
                        tokens: {
                            input: this.inputTokens,
                            output: currentTokens,
                            total: this.inputTokens + currentTokens
                        },
                        incremental: incrementalTokens,
                        cost
                    }
                }
            };
        }
    }

    reset(): void {
        this.lastTokenCount = 0;
        this.lastCallbackTokens = 0;
    }
} 