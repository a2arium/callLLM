import type { UniversalStreamResponse } from '../../interfaces/UniversalInterfaces.ts';
import { FinishReason } from '../../interfaces/UniversalInterfaces.ts';
import { TokenCalculator } from '../../core/models/TokenCalculator.ts';
import { logger } from '../../utils/logger.ts';

export class CerebrasStreamHandler {
    private log = logger.createLogger({ prefix: 'CerebrasStreamHandler' });
    private tokenCalculator?: TokenCalculator;

    constructor(tokenCalculator?: TokenCalculator) {
        this.tokenCalculator = tokenCalculator;
    }

    async *handleStream(stream: AsyncIterable<unknown>): AsyncGenerator<UniversalStreamResponse> {
        let accumulatedContent = '';
        let isFirstContentChunk = true;
        let pendingToolCall: { name: string; args: Record<string, unknown> } | null = null;

        for await (const chunkAny of stream) {
            this.log.debug('Raw Cerebras stream chunk:', chunkAny);
            const chunk = (chunkAny ?? {}) as Record<string, unknown>;
            const choices = Array.isArray(chunk.choices) ? (chunk.choices as unknown[]) : [];
            const first = (choices[0] ?? {}) as Record<string, unknown>;
            const deltaObj = (first.delta ?? {}) as Record<string, unknown>;
            const delta = typeof deltaObj.content === 'string' ? (deltaObj.content as string) : '';
            if (delta) {
                // Try to detect tool call JSON in the delta
                let emittedToolCall = false;
                const trimmed = delta.trim();
                if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                    try {
                        const parsed = JSON.parse(trimmed) as Record<string, unknown>;
                        const name = typeof parsed.name === 'string' ? parsed.name : undefined;
                        const args = (parsed.parameters as Record<string, unknown>) || (parsed.arguments as Record<string, unknown>) || undefined;
                        if (name && args && typeof args === 'object') {
                            // Emit a toolCalls chunk to trigger orchestration
                            const output: UniversalStreamResponse = {
                                content: '',
                                role: 'assistant',
                                isComplete: false,
                                toolCalls: [{ id: `call_${Date.now()}`, name, arguments: args }],
                            } as unknown as UniversalStreamResponse;
                            pendingToolCall = { name, args };
                            yield output;
                            emittedToolCall = true;
                        }
                    } catch {
                        // Not a JSON tool call; fall through to treat as normal text
                    }
                }

                if (!emittedToolCall) {
                    accumulatedContent += delta;
                    const output: UniversalStreamResponse = {
                        content: delta,
                        role: 'assistant',
                        isComplete: false,
                        isFirstContentChunk: isFirstContentChunk ? true : undefined,
                    };
                    isFirstContentChunk = false;
                    yield output;
                }
            }

            const finishReason = typeof first.finish_reason === 'string' ? (first.finish_reason as string) : undefined;
            if (finishReason && finishReason.length > 0) {
                const finalChunk: UniversalStreamResponse = {
                    content: '',
                    contentText: accumulatedContent,
                    role: 'assistant',
                    isComplete: true,
                    metadata: { finishReason: this.mapFinishReason(finishReason) }
                } as unknown as UniversalStreamResponse;
                yield finalChunk;
            }
        }
    }

    minimalConvert(ev: unknown): UniversalStreamResponse {
        return { content: '', role: 'assistant', isComplete: false };
    }

    private mapFinishReason(reason: string): FinishReason {
        if (reason === 'length') return FinishReason.LENGTH;
        if (reason === 'tool_calls') return FinishReason.TOOL_CALLS;
        if (reason === 'stop') return FinishReason.STOP;
        return FinishReason.NULL;
    }
}


