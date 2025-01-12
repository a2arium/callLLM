import { UniversalStreamResponse, FinishReason, UniversalChatParams } from '../../interfaces/UniversalInterfaces';
import { OpenAIStreamResponse } from './types';

export class StreamHandler {
    async *handleStream(stream: AsyncIterable<OpenAIStreamResponse>, params?: UniversalChatParams): AsyncGenerator<UniversalStreamResponse> {
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';

            yield {
                content,
                role: chunk.choices[0]?.delta?.role || 'assistant',
                isComplete: chunk.choices[0]?.finish_reason !== null,
                metadata: {
                    finishReason: this.mapFinishReason(chunk.choices[0]?.finish_reason),
                    responseFormat: params?.settings?.responseFormat || 'text',
                },
            };
        }
    }

    private mapFinishReason(reason: string | null): FinishReason {
        if (!reason) return FinishReason.NULL;
        switch (reason) {
            case 'stop': return FinishReason.STOP;
            case 'length': return FinishReason.LENGTH;
            case 'content_filter': return FinishReason.CONTENT_FILTER;
            case 'tool_calls': return FinishReason.TOOL_CALLS;
            default: return FinishReason.NULL;
        }
    }
} 