export type UsageCallback = (usage: UsageData) => void | Promise<void>;

export type UsageData = {
    callerId: string;
    usage: {
        tokens: {
            /**
             * Number of non-cached input tokens
             */
            input: number;
            /**
             * Number of cached input tokens (if any)
             */
            inputCached: number;
            /**
             * Number of output tokens generated
             */
            output: number;
            /**
             * Number of output tokens used for reasoning (if applicable)
             */
            outputReasoning: number;
            /**
             * Total tokens (including both cached and non-cached input tokens and reasoning)
             */
            total: number;
        };
        costs: {
            /**
             * Cost for non-cached input tokens
             */
            input: number;
            /**
             * Cost for cached input tokens
             */
            inputCached: number;
            /**
             * Cost for output tokens
             */
            output: number;
            /**
             * Cost for output reasoning tokens (if applicable)
             */
            outputReasoning: number;
            /**
             * Total cost of the operation
             */
            total: number;
        };
    };
    timestamp: number;
    /**
     * Number of tokens since last callback (incremental)
     */
    incremental?: number;
}; 