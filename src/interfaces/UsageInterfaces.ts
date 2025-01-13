export type UsageCallback = (usage: UsageData) => void | Promise<void>;

export type UsageData = {
    callerId: string;
    usage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        costs: {
            inputCost: number;
            outputCost: number;
            totalCost: number;
        };
    };
    timestamp: number;
}; 