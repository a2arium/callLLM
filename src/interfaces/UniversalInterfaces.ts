import { z } from 'zod';

// Finish reason enum based on OpenAI's finish reasons
export enum FinishReason {
    STOP = 'stop',           // API returned complete model output
    LENGTH = 'length',       // Incomplete model output due to max_tokens parameter or token limit
    CONTENT_FILTER = 'content_filter',  // Omitted content due to a flag from content filters
    TOOL_CALLS = 'tool_calls',    // Model made tool calls
    NULL = 'null'            // Stream not finished yet
}

export type UniversalMessage = {
    role: 'system' | 'user' | 'assistant' | 'tool' | 'function' | 'developer';
    content: string;
    name?: string;
    toolCallId?: string;  // ID linking a tool result to its original tool call
    toolCalls?: Array<{
        id: string;
        name: string;
        arguments: Record<string, unknown>;
    }>;
};

export type UniversalChatSettings = {
    /**
     * Controls randomness in the model's output.
     * Range: 0.0 to 2.0
     * - Lower values (e.g., 0.2) make the output more focused and deterministic
     * - Higher values (e.g., 0.8) make the output more random and creative
     * @default 1.0
     */
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    /**
     * Maximum number of retries when the provider call fails
     * @default 3
     */
    maxRetries?: number;
    /**
     * JSON schema for response validation and formatting
     * Can be either a JSON Schema string or a Zod schema
     */
    jsonSchema?: {
        name?: string;
        schema: JSONSchemaDefinition;
    };
    /**
     * Specify the response format
     * @default 'text'
     */
    responseFormat?: ResponseFormat;
    [key: string]: any;
};

export type UniversalChatParams = {
    messages: Array<UniversalMessage>;
    settings?: UniversalChatSettings;
    inputCachedTokens?: number;
    inputCachedPricePerMillion?: number;
};

// Universal interface for chat response
export type Usage = {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    inputCachedTokens?: number;  // Number of cached input tokens
    costs: {
        inputCost: number;
        inputCachedCost?: number;  // Cost for cached input tokens
        outputCost: number;
        totalCost: number;
    };
};

export interface UniversalChatResponse<T = unknown> {
    content: string;
    contentObject?: T;
    role: string;
    messages?: UniversalMessage[];  // Array of messages for tool call responses
    toolCalls?: Array<{
        name: string;
        arguments: Record<string, unknown>;
    }>;
    metadata?: {
        finishReason?: FinishReason;
        created?: number;
        usage?: Usage;
        refusal?: any;
        model?: string;
        responseFormat?: ResponseFormat;
        validationErrors?: Array<{ message: string; path: string }>;
    };
}

// Universal interface for streaming response
export interface UniversalStreamResponse<T = unknown> {
    content: string;
    contentObject?: T;
    role: string;
    isComplete: boolean;
    messages?: UniversalMessage[];  // Array of messages for tool call responses
    toolCallDeltas?: Array<{
        id?: string;
        index: number;
        name?: string;
        arguments?: string | Record<string, unknown>;
    }>;
    toolCalls?: Array<{
        name: string;
        arguments: Record<string, unknown>;
    }>;
    metadata?: {
        finishReason?: FinishReason;
        usage?: Usage;
        created?: number;
        model?: string;
        refusal?: any;
        responseFormat?: ResponseFormat;
        validationErrors?: Array<{ message: string; path: string }>;
        processInfo?: {
            currentChunk: number;
            totalChunks: number;
        };
    };
}

/**
 * Model capabilities configuration.
 * Specific capabilities have different defaults.
 */
export type ModelCapabilities = {
    /**
     * Whether the model supports streaming responses.
     * @default true
     */
    streaming?: boolean;

    /**
     * Whether the model supports tool/function calling.
     * When false, any tool/function call requests will be rejected.
     * @default false
     */
    toolCalls?: boolean;

    /**
     * Whether the model supports parallel tool/function calls.
     * When false, only sequential tool calls are allowed.
     * @default false
     */
    parallelToolCalls?: boolean;

    /**
     * Whether the model supports batch processing.
     * When false, batch processing requests will be rejected.
     * @default false
     */
    batchProcessing?: boolean;

    /**
     * Whether the model supports system messages.
     * When false, system messages will be converted to user messages.
     * @default true
     */
    systemMessages?: boolean;

    /**
     * Whether the model supports setting temperature.
     * @default true
     */
    temperature?: boolean;

    /**
     * Whether the model supports JSON mode output.
     * When true, the model can be instructed to return responses in JSON format.
     * @default false
     */
    jsonMode?: boolean;
};

export type ModelInfo = {
    name: string;
    inputPricePerMillion: number;
    inputCachedPricePerMillion?: number;
    outputPricePerMillion: number;
    maxRequestTokens: number;
    maxResponseTokens: number;
    tokenizationModel?: string;
    /**
     * Model capabilities configuration.
     * Defines what features the model supports.
     * All capabilities have their own default values.
     */
    capabilities?: ModelCapabilities;
    characteristics: {
        qualityIndex: number;        // 0-100, higher means better quality
        outputSpeed: number;         // tokens per second
        firstTokenLatency: number;   // time to first token in milliseconds
    };
};

// Model alias type
export type ModelAlias = 'fast' | 'premium' | 'balanced' | 'cheap';

export type JSONSchemaDefinition = string | z.ZodType;

export type ResponseFormat = 'json' | 'text'; 