import { TokenCalculator } from '../models/TokenCalculator';
import { ModelInfo, Usage } from '../../interfaces/UniversalInterfaces';
import { UsageCallback } from '../../interfaces/UsageInterfaces';

export class UsageTracker {
    constructor(
        private tokenCalculator: TokenCalculator,
        private callback?: UsageCallback,
        private callerId?: string
    ) { }

    async trackUsage(
        input: string,
        output: string,
        modelInfo: ModelInfo
    ): Promise<Usage> {
        const inputTokens = this.tokenCalculator.calculateTokens(input);
        const outputTokens = this.tokenCalculator.calculateTokens(output);

        const usage: Usage = {
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
            costs: this.tokenCalculator.calculateUsage(
                inputTokens,
                outputTokens,
                modelInfo.inputPricePerMillion,
                modelInfo.outputPricePerMillion
            )
        };

        if (this.callback) {
            await Promise.resolve(
                this.callback({
                    callerId: this.callerId!,
                    usage,
                    timestamp: Date.now()
                })
            );
        }

        return usage;
    }
}