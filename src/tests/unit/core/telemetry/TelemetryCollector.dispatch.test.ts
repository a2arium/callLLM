import { TelemetryCollector } from '@/core/telemetry/collector/TelemetryCollector.ts';
import type {
    TelemetryProvider,
    ProviderInit,
    ConversationContext,
    ConversationInputOutput,
    ConversationSummary,
    LLMCallContext,
    PromptMessage,
    ChoiceEvent,
    ToolCallContext,
    RedactionPolicy
} from '@/core/telemetry/providers/TelemetryProvider.ts';

class FakeProvider implements TelemetryProvider {
    public readonly name = 'fake';
    public initted: ProviderInit | null = null;
    public calls: Array<{ m: string; args: any[] }> = [];
    private delayMs: number;
    constructor(delayMs = 0, public id: string = 'p1') { this.delayMs = delayMs; }
    async init(config: ProviderInit): Promise<void> {
        this.initted = config;
        if (this.delayMs) await new Promise(r => setTimeout(r, this.delayMs));
    }
    startConversation(ctx: ConversationContext): void { this.calls.push({ m: 'startConversation', args: [ctx] }); }
    async endConversation(ctx: ConversationContext, summary?: ConversationSummary, inputOutput?: ConversationInputOutput): Promise<void> {
        this.calls.push({ m: 'endConversation', args: [ctx, summary, inputOutput] });
    }
    startLLM(ctx: LLMCallContext): void { this.calls.push({ m: 'startLLM', args: [ctx] }); }
    addPrompt(ctx: LLMCallContext, messages: PromptMessage[]): void { this.calls.push({ m: 'addPrompt', args: [ctx, messages] }); }
    addChoice(ctx: LLMCallContext, choice: ChoiceEvent): void { this.calls.push({ m: 'addChoice', args: [ctx, choice] }); }
    endLLM(ctx: LLMCallContext): void { this.calls.push({ m: 'endLLM', args: [ctx] }); }
    startTool(ctx: ToolCallContext): void { this.calls.push({ m: 'startTool', args: [ctx] }); }
    endTool(ctx: ToolCallContext, result?: unknown, error?: unknown): void { this.calls.push({ m: 'endTool', args: [ctx, result, error] }); }
}

function redaction(overrides?: Partial<RedactionPolicy>): RedactionPolicy {
    return {
        redactPrompts: false,
        redactResponses: false,
        redactToolArgs: false,
        piiDetection: false,
        maxContentLength: 2000,
        ...overrides
    } as RedactionPolicy;
}

describe('TelemetryCollector provider dispatch', () => {
    test('buffers events until providers are ready, then flushes in order', async () => {
        const p = new FakeProvider(20);
        const collector = new TelemetryCollector({ providers: [p], redaction: redaction(), env: process.env });

        // Emit events before init completes
        const convo = collector.startConversation('stream');
        const llm = collector.startLLM(convo, { provider: 'openai', model: 'gpt', streaming: true } as any);
        collector.addPrompt(llm, [{ role: 'user', content: 'hi' } as PromptMessage]);
        collector.addChoice(llm, { isChunk: false, content: 'ok' } as ChoiceEvent);
        collector.endLLM(llm, { tokens: { input: { total: 1, cached: 0 }, output: { total: 1, reasoning: 0 }, total: 2 }, costs: { input: { total: 0 }, output: { total: 0 }, total: 0 } } as any, 'g');
        await collector.endConversation(convo, { totalTokens: 2, totalCost: 0, llmCallsCount: 1, toolCallsCount: 0, success: true, errorCount: 0 }, { initialMessages: [{ role: 'user', content: 'hi' } as any], finalResponse: 'ok' });

        // Await readiness and flush
        await collector.awaitReady();

        const methods = p.calls.map(c => c.m);
        expect(methods).toEqual([
            'startConversation',
            'startLLM',
            'addPrompt',
            'addChoice',
            'endLLM',
            'endConversation'
        ]);
        // Validate args passed through
        const endArgs = p.calls.find(c => c.m === 'endConversation')!.args;
        expect(endArgs[2]?.finalResponse).toBe('ok');
    });

    test('registerProvider flushes pending events to the late provider', async () => {
        const collector = new TelemetryCollector();
        const convo = collector.startConversation('call');
        const llm = collector.startLLM(convo, { provider: 'openai', model: 'gpt', streaming: false } as any);
        collector.addPrompt(llm, [{ role: 'system', content: 'sys' } as PromptMessage]);

        const late = new FakeProvider(0);
        collector.registerProvider(late, process.env);
        await collector.awaitReady();

        // After registration, buffered events delivered
        const methods = late.calls.map(c => c.m);
        expect(methods.includes('startConversation')).toBe(true);
        expect(methods.includes('startLLM')).toBe(true);
        expect(methods.includes('addPrompt')).toBe(true);
    });

    test('provider.init receives env and redaction', async () => {
        const env = { TEST_FLAG: '1' } as any;
        const r = redaction({ redactPrompts: true });
        const p = new FakeProvider(0);
        const collector = new TelemetryCollector({ providers: [p], redaction: r, env });
        await collector.awaitReady();
        expect(p.initted?.env).toBe(env);
        expect(p.initted?.redaction?.redactPrompts).toBe(true);
    });
});


