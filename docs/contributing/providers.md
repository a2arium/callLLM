# Contributing Providers

This page is a maintainer-oriented overview for adding a provider adapter.

## Provider Registry

Providers are registered in `src/adapters/index.ts`.

```ts
const ADAPTER_REGISTRY = {
  openai: OpenAIResponseAdapter,
  cerebras: CerebrasAdapter,
  venice: VeniceAdapter,
  openrouter: OpenRouterAdapter,
  gemini: GeminiAdapter
} as const;
```

Adding a provider requires:

1. Add an adapter class.
2. Add a model catalog.
3. Register the adapter key.
4. Add tests for supported surfaces.
5. Document provider-specific setup and limitations.

## Adapter Interfaces

A provider can implement one or more surfaces:

- chat/stream provider
- image provider
- video provider
- embedding provider
- audio provider

Dynamic model selection checks both model capabilities and adapter interface support. For example, a model with `output.image` still cannot be selected for image generation if the provider adapter does not implement `imageCall`.

## Model Catalog

Each provider should include `src/adapters/<provider>/models.ts` with `ModelInfo[]`.

Catalog entries should include:

- pricing fields
- request and response token limits
- capabilities
- quality/speed/latency characteristics
- media limits and pricing where applicable

See [Models and capabilities](../reference/models-and-capabilities.md).

## Errors

Map provider-specific errors into meaningful adapter errors:

- auth errors
- rate limits
- validation errors
- network errors
- service/server errors

Preserve enough context for troubleshooting without leaking secrets.

## Tests

Add tests for every implemented surface:

- chat
- streaming
- JSON/structured output
- tools
- image
- video
- embeddings
- audio
- usage mapping
- error mapping

Also add model-selection tests when the provider adds new capability types.
