import type { UniversalStreamResponse } from '../../interfaces/UniversalInterfaces.ts';
import { FinishReason } from '../../interfaces/UniversalInterfaces.ts';
import { TokenCalculator } from '../../core/models/TokenCalculator.ts';
import { logger } from '../../utils/logger.ts';
import type { VeniceStreamChunk } from './types.ts';
import type { ToolCallChunk } from '../../core/streaming/types.ts';

export class VeniceStreamHandler {
    private log = logger.createLogger({ prefix: 'VeniceStreamHandler' });
    private tokenCalculator?: TokenCalculator;

    constructor(tokenCalculator?: TokenCalculator) {
        this.tokenCalculator = tokenCalculator;
    }

    async *handleStream(stream: AsyncIterable<unknown>): AsyncGenerator<UniversalStreamResponse> {
        let accumulatedContent = '';
        let accumulatedReasoning = '';
        let isFirstContentChunk = true;
        let isFirstReasoningChunk = true;

        for await (const chunkAny of stream) {
            this.log.debug('Raw Venice stream chunk:', chunkAny);
            const chunk = chunkAny as VeniceStreamChunk;
            const choice = chunk.choices[0];
            if (!choice) continue;

            const delta = choice.delta;
            const content = delta.content || '';
            const reasoning = delta.reasoning_content || '';
            const toolCallChunks = delta.tool_calls as ToolCallChunk[] | undefined;

            if (content || reasoning || toolCallChunks) {
                const response: UniversalStreamResponse = {
                    content,
                    reasoning,
                    role: 'assistant',
                    isComplete: false,
                    isFirstContentChunk: content && isFirstContentChunk ? true : undefined,
                    isFirstReasoningChunk: reasoning && isFirstReasoningChunk ? true : undefined,
                    toolCallChunks
                };

                if (content) {
                    accumulatedContent += content;
                    isFirstContentChunk = false;
                }
                if (reasoning) {
                    accumulatedReasoning += reasoning;
                    isFirstReasoningChunk = false;
                }

                yield response;
            }

            if (choice.finish_reason) {
                const finalChunk: UniversalStreamResponse = {
                    content: '',
                    contentText: accumulatedContent,
                    reasoningText: accumulatedReasoning,
                    role: 'assistant',
                    isComplete: true,
                    metadata: {
                        finishReason: this.mapFinishReason(choice.finish_reason),
                        usage: this.mapUsage(chunk.usage)
                    }
                } as any;
                yield finalChunk;
            }
        }
    }

    minimalConvert(ev: unknown): UniversalStreamResponse {
        return { content: '', role: 'assistant', isComplete: false };
    }

    private mapFinishReason(reason: string): FinishReason {
        switch (reason) {
            case 'stop': return FinishReason.STOP;
            case 'length': return FinishReason.LENGTH;
            case 'tool_calls': return FinishReason.TOOL_CALLS;
            case 'content_filter': return FinishReason.CONTENT_FILTER;
            default: return FinishReason.STOP;
        }
    }

    private mapUsage(usageObj: any) {
        if (!usageObj) return undefined;
        return {
            tokens: {
                input: { total: usageObj.prompt_tokens || 0, cached: usageObj.prompt_tokens_details?.cached_tokens || 0 },
                output: { total: usageObj.completion_tokens || 0, reasoning: usageObj.completion_tokens_details?.reasoning_tokens || 0 },
                total: usageObj.total_tokens || 0
            },
            costs: {
                input: { total: 0, cached: 0 },
                output: { total: 0, reasoning: 0 },
                total: 0
            }
        };
    }
}
