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
                /**
                 * Tokens attributable to audio inputs (if any)
                 */
                audio?: number;
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
                /**
                 * Tokens, characters, or provider billing units attributable to audio output (if reported)
                 */
                audio?: number;
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
                /**
                 * Cost attributable to audio input processing
                 */
                audio?: number;
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
                /**
                 * Cost attributable to image generation/editing output
                 */
                image?: number;
                /**
                 * Cost attributable to video generation output
                 */
                video?: number;
                /**
                 * Cost attributable to audio output
                 */
                audio?: number;
            },
            /**
             * Total cost of the operation
             */
            total: number;
            /**
             * Currency for all costs.
             */
            unit: 'USD';
        };
        durations?: {
            input?: {
                /**
                 * Audio duration in seconds.
                 */
                audio?: number;
                /**
                 * Video duration in seconds.
                 */
                video?: number;
            };
            output?: {
                /**
                 * Audio duration in seconds.
                 */
                audio?: number;
                /**
                 * Video duration in seconds.
                 */
                video?: number;
            };
            /**
             * Total duration in seconds across reported input and output media.
             */
            total?: number;
            /**
             * Unit for all duration fields.
             */
            unit: 'seconds';
        };
    };
    timestamp: number;
    /**
     * Number of tokens since last callback (incremental)
     */
    incremental?: number;
}; 
