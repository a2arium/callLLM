import type { ChatCompletion, ChatCompletionChunk } from 'openai/resources/chat/completions';

export type VercelRole = 'system' | 'user' | 'assistant' | 'tool';

export type VercelToolCall = {
    id?: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
};

export type VercelTextContentPart = {
    type: 'text';
    text: string;
};

export type VercelImageUrlContentPart = {
    type: 'image_url';
    image_url: {
        url: string;
        detail?: 'auto' | 'low' | 'high';
    };
};

export type VercelContentPart = VercelTextContentPart | VercelImageUrlContentPart;

export type VercelMessage = {
    role: VercelRole;
    content: string | null | VercelContentPart[];
    name?: string;
    tool_call_id?: string;
    tool_calls?: VercelToolCall[];
    reasoning_content?: string;
};

export type VercelRerankRequest = {
    model: string;
    query: string;
    documents: readonly string[];
    top_n?: number;
};

export type VercelRerankResponse = {
    id?: string;
    results: Array<{
        index: number;
        relevance_score: number;
    }>;
    meta?: {
        tokens?: {
            input_tokens?: number;
            output_tokens?: number;
        };
        billed_units?: {
            search_units?: number;
            [key: string]: number | undefined;
        };
    };
};

export type VercelEvaluateRequest = {
    model: string;
    state: string | Record<string, unknown> | readonly unknown[];
    questions: Record<string, unknown>;
    providerOptions?: {
        gateway?: VercelGatewayProviderOptions;
        [key: string]: unknown;
    };
};

export type VercelEvaluateResponse = {
    model?: string;
    answers?: Record<string, unknown>;
    usage?: {
        inputTokens?: number;
        outputTokens?: number;
        input_tokens?: number;
        output_tokens?: number;
    };
    providerMetadata?: Record<string, unknown>;
    provider_metadata?: Record<string, unknown>;
};

export type VercelTool = {
    type: 'function';
    function: {
        name: string;
        description?: string;
        parameters: Record<string, unknown>;
    };
};

export type VercelGatewayProviderOptions = {
    order?: string[];
    only?: string[];
    sort?: 'cost' | 'ttft' | 'tps';
    models?: string[];
    user?: string;
    tags?: string[];
    byok?: Record<string, Array<Record<string, unknown>>>;
    zeroDataRetention?: boolean;
    disallowPromptTraining?: boolean;
    quotaEntityId?: string;
    has?: Array<'implicit-caching' | 'vision'>;
    providerTimeouts?: Record<string, unknown>;
    serviceTier?: 'flex' | 'priority';
    [key: string]: unknown;
};

export type VercelJsonSchemaResponseFormat = {
    type: 'json_schema';
    json_schema: {
        name: string;
        schema: Record<string, unknown>;
        strict?: boolean;
    };
};

export type VercelJsonObjectResponseFormat = {
    type: 'json_object';
};

export type VercelResponseFormat = VercelJsonSchemaResponseFormat | VercelJsonObjectResponseFormat;

export type VercelCreateParams = {
    model: string;
    messages: VercelMessage[];
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
    tools?: VercelTool[];
    response_format?: VercelResponseFormat;
    stream_options?: { include_usage: boolean };
    reasoning_effort?: string;
    providerOptions?: {
        gateway?: VercelGatewayProviderOptions;
        [key: string]: unknown;
    };
    [key: string]: unknown;
};

export type VercelChatCompletion = ChatCompletion & {
    choices: Array<ChatCompletion['choices'][number] & {
        message: Omit<ChatCompletion['choices'][number]['message'], 'tool_calls'> & {
            reasoning_content?: string;
            tool_calls?: VercelToolCall[];
        };
    }>;
};

export type VercelChatCompletionChunk = ChatCompletionChunk & {
    choices: Array<ChatCompletionChunk['choices'][number] & {
        delta: ChatCompletionChunk['choices'][number]['delta'] & {
            reasoning_content?: string;
        };
    }>;
};

export type VercelReasoningState = {
    vercel: {
        reasoningContent: string;
    };
};

export const getVercelReasoningContent = (
    providerState: unknown
): string | undefined => {
    if (!providerState || typeof providerState !== 'object') return undefined;
    const vercel = (providerState as Record<string, unknown>).vercel;
    if (!vercel || typeof vercel !== 'object') return undefined;
    const reasoningContent = (vercel as Record<string, unknown>).reasoningContent;
    return typeof reasoningContent === 'string' ? reasoningContent : undefined;
};

export const createVercelReasoningState = (
    reasoningContent: string
): VercelReasoningState => ({
    vercel: { reasoningContent }
});
