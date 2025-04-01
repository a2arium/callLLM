import { UniversalStreamResponse, FinishReason } from '../../interfaces/UniversalInterfaces';
import type { ToolCall } from '../../types/tooling';
import type { StreamChunk, ToolCallChunk } from '../../core/streaming/types';
import { ChatCompletionChunk, ChatCompletionMessage, ChatCompletionMessageToolCall } from 'openai/resources/chat';
import { Stream } from 'openai/streaming';
import { logger } from '../../utils/logger';

type ValidToolCallFunction = {
    name: string;
    arguments: string;
};

// OpenAI streaming specific type for tool calls
// Note: We cannot rely on TypeScript definitions as the streaming format has
// properties not reflected in the types
type OpenAIToolCallChunk = {
    id?: string;
    function?: {
        name?: string;
        arguments?: string;
    };
    // Any other properties from the actual response
    [key: string]: any;
};

type OpenAIDelta = Partial<ChatCompletionMessage> & {
    tool_calls?: Array<any>; // Use any since the OpenAI type definition doesn't match streaming reality
    function_call?: ValidToolCallFunction;
};

/**
 * Handles conversion from OpenAI stream format to universal format.
 * 
 * This class is  stateless and focused only on format
 * conversion without any business logic like accumulation or tracking.
 */
export class StreamHandler {

    /**
     * Converts an OpenAI stream to universal StreamChunk format
     * @param stream The OpenAI stream to convert
     * @returns An async iterable of StreamChunk objects
     */
    convertProviderStream(stream: Stream<ChatCompletionChunk>): AsyncIterable<UniversalStreamResponse> {
        const log = logger.createLogger({ prefix: 'OpenAI.StreamHandler.convertProviderStream' });
        return (async function* () {
            for await (const chunk of stream) {
                log.debug('Received chunk from provider:', JSON.stringify(chunk, null, 2));

                const delta = chunk.choices[0]?.delta;
                if (!delta) continue;

                // Extract tool call information without parsing
                const toolCallChunks = extractToolCallChunks(delta as OpenAIDelta);

                if (toolCallChunks) {
                    log.debug('Yielding in universal format:', JSON.stringify(
                        {
                            content: delta.content || '',
                            toolCallChunks,
                            isComplete: chunk.choices[0]?.finish_reason !== null,
                            metadata: {
                                finishReason: mapFinishReason(chunk.choices[0]?.finish_reason),
                                provider: 'openai'
                            }
                        }
                        , null, 2)
                    );
                }

                // Create universal format chunk
                yield {
                    content: delta.content || '',
                    role: 'assistant',
                    toolCallChunks,
                    isComplete: chunk.choices[0]?.finish_reason !== null,
                    metadata: {
                        finishReason: mapFinishReason(chunk.choices[0]?.finish_reason),
                        provider: 'openai'
                    }
                };
            }
        })();
    }
}

/**
 * Extract tool call chunks from OpenAI delta without parsing
 */
function extractToolCallChunks(delta: OpenAIDelta): ToolCallChunk[] | undefined {
    // const log = logger.createLogger({ prefix: 'OpenAI.StreamHandler.extractToolCallChunks' });
    // log.debug('Extracting tool call chunks from delta:', delta);
    if (!delta.tool_calls?.length) return undefined;

    return delta.tool_calls.map(call => {
        // Cast to any to access runtime properties not in type definition
        const toolCall = call as any;

        return {
            id: toolCall.id,
            index: toolCall.index,
            name: toolCall.function?.name,
            argumentsChunk: toolCall.function?.arguments
        };
    });
}

/**
 * Map OpenAI finish reasons to universal finish reasons
 */
function mapFinishReason(reason: string | null): FinishReason {
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