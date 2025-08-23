import { randomUUID } from 'crypto';
import type { Usage } from '../../../interfaces/UniversalInterfaces.ts';
import { logger } from '../../../utils/logger.ts';
import type {
    ChoiceEvent,
    ConversationContext,
    ConversationInputOutput,
    ConversationSummary,
    LLMCallContext,
    PromptMessage,
    ProviderInit,
    RedactionPolicy,
    TelemetryProvider,
    ToolCallContext
} from './types.ts';

export class TelemetryCollector {
    private readonly log = logger.createLogger({ prefix: 'TelemetryCollector' });
    private readonly providers: TelemetryProvider[] = [];
    private readonly redaction: RedactionPolicy;
    private readonly initPromises: Promise<void>[] = [];
    private allReady = false;
    private isFlushing = false;
    private readyPromise: Promise<void> | null = null;
    private pendingEvents: Array<
        | { t: 'startConversation'; ctx: ConversationContext }
        | { t: 'endConversation'; ctx: ConversationContext; summary?: ConversationSummary; inputOutput?: ConversationInputOutput }
        | { t: 'startLLM'; ctx: LLMCallContext }
        | { t: 'addPrompt'; llm: LLMCallContext; messages: PromptMessage[] }
        | { t: 'addChoice'; llm: LLMCallContext; choice: ChoiceEvent }
        | { t: 'endLLM'; llm: LLMCallContext; usage?: Usage; responseModel?: string }
        | { t: 'startTool'; ctx: ToolCallContext }
        | { t: 'endTool'; tool: ToolCallContext; result?: unknown; error?: unknown }
    > = [];

    constructor(config?: { providers?: TelemetryProvider[]; redaction?: RedactionPolicy; env?: NodeJS.ProcessEnv }) {
        this.redaction = config?.redaction || {
            redactPrompts: /^(1|true)$/i.test(String(process.env.CALLLLM_OTEL_REDACT_PROMPTS || '')),
            redactResponses: /^(1|true)$/i.test(String(process.env.CALLLLM_OTEL_REDACT_RESPONSES || '')),
            redactToolArgs: /^(1|true)$/i.test(String(process.env.CALLLLM_OTEL_REDACT_TOOL_ARGS || '')),
            piiDetection: /^(1|true)$/i.test(String(process.env.CALLLLM_OTEL_PII_DETECTION || '')),
            maxContentLength: 2000,
            allowedAttributes: ['gen_ai.request.model', 'gen_ai.system', 'gen_ai.operation.name']
        };
        const env = config?.env || process.env;
        if (config?.providers?.length) {
            this.providers = config.providers;
        }
        // Initialize providers
        this.log.debug('Initializing providers', { count: this.providers.length });
        for (const p of this.providers) {
            this.log.debug('Init provider', { name: (p as any).name || 'unknown' });
            const pr = p.init({ env, redaction: this.redaction }).then(() => {
                this.log.debug('Provider initialized', { name: (p as any).name || 'unknown' });
            }).catch((e) => this.log.warn('Provider init error', e as Error));
            this.initPromises.push(pr);
        }
        if (this.initPromises.length > 0) {
            this.readyPromise = Promise.all(this.initPromises).then(() => {
                this.allReady = true;
                this.flushPending();
            }).catch(() => { /* ignore */ return; });
        }
    }

    registerProvider(provider: TelemetryProvider, env: NodeJS.ProcessEnv = process.env): void {
        this.providers.push(provider);
        this.log.debug('Registering provider', { name: (provider as any).name || 'unknown' });
        const pr = provider.init({ env, redaction: this.redaction }).then(() => {
            this.log.debug('Provider initialized', { name: (provider as any).name || 'unknown' });
        }).catch((e) => this.log.warn('Provider init error', e as Error));
        this.initPromises.push(pr);
        this.readyPromise = Promise.all(this.initPromises).then(() => {
            this.allReady = true;
            this.flushPending();
        }).catch(() => { /* ignore */ return; });
    }

    async awaitReady(): Promise<void> {
        if (this.allReady) return;
        if (!this.readyPromise) {
            this.readyPromise = Promise.all(this.initPromises).then(() => {
                this.allReady = true;
                this.flushPending();
            }).catch(() => { /* ignore */ return; });
        }
        try { await this.readyPromise; } catch { /* ignore */ }
    }

    // Conversation lifecycle
    startConversation(type: 'call' | 'stream', metadata?: Record<string, unknown>): ConversationContext {
        const ctx: ConversationContext = {
            conversationId: randomUUID(),
            type,
            metadata,
            startedAt: Date.now()
        };
        this.log.debug('startConversation', { type, conversationId: ctx.conversationId, ready: this.allReady });
        if (!this.allReady || this.isFlushing) {
            this.pendingEvents.push({ t: 'startConversation', ctx });
        } else {
            for (const p of this.providers) p.startConversation(ctx);
        }
        return ctx;
    }

    endConversation(ctx: ConversationContext, summary?: ConversationSummary, inputOutput?: ConversationInputOutput): void {
        this.log.debug('endConversation', { conversationId: ctx.conversationId, summary, inputOutput, ready: this.allReady });
        if (!this.allReady || this.isFlushing) {
            this.pendingEvents.push({ t: 'endConversation', ctx, summary, inputOutput });
        } else {
            for (const p of this.providers) p.endConversation(ctx, summary, inputOutput);
        }
    }

    // LLM lifecycle
    startLLM(conversation: ConversationContext, meta: Omit<LLMCallContext, 'llmCallId' | 'conversationId' | 'startedAt'>): LLMCallContext {
        const ctx: LLMCallContext = {
            llmCallId: randomUUID(),
            conversationId: conversation.conversationId,
            startedAt: Date.now(),
            ...meta
        };
        this.log.debug('startLLM', { conversationId: conversation.conversationId, llmCallId: ctx.llmCallId, model: ctx.model, ready: this.allReady });
        if (!this.allReady || this.isFlushing) {
            this.pendingEvents.push({ t: 'startLLM', ctx });
        } else {
            for (const p of this.providers) p.startLLM(ctx);
        }
        return ctx;
    }

    addPrompt(llm: LLMCallContext, messages: PromptMessage[]): void {
        // Redaction/truncation is handled by providers per policy; we pass raw
        this.log.debug('addPrompt', { llmCallId: llm.llmCallId, count: messages.length, ready: this.allReady });
        if (!this.allReady || this.isFlushing) {
            this.pendingEvents.push({ t: 'addPrompt', llm, messages });
        } else {
            for (const p of this.providers) p.addPrompt(llm, messages);
        }
    }

    addChoice(llm: LLMCallContext, choice: ChoiceEvent): void {
        this.log.debug('addChoice', { llmCallId: llm.llmCallId, isChunk: Boolean(choice.isChunk), length: choice.contentLength, sequence: choice.sequence, ready: this.allReady });
        if (!this.allReady || this.isFlushing) {
            this.pendingEvents.push({ t: 'addChoice', llm, choice });
        } else {
            for (const p of this.providers) p.addChoice(llm, choice);
        }
    }

    endLLM(llm: LLMCallContext, usage?: Usage, responseModel?: string): void {
        this.log.debug('endLLM', { llmCallId: llm.llmCallId, responseModel, usage: usage ? { input: usage.tokens.input.total, output: usage.tokens.output.total, total: usage.tokens.total } : undefined, ready: this.allReady });
        if (!this.allReady || this.isFlushing) {
            this.pendingEvents.push({ t: 'endLLM', llm, usage, responseModel });
        } else {
            for (const p of this.providers) p.endLLM(llm, usage, responseModel);
        }
    }

    // Tool lifecycle
    startTool(conversation: ConversationContext, meta: Omit<ToolCallContext, 'toolCallId' | 'conversationId' | 'startedAt'>): ToolCallContext {
        const ctx: ToolCallContext = {
            toolCallId: randomUUID(),
            conversationId: conversation.conversationId,
            startedAt: Date.now(),
            ...meta
        };
        this.log.debug('startTool', { conversationId: conversation.conversationId, toolCallId: ctx.toolCallId, name: ctx.name, ready: this.allReady });
        if (!this.allReady || this.isFlushing) {
            this.pendingEvents.push({ t: 'startTool', ctx });
        } else {
            for (const p of this.providers) p.startTool(ctx);
        }
        return ctx;
    }

    endTool(tool: ToolCallContext, result?: unknown, error?: unknown): void {
        this.log.debug('endTool', { toolCallId: tool.toolCallId, hasError: Boolean(error), ready: this.allReady });
        if (!this.allReady || this.isFlushing) {
            this.pendingEvents.push({ t: 'endTool', tool, result, error });
        } else {
            for (const p of this.providers) p.endTool(tool, result, error);
        }
    }

    private flushPending(): void {
        if (!this.allReady || !this.pendingEvents.length) return;
        this.isFlushing = true;
        this.log.debug('Flushing pending telemetry events', { count: this.pendingEvents.length });
        for (const ev of this.pendingEvents) {
            switch (ev.t) {
                case 'startConversation':
                    for (const p of this.providers) p.startConversation(ev.ctx);
                    break;
                case 'endConversation':
                    for (const p of this.providers) p.endConversation(ev.ctx, ev.summary, ev.inputOutput);
                    break;
                case 'startLLM':
                    for (const p of this.providers) p.startLLM(ev.ctx);
                    break;
                case 'addPrompt':
                    for (const p of this.providers) p.addPrompt(ev.llm, ev.messages);
                    break;
                case 'addChoice':
                    for (const p of this.providers) p.addChoice(ev.llm, ev.choice);
                    break;
                case 'endLLM':
                    for (const p of this.providers) p.endLLM(ev.llm, ev.usage, ev.responseModel);
                    break;
                case 'startTool':
                    for (const p of this.providers) p.startTool(ev.ctx);
                    break;
                case 'endTool':
                    for (const p of this.providers) p.endTool(ev.tool, ev.result, ev.error);
                    break;
            }
        }
        this.pendingEvents = [];
        this.isFlushing = false;
    }
}


