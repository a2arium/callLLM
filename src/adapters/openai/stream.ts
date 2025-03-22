import { UniversalChatParams, UniversalStreamResponse, FinishReason } from '../../interfaces/UniversalInterfaces';
import { OpenAIStreamResponse } from './types';
import { Converter } from './converter';
import { ChatCompletionChunk } from 'openai/resources/chat';
import { Stream } from 'openai/streaming';
import { logger } from '../../utils/logger';

type ToolCall = {
    id?: string;
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
    constructor(private converter: Converter) {
        logger.setConfig({
            level: process.env.LOG_LEVEL as any || 'debug',
            prefix: 'OpenAIStreamHandler'
        });
    }

    async *handleStream(
        stream: Stream<ChatCompletionChunk>,
        params: UniversalChatParams
    ): AsyncIterable<UniversalStreamResponse> {
        let accumulatedCalls: ToolCall[] = [];
        let seenToolCallIds = new Set<string>();
        let hasNewToolCall = false;

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (!delta) continue;

            hasNewToolCall = false;

            // Handle function calls and tool calls
            if (delta.function_call || (delta as any).tool_calls) {
                logger.debug('Processing tool call delta:', delta);
                const toolCalls = this.processToolCallDelta(delta);
                if (toolCalls) {
                    logger.debug('Processed tool calls:', toolCalls);
                    // Check if any of the tool calls are new
                    const newToolCalls = toolCalls.filter(call => {
                        if (!call.id) {
                            logger.debug('Tool call without ID:', call);
                            return true; // Consider calls without IDs as new
                        }
                        const isNew = !seenToolCallIds.has(call.id);
                        if (isNew) {
                            logger.debug('New tool call detected:', call);
                            seenToolCallIds.add(call.id);
                        }
                        return isNew;
                    });

                    logger.debug('New tool calls:', newToolCalls);
                    // Add new calls to accumulated calls
                    accumulatedCalls = [...accumulatedCalls, ...toolCalls];

                    // Set hasNewToolCall if we have new tool calls
                    if (newToolCalls.length > 0) {
                        hasNewToolCall = true;
                        logger.debug('Yielding new tool call chunk');
                        yield {
                            content: '',
                            role: 'assistant',
                            isComplete: false,
                            isNewToolCall: true,
                            toolCalls: accumulatedCalls
                        };
                        continue;
                    }
                }
            }

            // Handle regular content
            yield {
                content: delta.content || '',
                role: delta.role || 'assistant',
                isComplete: chunk.choices[0]?.finish_reason !== null,
                toolCalls: accumulatedCalls,
                isNewToolCall: hasNewToolCall,
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
                    id: call.id,
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