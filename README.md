# callllm

A TypeScript framework for calling LLMs through one interface, with runtime model selection, structured output, tools, streaming, media generation, embeddings, usage cost tracking, and production telemetry.

`callllm` is for developers who want to write the application code once and keep the freedom to change the provider or model later. Use an exact model when you need control, or use `fast`, `cheap`, `balanced`, and `premium` when you want the framework to choose a capable model for the actual request.

```ts
import { LLMCaller } from 'callllm';

const caller = new LLMCaller(['openai', 'gemini'], 'balanced');

const response = await caller.call('Summarize this support ticket in one sentence.', {
  data: {
    subject: 'Export failed',
    body: 'The CSV export works for small reports but times out for the monthly billing report.'
  }
});

console.log(response[0].content);
console.log(response[0].metadata?.provider, response[0].metadata?.model);
console.log(response[0].metadata?.usage?.costs.total);
```

## Why callllm?

Provider SDKs are good at exposing one provider. Real applications usually need more:

- **One interface across models and providers**: chat, JSON, tools, streaming, images, video, audio, and embeddings use one `LLMCaller` surface.
- **Runtime model selection**: `fast` means a fast text model for chat, a fast image model for image generation, a fast embedding model for embeddings, and a fast audio-capable model for transcription.
- **Exact model control when needed**: `{ model: 'gpt-5-mini' }` is strict. It will not silently switch models.
- **Typed structured output**: use Zod or JSON Schema, get parsed `contentObject`, and choose native JSON mode or prompt fallback.
- **Tools that feel like application code**: register local functions, load function folders, or expose MCP server tools.
- **Cost visibility**: every response can include tokens, media durations, generated media units, and estimated cost.
- **Telemetry-ready operations**: normalized conversation, LLM, tool, prompt, choice, usage, and model-selection metadata.
- **Large input handling**: split large strings, objects, and markdown into model-sized chunks, with optional parallel processing.
- **Unified media workflows**: image input/output, video jobs, speech-to-text, speech translation, and text-to-speech with output format normalization.

## Installation

```bash
npm install callllm
```

```bash
yarn add callllm
pnpm add callllm
```

Requirements:

- Node.js `>=20`
- TypeScript is supported through generated declarations
- At least one provider API key, depending on the provider you use

```env
OPENAI_API_KEY=...
GEMINI_API_KEY=...
OPENROUTER_API_KEY=...
CEREBRAS_API_KEY=...
VENICE_API_KEY=...
```

## First Run

Create `index.ts`:

```ts
import { LLMCaller } from 'callllm';

const caller = new LLMCaller('openai', 'gpt-5-mini', 'You write concise product copy.');

const result = await caller.call('Write a welcome message for a developer analytics dashboard.');

console.log(result[0].content);
console.log('Usage:', result[0].metadata?.usage);
```

Run it with your preferred TypeScript runner:

```bash
npx tsx index.ts
```

Expected shape:

```text
Welcome to your developer analytics dashboard...
Usage: { tokens: ..., costs: ... }
```

The repository examples can also be run directly:

```bash
yarn example:simple
yarn example:json
yarn example:tool
yarn example:modelSelection
```

## The Mental Model

`callllm` is built around one main object:

```ts
new LLMCaller(providerScope, modelOrSelection, systemMessage?, options?)
```

- **Provider scope** says where the framework is allowed to look: `'openai'` or `['openai', 'gemini']`.
- **Model selection** says how to pick a model: an exact model, a preset, or a policy.
- **Request inference** inspects the actual call and adds hard requirements: JSON, tools, streaming, image input, image output, video, audio, embeddings, or reasoning.
- **Execution** dispatches the request to the selected provider/model and returns normalized response metadata.

That means this is valid:

```ts
const caller = new LLMCaller(['openai', 'gemini'], 'fast');

const text = await caller.call('Summarize this note.');
const image = await caller.call({
  text: 'Create a simple app icon.',
  output: { image: { size: '1024x1024' } },
  outputPath: './icon.png'
});
const embedding = await caller.embeddings({ input: 'Text to vectorize' });
const speech = await caller.synthesizeSpeech({
  input: 'The report is ready.',
  voice: 'alloy',
  responseFormat: 'mp3',
  outputPath: './report.mp3'
});

console.log(text[0].metadata?.model);
console.log(image[0].metadata?.model);
console.log(embedding.metadata?.model);
console.log(speech.metadata?.model);
```

The same caller can select different models because the requirements are different.

## Common Tasks

### Text

```ts
const caller = new LLMCaller('gemini', 'fast');
const response = await caller.call('Explain TypeScript generics in two paragraphs.');

console.log(response[0].content);
```

### Streaming

```ts
const caller = new LLMCaller('openai', 'gpt-5-mini');

for await (const chunk of caller.stream('Draft a short incident update.')) {
  if (!chunk.isComplete) process.stdout.write(chunk.content);
  if (chunk.isComplete) console.log('\nCost:', chunk.metadata?.usage?.costs.total);
}
```

### Structured JSON

```ts
import { z } from 'zod';
import { LLMCaller } from 'callllm';

const TicketSchema = z.object({
  severity: z.enum(['low', 'medium', 'high']),
  summary: z.string(),
  nextActions: z.array(z.string())
});

const caller = new LLMCaller(['openai', 'gemini'], 'balanced');
const result = await caller.call<typeof TicketSchema>('Classify this support ticket.', {
  data: 'Customer cannot export billing reports. Export works for small reports only.',
  jsonSchema: { name: 'TicketClassification', schema: TicketSchema },
  responseFormat: 'json'
});

console.log(result[0].contentObject);
```

### Tool Calling

```ts
import { LLMCaller, type ToolDefinition } from 'callllm';

const getOrder: ToolDefinition = {
  name: 'get_order',
  description: 'Look up an order by id.',
  parameters: {
    type: 'object',
    properties: {
      orderId: { type: 'string', description: 'The order id.' }
    },
    required: ['orderId']
  },
  callFunction: async ({ orderId }) => ({
    orderId,
    status: 'delayed',
    eta: '2026-05-12'
  })
};

const caller = new LLMCaller('openai', 'gpt-5-mini', 'You are a support agent.', {
  tools: [getOrder]
});

const response = await caller.call('Why is order A100 delayed?', {
  settings: { toolChoice: 'auto' }
});

console.log(response[0].content);
```

### Images

```ts
const caller = new LLMCaller(['openai', 'gemini'], 'fast');

const result = await caller.call({
  text: 'Generate a clean icon for a deployment dashboard.',
  output: { image: { size: '1024x1024', quality: 'high' } },
  outputPath: './deployment-icon.png'
});

console.log(result[0].metadata?.imageSavedPath);
console.log(result[0].metadata?.usage?.costs.total);
```

### Audio

```ts
const caller = new LLMCaller(['openai', 'gemini'], 'fast');

const speech = await caller.synthesizeSpeech({
  input: 'Your deployment completed successfully.',
  voice: 'alloy',
  responseFormat: 'mp3',
  outputPath: './deployment.mp3'
});

const transcript = await caller.transcribe({ file: './deployment.mp3' });

console.log(speech.audio.mime);
console.log(transcript.text);
console.log(transcript.usage.costs.total);
```

If the selected speech model returns a different audio format than requested, `callllm` attempts local transcoding through `ffmpeg`. If `ffmpeg` or `ffprobe` is missing, it throws `TranscriptionFfmpegError` with install and PATH instructions.

### Embeddings

```ts
const caller = new LLMCaller('openai', 'cheap');

const result = await caller.embeddings({
  input: ['refund policy', 'billing export failed']
});

console.log(result.embeddings[0].embedding.length);
console.log(result.metadata?.model);
```

For retrieval systems, use one exact embedding model consistently for both documents and queries.

## Model Selection

Use exact models when the model identity is part of your application contract:

```ts
new LLMCaller('openai', 'gpt-5-mini');
new LLMCaller('openai', { model: 'gpt-5-mini' });
```

Use presets when you want the framework to choose a model that can satisfy the current request:

```ts
new LLMCaller(['openai', 'gemini'], 'fast');
new LLMCaller(['openai', 'gemini'], 'cheap');
new LLMCaller(['openai', 'gemini'], 'balanced');
new LLMCaller(['openai', 'gemini'], 'premium');
```

Use policies when you need hard constraints or custom tradeoffs:

```ts
const caller = new LLMCaller(['openai', 'gemini'], {
  preset: 'balanced',
  prefer: {
    cost: 0.3,
    latency: 0.3,
    quality: 0.4
  },
  constraints: {
    maxOutputPricePerMillion: 5,
    minContextTokens: 32000
  },
  resolution: { explain: true }
});
```

Every response includes stable model metadata:

```ts
console.log(response[0].metadata?.provider);
console.log(response[0].metadata?.model);
console.log(response[0].metadata?.selectionMode); // exact | preset | policy
```

Read the full guide: [Model selection](docs/guides/model-selection.md).

## Usage and Telemetry

Every operation can report normalized usage:

```ts
const caller = new LLMCaller('openai', 'gpt-5-mini', 'You are concise.', {
  callerId: 'support-thread-42',
  usageCallback: ({ callerId, usage, timestamp }) => {
    console.log(callerId, usage.costs.total, new Date(timestamp).toISOString());
  }
});

const response = await caller.call('Summarize this ticket.', {
  data: 'The customer cannot export the billing report.'
});

console.log(response[0].metadata?.usage);
```

The built-in telemetry collector can emit normalized spans/events to OpenTelemetry and Opik when enabled by environment variables. See [Telemetry and usage](docs/guides/telemetry-and-usage.md).

## Documentation

Start here:

- [Getting started](docs/getting-started.md)
- [Core concepts](docs/concepts.md)
- [Examples catalog](docs/examples.md)

Guides:

- [Model selection](docs/guides/model-selection.md)
- [Structured output](docs/guides/structured-output.md)
- [Tool calling and MCP](docs/guides/tools-and-mcp.md)
- [Function folders](docs/guides/function-folders.md)
- [Media: images, video, and audio](docs/guides/media.md)
- [Embeddings](docs/guides/embeddings.md)
- [Retrieval with embeddings](docs/guides/retrieval-with-embeddings.md)
- [Streaming, history, and large inputs](docs/guides/streaming-history-large-inputs.md)
- [Message composition](docs/guides/message-composition.md)
- [Reasoning and verbosity](docs/guides/reasoning-and-verbosity.md)
- [Settings, retries, and overrides](docs/guides/retries-and-settings.md)
- [Telemetry and usage](docs/guides/telemetry-and-usage.md)
- [Errors and troubleshooting](docs/guides/errors-and-troubleshooting.md)
- [Configuration](docs/reference/configuration.md)
- [API reference](docs/reference/api.md)

Specialized references:

- [Models and capabilities](docs/reference/models-and-capabilities.md)
- [Response types](docs/reference/response-types.md)
- [History reference](docs/reference/history.md)
- [Image details](docs/reference/image-details.md)
- [MCP reference](docs/reference/mcp.md)
- [Model selection migration notes](docs/migration/model-selection.md)
- [Contributing provider adapters](docs/contributing/providers.md)
- [Model selection implementation notes](docs/internal/model-selection-implementation.md)
- [Telemetry architecture notes](docs/internal/telemetry-architecture.md)

## Supported Providers

Provider registry keys:

| Provider | Key | Main supported surfaces |
| --- | --- | --- |
| OpenAI | `openai` | chat, streaming, JSON, tools, images, video, embeddings, audio |
| Gemini | `gemini` | chat, streaming, JSON, tools, images, video, embeddings, audio |
| OpenRouter | `openrouter` | chat, streaming, JSON/tools depending on routed model |
| Cerebras | `cerebras` | chat and streaming |
| Venice | `venice` | chat and streaming |

Support is model-specific. Dynamic selection filters by the actual model capabilities before scoring.

## Production Notes

For production applications, configure:

- exact models or policies with cost/context constraints
- `historyMode: 'stateless'` for independent calls or `'dynamic'` for long conversations
- `maxRetries`, timeouts for MCP tools, and provider-level rate-limit handling
- structured output schemas for machine-consumed responses
- `usageCallback` and telemetry provider env vars for observability
- `LOG_LEVEL=warn` or `LOG_LEVEL=error` for quiet runtime logs
- redaction settings before sending prompts/responses to telemetry systems

LLM output is not deterministic. For workflows that require correctness, use schemas, validation, retries, tests with mocked provider responses, and explicit error handling.

## Logging

Set framework log level with:

```env
LOG_LEVEL=error
```

`LOG_LEVEL` controls logs emitted through the `callllm` logger. It does not suppress output that your application writes directly with `console.log`, `console.error`, or `process.stdout.write`. Telemetry SDKs may also have their own log settings. When Opik is enabled, set `OPIK_LOG_LEVEL=ERROR` if you need to quiet Opik SDK logs.

## Development

```bash
yarn install
yarn build
yarn test
yarn prepublishOnly
```

Useful examples:

```bash
yarn example:simple
yarn example:json
yarn example:tool
yarn example:imageGenerate
yarn example:speechSynthesis
yarn example:speechTranscription
```

## License

MIT
