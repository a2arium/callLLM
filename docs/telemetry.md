# Telemetry Architecture

This framework provides a provider-agnostic telemetry system built around a generic TelemetryCollector. Providers implement platform-specific transmission (OpenTelemetry, Langfuse, Opik, etc.).

## Overview

- TelemetryCollector (core):
  - Manages conversation, LLM call, tool call lifecycles
  - Applies redaction policies
  - Emits normalized events (prompts, choices, usage) to registered providers
- Providers (pluggable):
  - OpenTelemetryProvider (enabled when `CALLLLM_OTEL_ENABLED=true`)
  - Future: LangfuseProvider, OpikProvider, ConsoleProvider

## Lifecycle

1. Conversation
   - startConversation('call' | 'stream', metadata?)
   - endConversation(summary)
2. LLM Call
   - startLLM(conversation, meta)
   - addPrompt(messages[])
   - addChoice(choice|chunk)
   - endLLM(usage, responseModel?)
3. Tool Call
   - startTool(conversation, meta)
   - endTool(result?, error?)

## Redaction Policy
Configured via environment variables. Defaults:
- `CALLLLM_OTEL_REDACT_PROMPTS`
- `CALLLLM_OTEL_REDACT_RESPONSES`
- `CALLLLM_OTEL_REDACT_TOOL_ARGS`
- `CALLLLM_OTEL_PII_DETECTION`
- `CALLLLM_OTEL_MAX_CONTENT_LENGTH`

## OpenTelemetry Provider
- Enabled with `CALLLLM_OTEL_ENABLED=true`
- Emits GenAI spans/events using semantic conventions
  - LLM spans: CLIENT; attributes include `gen_ai.system`, `gen_ai.request.model`, and usage
  - Events: `gen_ai.prompt`, `gen_ai.choice` (+ chunk variants)
- Standard OTLP envs apply (OTEL_EXPORTER_OTLP_ENDPOINT, headers, etc.)

## Integration in Code

- LLMCaller creates a TelemetryCollector and registers providers
- ChatController
  - starts LLM context, emits prompts, ends LLM with final choice/usage
- StreamingService
  - starts conversation & LLM for streaming; emits prompt and `choice` chunk events; ends LLM with usage
- ToolController
  - when conversation context is provided, starts and ends tool contexts

## Usage

- Enable OTel provider:
```bash
CALLLLM_OTEL_ENABLED=true
OTEL_SERVICE_NAME=my-app
OTEL_EXPORTER_OTLP_ENDPOINT=https://example.com/otlp
```

- Basic flow is automatic via `LLMCaller`; providers will be auto-registered.

## Model Selection Metadata

Every response is annotated with stable model-selection metadata:

```ts
const result = await caller.call('Hello');

console.log(result[0].metadata?.provider);
console.log(result[0].metadata?.model);
console.log(result[0].metadata?.selectionMode); // exact | preset | policy
```

These fields are stable and safe for logging, metrics, audit trails, and application-level routing decisions. They are added for chat, stream chunks, image/video operations, embeddings, and audio operations.

When a dynamic selection is created with `resolution.explain: true`, the response also includes diagnostic resolution details:

```ts
const caller = new LLMCaller(['openai', 'gemini'], {
  preset: 'balanced',
  resolution: { explain: true }
});

const result = await caller.call('Summarize this');
console.log(result[0].metadata?.modelResolution);
```

`modelResolution` can include the selected candidate, request-derived requirements, applied constraints, candidate scores, and rejection reasons. Treat this object as diagnostic. Candidate scores and rejection reasons may change as model catalogs, provider health signals, or scoring formulas are improved.

Telemetry providers should record the resolved provider/model, not only the constructor provider/model, because presets and policies can choose different models by operation.

## Notes
- Old direct OpenTelemetry wiring has been removed from controllers in favor of provider-based emission.
- More providers can be added without changing core logic.
