import type { UniversalStreamResponse, Usage } from '../../interfaces/UniversalInterfaces.ts';
import { FinishReason } from '../../interfaces/UniversalInterfaces.ts';
import type { ToolCall } from '../../types/tooling.ts';
import type { ToolCallChunk } from '../../core/streaming/types.ts';
import { TokenCalculator } from '../../core/models/TokenCalculator.ts';
import { logger } from '../../utils/logger.ts';
import { SiliconFlowConverter } from './converter.ts';
import {
    createSiliconFlowReasoningState,
    type SiliconFlowChatCompletionChunk
} from './types.ts';

type PendingToolCall = {
    id?: string;
    name: string;
    argumentsText: string;
};

export class SiliconFlowStreamHandler {
    private readonly log = logger.createLogger({ prefix: 'SiliconFlowStreamHandler' });

    constructor(
        private readonly converter: SiliconFlowConverter,
        private readonly tokenCalculator: TokenCalculator,
        private readonly model: string
    ) {}

    async *handleStream(stream: AsyncIterable<unknown>): AsyncGenerator<UniversalStreamResponse> {
        let accumulatedContent = '';
        let accumulatedReasoning = '';
        let isFirstContentChunk = true;
        let isFirstReasoningChunk = true;
        let finishReason: FinishReason | undefined;
        let finalUsage: Usage | undefined;
        const pendingToolCalls = new Map<number, PendingToolCall>();

        for await (const value of stream) {
            this.log.debug('Raw SiliconFlow stream chunk:', value);
            const chunk = value as SiliconFlowChatCompletionChunk;
            if (chunk.usage) {
                finalUsage = this.converter.mapUsage(chunk.usage, chunk.model || this.model);
            }

            const choice = chunk.choices?.[0];
            if (!choice) continue;

            const content = choice.delta?.content || '';
            const reasoning = choice.delta?.reasoning_content || '';
            const toolCallChunks = this.mapToolCallDeltas(choice.delta?.tool_calls, pendingToolCalls);

            if (content || reasoning || toolCallChunks.length > 0) {
                const incrementalUsage = this.createIncrementalUsage(content, reasoning);
                accumulatedContent += content;
                accumulatedReasoning += reasoning;

                yield {
                    content,
                    reasoning: reasoning || undefined,
                    role: 'assistant',
                    isComplete: false,
                    isFirstContentChunk: content && isFirstContentChunk ? true : undefined,
                    isFirstReasoningChunk: reasoning && isFirstReasoningChunk ? true : undefined,
                    toolCallChunks: toolCallChunks.length ? toolCallChunks : undefined,
                    metadata: incrementalUsage ? { usage: incrementalUsage } : undefined
                };

                if (content) isFirstContentChunk = false;
                if (reasoning) isFirstReasoningChunk = false;
            }

            if (choice.finish_reason) {
                finishReason = this.converter.mapFinishReason(choice.finish_reason);
            }
        }

        const toolCalls = this.completeToolCalls(pendingToolCalls);
        const resolvedFinishReason = toolCalls.length
            ? FinishReason.TOOL_CALLS
            : finishReason ?? FinishReason.STOP;

        yield {
            content: '',
            contentText: accumulatedContent,
            reasoningText: accumulatedReasoning,
            role: 'assistant',
            isComplete: true,
            toolCalls: toolCalls.length ? toolCalls : undefined,
            metadata: {
                finishReason: resolvedFinishReason,
                provider: 'siliconflow',
                model: this.model,
                usage: finalUsage,
                providerState: accumulatedReasoning
                    ? createSiliconFlowReasoningState(accumulatedReasoning)
                    : undefined
            }
        };
    }

    minimalConvert(value: unknown): UniversalStreamResponse {
        const chunk = value as SiliconFlowChatCompletionChunk;
        const choice = chunk.choices?.[0];
        if (!choice) {
            return {
                content: '',
                role: 'assistant',
                isComplete: false,
                metadata: {
                    usage: this.converter.mapUsage(chunk.usage, chunk.model || this.model)
                }
            };
        }

        const finishReason = choice.finish_reason
            ? this.converter.mapFinishReason(choice.finish_reason)
            : FinishReason.NULL;
        return {
            content: choice.delta?.content || '',
            reasoning: choice.delta?.reasoning_content || undefined,
            role: 'assistant',
            isComplete: choice.finish_reason !== null && choice.finish_reason !== undefined,
            metadata: { finishReason }
        };
    }

    private mapToolCallDeltas(
        deltas: SiliconFlowChatCompletionChunk['choices'][number]['delta']['tool_calls'],
        pending: Map<number, PendingToolCall>
    ): ToolCallChunk[] {
        if (!deltas?.length) return [];

        return deltas.map(delta => {
            const existing = pending.get(delta.index) ?? {
                id: delta.id,
                name: '',
                argumentsText: ''
            };
            if (delta.id) existing.id = delta.id;
            if (delta.function?.name) existing.name = delta.function.name;
            if (delta.function?.arguments) existing.argumentsText += delta.function.arguments;
            pending.set(delta.index, existing);

            return {
                id: delta.id,
                index: delta.index,
                name: delta.function?.name,
                argumentsChunk: delta.function?.arguments
            };
        });
    }

    private completeToolCalls(pending: Map<number, PendingToolCall>): ToolCall[] {
        return [...pending.entries()]
            .sort(([left], [right]) => left - right)
            .map(([, toolCall]) => ({
                id: toolCall.id,
                name: toolCall.name || 'unknown',
                arguments: this.parseArguments(toolCall.argumentsText)
            }));
    }

    private parseArguments(value: string): Record<string, unknown> {
        if (!value) return {};
        try {
            const parsed: unknown = JSON.parse(value);
            return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
                ? parsed as Record<string, unknown>
                : { value: parsed };
        } catch {
            return { rawArguments: value };
        }
    }

    private createIncrementalUsage(content: string, reasoning: string): Usage | undefined {
        const contentTokens = content ? this.tokenCalculator.calculateTokens(content) : 0;
        const reasoningTokens = reasoning ? this.tokenCalculator.calculateTokens(reasoning) : 0;
        const outputTokens = contentTokens + reasoningTokens;
        if (outputTokens === 0) return undefined;

        const usage = this.converter.mapUsage({
            prompt_tokens: 0,
            completion_tokens: outputTokens,
            total_tokens: outputTokens,
            completion_tokens_details: { reasoning_tokens: reasoningTokens }
        }, this.model);
        if (!usage) return undefined;

        (usage as unknown as Record<string, unknown>).incremental = outputTokens;
        return usage;
    }
}
