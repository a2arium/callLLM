# Model Selection Migration Notes

This release keeps the existing `LLMCaller` constructor shape:

```ts
new LLMCaller(provider, modelOrSelection, systemMessage?, options?)
```

Existing exact model usage remains valid:

```ts
new LLMCaller('openai', 'gpt-5-mini');
```

Existing simple selection strings also remain valid:

```ts
new LLMCaller('openai', 'fast');
new LLMCaller('openai', 'cheap');
new LLMCaller('openai', 'balanced');
new LLMCaller('openai', 'premium');
```

## Alias to Preset Semantics

The strings `fast`, `cheap`, `balanced`, and `premium` should now be understood as presets, not fixed aliases.

Previously, code could reasonably expect an alias-like name to resolve to a particular model. Now these values represent dynamic policies. They resolve at request time after the framework infers the operation and required capabilities.

For example, the same caller can select different models for:

- normal chat
- streaming
- tool calling
- image input
- image generation or editing
- video generation
- embeddings
- audio transcription, translation, or speech synthesis
- reasoning requests

This is intentional. It prevents a text-only model from being selected for image generation, an embedding request, or a tool call.

## Exact Models Are Strict

Exact model strings are still exact:

```ts
new LLMCaller('openai', 'gpt-5-mini');
```

Exact models are not scored, replaced, or upgraded. They are validated against the actual request. If the exact model cannot satisfy the request, the call fails with a model resolution error.

## Preset Name Collisions

If a provider has a real model named `fast`, `cheap`, `balanced`, or `premium`, use the explicit exact-model form:

```ts
new LLMCaller('some-provider', { model: 'fast' });
```

This forces exact model mode.

## Multi-Provider Scope

Provider arrays are now supported:

```ts
new LLMCaller(['openai', 'gemini', 'openrouter'], 'balanced');
```

The provider array is the maximum provider scope. The resolver never selects outside that list.

Exact model strings across provider arrays must be unambiguous. If more than one scoped provider has the same model name, specify the provider:

```ts
new LLMCaller(['cerebras', 'venice'], {
  provider: 'venice',
  model: 'llama-3.3-70b'
});
```

## Policy Objects

Advanced users can use policies:

```ts
new LLMCaller(['openai', 'gemini'], {
  preset: 'fast',
  prefer: {
    cost: 0.25
  },
  constraints: {
    maxOutputPricePerMillion: 5
  }
});
```

`prefer` is soft scoring. `constraints` are hard filters.

Empty selection objects are invalid:

```ts
new LLMCaller('openai', {}); // invalid
```

Use `balanced` or `{ preset: 'balanced' }`.

## Per-Call Provider Option Override

`settings.providerOptions.model` is preserved for compatibility:

```ts
await caller.call('Use this exact model once', {
  settings: {
    providerOptions: {
      model: 'gpt-5-mini'
    }
  }
});
```

It is treated as an exact model override inside the constructor provider scope. It is not interpreted as a preset and it is capability-validated. Prefer constructor exact selection for new code.

## Response Metadata

Responses now include stable metadata:

```ts
response[0].metadata?.provider;
response[0].metadata?.model;
response[0].metadata?.selectionMode;
```

When `resolution.explain: true` is enabled, responses can include `metadata.modelResolution`. This object is diagnostic and may change as scoring and catalogs evolve.

## Embeddings

Embedding calls can now use constructor presets and policies, and the resolver will choose embedding-capable models. For retrieval indexes, exact model selection is still recommended so stored documents and queries use the same vector space.
