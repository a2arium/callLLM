import { jest } from '@jest/globals';
import { StreamPipeline } from '../../../../core/streaming/StreamPipeline.ts';
import type { StreamChunk, IStreamProcessor } from '../../../../core/streaming/types.d.ts';
import type { ToolCall } from '../../../../types/tooling.ts';
import { logger } from '../../../../utils/logger.ts';

// Mock logger
jest.unstable_mockModule('@/utils/logger.ts', () => ({
  __esModule: true,
  logger: {
    setConfig: jest.fn(),
    createLogger: jest.fn().mockReturnValue({
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn()
    })
  }
}));

describe('StreamPipeline', () => {
  // Create a mock stream processor
  const createMockProcessor = (name: string): IStreamProcessor => {
    return {
      processStream: jest.fn(async function* (stream: AsyncIterable<StreamChunk>) {
        for await (const chunk of stream) {
          // Add a marker to track this processor's execution
          const metadata = chunk.metadata ? { ...chunk.metadata } : {};
          metadata[`processed_by_${name}`] = true;

          // Yield a new object with all properties from chunk and the updated metadata
          yield {
            ...chunk,
            metadata
          };
        }
      })
    };
  };

  // Helper to create a test stream
  const createTestStream = async function* (chunks: StreamChunk[]): AsyncIterable<StreamChunk> {
    for (const chunk of chunks) {
      yield chunk;
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with empty processors array by default', () => {
      const pipeline = new StreamPipeline();
      expect((pipeline as any).processors).toEqual([]);
    });

    it('should initialize with provided processors', () => {
      const processor1 = createMockProcessor('proc1');
      const processor2 = createMockProcessor('proc2');

      const pipeline = new StreamPipeline([processor1, processor2]);
      expect((pipeline as any).processors).toEqual([processor1, processor2]);
    });

    it('should initialize logger with LOG_LEVEL environment variable', () => {
      const originalEnv = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'info';

      const pipeline = new StreamPipeline();
      expect((pipeline as any).processors).toEqual([]);

      process.env.LOG_LEVEL = originalEnv;
    });

    it('should initialize logger with default level when LOG_LEVEL not set', () => {
      const originalEnv = process.env.LOG_LEVEL;
      delete process.env.LOG_LEVEL;

      const pipeline = new StreamPipeline();
      expect((pipeline as any).processors).toEqual([]);

      process.env.LOG_LEVEL = originalEnv;
    });
  });

  describe('addProcessor', () => {
    it('should add a processor to the pipeline', () => {
      const pipeline = new StreamPipeline();
      const processor = createMockProcessor('new-proc');

      pipeline.addProcessor(processor);

      expect((pipeline as any).processors).toEqual([processor]);
    });

    it('should add multiple processors in sequence', () => {
      const pipeline = new StreamPipeline();
      const processor1 = createMockProcessor('proc1');
      const processor2 = createMockProcessor('proc2');

      pipeline.addProcessor(processor1);
      pipeline.addProcessor(processor2);

      expect((pipeline as any).processors).toEqual([processor1, processor2]);
    });
  });

  describe('processStream', () => {
    it('should process stream through all processors in sequence', async () => {
      const processor1 = createMockProcessor('proc1');
      const processor2 = createMockProcessor('proc2');

      const pipeline = new StreamPipeline([processor1, processor2]);

      const inputChunks = [
        { content: 'test1' },
        { content: 'test2' }];


      const stream = createTestStream(inputChunks);
      const result = pipeline.processStream(stream);

      const outputChunks: StreamChunk[] = [];
      for await (const chunk of result) {
        outputChunks.push(chunk);
      }

      expect(processor1.processStream).toHaveBeenCalled();
      expect(processor2.processStream).toHaveBeenCalled();

      // Each processor should have added its marker to the metadata
      expect(outputChunks.length).toBe(2);
      expect(outputChunks[0].metadata).toBeDefined();
      expect(outputChunks[0].metadata?.processed_by_proc1).toBeTruthy();
      expect(outputChunks[0].metadata?.processed_by_proc2).toBeTruthy();
      expect(outputChunks[1].metadata).toBeDefined();
      expect(outputChunks[1].metadata?.processed_by_proc1).toBeTruthy();
      expect(outputChunks[1].metadata?.processed_by_proc2).toBeTruthy();
    });

    it('should handle empty processor list', async () => {
      const pipeline = new StreamPipeline([]);

      const inputChunks = [
        { content: 'test1' },
        { content: 'test2' }];


      const stream = createTestStream(inputChunks);
      const result = pipeline.processStream(stream);

      const outputChunks: StreamChunk[] = [];
      for await (const chunk of result) {
        outputChunks.push(chunk);
      }

      // With no processors, output should match input
      expect(outputChunks).toEqual(inputChunks);
    });

    it('should maintain stream chunk order', async () => {
      const processor = createMockProcessor('order-test');
      const pipeline = new StreamPipeline([processor]);

      const inputChunks = [
        { content: 'first' },
        { content: 'second' },
        { content: 'third' }];


      const stream = createTestStream(inputChunks);
      const result = pipeline.processStream(stream);

      const outputChunks: StreamChunk[] = [];
      for await (const chunk of result) {
        outputChunks.push(chunk);
      }

      expect(outputChunks.length).toBe(3);
      expect(outputChunks[0].content).toBe('first');
      expect(outputChunks[1].content).toBe('second');
      expect(outputChunks[2].content).toBe('third');
    });

    it('should pass complete StreamChunk properties through the pipeline', async () => {
      // Explicitly create a processor that sets the metadata
      const processor: IStreamProcessor = {
        processStream: jest.fn(async function* (stream: AsyncIterable<StreamChunk>) {
          for await (const chunk of stream) {
            const newMetadata = { ...(chunk.metadata || {}) };
            newMetadata.processed_by_full_props = true;

            yield {
              ...chunk,
              metadata: newMetadata
            };
          }
        })
      };

      const pipeline = new StreamPipeline([processor]);

      const toolCall: ToolCall = {
        id: 'tool1',
        name: 'testTool',
        arguments: { param1: 'value1' }
      };

      const inputChunk: StreamChunk = {
        content: 'test',
        isComplete: true,
        toolCalls: [toolCall],
        metadata: { original: true }
      };

      const stream = createTestStream([inputChunk]);
      const result = pipeline.processStream(stream);

      const outputChunks: StreamChunk[] = [];
      for await (const chunk of result) {
        outputChunks.push(chunk);
      }

      expect(outputChunks.length).toBe(1);
      expect(outputChunks[0].content).toBe('test');
      expect(outputChunks[0].isComplete).toBe(true);
      expect(outputChunks[0].toolCalls).toEqual([toolCall]);

      // Check that metadata contains both original and processor-added properties
      expect(outputChunks[0].metadata).toBeDefined();
      expect(outputChunks[0].metadata?.original).toBe(true);
      expect(outputChunks[0].metadata?.processed_by_full_props).toBe(true);
    });
  });
});