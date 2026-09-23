# Changelog

## 0.5.9

- Preserve structured provenance on non-retryable provider HTTP failures under RetryManager: terminal `ProviderHttpError` keeps `cause`, usable `status` / `providerCode` / `requestId` (from `requestId` or SDK `request_id`), and explicit `retryHistory` (often `[]`). HTTP 400 remains non-retryable and is not relabeled as transport; usage/zero-charge are not invented from status. Class-scoped and legacy terminal branches share this contract.

## 0.5.8

- Fix OpenAI Responses reasoning routes dropping the system instruction when it only appears in `messages` (the `callMessages` / ChatController shape). The converter now lifts system/developer text into native `instructions` when `params.systemMessage` is absent, without duplicating it in `input`.
- Keep the PromptEnhancer trailing format-hint user item under native `json_schema` (intentional).
- Add converter and `callMessages` regression coverage for messages-only system, multi-turn order, tool continuation, transport retries, and `store: false`.

## 0.5.7

- Fix the OpenAI Responses schema pass corrupting nodes whose type is defined elsewhere. A sibling `type` is no longer added beside `$ref`, `anyOf`, `oneOf`, or `allOf`, so a nullable property such as `{"type":["string","null"]}` keeps its `null` branch instead of being narrowed to string-only. Compositions nested in array items and inside other composition branches are fixed too.
- Derive `enum` / `const` types from their literals instead of hardcoding `string`: `{"enum":[1,2,3]}`, `{"enum":[true,false]}`, and `{"const":5}` previously became unsatisfiable nodes. Mixed-type enums are left untyped because the enum already constrains them exactly. Nodes with no type evidence keep the historical `string` fallback.
- Share one type-inference helper between `SchemaSanitizer` and the OpenAI pass, which had drifted apart, and verify the projected schema against the prepared input before the request leaves the process: a pass that narrows the caller's contract now raises `SchemaProjectionError` instead of silently sending a different schema.
- Document that response enforcement requires Zod; a plain JSON Schema object is projected outbound but fails validation with `Invalid schema type`.

## 0.5.6

- Resolve repeated `final_answer` assistant messages to the last one in native output order instead of failing with `multiple_structured_outputs`. Selection still ignores text bodies; `finalAnswerCount` and `decisionalItem` in `outputTextProvenance` show when an earlier final answer was superseded.
- Unlabeled-phase ambiguity, commentary-only replies (`missing_final_output`), and multiple text items alongside native function calls remain fail closed.

## 0.5.5

- Make OpenAI structured-output selection phase-aware: when a reply carries exactly one `final_answer` assistant message, only that item's body is parsed and validated, and `commentary` items are treated as intermediate rather than competing decisions. Selection never compares bodies, so byte-identical items are still two items.
- Fail closed with `multiple_structured_outputs` for two or more `final_answer` items, several unlabeled items, or a `final_answer` beside an unlabeled item; add reason `missing_final_output` for commentary-only replies. Multiple text items alongside native function calls remain blocked before tool orchestration.
- Record `finalAnswerCount`, `commentaryCount`, `unphasedCount`, and the selected `decisionalItem` in bounded `outputTextProvenance`. Refusal and `max_output_tokens` precedence, single-item and single-text-plus-tool behavior, usage/cost/status/response-id provenance, and provider-storage handling are unchanged.

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

