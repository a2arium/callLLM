jest.mock('@dqbd/tiktoken');

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { LLMCaller } from '../../../../core/caller/LLMCaller.ts';
import { HistoryManager } from '../../../../core/history/HistoryManager.ts';
import { TokenCalculator } from '../../../../core/models/TokenCalculator.ts';
import { ResponseProcessor } from '../../../../core/processors/ResponseProcessor.ts';
import { RetryManager } from '../../../../core/retry/RetryManager.ts';
import {
  CallMessagesValidationError,
  ProviderStorageUnsupportedError,
  RequestContextOverflowError,
  validateAndCloneRequestMessages,
  applyProviderStoragePolicy
} from '../../../../core/caller/callMessages.ts';
import {
  FinishReason,
  type ModelInfo,
  type RequestScopedTextMessage,
  type UniversalChatParams,
  type UniversalChatResponse,
  type UniversalMessage
} from '../../../../interfaces/UniversalInterfaces.ts';
import type { ToolDefinition } from '../../../../types/tooling.ts';
import type { RegisteredProviders } from '../../../../adapters/index.ts';
import { LLMAbortError, LLMTimeoutError } from '../../../../core/execution/errors.ts';

const MODEL_NAME = 'test-model';
const CONSTRUCTOR_SYSTEM = 'Constructor system that must not be injected.';

const baseModelInfo: ModelInfo = {
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

function usageMeta(total = 20): UniversalChatResponse['metadata'] {
  return {
    finishReason: FinishReason.STOP,
    usage: {
      tokens: {
        input: { total: 10, cached: 0 },
        output: { total: 10, reasoning: 0 },
        total
      },
      costs: {
        input: { total: 0.0001, cached: 0 },
        output: { total: 0.0002, reasoning: 0 },
        total: 0.0003
      }
    }
  };
}

function textResponse(content: string): UniversalChatResponse {
  return {
    content,
    role: 'assistant',
    metadata: usageMeta(),
    toolCalls: []
  };
}

type CapturedAttempt = {
  messages: UniversalMessage[];
  settings: UniversalChatParams['settings'];
};

describe('validateAndCloneRequestMessages', () => {
  it('clones and preserves whitespace and order', () => {
    const input: RequestScopedTextMessage[] = [
      { role: 'system', content: '  sys  ' },
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
      { role: 'user', content: 'hi' }
    ];
    const cloned = validateAndCloneRequestMessages(input);
    expect(cloned).toEqual(input);
    expect(cloned[0]).not.toBe(input[0]);
  });

  it('rejects empty array', () => {
    expect(() => validateAndCloneRequestMessages([])).toThrow(CallMessagesValidationError);
  });

  it('rejects empty content', () => {
    expect(() => validateAndCloneRequestMessages([
      { role: 'user', content: '' }
    ])).toThrow(CallMessagesValidationError);
  });

  it('rejects multiple system messages', () => {
    expect(() => validateAndCloneRequestMessages([
      { role: 'system', content: 'a' },
      { role: 'system', content: 'b' },
      { role: 'user', content: 'c' }
    ])).toThrow(CallMessagesValidationError);
  });

  it('rejects unsupported role', () => {
    expect(() => validateAndCloneRequestMessages([
      { role: 'tool' as 'user', content: 'x' }
    ])).toThrow(CallMessagesValidationError);
  });

  it('rejects extra fields', () => {
    expect(() => validateAndCloneRequestMessages([
      { role: 'user', content: 'x', name: 'n' } as RequestScopedTextMessage
    ])).toThrow(CallMessagesValidationError);
  });

  it('rejects non-final user', () => {
    expect(() => validateAndCloneRequestMessages([
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' }
    ])).toThrow(CallMessagesValidationError);
  });
});

describe('LLMCaller.callMessages', () => {
  let mockChatCall: jest.MockedFunction<
    (model: string, params: UniversalChatParams) => Promise<UniversalChatResponse>
  >;
  let historyManager: HistoryManager;
  let caller: LLMCaller;
  let tokenCalculator: TokenCalculator;

  function createCaller(opts?: { maxRequestTokens?: number; provider?: RegisteredProviders }): LLMCaller {
    historyManager = new HistoryManager(CONSTRUCTOR_SYSTEM);
    mockChatCall = jest.fn(async () => textResponse('ok'));
    const providerName = opts?.provider ?? 'openai';

    const mockProvider = {
      chatCall: mockChatCall,
      streamCall: jest.fn(),
      name: 'mock'
    };

    const mockProviderManager = {
      getProvider: jest.fn(() => mockProvider),
      getCurrentProviderName: jest.fn(() => providerName),
      getVideoProvider: jest.fn(() => null),
      getImageProvider: jest.fn(() => null),
      switchProvider: jest.fn()
    };

    const modelInfo: ModelInfo = {
      ...baseModelInfo,
      maxRequestTokens: opts?.maxRequestTokens ?? baseModelInfo.maxRequestTokens
    };

    const mockModelManager = {
      getModel: jest.fn((_name?: string) => modelInfo),
      getAvailableModels: jest.fn(() => [modelInfo]),
      addModel: jest.fn(),
      updateModel: jest.fn(),
      resolveModel: jest.fn(() => MODEL_NAME),
      hasModel: jest.fn(() => true)
    };

    const mockProviderPool = {
      getProviderScope: jest.fn(() => [providerName]),
      getProvider: jest.fn(() => mockProvider),
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
      getInitializedProviders: jest.fn(() => [providerName])
    };

    tokenCalculator = new TokenCalculator();
    jest.spyOn(tokenCalculator, 'calculateTokens').mockReturnValue(10);
    jest.spyOn(tokenCalculator, 'calculateTotalTokens').mockReturnValue(40);

    return new LLMCaller(providerName, MODEL_NAME, CONSTRUCTOR_SYSTEM, {
      historyManager,
      providerManager: mockProviderManager as never,
      modelManager: mockModelManager as never,
      providerPool: mockProviderPool as never,
      tokenCalculator,
      responseProcessor: new ResponseProcessor(),
      retryManager: new RetryManager({ baseDelay: 1, maxRetries: 2 })
    });
  }

  beforeEach(() => {
    caller = createCaller();
  });

  describe('transcript fidelity', () => {
    it('sends the exact seeded transcript including whitespace and repeats', async () => {
      const seed: RequestScopedTextMessage[] = [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'What is 1 + 1?' },
        { role: 'assistant', content: '2.' },
        { role: 'user', content: '  And 2 + 2?  ' },
        { role: 'assistant', content: '4.' },
        { role: 'user', content: '  And 2 + 2?  ' }
      ];

      await caller.callMessages(seed);

      expect(mockChatCall).toHaveBeenCalledTimes(1);
      const params = mockChatCall.mock.calls[0][1];
      expect(params.messages).toEqual(seed);
      expect(params.messages.filter(m => m.role === 'user' && m.content === '  And 2 + 2?  ')).toHaveLength(2);
      expect(params.messages.some(m => m.content === CONSTRUCTOR_SYSTEM)).toBe(false);
      expect(params.historyMode).toBe('full');
    });

    it('rejects validation errors before provider contact', async () => {
      await expect(caller.callMessages([])).rejects.toBeInstanceOf(CallMessagesValidationError);
      await expect(caller.callMessages([
        { role: 'system', content: 'a' },
        { role: 'system', content: 'b' },
        { role: 'user', content: 'c' }
      ])).rejects.toBeInstanceOf(CallMessagesValidationError);
      await expect(caller.callMessages([
        { role: 'user', content: '' }
      ])).rejects.toBeInstanceOf(CallMessagesValidationError);
      await expect(caller.callMessages([
        { role: 'assistant', content: 'nope' }
      ])).rejects.toBeInstanceOf(CallMessagesValidationError);
      await expect(caller.callMessages(
        [{ role: 'user', content: 'x', toolCalls: [] } as never]
      )).rejects.toBeInstanceOf(CallMessagesValidationError);
      expect(mockChatCall).not.toHaveBeenCalled();
    });

    it('rejects unsupported options at runtime', async () => {
      await expect(caller.callMessages(
        [{ role: 'user', content: 'hi' }],
        { data: 'nope' } as never
      )).rejects.toBeInstanceOf(CallMessagesValidationError);
      expect(mockChatCall).not.toHaveBeenCalled();
    });
  });

  describe('isolation and lifecycle', () => {
    const preexisting: UniversalMessage[] = [
      { role: 'system', content: CONSTRUCTOR_SYSTEM },
      { role: 'user', content: 'pre-existing user' },
      { role: 'assistant', content: 'pre-existing assistant' }
    ];

    beforeEach(() => {
      historyManager.setMessages(preexisting.map(m => ({ ...m })));
    });

    it('leaves caller history unchanged after success', async () => {
      const before = historyManager.getMessages(true);
      await caller.callMessages([
        { role: 'system', content: 'seed system' },
        { role: 'user', content: 'seed user' }
      ]);
      expect(historyManager.getMessages(true)).toEqual(before);
    });

    it('leaves caller history unchanged after provider failure', async () => {
      const before = historyManager.getMessages(true);
      mockChatCall.mockRejectedValueOnce(new Error('provider boom'));
      await expect(caller.callMessages([
        { role: 'user', content: 'seed' }
      ])).rejects.toThrow('provider boom');
      expect(historyManager.getMessages(true)).toEqual(before);
    });

    it('leaves caller history unchanged after timeout', async () => {
      const before = historyManager.getMessages(true);
      mockChatCall.mockImplementation(() => new Promise(() => { /* hang */ }));
      await expect(caller.callMessages(
        [{ role: 'user', content: 'seed' }],
        { timeoutMs: 20 }
      )).rejects.toBeInstanceOf(LLMTimeoutError);
      expect(historyManager.getMessages(true)).toEqual(before);
    });

    it('leaves caller history unchanged after cancellation', async () => {
      const before = historyManager.getMessages(true);
      const controller = new AbortController();
      mockChatCall.mockImplementation(() => new Promise(() => { /* hang */ }));
      const pending = caller.callMessages(
        [{ role: 'user', content: 'seed' }],
        { signal: controller.signal }
      );
      controller.abort();
      await expect(pending).rejects.toBeInstanceOf(LLMAbortError);
      expect(historyManager.getMessages(true)).toEqual(before);
    });

    it('isolates concurrent callMessages markers', async () => {
      const gate = { release: null as null | (() => void) };
      const waitGate = new Promise<void>(resolve => { gate.release = resolve; });

      mockChatCall
        .mockImplementationOnce(async (_model, params) => {
          await waitGate;
          return textResponse(`resp:${params.messages[params.messages.length - 1].content}`);
        })
        .mockImplementationOnce(async (_model, params) => {
          gate.release?.();
          return textResponse(`resp:${params.messages[params.messages.length - 1].content}`);
        });

      const [a, b] = await Promise.all([
        caller.callMessages([{ role: 'user', content: 'MARKER_A' }]),
        caller.callMessages([{ role: 'user', content: 'MARKER_B' }])
      ]);

      const seen = mockChatCall.mock.calls.map(call =>
        call[1].messages.map(m => m.content).join('|')
      );
      expect(seen).toContain('MARKER_A');
      expect(seen).toContain('MARKER_B');
      expect(seen.some(s => s.includes('MARKER_A') && s.includes('MARKER_B'))).toBe(false);
      expect(a[0].content).toBe('resp:MARKER_A');
      expect(b[0].content).toBe('resp:MARKER_B');
      expect(historyManager.getMessages(true)).toEqual(preexisting);
    });

    it('keeps concurrent call() isolated from the seeded transcript', async () => {
      let releaseCallMessages: (() => void) | undefined;
      const hold = new Promise<void>(resolve => { releaseCallMessages = resolve; });

      mockChatCall
        .mockImplementationOnce(async () => {
          await hold;
          return textResponse('from-callMessages');
        })
        .mockImplementationOnce(async (_model, params) => {
          const contents = params.messages.map(m => m.content);
          expect(contents).not.toContain('SEED_MARKER');
          releaseCallMessages?.();
          return textResponse('from-call');
        });

      const messagesPromise = caller.callMessages([
        { role: 'user', content: 'SEED_MARKER' }
      ]);

      // Allow callMessages to reach the provider before starting call()
      await Promise.resolve();
      const callPromise = caller.call('ordinary call text', { historyMode: 'full' });

      const [messagesResult, callResult] = await Promise.all([messagesPromise, callPromise]);
      expect(messagesResult[0].content).toBe('from-callMessages');
      expect(callResult[0].content).toBe('from-call');
      expect(historyManager.getMessages(true).some(m => m.content === 'SEED_MARKER')).toBe(false);
    });

    it('remains usable after every terminal path', async () => {
      mockChatCall.mockRejectedValueOnce(new Error('fail once'));
      await expect(caller.callMessages([{ role: 'user', content: 'x' }])).rejects.toThrow('fail once');

      mockChatCall.mockResolvedValueOnce(textResponse('recovered'));
      const result = await caller.callMessages([{ role: 'user', content: 'y' }]);
      expect(result[0].content).toBe('recovered');
    });
  });

  describe('retry identity', () => {
    it('replays deep-equal messages and settings across transport retries', async () => {
      const seed: RequestScopedTextMessage[] = [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'retry me' }
      ];
      const seedCopy = seed.map(m => ({ ...m }));

      const attempts: CapturedAttempt[] = [];
      mockChatCall
        .mockImplementationOnce(async (_model, params) => {
          attempts.push({
            messages: params.messages.map(m => ({ ...m })),
            settings: structuredClone(params.settings)
          });
          throw new Error('Network connection failed');
        })
        .mockImplementationOnce(async (_model, params) => {
          attempts.push({
            messages: params.messages.map(m => ({ ...m })),
            settings: structuredClone(params.settings)
          });
          return textResponse('ok after retry');
        });

      const result = await caller.callMessages(seed, {
        providerStorage: 'disabled',
        settings: {
          maxRetries: 2,
          providerOptions: {
            gateway: { order: ['openai'] }
          }
        }
      });

      expect(result[0].content).toBe('ok after retry');
      expect(attempts).toHaveLength(2);
      expect(attempts[0].messages).toEqual(attempts[1].messages);
      expect(attempts[0].settings).toEqual(attempts[1].settings);
      expect(attempts[0].messages).toEqual(seedCopy);
      expect(seed).toEqual(seedCopy);
      for (const attempt of attempts) {
        expect(attempt.settings?.providerOptions?.openai).toEqual({ store: false });
        expect(attempt.settings?.providerOptions?.gateway).toEqual({ order: ['openai'] });
      }
    });
  });

  describe('providerStorage', () => {
    it('maps disabled to openai.store false and preserves unrelated options', async () => {
      await caller.callMessages([{ role: 'user', content: 'hi' }], {
        providerStorage: 'disabled',
        settings: {
          temperature: 0,
          providerOptions: {
            openai: { user: 'bench' },
            gateway: { tags: ['evo'] }
          }
        }
      });

      const settings = mockChatCall.mock.calls[0][1].settings;
      expect(settings?.temperature).toBe(0);
      expect(settings?.providerOptions?.openai).toEqual({ user: 'bench', store: false });
      expect(settings?.providerOptions?.gateway).toEqual({ tags: ['evo'] });
    });

    it('omission leaves store unset', async () => {
      await caller.callMessages([{ role: 'user', content: 'hi' }], {
        settings: { providerOptions: { openai: { user: 'bench' } } }
      });
      expect(mockChatCall.mock.calls[0][1].settings?.providerOptions?.openai).toEqual({ user: 'bench' });
    });

    it('rejects contradictory openai.store true before provider contact', async () => {
      await expect(caller.callMessages([{ role: 'user', content: 'hi' }], {
        providerStorage: 'disabled',
        settings: { providerOptions: { openai: { store: true } } }
      })).rejects.toMatchObject({
        name: 'CallMessagesValidationError',
        code: 'CALL_MESSAGES_VALIDATION_ERROR',
        reason: 'provider_storage_conflict'
      });
      expect(mockChatCall).not.toHaveBeenCalled();
    });

    it('fails closed for unsupported providers before provider contact', async () => {
      caller = createCaller({ provider: 'gemini' });
      await expect(caller.callMessages([{ role: 'user', content: 'hi' }], {
        providerStorage: 'disabled'
      })).rejects.toMatchObject({
        name: 'ProviderStorageUnsupportedError',
        code: 'PROVIDER_STORAGE_UNSUPPORTED',
        provider: 'gemini',
        policy: 'disabled'
      });
      expect(mockChatCall).not.toHaveBeenCalled();
    });

    it('rejects unknown providerStorage values', async () => {
      await expect(caller.callMessages([{ role: 'user', content: 'hi' }], {
        providerStorage: 'enabled' as 'disabled'
      })).rejects.toBeInstanceOf(CallMessagesValidationError);
      expect(mockChatCall).not.toHaveBeenCalled();
    });

    it('keeps disabled mapping identical across tool continuations', async () => {
      const echoTool: ToolDefinition = {
        name: 'echo',
        description: 'Echo',
        parameters: { type: 'object', properties: { value: { type: 'string' } }, required: ['value'] },
        callFunction: (async ({ value }: { value: string }) => ({ echoed: value })) as ToolDefinition['callFunction']
      };

      mockChatCall
        .mockResolvedValueOnce({
          content: '',
          role: 'assistant',
          metadata: { finishReason: FinishReason.TOOL_CALLS, usage: usageMeta()?.usage },
          toolCalls: [{ id: 'call_1', name: 'echo', arguments: { value: 'x' } }]
        })
        .mockResolvedValueOnce(textResponse('done'));

      await caller.callMessages([{ role: 'user', content: 'echo' }], {
        providerStorage: 'disabled',
        tools: [echoTool]
      });

      expect(mockChatCall).toHaveBeenCalledTimes(2);
      for (const call of mockChatCall.mock.calls) {
        expect(call[1].settings?.providerOptions?.openai).toEqual({ store: false });
      }
    });
  });

  describe('applyProviderStoragePolicy helper', () => {
    it('is a no-op when policy is omitted', () => {
      const settings = { temperature: 0.2 };
      expect(applyProviderStoragePolicy(settings, undefined, 'openai')).toBe(settings);
    });
  });

  describe('tool continuation', () => {
    const echoTool: ToolDefinition = {
      name: 'echo',
      description: 'Echo a value',
      parameters: {
        type: 'object',
        properties: { value: { type: 'string' } },
        required: ['value']
      },
      callFunction: (async ({ value }: { value: string }) => ({ echoed: value })) as ToolDefinition['callFunction']
    };

    it('keeps tool loop operation-local and leaves caller history unchanged', async () => {
      const preexisting: UniversalMessage[] = [
        { role: 'system', content: CONSTRUCTOR_SYSTEM },
        { role: 'user', content: 'keep me' }
      ];
      historyManager.setMessages(preexisting.map(m => ({ ...m })));
      const before = historyManager.getMessages(true);

      const seed: RequestScopedTextMessage[] = [
        { role: 'system', content: 'tool system' },
        { role: 'user', content: 'please echo hi' }
      ];

      mockChatCall
        .mockResolvedValueOnce({
          content: '',
          role: 'assistant',
          metadata: { finishReason: FinishReason.TOOL_CALLS, usage: usageMeta()?.usage },
          toolCalls: [{
            id: 'call_echo_1',
            name: 'echo',
            arguments: { value: 'hi' }
          }]
        })
        .mockResolvedValueOnce(textResponse('done'));

      const result = await caller.callMessages(seed, { tools: [echoTool] });
      expect(result[0].content).toBe('done');
      expect(mockChatCall).toHaveBeenCalledTimes(2);

      const firstMessages = mockChatCall.mock.calls[0][1].messages;
      expect(firstMessages).toEqual(seed);

      const secondMessages = mockChatCall.mock.calls[1][1].messages;
      expect(secondMessages.slice(0, seed.length)).toEqual(seed);
      expect(secondMessages.some(m => m.role === 'assistant' && m.toolCalls?.length)).toBe(true);
      expect(secondMessages.some(m => m.role === 'tool')).toBe(true);

      expect(historyManager.getMessages(true)).toEqual(before);
    });

    it('does not mutate caller history when a tool fails', async () => {
      const before = historyManager.getMessages(true);
      const failingTool: ToolDefinition = {
        ...echoTool,
        name: 'boom',
        callFunction: (async () => {
          throw new Error('tool exploded');
        }) as ToolDefinition['callFunction']
      };

      mockChatCall.mockResolvedValueOnce({
        content: '',
        role: 'assistant',
        metadata: { finishReason: FinishReason.TOOL_CALLS, usage: usageMeta()?.usage },
        toolCalls: [{
          id: 'call_boom_1',
          name: 'boom',
          arguments: { value: 'x' }
        }]
      }).mockResolvedValueOnce(textResponse('recovered after tool error'));

      const result = await caller.callMessages(
        [{ role: 'user', content: 'boom please' }],
        { tools: [failingTool] }
      );
      expect(result[0].content).toBe('recovered after tool error');
      expect(historyManager.getMessages(true)).toEqual(before);
    });
  });

  describe('context overflow', () => {
    it('fails with RequestContextOverflowError instead of chunking', async () => {
      caller = createCaller({ maxRequestTokens: 50 });
      (tokenCalculator.calculateTotalTokens as jest.Mock).mockReturnValue(40);

      await expect(caller.callMessages([
        { role: 'user', content: 'huge' }
      ], {
        settings: { maxTokens: 20 }
      })).rejects.toBeInstanceOf(RequestContextOverflowError);
      expect(mockChatCall).not.toHaveBeenCalled();
    });
  });

  describe('compatibility', () => {
    it('retains existing stateless + setMessages + call reset behavior', async () => {
      historyManager.setMessages([
        { role: 'system', content: 'installed system' },
        { role: 'user', content: 'seeded user' },
        { role: 'assistant', content: 'seeded assistant' }
      ]);

      mockChatCall.mockResolvedValueOnce(textResponse('stateless reply'));
      await caller.call('current question', { historyMode: 'stateless' });

      const params = mockChatCall.mock.calls[0][1];
      // Default/stateless path resets via initializeWithSystemMessage before send.
      expect(params.messages.some(m => m.content === 'seeded user')).toBe(false);
      expect(params.messages.some(m => m.content === 'current question')).toBe(true);
    });
  });
});
