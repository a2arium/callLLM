import type { ChatCompletionCreateParams, ChatCompletion, ChatCompletionChunk } from 'openai/resources/chat/completions';

export interface VeniceParameters {
    character_slug?: string;
    strip_thinking_response?: boolean;
    disable_thinking?: boolean;
    enable_web_search?: 'auto' | 'off' | 'on';
    enable_web_scraping?: boolean;
    enable_web_citations?: boolean;
    include_search_results_in_stream?: boolean;
    return_search_results_as_documents?: boolean;
    include_venice_system_prompt?: boolean;
}

export type VeniceCreateParams = ChatCompletionCreateParams & {
    venice_parameters?: VeniceParameters;
};

export interface VeniceChatCompletionResponse extends ChatCompletion {
    choices: Array<ChatCompletion['choices'][0] & {
        message: ChatCompletion['choices'][0]['message'] & {
            reasoning_content?: string;
        }
    }>;
}

export interface VeniceStreamChunk extends ChatCompletionChunk {
    choices: Array<ChatCompletionChunk['choices'][0] & {
        delta: ChatCompletionChunk['choices'][0]['delta'] & {
            reasoning_content?: string;
        }
    }>;
}
