# Response Types Reference

This page documents the normalized response shapes returned by `callllm`.

## Chat Response

```ts
type UniversalChatResponse<T = unknown> = {
  content: string | null;
  contentObject?: T;
  reasoning?: string;
  image?: {
    data: string;
    dataSource?: 'url' | 'base64' | 'file';
    mime: string;
    width: number;
    height: number;
    operation: 'generate' | 'edit' | 'edit-masked' | 'composite';
  };
  role: string;
  messages?: UniversalMessage[];
  toolCalls?: ToolCall[];
  metadata?: Metadata;
};
```

Typical use:

```ts
const response = await caller.call('Hello');
const first = response[0];

console.log(first.content);
console.log(first.metadata?.usage);
```

## Stream Response

```ts
type UniversalStreamResponse<T = unknown> = {
  content: string;
  reasoning?: string;
  contentText?: string;
  reasoningText?: string;
  isFirstContentChunk?: boolean;
  isFirstReasoningChunk?: boolean;
  contentObject?: T;
  image?: UniversalChatResponse['image'];
  role: string;
  isComplete: boolean;
  messages?: UniversalMessage[];
  toolCalls?: ToolCall[];
  toolCallResults?: Array<{
    id: string;
    name: string;
    result: string;
  }>;
  toolCallChunks?: unknown[];
  metadata?: Metadata;
};
```

During streaming:

- use `content` for incremental text
- use `contentText` on the final chunk for accumulated text
- use `contentObject` on the final chunk for parsed JSON
- use `reasoning` / `reasoningText` when reasoning summaries are requested and supported

## Metadata

```ts
type Metadata = {
  finishReason?: FinishReason;
  usage?: Usage;
  provider?: string;
  model?: string;
  selectionMode?: 'exact' | 'preset' | 'policy';
  modelResolution?: ModelResolution;
  validationErrors?: Array<{ message: string; path: (string | number)[] }>;
  jsonRepaired?: boolean;
  imageSavedPath?: string;
  imageUrl?: string;
  videoJobId?: string;
  videoStatus?: 'queued' | 'in_progress' | 'completed' | 'failed';
  videoProgress?: number;
  videoSavedPath?: string;
  videoError?: string | object;
  audioSavedPath?: string;
  transcriptionChunkCount?: number;
  [key: string]: unknown;
};
```

Stable model-selection metadata:

```ts
response[0].metadata?.provider;
response[0].metadata?.model;
response[0].metadata?.selectionMode;
```

Diagnostic model-resolution metadata appears only when `resolution.explain: true`.

## Usage

```ts
type Usage = {
  tokens: {
    input: {
      total: number;
      cached: number;
      image?: number;
      audio?: number;
    };
    output: {
      total: number;
      reasoning: number;
      image?: number;
      audio?: number;
    };
    total: number;
  };
  costs: {
    input: {
      total: number;
      cached: number;
      audio?: number;
    };
    output: {
      total: number;
      reasoning: number;
      image?: number;
      video?: number;
      audio?: number;
    };
    total: number;
    unit: 'USD';
  };
  durations?: {
    input?: {
      audio?: number;
      video?: number;
    };
    output?: {
      audio?: number;
      video?: number;
    };
    total?: number;
    unit: 'seconds';
  };
};
```

## Embedding Response

```ts
type EmbeddingResponse = {
  embeddings: Array<{
    embedding: number[];
    index: number;
    object: 'embedding';
  }>;
  model: string;
  usage: Usage;
  metadata?: Metadata;
};
```

## Audio Responses

Transcription and translation:

```ts
type TranscriptionResponse = {
  text: string;
  language?: string;
  duration?: number;
  model: string;
  usage: Usage;
  metadata?: Metadata;
};
```

Speech:

```ts
type SpeechResponse = {
  audio: {
    data: string;
    mime: string;
    format: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
    sizeBytes: number;
  };
  model: string;
  usage: Usage;
  metadata?: Metadata;
};
```

## Finish Reasons

```ts
enum FinishReason {
  STOP = 'stop',
  LENGTH = 'length',
  CONTENT_FILTER = 'content_filter',
  TOOL_CALLS = 'tool_calls',
  NULL = 'null',
  ERROR = 'error'
}
```
