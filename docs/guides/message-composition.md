# Message Composition and Large Data

`callllm` lets you separate the instruction, the data, and the final constraint of a request. This is useful for document processing, data extraction, and chunked workflows.

## The Three Parts

```ts
const response = await caller.call({
  text: 'Analyze this customer message.',
  data: {
    subject: 'Export problem',
    body: 'The billing CSV export times out for monthly reports.'
  },
  endingMessage: 'Return the business impact and next action.'
});
```

The request is composed roughly as:

```text
Analyze this customer message.

{
  "subject": "Export problem",
  "body": "The billing CSV export times out for monthly reports."
}

Return the business impact and next action.
```

## `text`

`text` is the main instruction:

```ts
await caller.call({
  text: 'Summarize this report for an engineering manager.'
});
```

Passing a string directly is shorthand:

```ts
await caller.call('Summarize this report.');
```

## `data`

`data` is optional context. It can be a string or object:

```ts
await caller.call({
  text: 'Extract action items.',
  data: meetingTranscript
});

await caller.call({
  text: 'Find suspicious values.',
  data: largeJsonObject
});
```

When `data` is too large for the selected model context window, `callllm` splits it into chunks.

## `endingMessage`

`endingMessage` is appended after the data:

```ts
await caller.call({
  text: 'Translate this text to French.',
  data: longDocument,
  endingMessage: 'Keep product names unchanged.'
});
```

For chunked requests, each chunk receives the same instruction and ending message.

## Forced Character Chunking

Use `maxCharsPerChunk` when you want smaller chunks even if the model could accept more:

```ts
const response = await caller.call({
  text: 'Summarize each section.',
  data: veryLargeMarkdown,
  maxCharsPerChunk: 4000
});
```

## Parallel Chunk Processing

```ts
const response = await caller.call({
  text: 'Classify each record.',
  data: records,
  maxParallelRequests: 5,
  maxChunkIterations: 100
});
```

Use parallel chunking for independent chunks. Use lower concurrency when provider rate limits matter more than speed.

## Result Shape

For single-chunk calls:

```ts
const response = await caller.call({ text: 'Hello' });
console.log(response[0].content);
```

For multi-chunk calls, the array contains one response per chunk:

```ts
const responses = await caller.call({
  text: 'Summarize each part.',
  data: veryLargeText
});

for (const part of responses) {
  console.log(part.metadata?.processInfo);
  console.log(part.content);
}
```

## Markdown Splitting

Markdown input is split along useful boundaries when possible:

- headings
- paragraphs
- lists
- code blocks
- tables

This keeps related content together better than raw character splitting.
