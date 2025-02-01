export type RetryConfig = {
    baseDelay?: number;
    maxRetries?: number;
    retryableStatusCodes?: number[];
};

export class RetryManager {
    constructor(private config: RetryConfig) { }

    async executeWithRetry<T>(
        operation: () => Promise<T>,
        shouldRetry: (error: unknown) => boolean
    ): Promise<T> {
        let attempt = 0;
        let lastError: unknown;

        while (attempt <= (this.config.maxRetries ?? 3)) {
            try {
                console.log(`RetryManager: Attempt ${attempt + 1}`);
                return await operation();
            } catch (error) {
                lastError = error;
                if (!shouldRetry(error)) break;
                attempt++;
                const baseDelay = process.env.NODE_ENV === 'test' ? 1 : (this.config.baseDelay ?? 1000);
                const delay = baseDelay * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw new Error(`Failed after ${this.config.maxRetries ?? 3} retries. Last error: ${(lastError instanceof Error) ? lastError.message : lastError}`);
    }
}