import type { UniversalStreamResponse } from '../../interfaces/UniversalInterfaces.ts';
import { FinishReason } from '../../interfaces/UniversalInterfaces.ts';
import { TokenCalculator } from '../../core/models/TokenCalculator.ts';
import { logger } from '../../utils/logger.ts';
import type { ToolCall } from '../../types/tooling.ts';
import type { ToolCallChunk } from '../../core/streaming/types.ts';
import type { OpenRouterConverter } from './converter.ts';

/**
 * Stream handler for OpenRouter SDK's ModelResult.
 * Consumes getItemsStream() from the SDK and yields UniversalStreamResponse chunks.
 */
export class OpenRouterStreamHandler {
    private log = logger.createLogger({ prefix: 'OpenRouterStreamHandler' });
    private tokenCalculator?: TokenCalculator;
    private converter: OpenRouterConverter;

    constructor(converter: OpenRouterConverter, tokenCalculator?: TokenCalculator) {
        this.converter = converter;
        this.tokenCalculator = tokenCalculator;
    }

    /**
     * Wraps the SDK's ModelResult into an async generator of UniversalStreamResponse.
     * We use getTextStream() for text content and then getResponse() for the final response.
     */
    async *handleStream(modelResult: any): AsyncGenerator<UniversalStreamResponse> {
        let accumulatedContent = '';
        let accumulatedReasoning = '';
        let isFirstContentChunk = true;
        let isFirstReasoningChunk = true;

        try {
            // Stream text deltas
            const textStream = modelResult.getTextStream();
            for await (const delta of textStream) {
                if (delta) {
                    accumulatedContent += delta;

                    const response: UniversalStreamResponse = {
                        content: delta,
                        role: 'assistant',
                        isComplete: false,
                        isFirstContentChunk: isFirstContentChunk ? true : undefined,
                    };

                    if (isFirstContentChunk) {
                        isFirstContentChunk = false;
                    }

                    yield response;
                }
            }

            // After streaming completes, get the full response for metadata and tool calls
            const fullResponse = await modelResult.getResponse();

            // Extract tool calls from the full response
            const toolCalls: ToolCall[] = [];
            if (fullResponse.output && Array.isArray(fullResponse.output)) {
                for (const item of fullResponse.output) {
                    if (item.type === 'function_call') {
                        let args = item.arguments;
                        if (typeof args === 'string') {
                            try { args = JSON.parse(args); } catch { args = {}; }
                        }
                        toolCalls.push({
                            id: item.callId || item.call_id || item.id,
                            name: item.name,
                            arguments: args,
                        });
                    } else if (item.type === 'reasoning') {
                        accumulatedReasoning += item.summary?.[0]?.text || '';
                    }
                }
            }

            // Emit final chunk with completion metadata
            const usage = this.converter.mapUsage(fullResponse.usage);
            const finalChunk: UniversalStreamResponse = {
                content: '',
                contentText: accumulatedContent,
                reasoningText: accumulatedReasoning || undefined,
                role: 'assistant',
                isComplete: true,
                toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                metadata: {
                    finishReason: toolCalls.length > 0 ? FinishReason.TOOL_CALLS : FinishReason.STOP,
                    model: fullResponse.model,
                    usage,
                },
            };

            yield finalChunk;
        } catch (error) {
            this.log.error('Stream error:', error);
            throw error;
        }
    }

    minimalConvert(ev: unknown): UniversalStreamResponse {
        return { content: '', role: 'assistant', isComplete: false };
    }
}
