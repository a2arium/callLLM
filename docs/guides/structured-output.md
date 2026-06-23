# Structured Output

Use structured output when your application needs data, not prose. `callllm` supports Zod schemas, JSON Schema, native provider JSON mode where available, and prompt-based fallback for models without native structured output.

Structured JSON is a framework feature, not only a provider-native feature. In the default `fallback` mode, `callllm` asks for JSON using the best available provider mechanism and falls back to prompt/schema enforcement when native JSON mode is unavailable. Use `native-only` only when your application specifically requires provider-native structured output.

## Zod Schema

```ts
import { z } from 'zod';
import { LLMCaller } from 'callllm';

const Ticket = z.object({
  category: z.enum(['billing', 'bug', 'account', 'other']),
  priority: z.enum(['low', 'medium', 'high']),
  summary: z.string(),
  suggestedReply: z.string()
});

const caller = new LLMCaller(['openai', 'gemini'], 'balanced');

const response = await caller.call<typeof Ticket>('Classify this support request.', {
  data: 'I cannot export last month billing report. The spinner never stops.',
  jsonSchema: {
    name: 'Ticket',
    schema: Ticket
  },
  responseFormat: 'json'
});

console.log(response[0].contentObject);
```

`content` contains the raw response text. `contentObject` contains the parsed and validated object when parsing succeeds.

## JSON Schema

```ts
const schema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    tags: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  required: ['title', 'tags']
};

const response = await caller.call('Create metadata for this article.', {
  data: articleText,
  jsonSchema: {
    name: 'ArticleMetadata',
    schema: JSON.stringify(schema)
  },
  responseFormat: 'json'
});
```

The schema layer sanitizes/coerces schemas for provider compatibility where possible.

Prefer Zod over a JSON Schema string when post-response validation matters. String JSON Schema is accepted on the outbound path but is not enforced against responses, so `metadata.validationErrors` will not be populated. JSON Schema as a plain object is also accepted.

## How Schemas Are Normalized for Providers

`callllm` rewrites your schema before sending it to providers that require strict structured output (for example OpenAI). The rewrite is conservative and predictable:

- every property is forced into `required`
- `additionalProperties: false` is set on every object level
- validation keywords such as `minimum`, `maximum`, `minLength`, `pattern`, `format` are removed
- `default` values are removed
- root-level unions are downgraded to a generic JSON object format
- descriptions (`.describe(...)`) are preserved and reach the model

This means:

- the model is expected to emit every declared field on every call
- constraints like `min`, `max`, `regex`, `refine` are only enforced after the response, not by the provider
- a `.default(value)` is applied during response coercion, not by the provider

## Zod Feature Mapping

| Zod | Outbound schema | Response handling |
| --- | --- | --- |
| `z.string()`, `z.number()`, `z.boolean()` | direct type mapping | direct |
| `z.enum([...])` | string with `enum` values | direct |
| `z.array(item)` | array with `items` | direct |
| `z.object({...})` | object with all keys required and `additionalProperties: false` | direct |
| `z.record(K, V)` | object with `additionalProperties: V` (open map) | direct |
| `.describe('...')` | copied to `description` | n/a |
| `.optional()` | forced back into `required` for strict providers | `null` on optional fields is pruned during validation |
| `.nullable()` | unwrapped to inner type | `null` is accepted at validation time |
| `.default(value)` | removed from outbound schema | applied during response coercion if field is missing |
| `.min(n)`, `.max(n)`, `.regex(...)`, `.refine(...)` | removed from outbound schema | enforced by Zod against the response |
| `z.union([...])`, `z.discriminatedUnion(...)` | flattened to selector + per-option fields, root-level unions downgraded | unflattened back to original shape |
| `.passthrough()` | not supported | n/a |

If `jsonSchema.name` is set, the response is unwrapped from `{ [name]: data }` automatically.

## JSON Modes

Configure JSON behavior with `settings.jsonMode`:

```ts
await caller.call('Return JSON only.', {
  responseFormat: 'json',
  settings: {
    jsonMode: 'fallback'
  }
});
```

Modes:

| Mode | Behavior |
| --- | --- |
| `fallback` | use native JSON if available, otherwise prompt enhancement |
| `native-only` | require native JSON support; fail if unavailable |
| `force-prompt` | always use prompt enhancement |

Dynamic model selection treats `native-only` JSON as a hard model capability requirement. In `fallback` and `force-prompt` modes, JSON output does not require native provider JSON support, but validation can still fail if the model returns invalid data.

## Streaming JSON

```ts
for await (const chunk of caller.stream<typeof Ticket>('Classify this ticket.', {
  data: ticketText,
  jsonSchema: { name: 'Ticket', schema: Ticket },
  responseFormat: 'json'
})) {
  if (!chunk.isComplete) {
    process.stdout.write(chunk.content);
  } else {
    console.log(chunk.contentText);
    console.log(chunk.contentObject);
  }
}
```

During streaming, `content` is the incremental text. The final chunk contains `contentText` and, when valid, `contentObject`.

## Handling Invalid Output

LLM output can still be invalid. Your production code should handle:

- validation failures
- repaired JSON (`metadata.jsonRepaired`)
- validation errors (`metadata.validationErrors`)
- missing `contentObject`

```ts
const first = response[0];

if (!first.contentObject) {
  console.error('Raw output:', first.content);
  console.error('Validation errors:', first.metadata?.validationErrors);
  throw new Error('Model did not return valid structured output');
}
```

## Guidance

- Use Zod for TypeScript-first application code.
- Use JSON Schema when interoperating with existing API schemas, and keep your own validation if you rely on it.
- Use `native-only` when provider-native structured output is a hard requirement.
- Use `fallback` when model flexibility matters more than native JSON mode.
- Keep schemas small and explicit. Deep or ambiguous schemas are harder for models.
- For strict providers, prefer required fields with `.nullable()` or empty strings/arrays over `.optional()`. Optional fields are still required on the wire for strict providers.
- Treat `.min`, `.max`, `.regex`, and `.refine` as post-response validation only. The model is not told about them, so they should not be your primary way to shape output. Convey shape in `.describe(...)` and use refinements as a safety net.
- Keep a plain `z.object(...)` at the root. Root-level unions degrade to generic JSON object mode.
- For multi-stage extraction pipelines, keep the LLM-facing schema flat (arrays of flat records, strings, numbers, enums) and convert to your internal nested domain shape deterministically after validation.
