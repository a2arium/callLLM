import { ChatCompletionCreateParams, ChatCompletionMessage, ChatCompletion, ChatCompletionMessageParam } from 'openai/resources/chat';

/**
 * All possible message roles supported across different models
 */
export type OpenAIRole = ChatCompletionMessageParam['role'] | 'developer';

/**
 * Extended version of OpenAI's ChatCompletionMessage to support all role variants
 */
export type OpenAIChatMessage = ChatCompletionMessageParam;

export type OpenAIModelParams = Omit<ChatCompletionCreateParams, 'messages'> & {
    messages: ChatCompletionMessageParam[];
};

export type OpenAIUsage = {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details?: {
        cached_tokens?: number;
    };
    completion_tokens_details?: {
        reasoning_tokens?: number;
        accepted_prediction_tokens?: number;
        rejected_prediction_tokens?: number;
    };
};

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