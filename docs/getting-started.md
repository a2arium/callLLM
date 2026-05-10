# Getting Started

This guide gets you from install to a working LLM call, then shows the next three things most applications need: JSON output, streaming, and model switching.

## Install

```bash
npm install callllm
```

```bash
yarn add callllm
pnpm add callllm
```

Requirements:

- Node.js `>=20`
- A provider API key
- A TypeScript runner such as `tsx`, or a normal TypeScript build step

## Configure a Provider Key

Use the environment variable for the provider you want to call:

```env
OPENAI_API_KEY=...
GEMINI_API_KEY=...
OPENROUTER_API_KEY=...
CEREBRAS_API_KEY=...
VENICE_API_KEY=...
```

You can also pass a key when constructing `LLMCaller`:

```ts
const caller = new LLMCaller('openai', 'gpt-5-mini', 'You are helpful.', {
  apiKey: process.env.OPENAI_API_KEY
});
```

For multiple providers, use `providerApiKeys`:

```ts
const caller = new LLMCaller(['openai', 'gemini'], 'balanced', 'You are helpful.', {
  providerApiKeys: {
    openai: process.env.OPENAI_API_KEY,
    gemini: process.env.GEMINI_API_KEY
  }
});
```

## First Call

```ts
import { LLMCaller } from 'callllm';

const caller = new LLMCaller('openai', 'gpt-5-mini');

const response = await caller.call('Write a one-sentence description of callllm.');

console.log(response[0].content);
console.log(response[0].metadata?.usage);
```

`call()` returns an array because large inputs may be split into multiple chunks. For normal prompts, use `response[0]`.

## Use a Preset Instead of an Exact Model

```ts
const caller = new LLMCaller(['openai', 'gemini'], 'fast');

const response = await caller.call('Summarize this release note.', {
  data: 'Fixed billing export retries and added audit logging.'
});

console.log(response[0].metadata?.provider);
console.log(response[0].metadata?.model);
```

The selected model is resolved at request time. A later image, embedding, or audio request can choose a different model from the same provider scope.

## Structured Output

```ts
import { z } from 'zod';
import { LLMCaller } from 'callllm';

const Summary = z.object({
  title: z.string(),
  risk: z.enum(['low', 'medium', 'high']),
  actionItems: z.array(z.string())
});

const caller = new LLMCaller(['openai', 'gemini'], 'balanced');

const result = await caller.call<typeof Summary>('Analyze this incident report.', {
  data: 'The queue delayed invoice exports for 19 minutes. No data was lost.',
  jsonSchema: { name: 'IncidentSummary', schema: Summary },
  responseFormat: 'json'
});

console.log(result[0].contentObject);
```

## Streaming

```ts
const caller = new LLMCaller('openai', 'gpt-5-mini');

for await (const chunk of caller.stream('Write a short status update.')) {
  if (!chunk.isComplete) {
    process.stdout.write(chunk.content);
  } else {
    console.log('\nFinal usage:', chunk.metadata?.usage);
  }
}
```

## Run Repository Examples

From the repository:

```bash
yarn example:simple
yarn example:json
yarn example:tool
yarn example:modelSelection
yarn example:embeddings
yarn example:speechSynthesis
yarn example:speechTranscription
```

Some examples require provider-specific keys and media tools such as `ffmpeg`.

## Next

- Learn the mental model in [Core concepts](concepts.md).
- Choose models with [Model selection](guides/model-selection.md).
- Build typed responses with [Structured output](guides/structured-output.md).
- Add functions and MCP servers with [Tool calling and MCP](guides/tools-and-mcp.md).
