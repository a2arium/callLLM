import { ProviderPool } from '../../../../core/caller/ProviderPool.ts';
import type { AdapterConfig } from '../../../../adapters/base/baseAdapter.ts';
import type { AdapterConstructor } from '../../../../adapters/types.ts';
import { ProviderNotFoundError } from '../../../../adapters/types.ts';
import type { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse } from '../../../../interfaces/UniversalInterfaces.ts';

describe('ProviderPool', () => {
  beforeEach(() => {
    OpenAIStub.instances = [];
    GeminiStub.instances = [];
  });

  it('normalizes provider scope while preserving order', () => {
    const pool = new ProviderPool(['gemini', 'openai', 'gemini'] as any, {
      adapterConstructors: testRegistry()
    });

    expect(pool.getProviderScope()).toEqual(['gemini', 'openai']);
  });

  it('rejects providers not present in the registry', () => {
    expect(() => new ProviderPool(['openai', 'venice'] as any, {
      adapterConstructors: testRegistry()
    })).toThrow(ProviderNotFoundError);
  });

  it('lazily instantiates providers', () => {
    const pool = new ProviderPool(['openai', 'gemini'] as any, {
      apiKey: 'shared-key',
      adapterConstructors: testRegistry()
    });

    expect(pool.getInitializedProviders()).toEqual([]);

    const openai = pool.getProvider('openai');
    expect(openai).toBeInstanceOf(OpenAIStub);
    expect(pool.getInitializedProviders()).toEqual(['openai']);
    expect(GeminiStub.instances).toHaveLength(0);
  });

  it('caches provider instances independently', () => {
    const pool = new ProviderPool(['openai', 'gemini'] as any, {
      apiKey: 'shared-key',
      adapterConstructors: testRegistry()
    });

    const first = pool.getProvider('openai');
    const second = pool.getProvider('openai');
    const gemini = pool.getProvider('gemini');

    expect(first).toBe(second);
    expect(first).not.toBe(gemini);
    expect(OpenAIStub.instances).toHaveLength(1);
    expect(GeminiStub.instances).toHaveLength(1);
  });

  it('passes shared apiKey to provider constructors', () => {
    const pool = new ProviderPool('openai', {
      apiKey: 'shared-key',
      adapterConstructors: testRegistry()
    });

    pool.getProvider('openai');

    expect(OpenAIStub.instances[0].config).toEqual({ apiKey: 'shared-key' });
  });

  it('prefers provider-specific apiKey over shared apiKey', () => {
    const pool = new ProviderPool(['openai', 'gemini'] as any, {
      apiKey: 'shared-key',
      providerApiKeys: {
        gemini: 'gemini-key'
      },
      adapterConstructors: testRegistry()
    });

    pool.getProvider('openai');
    pool.getProvider('gemini');

    expect(OpenAIStub.instances[0].config).toEqual({ apiKey: 'shared-key' });
    expect(GeminiStub.instances[0].config).toEqual({ apiKey: 'gemini-key' });
  });

  it('passes empty config when no apiKey is configured', () => {
    const pool = new ProviderPool('openai', {
      adapterConstructors: testRegistry()
    });

    pool.getProvider('openai');

    expect(OpenAIStub.instances[0].config).toEqual({});
  });

  it('rejects getProvider for providers outside constructor scope', () => {
    const pool = new ProviderPool('openai', {
      adapterConstructors: testRegistry()
    });

    expect(() => pool.getProvider('gemini')).toThrow(ProviderNotFoundError);
  });

  it('reports interface support per provider', () => {
    const pool = new ProviderPool(['openai', 'gemini'] as any, {
      apiKey: 'key',
      adapterConstructors: testRegistry()
    });

    expect(pool.getInterfaceSupport('openai')).toEqual({
      chatCall: true,
      streamCall: true,
      imageCall: true,
      videoCall: false,
      embeddingCall: true,
      audioCall: false
    });
    expect(pool.getInterfaceSupport('gemini')).toEqual({
      chatCall: true,
      streamCall: true,
      imageCall: false,
      videoCall: true,
      embeddingCall: false,
      audioCall: true
    });
  });

  it('checks one interface by name', () => {
    const pool = new ProviderPool(['openai', 'gemini'] as any, {
      apiKey: 'key',
      adapterConstructors: testRegistry()
    });

    expect(pool.supports('openai', 'imageCall')).toBe(true);
    expect(pool.supports('openai', 'videoCall')).toBe(false);
    expect(pool.supports('gemini', 'videoCall')).toBe(true);
  });

  it('can clear cached providers', () => {
    const pool = new ProviderPool('openai', {
      apiKey: 'key',
      adapterConstructors: testRegistry()
    });

    const first = pool.getProvider('openai');
    pool.clear();
    const second = pool.getProvider('openai');

    expect(first).not.toBe(second);
    expect(OpenAIStub.instances).toHaveLength(2);
  });
});

class BaseStub {
  constructor(public readonly config: Partial<AdapterConfig>) { }

  async chatCall(_model: string, _params: UniversalChatParams): Promise<UniversalChatResponse> {
    return { content: 'ok', role: 'assistant' };
  }

  async streamCall(_model: string, _params: UniversalChatParams): Promise<AsyncIterable<UniversalStreamResponse>> {
    return async function* stream() {
      yield { content: 'ok', role: 'assistant', isComplete: true };
    }();
  }

  convertToProviderParams(_model: string, params: UniversalChatParams): unknown {
    return params;
  }

  convertFromProviderResponse(response: unknown): UniversalChatResponse {
    return response as UniversalChatResponse;
  }

  convertFromProviderStreamResponse(response: unknown): UniversalStreamResponse {
    return response as UniversalStreamResponse;
  }
}

class OpenAIStub extends BaseStub {
  static instances: OpenAIStub[] = [];

  constructor(config: Partial<AdapterConfig>) {
    super(config);
    OpenAIStub.instances.push(this);
  }

  async imageCall(): Promise<UniversalChatResponse> {
    return { content: 'image', role: 'assistant' };
  }

  async embeddingCall(): Promise<any> {
    return {};
  }
}

class GeminiStub extends BaseStub {
  static instances: GeminiStub[] = [];

  constructor(config: Partial<AdapterConfig>) {
    super(config);
    GeminiStub.instances.push(this);
  }

  async videoCall(): Promise<UniversalChatResponse> {
    return { content: 'video', role: 'assistant' };
  }

  async audioCall(): Promise<any> {
    return {};
  }
}

function testRegistry(): Map<string, AdapterConstructor> {
  return new Map<string, AdapterConstructor>([
    ['openai', OpenAIStub as unknown as AdapterConstructor],
    ['gemini', GeminiStub as unknown as AdapterConstructor]
  ]);
}

