// Core model management exports
export { ModelManager } from './models/ModelManager.ts';
export { TokenCalculator } from './models/TokenCalculator.ts';
export { ModelSelector } from './models/ModelSelector.ts';
export {
    DEFAULT_PROVIDER_MODEL_CATALOGS,
    ModelCatalog,
    ModelNotFoundError,
    AmbiguousModelError,
    normalizeProviderScope,
    loadModelCandidates,
    resolveExactModel
} from './models/ModelCatalog.ts';
export type {
    ModelCandidate,
    ProviderModelCatalogs
} from './models/ModelCatalog.ts';
export {
    getEffectiveCapabilities,
    candidateMeetsRequirements,
    filterCandidatesByRequirements,
    explainCapabilityMatch,
    supportsTextInput,
    supportsTextOutput,
    supportsImageInput,
    supportsImageOutput,
    supportsAudioInput,
    supportsAudioOutput,
    supportsVideoOutput,
    supportsEmbeddings,
    supportsAudioApi,
    supportsToolCalls
} from './models/CapabilityMatcher.ts';
export type {
    TextOutputRequirement,
    RequestRequirements,
    ProviderInterfaceSupport,
    CapabilityMatchResult
} from './models/CapabilityMatcher.ts';
export {
    rankCandidates,
    applyModelConstraints,
    getConstraintRejectionReasons,
    scoreCandidates,
    sortScoredCandidates,
    getRawMetrics,
    getOperationCost,
    normalizeMetric,
    ModelScoringError
} from './models/ModelScoring.ts';
export type {
    SelectionOperation,
    ScoreContext,
    CandidateScores,
    ScoredModelCandidate,
    ConstraintResult,
    RankedModelSelection
} from './models/ModelScoring.ts';
export {
    inferChatRequestRequirements,
    inferEmbeddingRequestRequirements,
    inferTranscriptionRequestRequirements,
    inferTranslationRequestRequirements,
    inferSpeechRequestRequirements,
    inferImageOperation
} from './models/RequestInference.ts';
export type {
    ChatOperationKind,
    ImageOperationRequirement,
    InferredModelRequest,
    ToolInferenceOptions
} from './models/RequestInference.ts';
export {
    resolveModel,
    describeRequestRequirements,
    formatModelResolutionErrorMessage,
    ModelSelectionError,
    ModelResolutionError
} from './models/ModelResolver.ts';
export type {
    ModelResolutionMode,
    ModelResolverInput,
    ResolvedModel,
    ModelResolution,
    ModelResolutionCandidate,
    ModelResolutionErrorDetails
} from './models/ModelResolver.ts';
export {
    MODEL_PRESETS,
    PREFERENCE_DIMENSIONS,
    MODEL_SELECTION_PRESETS,
    ModelSelectionConfigError,
    isModelPreset,
    normalizeModelSelection
} from './models/ModelSelection.ts';
export type {
    ProviderScope,
    ModelPreset,
    PreferenceDimension,
    ModelPreferences,
    ModelConstraints,
    ModelResolutionOptions,
    ExactModelSelection,
    DynamicModelSelection,
    ModelOrSelection,
    NormalizedModelSelection
} from './models/ModelSelection.ts';

// Core history management exports
export { HistoryManager } from './history/HistoryManager.ts';
export { HistoryTruncator } from './history/HistoryTruncator.ts';

// Core tool management exports
export { ToolsManager } from './tools/ToolsManager.ts';
export { ToolController } from './tools/ToolController.ts';
export { ToolOrchestrator } from './tools/ToolOrchestrator.ts';

// Core chat functionality exports
export { ChatController } from './chat/ChatController.ts';
export { ProviderPool } from './caller/ProviderPool.ts';
export type {
    ProviderInterfaceName,
    ProviderPoolInterfaceSupport,
    ProviderPoolOptions
} from './caller/ProviderPool.ts';

// Core streaming exports
export { StreamController } from './streaming/StreamController.ts';
export { StreamHandler } from './streaming/StreamHandler.ts';

// Core processing exports
export { DataSplitter } from './processors/DataSplitter.ts';
export { RequestProcessor } from './processors/RequestProcessor.ts';
export { ResponseProcessor } from './processors/ResponseProcessor.ts';

// Core schema exports
export { SchemaValidator } from './schema/SchemaValidator.ts';
export { SchemaFormatter } from './schema/SchemaFormatter.ts';

// Core retry functionality
export { RetryManager } from './retry/RetryManager.ts';

// Core telemetry exports
export { UsageTracker } from './telemetry/UsageTracker.ts';
export { TelemetryCollector } from './telemetry/collector/TelemetryCollector.ts'
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
} from './telemetry/collector/types.ts'
export { OpenTelemetryProvider } from './telemetry/providers/openTelemetry/OpenTelemetryProvider.ts'

// Core MCP exports
export { MCPServiceAdapter } from './mcp/MCPServiceAdapter.ts';
export { MCPToolLoader } from './mcp/MCPToolLoader.ts';
export type { IMCPToolLoader } from './mcp/MCPToolLoader.ts';

export type {
    MCPServerConfig,
    MCPServersMap,
    MCPToolConfig,
    McpToolSchema,
    MCPToolDescriptor,
    MCPProgressNotification,
    MCPTransportType,
    MCPHttpMode,
    MCPAuthConfig,
    MCPToolError
} from './mcp/MCPConfigTypes.ts';

export {
    MCPConnectionError,
    MCPToolCallError,
    MCPAuthenticationError,
    MCPTimeoutError,
    isMCPToolConfig
} from './mcp/MCPConfigTypes.ts';

export type { MCPDirectAccess } from './mcp/MCPDirectAccess.ts';

export type {
    MCPRequestOptions,
    Resource,
    ReadResourceParams,
    ReadResourceResult,
    ResourceTemplate,
    Prompt,
    GetPromptParams,
    GetPromptResult
} from './mcp/MCPInterfaces.ts';

// Error types
export { CapabilityError } from './models/CapabilityError.ts'; 
