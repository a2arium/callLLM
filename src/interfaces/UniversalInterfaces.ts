import { z } from 'zod';
import type { ToolCallChunk } from '../core/streaming/types.ts';
import type { ToolDefinition, ToolCall } from '../types/tooling.ts';
import type { UsageCallback } from './UsageInterfaces.ts';
import type { MCPServersMap } from '../core/mcp/MCPConfigTypes.ts';

// Finish reason enum based on OpenAI's finish reasons
export enum FinishReason {
    STOP = 'stop',           // API returned complete model output
    LENGTH = 'length',       // Incomplete model output due to max_tokens parameter or token limit
    CONTENT_FILTER = 'content_filter',  // Omitted content due to a flag from content filters
    TOOL_CALLS = 'tool_calls',    // Model made tool calls
    NULL = 'null',            // Stream not finished yet
    ERROR = 'error'
}

// Image data source types
export type UrlSource = {
    type: 'url';
    url: string;
};

export type Base64Source = {
    type: 'base64';
    data: string;
    mime: string;
};

export type FilePathSource = {
    type: 'file_path';
    path: string;
};

export type ImageSource = UrlSource | Base64Source | FilePathSource;

// A simpler type for image data source in responses
export type ImageResponseDataSource = 'url' | 'base64' | 'file'

// Message part types
export type TextPart = { type: 'text'; text: string }
export type ImagePart = {
    type: 'image';
    data: ImageSource;
    _isMask?: boolean; // Optional property to indicate if this image part is a mask
}
export type MessagePart = TextPart | ImagePart

/**
 * Helper function to convert string or MessagePart[] to MessagePart[]
 */
export function toMessageParts(input: string): MessagePart[]
export function toMessageParts(input: MessagePart[]): MessagePart[]
export function toMessageParts(input: string | MessagePart[]): MessagePart[] {
    if (typeof input === 'string') {
        return [{ type: 'text', text: input }];
    }
    return input;
}

export type UniversalMessage = {
    role: 'system' | 'user' | 'assistant' | 'tool' | 'function' | 'developer';
    /**
     * The content of the message.
     * NOTE: In future versions, this will support MessagePart[] in addition to string.
     * The implementation will be: content: string | MessagePart[];
     */
    content: string;
    name?: string;
    toolCallId?: string;  // ID linking a tool result to its original tool call
    toolCalls?: Array<{
        id: string;
        type?: 'function';
        function: {
            name: string;
            arguments: string;  // JSON-encoded argument object
        };
    } | ToolCall>;
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
     * Provider-specific parameters that don't fit into the standard parameters.
     * These are passed directly to the underlying provider without modification.
     */
    providerOptions?: Record<string, unknown>;
    /**
     * Configuration for reasoning models.
     * Only applies to models with reasoning capabilities.
     */
    reasoning?: {
        /**
         * Constrains effort on reasoning for reasoning models.
         * @default 'medium'
         */
        effort?: ReasoningEffort;

        /**
         * Request a summary of the reasoning process.
         * When set to 'auto', the most detailed summary available will be returned.
         * This is only supported by certain models.
         */
        summary?: 'auto' | 'concise' | 'detailed' | null;
    };
};

/**
 * Options for image input processing
 */
export type ImageInputOpts = {
    /** Detail level for image analysis */
    detail?: 'low' | 'high' | 'auto'
}

/**
 * Options for image output generation
 */
export type ImageOutputOpts = {
    /** Whether the model can generate images from scratch */
    generate?: boolean
    /** Whether the model can edit existing images */
    edit?: boolean
    /** Whether the model can edit images with a mask */
    editWithMask?: boolean
    /** Quality level for generated images */
    quality?: 'low' | 'medium' | 'high' | 'auto'
    /** Image dimensions in format "widthxheight" (e.g., "1024x1024") */
    size?: string
    /** Output image format */
    format?: 'png' | 'jpeg' | 'webp'
    /** Background handling for images with transparency */
    background?: 'transparent' | 'auto'
    /** Compression level (0-100) for jpeg/webp formats */
    compression?: number
    /** Style setting for image generation (e.g., 'vivid', 'natural' for DALL-E 3) */
    style?: string
}

// Define the new options structure for call/stream methods
export type LLMCallOptions = {
    /** Optional text prompt (alternative to passing string directly) */
    text?: string;
    /** Optional file path, URL, or base64 data for image input */
    file?: string;
    /** Optional array of file paths, URLs, or base64 data for multiple image inputs */
    files?: string[];
    /** Optional mask file path, URL, or base64 data for in-painting */
    mask?: string;
    /** Optional settings for image input */
    input?: {
        image?: ImageInputOpts
    };
    /** Optional settings for image output */
    output?: {
        image?: ImageOutputOpts
    };
    /** Optional path where to save generated image */
    outputPath?: string;
    /** Optional callback to receive incremental usage stats */
    usageCallback?: UsageCallback;
    /** Batch size of tokens between callbacks. Default=100 when callback provided. */
    usageBatchSize?: number;
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
     */
    responseFormat?: ResponseFormat;
    /**
     * Optional list of tools the model may call.
     * Can be a ToolDefinition, a function name (string), or an MCP servers map.
     */
    tools?: (ToolDefinition | string | MCPServersMap)[];
    /**
     * Directory containing tool files.
     * When provided, tool names that are strings will be resolved from this directory.
     * Overrides the toolsDir provided in the LLMCaller constructor.
     */
    toolsDir?: string;
    /**
     * Controls how historical messages are sent to the model.
     * - 'full': Send all historical messages (default)
     * - 'dynamic': Intelligently truncate history if it exceeds the model's token limit
     * - 'stateless': Only send system message and current user message
     * @default 'stateless'
     */
    historyMode?: HistoryMode;
    /**
     * Maximum number of characters allowed per chunk (for splitting)
     */
    maxCharsPerChunk?: number;
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
    /**
     * Batch size for incremental usage callbacks. Default applied by StreamHandler when callback provided.
     */
    usageBatchSize?: number;
};

// Universal interface for chat response
export type Usage = {
    tokens: {
        input: {
            total: number;
            cached: number;
            /** Tokens attributable to file/image inputs (if any) */
            image?: number;
        },
        output: {
            total: number;
            reasoning: number;
            /** Tokens attributable to image generation/editing in output (if any) */
            image?: number;
        },
        total: number;
    };
    costs: {
        input: {
            total: number;
            cached: number;
        },
        output: {
            total: number;
            reasoning: number;
            /** Costs attributable to image generation/editing in output (if any) */
            image?: number;
        },
        total: number;
    };
};

export type ProcessingInfo = {
    currentChunk: number;
    totalChunks: number;
};

export type Metadata = {
    finishReason?: FinishReason;
    created?: number;
    usage?: Usage;
    refusal?: any;
    model?: string;
    jsonSchemaUsed?: JSONSchemaDefinition;
    isGenerated?: boolean;
    chatId?: string;
    callId?: string;
    processInfo?: ProcessingInfo;
    imageSavedPath?: string; // Path where the image was saved
    imageUrl?: string; // URL of the generated image (for models that return URLs)
    responseFormat?: ResponseFormat;
    validationErrors?: Array<{ message: string; path: (string | number)[] }>;
    jsonRepaired?: boolean;
    originalContent?: string;
    rawUsage?: Record<string, number>;
    toolStatus?: 'running' | 'complete' | 'error';
    toolName?: string;
    toolId?: string;
    toolResult?: string;
    toolError?: string;
    stream?: boolean; // Added to support stream indication in metadata
};

export interface UniversalChatResponse<T = unknown> {
    content: string | null; // Content can be null if tool_calls are present
    contentObject?: T;

    /**
     * Summary of the model's reasoning process, if available.
     * Only provided for models with reasoning capabilities when reasoning.summary is enabled.
     */
    reasoning?: string;

    /**
     * Generated image data, if the model was asked to generate an image.
     * Only present if output.image was requested.
     */
    image?: {
        /** Image data as base64 string or URL */
        data: string;
        /** Source of the image data (base64, url, file) */
        dataSource?: ImageResponseDataSource;
        /** MIME type of the image (e.g., 'image/png') */
        mime: string;
        /** Width of the image in pixels */
        width: number;
        /** Height of the image in pixels */
        height: number;
        /** Operation that was performed to generate this image */
        operation: 'generate' | 'edit' | 'edit-masked' | 'composite';
    };

    role: string; // Typically 'assistant'
    messages?: UniversalMessage[];  // May include history or context messages
    // Use imported ToolCall type
    toolCalls?: ToolCall[];
    metadata?: Metadata;
}

// Universal interface for streaming response
export interface UniversalStreamResponse<T = unknown> {
    /**
     * The content of the current chunk being streamed.
     */
    content: string;

    /**
     * Summary of the model's reasoning process, if available.
     */
    reasoning?: string;

    /**
     * The complete accumulated text content, always present when isComplete is true.
     */
    contentText?: string;

    /**
     * The complete accumulated reasoning text, always present when isComplete is true.
     */
    reasoningText?: string;

    /**
     * True when this is the first streamed chunk that includes non-empty content.
     */
    isFirstContentChunk?: boolean;
    /**
     * True when this is the first streamed chunk that includes non-empty reasoning.
     */
    isFirstReasoningChunk?: boolean;
    /**
     * The parsed object from the response, only available for JSON responses when isComplete is true.
     */
    contentObject?: T;

    /**
     * Generated image data, if the model was asked to generate an image.
     * Only present if output.image was requested and isComplete is true.
     */
    image?: {
        /** Base64-encoded image data */
        data: string;
        /** MIME type of the image (e.g., 'image/png') */
        mime: string;
        /** Width of the image in pixels */
        width: number;
        /** Height of the image in pixels */
        height: number;
        /** Operation that was performed to generate this image */
        operation: 'generate' | 'edit' | 'edit-masked' | 'composite';
    };

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
    metadata?: Metadata;
}

/**
 * Model capabilities configuration.
 * Defines what features the model supports.
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
     * Whether the model supports reasoning capabilities.
     * When true, the model can generate detailed reasoning before providing answers.
     * @default false
     */
    reasoning?: boolean;

    /**
     * Whether the model supports embedding generation.
     * When false, embedding generation requests will be rejected.
     * @default false
     */
    embeddings?: boolean | {
        /** Maximum input text length in tokens */
        maxInputLength?: number;
        /** Supported embedding dimensions */
        dimensions?: number[];
        /** Default dimension size */
        defaultDimensions?: number;
        /** Supported encoding formats */
        encodingFormats?: ('float' | 'base64')[];
    };

    /**
     * Capabilities related to model input.
     * The presence of a modality key indicates support for that input type.
     */
    input: {
        /**
         * Text input capability.
         * Boolean true indicates basic support, object provides configuration options.
         */
        text: true | {
            // Additional text input configuration options could be added here
        };

        /**
         * Image input capability.
         * Boolean true indicates basic support, object provides configuration options.
         */
        image?: true | {
            /** Supported image formats */
            formats?: string[];
            /** Maximum dimensions supported */
            maxDimensions?: [number, number];
            /** Maximum file size in bytes */
            maxSize?: number;
        };

        /**
         * Audio input capability.
         * Boolean true indicates basic support, object provides configuration options.
         */
        audio?: true | {
            /** Supported audio formats */
            formats?: string[];
            /** Maximum duration in seconds */
            maxDuration?: number;
            /** Maximum file size in bytes */
            maxSize?: number;
        };
    };

    /**
     * Capabilities related to model output.
     * The presence of a modality key indicates support for that output type.
     */
    output: {
        /**
         * Text output capability.
         * Boolean ftrue indicates basic text output only, object provides configuration options.
         */
        text: true | false | {
            /**
             * Supported text output formats.
             * Replaces the old jsonMode flag. If 'json' is included, JSON output is supported.
             * @default ['text']
             */
            textOutputFormats: ('text' | 'json')[];
        };

        /**
         * Image output capability.
         * Boolean true indicates basic support, object provides configuration options.
         */
        image?: boolean | ImageOutputOpts;

        /**
         * Audio output capability.
         * Boolean true indicates basic support, object provides configuration options.
         */
        audio?: true | {
            /** Supported audio formats */
            formats?: string[];
            /** Maximum output duration in seconds */
            maxDuration?: number;
        };
    };
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

/**
 * Model aliases for selecting models by characteristics
 */
export type ModelAlias = 'cheap' | 'balanced' | 'fast' | 'premium';

/**
 * Defines the level of reasoning effort for reasoning-capable models.
 * - 'low': Faster responses with fewer tokens used for reasoning
 * - 'medium': Balanced approach to reasoning depth and token usage
 * - 'high': More thorough reasoning at the cost of more tokens and potentially longer generation time
 */
export type ReasoningEffort = 'low' | 'medium' | 'high';

// Parameters for image operations
export type ImageCallParams = {
    prompt?: string;
    model?: string;
    n?: number;
    quality?: 'standard' | 'hd';
    response_format?: 'url' | 'b64_json';
    size?: '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024';
    style?: 'vivid' | 'natural';
    user?: string;
    files?: ImageSource[];
    mask?: ImageSource;
    outputPath?: string;
    options?: {
        size?: '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024';
        quality?: 'standard' | 'hd';
        style?: 'vivid' | 'natural';
        background?: string;
        [key: string]: any;
    };
    // Add usage tracking parameters
    callerId?: string;
    usageCallback?: UsageCallback;
};

export type GeneratedImage = {
    imageData: string;
    format: 'b64_json' | 'url';
    revisedPrompt?: string;
};

export type ImageGenerationResult = {
    images: GeneratedImage[];
    metadata: {
        created: number;
        providerResponse?: any;
        usage?: Usage;
        callType?: 'image_generation' | 'image_edit' | 'image_variation';
    };
};

/**
 * Parameters for embedding generation requests
 */
export type EmbeddingParams = {
    /** Text input to be embedded. Can be a single string or array of strings for batch processing */
    input: string | string[];
    /** Model to use for embedding generation */
    model: string;
    /** Number of dimensions for the embedding. Must be supported by the model */
    dimensions?: number;
    /** Format for the returned embeddings */
    encodingFormat?: 'float' | 'base64';
    /** A unique identifier representing your end-user */
    user?: string;
    /** Unique identifier for this call */
    callerId?: string;
    /** Optional callback to receive incremental usage stats for batch processing */
    usageCallback?: UsageCallback;
    /** Batch size for usage callbacks when processing multiple inputs */
    usageBatchSize?: number;
};

/**
 * Individual embedding object in the response
 */
export type EmbeddingObject = {
    /** The embedding vector as an array of numbers */
    embedding: number[];
    /** Index of this embedding in the batch request */
    index: number;
    /** Object type, always 'embedding' */
    object: 'embedding';
};

/**
 * Response from embedding generation
 */
export type EmbeddingResponse = {
    /** Array of embedding objects */
    embeddings: EmbeddingObject[];
    /** Model used for generating embeddings */
    model: string;
    /** Usage statistics for the request */
    usage: Usage;
    /** Additional metadata about the response */
    metadata?: Metadata;
};

/**
 * Options for embedding calls through LLMCaller
 */
export type EmbeddingCallOptions = {
    /** Text input to be embedded */
    input: string | string[];
    /** Optional model override. If not provided, uses provider default or caller configuration */
    model?: string;
    /** Number of dimensions for the embedding */
    dimensions?: number;
    /** Format for the returned embeddings */
    encodingFormat?: 'float' | 'base64';
    /** Optional callback to receive incremental usage stats */
    usageCallback?: UsageCallback;
    /** Batch size for usage callbacks when processing multiple inputs */
    usageBatchSize?: number;
}; 