# Core Concepts

`callllm` exists to separate your application from provider-specific LLM details. Your code describes the task. The framework resolves the model, validates capabilities, executes the provider call, and returns normalized response metadata.

## `LLMCaller`

`LLMCaller` is the main public API:

```ts
new LLMCaller(providerScope, modelOrSelection, systemMessage?, options?)
```

Example:

```ts
const caller = new LLMCaller(['openai', 'gemini'], 'balanced', 'You are concise.');
```

The caller owns:

- provider scope
- model selection policy
- system message
- default settings
- tools
- history mode
- usage and telemetry callbacks

## Provider Scope

The first constructor argument is the maximum set of providers the caller may use.

```ts
new LLMCaller('openai', 'gpt-5-mini');
new LLMCaller(['openai', 'gemini'], 'balanced');
```

Dynamic selection can only choose inside this scope. It never expands to a provider you did not list.

## Model Selection

The second constructor argument can be:

- an exact model string, such as `'gpt-5-mini'`
- a preset string: `'cheap'`, `'fast'`, `'balanced'`, or `'premium'`
- an exact object: `{ model: 'gpt-5-mini' }`
- a policy object with `preset`, `prefer`, `constraints`, and `resolution`

Exact model selection is strict. Presets and policies are resolved at request time.

## Request-Time Capability Inference

Users normally do not manually declare capabilities. The framework infers them from the call:

| Request shape | Required capability |
| --- | --- |
| `caller.call('...')` | text input and text output |
| `caller.stream('...')` | streaming text |
| `jsonSchema` or `responseFormat: 'json'` | JSON/structured output |
| `tools` | tool calling |
| streaming with tools | streaming tool-call support |
| `file` or `files` without media output | image input |
| `output.image` | image generation/editing |
| `output.video` | video generation |
| `embeddings()` | embeddings |
| `transcribe()` | audio transcription |
| `translateAudio()` | audio translation |
| `synthesizeSpeech()` | speech synthesis |
| `settings.reasoning` | reasoning model support |

These requirements are hard filters before model scoring.

## Normalized Responses

Chat responses use `UniversalChatResponse`:

```ts
const response = await caller.call('Hello');

console.log(response[0].content);
console.log(response[0].contentObject);
console.log(response[0].toolCalls);
console.log(response[0].metadata?.usage);
```

Stable metadata fields:

```ts
response[0].metadata?.provider;
response[0].metadata?.model;
response[0].metadata?.selectionMode; // exact | preset | policy
```

Operation-specific metadata can include `imageSavedPath`, `videoJobId`, `videoSavedPath`, `audioSavedPath`, usage details, validation errors, or model resolution diagnostics.

## Tools

A tool is a local function, function-folder export, or MCP server tool that a model may call. `callllm` can execute local tool functions and send the result back to the model automatically.

```ts
const response = await caller.call('Look up order A100.', {
  tools: [getOrderTool],
  settings: { toolChoice: 'auto' }
});
```

## History

The caller stores conversation history through `HistoryManager`. The default mode is `stateless`.

- `stateless`: send only the system message and current user message
- `dynamic`: keep recent history within the selected model context window
- `full`: send all history

```ts
const caller = new LLMCaller('openai', 'gpt-5-mini', 'You are helpful.', {
  historyMode: 'dynamic'
});
```

## Usage and Cost

Responses include a normalized `usage` object when the provider or local estimator can calculate it:

```ts
{
  tokens: {
    input: { total: 100, cached: 0, image: 0, audio: 0 },
    output: { total: 40, reasoning: 0, image: 0, audio: 0, videoSeconds: 0 },
    total: 140
  },
  costs: {
    input: { total: 0.000015, cached: 0, audio: 0 },
    output: { total: 0.000024, reasoning: 0, image: 0, video: 0, audio: 0 },
    total: 0.000039
  }
}
```

Cost values are estimates from model catalog pricing and provider usage metadata where available.

## What callllm Does Not Promise

`callllm` normalizes provider APIs. It does not make model output deterministic or guarantee provider parity for every feature. If a workflow needs strict correctness:

- use structured output
- validate schemas
- handle errors explicitly
- pin exact models when model identity matters
- test with mocked provider responses
- monitor cost and selected model metadata
