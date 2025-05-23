import { jest } from "@jest/globals"; import { AdapterError, BaseAdapter, type AdapterConfig } from '../../../../adapters/base/baseAdapter.ts';
import type { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse } from '../../../../interfaces/UniversalInterfaces.ts';

// Concrete implementation for testing
class TestAdapter extends BaseAdapter {
  chatCall(model: string, params: UniversalChatParams): Promise<UniversalChatResponse> {
    return Promise.resolve({
      content: 'test response',
      role: 'assistant'
    });
  }

  streamCall(model: string, params: UniversalChatParams): Promise<AsyncIterable<UniversalStreamResponse>> {
    const stream = {
      async *[Symbol.asyncIterator]() {
        yield {
          content: 'test stream',
          role: 'assistant',
          isComplete: true
        };
      }
    };
    return Promise.resolve(stream);
  }

  convertToProviderParams(model: string, params: UniversalChatParams): unknown {
    return { ...params, model };
  }

  convertFromProviderResponse(response: unknown): UniversalChatResponse {
    return {
      content: 'converted response',
      role: 'assistant'
    };
  }

  convertFromProviderStreamResponse(response: unknown): UniversalStreamResponse {
    return {
      content: 'converted stream',
      role: 'assistant',
      isComplete: true
    };
  }
}

describe('BaseAdapter', () => {
  describe('AdapterError', () => {
    it('should create error with correct name and message', () => {
      const error = new AdapterError('test error');
      expect(error.name).toBe('AdapterError');
      expect(error.message).toBe('test error');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('BaseAdapter', () => {
    describe('constructor', () => {
      it('should create instance with valid config', () => {
        const config: AdapterConfig = {
          apiKey: 'test-key'
        };
        const adapter = new TestAdapter(config);
        expect(adapter).toBeInstanceOf(BaseAdapter);
      });

      it('should create instance with full config', () => {
        const config: AdapterConfig = {
          apiKey: 'test-key',
          baseUrl: 'https://api.test.com',
          organization: 'test-org'
        };
        const adapter = new TestAdapter(config);
        expect(adapter).toBeInstanceOf(BaseAdapter);
      });

      it('should throw error if apiKey is missing', () => {
        const config = {} as AdapterConfig;
        expect(() => new TestAdapter(config)).toThrow(AdapterError);
        expect(() => new TestAdapter(config)).toThrow('API key is required');
      });

      it('should throw error if apiKey is empty', () => {
        const config: AdapterConfig = {
          apiKey: ''
        };
        expect(() => new TestAdapter(config)).toThrow(AdapterError);
        expect(() => new TestAdapter(config)).toThrow('API key is required');
      });
    });

    describe('abstract methods', () => {
      let adapter: TestAdapter;

      beforeEach(() => {
        adapter = new TestAdapter({ apiKey: 'test-key' });
      });

      it('should implement chatCall', async () => {
        const response = await adapter.chatCall('test-model', {
          messages: [{ role: 'user', content: 'test' }],
          model: 'test-model'
        });
        expect(response).toEqual({
          content: 'test response',
          role: 'assistant'
        });
      });

      it('should implement streamCall', async () => {
        const stream = await adapter.streamCall('test-model', {
          messages: [{ role: 'user', content: 'test' }],
          model: 'test-model'
        });
        const chunks = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        expect(chunks).toEqual([{
          content: 'test stream',
          role: 'assistant',
          isComplete: true
        }]);
      });

      it('should implement convertToProviderParams', () => {
        const params: UniversalChatParams = {
          messages: [{ role: 'user', content: 'test' }],
          model: 'test-model'
        };
        const result = adapter.convertToProviderParams('test-model', params);
        expect(result).toEqual({
          model: 'test-model',
          messages: [{ role: 'user', content: 'test' }]
        });
      });

      it('should implement convertFromProviderResponse', () => {
        const response = adapter.convertFromProviderResponse({});
        expect(response).toEqual({
          content: 'converted response',
          role: 'assistant'
        });
      });

      it('should implement convertFromProviderStreamResponse', () => {
        const response = adapter.convertFromProviderStreamResponse({});
        expect(response).toEqual({
          content: 'converted stream',
          role: 'assistant',
          isComplete: true
        });
      });
    });
  });
});