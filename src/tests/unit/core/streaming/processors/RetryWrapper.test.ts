import { jest } from '@jest/globals';
import { StreamChunk, IStreamProcessor, IRetryPolicy } from '../../../../../core/streaming/types.js';

// Mocked logger methods
const mockLoggerSetConfig = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn()

// Mock dependencies
jest.unstable_mockModule('../../../../../utils/logger.js', () => ({
  __esModule: true,
  logger: {
    setConfig: mockLoggerSetConfig,
    warn: mockLoggerWarn,
    error: mockLoggerError,
    // Add other logger methods if RetryWrapper uses them, e.g., info, debug
    info: jest.fn(),
    debug: jest.fn(),
    createLogger: jest.fn().mockReturnThis(), // if createLogger is used and chained
  }
}));

// Variables for dynamically imported modules
let RetryWrapper: any;
let logger: any; // To hold the dynamically imported mocked logger

beforeAll(async () => {
  const retryWrapperModule = await import('../../../../../core/streaming/processors/RetryWrapper.js');
  RetryWrapper = retryWrapperModule.RetryWrapper;

  // Dynamically import the mocked logger
  const loggerModule = await import('../../../../../utils/logger.js');
  logger = loggerModule.logger;
});

describe('RetryWrapper', () => {
  let mockProcessor: jest.Mocked<IStreamProcessor>;
  let mockRetryPolicy: jest.Mocked<IRetryPolicy>;
  // let retryWrapper: RetryWrapper; // Will be initialized in each test or describe block

  beforeEach(() => {
    jest.clearAllMocks(); // This will also clear mockLoggerSetConfig, mockLoggerWarn, etc.

    // Create mock processor
    mockProcessor = {
      processStream: jest.fn()
    };

    // Create mock retry policy
    mockRetryPolicy = {
      shouldRetry: jest.fn(),
      getDelayMs: jest.fn()
    };

    // It's generally better to initialize retryWrapper in each test or describe
    // block if its construction or dependencies might change or need specific assertions.
    // For now, we'll keep the global one but be mindful of this.
    // retryWrapper = new RetryWrapper(mockProcessor, mockRetryPolicy, 3);
  });

  describe('constructor', () => {
    it('should initialize with default max retries', () => {
      const retryWrapper = new RetryWrapper(mockProcessor, mockRetryPolicy);
      expect(retryWrapper).toBeDefined();
      // Now logger.setConfig refers to mockLoggerSetConfig due to dynamic import
      expect(logger.setConfig).toHaveBeenCalledWith(
        expect.objectContaining({ prefix: 'RetryWrapper' })
      );
    });

    it('should initialize with custom max retries', () => {
      const retryWrapper = new RetryWrapper(mockProcessor, mockRetryPolicy, 5);
      expect(retryWrapper).toBeDefined();
      // Check setConfig was called for this instance too
      expect(logger.setConfig).toHaveBeenCalledWith(
        expect.objectContaining({ prefix: 'RetryWrapper' })
      );
    });
  });

  describe('processStream', () => {
    let retryWrapper: any; // Define here to be initialized in beforeEach for this describe block

    beforeEach(() => {
      // Initialize RetryWrapper with mocks for this describe block
      retryWrapper = new RetryWrapper(mockProcessor, mockRetryPolicy, 3);
      // Clear mocks again specifically for logger calls within this new instance
      mockLoggerWarn.mockClear();
      mockLoggerError.mockClear();
    });

    it('should process stream successfully on first attempt', async () => {
      // Setup input stream
      const inputChunks: StreamChunk[] = [
        { content: 'chunk1', isComplete: false },
        { content: 'chunk2', isComplete: true }
      ];

      const inputStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of inputChunks) {
            yield chunk;
          }
        }
      };

      // Setup output from the wrapped processor
      const outputChunks: StreamChunk[] = [
        { content: 'processed1', isComplete: false },
        { content: 'processed2', isComplete: true }
      ];

      mockProcessor.processStream.mockImplementation(() => ({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of outputChunks) {
            yield chunk;
          }
        }
      }));

      // Process the stream
      const result: StreamChunk[] = [];
      for await (const chunk of retryWrapper.processStream(inputStream)) {
        result.push(chunk);
      }

      // Verify results
      expect(result).toEqual(outputChunks);
      expect(mockProcessor.processStream).toHaveBeenCalledTimes(1);
      expect(mockRetryPolicy.shouldRetry).not.toHaveBeenCalled();
      expect(mockRetryPolicy.getDelayMs).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should retry processing when an error occurs and retry policy allows', async () => {
      // Setup input stream
      const inputChunks: StreamChunk[] = [
        { content: 'chunk1', isComplete: false },
        { content: 'chunk2', isComplete: true }];


      const inputStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of inputChunks) {
            yield chunk;
          }
        }
      };

      // Error on first attempt, success on second
      let attempt = 0;
      mockProcessor.processStream.mockImplementation(() => {
        if (attempt === 0) {
          attempt++;
          throw new Error('Processing error');
        }

        return {
          [Symbol.asyncIterator]: async function* () {
            yield { content: 'retry success', isComplete: true, role: 'assistant' };
          }
        };
      });

      // Configure retry policy
      mockRetryPolicy.shouldRetry.mockReturnValue(true);
      mockRetryPolicy.getDelayMs.mockReturnValue(0); // No delay for tests

      // Process the stream
      const result: StreamChunk[] = [];
      for await (const chunk of retryWrapper.processStream(inputStream)) {
        result.push(chunk);
      }

      // Verify results
      expect(result).toEqual([{ content: 'retry success', isComplete: true, role: 'assistant' }]);
      expect(mockProcessor.processStream).toHaveBeenCalledTimes(2);
      expect(mockRetryPolicy.shouldRetry).toHaveBeenCalledTimes(1);
      expect(mockRetryPolicy.shouldRetry).toHaveBeenCalledWith(expect.any(Error), 1);
      expect(mockRetryPolicy.getDelayMs).toHaveBeenCalledTimes(1);
      expect(mockRetryPolicy.getDelayMs).toHaveBeenCalledWith(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Retry attempt 1/3'));
    });

    it('should throw error after max retries exceeded', async () => {
      // Setup input stream
      const inputChunks: StreamChunk[] = [
        { content: 'chunk1', isComplete: true }];


      const inputStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of inputChunks) {
            yield chunk;
          }
        }
      };

      // Always throw error
      mockProcessor.processStream.mockImplementation(() => {
        throw new Error('Persistent error');
      });

      // Configure retry policy
      mockRetryPolicy.shouldRetry.mockReturnValue(true);
      mockRetryPolicy.getDelayMs.mockReturnValue(0); // No delay for tests

      // Process the stream
      const result: StreamChunk[] = [];
      let error: Error | undefined;

      try {
        for await (const chunk of retryWrapper.processStream(inputStream)) {
          result.push(chunk);
        }
      } catch (e) {
        error = e as Error;
      }

      // Verify results
      expect(error).toBeDefined();
      expect(error?.message).toBe('Persistent error');
      expect(mockProcessor.processStream).toHaveBeenCalledTimes(4); // Initial + 3 retries
      expect(mockRetryPolicy.shouldRetry).toHaveBeenCalledTimes(4); // Called for each process attempt
      expect(mockRetryPolicy.getDelayMs).toHaveBeenCalledTimes(3);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Max retries (3) exceeded'));
    });

    it('should not retry when retry policy returns false', async () => {
      // Setup input stream
      const inputChunks: StreamChunk[] = [
        { content: 'chunk1', isComplete: true }];


      const inputStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of inputChunks) {
            yield chunk;
          }
        }
      };

      // Throw error
      mockProcessor.processStream.mockImplementation(() => {
        throw new Error('Not retryable error');
      });

      // Configure retry policy to not retry
      mockRetryPolicy.shouldRetry.mockReturnValue(false);

      // Process the stream
      const result: StreamChunk[] = [];
      let error: Error | undefined;

      try {
        for await (const chunk of retryWrapper.processStream(inputStream)) {
          result.push(chunk);
        }
      } catch (e) {
        error = e as Error;
      }

      // Verify results
      expect(error).toBeDefined();
      expect(error?.message).toBe('Not retryable error');
      expect(mockProcessor.processStream).toHaveBeenCalledTimes(1);
      expect(mockRetryPolicy.shouldRetry).toHaveBeenCalledTimes(1);
      expect(mockRetryPolicy.getDelayMs).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Max retries (3) exceeded or retry not allowed'));
    });

    it('should handle errors in input stream', async () => {
      // Setup input stream that throws
      const inputStream = {
        [Symbol.asyncIterator]: async function* () {
          throw new Error('Input stream error');
          // eslint-disable-next-line no-unreachable
          yield { content: 'unreachable', isComplete: true }; // To satisfy AsyncIterable<StreamChunk>
        }
      };

      // Process the stream
      const result: StreamChunk[] = [];
      let error: Error | undefined;

      try {
        for await (const chunk of retryWrapper.processStream(inputStream)) {
          result.push(chunk);
        }
      } catch (e) {
        error = e as Error;
      }

      // Verify results
      expect(error).toBeDefined();
      expect(error?.message).toBe('Input stream error');
      expect(mockProcessor.processStream).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error in RetryWrapper'));
    });

    it('should handle non-Error exceptions', async () => {
      // Setup input stream
      const inputChunks: StreamChunk[] = [
        { content: 'chunk1', isComplete: true }];

      const inputStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of inputChunks) {
            yield chunk;
          }
        }
      };

      // Throw a string instead of an Error
      mockProcessor.processStream.mockImplementation(() => {
        // eslint-disable-next-line no-throw-literal
        throw 'String exception';
      });

      // Configure retry policy (though it might not be called if error is not an Error instance)
      mockRetryPolicy.shouldRetry.mockReturnValue(false); // Explicitly don't retry non-Error

      // Process the stream
      let caughtException: any;
      try {
        for await (const chunk of retryWrapper.processStream(inputStream)) {
          // Should not reach here
        }
      } catch (e) {
        caughtException = e;
      }

      // Verify results
      expect(caughtException).toBe('String exception');
      expect(mockProcessor.processStream).toHaveBeenCalledTimes(1);
      // Depending on implementation, shouldRetry might not be called for non-Errors
      // If it is, ensure it's only once.
      // For now, we'll check based on the provided code.
      // expect(mockRetryPolicy.shouldRetry).toHaveBeenCalledTimes(1); // or not.toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Max retries (3) exceeded or retry not allowed: String exception'));
    });
  });
});