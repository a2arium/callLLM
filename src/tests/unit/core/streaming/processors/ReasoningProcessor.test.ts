import { jest } from "@jest/globals";import { ReasoningProcessor } from '../../../../../core/streaming/processors/ReasoningProcessor.js';
import { StreamChunk } from '../../../../../core/streaming/types.js';
import { UniversalStreamResponse } from '../../../../../interfaces/UniversalInterfaces.js';

describe('ReasoningProcessor', () => {
  let reasoningProcessor: ReasoningProcessor;

  beforeEach(() => {
    reasoningProcessor = new ReasoningProcessor();
  });

  describe('constructor', () => {
    it('should initialize correctly', () => {
      expect(reasoningProcessor).toBeDefined();
      expect(reasoningProcessor.getAccumulatedReasoning()).toBe('');
      expect(reasoningProcessor.hasReasoning()).toBe(false);
    });
  });

  describe('processStream', () => {
    it('should accumulate reasoning from chunks', async () => {
      const chunks: (StreamChunk & Partial<UniversalStreamResponse>)[] = [
      { content: 'Hello', reasoning: 'Let me think about this.', role: 'assistant', isComplete: false },
      { content: ' world', reasoning: ' After analyzing the query', role: 'assistant', isComplete: false },
      { content: '!', reasoning: ', I can respond.', role: 'assistant', isComplete: true }];


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
      for await (const chunk of reasoningProcessor.processStream(stream)) {
        resultChunks.push(chunk);
      }

      // Verify the accumulated reasoning
      expect(reasoningProcessor.getAccumulatedReasoning()).toBe('Let me think about this. After analyzing the query, I can respond.');
      expect(reasoningProcessor.hasReasoning()).toBe(true);

      // Verify the accumulated reasoning in metadata
      expect(resultChunks[0].metadata?.accumulatedReasoning).toBe('Let me think about this.');
      expect(resultChunks[1].metadata?.accumulatedReasoning).toBe('Let me think about this. After analyzing the query');
      expect(resultChunks[2].metadata?.accumulatedReasoning).toBe('Let me think about this. After analyzing the query, I can respond.');

      // Verify the hasReasoningContent flag in metadata
      expect(resultChunks[0].metadata?.hasReasoningContent).toBe(true);
      expect(resultChunks[1].metadata?.hasReasoningContent).toBe(true);
      expect(resultChunks[2].metadata?.hasReasoningContent).toBe(true);
    });

    it('should handle stream with no reasoning content', async () => {
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
      for await (const chunk of reasoningProcessor.processStream(stream)) {
        resultChunks.push(chunk);
      }

      // Verify no reasoning was accumulated
      expect(reasoningProcessor.getAccumulatedReasoning()).toBe('');
      expect(reasoningProcessor.hasReasoning()).toBe(false);

      // Verify the metadata
      expect(resultChunks[0].metadata?.accumulatedReasoning).toBe('');
      expect(resultChunks[0].metadata?.hasReasoningContent).toBe(false);
    });

    it('should preserve existing metadata', async () => {
      const existingMetadata = {
        model: 'gpt-4',
        temperature: 0.7
      };

      const chunks: (StreamChunk & Partial<UniversalStreamResponse>)[] = [
      {
        content: 'Hello',
        reasoning: 'Reasoning content',
        role: 'assistant',
        isComplete: false,
        metadata: existingMetadata
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
      let resultChunk: StreamChunk | null = null;
      for await (const chunk of reasoningProcessor.processStream(stream)) {
        resultChunk = chunk;
      }

      // Verify the metadata was preserved and enhanced
      expect(resultChunk).not.toBeNull();
      expect(resultChunk?.metadata?.model).toBe('gpt-4');
      expect(resultChunk?.metadata?.temperature).toBe(0.7);
      expect(resultChunk?.metadata?.accumulatedReasoning).toBe('Reasoning content');
      expect(resultChunk?.metadata?.hasReasoningContent).toBe(true);
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
      for await (const chunk of reasoningProcessor.processStream(stream)) {
        resultChunks.push(chunk);
      }

      // Verify no reasoning was accumulated
      expect(reasoningProcessor.getAccumulatedReasoning()).toBe('');
      expect(reasoningProcessor.hasReasoning()).toBe(false);
      expect(resultChunks.length).toBe(0);
    });
  });

  describe('getAccumulatedReasoning', () => {
    it('should return the current accumulated reasoning', async () => {
      const chunks: (StreamChunk & Partial<UniversalStreamResponse>)[] = [
      { content: 'Hello', reasoning: 'First reasoning part', role: 'assistant', isComplete: false },
      { content: ' world', reasoning: ' Second reasoning part', role: 'assistant', isComplete: true }];


      // Create async iterable of chunks
      const stream = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of chunks) {
            yield chunk;
          }
        }
      };

      // Process part of the stream and check intermediate reasoning
      const iterator = reasoningProcessor.processStream(stream)[Symbol.asyncIterator]();
      await iterator.next(); // Process first chunk

      expect(reasoningProcessor.getAccumulatedReasoning()).toBe('First reasoning part');
      expect(reasoningProcessor.hasReasoning()).toBe(true);

      await iterator.next(); // Process second chunk

      expect(reasoningProcessor.getAccumulatedReasoning()).toBe('First reasoning part Second reasoning part');
      expect(reasoningProcessor.hasReasoning()).toBe(true);
    });
  });

  describe('hasReasoning', () => {
    it('should return true if reasoning content was received', async () => {
      const chunks: (StreamChunk & Partial<UniversalStreamResponse>)[] = [
      { content: 'Hello', role: 'assistant', isComplete: false },
      { content: ' world', reasoning: 'Some reasoning', role: 'assistant', isComplete: true }];


      // Create async iterable of chunks
      const stream = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of chunks) {
            yield chunk;
          }
        }
      };

      // Process the stream
      for await (const _ of reasoningProcessor.processStream(stream)) {



        // We don't need the chunks for this test
      } // Verify reasoning detection
      expect(reasoningProcessor.hasReasoning()).toBe(true);});

    it('should return false if no reasoning content was received', async () => {
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

      // Process the stream
      for await (const _ of reasoningProcessor.processStream(stream)) {



        // We don't need the chunks for this test
      } // Verify reasoning detection
      expect(reasoningProcessor.hasReasoning()).toBe(false);});
  });

  describe('reset', () => {
    it('should clear accumulated reasoning', async () => {
      const chunks: (StreamChunk & Partial<UniversalStreamResponse>)[] = [
      { content: 'Hello', reasoning: 'Some reasoning', role: 'assistant', isComplete: true }];


      // Create async iterable of chunks
      const stream = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of chunks) {
            yield chunk;
          }
        }
      };

      // Process the stream
      for await (const _ of reasoningProcessor.processStream(stream)) {



        // We don't need the chunks for this test
      } // Verify we have reasoning content
      expect(reasoningProcessor.getAccumulatedReasoning()).toBe('Some reasoning');expect(reasoningProcessor.hasReasoning()).toBe(true);

      // Reset the processor
      reasoningProcessor.reset();

      // Verify everything is cleared
      expect(reasoningProcessor.getAccumulatedReasoning()).toBe('');
      expect(reasoningProcessor.hasReasoning()).toBe(false);
    });
  });
});