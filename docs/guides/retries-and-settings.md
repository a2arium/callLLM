# Settings, Retries, and Overrides

This guide explains how settings flow through `LLMCaller` and how retry behavior works.

## Settings Layers

Settings can be provided in two places:

1. Constructor defaults
2. Per-call overrides

```ts
const caller = new LLMCaller('openai', 'gpt-5-mini', 'You are concise.', {
  settings: {
    temperature: 0.2,
    maxTokens: 500,
    maxRetries: 3
  }
});

const response = await caller.call('Draft a status update.', {
  settings: {
    temperature: 0.5
  }
});
```

Per-call settings override constructor settings. In this example, the effective settings are:

- `temperature: 0.5`
- `maxTokens: 500`
- `maxRetries: 3`

## Update Defaults

```ts
caller.updateSettings({
  temperature: 0.7,
  maxRetries: 2
});
```

`updateSettings()` changes defaults for future calls. It does not rewrite past history.

## Common Settings

```ts
settings: {
  temperature: 0.3,
  maxTokens: 1000,
  topP: 0.9,
  frequencyPenalty: 0,
  presencePenalty: 0,
  verbosity: 'low',
  maxRetries: 3,
  jsonMode: 'fallback',
  toolChoice: 'auto',
  reasoning: {
    effort: 'medium',
    summary: 'auto'
  }
}
```

Provider-specific options can be passed through `providerOptions`:

```ts
await caller.call('Use this provider option.', {
  settings: {
    providerOptions: {
      // provider-specific values
    }
  }
});
```

## Per-Call Model Override

`settings.providerOptions.model` is preserved as a compatibility escape hatch:

```ts
new LLMCaller('openai', { model: 'gpt-5-mini' });
```

## Retry Behavior

`callllm` retries retryable provider failures with exponential backoff.

### Legacy shared ceiling

```ts
const caller = new LLMCaller('openai', 'gpt-5-mini', 'You are helpful.', {
  settings: {
    maxRetries: 3
  }
});
```

When `retryPolicy` is omitted, `maxRetries` (default 3) is the shared ceiling for
transport, structured-output, and content classes. `maxRetries: N` means N retries
after the first try (N+1 total attempts per class).

### Class-scoped policy

Use `settings.retryPolicy` when transport recovery must not resample model output
(for example frozen evaluations):

```ts
import { isStructuredOutputError, isProviderTransportError, isProviderHttpError } from 'callllm';

await caller.call('Judge this answer.', {
  jsonSchema: { schema },
  settings: {
    retryPolicy: {
      transport: { maxRetries: 2, baseDelayMs: 1000 },
      structuredOutput: { maxRetries: 0 },
      content: { maxRetries: 0 }
    },
    onRetryAttempt: (event) => {
      // event.retryClass, event.reason, event.usageAmbiguous, event.delayMs, …
    }
  }
});
```

When `retryPolicy` is set, omitted classes default to `0`.

| Class | Consumes ceiling for |
| --- | --- |
| `transport` | DNS/network/socket timeouts, retryable HTTP (408/429/5xx) |
| `structuredOutput` | `StructuredOutputError.reason` (optionally filtered by `retryReasons`) |
| `content` | Content-quality retries; hard-disabled by `shouldRetryDueToContent: false` |

Cancellation / abort is never retried. Tool-loop `maxIterations` stays independent of these ceilings.

Terminal typed errors keep `retryHistory` and their classification:

- `StructuredOutputError` — structured-output / schema failures
- `ProviderTransportError` — transport class (`usageAmbiguous` for timeouts after possible provider acceptance)
- `ProviderHttpError` — non-retryable provider HTTP / rejection (for example HTTP 400). Remains non-retryable, is **not** relabeled as transport, and preserves `cause` plus usable `status` / `providerCode` / `requestId` (from `requestId`, SDK `requestID`, or `request_id`) when supplied. OpenAI adapter mappings keep the original SDK exception as `cause` (and copy the same bounded identity fields) so RetryManager can surface them on the terminal error. `retryHistory` is `[]` when the failure was rejected on the first try. CallLLM does not invent usage or infer zero charge from HTTP 400.

Streaming: the same classifier and policy apply to **stream acquisition** (`StreamingService`).
Final-chunk structured-output soft-attach does not auto re-stream (avoids duplicating tool work).

## Exponential Backoff

The default retry manager uses exponential backoff with a base delay of 1000 ms
(`transport.baseDelayMs` when set on the policy):

- retry 1: about 1 second
- retry 2: about 2 seconds
- retry 3: about 4 seconds

Provider rate limits, transient network failures, and server errors are typical transport
retry candidates. Authentication, invalid request, and capability errors should be fixed
rather than retried.

## JSON Validation Retries

When a response fails JSON parsing or schema validation, retries consume the
**structuredOutput** ceiling (or legacy shared `maxRetries`). Each retry replays the same
request. The prior validation error is not injected back into the prompt. The terminal
failure is a `StructuredOutputError` that still carries `reason`, usage, model, and
`retryHistory`. See [Structured Output](./structured-output.md) and
[Errors and Troubleshooting](./errors-and-troubleshooting.md).

## Content Retries

`shouldRetryDueToContent` controls retries for incomplete or invalid model content, separate from network/provider retries. It applies to both `call()` and `stream()`; the default is `true`. Set it to `false` to return empty or refusal-like content to the caller instead of converting it into a retry failure (even if `retryPolicy.content.maxRetries > 0`):

```ts
await caller.call('Return valid JSON.', {
  responseFormat: 'json',
  settings: {
    shouldRetryDueToContent: true
  }
});
```

## Rate-Limit Guidance

For large chunked requests, `maxParallelRequests` controls concurrency:

```ts
await caller.call('Analyze each record.', {
  data: records,
  maxParallelRequests: 2
});
```

Lower concurrency if a provider returns rate-limit errors.
