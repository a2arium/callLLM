// @ts-nocheck
import { jest, describe, it, expect, afterEach, beforeEach } from '@jest/globals';
import { ContentAccumulator } from '../../../../../core/streaming/processors/ContentAccumulator.js';
import { StreamChunk, ToolCallChunk } from '../../../../../core/streaming/types.js';
import { FinishReason, UniversalStreamResponse } from '../../../../../interfaces/UniversalInterfaces.js';
import { ToolCall } from '../../../../../types/tooling.js';

describe('ContentAccumulator', () => {
  let contentAccumulator: ContentAccumulator;

  beforeEach(() => {
    // Set LOG_LEVEL to a custom level to test constructor branch
    process.env.LOG_LEVEL = 'debug';
    contentAccumulator = new ContentAccumulator();
  });

  afterEach(() => {
    delete process.env.LOG_LEVEL;
  });

  describe('constructor', () => {
    it('should initialize correctly', () => {
      expect(contentAccumulator).toBeDefined();
      expect(contentAccumulator.getAccumulatedContent()).toBe('');
      expect(contentAccumulator.getCompletedToolCalls()).toEqual([]);
    });
  });

  describe('processStream', () => {
    it('should accumulate content from chunks', async () => {
      const chunks: (StreamChunk & Partial<UniversalStreamResponse>)[] = [
        { content: 'Hello', role: 'assistant', isComplete: false },
        { content: ' world', role: 'assistant', isComplete: false },
        { content: '!', role: 'assistant', isComplete: true }];


      // Create async iterable of chunks
      const stream = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of chunks) {
            yield chunk;
          }
        }
      };

      // Process the stream
      const resultChunks: StreamChunk[] = [];
      for await (const chunk of contentAccumulator.processStream(stream)) {
        resultChunks.push(chunk);
      }

      // Verify the accumulated content
      expect(contentAccumulator.getAccumulatedContent()).toBe('Hello world!');

      // Verify the accumulated content in metadata
      expect(resultChunks[0].metadata?.accumulatedContent).toBe('Hello');
      expect(resultChunks[1].metadata?.accumulatedContent).toBe('Hello world');
      expect(resultChunks[2].metadata?.accumulatedContent).toBe('Hello world!');
    });

    it('should handle empty stream', async () => {
      const chunks: StreamChunk[] = [];

      // Create async iterable of chunks
      const stream = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of chunks) {
            yield chunk;
          }
        }
      };

      // Process the stream
      const resultChunks: StreamChunk[] = [];
      for await (const chunk of contentAccumulator.processStream(stream)) {
        resultChunks.push(chunk);
      }

      // Verify the accumulated content
      expect(contentAccumulator.getAccumulatedContent()).toBe('');
      expect(resultChunks.length).toBe(0);
    });

    it('should handle chunks with no content', async () => {
      const chunks: (StreamChunk & Partial<UniversalStreamResponse>)[] = [
        { role: 'assistant', isComplete: false },
        { role: 'assistant', isComplete: true }];


      // Create async iterable of chunks
      const stream = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of chunks) {
            yield chunk;
          }
        }
      };

      // Process the stream
      const resultChunks: StreamChunk[] = [];
      for await (const chunk of contentAccumulator.processStream(stream)) {
        resultChunks.push(chunk);
      }

      // Verify the accumulated content
      expect(contentAccumulator.getAccumulatedContent()).toBe('');
      expect(resultChunks.length).toBe(2);
    });

    it('should handle tool call chunks and accumulate arguments', async () => {
      const inputChunks = [
        {
          content: 'Using tool: ',
          toolCallChunks: [
            {
              index: 0,
              id: 'tool1',
              name: 'calculator',
              argumentsChunk: '{"operation":'
            }],

          isComplete: false
        },
        {
          content: 'calculator',
          toolCallChunks: [
            {
              index: 0,
              argumentsChunk: '"add", "a": 5'
            }],

          isComplete: false
        },
        {
          content: '',
          toolCallChunks: [
            {
              index: 0,
              argumentsChunk: ', "b": 3}'
            }],

          isComplete: true,
          metadata: {
            finishReason: FinishReason.TOOL_CALLS
          }
        }];


      const outputChunks = [] as any[];
      for await (const chunk of contentAccumulator.processStream(streamFromArray(inputChunks as any))) {
        outputChunks.push(chunk as any);
      }

      expect(outputChunks.length).toBe(3);

      // Last chunk should have the complete tool call
      const lastChunk = outputChunks[2] as any;
      expect((lastChunk as any).toolCalls).toBeDefined();
      expect((lastChunk as any).toolCalls?.[0].name).toBe('calculator');
      expect((lastChunk as any).toolCalls?.[0].arguments).toEqual({
        operation: 'add',
        a: 5,
        b: 3
      });

      // Check accumulated content
      expect(contentAccumulator.getAccumulatedContent()).toBe('Using tool: calculator');
      expect(contentAccumulator.getCompletedToolCalls().length).toBe(1);
    });

    it('should handle invalid JSON in tool call arguments', async () => {
      const inputChunks = [
        {
          content: 'Using tool: ',
          toolCallChunks: [
            {
              index: 0,
              id: 'tool1',
              name: 'calculator',
              argumentsChunk: '{"invalid JSON'
            }],

          isComplete: false
        },
        {
          content: '',
          isComplete: true,
          metadata: {
            finishReason: FinishReason.TOOL_CALLS
          }
        }];


      const outputChunks = [] as any[];
      for await (const chunk of contentAccumulator.processStream(streamFromArray(inputChunks as any))) {
        outputChunks.push(chunk as any);
      }

      expect(outputChunks.length).toBe(2);

      // No completed tool calls due to invalid JSON
      expect(outputChunks[1].toolCalls).toBeUndefined();

      // Should still accumulate content
      expect(contentAccumulator.getAccumulatedContent()).toBe('Using tool: ');
      expect(contentAccumulator.getCompletedToolCalls().length).toBe(0);
    });

    it('should handle chunks with no content or tool calls', async () => {
      const inputChunks = [
        {
          isComplete: false
        },
        {
          isComplete: true,
          metadata: {
            finishReason: FinishReason.STOP
          }
        }];


      const outputChunks = [] as any[];
      for await (const chunk of contentAccumulator.processStream(streamFromArray(inputChunks as any))) {
        outputChunks.push(chunk as any);
      }

      expect(outputChunks.length).toBe(2);
      expect(contentAccumulator.getAccumulatedContent()).toBe('');
    });

    it('should handle multiple tool calls in different chunks', async () => {
      const inputChunks = [
        {
          content: 'Using tools: ',
          toolCallChunks: [
            {
              index: 0,
              id: 'tool1',
              name: 'calculator',
              argumentsChunk: '{"operation":"add", "a": 5, "b": 3}'
            }],

          isComplete: false
        },
        {
          content: 'and ',
          toolCallChunks: [
            {
              index: 1,
              id: 'tool2',
              name: 'weather',
              argumentsChunk: '{"location":"New York"}'
            }],

          isComplete: true,
          metadata: {
            finishReason: FinishReason.TOOL_CALLS
          }
        }];


      const outputChunks = [] as any[];
      for await (const chunk of contentAccumulator.processStream(streamFromArray(inputChunks as any))) {
        outputChunks.push(chunk as any);
      }

      // Verify both tool calls are completed
      expect(contentAccumulator.getCompletedToolCalls().length).toBe(2);

      // Verify arguments were parsed correctly
      const toolCalls = contentAccumulator.getCompletedToolCalls();
      expect(toolCalls[0].name).toBe('calculator');
      expect(toolCalls[0].arguments).toEqual({
        operation: 'add',
        a: 5,
        b: 3
      });
      expect(toolCalls[1].name).toBe('weather');
      expect(toolCalls[1].arguments).toEqual({
        location: 'New York'
      });
    });

    it('should reset accumulated content and tool calls', async () => {
      const inputChunks = [
        {
          content: 'Hello',
          toolCallChunks: [
            {
              index: 0,
              id: 'tool1',
              name: 'calculator',
              argumentsChunk: '{"operation":"add", "a": 5, "b": 3}'
            }],

          isComplete: true,
          metadata: {
            finishReason: FinishReason.TOOL_CALLS
          }
        }];


      for await (const chunk of contentAccumulator.processStream(streamFromArray(inputChunks as any))) {



        // Process the chunk
      } // Verify content and tool calls were accumulated
      expect(contentAccumulator.getAccumulatedContent()).toBe('Hello'); expect(contentAccumulator.getCompletedToolCalls().length).toBe(1);

      // Reset the processor
      contentAccumulator.reset();

      // Verify everything was reset
      expect(contentAccumulator.getAccumulatedContent()).toBe('');
      expect(contentAccumulator.getCompletedToolCalls().length).toBe(0);
    });

    it('should handle edge case - tool call with no name', async () => {
      const inputChunks = [
        {
          content: 'Using tool: ',
          toolCallChunks: [
            {
              index: 0,
              id: 'tool1',
              argumentsChunk: '{"operation":"add"}'
            }],

          isComplete: true,
          metadata: {
            finishReason: FinishReason.TOOL_CALLS
          }
        }];


      const outputChunks = [] as any[];
      for await (const chunk of contentAccumulator.processStream(streamFromArray(inputChunks as any))) {
        outputChunks.push(chunk as any);
      }

      // No tool call should be created without a name
      expect(contentAccumulator.getCompletedToolCalls().length).toBe(0);
    });

    it('should handle incomplete tool calls properly', async () => {
      const inputChunks = [
        {
          content: 'Using tool: ',
          toolCallChunks: [
            {
              index: 0,
              id: 'tool1',
              name: 'calculator',
              argumentsChunk: '{"operation":"add", "a": 5, "b": 3}'
            }],

          isComplete: false // Not marked as complete
        }];


      const outputChunks = [] as any[];
      for await (const chunk of contentAccumulator.processStream(streamFromArray(inputChunks as any))) {
        outputChunks.push(chunk as any);
      }

      // Tool call should not be marked as complete
      expect(contentAccumulator.getCompletedToolCalls().length).toBe(0);
    });

    // Helper function to convert array to async iterable
    function streamFromArray<T>(array: T[]): AsyncIterable<T> {
      return {
        [Symbol.asyncIterator]: async function* () {
          for (const item of array) {
            yield item;
          }
        }
      };
    }
  });

  describe('getAccumulatedContent', () => {
    it('should return the current accumulated content', async () => {
      const chunks: (StreamChunk & Partial<UniversalStreamResponse>)[] = [
        { content: 'Hello', role: 'assistant', isComplete: false },
        { content: ' world', role: 'assistant', isComplete: true }];


      // Create async iterable of chunks
      const stream = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of chunks) {
            yield chunk;
          }
        }
      };

      // Process part of the stream and check intermediate content
      const iterator = contentAccumulator.processStream(stream)[Symbol.asyncIterator]();
      await iterator.next(); // Process first chunk

      expect(contentAccumulator.getAccumulatedContent()).toBe('Hello');

      await iterator.next(); // Process second chunk

      expect(contentAccumulator.getAccumulatedContent()).toBe('Hello world');
    });
  });

  describe('getCompletedToolCalls', () => {
    it('should return all completed tool calls', async () => {
      const chunks: (StreamChunk & Partial<UniversalStreamResponse>)[] = [
        {
          content: '',
          role: 'assistant',
          isComplete: false,
          toolCallChunks: [
            {
              index: 0,
              id: 'tool-1',
              name: 'get_weather',
              argumentsChunk: '{"city": "New York"}'
            } as ToolCallChunk]

        },
        {
          content: '',
          role: 'assistant',
          isComplete: false,
          toolCallChunks: [
            {
              index: 1,
              id: 'tool-2',
              name: 'get_time',
              argumentsChunk: '{"timezone": "EST"}'
            } as ToolCallChunk]

        },
        {
          content: '',
          role: 'assistant',
          isComplete: true,
          metadata: {
            finishReason: FinishReason.TOOL_CALLS
          }
        }];


      // Create async iterable of chunks
      const stream = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of chunks) {
            yield chunk;
          }
        }
      };

      // Process the stream
      for await (const _ of contentAccumulator.processStream(stream)) {



        // We don't need the chunks for this test
      } // Get completed tool calls
      const completedToolCalls = contentAccumulator.getCompletedToolCalls();
      // Verify the calls
      expect(completedToolCalls.length).toBe(2);

      // Check the tool calls are in order
      expect(completedToolCalls[0].id).toBe('tool-1');
      expect(completedToolCalls[0].name).toBe('get_weather');
      expect(completedToolCalls[0].arguments).toEqual({ city: 'New York' });

      expect(completedToolCalls[1].id).toBe('tool-2');
      expect(completedToolCalls[1].name).toBe('get_time');
      expect(completedToolCalls[1].arguments).toEqual({ timezone: 'EST' });
    });

    it('should return a copy of the completed tool calls array', async () => {
      const chunks: (StreamChunk & Partial<UniversalStreamResponse>)[] = [
        {
          content: '',
          role: 'assistant',
          isComplete: false,
          toolCallChunks: [
            {
              index: 0,
              id: 'tool-1',
              name: 'get_weather',
              argumentsChunk: '{"city": "New York"}'
            } as ToolCallChunk]

        },
        {
          content: '',
          role: 'assistant',
          isComplete: true,
          metadata: {
            finishReason: FinishReason.TOOL_CALLS
          }
        }];


      // Create async iterable of chunks
      const stream = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of chunks) {
            yield chunk;
          }
        }
      };

      // Process the stream
      for await (const _ of contentAccumulator.processStream(stream)) {



        // We don't need the chunks for this test
      } // Get completed tool calls
      const completedToolCalls = contentAccumulator.getCompletedToolCalls(); expect(completedToolCalls.length).toBe(1);

      // Modify the returned array
      completedToolCalls.push({
        id: 'fake-tool',
        name: 'fake_tool',
        arguments: {}
      });

      // The internal array should not be affected
      const newToolCalls = contentAccumulator.getCompletedToolCalls();
      expect(newToolCalls.length).toBe(1);
      expect(newToolCalls[0].id).toBe('tool-1');
    });
  });
});