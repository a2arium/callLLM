# API Reference

This page lists the main public API. For examples and guidance, use the guides. For exact normalized return shapes, see [Response types](response-types.md). For model catalog fields and custom model registration, see [Models and capabilities](models-and-capabilities.md).

## `LLMCaller`

```ts
import { LLMCaller } from 'callllm';

const caller = new LLMCaller(providerScope, modelOrSelection, systemMessage?, options?);
```

## Text

```ts
caller.call(input, options?): Promise<UniversalChatResponse[]>
```

`input` can be a string or `LLMCallOptions`.

```ts
const response = await caller.call('Hello');
console.log(response[0].content);
```

## Streaming

```ts
caller.stream(input, options?): AsyncGenerator<UniversalStreamResponse>
```

```ts
for await (const chunk of caller.stream('Hello')) {
  process.stdout.write(chunk.content);
}
```

## Embeddings

```ts
caller.embeddings(options): Promise<EmbeddingResponse>
caller.getAvailableEmbeddingModels(): string[]
caller.checkEmbeddingCapabilities(modelName): EmbeddingCapabilityInfo
```

## Audio

```ts
caller.transcribe(options): Promise<TranscriptionResponse>
caller.translateAudio(options): Promise<TranslationResponse>
caller.synthesizeSpeech(options): Promise<SpeechResponse>
caller.getAvailableAudioModels(): string[]
caller.checkAudioCapabilities(modelName): AudioCapabilityInfo
```

## Video

```ts
caller.retrieveVideo(videoId): Promise<VideoStatus>
caller.downloadVideo(videoId, options?): Promise<void>
```

Video generation starts through `call()` with `output.video`.

## Models

```ts
caller.getAvailableModels(): ModelInfo[]
caller.getModel(nameOrAlias, capabilityRequirements?): ModelInfo | undefined
caller.addModel(model): void
caller.updateModel(modelName, updates): void
caller.setModel({ provider?, nameOrAlias, apiKey?, capabilityRequirements? }): void
```

Prefer constructor model selection for new code. Use `setModel` for long-lived caller instances that must switch model/provider at runtime.

## Settings

```ts
caller.updateSettings(settings): void
caller.setCallerId(callerId): void
caller.setUsageCallback(callback): void
caller.setParallelChunking(enabled): void
```

## Tools

```ts
caller.addTool(tool): void
caller.addTools(tools): Promise<void>
caller.removeTool(name): void
caller.updateTool(name, partial): void
caller.listTools(): ToolDefinition[]
caller.getTool(name): ToolDefinition | undefined
caller.addToolResult(toolCallId, result, toolName?, isError?): void
```

## History

```ts
caller.getHistoryMode(): 'full' | 'dynamic' | 'stateless'
caller.getMessages(includeSystemMessage?): UniversalMessage[]
caller.addMessage(role, content, additionalFields?): void
caller.setMessages(messages): void
caller.clearHistory(): void
caller.updateSystemMessage(systemMessage, preserveHistory?): void
caller.serializeHistory(): string
caller.deserializeHistory(serialized): void
caller.getLastMessageByRole(role): UniversalMessage | undefined
caller.getLastMessages(count): UniversalMessage[]
caller.getHistorySummary(options?): HistorySummary[]
caller.getHistoryManager(): HistoryManager
```

## MCP

```ts
caller.getMcpServerToolSchemas(serverKey): Promise<McpToolSchema[]>
caller.callMcpTool(serverKey, toolName, args, options?): Promise<unknown>
caller.connectToMcpServer(serverKey): Promise<void>
caller.disconnectMcpServers(): Promise<void>
```

## Main Exported Types

```ts
RegisteredProviders
LLMCallerOptions
UniversalChatResponse
UniversalStreamResponse
UniversalChatSettings
UniversalMessage
Usage
ModelInfo
ModelCapabilities
ToolDefinition
ToolCall
UsageCallback
UsageData
MCPServerConfig
MCPServersMap
MCPRequestOptions
```

## Exported Classes

```ts
LLMCaller
TelemetryCollector
ModelManager
TokenCalculator
ToolsManager
HistoryManager
MCPServiceAdapter
TranscriptionFfmpegError
```

Some internal error classes are available from subpath exports such as `callllm/core`; the package root exports the high-level public classes above.

## See Also

- [Configuration](configuration.md)
- [Response types](response-types.md)
- [Models and capabilities](models-and-capabilities.md)
- [History](history.md)
- [MCP](mcp.md)
- [Image details](image-details.md)
- [Settings, retries, and overrides](../guides/retries-and-settings.md)
