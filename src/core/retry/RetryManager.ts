/**
 * The RetryConfig type defines the configuration options for the RetryManager.
 * 
 * @property baseDelay - The initial delay in milliseconds before a retry is attempted.
 * @property maxRetries - The maximum number of retry attempts.
 * @property retryableStatusCodes - An optional array of HTTP status codes considered retryable.
 */
export type RetryConfig = {
    baseDelay?: number;
    maxRetries?: number;
    retryableStatusCodes?: number[];
};

/**
 * RetryManager is responsible for executing an asynchronous operation with retry logic.
 * 
 * This class attempts to execute a given async function and, upon failure, retries the operation
 * based on the configuration provided through RetryConfig. It uses an exponential backoff strategy
 * to wait between retries. The retry behavior may adapt based on the NODE_ENV environment variable,
 * which is particularly useful for testing.
 */
export class RetryManager {
    /**
     * Constructs a new instance of RetryManager.
     *
     * @param config - The configuration object containing settings for delay, retries, and retryable status codes.
     */
    constructor(private config: RetryConfig) { }

    /**
     * Executes the provided asynchronous operation with retry logic.
     * 
     * @param operation - A function returning a Promise representing the async operation to perform.
     * @param shouldRetry - A predicate function that determines if a caught error should trigger a retry.
     * 
     * @returns A Promise resolving to the result of the operation if successful.
     * 
     * @throws An Error after the specified number of retries if all attempts fail or the error is not retryable.
     */
    async executeWithRetry<T>(
        operation: () => Promise<T>,
        shouldRetry: (error: unknown) => boolean
    ): Promise<T> {
        let attempt = 0;
        let lastError: unknown;

        // Loop until a successful operation or until retries are exhausted.
        while (attempt <= (this.config.maxRetries ?? 3)) {
            try {
                if (attempt > 0) { console.log(`RetryManager: Attempt ${attempt + 1}`); }
                // Execute and return the successful result from the operation.
                return await operation();
            } catch (error) {
                lastError = error;
                // If the error is not deemed retryable, do not continue trying.
                if (!shouldRetry(error)) break;

                attempt++; // Increment attempt before calculating delay

                // For testing environments, use a minimal delay; otherwise, use the configured base delay.
                const baseDelay = process.env.NODE_ENV === 'test' ? 1 : (this.config.baseDelay ?? 1000);
                // Calculate an exponential backoff delay.
                const delay = baseDelay * Math.pow(2, attempt); // Use attempt for delay calculation
                // Wait for the specified delay before the next attempt.
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        // If all retry attempts fail, throw an error with the details of the last encountered error.
        if (attempt === 0) {
            // No retries were attempted because the error was not retryable
            throw new Error(`Operation failed without retrying (non-retryable error). Error: ${(lastError instanceof Error) ? lastError.message : lastError}`);
        } else {
            // Retries were attempted but still failed
            throw new Error(`Failed after ${attempt - 1} retries. Last error: ${(lastError instanceof Error) ? lastError.message : lastError}`);
        }
    }
}