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
import { readFileSync } from 'fs';
import path from 'path';

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
    private responseTextByLLM: Record<string, string> = {};
    private imagesByLLM: Record<string, Array<{ source: 'url' | 'base64' | 'file_path'; url?: string; path?: string; base64?: string }>> = {};

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

            // Avoid registering beforeExit async flush hooks which can keep the event loop alive
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
            // Create trace without input/output - we'll create a summary span with the final data
            const trace = this.client.trace({
                name: `conversation.${ctx.type}`,
                metadata: { conversationId: ctx.conversationId, type: ctx.type }
            });
            this.traceByConversation[ctx.conversationId] = trace;
            try {
                this.log.debug('Opik trace created', { traceId: trace?.data?.id, project: trace?.data?.projectName });
            } catch { /* ignore */ }
        } catch (err) { this.log.warn('Opik startConversation failed', err as Error); }
    }

    async endConversation(ctx: ConversationContext, summary?: ConversationSummary, inputOutput?: ConversationInputOutput): Promise<void> {
        if (!this.enabled || !this.client) return;
        if (this.endedConversations[ctx.conversationId]) {
            this.log.debug('Opik endConversation skipped; already ended', { conversationId: ctx.conversationId });
            return;
        }
        const trace = this.traceByConversation[ctx.conversationId];
        if (!trace) return;
        try {
            this.log.debug('Opik endConversation', { conversationId: ctx.conversationId, hasSummary: Boolean(summary), hasInputOutput: Boolean(inputOutput) });

            const metadata = {
                ...(trace.data?.metadata || {}),
                'summary.tokensTotal': summary?.totalTokens,
                'summary.costTotal': summary?.totalCost,
                'summary.llmCalls': summary?.llmCallsCount,
                'summary.toolCalls': summary?.toolCallsCount,
                'summary.success': summary?.success,
                'summary.errors': summary?.errorCount,
            } as Record<string, unknown>;

            // Update trace input/output using object shapes (as expected by Opik API)
            const inputObject: Record<string, unknown> | undefined = inputOutput?.initialMessages?.length
                ? {
                    messages: inputOutput.initialMessages.map(m => ({
                        role: m.role,
                        content: this.redaction.redactPrompts ? '[redacted]' : this.truncate(m.content),
                        sequence: m.sequence
                    }))
                }
                : undefined;

            const outputObject: Record<string, unknown> | undefined = (inputOutput && (inputOutput.finalResponse !== undefined))
                ? {
                    response: inputOutput.finalResponse
                        ? (this.redaction.redactResponses ? '[redacted]' : this.truncate(inputOutput.finalResponse))
                        : 'No response'
                }
                : undefined;

            // Merge with existing trace input to preserve images and preview lines added during endLLM
            const priorInput: any = trace.data?.input || {};
            let mergedInput: any | undefined = undefined;
            if (inputObject) {
                const baseMsgs = Array.isArray((inputObject as any).messages) ? (inputObject as any).messages : [];
                const priorMsgs = Array.isArray(priorInput.messages) ? priorInput.messages : [];
                const previewMsgs = priorMsgs.filter((m: any) => m && typeof m.content === 'string' && m.content.startsWith('image:'));
                mergedInput = {
                    ...priorInput,
                    messages: [...baseMsgs, ...previewMsgs],
                    ...(priorInput.images ? { images: priorInput.images } : {})
                };
            } else if (priorInput && (priorInput.images || priorInput.messages)) {
                mergedInput = priorInput;
            }

            this.log.debug('Opik trace.update with input/output objects', {
                hasInput: Boolean(mergedInput),
                hasOutput: Boolean(outputObject)
            });

            trace.update({
                name: `conversation.${ctx.type}`,
                ...(mergedInput ? { input: mergedInput } : {}),
                ...(outputObject ? { output: outputObject } : {}),
                metadata,
                endTime: new Date()
            });

            // Force flush before ending to ensure update is processed
            if (this.client?.flush) {
                const flushPromise = this.client.flush();
                if (flushPromise && typeof flushPromise.then === 'function') {
                    await flushPromise;
                    this.log.debug('Opik forced flush completed before trace.end()');
                }
            }

            trace.end?.();
            this.endedConversations[ctx.conversationId] = true;
        } catch (err) { this.log.warn('Opik endConversation failed', err as Error); }
        delete this.traceByConversation[ctx.conversationId];
        delete this.convoInputById[ctx.conversationId];
        delete this.convoOutputById[ctx.conversationId];
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

            // Detect image references in messages and attach to span input as images
            const detectedImages: Array<{ source: 'url' | 'base64' | 'file_path'; url?: string; path?: string; base64?: string }> = [];
            for (const m of messages) {
                const content = m.content || '';
                const fileMatch = content.match(/^<file:(.+)>$/);
                if (fileMatch) {
                    const ref = fileMatch[1];
                    if (ref.startsWith('http')) {
                        detectedImages.push({ source: 'url', url: ref });
                    } else if (ref.startsWith('data:')) {
                        detectedImages.push({ source: 'base64', base64: ref });
                    } else {
                        try {
                            const abs = path.isAbsolute(ref) ? ref : path.resolve(ref);
                            const data = readFileSync(abs);
                            // naive mime by ext
                            const ext = path.extname(abs).toLowerCase();
                            const mime = ext === '.png' ? 'image/png'
                                : (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg'
                                    : ext === '.webp' ? 'image/webp'
                                        : 'application/octet-stream';
                            const b64 = `data:${mime};base64,${data.toString('base64')}`;
                            detectedImages.push({ source: 'file_path', path: abs, base64: b64 });
                        } catch { /* ignore fs errors */ }
                    }
                }
            }
            if (detectedImages.length) {
                const existing = (this.imagesByLLM[ctx.llmCallId] || []);
                this.imagesByLLM[ctx.llmCallId] = [...existing, ...detectedImages];
            }
            // Build image preview messages only for url (avoid duplicating base64/file_path)
            const imagePreviewMessages = (this.imagesByLLM[ctx.llmCallId] || [])
                .filter(img => img.source === 'url')
                .map(img => {
                    const preview = img.base64 ? (this.redaction.redactPrompts ? '[image redacted]' : this.truncate(img.base64))
                        : (img.url || '[image]');
                    return { role: 'user', content: `image: ${preview}`, sequence: (messages[messages.length - 1]?.sequence ?? 0) + 1 };
                });
            span.update({
                input: {
                    ...(span.data?.input || {}),
                    messages: [
                        ...messages.map(m => ({ role: m.role, content: redact ? '[redacted]' : this.truncate(m.content), sequence: m.sequence })),
                        ...imagePreviewMessages
                    ],
                    ...(this.imagesByLLM[ctx.llmCallId]?.length ? { images: this.imagesByLLM[ctx.llmCallId] } : {})
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
            const rawContent = choice.content || '';
            if (!rawContent) return;
            const content = redact ? '[redacted]' : this.truncate(rawContent);
            const prev = (span.data?.output || {});
            const existing = this.responseTextByLLM[ctx.llmCallId] ?? ((prev.response || '') as string);
            let nextResponse: string;
            if (!choice.isChunk) {
                // For non-chunk updates, prefer the final complete content (replace)
                nextResponse = content;
            } else if (existing) {
                if (rawContent === existing || existing.endsWith(rawContent)) {
                    // Duplicate or trailing duplicate chunk; keep existing
                    nextResponse = existing;
                } else if (rawContent.includes(existing)) {
                    // New content is a superset (e.g., accumulated text); replace
                    nextResponse = content;
                } else {
                    // Append incremental chunk
                    nextResponse = `${existing}${content}`;
                }
            } else {
                nextResponse = content;
            }
            span.update({
                output: {
                    ...(prev || {}),
                    response: nextResponse
                }
            });
            this.responseTextByLLM[ctx.llmCallId] = nextResponse;
            // Do not flush on every chunk to prevent excessive flush calls
        } catch (err) { this.log.warn('Opik addChoice failed', err as Error); }
    }

    endLLM(ctx: LLMCallContext, usage?: Usage, responseModel?: string): void {
        if (!this.enabled || !this.client) return;
        const span = this.spanByLLM[ctx.llmCallId];
        if (!span) return;
        try {
            this.log.debug('Opik endLLM', { llmCallId: ctx.llmCallId, responseModel, hasUsage: Boolean(usage) });
            const responseText = this.responseTextByLLM[ctx.llmCallId] ?? ((span.data?.output?.response || '') as string);
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
                input: {
                    ...(span.data?.input || {}),
                    ...(this.imagesByLLM[ctx.llmCallId]?.length ? { images: this.imagesByLLM[ctx.llmCallId] } : {})
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
                const inputObject = messages.length
                    ? {
                        messages: messages.map(m => ({
                            role: m.role,
                            content: redactPrompts ? '[redacted]' : this.truncate(m.content),
                            sequence: m.sequence
                        }))
                    }
                    : undefined;
                const images = this.imagesByLLM[ctx.llmCallId];
                // Add lightweight preview lines for URL images to trace messages for UI visibility (skip base64)
                const imagePreviewMessagesForTrace = (images || [])
                    .filter(img => img.source === 'url')
                    .map(img => ({
                        role: 'user',
                        content: `image: ${img.url || '[image]'}`,
                        sequence: (messages[messages.length - 1]?.sequence ?? 0) + 1
                    }));
                const outputObject = responseText
                    ? {
                        response: redactResponses ? '[redacted]' : this.truncate(responseText)
                    }
                    : undefined;
                const traceInput = (inputObject || {}) as any;
                if (Array.isArray(traceInput.messages) && imagePreviewMessagesForTrace.length) {
                    traceInput.messages = [...traceInput.messages, ...imagePreviewMessagesForTrace];
                }
                // Include a lightweight images array on the trace (avoid heavy base64 except when source is base64)
                if (images?.length) {
                    const sanitizedImages = images.map(img => ({
                        source: img.source,
                        ...(img.path ? { path: img.path } : {}),
                        ...(img.url ? { url: img.url } : {}),
                        // Include base64 for any source when available (respect redaction and truncation)
                        ...(img.base64 && !this.redaction.redactPrompts ? { base64: this.truncate(img.base64) } : {})
                    }));
                    traceInput.images = sanitizedImages;
                }
                trace.update({
                    ...(inputObject || imagePreviewMessagesForTrace.length ? { input: traceInput } : {}),
                    ...(outputObject ? { output: outputObject } : {}),
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
        delete this.responseTextByLLM[ctx.llmCallId];
        delete this.imagesByLLM[ctx.llmCallId];
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

    // Optional lifecycle for collector shutdown
    async shutdown(): Promise<void> {
        try {
            if (this.client?.flush) {
                await this.client.flush();
            }
            try { await this.client?.shutdown?.(); } catch { /* ignore */ }
            try { this.client?.stop?.(); } catch { /* ignore */ }
            try { this.client?.close?.(); } catch { /* ignore */ }
        } catch { /* ignore */ }
        this.client = undefined;
    }
}


