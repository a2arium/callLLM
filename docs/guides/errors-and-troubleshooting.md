# Errors and Troubleshooting

LLM applications fail in predictable ways: bad credentials, unsupported models, provider rate limits, invalid JSON, tool failures, and missing media dependencies. This page maps those failures to what you should do.

## Common Failures

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| API key error | missing or invalid provider key | set the provider env var or pass `apiKey` / `providerApiKeys` |
| `ProviderNotFoundError` | unknown provider key | use one of `openai`, `gemini`, `openrouter`, `cerebras`, `venice` |
| `ModelNotFoundError` | model not in provider scope | check spelling or provider scope |
| `AmbiguousModelError` | exact model exists in multiple providers | use `{ provider, model }` |
| `ModelSelectionConfigError` | invalid selection object | use a preset, exact model, or non-empty policy |
| `ModelResolutionError` | no model satisfies requirements/constraints | inspect provider scope, request requirements, constraints |
| `CapabilityError` | exact model lacks required capability | choose capable exact model or use a preset/policy |
| invalid `contentObject` | model returned invalid JSON | inspect `content`, `validationErrors`, schema, and prompt |
| tool failure | tool threw or returned invalid result | validate tool args and handle tool exceptions |
| `TranscriptionFfmpegError` | `ffmpeg`/`ffprobe` missing for audio splitting/transcoding | install ffmpeg and ensure it is on `PATH` |

## Model Resolution Errors

Dynamic model selection errors are designed to be actionable. They include:

- provider scope
- capabilities required by request
- rejected candidates and reasons

Example fixes:

```ts
// Too strict: may reject all image models
new LLMCaller(['openai', 'gemini'], {
  preset: 'cheap',
  constraints: { maxImagePricePerImage: 0.001 }
});

// Relax the constraint or use an exact image-capable model
new LLMCaller(['openai', 'gemini'], {
  preset: 'cheap',
  constraints: { maxImagePricePerImage: 0.05 }
});
```

## Exact Model Capability Errors

Exact models do not auto-switch:

```ts
const caller = new LLMCaller('openai', { model: 'gpt-5-mini' });
await caller.embeddings({ input: 'hello' }); // fails if model is not embedding-capable
```

Fix:

```ts
const caller = new LLMCaller('openai', 'cheap');
await caller.embeddings({ input: 'hello' });
```

Or pin an exact embedding model:

```ts
await caller.embeddings({
  input: 'hello',
  model: 'text-embedding-3-small'
});
```

## JSON Validation

```ts
const result = await caller.call('Return JSON.', {
  jsonSchema: { name: 'Result', schema },
  responseFormat: 'json'
});

const first = result[0];
if (!first.contentObject) {
  console.error(first.content);
  console.error(first.metadata?.validationErrors);
}
```

Fixes:

- simplify the schema
- add clearer field descriptions
- use `jsonMode: 'native-only'` if native JSON is required
- use a more capable model or `premium` preset
- handle validation errors as part of your app flow

## Audio and ffmpeg

`ffmpeg`/`ffprobe` are required for:

- large local transcription splitting
- speech output transcoding when provider output format differs from requested format
- audio duration estimation where needed

Install:

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install ffmpeg
```

Verify:

```bash
ffmpeg -version
ffprobe -version
```

The Node process must see both commands on `PATH`.

## Noisy Logs

Set:

```env
LOG_LEVEL=error
OPIK_LOG_LEVEL=ERROR
```

Remember:

- `LOG_LEVEL` only controls framework logger output
- examples may print streamed tokens and usage intentionally
- telemetry SDKs may need their own log variables
- disabling telemetry providers is the quietest option for local experiments

## Provider Rate Limits

Retries use exponential backoff for retryable provider errors. Configure:

```ts
const caller = new LLMCaller('openai', 'gpt-5-mini', 'You are helpful.', {
  settings: { maxRetries: 3 }
});
```

For chunked large inputs, reduce `maxParallelRequests` if you hit rate limits:

```ts
await caller.call('Analyze these records.', {
  data,
  maxParallelRequests: 2
});
```
