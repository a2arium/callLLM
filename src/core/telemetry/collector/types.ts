import type { Usage } from '../../../interfaces/UniversalInterfaces.ts';

export type RedactionPolicy = {
    redactPrompts: boolean;
    redactResponses: boolean;
    redactToolArgs: boolean;
    piiDetection: boolean;
    maxContentLength: number;
    allowedAttributes?: string[];
};

export type ConversationContext = {
    conversationId: string;
    type: 'call' | 'stream';
    metadata?: Record<string, unknown>;
    startedAt: number;
};

export type LLMCallContext = {
    llmCallId: string;
    conversationId: string;
    provider: string; // e.g., openai, anthropic
    model: string;
    streaming: boolean;
    responseFormat?: 'text' | 'json';
    toolsEnabled?: boolean;
    settings?: Record<string, unknown>;
    startedAt: number;
};

export type ToolCallContext = {
    toolCallId: string;
    conversationId: string;
    name: string;
    type: 'function' | 'mcp' | 'unknown';
    executionIndex?: number;
    parallel?: boolean;
    argsPreview?: string;
    startedAt: number;
};

export type PromptMessage = {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    sequence: number;
};

export type ChoiceEvent = {
    content: string;
    contentLength: number;
    index?: number;
    sequence?: number; // for streaming chunks
    finishReason?: string;
    isChunk?: boolean;
};

export type ConversationSummary = {
    totalTokens?: number;
    totalCost?: number;
    llmCallsCount?: number;
    toolCallsCount?: number;
    success?: boolean;
    errorCount?: number;
};

export type ConversationInputOutput = {
    initialMessages?: PromptMessage[];
    finalResponse?: string;
};

export type ProviderInit = {
    env: NodeJS.ProcessEnv;
    redaction?: RedactionPolicy;
};

export type TelemetryProvider = {
    name: string;
    init(config: ProviderInit): Promise<void>;
    startConversation(ctx: ConversationContext): void;
    endConversation(ctx: ConversationContext, summary?: ConversationSummary, inputOutput?: ConversationInputOutput): void;
    startLLM(ctx: LLMCallContext): void;
    addPrompt(ctx: LLMCallContext, messages: PromptMessage[]): void;
    addChoice(ctx: LLMCallContext, choice: ChoiceEvent): void;
    endLLM(ctx: LLMCallContext, usage?: Usage, responseModel?: string): void;
    startTool(ctx: ToolCallContext): void;
    endTool(ctx: ToolCallContext, result?: unknown, error?: unknown): void;
};


