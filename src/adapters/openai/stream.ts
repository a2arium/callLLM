import { UniversalChatParams, UniversalStreamResponse, FinishReason } from '../../interfaces/UniversalInterfaces';
import { OpenAIStreamResponse } from './types';
import { Converter } from './converter';
import { ChatCompletionChunk } from 'openai/resources/chat';
import { Stream } from 'openai/streaming';

type ToolCall = {
    name: string;
    arguments: Record<string, unknown>;
};

type ValidToolCallFunction = {
    name: string;
    arguments: string;
};

type ValidToolCallDelta = {
    function: ValidToolCallFunction;
    index: number;
    id?: string;
};

export class StreamHandler {
    constructor(private converter: Converter) { }

    async *handleStream(
        stream: Stream<ChatCompletionChunk>,
        params: UniversalChatParams
    ): AsyncIterable<UniversalStreamResponse> {
        let accumulatedCalls: ToolCall[] = [];

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (!delta) continue;

            // Handle function calls and tool calls
            if (delta.function_call || (delta as any).tool_calls) {
                const toolCalls = this.processToolCallDelta(delta);
                if (toolCalls) {
                    accumulatedCalls = [...accumulatedCalls, ...toolCalls];
                    yield {
                        content: '',
                        role: 'assistant',
                        isComplete: false,
                        toolCalls: accumulatedCalls
                    };
                }
                continue;
            }

            // Handle regular content
            yield {
                content: delta.content || '',
                role: delta.role || 'assistant',
                isComplete: chunk.choices[0]?.finish_reason !== null,
                ...(accumulatedCalls.length > 0 && { toolCalls: accumulatedCalls }),
                metadata: {
                    finishReason: this.mapFinishReason(chunk.choices[0]?.finish_reason)
                }
            };
        }
    }

    private isValidToolCallFunction(func: unknown): func is ValidToolCallFunction {
        return !!func &&
            typeof func === 'object' &&
            'name' in func &&
            'arguments' in func &&
            typeof (func as any).name === 'string' &&
            typeof (func as any).arguments === 'string';
    }

    private isValidToolCallDelta(call: unknown): call is ValidToolCallDelta {
        return !!call &&
            typeof call === 'object' &&
            'function' in call &&
            'index' in call &&
            typeof (call as any).index === 'number' &&
            this.isValidToolCallFunction((call as any).function);
    }

    private processToolCallDelta(delta: ChatCompletionChunk['choices'][number]['delta']): ToolCall[] | undefined {
        if (delta.tool_calls?.length) {
            const validCalls = delta.tool_calls
                .filter(this.isValidToolCallDelta)
                .map(call => ({
                    name: call.function.name,
                    arguments: JSON.parse(call.function.arguments) as Record<string, unknown>
                }));
            return validCalls.length > 0 ? validCalls : undefined;
        }

        if (delta.function_call && this.isValidToolCallFunction(delta.function_call)) {
            return [{
                name: delta.function_call.name,
                arguments: JSON.parse(delta.function_call.arguments) as Record<string, unknown>
            }];
        }

        return undefined;
    }

    private mapFinishReason(reason: string | null): FinishReason {
        if (!reason) return FinishReason.NULL;
        switch (reason) {
            case 'stop': return FinishReason.STOP;
            case 'length': return FinishReason.LENGTH;
            case 'content_filter': return FinishReason.CONTENT_FILTER;
            case 'tool_calls': return FinishReason.TOOL_CALLS;
            case 'function_call': return FinishReason.TOOL_CALLS;
            default: return FinishReason.NULL;
        }
    }
}