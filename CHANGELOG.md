# Changelog

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

