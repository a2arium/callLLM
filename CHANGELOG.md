# Changelog

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

