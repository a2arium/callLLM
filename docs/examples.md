# Examples

The repository examples are small scripts meant to show one capability at a time. They use local source imports inside the repository; package users should import from `callllm`.

## Setup

```bash
yarn install
cp .env.example .env # if available, or create .env manually
```

Configure the provider keys required by the example:

```env
OPENAI_API_KEY=...
GEMINI_API_KEY=...
OPENROUTER_API_KEY=...
CEREBRAS_API_KEY=...
VENICE_API_KEY=...
```

## Core Examples

| Command | What it demonstrates |
| --- | --- |
| `yarn example:simple` | text call, streaming, final usage |
| `yarn example:json` | Zod schema, JSON Schema, streaming JSON |
| `yarn example:tool` | local function tools and streaming tools |
| `yarn example:modelSelection` | exact models, presets, policies, resolution metadata |
| `yarn example:usage` | usage callbacks and caller IDs |
| `yarn example:history` | history modes |
| `yarn example:dataSplitting` | large input splitting |

## Media Examples

| Command | What it demonstrates |
| --- | --- |
| `yarn example:image` | image input |
| `yarn example:imageGenerate` | image generation and editing |
| `yarn example:video` | video generation jobs |
| `yarn example:speechSynthesis` | text-to-speech with output format normalization |
| `yarn example:speechTranscription` | speech-to-text and audio usage/cost |

Audio transcoding and large-file transcription require `ffmpeg` and `ffprobe` on the Node process `PATH`.

## Tooling Examples

| Command | What it demonstrates |
| --- | --- |
| `yarn example:toolFolder` | function folder tools |
| `yarn example:mcp` | MCP tools through the model |
| `yarn example:mcpDirect` | direct MCP tool calls |

## Model and Reasoning Examples

| Command | What it demonstrates |
| --- | --- |
| `yarn example:embeddings` | embeddings, dimensions, batch inputs, usage |
| `yarn example:reasoning` | reasoning settings |
| `yarn example:loadHistory` | loading saved history |

## Import Difference

Repository examples often use:

```ts
import { LLMCaller } from '../src/index.ts';
```

Package users should use:

```ts
import { LLMCaller } from 'callllm';
```
