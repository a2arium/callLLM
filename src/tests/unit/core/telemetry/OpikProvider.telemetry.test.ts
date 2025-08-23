import { jest } from '@jest/globals';
import type { LLMCallContext, ConversationContext, PromptMessage } from '@/core/telemetry/collector/types.ts';
import { OpikProvider } from '@/core/telemetry/providers/opik/OpikProvider.ts';

// Local fake client (avoid importing real 'opik')
function createFakeClient(store: any) {
    class FakeSpan {
        data: any;
        constructor(public parent: any, init: any) {
            this.data = { ...init, id: `${Math.random()}`.slice(2), traceId: parent?.data?.id };
            store.spans.push(this.data);
        }
        update = (payload: any) => { store.updates.push({ type: 'span.update', payload }); this.data = { ...this.data, ...payload }; };
        end = () => { store.events.push('span.end'); };
    }
    class FakeTrace {
        data: any;
        constructor(init: any) {
            this.data = { ...init, id: `${Math.random()}`.slice(2), projectName: 'llm' };
            store.traces.push(this.data);
        }
        span = (init: any) => new FakeSpan(this, init);
        update = (payload: any) => { store.updates.push({ type: 'trace.update', payload }); this.data = { ...this.data, ...payload }; };
        end = () => { store.events.push('trace.end'); };
    }
    return new (class {
        flush = jest.fn(async () => { store.flushes.push({ at: Date.now() }); });
        trace = (init: any) => new FakeTrace(init);
    })();
}

function buildProviderForTest() {
    const provider = new OpikProvider();
    const store: any = { traces: [], spans: [], updates: [], flushes: [], events: [] };
    (provider as any).enabled = true;
    (provider as any).client = createFakeClient(store);
    (provider as any).redaction = { redactPrompts: false, redactResponses: false, redactToolArgs: false, piiDetection: false, maxContentLength: 2000 };
    return { provider, store };
}

describe('OpikProvider telemetry', () => {
    function makeProvider(envOverrides: Record<string, string> = {}) {
        const provider = new OpikProvider();
        const env = {
            CALLLLM_OPIK_ENABLED: '1',
            OPIK_API_KEY: 'test',
            OPIK_URL_OVERRIDE: 'https://example/opik',
            OPIK_PROJECT_NAME: 'llm',
            OPIK_WORKSPACE: 'ws',
            LOG_LEVEL: 'debug',
            ...envOverrides
        } as unknown as NodeJS.ProcessEnv;
        return { provider, env };
    }

    test('captures images and output: span has full base64; trace has images merged and output', async () => {
        const { provider, store } = buildProviderForTest();

        const convo: ConversationContext = { conversationId: 'c1', type: 'stream', startedAt: Date.now() };
        provider.startConversation(convo);

        const llm: LLMCallContext = {
            llmCallId: 'l1', conversationId: 'c1', startedAt: Date.now(),
            provider: 'openai', model: 'gpt-4o-mini', streaming: true, responseFormat: 'json', toolsEnabled: false
        } as any;
        provider.startLLM(llm);

        const messages: PromptMessage[] = [
            { role: 'system', content: 'You are a helpful assistant.', sequence: 0 },
            { role: 'user', content: '<file:data:image/png;base64,base64DATA>', sequence: 1 },
            { role: 'user', content: 'Describe', sequence: 2 }
        ];
        provider.addPrompt(llm, messages);

        // Simulate final choice
        provider.addChoice(llm, { isChunk: false, content: 'final text', contentLength: 10, sequence: 99 });

        // End LLM with usage
        provider.endLLM(llm, {
            tokens: { input: { total: 100, cached: 0 }, output: { total: 10, reasoning: 0 }, total: 110 },
            costs: { input: { total: 0.001, cached: 0 }, output: { total: 0.0001, reasoning: 0 }, total: 0.0011 }
        } as any, 'gpt-4o-mini-2024');

        // End conversation and include input/output for trace
        await provider.endConversation(convo, { totalTokens: 110, totalCost: 0.0011, llmCallsCount: 1, toolCallsCount: 0, success: true, errorCount: 0 }, {
            initialMessages: messages,
            finalResponse: 'final text'
        });

        const spanUpdate = store.updates.filter((u: any) => u.type === 'span.update').pop()?.payload;
        expect(spanUpdate?.output?.response).toBe('final text');
        expect(spanUpdate?.input?.images?.[0]?.source).toBe('base64');
        expect(typeof spanUpdate?.input?.images?.[0]?.base64).toBe('string');

        const traceUpdate = store.updates.filter((u: any) => u.type === 'trace.update').pop()?.payload;
        expect(traceUpdate?.input?.images?.[0]?.source).toBe('base64');
        expect(typeof traceUpdate?.input?.images?.[0]?.base64).toBe('string');
        expect(traceUpdate?.output?.response).toBe('final text');

        // Ensure no preview message added for base64
        const traceMsgs = traceUpdate?.input?.messages as Array<any>;
        const previews = (traceMsgs || []).filter(m => String(m.content).startsWith('image:'));
        expect(previews.length).toBe(0);
    });

    test('merge on endConversation preserves images and calls flush before end', async () => {
        const { provider, store } = buildProviderForTest();

        const convo: ConversationContext = { conversationId: 'c2', type: 'stream', startedAt: Date.now() };
        provider.startConversation(convo);
        const llm: LLMCallContext = { llmCallId: 'l2', conversationId: 'c2', startedAt: Date.now(), provider: 'openai', model: 'gpt', streaming: true } as any;
        provider.startLLM(llm);
        provider.addPrompt(llm, [{ role: 'user', content: '<file:data:image/png;base64,AAA>', sequence: 1 }]);
        provider.endLLM(llm, { tokens: { input: { total: 1, cached: 0 }, output: { total: 1, reasoning: 0 }, total: 2 }, costs: { input: { total: 0 }, output: { total: 0 }, total: 0 } } as any, 'g');

        const callsBefore = store.events.slice();
        await provider.endConversation(convo, undefined, { initialMessages: [{ role: 'user', content: 'x', sequence: 2 } as any], finalResponse: 'y' });
        const calls2 = store;
        // There should be a flush and then trace.end
        const hadFlush = calls2.flushes.length > 0;
        expect(hadFlush).toBe(true);
        const lastEvents = calls2.events.slice(callsBefore.length);
        // Last event should be trace.end
        expect(lastEvents.pop()).toBe('trace.end');

        // Images preserved on trace input
        const traceUpdate2 = calls2.updates.filter((u: any) => u.type === 'trace.update').pop()?.payload;
        expect(traceUpdate2?.input?.images?.length).toBeGreaterThan(0);
    });
});


