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
    ResponseFormat
} from './interfaces/UniversalInterfaces.ts';

// Usage and Telemetry
export type {
    UsageCallback,
    UsageData
} from './interfaces/UsageInterfaces.ts';
export { OtelService } from './core/telemetry/OtelService.ts'
export { getAutoOtelService, shutdownAutoOtel } from './core/telemetry/OtelBootstrap.ts'

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
