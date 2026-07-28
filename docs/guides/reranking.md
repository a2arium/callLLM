# Reranking

Reranking scores a set of candidate documents against one query. It is usually the second stage of retrieval: a vector or keyword search produces a broad candidate set, then a reranker improves the final ordering.

## Basic Reranking

```ts
import { LLMCaller } from 'callllm';

const caller = new LLMCaller('siliconflow', 'cheap');

const response = await caller.rerank({
  query: 'How do I reset my password?',
  documents: [
    'Download invoices from Billing.',
    'Reset your password from the sign-in screen.',
    'Invite teammates from Workspace settings.'
  ],
  topN: 2
});

for (const result of response.results) {
  console.log(result.index, result.relevanceScore);
}
```

Presets and policies are resolved against reranking capability and provider-interface support. A chat or embedding model is never selected merely because it accepts text.

## Stable Document IDs

Use typed text documents when downstream code should not depend on array positions:

```ts
const response = await caller.rerank({
  query: 'forgotten password',
  documents: [
    { type: 'text', id: 'billing', text: 'Download an invoice.' },
    { type: 'text', id: 'password', text: 'Reset a forgotten password.' }
  ]
});

console.log(response.results[0].documentId);
```

`documentId` is copied from the input document. Plain strings remain supported. IDs must be non-empty and unique within one request.

## Retrieval Pipeline

Retrieve more candidates than you ultimately send to generation:

```ts
const candidates = await vectorStore.search({
  vector: queryVector,
  topK: 30
});

const ranked = await reranker.rerank({
  query: userQuestion,
  documents: candidates.map(candidate => ({
    type: 'text' as const,
    id: candidate.id,
    text: candidate.text
  })),
  topN: 5
});

const passages = ranked.results
  .map(result => candidates.find(candidate => candidate.id === result.documentId)?.text)
  .filter((text): text is string => Boolean(text));
```

Reranking is stateless and does not read or update chat history.

## Exact Models and Portability

Use an exact model when model behavior is part of the retrieval contract:

```ts
const caller = new LLMCaller(
  'siliconflow',
  { model: 'Qwen/Qwen3-Reranker-0.6B' }
);
```

Use a preset or policy when provider portability and dynamic selection matter:

```ts
const caller = new LLMCaller(['siliconflow', 'another-provider'], {
  preset: 'balanced',
  resolution: { explain: true }
});
```

The universal contract intentionally exposes only portable inputs and outputs: query, text documents, optional `topN`, stable indices/IDs, and optional relevance scores. Provider-only controls belong under `settings.providerOptions.<provider>`.

## SiliconFlow Options

```ts
await caller.rerank({
  query,
  documents,
  settings: {
    providerOptions: {
      siliconflow: {
        max_chunks_per_doc: 8,
        overlap_tokens: 40
      }
    }
  }
});
```

SiliconFlow chunking controls are accepted only for models that document them. Universal request fields such as `model`, `query`, `documents`, `top_n`, and `return_documents` cannot be overridden through provider options.

## Cancellation, Timeouts, and Usage

```ts
const response = await caller.rerank({
  query,
  documents,
  timeoutMs: 10_000,
  signal: abortController.signal,
  usageCallback: ({ usage }) => {
    console.log(usage.tokens.input.total, usage.costs.total);
  }
});
```

One successful rerank call invokes the effective usage callback once. Usage contains normalized token and cost fields where available. Providers with non-token billing can also populate `usage.measurements`.

## Response Shape

```ts
type RerankResponse = {
  results: Array<{
    index: number;
    documentId?: string;
    relevanceScore?: number;
  }>;
  model: string;
  usage: Usage;
  metadata?: Metadata;
};
```

Results preserve provider ranking order. The framework validates unique in-range indices and finite scores, but it does not impose a provider-independent score range or threshold because reranker score semantics differ.

