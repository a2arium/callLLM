// Facade for provider-facing telemetry types to avoid deep import paths.
// Providers can import from '@/core/telemetry/providers/TelemetryProvider' instead of collector paths.

export type {
    TelemetryProvider,
    ProviderInit,
    RedactionPolicy,
    ConversationContext,
    ConversationSummary,
    ConversationInputOutput,
    LLMCallContext,
    PromptMessage,
    ChoiceEvent,
    ToolCallContext
} from '../collector/types.ts';