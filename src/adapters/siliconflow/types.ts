import type { ChatCompletion, ChatCompletionChunk } from 'openai/resources/chat/completions';

export type SiliconFlowRole = 'system' | 'user' | 'assistant' | 'tool';

export type SiliconFlowToolCall = {
    id?: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
};

export type SiliconFlowMessage = {
    role: SiliconFlowRole;
    content: string | null;
    name?: string;
    tool_call_id?: string;
    tool_calls?: SiliconFlowToolCall[];
    reasoning_content?: string;
};

export type SiliconFlowTool = {
    type: 'function';
    function: {
        name: string;
        description?: string;
        parameters: Record<string, unknown>;
    };
};

export type SiliconFlowProviderOptions = {
    enable_thinking?: boolean;
    thinking_budget?: number;
    top_k?: number;
    min_p?: number;
    [key: string]: unknown;
};

export type SiliconFlowCreateParams = {
    model: string;
    messages: SiliconFlowMessage[];
    stream: boolean;
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stop?: string | string[];
    n?: number;
    user?: string;
    logit_bias?: Record<string, number>;
    tool_choice?: 'none' | 'auto' | { type: 'function'; function: { name: string } };
    tools?: SiliconFlowTool[];
    response_format?: { type: 'json_object' };
    stream_options?: { include_usage: boolean };
    enable_thinking?: boolean;
    thinking_budget?: number;
    top_k?: number;
    min_p?: number;
    [key: string]: unknown;
};

export type SiliconFlowChatCompletion = ChatCompletion & {
    choices: Array<ChatCompletion['choices'][number] & {
        message: Omit<ChatCompletion['choices'][number]['message'], 'tool_calls'> & {
            reasoning_content?: string;
            tool_calls?: SiliconFlowToolCall[];
        };
    }>;
};

export type SiliconFlowChatCompletionChunk = ChatCompletionChunk & {
    choices: Array<ChatCompletionChunk['choices'][number] & {
        delta: ChatCompletionChunk['choices'][number]['delta'] & {
            reasoning_content?: string;
        };
    }>;
};

export type SiliconFlowReasoningState = {
    siliconflow: {
        reasoningContent: string;
    };
};

export type SiliconFlowRerankRequest = {
    model: string;
    query: string;
    documents: readonly string[];
    top_n?: number;
    return_documents: false;
    max_chunks_per_doc?: number;
    overlap_tokens?: number;
    [key: string]: unknown;
};

export type SiliconFlowRerankResponse = {
    id: string;
    results: Array<{
        index: number;
        relevance_score: number;
        document?: { text?: string };
    }>;
    tokens?: {
        input_tokens: number;
        output_tokens: number;
    };
    meta?: {
        tokens?: {
            input_tokens?: number;
            output_tokens?: number;
            image_tokens?: number;
        };
        billed_units?: {
            input_tokens?: number;
            output_tokens?: number;
            image_tokens?: number;
            search_units?: number;
            classifications?: number;
            [key: string]: number | undefined;
        };
    };
};

export const getSiliconFlowReasoningContent = (
    providerState: unknown
): string | undefined => {
    if (!providerState || typeof providerState !== 'object') return undefined;
    const siliconflow = (providerState as Record<string, unknown>).siliconflow;
    if (!siliconflow || typeof siliconflow !== 'object') return undefined;
    const reasoningContent = (siliconflow as Record<string, unknown>).reasoningContent;
    return typeof reasoningContent === 'string' ? reasoningContent : undefined;
};

export const createSiliconFlowReasoningState = (
    reasoningContent: string
): SiliconFlowReasoningState => ({
    siliconflow: { reasoningContent }
});
