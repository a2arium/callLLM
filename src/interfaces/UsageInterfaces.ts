export type UsageCallback = (usage: UsageData) => void | Promise<void>;

export type UsageData = {
    callerId: string;
    usage: {
        tokens: {
            /**
             * Input token details
             */
            input: {
                /**
                 * Number of non-cached input tokens
                 */
                total: number;
                /**
                 * Number of cached input tokens (if any)
                 */
                cached: number;
                /**
                 * Tokens attributable to file/image inputs (if any)
                 */
                image?: number;
            },
            /**
             * Output token details
             */
            output: {
                /**
                 * Number of output tokens generated
                 */
                total: number;
                /**
                 * Number of output tokens used for reasoning (if applicable)
                 */
                reasoning: number;
            },
            /**
             * Total tokens (including both cached and non-cached input tokens and reasoning)
             */
            total: number;
        };
        costs: {
            /**
             * Input cost details
             */
            input: {
                /**
                 * Cost for non-cached input tokens
                 */
                total: number;
                /**
                 * Cost for cached input tokens
                 */
                cached: number;
            },
            /**
             * Output cost details
             */
            output: {
                /**
                 * Cost for output tokens
                 */
                total: number;
                /**
                 * Cost for output reasoning tokens (if applicable)
                 */
                reasoning: number;
            },
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