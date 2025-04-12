import { z } from 'zod';
import type { ToolCallChunk } from '../core/streaming/types';
import type { ToolDefinition, ToolCall } from '../types/tooling';

// Finish reason enum based on OpenAI's finish reasons
export enum FinishReason {
    STOP = 'stop',           // API returned complete model output
    LENGTH = 'length',       // Incomplete model output due to max_tokens parameter or token limit
    CONTENT_FILTER = 'content_filter',  // Omitted content due to a flag from content filters
    TOOL_CALLS = 'tool_calls',    // Model made tool calls
    NULL = 'null',            // Stream not finished yet
    ERROR = 'error'
}

export type UniversalMessage = {
    role: 'system' | 'user' | 'assistant' | 'tool' | 'function' | 'developer';
    content: string;
    name?: string;
    toolCallId?: string;  // ID linking a tool result to its original tool call
    toolCalls?: Array<{
        id: string;
        type?: 'function'; // Optional type, often 'function'
        function: {
            name: string;
            arguments: string; // Often a JSON string
        };
    } | ToolCall>; // Allow defined ToolCall type as well
    metadata?: Record<string, unknown>;
};

// Define JSONSchemaDefinition and ResponseFormat before they are used
export type JSONSchemaDefinition = string | z.ZodType;
export type ResponseFormat = 'json' | 'text' | { type: 'json_object' };

// Define the history mode type
export type HistoryMode = 'full' | 'dynamic' | 'stateless';

/**
 * Specifies how JSON responses should be handled
 */
export type JsonModeType = 'native-only' | 'fallback' | 'force-prompt';

// Define explicit properties for UniversalChatSettings
export type UniversalChatSettings = {
    /**
     * Controls randomness in the model's output.
     * Range: 0.0 to 2.0
     * - Lower values (e.g., 0.2) make the output more focused and deterministic
     * - Higher values (e.g., 0.8) make the output more random and creative
     * @default 1.0 for most models
     */
    temperature?: number;
    /** Maximum number of tokens to generate in the completion. */
    maxTokens?: number;
    /** Nucleus sampling parameter (0-1). Alternative to temperature. */
    topP?: number;
    /** Reduces repetition (-2.0 to 2.0). Higher values penalize based on frequency. */
    frequencyPenalty?: number;
    /** Encourages new topics (-2.0 to 2.0). Higher values penalize based on presence. */
    presencePenalty?: number;
    /**
     * Maximum number of retries when the provider call fails
     * @default 3
     */
    maxRetries?: number;
    /**
     * Controls which tool the model should use, if any.
     * 'none' means no tool call.
     * 'auto' lets the model decide.
     * Specifying a tool name forces that tool to be called.
     */
    toolChoice?: 'none' | 'auto' | { type: 'function'; function: { name: string } };
    /** A unique identifier representing your end-user, which can help OpenAI/providers monitor and detect abuse. */
    user?: string;
    /** Up to 4 sequences where the API will stop generating further tokens. */
    stop?: string | string[];
    /** Number of chat completion choices to generate for each input message. (Default: 1) */
    n?: number;
    /** Modify the likelihood of specified tokens appearing in the completion. */
    logitBias?: Record<string, number>; // Keys are usually token IDs as strings
    /**
     * Whether to stream the response back as it's being generated.
     * When true, the response will be sent as a stream of chunks.
     * @default false
     */
    stream?: boolean;
    /**
     * Whether to retry the request if the model returns content that seems incomplete or invalid.
     * This is separate from retries due to network errors.
     * @default true
     */
    shouldRetryDueToContent?: boolean;
    /**
     * Controls how JSON responses are handled:
     * - 'native-only': Only use native JSON mode, error if not supported
     * - 'fallback': Use native if supported, fallback to prompt if not (default)
     * - 'force-prompt': Always use prompt enhancement, even if native JSON mode is supported
     * @default 'fallback'
     */
    jsonMode?: JsonModeType;
    /**
     * Used for parallel tool calls, containing an array of tool call objects.
     * Each tool call specifies a tool to call with specific arguments.
     */
    toolCalls?: Array<{ name: string; arguments: Record<string, unknown> }>;
    /**
     * The seed to use for deterministic sampling. If specified, the model will make a best effort 
     * to sample deterministically, but determinism is not guaranteed.
     */
    seed?: number;
    /**
     * Provider-specific parameters that don't fit into the standard parameters.
     * These are passed directly to the underlying provider without modification.
     */
    providerOptions?: Record<string, unknown>;
    /**
     * Specifies how to interpret certain parts of the input.
     * For example, "markdown" would indicate that markdown should be rendered in the input.
     */
    inputFormat?: string;
    /**
     * Whether the model should include the reasoning process in its output.
     * This is particularly useful for tasks requiring step-by-step solutions.
     */
    includeReasoning?: boolean;
    /**
     * Timeout in milliseconds for the entire request.
     * @default 60000 (60 seconds)
     */
    timeout?: number;
    /**
     * Controls the level of detail in the model's response.
     * Higher values lead to more detailed responses.
     */
    detailLevel?: 'low' | 'medium' | 'high';
    /**
     * Controls whether the model should filter out sensitive or harmful content.
     * Used when content filtering is available but optional.
     */
    enableContentFiltering?: boolean;
    /**
     * Define a target audience for the model's response.
     * Helps shape the style and complexity of the output.
     */
    audience?: string;
    /**
     * Sets the priority level for the request.
     * Higher priority may result in faster processing but could incur premium charges.
     */
    priority?: 'low' | 'normal' | 'high';
    /**
     * Controls how the model handles topic boundaries.
     * Stricter settings will make the model less likely to discuss sensitive topics.
     */
    safetySettings?: {
        topics?: Array<{
            name: string;
            enabled: boolean;
            strictness?: 'low' | 'medium' | 'high';
        }>
    };
    /**
     * Controls how historical messages are sent to the model.
     * - 'full': Send all historical messages
     * - 'dynamic': Intelligently truncate history if it exceeds the model's token limit
     * - 'stateless': Only send system message and current user message
     */
    historyMode?: HistoryMode;
};

// Define the new options structure for call/stream methods
export type LLMCallOptions = {
    /** Optional data to include, can be text or object */
    data?: string | object;
    /** Optional concluding message */
    endingMessage?: string;
    /** Optional settings to control LLM behavior */
    settings?: UniversalChatSettings;
    /**
     * JSON schema for response validation and formatting.
     * Can be either a JSON Schema definition or a Zod schema.
     */
    jsonSchema?: {
        name?: string;
        schema: JSONSchemaDefinition;
    };
    /**
     * Specify the response format ('json' or 'text').
     * Requires the model to support JSON mode if 'json' is selected.
     * @default 'text'
     */
    responseFormat?: ResponseFormat;
    /**
     * Optional list of tools the model may call.
     */
    tools?: ToolDefinition[];
    /**
     * Controls how historical messages are sent to the model.
     * - 'full': Send all historical messages (default)
     * - 'dynamic': Intelligently truncate history if it exceeds the model's token limit
     * - 'stateless': Only send system message and current user message
     * @default 'stateless'
     */
    historyMode?: HistoryMode;
};

export type UniversalChatParams = {
    messages: Array<UniversalMessage>;
    // Use the refined settings type
    settings?: UniversalChatSettings;
    callerId?: string;
    inputCachedTokens?: number;
    inputCachedPricePerMillion?: number;
    // Add tools, jsonSchema, responseFormat here as they are part of the core request structure passed down
    tools?: ToolDefinition[];
    jsonSchema?: { name?: string; schema: JSONSchemaDefinition };
    responseFormat?: ResponseFormat;
    // Add model name here as it's essential for the request
    model: string;
    // System message might be handled differently (e.g., within messages), but include if needed directly
    systemMessage?: string;
    // Include historyMode as it needs to be passed down to controllers
    historyMode?: HistoryMode;
};

// Universal interface for chat response
export type Usage = {
    tokens: {
        input: number;
        inputCached: number;
        output: number;
        total: number;
    };
    costs: {
        input: number;
        inputCached: number;
        output: number;
        total: number;
    };
};

export interface UniversalChatResponse<T = unknown> {
    content: string | null; // Content can be null if tool_calls are present
    contentObject?: T;
    role: string; // Typically 'assistant'
    messages?: UniversalMessage[];  // May include history or context messages
    // Use imported ToolCall type
    toolCalls?: ToolCall[];
    metadata?: {
        finishReason?: FinishReason;
        created?: number; // Unix timestamp
        usage?: Usage;
        refusal?: any; // Provider-specific refusal details
        model?: string;
        // Add schema/format info here if needed for response metadata
        jsonSchemaUsed?: { name?: string; schema: JSONSchemaDefinition };
        responseFormat?: ResponseFormat;
        validationErrors?: Array<{ message: string; path: (string | number)[] }>; // Zod-like error path
        // Add JSON repair metadata
        jsonRepaired?: boolean;
        originalContent?: string;
    };
}

// Universal interface for streaming response
export interface UniversalStreamResponse<T = unknown> {
    /**
     * The content of the current chunk being streamed.
     */
    content: string;
    /**
     * The complete accumulated text content, always present when isComplete is true.
     * This property is intended for accessing the full accumulated text of the response.
     */
    contentText?: string;
    /**
     * The parsed object from the response, only available for JSON responses when isComplete is true.
     */
    contentObject?: T;
    role: string; // Typically 'assistant'
    isComplete: boolean;
    messages?: UniversalMessage[];  // Array of messages for tool call responses
    // Use imported ToolCall type
    toolCalls?: ToolCall[];
    // Structure for tool results sent back *to* the model (if applicable in response)
    toolCallResults?: Array<{
        id: string;
        name: string;
        result: string;
    }>;
    // Use imported ToolCallChunk type for partial tool calls during streaming
    toolCallChunks?: ToolCallChunk[];
    metadata?: {
        finishReason?: FinishReason;
        usage?: Usage; // Usage might be partial or final
        created?: number; // Unix timestamp
        model?: string;
        refusal?: any; // Provider-specific refusal details
        // Add schema/format info here if needed for response metadata
        jsonSchemaUsed?: { name?: string; schema: JSONSchemaDefinition };
        responseFormat?: ResponseFormat;
        validationErrors?: Array<{ message: string; path: (string | number)[] }>; // Zod-like error path
        processInfo?: {
            currentChunk: number;
            totalChunks: number;
        };
        // Tool execution status fields (if orchestrator adds them)
        toolStatus?: 'running' | 'complete' | 'error';
        toolName?: string;
        toolId?: string; // Corresponds to ToolCall.id
        toolResult?: string;
        toolError?: string;
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