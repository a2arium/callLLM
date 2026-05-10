# Configuration Reference

## Constructor

```ts
new LLMCaller(providerScope, modelOrSelection, systemMessage?, options?)
```

```ts
type ProviderScope = RegisteredProviders | RegisteredProviders[];
```

Registered providers:

```ts
'openai' | 'gemini' | 'openrouter' | 'cerebras' | 'venice'
```

## Model Selection

```ts
type ModelOrSelection =
  | string
  | { model: string; provider?: RegisteredProviders }
  | {
      preset?: 'cheap' | 'fast' | 'balanced' | 'premium';
      prefer?: Partial<Record<'cost' | 'latency' | 'throughput' | 'quality' | 'context', number>>;
      constraints?: ModelConstraints;
      resolution?: { explain?: boolean };
    };
```

Empty selection objects are invalid.

## `LLMCallerOptions`

```ts
type LLMCallerOptions = {
  apiKey?: string;
  providerApiKeys?: Partial<Record<RegisteredProviders, string>>;
  callerId?: string;
  usageCallback?: UsageCallback;
  settings?: UniversalChatSettings;
  historyMode?: 'full' | 'dynamic' | 'stateless';
  toolsDir?: string;
  tools?: (ToolDefinition | string | MCPServersMap)[];
  maxIterations?: number;
  maxChunkIterations?: number;
  parallelChunking?: boolean;
  telemetryCollector?: TelemetryCollector;
};
```

Additional dependency-injection options exist for tests and advanced integrations.

Defaults to know:

- `historyMode` defaults to `stateless`.
- `maxIterations` defaults to `5` for tool-call loops.
- `maxChunkIterations` defaults to `70` for large-input chunking.
- `settings.maxRetries` defaults to the retry controller default when unset; set it explicitly for production workflows.

## Chat Settings

```ts
type UniversalChatSettings = {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  verbosity?: 'low' | 'medium' | 'high';
  maxRetries?: number;
  toolChoice?: 'none' | 'auto' | { type: 'function'; function: { name: string } };
  user?: string;
  stop?: string | string[];
  n?: number;
  logitBias?: Record<string, number>;
  shouldRetryDueToContent?: boolean;
  jsonMode?: 'native-only' | 'fallback' | 'force-prompt';
  providerOptions?: Record<string, unknown>;
  reasoning?: {
    effort?: 'minimal' | 'low' | 'medium' | 'high';
    summary?: 'auto' | 'concise' | 'detailed' | null;
  };
};
```

Settings can be set in the constructor, changed with `updateSettings()`, and overridden per call. See [Settings, retries, and overrides](../guides/retries-and-settings.md).

`settings.providerOptions.model` is a compatibility escape hatch for exact per-call model overrides. Prefer constructor model selection for new code.

## Call Options

```ts
type LLMCallOptions = {
  text?: string;
  file?: string;
  files?: string[];
  mask?: string;
  input?: {
    image?: { detail?: 'low' | 'high' | 'auto' };
  };
  output?: {
    image?: {
      generate?: boolean;
      edit?: boolean;
      editWithMask?: boolean;
      quality?: 'low' | 'medium' | 'high' | 'auto';
      size?: string;
      format?: 'png' | 'jpeg' | 'webp';
      background?: 'transparent' | 'auto';
      compression?: number;
      style?: string;
    };
    video?: {
      size?: string;
      seconds?: number;
      wait?: 'none' | 'poll';
      variant?: 'video' | 'thumbnail' | 'spritesheet';
    };
  };
  outputPath?: string;
  usageCallback?: UsageCallback;
  usageBatchSize?: number;
  data?: string | object;
  endingMessage?: string;
  settings?: UniversalChatSettings;
  jsonSchema?: { name?: string; schema: JSONSchemaDefinition };
  responseFormat?: 'json' | 'text' | { type: 'json_object' };
  tools?: (ToolDefinition | string | MCPServersMap)[];
  toolsDir?: string;
  historyMode?: 'full' | 'dynamic' | 'stateless';
  maxCharsPerChunk?: number;
  maxChunkIterations?: number;
  maxParallelRequests?: number;
};
```

For `text`, `data`, `endingMessage`, chunking, and response-array behavior, see [Message composition](../guides/message-composition.md).

## Environment Variables

Provider keys:

```env
OPENAI_API_KEY=...
GEMINI_API_KEY=...
OPENROUTER_API_KEY=...
CEREBRAS_API_KEY=...
VENICE_API_KEY=...
```

Logging:

```env
LOG_LEVEL=error
OPIK_LOG_LEVEL=ERROR
```

Telemetry:

```env
CALLLLM_OTEL_ENABLED=true
CALLLLM_OPIK_ENABLED=true
```

MCP:

```env
MCP_TOOL_CALL_TIMEOUT_MS=60000
```
