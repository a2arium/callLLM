import type { Usage } from '../../../../interfaces/UniversalInterfaces.ts';
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
} from '../../collector/types.ts';
import { logger } from '../../../../utils/logger.ts';

let OpikClient: any;

export class OpikProvider implements TelemetryProvider {
    public readonly name = 'opik';
    private enabled = false;
    private redaction!: RedactionPolicy;
    private readonly log = logger.createLogger({ prefix: 'OpikProvider' });
    private client: any | undefined;
    private flushedOnExit = false;
    private flushInFlight = false;
    private lastFlushAt = 0;
    private readonly minFlushIntervalMs = 800;
    private endedConversations: Record<string, boolean> = {};
    private choiceCountByLLM: Record<string, number> = {};
    private convoInputById: Record<string, { messages?: Array<{ role: string; content: string; sequence?: number }> }> = {};
    private convoOutputById: Record<string, { response?: string }> = {};

    // Keep simple in-memory maps for parent-child
    private traceByConversation: Record<string, any> = {};
    private spanByLLM: Record<string, any> = {};
    private spanByTool: Record<string, any> = {};
    private messagesByLLM: Record<string, PromptMessage[]> = {};

    async init(config: ProviderInit): Promise<void> {
        this.enabled = /^(1|true)$/i.test(String(config.env.CALLLLM_OPIK_ENABLED || ''));
        this.redaction = config.redaction || {
            redactPrompts: false,
            redactResponses: false,
            redactToolArgs: false,
            piiDetection: false,
            maxContentLength: 2000
        } as RedactionPolicy;
        if (!this.enabled) {
            this.log.debug('Opik disabled by env');
            return;
        }
        try {
            // Lazy import to avoid hard dep for users not using Opik
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const opikModule: any = await import('opik');
            OpikClient = opikModule.Opik;
            // Align Opik SDK logging with global LOG_LEVEL; do not override if unmapped
            try {
                const raw = String(config.env.LOG_LEVEL || '');
                const desired = this.mapLogLevel(raw);
                if (opikModule?.setLoggerLevel && desired) {
                    opikModule.setLoggerLevel(desired);
                    this.log.debug('Configured Opik SDK log level', { raw, mapped: desired });
                } else {
                    this.log.debug('Skipped Opik SDK log level mapping', { raw });
                }
            } catch { /* ignore */ }
            const apiKey = config.env.OPIK_API_KEY;
            const apiUrl = config.env.OPIK_URL_OVERRIDE;
            const projectName = config.env.OPIK_PROJECT_NAME;
            const workspaceName = config.env.OPIK_WORKSPACE;
            const explicitConfig: Record<string, unknown> = {};
            if (apiKey) explicitConfig.apiKey = apiKey;
            if (apiUrl) explicitConfig.apiUrl = apiUrl;
            if (projectName) explicitConfig.projectName = projectName;
            if (workspaceName) explicitConfig.workspaceName = workspaceName;
            this.client = Object.keys(explicitConfig).length > 0 ? new OpikClient(explicitConfig) : new OpikClient();
            this.log.debug('Opik client initialized', {
                hasApiKey: Boolean(apiKey),
                hasUrl: Boolean(apiUrl),
                hasProject: Boolean(projectName),
                hasWorkspace: Boolean(workspaceName)
            });
            try {
                this.log.debug('Opik client config', {
                    apiHost: apiUrl ? (new URL(apiUrl)).host : 'default',
                    projectName: projectName || 'default',
                    workspaceName: workspaceName || 'n/a'
                });
            } catch { /* ignore bad URL */ }
            if (!apiKey) this.log.warn('OPIK_API_KEY not set');
            if (!apiUrl) this.log.debug('OPIK_URL_OVERRIDE not set; using SDK default');
            if (!projectName) this.log.debug('OPIK_PROJECT_NAME not set; relying on SDK default');
            if (!workspaceName) this.log.debug('OPIK_WORKSPACE not set; required for cloud');

            // Ensure we flush on process exit to avoid losing telemetry
            try {
                const proc: any = (globalThis as any).process;
                if (proc?.once && typeof proc.once === 'function') {
                    proc.once('beforeExit', () => {
                        if (this.flushedOnExit) return;
                        this.flushedOnExit = true;
                        try {
                            this.log.debug('Opik beforeExit: flushing telemetry');
                            const p = this.client?.flush?.();
                            if (p && typeof (p as any).then === 'function') {
                                (p as Promise<void>).catch((err) => this.log.warn('Opik beforeExit flush error', err as Error));
                            }
                        } catch (err) {
                            this.log.warn('Opik beforeExit flush error', err as Error);
                        }
                    });
                }
            } catch { /* ignore */ }
        } catch (e) {
            this.enabled = false;
            this.log.warn('Failed to initialize Opik client; provider disabled', e as Error);
        }
    }

    private truncate(text: string): string {
        if (!text) return '';
        const max = this.redaction.maxContentLength;
        return text.length > max ? `${text.slice(0, max)}...` : text;
    }

    startConversation(ctx: ConversationContext): void {
        if (!this.enabled || !this.client) return;
        try {
            this.log.debug('Opik startConversation', { conversationId: ctx.conversationId, type: ctx.type });
            if (this.traceByConversation[ctx.conversationId]) {
                this.log.debug('Opik startConversation skipped; trace already exists', { conversationId: ctx.conversationId });
                return;
            }
            const trace = this.client.trace({
                name: `conversation.${ctx.type}`,
                input: { conversationId: ctx.conversationId, type: ctx.type },
                output: {}
            });
            this.traceByConversation[ctx.conversationId] = trace;
            try {
                this.log.debug('Opik trace created', { traceId: trace?.data?.id, project: trace?.data?.projectName });
            } catch { /* ignore */ }
            // Avoid immediate flush flood; rely on end events for finalization
        } catch (err) { this.log.warn('Opik startConversation failed', err as Error); }
    }

    endConversation(ctx: ConversationContext, summary?: ConversationSummary, inputOutput?: ConversationInputOutput): void {
        if (!this.enabled || !this.client) return;
        if (this.endedConversations[ctx.conversationId]) {
            this.log.debug('Opik endConversation skipped; already ended', { conversationId: ctx.conversationId });
            return;
        }
        const trace = this.traceByConversation[ctx.conversationId];
        if (!trace) return;
        try {
            this.log.debug('Opik endConversation', { conversationId: ctx.conversationId, hasSummary: Boolean(summary), hasInputOutput: Boolean(inputOutput) });

            // Use passed input/output data; keep Opik trace input/output as JsonListString for compatibility
            const inputList: string[] | undefined = inputOutput?.initialMessages?.length
                ? inputOutput.initialMessages.map(m => `${m.role}: ${this.redaction.redactPrompts ? '[redacted]' : this.truncate(m.content)}`)
                : undefined;

            const outputList: string[] | undefined = inputOutput?.finalResponse
                ? [this.redaction.redactResponses ? '[redacted]' : this.truncate(inputOutput.finalResponse)]
                : undefined;

            const metadata = {
                ...(trace.data?.metadata || {}),
                'summary.tokensTotal': summary?.totalTokens,
                'summary.costTotal': summary?.totalCost,
                'summary.llmCalls': summary?.llmCallsCount,
                'summary.toolCalls': summary?.toolCallsCount,
                'summary.success': summary?.success,
                'summary.errors': summary?.errorCount,
            } as Record<string, unknown>;

            trace.update({
                name: `conversation.${ctx.type}`,
                input: inputList,
                output: outputList,
                metadata,
                endTime: new Date()
            });
            trace.end?.();
            this.endedConversations[ctx.conversationId] = true;
        } catch (err) { this.log.warn('Opik endConversation failed', err as Error); }
        delete this.traceByConversation[ctx.conversationId];
        delete this.convoInputById[ctx.conversationId];
        delete this.convoOutputById[ctx.conversationId];
        this.flushSafe();
    }

    startLLM(ctx: LLMCallContext): void {
        if (!this.enabled || !this.client) return;
        const trace = this.traceByConversation[ctx.conversationId];
        if (!trace) return;
        try {
            this.log.debug('Opik startLLM', { llmCallId: ctx.llmCallId, model: ctx.model, provider: ctx.provider });
            const span = trace.span({
                name: `${ctx.provider.toLowerCase()}.chat.completions`,
                type: 'llm',
                input: {
                    provider: ctx.provider,
                    model: ctx.model,
                    streaming: ctx.streaming,
                    responseFormat: ctx.responseFormat,
                    toolsEnabled: Boolean(ctx.toolsEnabled)
                },
                output: {}
            });
            this.spanByLLM[ctx.llmCallId] = span;
            this.choiceCountByLLM[ctx.llmCallId] = 0;
            try {
                // Ensure provider/model are accessible for cost computation
                span.update({ provider: ctx.provider, model: ctx.model });
            } catch { /* ignore */ }
            try {
                this.log.debug('Opik LLM span created', { spanId: span?.data?.id, traceId: span?.data?.traceId });
            } catch { /* ignore */ }
            // Avoid frequent flushes during stream; finalization will flush
        } catch (err) { this.log.warn('Opik startLLM failed', err as Error); }
    }

    addPrompt(ctx: LLMCallContext, messages: PromptMessage[]): void {
        if (!this.enabled || !this.client) return;
        const span = this.spanByLLM[ctx.llmCallId];
        if (!span) return;
        try {
            this.log.debug('Opik addPrompt', { llmCallId: ctx.llmCallId, count: messages.length });
            // Keep a copy for trace-level fallback visibility
            this.messagesByLLM[ctx.llmCallId] = messages.slice();
            const redact = this.redaction.redactPrompts;
            this.convoInputById[ctx.conversationId] = {
                messages: messages.map(m => ({ role: m.role, content: redact ? '[redacted]' : this.truncate(m.content), sequence: m.sequence }))
            };
            span.update({
                input: {
                    ...(span.data?.input || {}),
                    messages: messages.map(m => ({ role: m.role, content: redact ? '[redacted]' : this.truncate(m.content), sequence: m.sequence }))
                }
            });
            // Do not flush on every prompt update to prevent spam
        } catch (err) { this.log.warn('Opik addPrompt failed', err as Error); }
    }

    addChoice(ctx: LLMCallContext, choice: ChoiceEvent): void {
        if (!this.enabled || !this.client) return;
        const span = this.spanByLLM[ctx.llmCallId];
        if (!span) return;
        try {
            const count = (this.choiceCountByLLM[ctx.llmCallId] = (this.choiceCountByLLM[ctx.llmCallId] || 0) + 1);
            if (!choice.isChunk || count % 20 === 0) {
                this.log.debug('Opik addChoice', { llmCallId: ctx.llmCallId, isChunk: choice.isChunk, length: choice.content?.length, sequence: choice.sequence });
            }
            const redact = this.redaction.redactResponses;
            const content = redact ? '[redacted]' : this.truncate(choice.content);
            const prev = (span.data?.output || {});
            const existing = (prev.response || '') as string;
            span.update({
                output: {
                    ...(prev || {}),
                    response: `${existing}${content}`
                }
            });
            // Do not flush on every chunk to prevent excessive flush calls
        } catch (err) { this.log.warn('Opik addChoice failed', err as Error); }
    }

    endLLM(ctx: LLMCallContext, usage?: Usage, responseModel?: string): void {
        if (!this.enabled || !this.client) return;
        const span = this.spanByLLM[ctx.llmCallId];
        if (!span) return;
        try {
            this.log.debug('Opik endLLM', { llmCallId: ctx.llmCallId, responseModel, hasUsage: Boolean(usage) });
            const responseText = (span.data?.output?.response || '') as string;
            const promptTokens = usage?.tokens.input.total;
            const completionTokens = usage?.tokens.output.total;
            const totalTokens = usage?.tokens.total;
            const updatePayload: Record<string, any> = {
                provider: span?.data?.provider || ctx.provider,
                model: responseModel || ctx.model,
                // Use camelCase keys for usage; Opik TS SDK expects camelCase in JS client
                usage: usage ? {
                    promptTokens,
                    completionTokens,
                    totalTokens
                } : undefined,
                totalEstimatedCost: usage?.costs?.total,
                // Output must be an object; include response and responseModel
                output: {
                    response: responseText,
                    responseModel
                },
                metadata: {
                    ...(span.data?.metadata || {}),
                    'original_usage.prompt_tokens': promptTokens,
                    'original_usage.completion_tokens': completionTokens,
                    'original_usage.total_tokens': totalTokens
                },
                // Close the span atomically in the same update to avoid race with end()
                endTime: new Date()
            };
            try { this.log.debug('Opik span.update payload', updatePayload); } catch { /* ignore */ }
            span.update(updatePayload);
            this.convoOutputById[ctx.conversationId] = { response: responseText };
            // Do NOT call span.end() here; endTime in update closes it atomically
            // Fallback: also update the parent trace's input/output for better visibility in UI (use JsonListString)
            const trace = this.traceByConversation[ctx.conversationId];
            if (trace) {
                const redactPrompts = this.redaction.redactPrompts;
                const redactResponses = this.redaction.redactResponses;
                const messages = this.messagesByLLM[ctx.llmCallId] || [];
                const inputList = messages.length
                    ? messages.map(m => `${m.role}: ${redactPrompts ? '[redacted]' : this.truncate(m.content)}`)
                    : undefined;
                const outputList = responseText
                    ? [redactResponses ? '[redacted]' : this.truncate(responseText)]
                    : undefined;
                trace.update({
                    input: inputList,
                    output: outputList,
                    metadata: {
                        ...(trace.data?.metadata || {}),
                        'original_usage.prompt_tokens': promptTokens,
                        'original_usage.completion_tokens': completionTokens,
                        'original_usage.total_tokens': totalTokens
                    }
                });
            }
        } catch (err) { this.log.warn('Opik endLLM failed', err as Error); }
        delete this.spanByLLM[ctx.llmCallId];
        delete this.messagesByLLM[ctx.llmCallId];
        delete this.choiceCountByLLM[ctx.llmCallId];
    }

    startTool(ctx: ToolCallContext): void {
        if (!this.enabled || !this.client) return;
        const trace = this.traceByConversation[ctx.conversationId];
        if (!trace) return;
        try {
            this.log.debug('Opik startTool', { toolCallId: ctx.toolCallId, name: ctx.name });
            const span = trace.span({
                name: `execute_tool ${ctx.name}`,
                type: 'tool',
                input: {
                    name: ctx.name,
                    type: ctx.type,
                    executionIndex: ctx.executionIndex,
                    parallel: ctx.parallel
                },
                output: {}
            });
            this.spanByTool[ctx.toolCallId] = span;
            try {
                this.log.debug('Opik tool span created', { spanId: span?.data?.id, traceId: span?.data?.traceId });
            } catch { /* ignore */ }
        } catch (err) { this.log.warn('Opik startTool failed', err as Error); }
    }

    endTool(ctx: ToolCallContext, result?: unknown, error?: unknown): void {
        if (!this.enabled || !this.client) return;
        const span = this.spanByTool[ctx.toolCallId];
        if (!span) return;
        try {
            this.log.debug('Opik endTool', { toolCallId: ctx.toolCallId, hasError: Boolean(error) });
            span.update({
                output: { result, error: error ? String(error) : undefined }
            });
            span.end?.();
        } catch (err) { this.log.warn('Opik endTool failed', err as Error); }
        delete this.spanByTool[ctx.toolCallId];
    }

    private flushSafe(): void {
        try {
            if (!this.client?.flush) return;
            if (this.flushInFlight) return;
            const now = Date.now();
            if (now - this.lastFlushAt < this.minFlushIntervalMs) return;
            this.flushInFlight = true;
            const p = this.client.flush();
            if (p && typeof (p as any).then === 'function') {
                (p as Promise<void>)
                    .then(() => {
                        this.lastFlushAt = Date.now();
                        this.log.debug('Opik flush complete');
                    })
                    .catch((e) => this.log.warn('Opik flush error', e as Error))
                    .finally(() => { this.flushInFlight = false; });
            } else {
                this.flushInFlight = false;
                this.lastFlushAt = Date.now();
            }
        } catch {
            this.flushInFlight = false;
        }
    }

    private mapLogLevel(globalLevel: string): string | undefined {
        const lvl = String(globalLevel || '').toLowerCase();
        switch (lvl) {
            case 'debug': return 'DEBUG';
            case 'info': return 'INFO';
            case 'warn': return 'WARN';
            case 'error': return 'ERROR';
            default:
                return undefined; // Do not override Opik logger for other values
        }
    }
}


