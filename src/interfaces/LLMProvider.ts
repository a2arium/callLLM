import { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse } from './UniversalInterfaces';

export interface LLMProvider {
    // Basic chat methods
    chatCall(model: string, params: UniversalChatParams): Promise<UniversalChatResponse>;
    streamCall(model: string, params: UniversalChatParams): Promise<AsyncIterable<UniversalStreamResponse>>;

    // Conversion methods that each provider must implement
    convertToProviderParams(model: string, params: UniversalChatParams): unknown;
    convertFromProviderResponse(response: unknown): UniversalChatResponse;
    convertFromProviderStreamResponse(response: unknown): UniversalStreamResponse;
}
