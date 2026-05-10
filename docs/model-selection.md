# Model Selection API Spec

## Status

Proposed.

This document specifies a runtime model selection system for `LLMCaller` that preserves the current simple constructor usage while adding dynamic, capability-aware selection across one or more providers.

## Current Framework Context

The framework currently exposes `LLMCaller` as the main public API:

```ts
new LLMCaller(providerName, modelOrAlias, systemMessage?, options?)
```

Current provider names are the adapter registry keys:

```ts
'openai' | 'cerebras' | 'venice' | 'openrouter' | 'gemini'
```

Each adapter has its own model catalog in `src/adapters/<provider>/models.ts`. A `ModelInfo` contains prices, token limits, capabilities, and model characteristics:

```ts
type ModelInfo = {
  name: string;
  canonicalSlug?: string;
  isUncensored?: boolean;
  inputPricePerMillion: number;
  inputCachedPricePerMillion?: number;
  imageInputPricePerMillion?: number;
  outputPricePerMillion: number;
  imageOutputPricePerMillion?: number;
  videoPricePerSecond?: number;
  imagePricePerImage?: number;
  audioInputPricePerMillion?: number;
  audioOutputPricePerMillion?: number;
  audioPricePerSecond?: number;
  ttsPricePerMillionChars?: number;
  transcriptionMaxFileBytes?: number;
  transcriptionMaxDurationSeconds?: number;
  maxRequestTokens: number;
  maxResponseTokens: number;
  tokenizationModel?: string;
  capabilities?: ModelCapabilities;
  characteristics: {
    qualityIndex: number;
    outputSpeed: number;
    firstTokenLatency: number;
  };
};
```

Current aliases are:

```ts
'cheap' | 'balanced' | 'fast' | 'premium'
```

Today these are resolved by `ModelSelector` inside a single provider catalog. The new system should turn them into dynamic selection presets that are resolved at request time after the framework infers required capabilities from the actual operation.

## Problem

The current implementation stores a model or alias before the request shape is known. That makes aliases too static. For example, `fast` should mean:

- fastest valid chat model for a normal text call
- fastest valid streaming model for `stream`
- fastest valid JSON-capable model for native JSON output
- fastest valid image generation model for `output.image`
- fastest valid embedding model for `embeddings`
- fastest valid transcription model for `transcribe`
- fastest valid video model for `output.video`

The framework needs one shared resolver that applies:

1. provider scope
2. exact model identity or dynamic selection policy
3. request-inferred hard requirements
4. user hard constraints
5. preset and preference scoring
6. deterministic tie-breaking

## Goals

- Preserve existing constructor shape, including `systemMessage` and `options`.
- Preserve exact model strings.
- Preserve current alias strings as dynamic presets.
- Add object selection for explicit exact models and advanced policies.
- Support one provider or multiple providers.
- Infer required capabilities from `call`, `stream`, image, video, audio, embeddings, JSON, tools, and reasoning options.
- Validate exact models against request requirements.
- Make dynamic selection deterministic and inspectable.
- Improve error messages when no model satisfies a request.
- Avoid requiring users to manually declare obvious capabilities.

## Non-Goals

- Do not replace the `LLMCaller` constructor with a single full config object.
- Do not expose provider-specific API details as common selection concepts.
- Do not add custom user scoring functions in the first version.
- Do not make weighted aliases like `{ cheap: 40, fast: 60 }` the main API.
- Do not silently route to providers outside the user-specified provider scope.
- Do not add fallback routing in v1. Model selection answers "which model should this request use"; fallback answers "what should happen if that selected model fails". Those are separate concerns.
- Do not add runtime provider health scoring in v1. Static catalog metadata is enough for the first implementation.

## Core Invariants

1. The first constructor argument defines the maximum provider scope.
2. Provider filters, if added later, can only narrow provider scope and can never expand it.
3. String values matching built-in presets are dynamic presets.
4. Other string values are exact model names.
5. `{ model }` always means exact model selection.
6. Exact model selection never falls back or auto-replaces the selected model.
7. Dynamic selection always resolves at request time.
8. Capabilities inferred from the request are hard requirements.
9. User constraints are hard filters.
10. User preferences are soft scoring inputs.
11. The selected model identity is always provider-qualified.
12. Model selection is deterministic.
13. Empty selection objects are invalid. Use `'balanced'` or `{ preset: 'balanced' }` explicitly.

## Public API

### Constructor

```ts
type ProviderScope = RegisteredProviders | RegisteredProviders[];

type ModelOrSelection =
  | string
  | ExactModelSelection
  | DynamicModelSelection;

class LLMCaller {
  constructor(
    provider: ProviderScope,
    modelOrSelection: ModelOrSelection,
    systemMessage?: string,
    options?: LLMCallerOptions
  );
}
```

### Exact Model Selection

```ts
type ExactModelSelection = {
  model: string;
  provider?: RegisteredProviders;
};
```

Examples:

```ts
new LLMCaller('openai', 'gpt-5-mini')
new LLMCaller('openai', { model: 'gpt-5-mini' })
new LLMCaller(['openai', 'gemini'], { provider: 'openai', model: 'gpt-5-mini' })
```

Rules:

- A string that is not a preset is treated as exact model selection.
- `{ model }` always means exact model selection, even if the model name collides with a preset.
- With a single provider, `{ model }` searches that provider.
- With multiple providers, `{ model }` is valid only if exactly one provider has that model name. If ambiguous, require `{ provider, model }`.
- Exact models are not scored.
- Exact models are still validated against inferred request requirements.

### Dynamic Selection

```ts
type ModelPreset =
  | 'cheap'
  | 'fast'
  | 'balanced'
  | 'premium';

type PreferenceDimension =
  | 'cost'
  | 'latency'
  | 'throughput'
  | 'quality'
  | 'context';

type ModelPreferences = Partial<Record<PreferenceDimension, number>>;

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

type ModelResolutionOptions = {
  explain?: boolean;
};

type DynamicModelSelection = {
  preset?: ModelPreset;
  prefer?: ModelPreferences;
  constraints?: ModelConstraints;
  resolution?: ModelResolutionOptions;
};
```

Examples:

```ts
new LLMCaller('openai', 'fast')

new LLMCaller(['openai', 'gemini'], 'balanced')

new LLMCaller(['openai', 'gemini'], {
  preset: 'fast',
  prefer: {
    cost: 0.25
  },
  constraints: {
    maxOutputPricePerMillion: 5,
    minQuality: 70
  }
})
```

Rules:

- Presets are dynamic policies, not fixed aliases.
- If a dynamic selection object omits `preset`, default to `balanced`.
- Empty selection objects are invalid. `new LLMCaller('openai', {})` should throw a `ModelSelectionConfigError`.
- `prefer` overlays preset weights.
- Weights do not need to add up to 1; normalize internally.
- Constraints are hard filters.
- Preferences are soft scoring dimensions.
- Provider scope is defined by the first constructor argument. Provider constraints are intentionally omitted from v1 because they duplicate provider scope and create conflict cases.

Valid object examples:

```ts
new LLMCaller('openai', { preset: 'balanced' })
new LLMCaller('openai', { prefer: { cost: 0.7 } })
new LLMCaller('openai', { constraints: { maxOutputPricePerMillion: 5 } })
```

Invalid object examples:

```ts
new LLMCaller('openai', {})
```

Internal normalization should use a discriminated shape:

```ts
type NormalizedModelSelection =
  | {
      mode: 'exact';
      provider?: RegisteredProviders;
      model: string;
    }
  | {
      mode: 'dynamic';
      preset: ModelPreset;
      prefer: ModelPreferences;
      constraints: ModelConstraints;
      resolution: ModelResolutionOptions;
    };
```

Constructor parsing is the only place where string/object ambiguity should exist.

## String Resolution Rules

```ts
new LLMCaller(provider, value)
```

If `value` is one of:

```ts
'cheap' | 'fast' | 'balanced' | 'premium'
```

then treat it as a dynamic preset.

Otherwise, treat it as an exact model name.

For exact model strings in multi-provider scope:

1. If zero providers contain the model, throw `ModelNotFoundError`.
2. If exactly one provider contains the model, use that provider/model.
3. If more than one provider contains the model, throw `AmbiguousModelError` and require `{ provider, model }`.

Example:

```ts
new LLMCaller(['openai', 'openrouter'], 'gpt-5-mini')
```

If both providers expose `gpt-5-mini`, this must not silently choose one.

To force exact mode for a model whose name is also a preset:

```ts
new LLMCaller('some-provider', { model: 'fast' })
```

## Internal Candidate Identity

Because multi-provider selection is required, model identity must be provider-qualified internally:

```ts
type ModelCandidate = {
  provider: RegisteredProviders;
  model: ModelInfo;
};
```

Resolved model identity:

```ts
type ResolvedModel = {
  provider: RegisteredProviders;
  model: string;
  modelInfo: ModelInfo;
  mode: 'exact' | 'preset' | 'policy';
  resolution?: ModelResolution;
};
```

## Resolver Pipeline

```ts
function resolveModel(input: ResolveModelInput): ResolvedModel {
  const providers = normalizeProviderScope(input.providerScope);
  const selection = normalizeModelSelection(input.modelOrSelection);
  const candidates = loadProviderCatalogs(providers);
  const requirements = inferRequirements(input.operation, input.request);

  if (selection.mode === 'exact') {
    return validateExactModel(candidates, selection, requirements);
  }

  const policy = normalizePolicy(selection);
  const requirementFiltered = filterByRequirements(candidates, requirements);
  const constraintFiltered = filterByConstraints(requirementFiltered, policy.constraints);
  const scored = scoreCandidates(constraintFiltered, policy);

  return selectDeterministically(scored);
}
```

Required order:

1. Normalize provider scope.
2. Load all allowed provider catalogs.
3. Infer operation requirements from the actual request.
4. For exact selection, locate and validate exact model.
5. For dynamic selection, filter by inferred requirements.
6. Apply explicit constraints.
7. Score using preset plus user preferences.
8. Tie-break deterministically.
9. Return selected provider/model and optional explanation.

## Request Requirement Model

The existing `CapabilityRequirement` should be expanded or replaced by an internal request requirement shape that maps cleanly to existing `ModelCapabilities`:

```ts
type RequestRequirements = {
  textInput?: true;
  textOutput?: {
    required: boolean;
    formats?: ('text' | 'json')[];
    nativeJsonRequired?: boolean;
    structuredOutputsRequired?: boolean;
  };
  imageInput?: {
    required: boolean;
    formats?: string[];
  };
  imageOutput?: {
    required: boolean;
    operations?: ('generate' | 'edit' | 'editWithMask')[];
  };
  audioInput?: {
    required: boolean;
    formats?: string[];
  };
  audioOutput?: {
    required: boolean;
    formats?: string[];
  };
  videoOutput?: {
    required: boolean;
    size?: string;
    seconds?: number;
    variant?: 'video' | 'thumbnail' | 'spritesheet';
  };
  embeddings?: {
    required: boolean;
    dimensions?: number;
    encodingFormat?: 'float' | 'base64';
  };
  audioApi?: {
    required: boolean;
    operations?: ('transcribe' | 'translate' | 'synthesize')[];
    inputFormat?: string;
    outputFormat?: string;
    voice?: string;
  };
  toolCalls?: {
    required: boolean;
    streaming?: boolean;
    parallel?: boolean;
  };
  streaming?: {
    required: boolean;
  };
  reasoning?: {
    required: boolean;
  };
  tokenBudget?: {
    estimatedInputTokens?: number;
    requestedOutputTokens?: number;
  };
  providerInterfaces?: {
    imageCall?: boolean;
    videoCall?: boolean;
    embeddingCall?: boolean;
    audioCall?: boolean;
  };
};
```

## Capability Inference Matrix

| Operation | Current API / Signal | Requirements |
| --- | --- | --- |
| Non-streaming text chat | `call('text')` or `call({ text })` | `textInput`, `textOutput:text` |
| Streaming text chat | `stream('text')` or `stream({ text })` | `textInput`, `textOutput:text`, `streaming` |
| JSON text output | `responseFormat: 'json'` | If `jsonMode: 'native-only'`, require `textOutput:json`. If `fallback` or omitted, prefer JSON but allow prompt fallback. If `force-prompt`, require text only. |
| JSON schema output | `jsonSchema` | Same as JSON text output; if future strict schema mode is added, require `structuredOutputs`. |
| Tool calling, non-streaming | effective tools after local/MCP resolution | `toolCalls.nonStreaming` |
| Tool calling, streaming | `stream(..., { tools })` or tool orchestrator streaming path | `streaming`, `toolCalls` with `streamingMode !== 'none'` unless stream can tolerate `onComplete` |
| Parallel tools | future explicit parallel setting or `needsParallelToolCalls` | `toolCalls.parallel` or legacy `parallelToolCalls` |
| Image input to chat | `file`, `files`, or image placeholders without `output.image` | `imageInput`, `textOutput:text` |
| Image generation | `output.image` without file/mask | `imageOutput.generate`, provider `imageCall` |
| Image edit | `output.image` plus one `file` or one `files` item | `imageInput`, `imageOutput.edit`, provider `imageCall` |
| Image composite edit | `output.image` plus multiple files | `imageInput`, `imageOutput.edit`, provider `imageCall` |
| Masked image edit | `output.image` plus `mask` | `imageInput`, `imageOutput.editWithMask`, provider `imageCall` |
| Video generation | `output.video` | `videoOutput`, provider `videoCall` |
| Video from image | `output.video` plus `file` or `files[0]` | `videoOutput`, `imageInput`, provider `videoCall` |
| Embeddings | `embeddings({ input })` | `embeddings`, provider `embeddingCall` |
| Embedding dimensions | `embeddings({ dimensions })` | embedding capability includes requested dimension, if model declares dimensions |
| Embedding encoding format | `embeddings({ encodingFormat })` | embedding capability includes requested format, if model declares formats |
| Audio transcription | `transcribe({ file })` | `audioApi.transcribe`, provider `audioCall` |
| Audio translation | `translateAudio({ file })` | `audioApi.translate`, provider `audioCall` |
| Speech synthesis | `synthesizeSpeech({ input, voice })` | `audioApi.synthesize`, provider `audioCall`; requested output format is normalized after provider response, using native output or ffmpeg transcoding |
| Reasoning | `settings.reasoning` | `reasoning` |
| Verbosity | `settings.verbosity` | No hard requirement initially; adapters map where supported |
| Token budget | `settings.maxTokens`, processed prompt/history size | model `maxRequestTokens` and `maxResponseTokens` |
| Chunking | request processor returns multiple chunks | selected model must satisfy per-chunk text/tool/json requirements; chunk controller must receive resolved model |
| History dynamic mode | `historyMode: 'dynamic'` | selected model token limits guide truncation |

## Provider Interface Requirements

Capabilities in `ModelInfo` are necessary but not sufficient for provider-level operations. The selected provider adapter must also implement the required provider interface:

- image operations require `ProviderManager.supportsImageGeneration()` / adapter `imageCall`
- video operations require `ProviderManager.supportsVideoGeneration()` / adapter `videoCall`
- embeddings require adapter `embeddingCall`
- audio operations require adapter `audioCall`

In multi-provider selection, interface support must be checked per provider candidate, not against the currently active provider only.

## Presets

Presets should be implemented as ordinary policy defaults:

```ts
const MODEL_SELECTION_PRESETS = {
  cheap: {
    prefer: {
      cost: 0.75,
      quality: 0.15,
      latency: 0.10
    }
  },
  fast: {
    prefer: {
      latency: 0.45,
      throughput: 0.40,
      cost: 0.10,
      quality: 0.05
    }
  },
  balanced: {
    prefer: {
      quality: 0.35,
      cost: 0.25,
      latency: 0.20,
      throughput: 0.20
    }
  },
  premium: {
    prefer: {
      quality: 0.80,
      context: 0.10,
      latency: 0.10
    }
  }
};
```

Public intent:

- `cheap`: prefer low-cost models while avoiding very weak models.
- `fast`: prefer low first-token latency and high throughput.
- `balanced`: default general-purpose production policy.
- `premium`: prefer highest quality among models that satisfy the request.

The exact weights are implementation details and may be tuned.

## Preference Overlay

User preferences override preset weights by dimension, then the final set is normalized:

```ts
finalPreferences = normalizeWeights({
  ...preset.prefer,
  ...user.prefer
});
```

Example:

```ts
new LLMCaller(['openai', 'gemini'], {
  preset: 'fast',
  prefer: {
    cost: 0.25
  }
})
```

Meaning: use the `fast` preset, but make cost more important than it normally is.

## Scoring Dimensions

All scoring dimensions should be normalized to `0..1`, where higher is better.

### Cost

Use the most relevant cost estimate for the operation:

- text chat: blend `inputPricePerMillion` and `outputPricePerMillion`
- cached-heavy requests: include `inputCachedPricePerMillion` when known
- image input: include `imageInputPricePerMillion` if present
- image generation: prefer `imagePricePerImage`, fallback to `imageOutputPricePerMillion`
- video: prefer `videoPricePerSecond`
- transcription: prefer `audioPricePerSecond`, fallback to `audioInputPricePerMillion`
- speech: prefer `ttsPricePerMillionChars`, fallback to audio output prices
- embeddings: use input price and embedding-specific metadata if present

When estimated token/media usage is unknown, use a stable blended default appropriate for the operation.

### Scoring Normalization

Scoring must be deterministic and must not depend on candidate iteration order.

For each scoring dimension:

1. Compute a raw value for every candidate where the value is meaningful.
2. Mark unavailable values as `unknown`.
3. Normalize known values to `0..1` across the post-requirement, post-constraint candidate set.
4. For "lower is better" dimensions such as cost and latency, invert after normalization so higher scores are always better.
5. Assign unknown values a neutral score of `0.5`, except where the operation makes the dimension irrelevant.

Normalization:

```ts
function normalizeHigherIsBetter(value, min, max) {
  if (max === min) return 1;
  return (value - min) / (max - min);
}

function normalizeLowerIsBetter(value, min, max) {
  if (max === min) return 1;
  return 1 - ((value - min) / (max - min));
}
```

Dimension relevance by operation:

- text, JSON, tools, and reasoning: all dimensions are relevant
- embeddings: cost, latency, quality, and context are relevant; throughput is neutral unless catalog data is meaningful
- image generation/editing: cost and quality are relevant; latency/throughput are neutral unless catalog data is meaningful and non-placeholder
- video generation: cost and quality are relevant; latency/throughput are neutral unless catalog data is meaningful and non-placeholder
- audio transcription/translation/speech: cost, latency, and quality are relevant; throughput/context are neutral unless catalog data is meaningful

Placeholder media values:

- `firstTokenLatency === 0` is treated as unknown for non-text media operations
- `outputSpeed === 0` is treated as unknown for non-text media operations
- `qualityIndex === 0` is treated as known only if the catalog explicitly marks the model as low quality; otherwise media-only catalogs should avoid placeholder zero quality values

Default text cost estimate:

When no request-specific token estimate is available, use a stable default blend:

```ts
textCost = (inputPricePerMillion * 0.4) + (outputPricePerMillion * 0.6)
```

If token estimates are available:

```ts
textCost = (
  inputPricePerMillion * estimatedInputTokens +
  outputPricePerMillion * estimatedOutputTokens
) / max(estimatedInputTokens + estimatedOutputTokens, 1)
```

Media cost estimates:

- image generation: `imagePricePerImage`, fallback to `imageOutputPricePerMillion`, fallback to `outputPricePerMillion`
- image input chat: `imageInputPricePerMillion`, fallback to `inputPricePerMillion`
- video: `videoPricePerSecond`, fallback to `outputPricePerMillion`
- transcription: `audioPricePerSecond`, fallback to `audioInputPricePerMillion`, fallback to `inputPricePerMillion`
- speech: `ttsPricePerMillionChars`, fallback to `audioOutputPricePerMillion`, fallback to `outputPricePerMillion`
- embeddings: `inputPricePerMillion`

If the operation-relevant price is unknown and no constraint requires it, cost score is neutral. If a matching price constraint is present, missing price metadata rejects the candidate.

### Latency

Use `characteristics.firstTokenLatency`, lower is better.

For media jobs where first-token latency is not meaningful, use operation-specific metadata if added later. Until then, avoid giving latency too much influence for video/image-only models with `0` placeholder values.

### Throughput

Use `characteristics.outputSpeed`, higher is better.

For non-text media models, treat throughput as unknown unless the catalog provides meaningful values.

### Quality

Use `characteristics.qualityIndex`.

Provider catalogs must keep quality values comparable enough for cross-provider ranking. If this is not reliable, cross-provider quality ranking should be documented as approximate.

### Context

Use `maxRequestTokens`, optionally including `maxResponseTokens` where output length matters.

## Deterministic Tie-Breaking

Model selection must be deterministic. After scoring, sort candidates by:

1. higher total score
2. higher quality score
3. lower estimated operation cost
4. lower first-token latency
5. provider order from the constructor provider scope
6. lexicographic model name

Provider order is a light implicit preference and does not require a separate `providerPriority` option in v1.

## Constraints

Constraints reject candidates before scoring:

- price ceilings
- minimum quality
- minimum context
- minimum output tokens
- allowed/excluded models
- preview/deprecated/uncensored policy

If no candidates remain after constraints, throw a `ModelSelectionError` with rejection explanations.

Provider constraints are not part of v1. The constructor provider scope is the provider filter:

```ts
new LLMCaller(['openai', 'gemini'], 'balanced')
```

If provider narrowing is added later, it must only intersect with the constructor provider scope and must never expand it.

`maxBlendedPricePerMillion` is intentionally excluded from v1. Blended pricing is ambiguous without a concrete request-cost estimation model. Use explicit unit constraints first:

- `maxInputPricePerMillion`
- `maxOutputPricePerMillion`
- `maxImagePricePerImage`
- `maxVideoPricePerSecond`
- `maxAudioPricePerSecond`
- `maxTtsPricePerMillionChars`

Missing metadata policy:

- Required capability metadata missing means unsupported, except for documented backward-compatible defaults.
- Missing optional price metadata means the corresponding price-specific constraint cannot be evaluated and should reject that candidate when the constraint is present.
- Missing preview/deprecated metadata means the model is treated as not preview/deprecated.
- Missing `isUncensored` means the model is treated as not uncensored.

Safety defaults:

- `allowPreviewModels` defaults to `true` for now because current catalogs include preview models as normal selectable entries.
- `allowDeprecatedModels` defaults to `false` once deprecated metadata exists.
- `allowUncensoredModels` defaults to `false`; candidates with `isUncensored: true` are excluded unless explicitly allowed.

## Exact Model Validation

Exact model selection must not score or auto-replace the model. It must:

1. locate the model in provider scope
2. validate provider interface support
3. validate inferred requirements
4. validate token limits
5. throw a clear `CapabilityError` or `ModelSelectionError` if invalid

No fallback should occur for exact models unless a future explicit fallback policy is added.

Future fallback policy should be separate from model selection:

```ts
type FallbackPolicy = {
  enabled: boolean;
  maxAttempts?: number;
  fallbackPreset?: ModelPreset;
  retryOn?: Array<'rate_limit' | 'timeout' | 'server_error'>;
};
```

## Runtime Integration Points

The resolver should be called at the last responsible moment, after request options are normalized and enough information is known to infer requirements.

### `call`

Currently `call` handles:

- video short-circuit
- image operation short-circuit
- regular chat
- chunked processing
- telemetry
- tools
- history

Required changes:

- infer video requirements before video short-circuit
- infer image requirements before image short-circuit
- infer chat/json/tool/image-input requirements before request processing
- use resolved model for `RequestProcessor`
- use resolved model in `buildChatParams`
- use resolved model in chunk controllers
- attach selected provider/model metadata to responses

### `stream`

Currently `stream` handles:

- streaming chat
- video short-circuit
- image-related validation
- chunked streaming

Required changes:

- infer `streaming` for normal streaming
- infer streaming tool-call requirements when tools are present
- avoid selecting image/video-only models for normal streams
- use resolved model consistently in stream and chunk paths

### `embeddings`

Current code says aliases are not supported for embeddings, but then attempts capability-based resolution. New behavior should explicitly support dynamic selection:

- exact model: validate `embeddings`
- preset/policy: select embedding-capable model
- apply `dimensions` and `encodingFormat` requirements

### `transcribe`, `translateAudio`, `synthesizeSpeech`

Each audio method should resolve using its operation:

- `audio.transcribe`
- `audio.translate`
- `audio.synthesize`

Exact model validation should check declared audio operation support and provider `audioCall`.

Speech output format is not a hard model-selection filter in v1. Providers can differ sharply here: for example, one provider may return MP3 natively while another returns PCM/L16. `synthesizeSpeech({ responseFormat })` should first use native output when available, then attempt local ffmpeg transcoding to the requested format. If ffmpeg/ffprobe are unavailable, the call should fail with the shared actionable FFmpeg error instead of silently saving bytes under the wrong extension.

### Image Operations

Image operation detection should be factored into a helper:

```ts
function inferImageOperation(opts: LLMCallOptions): 'generate' | 'edit' | 'editWithMask' | 'composite' | undefined
```

Mapping:

- `output.image` only: `generate`
- `output.image` plus one input file: `edit`
- `output.image` plus multiple files: `composite`, requiring `edit`
- `output.image` plus `mask`: `editWithMask`

### Video Operations

Video requirements should include:

- `output.video`
- requested `size`
- requested `seconds`
- requested `variant`
- `imageInput` if seeded by `file` or `files[0]`

The model catalog already supports `output.video.sizes`, `maxSeconds`, and `variants`.

### Tools and MCP

Tool requirements should be inferred after effective tools are known:

- constructor tools
- per-call tools
- tools loaded from `toolsDir`
- MCP server tools

This means tool resolution may need to happen before final model resolution for chat calls. For performance, the resolver can first infer a provisional tool requirement from `opts.tools?.length`, then refine once MCP schemas are loaded.

Required chat/tool resolution order:

1. Normalize request input and settings.
2. Resolve local function-folder tools and explicit per-call tool definitions.
3. Register/connect MCP servers needed for this call and fetch tool schemas, using the existing MCP schema cache.
4. Build the final effective tool list.
5. Infer tool requirements from the final effective tool list and whether the call is streaming.
6. Resolve provider/model.
7. Build chat params with the resolved provider/model.

If tool resolution fails for an MCP server, keep the current behavior decision for that failure mode. If the call continues without that server's tools, model selection must use the actually available final tool list, not the originally requested tool configuration.

### `settings.providerOptions.model`

The current code supports `settings.providerOptions.model` as a per-call model override in some call paths. This escape hatch conflicts with the new selection API because model identity should be expressed through `modelOrSelection` or future explicit per-call selection.

V1 behavior:

- Preserve `settings.providerOptions.model` for backward compatibility.
- Treat it as an exact model override inside the current constructor provider scope.
- Validate it against inferred request requirements.
- Do not score it or auto-replace it.
- If provider scope has multiple providers, apply the same ambiguity rules as exact model strings.
- Add a deprecation warning in docs recommending `{ model }` constructor selection or future per-call selection instead.

Future direction:

```ts
caller.call('...', {
  model: { provider: 'openai', model: 'gpt-5-mini' }
})
```

Do not add this per-call selection API in v1 unless implementation needs it to replace `settings.providerOptions.model`.

## Provider Routing for Multi-Provider Selection

Current `ProviderManager` owns one provider. Multi-provider selection will use a provider pool in v1.

### Provider Pool

Create a provider manager that can lazily instantiate adapters by provider:

```ts
class ProviderPool {
  getProvider(provider: RegisteredProviders): LLMProvider;
  supports(provider, interfaceName): boolean;
}
```

Each request receives a resolved provider/model and dispatches to that provider.

Provider pool requirements:

- instantiate providers lazily
- keep provider instances isolated
- support provider-specific API keys where available
- expose provider interface support per provider
- avoid mutating global active provider state during request execution
- work with concurrent requests
- work with streaming requests without provider switches
- allow telemetry to record the resolved provider/model per request

The switch-active-provider approach is rejected for v1 multi-provider support because it is risky for streaming, telemetry, concurrent calls, controller state, and per-provider adapter state.

## Observability

Every response should expose stable selected model identity:

```ts
metadata: {
  provider: RegisteredProviders;
  model: string;
  selectionMode: 'exact' | 'preset' | 'policy';
}
```

Optional explanation:

```ts
type ModelResolution = {
  selected: {
    provider: RegisteredProviders;
    model: string;
  };
  mode: 'exact' | 'preset' | 'policy';
  preset?: ModelPreset;
  inferredRequirements: string[];
  appliedConstraints: string[];
  candidates?: Array<{
    provider: RegisteredProviders;
    model: string;
    score?: number;
    selected?: boolean;
    rejected?: boolean;
    rejectionReasons?: string[];
    scores?: Partial<Record<PreferenceDimension, number>>;
  }>;
};
```

Full candidate explanations should be disabled by default and enabled by:

```ts
resolution: { explain: true }
```

Stability contract:

- `metadata.provider`, `metadata.model`, and `metadata.selectionMode` are stable public response metadata.
- `metadata.modelResolution` is diagnostic metadata. Candidate lists, score values, and rejection reason wording may change between versions.

## Error Design

Add a dedicated error:

```ts
class ModelSelectionError extends Error {
  providerScope: RegisteredProviders[];
  inferredRequirements: string[];
  constraints: string[];
  rejectedCandidates: Array<{
    provider: RegisteredProviders;
    model: string;
    reasons: string[];
  }>;
}
```

Error messages should include:

- provider scope
- selection mode and preset/policy
- capabilities required by the request
- explicit constraints
- closest rejected candidates with reasons

Example:

```txt
No model matched the selection policy.

Provider scope:
- openai
- gemini

Required by request:
- output.image.generate
- provider.imageCall

Explicit constraints:
- maxImagePricePerImage <= 0.03

Rejected candidates:
- openai/gpt-image-1: image price exceeds limit
- gemini/gemini-3.1-flash-image-preview: image price metadata unavailable for requested constraint
```

## Backward Compatibility

Existing usage remains valid:

```ts
new LLMCaller('openai', 'fast')
new LLMCaller('openai', 'cheap')
new LLMCaller('openai', 'balanced')
new LLMCaller('openai', 'premium')
new LLMCaller('openai', 'gpt-5-mini')
```

Semantic clarification:

- reserved preset strings are dynamic presets
- other strings are exact model names
- `{ model }` forces exact model mode
- object policy enables advanced dynamic selection
- empty object policies are invalid
- exact model strings in multi-provider scope must be unambiguous

Potential breaking behavior to avoid:

- Do not resolve constructor preset into a permanent concrete model.
- Do not silently switch exact models to satisfy capabilities.
- Do not require embedding/audio/image callers to manually pass capabilities.

## Migration Plan

### Phase 1: Shared Resolver, Single Provider

- Add model selection types.
- Add `ModelResolver`.
- Convert current aliases into preset policies.
- Keep current public behavior.
- Replace `ModelSelector.selectModel` usage in `ModelManager` or wrap it for compatibility.
- Add exact-model validation.
- Add runtime validation for empty selection objects and malformed policy objects.
- Add `ModelSelectionConfigError`, `ModelNotFoundError`, and `AmbiguousModelError`.

### Phase 2: Request Capability Inference

- Add inference helpers for `call`, `stream`, image, video, embeddings, audio, JSON, tools, reasoning.
- Replace `getResolvedModel()` call paths with per-request resolution.
- Remove static `ModelManager.getCapabilities` usage from request paths.
- Ensure chunking and history truncation use the resolved model.

### Phase 3: Policy Object

- Support `DynamicModelSelection`.
- Support `ExactModelSelection`.
- Support `prefer`, `constraints`, and `resolution.explain`.
- Add improved errors.

### Phase 4: Multi-Provider Catalogs

- Add provider-array support.
- Build provider-qualified candidate catalogs.
- Implement provider interface checks per candidate.
- Add provider pool.
- Enforce exact model ambiguity rules across provider scope.
- Preserve constructor provider order for deterministic tie-breaking.

### Phase 5: Response Metadata and Telemetry

- Add provider/model metadata to all response types.
- Add optional model resolution explanations.
- Ensure telemetry receives resolved provider/model for chat, stream, image, video, audio, and embeddings.

## Implementation Tickets

Implementation should proceed in dependency order. Each ticket should include focused unit tests before integration work continues.

### Ticket 1: Selection Types and Config Validation

Scope:

- add `ProviderScope`, `ExactModelSelection`, `DynamicModelSelection`, `ModelPreferences`, `ModelConstraints`, and `ModelResolutionOptions`
- add `NormalizedModelSelection`
- add parser for string/object selection values
- reject empty selection objects
- reject provider constraints in v1
- reject malformed `prefer`, `constraints`, and `resolution` objects
- add `ModelSelectionConfigError`

Acceptance:

- constructor parsing is the only place where string/object ambiguity exists
- all downstream resolver code receives `NormalizedModelSelection`
- resolver unit tests cover valid and invalid selections

### Ticket 2: Provider-Qualified Catalog Loader

Scope:

- create `ModelCatalog` or equivalent helper that loads model catalogs for one or more providers
- return `ModelCandidate[]` with `{ provider, model }`
- preserve constructor provider order
- detect exact model not found
- detect exact model ambiguity across providers
- add `ModelNotFoundError` and `AmbiguousModelError`

Acceptance:

- exact model resolution works for single provider
- exact model resolution works for multi-provider unique matches
- ambiguous exact models require `{ provider, model }`
- `{ provider, model }` outside constructor scope is rejected

### Ticket 3: Capability Matcher

Scope:

- implement candidate requirement matching for `RequestRequirements`
- support text, JSON, structured outputs, image input/output, video output, embeddings, audio API, tools, streaming, reasoning, and token budgets
- remove reliance on static `ModelManager.getCapabilities` in new resolver paths
- handle backward-compatible capability defaults explicitly

Acceptance:

- unit tests cover every capability matcher
- exact model validation uses the same matcher as dynamic selection
- missing required capability metadata is treated as unsupported

### Ticket 4: ProviderPool

Scope:

- implement provider pool with lazy adapter instantiation
- support existing single-provider behavior
- expose provider interface support checks per provider
- preserve existing API key behavior for current single-provider constructor
- define multi-provider API-key behavior for v1

Multi-provider API-key rule for v1:

- `options.apiKey` can only initialize all scoped providers with the same key when that is acceptable for the caller
- provider-specific API keys should be supplied in a future `providerOptions` map or existing environment variables/adapters
- if a scoped provider requires a key and none is available, provider instantiation should fail only when that provider is actually selected or explicitly inspected

Acceptance:

- no request mutates a global active provider to route multi-provider calls
- concurrent requests can resolve different providers safely
- provider interface requirements are checked against the selected provider

### Ticket 5: Scoring Engine and Constraints

Scope:

- implement preset policies
- implement preference overlay and weight normalization
- implement scoring normalization rules
- implement operation-relevant cost extraction
- implement constraints
- implement deterministic tie-breaking

Acceptance:

- preset rankings are deterministic
- unknown metadata follows this spec
- media placeholder values do not distort latency/throughput scoring
- tie-breaking tests cover every tie-break level

### Ticket 6: Request Requirement Inference

Scope:

- implement inference helpers for `call`
- implement inference helpers for `stream`
- implement inference helpers for image operations
- implement inference helpers for video operations
- implement inference helpers for embeddings
- implement inference helpers for audio methods
- implement inference helpers for JSON/schema modes
- implement inference helpers for reasoning
- implement token-budget inference where current request processing makes it available

Acceptance:

- request inference tests cover every row in the capability matrix
- inference helpers are reusable and do not depend on provider state

### Ticket 7: Chat and Streaming Integration

Scope:

- integrate resolver into `call`
- integrate resolver into `stream`
- ensure `RequestProcessor`, `buildChatParams`, `ChatController`, `StreamingService`, `ChunkController`, and history truncation use the resolved model
- preserve exact model validation
- preserve existing constructor usage

Acceptance:

- text, streaming, JSON, tools, image-input chat, chunking, and dynamic history tests pass
- no path uses unresolved preset strings after request resolution

### Ticket 8: Tool and MCP Resolution Ordering

Scope:

- move or factor tool resolution so final effective tools are known before final model selection
- preserve existing local tools, function-folder tools, and MCP tool behavior
- ensure streaming tool requirements are inferred correctly

Acceptance:

- tool-call model selection reflects actual effective tools
- MCP schema cache behavior remains intact
- failures in optional MCP server loading do not produce stale tool requirements

### Ticket 9: Media, Embeddings, and Audio Integration

Scope:

- integrate resolver into image output short-circuit paths
- integrate resolver into video output short-circuit paths
- integrate resolver into embeddings
- integrate resolver into transcription, translation, and speech synthesis
- route through selected provider from `ProviderPool`

Acceptance:

- image generation/edit/composite/masked-edit select valid models
- video generation selects valid provider/model
- embeddings support presets/policies
- audio methods support presets/policies
- provider/model metadata appears in all responses

### Ticket 10: `settings.providerOptions.model` Compatibility

Scope:

- preserve existing per-call exact model override behavior
- route it through the new exact model validation path
- document deprecation or compatibility semantics
- add tests for single-provider and multi-provider scope

Acceptance:

- old per-call override behavior either works as documented or fails with a clear migration error
- override never bypasses capability validation

### Ticket 11: Observability and Errors

Scope:

- add stable response metadata: `provider`, `model`, `selectionMode`
- add optional diagnostic `modelResolution`
- add `ModelSelectionError`
- add error formatting for no-match cases
- ensure telemetry records resolved provider/model for all operation types

Acceptance:

- metadata tests pass for chat, stream, image, video, embeddings, and audio
- error snapshot tests are stable and useful

### Ticket 12: Documentation and Examples

Scope:

- update README
- update adapter docs
- update embeddings/images/GPT-5/telemetry/history/MCP/tools docs
- add examples listed in Documentation Update Requirements
- add changelog or migration notes

Acceptance:

- all docs listed in Documentation Update Requirements are updated
- examples run or typecheck according to the existing examples workflow

## Testing Strategy

### Exact Model Tests

- exact model resolves in one provider
- exact model fails if missing
- exact model validates text output
- exact model validates JSON native mode
- exact model validates image input/output
- exact model validates embeddings
- exact model validates audio operations
- exact model validates video output
- `{ model: 'fast' }` is exact, not preset
- ambiguous exact model across providers requires provider

### Preset Tests

- `cheap`, `fast`, `balanced`, `premium` use shared policy engine
- presets respect provider scope
- presets respect request requirements
- presets are deterministic
- user `prefer` overlays preset weights
- `{ prefer }` defaults to `balanced`

### Capability Inference Tests

- `call` requires text output
- `stream` requires streaming
- `jsonSchema` infers JSON behavior according to `jsonMode`
- tools infer tool-call support
- streaming tools infer streaming tool-call support
- image input infers image input
- image generation/edit/mask/composite infer correct image operation
- video infers video output and optional image input
- embeddings infer dimensions and encoding format
- audio methods infer correct audio operation
- reasoning setting infers reasoning

### Constraint Tests

- price constraints reject candidates
- quality/context/output-token constraints reject candidates
- allowed/excluded model constraints work
- provider constraints are rejected by v1 config validation because provider scope lives in the constructor
- preview/deprecated/uncensored defaults are enforced when metadata is present
- missing metadata behavior is deterministic
- no candidates produces explainable error

### Multi-Provider Tests

- provider array searches all listed providers
- provider array never chooses outside the list
- same preset can choose different provider by operation
- selected provider adapter receives the call
- telemetry records selected provider/model

### Integration Tests

- text call with `fast`
- stream call with `fast`
- JSON call with `balanced`
- tool call with `cheap`
- image generation with `fast`
- image edit with `balanced`
- video generation with `cheap`
- embeddings with `premium`
- transcription with `fast`
- speech synthesis with `cheap`
- dynamic history with resolved model limits
- chunked request uses resolved model throughout

## Test Requirements

Implementation is not complete until these test requirements are satisfied.

### Resolver Unit Tests

- normalize string presets into dynamic selections
- normalize exact model strings into exact selections
- normalize `{ model }` into exact selections
- reject empty selection objects
- reject malformed selection objects
- reject provider constraints in v1
- reject `{ provider, model }` when provider is outside constructor scope
- resolve exact model strings in single-provider scope
- resolve exact model strings in multi-provider scope when unique
- throw `ModelNotFoundError` when no provider contains an exact model
- throw `AmbiguousModelError` when more than one scoped provider contains an exact model
- normalize preset plus `prefer` overlays
- normalize `{ prefer }` and `{ constraints }` using `balanced` as the implicit preset

### Capability Matcher Unit Tests

- text output supports `true` and object forms
- JSON output checks `textOutputFormats`
- structured outputs checks `structuredOutputs`
- image input checks boolean and format-specific forms
- image output checks boolean and operation-specific forms
- video output checks boolean and size/seconds/variant metadata
- embeddings checks boolean, dimensions, and encoding format metadata
- audio API checks boolean and operation-specific forms
- tool calls checks boolean, non-streaming, streaming mode, and parallel support
- reasoning checks `capabilities.reasoning`
- streaming checks `capabilities.streaming`
- token budget checks `maxRequestTokens` and `maxResponseTokens`
- provider interface checks reject candidates whose adapter lacks required `imageCall`, `videoCall`, `embeddingCall`, or `audioCall`

### Scoring and Constraint Unit Tests

- every preset produces deterministic rankings
- user preferences override preset dimensions and normalize correctly
- cost scoring uses operation-relevant price metadata
- latency scoring treats lower first-token latency as better
- throughput scoring treats higher output speed as better
- quality scoring uses `qualityIndex`
- context scoring uses request and response token limits
- price constraints reject candidates with prices above the limit
- price constraints reject candidates with missing required price metadata
- quality/context/output-token constraints reject invalid candidates
- allowed/excluded model constraints work
- preview/deprecated/uncensored defaults are enforced
- missing optional metadata follows the spec's deterministic defaults
- tie-breaking order is covered by explicit tests

### Request Inference Unit Tests

- `call` infers text input and text output
- `stream` infers streaming plus text input/output
- `responseFormat: 'json'` infers JSON behavior based on `jsonMode`
- `jsonSchema` infers JSON behavior based on `jsonMode`
- non-streaming tools infer non-streaming tool-call support
- streaming tools infer streaming tool-call support
- image input without image output infers image input and text output
- image generation infers `imageOutput.generate`
- image edit infers `imageInput` and `imageOutput.edit`
- composite image edit infers `imageInput` and `imageOutput.edit`
- masked image edit infers `imageInput` and `imageOutput.editWithMask`
- video generation infers video output
- video generation with seed image infers video output and image input
- embeddings infer embedding support plus dimensions/encoding format
- transcription infers `audio.transcribe`
- translation infers `audio.translate`
- speech synthesis infers `audio.synthesize`
- `settings.reasoning` infers reasoning support
- dynamic history and chunking use the resolved model token limits

### Public API Regression Tests

- existing `new LLMCaller('openai', 'fast')` remains valid
- existing `new LLMCaller('openai', 'cheap')` remains valid
- existing `new LLMCaller('openai', 'balanced')` remains valid
- existing `new LLMCaller('openai', 'premium')` remains valid
- existing exact model string usage remains valid
- `systemMessage` and `options` constructor arguments remain compatible
- `settings.providerOptions.model` is preserved as a validated exact per-call override

### Error Snapshot Tests

- invalid empty selection object
- malformed policy object
- exact model not found
- exact model ambiguous across providers
- exact model fails request capabilities
- no dynamic candidates after capability filtering
- no dynamic candidates after explicit constraints
- provider outside constructor scope
- provider lacks required interface despite model metadata

### Metadata and Telemetry Tests

- responses include stable `metadata.provider`
- responses include stable `metadata.model`
- responses include stable `metadata.selectionMode`
- `resolution.explain` includes diagnostic `modelResolution`
- `modelResolution` includes selected candidate, request-required capabilities, applied constraints, and candidate rejection reasons
- telemetry receives resolved provider/model for chat
- telemetry receives resolved provider/model for stream
- telemetry receives resolved provider/model for image operations
- telemetry receives resolved provider/model for video operations
- telemetry receives resolved provider/model for embeddings
- telemetry receives resolved provider/model for audio operations

## Documentation Update Requirements

Implementation is not complete until public docs and examples reflect the new selection behavior.

### README

- explain exact model strings
- explain presets and avoid presenting them as fixed aliases
- document request-time dynamic selection
- document provider arrays
- document `{ model }` exact mode and preset-name collision escape hatch
- document policy objects with `preset`, `prefer`, `constraints`, and `resolution.explain`
- document that empty selection objects are invalid
- document exact model ambiguity across provider arrays
- document stable response metadata: `provider`, `model`, `selectionMode`
- add examples for exact model, single-provider preset, multi-provider preset, and custom policy

### Adapter Documentation

Update `ADAPTERS.md` and `ADAPTER_CREATION_RULES.md`:

- document required model catalog metadata
- document capability metadata expectations
- document operation-specific capabilities for image, video, embeddings, audio, tools, JSON, streaming, and reasoning
- document price metadata used by scoring and constraints
- document characteristic metadata used by scoring: `qualityIndex`, `outputSpeed`, `firstTokenLatency`
- document provider interface requirements: `imageCall`, `videoCall`, `embeddingCall`, `audioCall`
- document how new adapters participate in multi-provider selection
- document that catalog quality affects cross-provider ranking quality

### Feature Docs

Update `docs/embeddings.md`:

- document that presets/policies can select embedding-capable models
- document dimensions and encoding format filtering
- remove or update any statement that aliases are not supported for embeddings

Update `docs/images.md`:

- document image generation/edit/composite/masked-edit inference
- document model selection for image output
- document that image input chat and image generation are different requirements

Update `docs/gpt5.md`:

- document reasoning capability inference from `settings.reasoning`
- document exact model validation for reasoning requests

Update `docs/telemetry.md`:

- document resolved provider/model metadata
- document optional `modelResolution` diagnostics
- document that diagnostic scoring details are not a stable public contract

Update `docs/history-manager.md`:

- document that dynamic history truncation uses the resolved model's token limits

Update `docs/mcp-tools.md` and `docs/function-folders.md`:

- document tool-call capability inference
- document streaming tool-call requirements
- document that effective tools can affect request-time model selection

### Examples

Add or update examples for:

- exact model selection
- single-provider preset selection
- multi-provider preset selection
- policy with `prefer`
- policy with `constraints`
- exact model collision escape hatch with `{ model }`
- image generation dynamic selection
- image edit dynamic selection
- embedding dynamic selection
- audio transcription dynamic selection
- video dynamic selection
- `resolution.explain` diagnostics

### Changelog / Migration Notes

- explain the semantic change from aliases to presets
- explain that presets resolve at request time
- explain strict exact model validation
- explain multi-provider exact model ambiguity
- explain removed or changed embedding alias limitations
- explain stable metadata additions

## Open Questions

1. Should provider priority be part of v1?

Recommendation: no. Use deterministic tie-breaking first. Add provider priority later if needed.

2. Should preview/deprecated model metadata be added now?

Recommendation: add optional metadata only if catalogs can populate it reliably. Otherwise keep constraints but treat missing metadata conservatively.

3. Should `jsonMode: 'fallback'` hard-require JSON-capable models?

Recommendation: no. It should prefer JSON-capable models, but allow prompt-based fallback. `native-only` should hard-require JSON.

4. Should tool resolution happen before model resolution?

Recommendation: for correctness, yes when tools are present. A fast provisional pass can be used, but final resolution should know whether effective tools exist.

5. Should cross-provider quality be trusted?

Recommendation: yes for now, but document it as catalog-maintained approximate metadata. Cross-provider selection quality depends on model catalog quality.

6. Should provider constraints be added after v1?

Recommendation: only if a real use case emerges. The constructor provider scope is sufficient for v1.

7. Should request-level estimated cost ceilings be added?

Recommendation: not in v1. Add `maxEstimatedCostUsd` later only after token/media estimation is reliable across text, image, video, audio, and embeddings.

## Final Recommendation

Adopt:

```ts
new LLMCaller(
  provider: RegisteredProviders | RegisteredProviders[],
  modelOrSelection: string | ExactModelSelection | DynamicModelSelection,
  systemMessage?: string,
  options?: LLMCallerOptions
)
```

Resolve dynamic selections at request time, after inferring capabilities from the actual operation. Keep exact model selection strict. Implement presets as policy defaults. Use constraints for hard filters and preferences for soft scoring. Return provider-qualified model resolution metadata for observability.

Before implementation, the required settled decisions are:

1. Empty selection objects are invalid.
2. Constructor provider scope is the maximum provider scope.
3. Provider constraints are not included in v1.
4. Exact model strings across multiple providers must be unambiguous.
5. Model selection is always deterministic.
6. Stable response metadata is separate from diagnostic resolution explanations.
7. Missing metadata behavior follows the explicit rules in this spec.
8. Preview/deprecated/uncensored defaults are explicit.
9. Multi-provider routing uses `ProviderPool`, not active-provider switching.
10. `settings.providerOptions.model` is preserved as a validated exact per-call override for v1.
11. Final model resolution for tool calls happens after effective tool resolution.
12. Scoring normalization follows the formulas and unknown-value rules in this spec.
