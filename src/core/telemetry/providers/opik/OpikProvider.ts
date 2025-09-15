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
    // Capture OUTPUT images (full, untruncated) to attach as Opik attachments on endLLM
    private outputImagesByLLM: Record<string, Array<{ mime?: string; base64?: string; url?: string }>> = {};
    // Ensure we only upload one input attachment per LLM call
    private inputAttachmentUploadedByLLM: Record<string, boolean> = {};
    // Track input masks and ensure single mask attachment upload
    private masksByLLM: Record<string, Array<{ source: 'url' | 'base64' | 'file_path'; url?: string; path?: string; base64?: string }>> = {};
    private inputMaskAttachmentUploadedByLLM: Record<string, boolean> = {};

    private sanitizePromptContent(content: string, redact: boolean): string {
        if (redact) return '[redacted]';
        if (!content) return '';
        // Replace embedded file/mask data URIs with a neutral marker to avoid UI trying to render truncated base64
        if (/^<(file|mask):\s*data:/i.test(content)) {
            return 'image: [input]';
        }
        return this.truncate(content);
    }

    // Upload a single attachment to Opik via REST API (span entity)
    private async uploadSpanAttachment(params: { spanId: string; fileName: string; mime?: string; base64: string }): Promise<void> {
        try {
            const fetchFn: any = (globalThis as any).fetch;
            if (typeof fetchFn !== 'function') {
                this.log.warn('fetch not available; skipping attachment upload');
                return;
            }
            const apiBaseRaw = String(process.env.OPIK_URL_OVERRIDE || '');
            const apiBase = apiBaseRaw.replace(/\/?$/, '');
            const apiKey = String(process.env.OPIK_API_KEY || '');
            if (!apiBase || !apiKey) {
                this.log.warn('Missing OPIK_URL_OVERRIDE or OPIK_API_KEY; skipping attachment upload');
                return;
            }
            const projectName = String(process.env.OPIK_PROJECT_NAME || '');
            const wsNameHeader = String(process.env.OPIK_WORKSPACE || '');
            const workspaceName = String(process.env.OPIK_WORKSPACE || '');
            const qs = new URLSearchParams({
                file_name: params.fileName,
                entity_type: 'span',
                entity_id: params.spanId,
                ...(projectName ? { project_name: projectName } : {}),
                ...(workspaceName ? { workspace_name: workspaceName } : {}),
                ...(params.mime ? { mime_type: params.mime } : {})
            } as any);
            const bytes = Buffer.from(params.base64, 'base64');
            // If override already ends with '/api', don't add another '/api'
            const endsWithApi = /\/api\/?$/.test(apiBase);
            const endpointPath = endsWithApi
                ? `/v1/private/attachment/upload`
                : `/api/v1/private/attachment/upload`;
            const url = `${apiBase}${endpointPath}?${qs.toString()}`;
            try { this.log.debug('Uploading attachment to', { url }); } catch { /* ignore */ }
            const res = await fetchFn(url, {
                method: 'PUT',
                headers: {
                    Authorization: apiKey,
                    ...(wsNameHeader ? { 'Comet-Workspace': wsNameHeader } : {}),
                    'Content-Type': params.mime || 'application/octet-stream'
                },
                body: bytes
            });
            if (!res?.ok) {
                const text = typeof res?.text === 'function' ? await res.text() : String(res?.status || '');
                this.log.warn('Attachment upload failed', new Error(`${res.status} ${text}`));
                return;
            }
            this.log.debug('Attachment uploaded', { spanId: params.spanId, fileName: params.fileName, mime: params.mime });
        } catch (e) {
            this.log.warn('uploadSpanAttachment error', e as Error);
        }
    }

    // Upload a single attachment to Opik via REST API (generic entity)
    private async uploadEntityAttachmentSingle(params: { entityType: 'span' | 'trace'; entityId: string; fileName: string; mime?: string; base64: string }): Promise<void> {
        try {
            const fetchFn: any = (globalThis as any).fetch;
            if (typeof fetchFn !== 'function') {
                this.log.warn('fetch not available; skipping attachment upload');
                return;
            }
            const apiBaseRaw = String(process.env.OPIK_URL_OVERRIDE || '');
            const apiBase = apiBaseRaw.replace(/\/?$/, '');
            const apiKey = String(process.env.OPIK_API_KEY || '');
            if (!apiBase || !apiKey) {
                this.log.warn('Missing OPIK_URL_OVERRIDE or OPIK_API_KEY; skipping attachment upload');
                return;
            }
            const projectName = String(process.env.OPIK_PROJECT_NAME || '');
            const wsNameHeader = String(process.env.OPIK_WORKSPACE || '');
            const workspaceName = String(process.env.OPIK_WORKSPACE || '');
            const qs = new URLSearchParams({
                file_name: params.fileName,
                entity_type: params.entityType,
                entity_id: params.entityId,
                ...(projectName ? { project_name: projectName } : {}),
                ...(workspaceName ? { workspace_name: workspaceName } : {}),
                ...(params.mime ? { mime_type: params.mime } : {})
            } as any);
            const bytes = Buffer.from(params.base64, 'base64');
            const endsWithApi = /\/api\/?$/.test(apiBase);
            const endpointPath = endsWithApi
                ? `/v1/private/attachment/upload`
                : `/api/v1/private/attachment/upload`;
            const url = `${apiBase}${endpointPath}?${qs.toString()}`;
            try { this.log.debug('Uploading attachment (generic) to', { url }); } catch { /* ignore */ }
            const res = await fetchFn(url, {
                method: 'PUT',
                headers: {
                    Authorization: apiKey,
                    ...(wsNameHeader ? { 'Comet-Workspace': wsNameHeader } : {}),
                    'Content-Type': params.mime || 'application/octet-stream'
                },
                body: bytes
            });
            if (!res?.ok) {
                const text = typeof res?.text === 'function' ? await res.text() : String(res?.status || '');
                this.log.warn('Attachment upload (generic) failed', new Error(`${res.status} ${text}`));
                return;
            }
            this.log.debug('Attachment (generic) uploaded', { entityType: params.entityType, entityId: params.entityId, fileName: params.fileName, mime: params.mime });
        } catch (e) {
            this.log.warn('uploadEntityAttachmentSingle error', e as Error);
        }
    }

    private isCloudApiBase(apiBase: string): boolean {
        try { return /comet\.com/i.test(apiBase); } catch { return false; }
    }

    private async listAttachmentLink(params: { entityType: 'span' | 'trace'; entityId: string; fileName?: string }): Promise<string | undefined> {
        try {
            const fetchFn: any = (globalThis as any).fetch;
            if (typeof fetchFn !== 'function') return undefined;
            const apiBaseRaw = String(process.env.OPIK_URL_OVERRIDE || '');
            const apiBase = apiBaseRaw.replace(/\/?$/, '');
            const apiKey = String(process.env.OPIK_API_KEY || '');
            const projectName = String(process.env.OPIK_PROJECT_NAME || '');
            const wsNameHeader = String(process.env.OPIK_WORKSPACE || '');
            if (!apiBase || !apiKey) return undefined;
            const endsWithApi = /\/api\/?$/.test(apiBase);
            const basePath = endsWithApi ? '' : '/api';
            const listUrl = `${apiBase}${basePath}/v1/private/attachment/list`;
            const body: any = {
                entity_type: params.entityType,
                entity_id: params.entityId,
                ...(projectName ? { project_name: projectName } : {})
            };
            if (params.fileName) body.file_name = params.fileName;
            const res = await fetchFn(listUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: apiKey, ...(wsNameHeader ? { 'Comet-Workspace': wsNameHeader } : {}) },
                body: JSON.stringify(body)
            });
            if (!res?.ok) return undefined;
            const json: any = await res.json();
            const items: any[] = Array.isArray(json?.items) ? json.items : (Array.isArray(json) ? json : []);
            const first = items.find((it: any) => params.fileName ? it?.file_name === params.fileName : true) || items[0];
            const link: string | undefined = first?.link || first?.url || first?.download_url;
            return link;
        } catch { return undefined; }
    }

    // Upload and then attach link to trace output.image_url (async fire-and-forget)
    private async uploadAndLinkAttachment(opts: { spanId: string; conversationId: string; traceId?: string; fileName: string; mime?: string; base64: string }): Promise<void> {
        try {
            const apiBaseRaw = String(process.env.OPIK_URL_OVERRIDE || '');
            const apiBase = apiBaseRaw.replace(/\/?$/, '');
            const isCloud = this.isCloudApiBase(apiBase);
            // 1) Upload to producing span
            if (isCloud) {
                await this.uploadSpanAttachmentMultipart(opts);
            } else {
                await this.uploadSpanAttachment(opts);
            }
            // 2) Duplicate to parent trace for main-span visibility
            const trace = this.traceByConversation[opts.conversationId];
            const traceId = String(opts.traceId || trace?.data?.id || '');
            if (traceId) {
                if (isCloud) {
                    await this.uploadAttachmentForEntityMultipart({ entityType: 'trace', entityId: traceId, fileName: opts.fileName, mime: opts.mime, base64: opts.base64 });
                } else {
                    await this.uploadEntityAttachmentSingle({ entityType: 'trace', entityId: traceId, fileName: opts.fileName, mime: opts.mime, base64: opts.base64 });
                }
                try { this.log.debug('Duplicated image attachment to trace', { traceId, fileName: opts.fileName }); } catch { /* ignore */ }
            }
            // 3) Prefer link from trace attachment; fallback to span (with small delay to avoid eventual consistency)
            const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
            if (traceId) { try { await sleep(250); } catch { /* ignore */ } }
            let link = traceId ? await this.listAttachmentLink({ entityType: 'trace', entityId: traceId, fileName: opts.fileName }) : undefined;
            if (!link) link = await this.listAttachmentLink({ entityType: 'span', entityId: opts.spanId, fileName: opts.fileName });
            if (trace && link) {
                try {
                    trace.update({
                        output: {
                            ...(trace.data?.output || {}),
                            image_url: link
                        }
                    });
                    try { this.log.debug('Set image_url on conversation.call', { traceId: trace?.data?.id, link }); } catch { /* ignore */ }
                } catch { /* ignore */ }
            }
        } catch (e) { this.log.warn('uploadAndLinkAttachment error', e as Error); }
    }

    private async uploadSpanAttachmentMultipart(params: { spanId: string; fileName: string; mime?: string; base64: string }): Promise<void> {
        try {
            const fetchFn: any = (globalThis as any).fetch;
            if (typeof fetchFn !== 'function') { this.log.warn('fetch not available; skipping multipart upload'); return; }
            const apiBaseRaw = String(process.env.OPIK_URL_OVERRIDE || '');
            const apiBase = apiBaseRaw.replace(/\/?$/, '');
            const apiKey = String(process.env.OPIK_API_KEY || '');
            if (!apiBase || !apiKey) { this.log.warn('Missing OPIK_URL_OVERRIDE or OPIK_API_KEY; skipping multipart upload'); return; }
            const projectName = String(process.env.OPIK_PROJECT_NAME || '');
            const wsNameHeader = String(process.env.OPIK_WORKSPACE || '');
            const endsWithApi = /\/api\/?$/.test(apiBase);
            const basePath = endsWithApi ? '' : '/api';
            const startUrl = `${apiBase}${basePath}/v1/private/attachment/upload-start`;
            const completeUrl = `${apiBase}${basePath}/v1/private/attachment/upload-complete`;
            const mime = params.mime || 'image/png';
            const bytes = Buffer.from(params.base64, 'base64');
            const partSize = 8 * 1024 * 1024; // 8 MiB
            const numParts = Math.max(1, Math.ceil(bytes.length / partSize));
            const startBody: any = {
                file_name: params.fileName,
                num_of_file_parts: numParts,
                entity_type: 'span',
                entity_id: params.spanId,
                path: 'generated',
                mime_type: mime,
                ...(projectName ? { project_name: projectName } : {})
            };
            const startRes = await fetchFn(startUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: apiKey, ...(wsNameHeader ? { 'Comet-Workspace': wsNameHeader } : {}) }, body: JSON.stringify(startBody) });
            if (!startRes?.ok) { const t = await startRes.text(); throw new Error(`upload-start failed: ${startRes.status} ${t}`); }
            const { upload_id, pre_sign_urls } = await startRes.json();
            if (!upload_id || !pre_sign_urls?.length) throw new Error('upload-start response missing upload_id or pre_sign_urls');
            const uploaded_file_parts: Array<{ part_number: number; e_tag: string }> = [];
            for (let i = 0; i < pre_sign_urls.length; i++) {
                const start = i * partSize; const end = Math.min(start + partSize, bytes.length);
                const part = bytes.subarray(start, end);
                const putRes = await fetchFn(pre_sign_urls[i], { method: 'PUT', headers: { 'Content-Type': mime }, body: part });
                if (!putRes?.ok) { const pt = await putRes.text(); throw new Error(`part ${i + 1} PUT failed: ${putRes.status} ${pt}`); }
                const etagHeader = putRes.headers.get('ETag') || putRes.headers.get('Etag') || putRes.headers.get('etag');
                if (!etagHeader) throw new Error(`part ${i + 1}: missing ETag header`);
                // Cloud expects quoted ETags in e_tag
                const eTagForComplete = etagHeader.startsWith('"') ? etagHeader : `"${etagHeader}"`;
                uploaded_file_parts.push({ part_number: i + 1, e_tag: eTagForComplete });
            }
            const completeBody: any = {
                file_name: params.fileName,
                entity_type: 'span',
                entity_id: params.spanId,
                file_size: bytes.length,
                upload_id,
                uploaded_file_parts,
                mime_type: mime,
                ...(projectName ? { project_name: projectName } : {})
            };
            const completeRes = await fetchFn(completeUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: apiKey, ...(wsNameHeader ? { 'Comet-Workspace': wsNameHeader } : {}) }, body: JSON.stringify(completeBody) });
            if (!completeRes?.ok) { const ct = await completeRes.text(); throw new Error(`upload-complete failed: ${completeRes.status} ${ct}`); }
            this.log.debug('Multipart attachment uploaded', { spanId: params.spanId, fileName: params.fileName, size: bytes.length });
        } catch (e) { this.log.warn('uploadSpanAttachmentMultipart error', e as Error); }
    }

    // Multipart upload for generic entity type (span or trace)
    private async uploadAttachmentForEntityMultipart(params: { entityType: 'span' | 'trace'; entityId: string; fileName: string; mime?: string; base64: string }): Promise<void> {
        try {
            const fetchFn: any = (globalThis as any).fetch;
            if (typeof fetchFn !== 'function') { this.log.warn('fetch not available; skipping multipart upload'); return; }
            const apiBaseRaw = String(process.env.OPIK_URL_OVERRIDE || '');
            const apiBase = apiBaseRaw.replace(/\/?$/, '');
            const apiKey = String(process.env.OPIK_API_KEY || '');
            if (!apiBase || !apiKey) { this.log.warn('Missing OPIK_URL_OVERRIDE or OPIK_API_KEY; skipping multipart upload'); return; }
            const projectName = String(process.env.OPIK_PROJECT_NAME || '');
            const wsNameHeader = String(process.env.OPIK_WORKSPACE || '');
            const endsWithApi = /\/api\/?$/.test(apiBase);
            const basePath = endsWithApi ? '' : '/api';
            const startUrl = `${apiBase}${basePath}/v1/private/attachment/upload-start`;
            const completeUrl = `${apiBase}${basePath}/v1/private/attachment/upload-complete`;
            const mime = params.mime || 'image/png';
            const bytes = Buffer.from(params.base64, 'base64');
            const partSize = 8 * 1024 * 1024; // 8 MiB
            const numParts = Math.max(1, Math.ceil(bytes.length / partSize));
            const startBody: any = {
                file_name: params.fileName,
                num_of_file_parts: numParts,
                entity_type: params.entityType,
                entity_id: params.entityId,
                path: 'generated',
                mime_type: mime,
                ...(projectName ? { project_name: projectName } : {})
            };
            const startRes = await fetchFn(startUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: apiKey, ...(wsNameHeader ? { 'Comet-Workspace': wsNameHeader } : {}) }, body: JSON.stringify(startBody) });
            if (!startRes?.ok) { const t = await startRes.text(); throw new Error(`upload-start failed: ${startRes.status} ${t}`); }
            const { upload_id, pre_sign_urls } = await startRes.json();
            if (!upload_id || !pre_sign_urls?.length) throw new Error('upload-start response missing upload_id or pre_sign_urls');
            const uploaded_file_parts: Array<{ part_number: number; e_tag: string }> = [];
            for (let i = 0; i < pre_sign_urls.length; i++) {
                const start = i * partSize; const end = Math.min(start + partSize, bytes.length);
                const part = bytes.subarray(start, end);
                const putRes = await fetchFn(pre_sign_urls[i], { method: 'PUT', headers: { 'Content-Type': mime }, body: part });
                if (!putRes?.ok) { const pt = await putRes.text(); throw new Error(`part ${i + 1} PUT failed: ${putRes.status} ${pt}`); }
                const etagHeader = putRes.headers.get('ETag') || putRes.headers.get('Etag') || putRes.headers.get('etag');
                if (!etagHeader) throw new Error(`part ${i + 1}: missing ETag header`);
                const eTagForComplete = etagHeader.startsWith('"') ? etagHeader : `"${etagHeader}"`;
                uploaded_file_parts.push({ part_number: i + 1, e_tag: eTagForComplete });
            }
            const completeBody: any = {
                file_name: params.fileName,
                entity_type: params.entityType,
                entity_id: params.entityId,
                file_size: bytes.length,
                upload_id,
                uploaded_file_parts,
                mime_type: mime,
                ...(projectName ? { project_name: projectName } : {})
            };
            const completeRes = await fetchFn(completeUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: apiKey, ...(wsNameHeader ? { 'Comet-Workspace': wsNameHeader } : {}) }, body: JSON.stringify(completeBody) });
            if (!completeRes?.ok) { const ct = await completeRes.text(); throw new Error(`upload-complete failed: ${completeRes.status} ${ct}`); }
        } catch (e) { this.log.warn('uploadAttachmentForEntityMultipart error', e as Error); }
    }

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
                    toolsEnabled: Boolean(ctx.toolsEnabled),
                    toolsAvailable: Array.isArray((ctx as any).toolsAvailable) ? (ctx as any).toolsAvailable : undefined
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
                messages: messages.map(m => ({ role: m.role, content: this.sanitizePromptContent(m.content, redact), sequence: m.sequence }))
            };

            // Detect image references in messages and attach to span input as images
            const detectedImages: Array<{ source: 'url' | 'base64' | 'file_path'; url?: string; path?: string; base64?: string }> = [];
            const detectedMasks: Array<{ source: 'url' | 'base64' | 'file_path'; url?: string; path?: string; base64?: string }> = [];
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
                const maskMatch = content.match(/^<mask:(.+)>$/);
                if (maskMatch) {
                    const ref = maskMatch[1];
                    if (ref.startsWith('http')) {
                        detectedMasks.push({ source: 'url', url: ref });
                    } else if (ref.startsWith('data:')) {
                        detectedMasks.push({ source: 'base64', base64: ref });
                    } else {
                        try {
                            const abs = path.isAbsolute(ref) ? ref : path.resolve(ref);
                            const data = readFileSync(abs);
                            const ext = path.extname(abs).toLowerCase();
                            const mime = ext === '.png' ? 'image/png'
                                : (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg'
                                    : ext === '.webp' ? 'image/webp'
                                        : 'application/octet-stream';
                            const b64 = `data:${mime};base64,${data.toString('base64')}`;
                            detectedMasks.push({ source: 'file_path', path: abs, base64: b64 });
                        } catch { /* ignore fs errors */ }
                    }
                }
            }
            if (detectedImages.length) {
                const existing = (this.imagesByLLM[ctx.llmCallId] || []);
                this.imagesByLLM[ctx.llmCallId] = [...existing, ...detectedImages];
            }
            if (detectedMasks.length) {
                const existingMasks = (this.masksByLLM[ctx.llmCallId] || []);
                this.masksByLLM[ctx.llmCallId] = [...existingMasks, ...detectedMasks];
            }
            // Build image preview messages only for url (avoid duplicating base64/file_path)
            const imagePreviewMessages = (this.imagesByLLM[ctx.llmCallId] || [])
                .filter(img => img.source === 'url')
                .map(img => {
                    const preview = img.base64 ? (this.redaction.redactPrompts ? '[image redacted]' : this.truncate(img.base64))
                        : (img.url || '[image]');
                    return { role: 'user', content: `image: ${preview}`, sequence: (messages[messages.length - 1]?.sequence ?? 0) + 1 };
                });
            // Build images list for span input including URL and BASE64 (tests expect base64 present)
            const imagesForSpanInput = (this.imagesByLLM[ctx.llmCallId] || [])
                .map(img => (
                    img.source === 'url' && img.url
                        ? { source: 'url', url: img.url as string }
                        : img.base64
                            ? { source: 'base64', base64: this.redaction.redactPrompts ? '[redacted]' : this.truncate(img.base64) }
                            : undefined
                ))
                .filter(Boolean) as Array<{ source: 'url' | 'base64'; url?: string; base64?: string }>;

            span.update({
                input: {
                    ...(span.data?.input || {}),
                    messages: [
                        ...messages.map(m => ({ role: m.role, content: this.sanitizePromptContent(m.content, redact), sequence: m.sequence })),
                        ...imagePreviewMessages
                    ],
                    ...(imagesForSpanInput.length ? { images: imagesForSpanInput } : {})
                }
            });

            // If we have a file-based input image with base64, upload it once as an attachment for visibility
            const firstBase64 = (this.imagesByLLM[ctx.llmCallId] || []).find(img => img.base64 && (img.source === 'base64' || img.source === 'file_path'));
            if (span?.data?.id && firstBase64 && !this.inputAttachmentUploadedByLLM[ctx.llmCallId]) {
                this.inputAttachmentUploadedByLLM[ctx.llmCallId] = true;
                try {
                    const dataMatch = (firstBase64.base64 || '').match(/^data:([^;]+);base64,(.*)$/);
                    const mime = dataMatch ? dataMatch[1] : 'image/png';
                    const base64 = dataMatch ? dataMatch[2] : (firstBase64.base64 || '').replace(/^data:[^,]*,/, '');
                    const fileName = 'input-1.' + (mime.split('/')[1] || 'png');
                    const apiBaseRaw = String(process.env.OPIK_URL_OVERRIDE || '');
                    const apiBase = apiBaseRaw.replace(/\/?$/, '');
                    const isCloud = this.isCloudApiBase(apiBase);
                    if (isCloud) {
                        this.uploadSpanAttachmentMultipart({ spanId: String(span.data.id), fileName, mime, base64 }).catch(() => { });
                    } else {
                        this.uploadSpanAttachment({ spanId: String(span.data.id), fileName, mime, base64 }).catch(() => { });
                    }
                } catch (e) { this.log.warn('input attachment upload failed', e as Error); }
            }
            // If we have a mask with base64/file, upload it once as an attachment as well
            const firstMask = (this.masksByLLM[ctx.llmCallId] || []).find(m => m.base64 && (m.source === 'base64' || m.source === 'file_path'));
            if (span?.data?.id && firstMask && !this.inputMaskAttachmentUploadedByLLM[ctx.llmCallId]) {
                this.inputMaskAttachmentUploadedByLLM[ctx.llmCallId] = true;
                try {
                    const dataMatch = (firstMask.base64 || '').match(/^data:([^;]+);base64,(.*)$/);
                    const mime = dataMatch ? dataMatch[1] : 'image/png';
                    const base64 = dataMatch ? dataMatch[2] : (firstMask.base64 || '').replace(/^data:[^,]*,/, '');
                    const fileName = 'mask-1.' + (mime.split('/')[1] || 'png');
                    const apiBaseRaw = String(process.env.OPIK_URL_OVERRIDE || '');
                    const apiBase = apiBaseRaw.replace(/\/?$/, '');
                    const isCloud = this.isCloudApiBase(apiBase);
                    if (isCloud) {
                        this.uploadSpanAttachmentMultipart({ spanId: String(span.data.id), fileName, mime, base64 }).catch(() => { });
                    } else {
                        this.uploadSpanAttachment({ spanId: String(span.data.id), fileName, mime, base64 }).catch(() => { });
                    }
                } catch (e) { this.log.warn('mask attachment upload failed', e as Error); }
            }
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
            // If this choice represents a tool call request, record toolCalls as output
            if (choice.toolCalls && choice.toolCalls.length > 0) {
                const prev = (span.data?.output || {});
                const toolCallsSanitized = choice.toolCalls.map(tc => ({
                    id: tc.id,
                    name: tc.name,
                    arguments: tc.arguments
                }));
                span.update({
                    output: {
                        ...(prev || {}),
                        toolCalls: toolCallsSanitized
                    }
                });
                return;
            }

            const redact = this.redaction.redactResponses;
            const rawContent = choice.content || '';
            if (!rawContent) return;
            const content = redact ? '[redacted]' : this.truncate(rawContent);
            const prev = (span.data?.output || {});
            const existing = this.responseTextByLLM[ctx.llmCallId] ?? ((prev.response || '') as string);

            // Detect special image output marker: "image: <url|data-uri>"
            // Collect for attachments and suppress as textual response
            if (rawContent.startsWith('image:')) {
                const marker = rawContent.slice('image:'.length).trim();
                if (marker.startsWith('http')) {
                    const items = this.outputImagesByLLM[ctx.llmCallId] || [];
                    items.push({ url: marker });
                    this.outputImagesByLLM[ctx.llmCallId] = items;
                } else if (marker.startsWith('data:')) {
                    const dataMatch = marker.match(/^data:([^;]+);base64,(.*)$/);
                    const mime = dataMatch ? dataMatch[1] : 'image/png';
                    const base64Raw = dataMatch ? dataMatch[2] : marker;
                    const items = this.outputImagesByLLM[ctx.llmCallId] || [];
                    items.push({ mime, base64: base64Raw });
                    this.outputImagesByLLM[ctx.llmCallId] = items;
                }
                return;
            }
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
            const priorOutput = (span.data?.output || {});
            const priorOutputImages: any[] = [];
            // Prepare attachments for any collected OUTPUT images
            const outputImgs = this.outputImagesByLLM[ctx.llmCallId] || [];
            // Upload attachments via REST API before closing span and attach link to trace output
            if (span?.data?.id && outputImgs.length) {
                // Capture traceId now because conversation may end shortly after
                const traceForId = this.traceByConversation[ctx.conversationId];
                const traceIdForUpload = String(traceForId?.data?.id || '');
                for (let i = 0; i < outputImgs.length; i++) {
                    const img = outputImgs[i];
                    if (img.base64) {
                        const ct = img.mime || 'image/png';
                        const fn = `generated-${i + 1}.${ct.split('/')[1] || 'png'}`;
                        this.uploadAndLinkAttachment({ spanId: String(span.data.id), conversationId: ctx.conversationId, traceId: traceIdForUpload, fileName: fn, mime: ct, base64: img.base64 }).catch(() => { });
                    }
                }
            }
            // Build OpenAI-style assistant message with image_url content so Opik UI can render
            const outputMessages: Array<{ role: string; content: Array<any> }> = [];
            const assistantContentParts: any[] = [];
            if (responseText && !responseText.startsWith('image:')) {
                const contentText = this.redaction.redactResponses ? '[redacted]' : this.truncate(responseText);
                assistantContentParts.push({ type: 'text', text: contentText });
            }
            if (assistantContentParts.length) {
                outputMessages.push({ role: 'assistant', content: assistantContentParts });
            }
            // Do not include base64 in output; attachments handle previews. If we have a hosted URL, we could include it.
            let imageUrlForOutput: string | undefined = (this.outputImagesByLLM[ctx.llmCallId] || []).find(i => i.url)?.url;
            // Include URL and BASE64 input images on span for visibility
            const imagesForInputUpdate = (this.imagesByLLM[ctx.llmCallId] || [])
                .map(img => (
                    img.source === 'url' && img.url
                        ? { source: 'url', url: img.url as string }
                        : img.base64
                            ? { source: 'base64', base64: this.redaction.redactPrompts ? '[redacted]' : this.truncate(img.base64) }
                            : undefined
                ))
                .filter(Boolean) as Array<{ source: 'url' | 'base64'; url?: string; base64?: string }>;

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
                    ...(priorOutput || {}),
                    ...(outputMessages.length ? { messages: outputMessages } : {}),
                    ...(imageUrlForOutput ? { image_url: imageUrlForOutput } : {}),
                    ...(responseText && !responseText.startsWith('image:') ? { response: responseText } : {}),
                    responseModel
                },
                input: {
                    ...(span.data?.input || {}),
                    ...(imagesForInputUpdate.length ? { images: imagesForInputUpdate } : {})
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
                const outputObject = (responseText || (span.data?.output as any)?.images)
                    ? {
                        ...(responseText ? { response: redactResponses ? '[redacted]' : this.truncate(responseText) } : {}),
                        ...(outputMessages.length ? { messages: outputMessages } : {})
                    }
                    : undefined;
                // Propagate any output images to trace output as well
                const outImages = Array.isArray((span.data?.output as any)?.images)
                    ? ((span.data?.output as any)?.images as any[])
                    : [];
                const sanitizedOutImages = outImages.length
                    ? outImages.map(img => ({
                        source: img.source,
                        ...(img.url ? { url: img.url } : {}),
                        ...(img.path ? { path: img.path } : {}),
                        ...(img.base64 && !redactResponses ? { base64: this.truncate(img.base64) } : {})
                    }))
                    : undefined;
                const traceInput = (inputObject || {}) as any;
                if (Array.isArray(traceInput.messages) && imagePreviewMessagesForTrace.length) {
                    traceInput.messages = [...traceInput.messages, ...imagePreviewMessagesForTrace];
                }
                // For trace-level input, include URL references; if none, include BASE64 previews
                if (images?.length) {
                    type TraceImage = { source: 'url' | 'base64'; url?: string; base64?: string };
                    let sanitizedImagesForTrace: TraceImage[] = images
                        .filter(img => img.source === 'url' && !!img.url)
                        .map(img => ({ source: 'url', url: img.url as string }));
                    if (!sanitizedImagesForTrace.length) {
                        sanitizedImagesForTrace = images
                            .filter(img => !!img.base64)
                            .map(img => ({ source: 'base64', base64: this.redaction.redactPrompts ? '[redacted]' : this.truncate(String(img.base64)) } as TraceImage));
                    }
                    if (sanitizedImagesForTrace.length) {
                        (traceInput as any).images = sanitizedImagesForTrace;
                    }
                }
                trace.update({
                    ...(inputObject || imagePreviewMessagesForTrace.length ? { input: traceInput } : {}),
                    ...(outputObject || sanitizedOutImages ? { output: { ...(outputObject || {}), ...(sanitizedOutImages ? { images: sanitizedOutImages } : {}) } } : {}),
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
        delete this.outputImagesByLLM[ctx.llmCallId];
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
                    requestedId: ctx.requestedId,
                    args: ctx.args,
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

    async flush(): Promise<void> {
        try {
            if (this.client?.flush) {
                await this.client.flush();
            }
        } catch { /* ignore */ }
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


