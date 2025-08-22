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

## Notes
- Old direct OpenTelemetry wiring has been removed from controllers in favor of provider-based emission.
- More providers can be added without changing core logic.
