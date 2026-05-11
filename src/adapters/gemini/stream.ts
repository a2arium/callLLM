import type { UniversalStreamResponse, Usage } from '../../interfaces/UniversalInterfaces.ts';
import { FinishReason } from '../../interfaces/UniversalInterfaces.ts';
import type { ToolCallChunk } from '../../core/streaming/types.ts';
import { TokenCalculator } from '../../core/models/TokenCalculator.ts';
import { logger } from '../../utils/logger.ts';
import type { GeminiStreamChunk } from './types.ts';

export class GeminiStreamHandler {
    private log = logger.createLogger({ prefix: 'GeminiStreamHandler' });
    private tokenCalculator?: TokenCalculator;
    private toolCallIndex = 0;

    constructor(tokenCalculator?: TokenCalculator) {
        this.tokenCalculator = tokenCalculator;
    }

    async *handleStream(stream: AsyncGenerator<GeminiStreamChunk>): AsyncGenerator<UniversalStreamResponse> {
        let accumulatedContent = '';
        let accumulatedReasoning = '';
        let isFirstContentChunk = true;
        let isFirstReasoningChunk = true;
        let reportedInputTokens = 0;
        let reportedOutputTokens = 0;
        let reportedReasoningTokens = 0;
        let hasSeenToolCalls = false;

        for await (const chunk of stream) {
            this.log.debug('Raw Gemini stream chunk received');

            const candidates = chunk.candidates ?? [];
            const firstCandidate = candidates[0];
            const parts = firstCandidate?.content?.parts ?? [];

            let deltaContent = '';
            let deltaReasoning = '';
            const toolCallChunks: ToolCallChunk[] = [];
            let hasContent = false;
            let hasReasoning = false;

            for (const part of parts) {
                if (part.thought && part.text) {
                    deltaReasoning += part.text;
                    hasReasoning = true;
                    continue;
                }

                if (part.text !== undefined && part.text !== null) {
                    deltaContent += part.text;
                    hasContent = true;
                }

                if (part.functionCall) {
                    const fc = part.functionCall;
                    const argsJson = fc.args ? JSON.stringify(fc.args) : '{}';
                    const toolCallId = `call_${Date.now()}_${this.toolCallIndex}`;
                    const idx = this.toolCallIndex++;

                    // Emit as a toolCallChunk with complete name and arguments
                    toolCallChunks.push({
                        id: toolCallId,
                        index: idx,
                        name: fc.name ?? '',
                        argumentsChunk: argsJson,
                    });
                }
            }

            if (deltaContent) {
                accumulatedContent += deltaContent;
            }
            if (deltaReasoning) {
                accumulatedReasoning += deltaReasoning;
            }

            // Yield text delta
            if (deltaContent) {
                const outputChunk: UniversalStreamResponse = {
                    content: deltaContent,
                    role: 'assistant',
                    isComplete: false,
                    isFirstContentChunk: isFirstContentChunk ? true : undefined,
                };

                const deltaTokenCount = this.tokenCalculator
                    ? this.tokenCalculator.calculateTokens(deltaContent)
                    : Math.ceil(deltaContent.length / 4);

                if (deltaTokenCount > 0) {
                    outputChunk.metadata = {
                        usage: {
                            tokens: {
                                input: { total: reportedInputTokens, cached: 0 },
                                output: { total: deltaTokenCount, reasoning: reportedReasoningTokens },
                                total: reportedInputTokens + deltaTokenCount + reportedReasoningTokens,
                            },
                            costs: {
                                input: { total: 0, cached: 0 },
                                output: { total: 0, reasoning: 0 },
                                total: 0,
                                unit: 'USD',
                            },
                            incremental: deltaTokenCount,
                        } as unknown as Usage,
                    };
                    reportedOutputTokens += deltaTokenCount;
                }

                isFirstContentChunk = false;
                yield outputChunk;
            }

            // Yield reasoning delta
            if (deltaReasoning) {
                const reasoningChunk: UniversalStreamResponse = {
                    content: '',
                    reasoning: deltaReasoning,
                    role: 'assistant',
                    isComplete: false,
                    isFirstReasoningChunk: isFirstReasoningChunk ? true : undefined,
                };
                isFirstReasoningChunk = false;
                yield reasoningChunk;
            }

            // Yield tool call chunks for framework's ContentAccumulator
            if (toolCallChunks.length > 0) {
                hasSeenToolCalls = true;
                const toolChunk: UniversalStreamResponse = {
                    content: '',
                    role: 'assistant',
                    isComplete: false,
                    toolCallChunks,
                };
                yield toolChunk;
            }

            // Check for completion
            const usageMeta = chunk.usageMetadata as Record<string, number> | undefined;
            const finishReason = firstCandidate?.finishReason;

            if (usageMeta && (usageMeta.totalTokenCount || finishReason)) {
                const inputTokens = usageMeta.promptTokenCount ?? reportedInputTokens;
                const outputTokens = usageMeta.candidatesTokenCount ?? reportedOutputTokens;
                const thinkingTokens = usageMeta.thoughtsTokenCount ?? 0;
                const cachedTokens = usageMeta.cachedContentTokenCount ?? 0;
                const totalTokens = usageMeta.totalTokenCount ?? inputTokens + outputTokens + thinkingTokens;

                reportedInputTokens = inputTokens;
                reportedOutputTokens = outputTokens;
                reportedReasoningTokens = thinkingTokens;

                const mappedFinishReason = hasSeenToolCalls
                    ? FinishReason.TOOL_CALLS
                    : this.mapFinishReason(finishReason);

                const finalChunk: UniversalStreamResponse = {
                    content: '',
                    contentText: accumulatedContent,
                    reasoningText: accumulatedReasoning || undefined,
                    role: 'assistant',
                    isComplete: true,
                    metadata: {
                        finishReason: mappedFinishReason,
                        usage: {
                            tokens: {
                                input: { total: inputTokens, cached: cachedTokens },
                                output: { total: outputTokens, reasoning: thinkingTokens },
                                total: totalTokens,
                            },
                            costs: {
                                input: { total: 0, cached: 0 },
                                output: { total: 0, reasoning: 0 },
                                total: 0,
                                unit: 'USD',
                            },
                        },
                    },
                };
                yield finalChunk;
            }
        }
    }

    minimalConvert(_ev: unknown): UniversalStreamResponse {
        return { content: '', role: 'assistant', isComplete: false };
    }

    private mapFinishReason(reason: string | undefined): FinishReason {
        if (!reason) return FinishReason.STOP;
        switch (reason) {
            case 'STOP': return FinishReason.STOP;
            case 'MAX_TOKENS': return FinishReason.LENGTH;
            case 'SAFETY': return FinishReason.CONTENT_FILTER;
            case 'RECITATION': return FinishReason.CONTENT_FILTER;
            default: return FinishReason.NULL;
        }
    }
}
