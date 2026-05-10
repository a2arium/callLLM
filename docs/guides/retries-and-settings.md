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
await caller.call('Use a different model for this request.', {
  settings: {
    providerOptions: {
      model: 'gpt-5-mini'
    }
  }
});
```

This override is treated as an exact model inside the constructor provider scope. It is not interpreted as a preset and is still validated against the request requirements.

Prefer constructor model selection for new code:

```ts
new LLMCaller('openai', { model: 'gpt-5-mini' });
```

## Retry Behavior

`callllm` retries retryable provider failures with exponential backoff.

```ts
const caller = new LLMCaller('openai', 'gpt-5-mini', 'You are helpful.', {
  settings: {
    maxRetries: 3
  }
});
```

Regular calls:

1. Attempt provider call
2. If the error is retryable, wait with backoff
3. Retry up to `maxRetries`
4. Throw the final error if all attempts fail

Streaming calls have two retry surfaces:

- initial stream creation can be retried
- mid-stream failures can be retried by the stream retry wrapper where supported

## Exponential Backoff

The default retry manager uses exponential backoff with a base delay of 1000 ms:

- retry 1: about 1 second
- retry 2: about 2 seconds
- retry 3: about 4 seconds

Provider rate limits, transient network failures, and server errors are typical retry candidates. Authentication, invalid request, schema, and capability errors should be fixed rather than retried.

## Content Retries

`shouldRetryDueToContent` controls retries for incomplete or invalid model content, separate from network/provider retries:

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
