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

// MCP functionality (most commonly used exports)
export { MCPServiceAdapter } from './core/mcp/MCPServiceAdapter.ts';
export type {
    MCPServerConfig,
    MCPServersMap,
    McpToolSchema,
    MCPDirectAccess
} from './core/index.ts';
