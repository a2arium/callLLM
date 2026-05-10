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
- Use JSON Schema when interoperating with existing API schemas.
- Use `native-only` when provider-native structured output is a hard requirement.
- Use `fallback` when model flexibility matters more than native JSON mode.
- Keep schemas small and explicit. Deep or ambiguous schemas are harder for models.
