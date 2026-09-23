jest.mock('@dqbd/tiktoken');

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import OpenAI from 'openai';
import { LLMCaller } from '../../../../core/caller/LLMCaller.ts';
import { HistoryManager } from '../../../../core/history/HistoryManager.ts';
import { TokenCalculator } from '../../../../core/models/TokenCalculator.ts';
import { ResponseProcessor } from '../../../../core/processors/ResponseProcessor.ts';
import { RetryManager } from '../../../../core/retry/RetryManager.ts';
import { isProviderHttpError } from '../../../../core/retry/ProviderHttpError.ts';
import { isProviderTransportError } from '../../../../core/retry/ProviderTransportError.ts';
import { OpenAIResponseAdapter } from '../../../../adapters/openai/adapter.ts';
import { OpenAIResponseValidationError } from '../../../../adapters/openai/errors.ts';
import type { ModelInfo } from '../../../../interfaces/UniversalInterfaces.ts';

const MODEL_NAME = 'gpt-5.1-2025-11-13';

const modelInfo: ModelInfo = {
  name: MODEL_NAME,
  inputPricePerMillion: 0.01,
  outputPricePerMillion: 0.02,
  maxRequestTokens: 4000,
  maxResponseTokens: 1000,
  characteristics: {
    qualityIndex: 5,
    outputSpeed: 5,
    firstTokenLatency: 100
  },
  capabilities: {
    streaming: true,
    toolCalls: true,
    parallelToolCalls: false,
    input: { text: true },
    output: { text: { textOutputFormats: ['text', 'json'] } }
  }
};

describe('callMessages OpenAI BadRequestError provenance', () => {
  let adapter: OpenAIResponseAdapter;
  let createSpy: jest.SpiedFunction<OpenAI['responses']['create']>;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    adapter = new OpenAIResponseAdapter({ apiKey: 'sk-test-offline-no-provider' });
    const client = (adapter as unknown as { client: OpenAI }).client;
    createSpy = jest.spyOn(client.responses, 'create');
    originalFetch = globalThis.fetch;
    fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('fetch must not be called in offline SDK-boundary test');
    });
  });

  afterEach(() => {
    createSpy.mockRestore();
    fetchSpy.mockRestore();
    globalThis.fetch = originalFetch;
  });

  it('preserves BadRequestError cause/status/code/requestID through callMessages', async () => {
    const sdkError = new OpenAI.BadRequestError(
      400,
      { message: 'Synthetic provider rejection', code: 'synthetic_rejection' },
      'Synthetic provider rejection',
      new Headers({ 'x-request-id': 'synthetic-request' })
    );

    expect(sdkError.status).toBe(400);
    expect(sdkError.code).toBe('synthetic_rejection');
    expect(sdkError.requestID).toBe('synthetic-request');

    createSpy.mockRejectedValueOnce(sdkError);

    const historyManager = new HistoryManager('You are a grader.');
    const mockModelManager = {
      getModel: jest.fn((_name?: string) => modelInfo),
      getAvailableModels: jest.fn(() => [modelInfo]),
      addModel: jest.fn(),
      updateModel: jest.fn(),
      resolveModel: jest.fn(() => MODEL_NAME),
      hasModel: jest.fn(() => true)
    };
    const mockProviderManager = {
      getProvider: jest.fn(() => adapter),
      getCurrentProviderName: jest.fn(() => 'openai'),
      getVideoProvider: jest.fn(() => null),
      getImageProvider: jest.fn(() => null),
      switchProvider: jest.fn()
    };
    const mockProviderPool = {
      getProviderScope: jest.fn(() => ['openai']),
      getProvider: jest.fn(() => adapter),
      getInterfaceSupport: jest.fn(() => ({
        chatCall: true,
        streamCall: true,
        imageCall: false,
        videoCall: false,
        embeddingCall: false,
        rerankCall: false,
        evaluateCall: false,
        audioCall: false
      })),
      hasProvider: jest.fn(() => true),
      getInitializedProviders: jest.fn(() => ['openai'])
    };

    const tokenCalculator = new TokenCalculator();
    jest.spyOn(tokenCalculator, 'calculateTokens').mockReturnValue(10);
    jest.spyOn(tokenCalculator, 'calculateTotalTokens').mockReturnValue(40);

    const caller = new LLMCaller('openai', MODEL_NAME, 'You are a grader.', {
      historyManager,
      providerManager: mockProviderManager as never,
      modelManager: mockModelManager as never,
      providerPool: mockProviderPool as never,
      tokenCalculator,
      responseProcessor: new ResponseProcessor(),
      retryManager: new RetryManager({ baseDelay: 1, maxRetries: 2 }),
      settings: {
        retryPolicy: {
          transport: { maxRetries: 2, baseDelayMs: 1 },
          structuredOutput: { maxRetries: 0 },
          content: { maxRetries: 0 }
        }
      }
    });

    try {
      await caller.callMessages([{ role: 'user', content: 'grade this' }], {
        providerStorage: 'disabled'
      });
      throw new Error('expected reject');
    } catch (err) {
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(isProviderHttpError(err)).toBe(true);
      expect(isProviderTransportError(err)).toBe(false);
      if (!isProviderHttpError(err)) throw new Error('expected ProviderHttpError');

      expect(err.status).toBe(400);
      expect(err.providerCode).toBe('synthetic_rejection');
      expect(err.requestId).toBe('synthetic-request');
      expect(err.retryHistory).toEqual([]);

      expect(err.cause).toBeInstanceOf(OpenAIResponseValidationError);
      const adapterErr = err.cause as OpenAIResponseValidationError;
      expect(adapterErr.cause).toBe(sdkError);
      expect(adapterErr.status).toBe(400);
      expect(adapterErr.providerCode).toBe('synthetic_rejection');
      expect(adapterErr.requestId).toBe('synthetic-request');
    }
  });
});
