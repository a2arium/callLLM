import { UniversalStreamResponse, UniversalChatParams } from '../../interfaces/UniversalInterfaces';
import { OpenAIStreamResponse } from './types';
import { Converter } from './converter';

export class StreamHandler {
    constructor(private converter: Converter) { }

    async *handleStream(stream: AsyncIterable<OpenAIStreamResponse>, params?: UniversalChatParams): AsyncGenerator<UniversalStreamResponse> {
        for await (const chunk of stream) {
            yield this.converter.convertStreamResponse(chunk, params);
        }
    }
}