# Embeddings

The CallLLM library provides comprehensive support for text embeddings through the `LLMCaller.embeddings()` method. This document covers all aspects of using embeddings, from basic text vectorization to advanced usage tracking and model selection.

## Overview

Embeddings convert text into dense vector representations that capture semantic meaning. These vectors can be used for:

- **Semantic search**: Finding similar content
- **Clustering**: Grouping related texts
- **Classification**: Categorizing content
- **Recommendation systems**: Finding related items
- **RAG (Retrieval Augmented Generation)**: Enhancing LLM responses with relevant context

## Quick Start

```typescript
import { LLMCaller } from 'callllm';

// Initialize with OpenAI (supports embeddings)
const llm = new LLMCaller('openai', 'gpt-4', 'You are a helpful assistant.');

// Generate single embedding
const result = await llm.embeddings({
    input: 'Hello, world!',
    model: 'text-embedding-3-small'
});

console.log(`Generated embedding with ${result.embeddings[0].embedding.length} dimensions`);
console.log(`Cost: $${result.usage.costs.total.toFixed(8)}`);
```

## Basic Usage

### Single Text Embedding

```typescript
const response = await llm.embeddings({
    input: 'This is a sample text to embed.',
    model: 'text-embedding-3-small'
});

// Access the embedding vector
const vector = response.embeddings[0].embedding; // Array of numbers
const dimensions = vector.length; // e.g., 1536 for text-embedding-3-small
```

### Batch Text Embeddings

Process multiple texts efficiently in a single API call:

```typescript
const response = await llm.embeddings({
    input: [
        'First document to embed.',
        'Second document for vectorization.',
        'Third text in the batch.'
    ],
    model: 'text-embedding-3-small'
});

// Access all embeddings
response.embeddings.forEach((embedding, index) => {
    console.log(`Text ${index + 1}: ${embedding.embedding.length} dimensions`);
});
```

## ⚠️ Critical: Model Consistency for Retrieval

### **ALWAYS Use the Same Model**

**This is the most important rule when working with embeddings for semantic search, retrieval, or any comparison operations:**

```typescript
// ✅ CORRECT: Use the same specific model for indexing and querying
const EMBEDDING_MODEL = 'text-embedding-3-small'; // Define once, use everywhere

// Index documents
const docEmbedding = await llm.embeddings({
    input: 'Machine learning is fascinating',
    model: EMBEDDING_MODEL  // ✅ Consistent model
});

// Query for similar content  
const queryEmbedding = await llm.embeddings({
    input: 'AI and ML topics',
    model: EMBEDDING_MODEL  // ✅ Same model for query
});

// Now cosine similarity makes sense
const similarity = cosineSimilarity(docEmbedding.embeddings[0].embedding, queryEmbedding.embeddings[0].embedding);
```

### **Why Model Consistency is Critical**

1. **Different Vector Spaces**: Each model creates its own unique vector space with different semantic relationships
2. **Different Dimensions**: Models output different vector sizes (1536 vs 3072 vs others)
3. **Different Semantic Mappings**: Even with same dimensions, models learn different representations

```typescript
// ❌ WRONG: This will NOT work correctly
const docEmbedding = await llm.embeddings({
    input: 'Machine learning topic',
    model: 'text-embedding-3-small'  // 1536 dimensions, vector space A
});

const queryEmbedding = await llm.embeddings({
    input: 'AI topics',
    model: 'text-embedding-3-large'  // 3072 dimensions, vector space B
});

// These vectors cannot be meaningfully compared!
// The similarity calculation will be meaningless or impossible
```

### **No Aliases for Embeddings**

❌ **Aliases are NOT supported for embedding models** (unlike chat models) because they could lead to inconsistent model usage:

```typescript
// ❌ WRONG: Aliases not supported for embeddings
const embedding = await llm.embeddings({
    input: 'Sample text',
    model: 'small'  // ❌ This will cause an error
});

// ✅ CORRECT: Always use specific model names
const embedding = await llm.embeddings({
    input: 'Sample text',
    model: 'text-embedding-3-small'  // ✅ Explicit model name
});
```

## Model Selection

### Available Models

The library supports OpenAI's embedding models:

- **`text-embedding-3-small`**: Fast, cost-effective, 1536 dimensions
- **`text-embedding-3-large`**: Higher quality, 3072 dimensions  
- **`text-embedding-ada-002`**: Legacy model, 1536 dimensions

### Choosing the Right Model

Consider these factors when selecting a model:

```typescript
// For most applications (good balance of cost/performance)
const EMBEDDING_MODEL = 'text-embedding-3-small';

// For high-accuracy requirements
const EMBEDDING_MODEL = 'text-embedding-3-large';

// For legacy compatibility or lowest cost
const EMBEDDING_MODEL = 'text-embedding-ada-002';

// ✅ Once chosen, use consistently throughout your application
class DocumentSearchSystem {
    private readonly EMBEDDING_MODEL = 'text-embedding-3-small'; // Fixed model
    
    async indexDocument(text: string) {
        return await llm.embeddings({
            input: text,
            model: this.EMBEDDING_MODEL  // ✅ Consistent
        });
    }
    
    async searchSimilar(query: string) {
        return await llm.embeddings({
            input: query,
            model: this.EMBEDDING_MODEL  // ✅ Same model
        });
    }
}
```

### Get Available Models

```typescript
const models = llm.getAvailableEmbeddingModels();
console.log('Available embedding models:', models);
// Output: ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002']
```

## Best Practices for Model Consistency

### 1. Configuration Management

Store your embedding model in a central configuration:

```typescript
// config/embedding.ts
export const EMBEDDING_CONFIG = {
    model: 'text-embedding-3-small',
    dimensions: 1536,
    encodingFormat: 'float' as const
} as const;

// Use throughout your application
import { EMBEDDING_CONFIG } from './config/embedding';

const embedding = await llm.embeddings({
    input: text,
    ...EMBEDDING_CONFIG  // ✅ Consistent configuration
});
```

### 2. Database Schema with Model Tracking

Track which model was used for each embedding:

```typescript
interface StoredEmbedding {
    id: string;
    text: string;
    vector: number[];
    model: string;      // ✅ Track which model was used
    dimensions: number; // ✅ Track dimensions
    createdAt: Date;
}

class VectorStore {
    async store(embedding: StoredEmbedding) {
        // Validate model consistency
        if (embedding.model !== EMBEDDING_CONFIG.model) {
            throw new Error(`Model mismatch: expected ${EMBEDDING_CONFIG.model}, got ${embedding.model}`);
        }
        await this.db.embeddings.insert(embedding);
    }
    
    async search(queryVector: number[], topK: number) {
        // Only search embeddings created with the same model
        return await this.db.embeddings.find({
            model: EMBEDDING_CONFIG.model  // ✅ Filter by model
        }).sort(/* similarity calculation */).limit(topK);
    }
}
```

### 3. Model Migration Strategy

If you need to upgrade models, re-embed ALL documents:

```typescript
class EmbeddingMigrator {
    async migrateToNewModel(oldModel: string, newModel: string) {
        console.log(`Migrating from ${oldModel} to ${newModel}`);
        
        const documents = await this.db.documents.find({ embeddingModel: oldModel });
        
        // Re-embed all documents with new model
        for (const doc of documents) {
            const newEmbedding = await llm.embeddings({
                input: doc.text,
                model: newModel  // ✅ New model for all documents
            });
            
            await this.db.embeddings.update(doc.id, {
                vector: newEmbedding.embeddings[0].embedding,
                model: newModel,
                dimensions: newEmbedding.embeddings[0].embedding.length,
                migratedAt: new Date()
            });
        }
        
        console.log(`Migration complete: ${documents.length} documents re-embedded`);
    }
}
```

## Advanced Configuration

### Custom Dimensions

Reduce vector dimensions for memory/storage efficiency:

```typescript
const response = await llm.embeddings({
    input: 'Sample text for dimension reduction',
    model: 'text-embedding-3-small',
    dimensions: 512  // Reduce from default 1536 to 512
});

console.log(`Dimensions: ${response.embeddings[0].embedding.length}`); // 512
```

### Encoding Format

Specify the encoding format (default is `float`):

```typescript
const response = await llm.embeddings({
    input: 'Sample text',
    model: 'text-embedding-3-small',
    encodingFormat: 'float'  // or 'base64'
});
```

## Usage Tracking

### Per-Call Usage Callback

Track usage for individual embedding calls:

```typescript
const response = await llm.embeddings({
    input: 'Sample text for usage tracking',
    model: 'text-embedding-3-small',
    usageCallback: async (usageData) => {
        console.log(`Tokens used: ${usageData.usage.tokens.total}`);
        console.log(`Cost: $${usageData.usage.costs.total.toFixed(8)}`);
        console.log(`Caller ID: ${usageData.callerId}`);
        console.log(`Timestamp: ${new Date(usageData.timestamp).toISOString()}`);
        
        // Save to database, send to analytics, etc.
        await saveUsageData(usageData);
    }
});
```

### Global Usage Callback

Set a global callback for all operations:

```typescript
const llm = new LLMCaller('openai', 'gpt-4', 'You are a helpful assistant.', {
    usageCallback: async (usageData) => {
        // This callback will be triggered for all operations
        console.log('Global usage tracking:', usageData.usage.costs.total);
    },
    callerId: 'my-app-v1.0'
});
```

### Accumulated Usage Tracking

Track usage across multiple calls:

```typescript
let totalTokens = 0;
let totalCost = 0;
let totalCalls = 0;

const usageTracker = async (usageData) => {
    totalCalls++;
    totalTokens += usageData.usage.tokens.total;
    totalCost += usageData.usage.costs.total;
    
    console.log(`Call ${totalCalls}: ${usageData.usage.tokens.total} tokens, $${usageData.usage.costs.total.toFixed(8)}`);
};

// Process multiple texts with tracking
const texts = ['Text 1', 'Text 2', 'Text 3'];
for (const text of texts) {
    await llm.embeddings({
        input: text,
        model: 'text-embedding-3-small',
        usageCallback: usageTracker
    });
}

console.log(`Total: ${totalCalls} calls, ${totalTokens} tokens, $${totalCost.toFixed(8)}`);
```

### Batch Usage Tracking

Track usage for batch processing:

```typescript
const response = await llm.embeddings({
    input: ['Text 1', 'Text 2', 'Text 3', 'Text 4'],
    model: 'text-embedding-3-small',
    usageCallback: async (usageData) => {
        const batchSize = 4;
        console.log(`Batch of ${batchSize} texts:`);
        console.log(`  Total tokens: ${usageData.usage.tokens.total}`);
        console.log(`  Total cost: $${usageData.usage.costs.total.toFixed(8)}`);
        console.log(`  Cost per text: $${(usageData.usage.costs.total / batchSize).toFixed(8)}`);
        console.log(`  Tokens per text: ${(usageData.usage.tokens.total / batchSize).toFixed(1)}`);
    }
});
```

## Response Structure

### EmbeddingResponse

```typescript
interface EmbeddingResponse {
    embeddings: EmbeddingObject[];
    model: string;
    usage: Usage;
    metadata?: Record<string, any>;
}
```

### EmbeddingObject

```typescript
interface EmbeddingObject {
    embedding: number[];  // The vector representation
    index: number;        // Index in the input array
    object: 'embedding';  // Type identifier
}
```

### Usage Information

```typescript
interface Usage {
    tokens: {
        input: { total: number; cached: number };
        output: { total: number; reasoning: number };
        total: number;
    };
    costs: {
        input: { total: number; cached: number };
        output: { total: number; reasoning: number };
        total: number;
    };
}
```

## Model Capabilities

Check what a model supports:

```typescript
const capabilities = llm.checkEmbeddingCapabilities('text-embedding-3-small');

console.log('Capabilities:', {
    supported: capabilities.supported,           // true
    maxInputLength: capabilities.maxInputLength, // 8192
    dimensions: capabilities.dimensions,         // [512, 1536]
    defaultDimensions: capabilities.defaultDimensions, // 1536
    encodingFormats: capabilities.encodingFormats      // ['float', 'base64']
});
```

## Error Handling

### Capability Errors

```typescript
try {
    await llm.embeddings({
        input: 'Sample text',
        model: 'gpt-4'  // Chat model, not embedding model
    });
} catch (error) {
    if (error instanceof CapabilityError) {
        console.error('Model does not support embeddings:', error.message);
    }
}
```

### Usage Callback Errors

Usage callback errors are handled gracefully and won't fail the main operation:

```typescript
const response = await llm.embeddings({
    input: 'Sample text',
    model: 'text-embedding-3-small',
    usageCallback: async (usageData) => {
        throw new Error('Callback error');  // Won't fail the embedding operation
    }
});

// Embedding operation succeeds despite callback error
console.log('Embedding generated successfully');
```

## Best Practices

### 1. Choose the Right Model

- Use `text-embedding-3-small` for most applications (good balance of cost/performance)
- Use `text-embedding-3-large` for higher accuracy requirements
- Use `text-embedding-ada-002` for legacy compatibility or lowest cost

### 2. Batch Processing

Process multiple texts together for better efficiency:

```typescript
// ✅ Good: Batch processing
const response = await llm.embeddings({
    input: ['Text 1', 'Text 2', 'Text 3'],
    model: 'text-embedding-3-small'
});

// ❌ Inefficient: Multiple individual calls
for (const text of texts) {
    await llm.embeddings({ input: text, model: 'text-embedding-3-small' });
}
```

### 3. Dimension Optimization

Reduce dimensions for storage/memory optimization:

```typescript
// For storage-sensitive applications
const response = await llm.embeddings({
    input: 'Sample text',
    model: 'text-embedding-3-small',
    dimensions: 512  // 3x smaller storage
});
```

### 4. Usage Monitoring

Always track usage in production:

```typescript
const llm = new LLMCaller('openai', 'gpt-4', 'Assistant', {
    usageCallback: async (usage) => {
        await analyticsService.track('embedding_usage', {
            tokens: usage.usage.tokens.total,
            cost: usage.usage.costs.total,
            model: usage.model,
            timestamp: usage.timestamp
        });
    }
});
```

### 5. Error Handling

Handle various error scenarios:

```typescript
try {
    const response = await llm.embeddings({
        input: textToEmbed,
        model: 'text-embedding-3-small'
    });
    return response.embeddings[0].embedding;
} catch (error) {
    if (error instanceof CapabilityError) {
        console.error('Model capability error:', error.message);
    } else if (error.status === 429) {
        console.error('Rate limit exceeded, retry later');
    } else {
        console.error('Unexpected error:', error.message);
    }
    throw error;
}
```

## Integration Examples

### Semantic Search

```typescript
class SemanticSearch {
    private vectors: Map<string, number[]> = new Map();
    
    async addDocument(id: string, text: string) {
        const response = await llm.embeddings({
            input: text,
            model: 'text-embedding-3-small'
        });
        this.vectors.set(id, response.embeddings[0].embedding);
    }
    
    async search(query: string, topK: number = 5) {
        const queryResponse = await llm.embeddings({
            input: query,
            model: 'text-embedding-3-small'
        });
        const queryVector = queryResponse.embeddings[0].embedding;
        
        const similarities = Array.from(this.vectors.entries())
            .map(([id, vector]) => ({
                id,
                similarity: this.cosineSimilarity(queryVector, vector)
            }))
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK);
            
        return similarities;
    }
    
    private cosineSimilarity(a: number[], b: number[]): number {
        const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
        const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
        const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
        return dotProduct / (magnitudeA * magnitudeB);
    }
}
```

### RAG (Retrieval Augmented Generation)

```typescript
class RAGSystem {
    private documents = new Map<string, { text: string; vector: number[] }>();
    
    async addDocument(id: string, text: string) {
        const response = await llm.embeddings({
            input: text,
            model: 'text-embedding-3-small'
        });
        
        this.documents.set(id, {
            text,
            vector: response.embeddings[0].embedding
        });
    }
    
    async query(question: string, topK: number = 3) {
        // Get question embedding
        const questionResponse = await llm.embeddings({
            input: question,
            model: 'text-embedding-3-small'
        });
        const questionVector = questionResponse.embeddings[0].embedding;
        
        // Find most relevant documents
        const relevantDocs = Array.from(this.documents.entries())
            .map(([id, doc]) => ({
                id,
                text: doc.text,
                similarity: this.cosineSimilarity(questionVector, doc.vector)
            }))
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK);
        
        // Build context for LLM
        const context = relevantDocs.map(doc => doc.text).join('\n\n');
        
        // Generate answer using retrieved context
        const answer = await llm.call(`
            Context: ${context}
            
            Question: ${question}
            
            Please answer the question based on the provided context.
        `);
        
        return {
            answer: answer[0].content,
            sources: relevantDocs.map(doc => doc.id)
        };
    }
    
    private cosineSimilarity(a: number[], b: number[]): number {
        const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
        const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
        const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
        return dotProduct / (magnitudeA * magnitudeB);
    }
}
```

## API Reference

### LLMCaller.embeddings()

```typescript
async embeddings(options: EmbeddingCallOptions): Promise<EmbeddingResponse>
```

#### EmbeddingCallOptions

```typescript
interface EmbeddingCallOptions {
    input: string | string[];           // Text(s) to embed
    model?: string;                     // Specific model name (no aliases supported)
    dimensions?: number;                // Custom dimensions (if supported)
    encodingFormat?: 'float' | 'base64'; // Encoding format
    usageCallback?: UsageCallback;      // Per-call usage tracking
    usageBatchSize?: number;           // Batch size for usage tracking
}
```

#### EmbeddingResponse

```typescript
interface EmbeddingResponse {
    embeddings: EmbeddingObject[];      // Generated embeddings
    model: string;                      // Actual model used
    usage: Usage;                       // Token and cost information
    metadata?: Record<string, any>;     // Additional metadata
}
```

### Helper Methods

#### getAvailableEmbeddingModels()

```typescript
getAvailableEmbeddingModels(): string[]
```

Returns array of available embedding model names.

#### checkEmbeddingCapabilities()

```typescript
checkEmbeddingCapabilities(modelName: string): EmbeddingCapabilities
```

Returns capability information for a specific model:

```typescript
interface EmbeddingCapabilities {
    supported: boolean;
    maxInputLength?: number;
    dimensions?: number[];
    defaultDimensions?: number;
    encodingFormats?: string[];
}
```

## Troubleshooting

### Common Issues

1. **Model not found**: Ensure you're using a valid embedding model name
2. **Dimension mismatch**: Check if the model supports custom dimensions
3. **Rate limits**: Implement retry logic with exponential backoff
4. **Large batches**: Split large inputs into smaller batches if needed

### Debug Logging

Enable debug logging to troubleshoot issues:

```typescript
// Set LOG_LEVEL environment variable
process.env.LOG_LEVEL = 'debug';

// Or use logging configuration
const llm = new LLMCaller('openai', 'gpt-4', 'Assistant', {
    // Logging will show detailed embedding operation info
});
```

## Migration Guide

### From OpenAI SDK

```typescript
// Old: Direct OpenAI SDK
import OpenAI from 'openai';
const openai = new OpenAI();
const response = await openai.embeddings.create({
    input: 'Sample text',
    model: 'text-embedding-3-small'
});

// New: CallLLM
import { LLMCaller } from 'callllm';
const llm = new LLMCaller('openai', 'gpt-4', 'Assistant');
const response = await llm.embeddings({
    input: 'Sample text',
    model: 'text-embedding-3-small'  // ✅ Always use specific model names
});
```

### Key Differences from Chat Models

**Embeddings vs Chat Models:**

```typescript
// ✅ Chat models: Aliases are supported
const chatResponse = await llm.call('Hello', {
    model: 'fast'  // ✅ Alias works for chat
});

// ❌ Embedding models: No aliases (for consistency)
const embedding = await llm.embeddings({
    input: 'Hello',
    model: 'fast'  // ❌ Will throw error - use specific model name
});

// ✅ Embedding models: Use specific names
const embedding = await llm.embeddings({
    input: 'Hello',
    model: 'text-embedding-3-small'  // ✅ Specific model required
});
```

Benefits of using CallLLM for embeddings:
- **Model consistency enforcement** prevents vector space mismatches
- **Built-in usage tracking** and cost calculation
- **Error handling** and retry logic
- **Type safety** with full TypeScript support
- **No accidental model switching** through aliases 