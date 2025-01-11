import { z } from 'zod';

// Finish reason enum based on OpenAI's finish reasons
export enum FinishReason {
    STOP = 'stop',           // API returned complete model output
    LENGTH = 'length',       // Incomplete model output due to max_tokens parameter or token limit
    CONTENT_FILTER = 'content_filter',  // Omitted content due to a flag from content filters
    TOOL_CALLS = 'tool_calls',    // Model made tool calls
    NULL = 'null'            // Stream not finished yet
}

// Universal interface for chat parameters
export interface UniversalChatParams {
    messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
    }>;
    settings?: {
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
}

// Universal interface for chat response
export interface Usage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costs: {
        inputCost: number;
        outputCost: number;
        totalCost: number;
    };
}

export interface UniversalChatResponse {
    content: string;
    role: string;
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
export interface UniversalStreamResponse {
    content: string;
    role: string;
    isComplete: boolean;
    metadata?: {
        finishReason?: FinishReason;
        usage?: Usage;
        created?: number;
        model?: string;
        refusal?: any;
        responseFormat?: ResponseFormat;
        validationErrors?: Array<{ message: string; path: string }>;
    };
}

export type ModelInfo = {
    name: string;
    inputPricePerMillion: number;
    outputPricePerMillion: number;
    maxRequestTokens: number;
    maxResponseTokens: number;
    tokenizationModel?: string;
    /**
     * Indicates if the model supports JSON mode output
     * @default false
     */
    jsonMode?: boolean;
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