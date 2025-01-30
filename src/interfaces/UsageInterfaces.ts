export type UsageCallback = (usage: UsageData) => void | Promise<void>;

export type UsageData = {
    callerId: string;
    usage: {
        /**
         * Number of non-cached input tokens
         */
        inputTokens: number;
        /**
         * Number of cached input tokens (if any)
         */
        inputCachedTokens?: number;
        outputTokens: number;
        /**
         * Total tokens (including both cached and non-cached input tokens)
         */
        totalTokens: number;
        costs: {
            /**
             * Cost for non-cached input tokens
             */
            inputCost: number;
            /**
             * Cost for cached input tokens (if any)
             */
            inputCachedCost?: number;
            outputCost: number;
            totalCost: number;
        };
    };
    timestamp: number;
}; 