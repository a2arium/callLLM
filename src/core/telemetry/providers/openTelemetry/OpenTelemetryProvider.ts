import { context, SpanKind, trace, type Attributes } from '@opentelemetry/api';
import { awaitOtelReady, getAutoOtelService } from './OtelBootstrap.ts';
import { logger } from '../../../../utils/logger.ts';
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

export class OpenTelemetryProvider implements TelemetryProvider {
    public readonly name = 'opentelemetry';
    private tracer = trace.getTracer('callllm', '1.0.0');
    private enabled = false;
    private redaction!: RedactionPolicy;
    private readonly log = logger.createLogger({ prefix: 'OpenTelemetryProvider' });

    async init(config: ProviderInit): Promise<void> {
        this.enabled = /^(1|true)$/i.test(String(config.env.CALLLLM_OTEL_ENABLED || ''));
        this.redaction = config.redaction || {
            redactPrompts: false,
            redactResponses: false,
            redactToolArgs: false,
            piiDetection: false,
            maxContentLength: 2000
        };
        this.log.debug('init called', {
            enabled: this.enabled,
            serviceName: String(config.env.OTEL_SERVICE_NAME || ''),
            hasTracesEndpoint: Boolean(config.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || config.env.OTEL_EXPORTER_OTLP_ENDPOINT),
            wantConsole: /^(1|true)$/i.test(String(config.env.OTEL_EXPORTER_CONSOLE || '')) || /^(debug|trace)$/i.test(String(config.env.OTEL_LOG_LEVEL || ''))
        });
        if (!this.enabled) {
            this.log.debug('OpenTelemetry disabled by env');
            return;
        }
        // Ensure SDK autostart
        getAutoOtelService();
        try { await awaitOtelReady(); this.log.debug('OTel SDK ready'); } catch (e) { this.log.warn('awaitOtelReady failed', e as Error); }
    }

    private truncate(text: string): string {
        if (!text) return '';
        const max = this.redaction.maxContentLength;
        return text.length > max ? `${text.slice(0, max)}...` : text;
    }

    startConversation(ctx: ConversationContext): void {
        if (!this.enabled) return;
        const span = this.tracer.startSpan(`conversation.${ctx.type}`, {
            kind: SpanKind.SERVER, attributes: {
                'gen_ai.conversation.id': ctx.conversationId,
                'gen_ai.conversation.type': ctx.type
            } as Attributes
        }, context.active());
        (span as any).__callllm_id = ctx.conversationId;
        (span as any).__callllm_kind = 'conversation';
        (span as any).end = (span.end).bind(span);
        (globalThis as any)[`__callllm_conv_${ctx.conversationId}`] = span;
        try {
            this.log.debug('startConversation span created', {
                conversationId: ctx.conversationId,
                spanId: span.spanContext().spanId,
                traceId: span.spanContext().traceId
            });
        } catch { /* ignore */ }
    }

    endConversation(ctx: ConversationContext, summary?: ConversationSummary, inputOutput?: ConversationInputOutput): void {
        if (!this.enabled) return;
        const span = (globalThis as any)[`__callllm_conv_${ctx.conversationId}`];
        if (!span) return;
        try {
            const attrs: Attributes = {};
            if (summary?.totalTokens !== undefined) (attrs as any)['gen_ai.conversation.tokens.total'] = summary.totalTokens;
            if (summary?.totalCost !== undefined) (attrs as any)['gen_ai.conversation.cost.total'] = summary.totalCost;
            if (summary?.llmCallsCount !== undefined) (attrs as any)['gen_ai.conversation.llm_calls'] = summary.llmCallsCount;
            if (summary?.toolCallsCount !== undefined) (attrs as any)['gen_ai.conversation.tool_calls'] = summary.toolCallsCount;
            if (summary?.success !== undefined) (attrs as any)['gen_ai.conversation.success'] = summary.success;
            if (summary?.errorCount !== undefined) (attrs as any)['gen_ai.conversation.errors.count'] = summary.errorCount;

            // Add input/output attributes for OpenTelemetry
            if (inputOutput?.initialMessages?.length) {
                (attrs as any)['gen_ai.conversation.input.messages.count'] = inputOutput.initialMessages.length;
                // Add first message as example (truncated)
                const firstMsg = inputOutput.initialMessages[0];
                if (firstMsg && !this.redaction.redactPrompts) {
                    (attrs as any)['gen_ai.conversation.input.first_message'] = this.truncate(firstMsg.content);
                }
            }
            if (inputOutput?.finalResponse && !this.redaction.redactResponses) {
                (attrs as any)['gen_ai.conversation.output.response'] = this.truncate(inputOutput.finalResponse);
            }

            span.setAttributes(attrs);
            this.log.debug('endConversation set attributes', { conversationId: ctx.conversationId, ...attrs as any });
        } catch { /* ignore */ }
        try { span.end(); this.log.debug('endConversation span ended', { conversationId: ctx.conversationId }); } catch { /* ignore */ }
        delete (globalThis as any)[`__callllm_conv_${ctx.conversationId}`];
    }

    startLLM(ctx: LLMCallContext): void {
        if (!this.enabled) return;
        const parent = (globalThis as any)[`__callllm_conv_${ctx.conversationId}`];
        const span = this.tracer.startSpan(`${ctx.provider.toLowerCase()}.chat.completions`, {
            kind: SpanKind.CLIENT,
            attributes: {
                'gen_ai.operation.name': 'chat',
                'gen_ai.system': ctx.provider.toLowerCase(),
                'gen_ai.request.model': ctx.model,
                'gen_ai.request.is_stream': ctx.streaming,
                'gen_ai.output.type': ctx.responseFormat === 'json' ? 'json' : 'text',
                'gen_ai.tools.enabled': Boolean(ctx.toolsEnabled)
            } as Attributes
        }, parent ? trace.setSpan(context.active(), parent) : context.active());
        (span as any).__callllm_id = ctx.llmCallId;
        (globalThis as any)[`__callllm_llm_${ctx.llmCallId}`] = span;
        try {
            this.log.debug('startLLM span created', {
                llmCallId: ctx.llmCallId,
                conversationId: ctx.conversationId,
                spanId: span.spanContext().spanId,
                traceId: span.spanContext().traceId,
                model: ctx.model,
                streaming: ctx.streaming,
                toolsEnabled: Boolean(ctx.toolsEnabled)
            });
        } catch { /* ignore */ }
    }

    addPrompt(ctx: LLMCallContext, messages: PromptMessage[]): void {
        if (!this.enabled) return;
        const span = (globalThis as any)[`__callllm_llm_${ctx.llmCallId}`];
        if (!span) return;
        for (const m of messages) {
            const content = this.redaction.redactPrompts ? '[redacted]' : this.truncate(m.content);
            try {
                span.addEvent('gen_ai.prompt', {
                    'gen_ai.prompt.role': m.role,
                    'gen_ai.prompt.content': content,
                    'gen_ai.prompt.content.length': content.length,
                    'gen_ai.prompt.sequence': m.sequence
                });
                this.log.debug('addPrompt event added', { llmCallId: ctx.llmCallId, sequence: m.sequence, role: m.role, length: content.length });
            } catch { /* ignore */ }
        }
    }

    addChoice(ctx: LLMCallContext, choice: ChoiceEvent): void {
        if (!this.enabled) return;
        const span = (globalThis as any)[`__callllm_llm_${ctx.llmCallId}`];
        if (!span) return;
        const content = this.redaction.redactResponses ? '[redacted]' : this.truncate(choice.content);
        try {
            span.addEvent(choice.isChunk ? 'gen_ai.choice.chunk' : 'gen_ai.choice', {
                'gen_ai.choice.content': content,
                'gen_ai.choice.content.length': choice.contentLength,
                'gen_ai.choice.index': choice.index ?? 0,
                ...(choice.sequence !== undefined ? { 'gen_ai.choice.chunk.sequence': choice.sequence } : {}),
                ...(choice.finishReason ? { 'gen_ai.choice.finish_reason': choice.finishReason } : {})
            });
            this.log.debug('addChoice event added', { llmCallId: ctx.llmCallId, isChunk: Boolean(choice.isChunk), length: choice.contentLength, index: choice.index, sequence: choice.sequence, finishReason: choice.finishReason });
        } catch { /* ignore */ }
    }

    endLLM(ctx: LLMCallContext, usage?: Usage, responseModel?: string): void {
        if (!this.enabled) return;
        const span = (globalThis as any)[`__callllm_llm_${ctx.llmCallId}`];
        if (!span) return;
        try {
            const attrs: Attributes = {};
            if (responseModel) (attrs as any)['gen_ai.response.model'] = responseModel;
            if (usage) {
                (attrs as any)['gen_ai.usage.input_tokens'] = usage.tokens.input.total;
                (attrs as any)['gen_ai.usage.output_tokens'] = usage.tokens.output.total;
                (attrs as any)['gen_ai.usage.total_tokens'] = usage.tokens.total;
                // Optional convenience costs
                if (usage.costs) {
                    (attrs as any)['gen_ai.usage.cost'] = usage.costs.total;
                }
            }

            span.setAttributes(attrs);
            this.log.debug('endLLM set attributes', { llmCallId: ctx.llmCallId, responseModel, usage: usage ? { input: usage.tokens.input.total, output: usage.tokens.output.total, total: usage.tokens.total, cost: usage.costs?.total } : undefined });
        } catch { /* ignore */ }
        try { span.end(); this.log.debug('endLLM span ended', { llmCallId: ctx.llmCallId }); } catch { /* ignore */ }
        delete (globalThis as any)[`__callllm_llm_${ctx.llmCallId}`];
    }

    startTool(ctx: ToolCallContext): void {
        if (!this.enabled) return;
        const parent = (globalThis as any)[`__callllm_conv_${ctx.conversationId}`];
        const span = this.tracer.startSpan(`execute_tool ${ctx.name}`, {
            kind: SpanKind.CLIENT,
            attributes: {
                'gen_ai.operation.name': 'execute_tool',
                'gen_ai.tool.name': ctx.name,
                'gen_ai.tool.type': ctx.type,
                'gen_ai.tool.execution.index': ctx.executionIndex ?? 0,
                'gen_ai.tool.execution.parallel': Boolean(ctx.parallel)
            } as Attributes
        }, parent ? trace.setSpan(context.active(), parent) : context.active());
        (span as any).__callllm_id = ctx.toolCallId;
        (globalThis as any)[`__callllm_tool_${ctx.toolCallId}`] = span;
        try {
            this.log.debug('startTool span created', {
                toolCallId: ctx.toolCallId,
                conversationId: ctx.conversationId,
                name: ctx.name,
                spanId: span.spanContext().spanId,
                traceId: span.spanContext().traceId
            });
        } catch { /* ignore */ }
    }

    endTool(ctx: ToolCallContext, result?: unknown, error?: unknown): void {
        if (!this.enabled) return;
        const span = (globalThis as any)[`__callllm_tool_${ctx.toolCallId}`];
        if (!span) return;
        try {
            if (error) {
                try { span.recordException(error as any); } catch { /* ignore */ }
            }
            const resultPreview = typeof result === 'string' ? result : JSON.stringify(result || '');
            const content = this.redaction.redactToolArgs ? '[redacted]' : this.truncate(resultPreview);
            span.addEvent(error ? 'gen_ai.tool.error' : 'gen_ai.tool.result', {
                'tool.result_size': content.length,
                'tool.success': !error
            });
            this.log.debug('endTool event added', { toolCallId: ctx.toolCallId, hasError: Boolean(error), resultSize: content.length });
        } catch { /* ignore */ }
        try { span.end(); this.log.debug('endTool span ended', { toolCallId: ctx.toolCallId }); } catch { /* ignore */ }
        delete (globalThis as any)[`__callllm_tool_${ctx.toolCallId}`];
    }
}


