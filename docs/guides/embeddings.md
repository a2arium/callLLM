# Embeddings

Embeddings convert text into vectors for semantic search, clustering, classification, recommendations, and RAG.

## Basic Embedding

```ts
import { LLMCaller } from 'callllm';

const caller = new LLMCaller('openai', 'cheap');

const result = await caller.embeddings({
  input: 'How do I reset my password?'
});

console.log(result.embeddings[0].embedding.length);
console.log(result.metadata?.model);
console.log(result.usage.costs.total);
```

Dynamic selection chooses an embedding-capable model.

## Exact Model for Retrieval

For retrieval indexes, use one exact embedding model for both documents and queries:

```ts
const EMBEDDING_MODEL = 'text-embedding-3-small';
const caller = new LLMCaller('openai', EMBEDDING_MODEL);

const documentVector = await caller.embeddings({
  input: 'Refunds are processed within five business days.',
  model: EMBEDDING_MODEL
});

const queryVector = await caller.embeddings({
  input: 'When will I get my money back?',
  model: EMBEDDING_MODEL
});
```

Do not mix embedding models in the same vector index. Different models can produce different vector dimensions and different semantic spaces.

For semantic search and RAG index design, see [Retrieval with embeddings](retrieval-with-embeddings.md).

## Batch Inputs

```ts
const result = await caller.embeddings({
  input: [
    'How do I reset my password?',
    'Where can I download invoices?',
    'How do I invite a teammate?'
  ],
  model: 'text-embedding-3-small'
});

console.log(result.embeddings.length);
```

## Dimensions

Some models support custom dimensions:

```ts
const result = await caller.embeddings({
  input: 'Short text',
  model: 'text-embedding-3-small',
  dimensions: 512
});
```

Check capabilities:

```ts
const caps = caller.checkEmbeddingCapabilities('text-embedding-3-small');
console.log(caps.dimensions);
console.log(caps.defaultDimensions);
```

List available embedding models:

```ts
console.log(caller.getAvailableEmbeddingModels());
```

## Usage Callback

```ts
await caller.embeddings({
  input: 'Track this embedding call.',
  model: 'text-embedding-3-small',
  usageCallback: ({ usage }) => {
    console.log(usage.tokens.input.total, usage.costs.total);
  }
});
```
