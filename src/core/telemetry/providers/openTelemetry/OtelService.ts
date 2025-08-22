import { trace, context, SpanKind, SpanStatusCode, metrics, type Span, type Context, type Attributes } from '@opentelemetry/api';
import type { Usage, UniversalMessage } from '../../../../interfaces/UniversalInterfaces.ts';
import { logger } from '../../../../utils/logger.ts';

/**
 * Configuration for redaction policies
 */
export type RedactionPolicy = {
    redactPrompts: boolean;
    redactResponses: boolean;
    redactToolArgs: boolean;
    allowedAttributes: string[];
    piiDetection: boolean;
    maxContentLength: number;
};

/**
 * Configuration for embedding in higher-order projects
 */
export type EmbeddingConfig = {
    serviceName?: string;
    parentContext?: Context;
    customAttributes?: Attributes;
    redactionPolicy?: RedactionPolicy;
};

/**
 * Enhanced OpenTelemetry facade for this library with GenAI best practices.
 * - Depends ONLY on @opentelemetry/api at runtime
 * - Host applications configure SDK/exporters (e.g., Opik OTLP HTTP)
 * - All span creation adopts the current active context by default
 * - Supports conversation-level tracing and metrics collection
 * - Embeddable in higher-order projects with context propagation
 */
export class OtelService {
    private readonly log = logger.createLogger({ prefix: 'OtelService' });
    private readonly tracer = trace.getTracer('callllm', '1.0.0');
    private readonly meter = metrics.getMeter('callllm', '1.0.0');

    // Metrics
    private readonly llmCallCounter = this.meter.createCounter('gen_ai.llm.calls.total', {
        description: 'Total number of LLM calls'
    });
    private readonly llmCallDuration = this.meter.createHistogram('gen_ai.llm.calls.duration', {
        description: 'Duration of LLM calls in milliseconds'
    });
    private readonly toolCallCounter = this.meter.createCounter('gen_ai.tools.calls.total', {
        description: 'Total number of tool calls'
    });
    private readonly costGauge = this.meter.createUpDownCounter('gen_ai.costs.total', {
        description: 'Total cost of operations'
    });
    private readonly tokenGauge = this.meter.createUpDownCounter('gen_ai.tokens.total', {
        description: 'Total tokens processed'
    });

    // Configuration
    private readonly embeddingConfig?: EmbeddingConfig;
    private readonly defaultRedactionPolicy: RedactionPolicy = {
        redactPrompts: false,
        redactResponses: false,
        redactToolArgs: false,
        allowedAttributes: ['gen_ai.request.model', 'gen_ai.system', 'gen_ai.operation.name'],
        piiDetection: false,
        maxContentLength: 2000
    };

    constructor(embeddingConfig?: EmbeddingConfig) {
        this.embeddingConfig = embeddingConfig;
    }

    /** Start a high-level operation span (SERVER by default) */
    startOperationSpan(name: string, attrs?: Attributes, parent?: Context): Span {
        const span = this.tracer.startSpan(name, { kind: SpanKind.SERVER, attributes: attrs }, parent || context.active());
        return span;
    }

    /** Start an LLM call span (CLIENT by default, overridable via CALLLLM_OTEL_LLM_KIND=server|client) */
    startLLMCallSpan(name: string, attrs?: Attributes, parent?: Context): Span {
        const desiredKind = String(process.env.CALLLLM_OTEL_LLM_KIND || 'client').toLowerCase();
        const kind = desiredKind === 'server' ? SpanKind.SERVER : SpanKind.CLIENT;
        const span = this.tracer.startSpan(name, { kind, attributes: attrs }, parent || context.active());
        try {
            this.log.debug('Started LLM span', {
                name,
                spanId: span.spanContext().spanId,
                traceId: span.spanContext().traceId
            });
        } catch { }
        return span;
    }

    /** Start a tool call span (CLIENT by default) */
    startToolCallSpan(name: string, attrs?: Attributes, parent?: Context): Span {
        const span = this.tracer.startSpan(name, { kind: SpanKind.CLIENT, attributes: attrs }, parent || context.active());
        return span;
    }

    /** Start an internal processing span (INTERNAL) */
    startInternalSpan(name: string, attrs?: Attributes, parent?: Context): Span {
        const span = this.tracer.startSpan(name, { kind: SpanKind.INTERNAL, attributes: attrs }, parent || context.active());
        return span;
    }

    /** 
     * Start a conversation-level span (SERVER) - represents the entire user interaction
     * This is the top-level span that contains all LLM calls and tool invocations
     */
    startConversationSpan(name: string, attrs?: Attributes): Span {
        const parentContext = this.embeddingConfig?.parentContext || context.active();
        const baseAttributes: Attributes = {
            'gen_ai.application_name': process.env.OTEL_SERVICE_NAME || 'callllm',
            'gen_ai.conversation.type': name.includes('stream') ? 'streaming' : 'synchronous',
            'gen_ai.operation.name': 'conversation',
            ...this.embeddingConfig?.customAttributes,
            ...attrs
        };

        const span = this.tracer.startSpan(`conversation.${name}`, {
            kind: SpanKind.SERVER,
            attributes: baseAttributes
        }, parentContext);

        this.log.debug('Started conversation span', {
            name: `conversation.${name}`,
            spanId: span.spanContext().spanId,
            traceId: span.spanContext().traceId
        });

        return span;
    }

    /** Run a function with the provided span as the active context */
    async withActiveSpan<T>(span: Span, fn: () => Promise<T>): Promise<T> {
        return await context.with(trace.setSpan(context.active(), span), fn);
    }

    endSpan(span?: Span): void {
        if (!span) return;
        try {
            this.log.debug('Ending span', {
                spanId: span.spanContext().spanId,
                traceId: span.spanContext().traceId
            });
            span.end();
        } catch (err) { this.log.debug('endSpan error', err as Error); }
    }

    addAttributesToSpan(span: Span | undefined, attrs: Attributes): void {
        if (!span) return;
        try { span.setAttributes(attrs); } catch (err) { this.log.debug('setAttributes error', err as Error); }
    }

    addEventToSpan(span: Span | undefined, name: string, attrs?: Attributes): void {
        if (!span) return;
        try {
            span.addEvent(name, attrs);
            this.log.debug('Added span event', {
                name,
                spanId: span.spanContext().spanId
            });
        } catch (err) { this.log.debug('addEvent error', err as Error); }
    }

    private truncateContent(text: string, maxLen = 2000): string {
        const t = text ?? '';
        return t.length > maxLen ? `${t.slice(0, maxLen)}...` : t;
    }

    /** 
     * Record metrics for LLM operations
     */
    recordLLMMetrics(model: string, duration: number, success: boolean, usage?: Usage): void {
        try {
            const labels = { model, success: success.toString() };
            this.llmCallCounter.add(1, labels);
            this.llmCallDuration.record(duration, { model });

            if (usage) {
                this.tokenGauge.add(usage.tokens.input.total, { type: 'input', model });
                this.tokenGauge.add(usage.tokens.output.total, { type: 'output', model });

                if (usage.costs) {
                    this.costGauge.add(usage.costs.total, { type: 'llm', model });
                }
            }
        } catch (err) {
            this.log.debug('recordLLMMetrics error', err as Error);
        }
    }

    /** 
     * Record metrics for tool operations
     */
    recordToolMetrics(toolName: string, duration: number, success: boolean, cost?: number): void {
        try {
            const labels = { tool: toolName, success: success.toString() };
            this.toolCallCounter.add(1, labels);

            if (cost !== undefined) {
                this.costGauge.add(cost, { type: 'tool', tool: toolName });
            }
        } catch (err) {
            this.log.debug('recordToolMetrics error', err as Error);
        }
    }

    /** 
     * Get effective redaction policy
     */
    private getRedactionPolicy(options?: { redactionPolicy?: RedactionPolicy }): RedactionPolicy {
        return {
            ...this.defaultRedactionPolicy,
            ...this.embeddingConfig?.redactionPolicy,
            ...options?.redactionPolicy
        };
    }

    /**
     * Simple PII detection for content sanitization
     */
    private sanitizeContent(content: string, policy: RedactionPolicy): string {
        if (!policy.piiDetection) return content;

        let sanitized = content;
        // Basic PII patterns - can be enhanced
        sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN_REDACTED]'); // SSN
        sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]'); // Email
        sanitized = sanitized.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD_REDACTED]'); // Credit card

        return sanitized;
    }

    /**
     * Get provider name from current context or configuration
     */
    private getProviderName(): string {
        // This could be enhanced to detect provider from active span or configuration
        return process.env.CALLLLM_PROVIDER || 'unknown';
    }

    addErrorToSpan(span: Span | undefined, err: unknown): void {
        if (!span) return;
        try {
            span.setStatus({ code: SpanStatusCode.ERROR });
            if (err instanceof Error) {
                span.recordException(err);
                span.setAttributes({ 'error.message': err.message, 'error.name': err.name });
            } else if (typeof err === 'string') {
                span.setAttributes({ 'error.message': err });
            } else {
                span.setAttributes({ 'error.message': String(err) });
            }
        } catch (e) {
            this.log.debug('addErrorToSpan error', e as Error);
        }
    }

    /** 
     * Attach token usage attributes per OTel GenAI semconv + interop attributes
     * Critical: Must be called BEFORE span.end() for Langfuse/Opik recognition
     */
    addUsageAndCostToSpan(span: Span | undefined, usage: Usage | undefined): void {
        if (!span || !usage) return;
        try {
            // OpenTelemetry GenAI semantic conventions (required)
            const genAiUsageAttrs: Attributes = {
                'gen_ai.usage.input_tokens': usage.tokens.input.total,
                'gen_ai.usage.output_tokens': usage.tokens.output.total,
                'gen_ai.usage.total_tokens': usage.tokens.total
            };

            // Vercel AI SDK style attributes for interoperability 
            const aiSdkUsageAttrs: Attributes = {
                'ai.usage.promptTokens': usage.tokens.input.total,
                'ai.usage.completionTokens': usage.tokens.output.total,
                'ai.usage.totalTokens': usage.tokens.total
            };

            span.setAttributes({ ...genAiUsageAttrs, ...aiSdkUsageAttrs });

            // Cost attributes (both GenAI and custom)
            if (usage.costs) {
                const costAttrs: Attributes = {
                    'gen_ai.usage.cost': usage.costs.total,
                    'gen_ai.usage.cost.input': usage.costs.input.total,
                    'gen_ai.usage.cost.output': usage.costs.output.total,
                    'gen_ai.usage.cost.total': usage.costs.total,
                    // AI SDK style cost (if supported)
                    'ai.usage.cost': usage.costs.total
                } as any;
                if (typeof usage.costs.output.reasoning === 'number') {
                    (costAttrs as any)['gen_ai.usage.cost.output.reasoning'] = usage.costs.output.reasoning;
                }
                if (typeof usage.costs.output.image === 'number') {
                    (costAttrs as any)['gen_ai.usage.cost.output.image'] = usage.costs.output.image;
                }
                span.setAttributes(costAttrs);
            }
        } catch (err) {
            this.log.debug('addUsageAndCostToSpan error', err as Error);
        }
    }

    /**
     * Record LLM request details with enhanced semantic conventions and privacy controls
     */
    recordLLMRequestDetails(span: Span | undefined, messages: UniversalMessage[], model: string, settings?: Record<string, unknown>, options?: { redact?: boolean; maxLen?: number; redactionPolicy?: RedactionPolicy; providerName?: string }): void {
        if (!span) return;
        try {
            const policy = this.getRedactionPolicy(options);
            const providerName = options?.providerName || this.getProviderName();

            // Enhanced semantic conventions
            const attrs: Attributes = {
                'gen_ai.request.model': model,
                'gen_ai.system': providerName,
                'gen_ai.operation.name': 'chat.completions',
                'gen_ai.request.messages_count': messages.length,
                'gen_ai.request.has_system_message': messages.some(m => m.role === 'system'),
                'gen_ai.request.has_images': messages.some(m =>
                    Array.isArray(m.content) && (m.content as any[]).some((c: any) => c.type === 'image')
                ),
                'gen_ai.request.has_tools': Boolean((settings as any)?.tools && ((settings as any).tools as any[]).length > 0)
            };

            // Add streaming attribute if applicable
            if ((settings as any)?.stream) {
                (attrs as any)['gen_ai.request.streaming'] = true;
            }

            // Standard LLM parameters with enhanced coverage
            if (settings) {
                const s = settings as Record<string, unknown>;
                if (s.temperature !== undefined) (attrs as any)['gen_ai.request.temperature'] = s.temperature as number;
                if (s.maxTokens !== undefined) (attrs as any)['gen_ai.request.max_tokens'] = s.maxTokens as number;
                if (s.topP !== undefined) (attrs as any)['gen_ai.request.top_p'] = s.topP as number;
                if ((s as any).topK !== undefined) (attrs as any)['gen_ai.request.top_k'] = (s as any).topK as number;
                if (s.frequencyPenalty !== undefined) (attrs as any)['gen_ai.request.frequency_penalty'] = s.frequencyPenalty as number;
                if (s.presencePenalty !== undefined) (attrs as any)['gen_ai.request.presence_penalty'] = s.presencePenalty as number;
                if ((s as any).seed !== undefined) (attrs as any)['gen_ai.request.seed'] = (s as any).seed as number;
                if (typeof (s as any).user === 'string') (attrs as any)['gen_ai.request.user'] = (s as any).user as string;
                if ((s as any).toolChoice !== undefined) {
                    (attrs as any)['gen_ai.request.tool_choice'] = typeof (s as any).toolChoice === 'string'
                        ? (s as any).toolChoice
                        : JSON.stringify((s as any).toolChoice);
                }

                // Enhanced parameters
                if ((s as any).reasoningEffort !== undefined) (attrs as any)['gen_ai.request.reasoning_effort'] = (s as any).reasoningEffort as string;
                if ((s as any).verbosity !== undefined) (attrs as any)['gen_ai.request.verbosity'] = (s as any).verbosity as string;
            }

            span.setAttributes(attrs);

            // Enhanced prompt handling with privacy controls
            const redact = Boolean(options?.redact) || policy.redactPrompts;
            const maxLen = options?.maxLen ?? policy.maxContentLength;
            let aggregatedPrompt = '';
            let promptTokens = 0;
            let messageIndex = 0;

            for (const m of (messages || [])) {
                const content = typeof m.content === 'string' ? m.content : String(m.content ?? '');
                let processedContent = content;

                if (policy.piiDetection && !redact) {
                    processedContent = this.sanitizeContent(content, policy);
                }

                const safe = redact ? '[redacted]' : this.truncateContent(processedContent, maxLen);

                // Emit individual message events following OpenTelemetry GenAI semantic conventions
                this.addEventToSpan(span, 'gen_ai.prompt', {
                    'gen_ai.prompt.role': (m as any).role,
                    'gen_ai.prompt.content': safe,
                    'gen_ai.prompt.content.length': content.length,
                    'gen_ai.prompt.sequence': messageIndex
                });

                if ((m as any).role === 'system' || (m as any).role === 'user') {
                    aggregatedPrompt += (aggregatedPrompt ? '\n\n' : '') + safe;
                    promptTokens += content.length; // Rough estimation
                }

                messageIndex++;
            }

            // Add aggregated prompt attributes for compatibility and interoperability
            if (aggregatedPrompt && !redact) {
                const safePrompt = this.truncateContent(aggregatedPrompt, 4000);
                const messagesJson = this.truncateContent(JSON.stringify(messages), 8000);

                try {
                    // Legacy GenAI attribute (keep for backward compatibility)
                    (span as any).setAttribute?.('gen_ai.prompt', safePrompt);
                    (span as any).setAttribute?.('gen_ai.prompt.estimated_tokens', Math.ceil(promptTokens / 4));

                    // Vercel AI SDK style attributes for interoperability
                    (span as any).setAttribute?.('ai.prompt', safePrompt);
                    (span as any).setAttribute?.('ai.prompt.messages', messagesJson);
                    if (options?.providerName) {
                        (span as any).setAttribute?.('ai.model.provider', options.providerName);
                    }

                    // Langfuse fallback attribute (critical for input display)
                    (span as any).setAttribute?.('input.value', messagesJson);

                } catch { /* ignore */ }
            }
        } catch (err) {
            this.log.debug('recordLLMRequestDetails error', err as Error);
        }
    }

    recordLLMResponseDetails(span: Span | undefined, _response: string | null, finishReason?: string, hasToolCalls?: boolean, _options?: { redact?: boolean; maxLen?: number; }): void {
        if (!span) return;
        try {
            // GenAI semantic conventions for response metadata
            const genAiAttrs: Attributes = {};
            if (finishReason) (genAiAttrs as any)['gen_ai.response.finish_reasons'] = [finishReason];
            if (hasToolCalls !== undefined) (genAiAttrs as any)['gen_ai.tools.enabled'] = hasToolCalls;

            // Vercel AI SDK style attributes for interoperability
            const aiSdkAttrs: Attributes = {};
            if (finishReason) (aiSdkAttrs as any)['ai.response.finishReason'] = finishReason;

            span.setAttributes({ ...genAiAttrs, ...aiSdkAttrs });

            // Emit completion event with response content (truncated/redacted)
            if (_response !== null && _response !== undefined) {
                const redact = Boolean(_options?.redact);
                const maxLen = _options?.maxLen ?? 5000;
                const safe = redact ? '[redacted]' : this.truncateContent(String(_response), maxLen);
                // Use gen_ai.choice event following latest OpenTelemetry GenAI semantic conventions
                this.addEventToSpan(span, 'gen_ai.choice', {
                    'gen_ai.choice.content': safe,
                    'gen_ai.choice.content.length': String(_response).length,
                    'gen_ai.choice.index': 0,
                    'gen_ai.choice.finish_reason': finishReason ?? 'stop'
                });

                // Add interop and fallback attributes on the span
                try {
                    // Vercel AI SDK style response attribute
                    (span as any).setAttribute?.('ai.response.text', safe);

                    // Langfuse fallback attribute (critical for output display)
                    (span as any).setAttribute?.('output.value', safe);

                    // Keep legacy gen_ai.completion attribute for backward compatibility with existing UIs
                    (span as any).setAttribute?.('gen_ai.completion', safe);
                } catch { /* ignore */ }
            }
        } catch (err) {
            this.log.debug('recordLLMResponseDetails error', err as Error);
        }
    }

    /**
     * Record tool call details with enhanced semantic conventions and privacy controls
     */
    recordToolCallDetails(span: Span | undefined, toolName: string, args: Record<string, unknown>, options?: { redact?: boolean; maxLen?: number; allowKeys?: string[]; toolType?: string; serverKey?: string; isParallel?: boolean; executionIndex?: number; redactionPolicy?: RedactionPolicy }): void {
        if (!span) return;
        try {
            const policy = this.getRedactionPolicy(options);
            const maxLen = options?.maxLen ?? policy.maxContentLength;
            const redact = options?.redact ?? policy.redactToolArgs;
            const allowKeys = options?.allowKeys ?? [];

            // Enhanced semantic conventions for tools
            const attrs: Attributes = {
                'gen_ai.tool.name': toolName,
                'gen_ai.tool.type': options?.toolType || 'function',
                'gen_ai.tool.args_count': Object.keys(args || {}).length
            };

            // Add MCP-specific attributes if applicable
            if (options?.serverKey) {
                (attrs as any)['gen_ai.tool.mcp.server'] = options.serverKey;
            }

            // Add execution context
            if (options?.isParallel !== undefined) {
                (attrs as any)['gen_ai.tool.execution.parallel'] = options.isParallel;
            }
            if (options?.executionIndex !== undefined) {
                (attrs as any)['gen_ai.tool.execution.index'] = options.executionIndex;
            }

            // Handle tool arguments with privacy controls
            if (!redact && args) {
                let argsString = JSON.stringify(args);

                if (policy.piiDetection) {
                    argsString = this.sanitizeContent(argsString, policy);
                }

                (attrs as any)['gen_ai.tool.args'] = this.truncateContent(argsString, maxLen);

                // Add individual argument attributes for allowed keys
                for (const key of allowKeys) {
                    if (key in args) {
                        let val = typeof (args as any)[key] === 'string' ? (args as any)[key] as string : JSON.stringify((args as any)[key]);

                        if (policy.piiDetection) {
                            val = this.sanitizeContent(val, policy);
                        }

                        (attrs as any)[`gen_ai.tool.args.${key}`] = this.truncateContent(val, 100);
                    }
                }
            } else {
                (attrs as any)['gen_ai.tool.args'] = '[redacted]';
            }

            span.setAttributes(attrs);

            // Add tool call event for detailed tracking
            this.addEventToSpan(span, 'gen_ai.tool.call', {
                'tool.name': toolName,
                'tool.args_size': JSON.stringify(args || {}).length
            });
        } catch (err) {
            this.log.debug('recordToolCallDetails error', err as Error);
        }
    }

    /**
     * Record tool result details with enhanced semantic conventions and privacy controls
     */
    recordToolResultDetails(span: Span | undefined, result: unknown, isError = false, options?: { redact?: boolean; maxLen?: number; redactionPolicy?: RedactionPolicy; duration?: number }): void {
        if (!span) return;
        try {
            const policy = this.getRedactionPolicy(options);
            const maxLen = options?.maxLen ?? policy.maxContentLength;
            const redact = options?.redact ?? policy.redactResponses;

            let resultStr = typeof result === 'string' ? result : JSON.stringify(result);

            if (policy.piiDetection && !redact) {
                resultStr = this.sanitizeContent(resultStr, policy);
            }

            const processedResult = redact ? '[redacted]' : this.truncateContent(resultStr, maxLen);

            const attrs: Attributes = {
                'gen_ai.tool.result': processedResult,
                'gen_ai.tool.is_error': isError,
                'gen_ai.tool.result_size': resultStr.length,
                'gen_ai.tool.result_type': typeof result
            };

            if (options?.duration !== undefined) {
                (attrs as any)['gen_ai.tool.duration'] = options.duration;
            }

            span.setAttributes(attrs);

            // Add tool result event
            this.addEventToSpan(span, isError ? 'gen_ai.tool.error' : 'gen_ai.tool.result', {
                'tool.result_size': resultStr.length,
                'tool.success': !isError
            });
        } catch (err) {
            this.log.debug('recordToolResultDetails error', err as Error);
        }
    }

    /**
     * Record conversation summary details
     */
    recordConversationSummary(span: Span | undefined, summary: {
        totalTokens?: number;
        totalCost?: number;
        llmCallsCount?: number;
        toolCallsCount?: number;
        success?: boolean;
        duration?: number;
        errorCount?: number;
    }): void {
        if (!span) return;
        try {
            const attrs: Attributes = {
                'gen_ai.conversation.success': summary.success ?? true
            };

            if (summary.totalTokens !== undefined) (attrs as any)['gen_ai.conversation.tokens.total'] = summary.totalTokens;
            if (summary.totalCost !== undefined) (attrs as any)['gen_ai.conversation.cost.total'] = summary.totalCost;
            if (summary.llmCallsCount !== undefined) (attrs as any)['gen_ai.conversation.llm_calls.count'] = summary.llmCallsCount;
            if (summary.toolCallsCount !== undefined) (attrs as any)['gen_ai.conversation.tool_calls.count'] = summary.toolCallsCount;
            if (summary.duration !== undefined) (attrs as any)['gen_ai.conversation.duration'] = summary.duration;
            if (summary.errorCount !== undefined) (attrs as any)['gen_ai.conversation.errors.count'] = summary.errorCount;

            span.setAttributes(attrs);

            // Add conversation completion event
            this.addEventToSpan(span, 'gen_ai.conversation.complete', {
                'conversation.success': summary.success ?? true,
                'conversation.total_operations': (summary.llmCallsCount || 0) + (summary.toolCallsCount || 0)
            });
        } catch (err) {
            this.log.debug('recordConversationSummary error', err as Error);
        }
    }
}

// Physically moved implementation into provider directory to fully encapsulate OTel specifics
// Export types/class from this file only; original path removed after move

