# Streaming, History, and Large Inputs

This guide covers the parts of `callllm` that matter when your app moves beyond one-off prompts.

## Streaming

```ts
const caller = new LLMCaller('openai', 'gpt-5-mini');

for await (const chunk of caller.stream('Write a release note.')) {
  if (!chunk.isComplete) {
    process.stdout.write(chunk.content);
  } else {
    console.log('\nFinal text:', chunk.contentText);
    console.log('Usage:', chunk.metadata?.usage);
  }
}
```

Streaming chunks can contain:

- `content`: incremental text
- `reasoning`: incremental reasoning summary, if supported
- `isFirstContentChunk`: true on the first content chunk
- `isFirstReasoningChunk`: true on the first reasoning chunk
- `toolCallChunks`: partial tool-call information
- `toolCalls`: completed tool calls
- `contentText`: final accumulated text on the complete chunk
- `contentObject`: parsed structured output on the complete chunk

```ts
for await (const chunk of caller.stream('Analyze the tradeoff.', {
  settings: {
    reasoning: { effort: 'medium', summary: 'auto' }
  }
})) {
  if (chunk.isFirstReasoningChunk) process.stdout.write('\nReasoning:\n');
  if (chunk.reasoning) process.stdout.write(chunk.reasoning);

  if (chunk.isFirstContentChunk) process.stdout.write('\nAnswer:\n');
  if (chunk.content) process.stdout.write(chunk.content);
}
```

## Usage During Streaming

Use `usageBatchSize` to control usage callback frequency:

```ts
const caller = new LLMCaller('openai', 'gpt-5-mini', 'You are concise.', {
  usageCallback: ({ usage }) => {
    console.log('Usage delta:', usage);
  }
});

for await (const chunk of caller.stream('Tell me a story.', {
  usageBatchSize: 50
})) {
  process.stdout.write(chunk.content);
}
```

The final complete chunk includes cumulative usage in `metadata.usage`.

Streaming retry behavior differs from regular calls because a stream can fail before or after content has started. See [Settings, retries, and overrides](retries-and-settings.md).

## History Modes

```ts
const caller = new LLMCaller('openai', 'gpt-5-mini', 'You are helpful.', {
  historyMode: 'dynamic'
});
```

Modes:

| Mode | Behavior | Use when |
| --- | --- | --- |
| `stateless` | only current user message and system message | independent tasks, cost control |
| `dynamic` | truncate old history to fit selected model context | long conversations |
| `full` | send all history | short chats where complete context matters |

Override per call:

```ts
await caller.call('Answer independently.', {
  historyMode: 'stateless'
});
```

Manage history:

```ts
caller.addMessage('user', 'What is the capital of France?');
caller.addMessage('assistant', 'Paris.');
caller.updateSystemMessage('You are a geography tutor.');
const serialized = caller.serializeHistory();
caller.clearHistory();
caller.deserializeHistory(serialized);
```

## Large Inputs

`callllm` can split large `data` values into chunks:

```ts
const response = await caller.call({
  text: 'Summarize each section of this document.',
  data: veryLargeMarkdown,
  endingMessage: 'Return the key risks.',
  maxCharsPerChunk: 8000,
  maxParallelRequests: 5
});
```

For multi-chunk calls, the response array contains one response per chunk.

For the exact prompt composition rules for `text`, `data`, and `endingMessage`, see [Message composition](message-composition.md).

## Markdown Splitting

Markdown is split along semantic boundaries where possible:

- headings
- lists
- tables
- code blocks
- paragraph boundaries

This avoids cutting a document in the middle of a table or code block when possible.

## Limits

Constructor option:

```ts
const caller = new LLMCaller('openai', 'gpt-5-mini', 'You are helpful.', {
  maxChunkIterations: 100,
  parallelChunking: true
});
```

Call option:

```ts
await caller.call('Analyze this data.', {
  data,
  maxChunkIterations: 50,
  maxParallelRequests: 8
});
```

Use these limits deliberately. Large chunked calls can create many provider requests and costs.
