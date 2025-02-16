import { UniversalStreamResponse, UniversalChatParams } from '../../interfaces/UniversalInterfaces';
import { OpenAIStreamResponse } from './types';
import { Converter } from './converter';

type AccumulatedToolCall = {
    id?: string;
    name?: string;
    arguments?: string;
};

export class StreamHandler {
    constructor(private converter: Converter) { }

    async *handleStream(stream: AsyncIterable<OpenAIStreamResponse>, params?: UniversalChatParams): AsyncGenerator<UniversalStreamResponse> {
        // Initialize tool call accumulator
        const toolCallAccumulator = new Map<string, AccumulatedToolCall>();

        for await (const chunk of stream) {
            const response = this.converter.convertStreamResponse(chunk, params);

            // If there are tool call deltas, accumulate them
            if (response.toolCallDeltas) {
                for (const delta of response.toolCallDeltas) {
                    const key = `call_${delta.index}`;
                    const existing = toolCallAccumulator.get(key) || {};
                    toolCallAccumulator.set(key, {
                        ...existing,
                        ...(delta.id && { id: delta.id }),
                        ...(delta.name && { name: delta.name }),
                        ...(delta.arguments && { arguments: typeof delta.arguments === 'string' ? delta.arguments : JSON.stringify(delta.arguments) })
                    });
                }

                // If this is the final chunk, convert accumulated tool calls to the final format
                if (response.isComplete) {
                    const accumulatedCalls = Array.from(toolCallAccumulator.values())
                        .filter(call => call.name && call.arguments) // Only include complete tool calls
                        .map(call => ({
                            name: call.name!,
                            arguments: JSON.parse(call.arguments!)
                        }));

                    if (accumulatedCalls.length > 0) {
                        response.toolCalls = accumulatedCalls;
                    }
                }
            }

            yield response;
        }
    }
}