// Core exports
export { LLMCaller } from './core/caller/LLMCaller.ts';
export type { RegisteredProviders } from './adapters/index.ts';
export type { LLMCallerOptions } from './core/caller/LLMCaller.ts';

// Universal Types
export type {
    UniversalChatParams,
    UniversalChatResponse,
    UniversalChatSettings,
    UniversalMessage,
    UniversalStreamResponse,
    Usage,
    FinishReason,
    ModelInfo,
    ModelCapabilities,
    ModelAlias,
    JSONSchemaDefinition,
    ResponseFormat,
    LLMCallOptions,
    RerankDocument,
    RerankCallOptions,
    RerankParams,
    RerankResult,
    RerankResponse,
    RetryPolicy,
    RetryFailureClass,
    RetryAttemptEvent,
    RetryStructuredOutputReason
} from './interfaces/UniversalInterfaces.ts';
export type { LLMProviderRerank } from './interfaces/LLMProvider.ts';
export type { LLMExecutionControl, LLMTerminalReason } from './interfaces/ExecutionInterfaces.ts';
export { LLMAbortError, LLMTimeoutError } from './core/execution/errors.ts';
export { ProviderTransportError, isProviderTransportError } from './core/retry/ProviderTransportError.ts';
export { resolveRetryPolicy } from './core/retry/resolveRetryPolicy.ts';
export { classifyRetryFailure } from './core/retry/classifyRetryFailure.ts';
export type { ResolvedRetryPolicy } from './core/retry/resolveRetryPolicy.ts';
export type { RetryClassification } from './core/retry/classifyRetryFailure.ts';

// Usage and Telemetry
export type {
    UsageCallback,
    UsageData
} from './interfaces/UsageInterfaces.ts';

// Telemetry system (for custom provider implementations)
export { TelemetryCollector } from './core/telemetry/collector/TelemetryCollector.ts';
export type {
    TelemetryProvider,
    ProviderInit,
    ConversationContext,
    LLMCallContext,
    ToolCallContext,
    PromptMessage,
    ChoiceEvent,
    ConversationSummary,
    ConversationInputOutput,
    RedactionPolicy
} from './core/telemetry/collector/types.ts';

// Tool-related types
export type {
    ToolDefinition,
    ToolParameters,
    ToolParameterSchema,
    ToolChoice,
    ToolCall,
    ToolCallResponse
} from './types/tooling.ts';

// Re-export key entities
export { ModelManager } from './core/models/ModelManager.ts';
export { TokenCalculator } from './core/models/TokenCalculator.ts';
export { ToolsManager } from './core/tools/ToolsManager.ts';
export { HistoryManager } from './core/history/HistoryManager.ts';

/** Thrown when chunked transcription cannot run ffmpeg/ffprobe (see README Audio section). */
export { TranscriptionFfmpegError } from './core/audio/transcriptionFfmpegError.ts';

/** Typed structured-output / JSON-schema failure with response provenance. */
export {
    StructuredOutputError,
    isStructuredOutputError
} from './core/processors/StructuredOutputError.ts';
export type {
    StructuredOutputFailureReason,
    StructuredOutputErrorOptions,
    StructuredOutputValidationError
} from './core/processors/StructuredOutputError.ts';

// MCP functionality (most commonly used exports)
export { MCPServiceAdapter } from './core/mcp/MCPServiceAdapter.ts';
export type {
    MCPServerConfig,
    MCPServersMap,
    McpToolSchema,
    MCPDirectAccess,
    MCPRequestOptions
} from './core/index.ts';
