import { ChatCompletionCreateParams, ChatCompletionMessage, ChatCompletion } from 'openai/resources/chat';

export type OpenAIModelParams = Omit<ChatCompletionCreateParams, 'messages'> & {
    messages: ChatCompletionMessage[];
};

export type OpenAIUsage = {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
};

export type OpenAIChatMessage = ChatCompletionMessage;

export type OpenAIResponse = ChatCompletion & {
    usage: OpenAIUsage;
};

export type OpenAIStreamResponse = {
    choices: Array<{
        delta: Partial<ChatCompletionMessage>;
        finish_reason: string | null;
    }>;
};

export type ResponseFormatText = {
    type: 'text';
};

export type ResponseFormatJSONObject = {
    type: 'json_object';
};

export type ResponseFormatJSONSchema = {
    type: 'json_schema';
    json_schema: {
        strict: boolean;
        schema: object;
    };
};

export type ResponseFormat = ResponseFormatText | ResponseFormatJSONObject | ResponseFormatJSONSchema; 