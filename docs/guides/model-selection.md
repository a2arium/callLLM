# Model Selection

`callllm` lets you choose a model in three ways:

- exact model: use one model and fail if it cannot do the request
- preset: use a human-friendly goal such as `fast` or `cheap`
- policy: combine a preset with preferences and hard constraints

The key idea is that dynamic selection happens at request time, after the framework knows what the request needs.

## Exact Models

Use exact models when identity matters:

```ts
const caller = new LLMCaller('openai', 'gpt-5-mini');
```

Equivalent explicit form:

```ts
const caller = new LLMCaller('openai', { model: 'gpt-5-mini' });
```

Exact model rules:

- exact models are not scored
- exact models are not silently replaced
- exact models are still validated against request requirements
- `{ model: 'fast' }` means an exact model named `fast`, not the `fast` preset

With multiple providers, exact model strings must be unambiguous. If two providers expose the same model name, use:

```ts
const caller = new LLMCaller(['openai', 'openrouter'], {
  provider: 'openai',
  model: 'gpt-5-mini'
});
```

## Presets

```ts
new LLMCaller(['openai', 'gemini'], 'cheap');
new LLMCaller(['openai', 'gemini'], 'fast');
new LLMCaller(['openai', 'gemini'], 'balanced');
new LLMCaller(['openai', 'gemini'], 'premium');
```

Preset intent:

| Preset | Optimizes for |
| --- | --- |
| `cheap` | low cost, with some quality |
| `fast` | low latency and high throughput |
| `balanced` | production default across cost, speed, and quality |
| `premium` | quality and context over cost |

Presets are capability-aware:

```ts
const caller = new LLMCaller(['openai', 'gemini'], 'fast');

await caller.call('Summarize this note.');
await caller.call({ text: 'Create an icon.', output: { image: { size: '1024x1024' } } });
await caller.embeddings({ input: 'Text to embed' });
await caller.synthesizeSpeech({ input: 'Done.', voice: 'alloy', responseFormat: 'mp3' });
```

Each operation can resolve to a different model because each operation has different hard requirements.

## Policies

Policies add hard constraints and soft preferences:

```ts
const caller = new LLMCaller(['openai', 'gemini'], {
  preset: 'balanced',
  prefer: {
    cost: 0.3,
    latency: 0.2,
    throughput: 0.1,
    quality: 0.4
  },
  constraints: {
    maxOutputPricePerMillion: 5,
    minContextTokens: 32000
  },
  resolution: { explain: true }
});
```

Preferences:

- are soft scoring inputs
- do not reject models by themselves
- do not need to add up to `1`; the framework normalizes them

Constraints:

- are hard filters
- reject models before scoring
- produce a clear error if no candidate remains

Supported constraints:

```ts
type ModelConstraints = {
  maxInputPricePerMillion?: number;
  maxOutputPricePerMillion?: number;
  maxImagePricePerImage?: number;
  maxVideoPricePerSecond?: number;
  maxAudioPricePerSecond?: number;
  maxTtsPricePerMillionChars?: number;
  minQuality?: number;
  minContextTokens?: number;
  minOutputTokens?: number;
  allowedModels?: string[];
  excludedModels?: string[];
  allowPreviewModels?: boolean;
  allowDeprecatedModels?: boolean;
  allowUncensoredModels?: boolean;
};
```

Provider constraints such as `allowedProviders` and `excludedProviders` are intentionally not supported. The constructor provider scope is the provider boundary.

## Resolution Metadata

Stable metadata is present on every response:

```ts
const response = await caller.call('Hello');

console.log(response[0].metadata?.provider);
console.log(response[0].metadata?.model);
console.log(response[0].metadata?.selectionMode);
```

Enable diagnostic explanations with `resolution.explain`:

```ts
const caller = new LLMCaller(['openai', 'gemini'], {
  preset: 'balanced',
  resolution: { explain: true }
});

const response = await caller.call('Summarize this.');
console.log(response[0].metadata?.modelResolution);
```

`modelResolution` may include selected model, request requirements, constraints, candidates, scores, and rejection reasons. Treat it as diagnostic; candidate scores can change as catalogs improve.

## What Counts as a Request Requirement?

| Request | Hard requirement |
| --- | --- |
| `call()` | text output |
| `stream()` | streaming |
| `jsonSchema` or `responseFormat: 'json'` | JSON output |
| `tools` | tool calling |
| `file` / `files` | image input |
| `output.image` | image output |
| `output.video` | video output |
| `embeddings()` | embeddings |
| `transcribe()` | audio transcription |
| `translateAudio()` | audio translation |
| `synthesizeSpeech()` | speech synthesis |
| `settings.reasoning` | reasoning |

## Failure Behavior

If an exact model cannot satisfy the request, the call fails:

```ts
const caller = new LLMCaller('openai', { model: 'gpt-5-mini' });

await caller.embeddings({ input: 'hello' }); // fails if model is not embedding-capable
```

If dynamic selection finds no valid candidate, `ModelResolutionError` explains:

- provider scope
- requirements inferred from the request
- rejected candidates and reasons

This is deliberate. The framework should not guess outside the provider scope or silently drop capabilities.
