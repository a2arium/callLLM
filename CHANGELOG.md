# Changelog

## 0.5.4

- Enrich bounded `outputTextProvenance` with native item identity fields (`itemId`, `itemType`, `role`, `status`, `phase`, `contentType`) without retaining text bodies. Multi-item structured output still fails closed with `multiple_structured_outputs`; byte-identical items are not canonicalized.

## 0.5.3

- Fail closed on OpenAI Responses structured-output replies that contain more than one native `output_text` item: throw `StructuredOutputError` with reason `multiple_structured_outputs` and bounded provenance before JSON parse or tool orchestration. Single-item content, refusals, and ordinary chat/tool loops are unchanged.

## 0.5.2

- Add provider-neutral `providerStorage: 'disabled'` on `callMessages()`: maps to OpenAI Responses `store: false`, fails closed for unsupported providers with `ProviderStorageUnsupportedError`, and rejects contradictions with `providerOptions.openai.store: true` before provider contact.

## 0.5.1

- Add `LLMCaller.callMessages()` for atomic request-scoped text transcripts that never read or mutate persistent caller history.
- Preserve exact role/content/order at the provider-neutral boundary; reject empty content, extra fields, unsupported roles, and multiple system messages before provider contact.
- Keep native tool continuations operation-local; transport retries replay an immutable initial snapshot; forward `settings.providerOptions` (including OpenAI `store`) unchanged.
- Document the request-scoped use case distinctly from `setMessages` / `historyMode`.

## 0.5.0

- Add Vercel AI Gateway provider support (chat, streaming, tools, embeddings, image generate/edit, rerank, evaluation) with capability-aware model catalog.
- Fix Vercel image-edit typing for the OpenAI SDK edit response union.

## 0.4.11

- Add class-scoped `settings.retryPolicy` (transport / structuredOutput / content) with independent ceilings; legacy `maxRetries` remains the shared fallback when no policy is set.
- Emit `settings.onRetryAttempt` events and attach `retryHistory` on terminal `StructuredOutputError` / `ProviderTransportError`.
- Honor per-call retry ceilings on stream acquisition (fixes StreamingService ignoring per-call `maxRetries`).

## 0.4.10

- Preserve machine-readable structured-output failure provenance: project OpenAI Responses refusal content into `metadata.refusal`, retain native `providerStatus` / `incompleteReason`, and throw `StructuredOutputError` with stable `reason` (`refusal`, `max_output_tokens`, `empty`, `non_json`, `json_parse`, `schema_validation`) plus usage/model/finish metadata through RetryManager (including `maxRetries: 0`). Streaming soft-attaches the same classification on the final chunk.

## 0.4.9

- Keep the original tool catalogue on every recursive tool-loop continuation; clear sticky `toolChoice` only.
- Encode OpenAI Responses continuations as native `function_call` / `function_call_output` input items with stable call IDs (no tool→system flattening).
- Treat duplicate tool suppression by call ID only, so a same-name/same-args retry with a new call ID executes.
- Enforce `maxIterations` across recursive tool rounds instead of resetting the counter every batch.

## 0.4.8

- Preserve OpenAI Responses `function_call` items when top-level `output_text` is also present; text and tool extraction are now independent projections of the same native response.

## 0.4.7

- Honor `shouldRetryDueToContent: false` on the non-streaming `ChatController` path (parity with streaming).

## 0.4.6

- Reject non-object JSON (arrays, null, scalars, strings) when decoding open-map tool fields; only plain objects reach `callFunction`.

## 0.4.5

- Encode free-form tool object fields (`additionalProperties: true` / schema object, or Zod `z.record`) as JSON strings for OpenAI and Gemini strict tool schemas, then decode them back to objects before `callFunction`.
- Deep-clone OpenAI tool parameter schemas so caller-supplied `ToolDefinition.parameters` are no longer mutated during conversion.
- Reject tool roots that are themselves open maps (nest the map under a named property instead).
- Widen `ToolParameters.additionalProperties` to `boolean | ToolParameterSchema`.
- Pass OpenAI Responses `store` through `settings.providerOptions.openai.store`.
- Accept plain JSON Schema objects (not only Zod / string) in `SchemaValidator.getSchemaObject`.
- Add `gpt-5.1-2025-11-13` to the OpenAI model catalog.

## 0.4.4

- Fix MCP SDK 1.30 compatibility: streaming tool calls use `experimental.tasks.callToolStream` instead of removed `params.stream`.

## 0.4.3

- Add `jsonSchemaUnions` model capability (`anyOf` | `flatten`) so providers that support JSON Schema unions keep `anyOf` (including nullable fields) instead of rewriting them.
- Fix GPT-5 / OpenAI structured-output stalls caused by flattening `string | null` into impossible required selector schemas.
- Fix flatten mode: collapse nullables to `type: [T, 'null']`, keep multi-variant option fields optional, and only unflatten responses that actually contain flattened keys.
- Preserve `text.verbosity` when attaching `text.format`, set `strict: true` for Responses `json_schema`, and send system text via `instructions` for reasoning models.
- Dependency bumps: `openai` ^6.49.0, `zod` 4.6.5, `@cerebras/cerebras_cloud_sdk`, `@modelcontextprotocol/sdk`, `jsonrepair`, `sharp`, `@dqbd/tiktoken`.

## 0.4.0

- Add the provider-neutral `LLMCaller.rerank()` API with typed text documents, stable document IDs, capability-aware model selection, cancellation, timeouts, retries, telemetry, and normalized usage.
- Add generic usage measurements and operation-specific reranker pricing metadata for providers that bill by tokens, searches, documents, or requests.
- Add SiliconFlow chat and reranking support, including Qwen3 reranker catalog entries, native `/rerank` transport, provider options, usage/cost mapping, and end-to-end coverage.
- Add reranking guides, reference documentation, a runnable example, and adapter contribution rules.

