import type { Scenario } from '../types.ts';

export const streamingChat: Scenario = {
    id: 'streaming-chat',
    title: 'Streaming chat',
    requirements: {
        textOutput: { required: true, formats: ['text'] },
        streaming: { required: true }
    },
    run: async ({ caller }) => {
        const stream = await caller.stream('Write a story about a programmer. Make it at least 250 words.', {
            settings: { temperature: 0.8, maxTokens: 800, verbosity: 'low' }
        });

        let chunks = 0;
        let text = '';
        let finalUsage;
        const startedAt = Date.now();
        const maxDurationMs = Number(process.env.E2E_STREAM_TIMEOUT_MS || 60000);
        let timedOut = false;
        let lastChunkSummary: Record<string, unknown> | undefined;
        const debug = String(process.env.E2E_STREAM_DEBUG || '').toLowerCase() === 'true';
        for await (const chunk of stream) {
            const idx = chunks + 1;
            const contentLen = (chunk.content || '').length;
            if (debug) {
                console.log(`[stream] chunk#${idx} isComplete=${Boolean(chunk.isComplete)} contentLen=${contentLen} toolCalls=${chunk.toolCalls?.length || 0}`);
            }
            if (chunk.content) text += chunk.content;
            chunks++;
            // if (chunks % 10 === 0 || debug) {
            //     console.log(`[stream] progress chunks=${chunks}, partialLen=${text.length}`);
            // }
            if (chunk.isComplete) {
                finalUsage = chunk.metadata?.usage;
                if (debug) {
                    const finishReason = (chunk.metadata as any)?.finishReason;
                    const outTokens = (chunk.metadata as any)?.usage?.tokens?.output?.total;
                    console.log(`[stream] complete: finishReason=${finishReason} outTokens=${outTokens} finalTextLen=${text.length}`);
                }
            }
            if (Date.now() - startedAt > maxDurationMs) {
                timedOut = true;
                console.log(`[stream] timeout after ${maxDurationMs}ms with chunks=${chunks}, partialLen=${text.length}`);
                break;
            }
            if (debug) {
                lastChunkSummary = {
                    isComplete: chunk.isComplete,
                    hasContent: Boolean(chunk.content && chunk.content.length > 0),
                    toolCalls: (chunk.toolCalls || []).map(tc => ({ id: tc.id, name: tc.name })),
                    finishReason: (chunk.metadata as any)?.finishReason,
                    usage: (chunk.metadata as any)?.usage ? {
                        in: (chunk.metadata as any)?.usage?.tokens?.input?.total,
                        out: (chunk.metadata as any)?.usage?.tokens?.output?.total
                    } : undefined
                };
            }
        }
        const streamed = chunks > 1 && text.trim().length > 0;
        if (debug) {
            console.log(`[stream] end: chunks=${chunks} streamed=${streamed} finalTextLen=${text.length}`);
            if (lastChunkSummary) {
                console.log('[stream] lastChunkSummary:', JSON.stringify(lastChunkSummary));
            }
        }
        return { outputText: text, streamed, usage: finalUsage, metadata: { chunkCount: chunks, timeout: timedOut } };
    },
    judge: async (_ctx, result) => {
        const chunkCount = Number((result.metadata as any)?.chunkCount || 0);
        const hasText = (result.outputText ?? '').length > 0;
        if (chunkCount > 1 && hasText) {
            return { pass: true, score: 1, reason: 'Multiple chunks with content' };
        }
        if (chunkCount === 1 && hasText) {
            return { pass: true, score: 0.6, reason: 'Single chunk (provider coalesced); content present' };
        }
        const timedOut = Boolean((result.metadata as any)?.timeout);
        return { pass: false, score: 0, reason: timedOut ? 'Stream timed out' : 'No evidence of streaming' };
    }
};


