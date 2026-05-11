# Telemetry and Usage

`callllm` treats usage and telemetry as production features, not afterthoughts. Responses include normalized usage where available, and the telemetry collector can emit conversations, LLM calls, tool calls, prompts, choices, and costs.

## Response Usage

```ts
const response = await caller.call('Summarize this ticket.', {
  data: ticketText
});

console.log(response[0].metadata?.usage);
```

Usage shape:

```ts
type Usage = {
  tokens: {
    input: {
      total: number;
      cached: number;
      image?: number;
      audio?: number;
    };
    output: {
      total: number;
      reasoning: number;
      image?: number;
      audio?: number;
    };
    total: number;
  };
  costs: {
    input: {
      total: number;
      cached: number;
      audio?: number;
    };
    output: {
      total: number;
      reasoning: number;
      image?: number;
      video?: number;
      audio?: number;
    };
    total: number;
    unit: 'USD';
  };
  durations?: {
    input?: {
      audio?: number;
      video?: number;
    };
    output?: {
      audio?: number;
      video?: number;
    };
    total?: number;
    unit: 'seconds';
  };
};
```

Cost is an estimate based on provider usage metadata and catalog prices.

## Usage Callback

Use `usageCallback` for real-time reporting:

```ts
const caller = new LLMCaller('openai', 'gpt-5-mini', 'You are concise.', {
  callerId: 'conversation-42',
  usageCallback: ({ callerId, usage, timestamp }) => {
    console.log(callerId, usage.costs.total, new Date(timestamp).toISOString());
  }
});
```

Override the caller ID:

```ts
caller.setCallerId('conversation-43');
```

Set or replace the callback:

```ts
caller.setUsageCallback(({ usage }) => {
  console.log(usage.tokens.total);
});
```

## Streaming Usage

```ts
for await (const chunk of caller.stream('Write a short story.', {
  usageBatchSize: 50
})) {
  process.stdout.write(chunk.content);
  if (chunk.isComplete) {
    console.log(chunk.metadata?.usage);
  }
}
```

Callbacks are emitted incrementally. The final chunk contains cumulative usage.

## Model Metadata

Every operation includes stable model-selection metadata where possible:

```ts
response[0].metadata?.provider;
response[0].metadata?.model;
response[0].metadata?.selectionMode;
```

Use these fields for logs, metrics, audit trails, and cost attribution.

## OpenTelemetry

Enable OpenTelemetry:

```env
CALLLLM_OTEL_ENABLED=true
OTEL_SERVICE_NAME=my-app
OTEL_EXPORTER_OTLP_ENDPOINT=https://collector.example.com/v1/traces
```

The provider emits normalized GenAI-style spans/events for LLM calls, prompts, choices, chunks, tool calls, and usage.

## Opik

Enable Opik:

```env
CALLLLM_OPIK_ENABLED=true
OPIK_API_KEY=...
OPIK_WORKSPACE=...
OPIK_PROJECT_NAME=llm
OPIK_LOG_LEVEL=ERROR
```

When Opik is enabled, prompts, responses, usage, selected provider/model, and conversation summaries can be recorded.

## Redaction

Before enabling production telemetry, decide what data may leave your application:

```env
CALLLLM_OTEL_REDACT_PROMPTS=true
CALLLLM_OTEL_REDACT_RESPONSES=true
CALLLLM_OTEL_REDACT_TOOL_ARGS=true
CALLLLM_OTEL_MAX_CONTENT_LENGTH=2000
```

Exact redaction support depends on the telemetry provider.

## Logging

```env
LOG_LEVEL=error
```

`LOG_LEVEL` controls framework logs. It does not suppress output printed by your own script or by third-party SDKs unless those SDKs are also configured.

For Opik noise, set:

```env
OPIK_LOG_LEVEL=ERROR
```

To disable Opik:

```env
CALLLLM_OPIK_ENABLED=false
```
