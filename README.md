# callLLM

A TypeScript library for interacting with various AI chat models, focusing on cost and performance optimization.

## Features

- Model selection based on performance characteristics
- Cost tracking and optimization
- Support for multiple AI providers (currently OpenAI)
- Streaming responses
- JSON mode with schema validation
- Type-safe responses

## Installation

```bash
yarn add callllm
```

## Configuration

Create a `.env` file in your project root:
```env
OPENAI_API_KEY=your-api-key-here
```

Or provide the API key directly when initializing:
```typescript
const caller = new LLMCaller('openai', 'gpt-4o-mini', 'You are a helpful assistant.', 'your-api-key-here');
```

## Usage

```typescript
import { LLMCaller } from 'callllm';

// Initialize with OpenAI using model alias
const caller = new LLMCaller('openai', 'fast', 'You are a helpful assistant.');
// Or with specific model
const caller = new LLMCaller('openai', 'gpt-4o', 'You are a helpful assistant.');

// Basic chat call with usage tracking
const response = await caller.chatCall({
    message: 'Hello, how are you?',
    settings: {
        temperature: 0.7,
        maxTokens: 100
    }
});

console.log(response.metadata?.usage);
// {
//     inputTokens: 123,
//     outputTokens: 456,
//     totalTokens: 579,
//     costs: {
//         inputCost: 0.000369,    // For gpt-4o at $30/M tokens
//         outputCost: 0.00456,    // For gpt-4o at $60/M tokens
//         totalCost: 0.004929
//     }
// }

// Streaming call with real-time token counting
const stream = await caller.streamCall({
    message: 'Tell me a story',
    settings: {
        temperature: 0.9
    }
});

for await (const chunk of stream) {
    console.log(chunk.content);
    // Each chunk includes current token usage and costs
    console.log(chunk.metadata?.usage);
}

// Model Management
// Get available models
const models = caller.getAvailableModels();

// Get model info (works with both aliases and direct names)
const modelInfo = caller.getModel('fast');  // Using alias
const modelInfo = caller.getModel('gpt-4o'); // Using direct name

// Add a custom model
caller.addModel({
    name: "custom-model",
    inputPricePerMillion: 30.0,  // $30 per million input tokens
    outputPricePerMillion: 60.0, // $60 per million output tokens
    maxRequestTokens: 8192,
    maxResponseTokens: 4096,
    characteristics: {
        qualityIndex: 85,         // 0-100 quality score
        outputSpeed: 50,          // Tokens per second
        firstTokenLatency: 0.5    // Seconds to first token
    }
});

// Update existing model
caller.updateModel('gpt-4o', {
    inputPricePerMillion: 40.0,  // Update to $40 per million input tokens
    outputPricePerMillion: 80.0, // Update to $80 per million output tokens
    characteristics: {
        qualityIndex: 90
    }
});

// Switch models or providers
caller.setModel({ nameOrAlias: 'fast' });  // Switch to fastest model
caller.setModel({ nameOrAlias: 'gpt-4o' }); // Switch to specific model
caller.setModel({  // Switch provider and model
    provider: 'openai',
    nameOrAlias: 'fast',
    apiKey: 'optional-new-key'
});
```

## Model Aliases

The library supports selecting models by characteristics using aliases:

- `'fast'`: Optimized for speed (high output speed, low latency)
- `'premium'`: Optimized for quality (high quality index)
- `'balanced'`: Good balance of speed and quality
- `'cheap'`: Optimized for cost (lowest price per token)

## Model Information

Each model includes the following information:
```typescript
type ModelInfo = {
    name: string;              // Model identifier
    inputPricePerMillion: number;   // Price per million input tokens
    outputPricePerMillion: number;  // Price per million output tokens
    maxRequestTokens: number;  // Maximum tokens in request
    maxResponseTokens: number; // Maximum tokens in response
    tokenizationModel?: string;  // Optional model name to use for token counting
    characteristics: {
        qualityIndex: number;      // 0-100 quality score
        outputSpeed: number;       // Tokens per second
        firstTokenLatency: number; // Seconds to first token
    }
};
```

Model characteristics (quality index, output speed, and latency) are sourced from the [LLM Performance Leaderboard](https://huggingface.co/spaces/ArtificialAnalysis/LLM-Performance-Leaderboard), which provides comprehensive benchmarks for various language models.

Default OpenAI Models:
| Model | Input Price (per 1M) | Output Price (per 1M) | Quality Index | Output Speed | First Token Latency |
|-------|---------------------|---------------------|---------------|--------------|-------------------|
| gpt-4o | $30.00 | $60.00 | 90 | 40 | 0.8 |
| gpt-4o-mini | $15.00 | $30.00 | 85 | 45 | 0.7 |
| o1 | $150.00 | $300.00 | 95 | 35 | 1.0 |
| o1-mini | $30.00 | $60.00 | 88 | 42 | 0.8 |

## Token Counting and Pricing

The library automatically tracks token usage and calculates costs for each request:

- Uses provider's token counts when available (e.g., from OpenAI response)
- Falls back to local token counting using `@dqbd/tiktoken` when needed
- Calculates costs based on model's price per million tokens
- Provides real-time token counting for streaming responses
- Includes both input and output token counts and costs

## Supported Providers

Currently supported LLM providers:
- OpenAI (ChatGPT)
- More coming soon (Anthropic, Google, etc.)

## Token Counting

The library uses tiktoken for accurate token counting. Since newer models might not be directly supported by tiktoken, you can specify which model's tokenizer to use:

```typescript
// Add a custom model with specific tokenizer
caller.addModel({
    name: "custom-model",
    inputPricePerMillion: 30.0,
    outputPricePerMillion: 60.0,
    maxRequestTokens: 8192,
    maxResponseTokens: 4096,
    tokenizationModel: "gpt-4",  // Use GPT-4's tokenizer for counting
    characteristics: {
        qualityIndex: 85,
        outputSpeed: 50,
        firstTokenLatency: 0.5
    }
});
```

If `tokenizationModel` is not specified, the library will:
1. Try to use the model's own name for tokenization
2. Fall back to approximate counting if tokenization fails

## Response Types

### Chat Response
```typescript
interface UniversalChatResponse {
    content: string;
    role: string;
    metadata?: {
        finishReason?: FinishReason;
        created?: number;
        usage?: Usage;
        [key: string]: any;
    };
}

interface Usage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costs: {
        inputCost: number;
        outputCost: number;
        totalCost: number;
    };
}
```

### Stream Response
```typescript
interface UniversalStreamResponse {
    content: string;
    role: string;
    isComplete: boolean;
    metadata?: {
        finishReason?: FinishReason;
        usage?: Usage;
        [key: string]: any;
    };
}
```



## JSON Mode and Schema Validation

The library supports structured outputs with schema validation using either Zod schemas or JSON Schema:

### Using Zod Schema

```typescript
import { z } from 'zod';

const UserSchema = z.object({
    name: z.string(),
    age: z.number(),
    interests: z.array(z.string())
});

const response = await caller.chatCall<typeof UserSchema>({
    message: 'Generate a profile for a user named Alice',
    settings: {
        jsonSchema: {
            name: 'UserProfile',
            schema: UserSchema
        },
        responseFormat: 'json'
    }
});

// response.content is typed as { name: string; age: number; interests: string[] }
```

### Using JSON Schema

```typescript
const response = await caller.chatCall({
    message: 'Generate a recipe',
    settings: {
        jsonSchema: {
            name: 'Recipe',
            schema: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    ingredients: {
                        type: 'array',
                        items: { type: 'string' }
                    },
                    steps: {
                        type: 'array',
                        items: { type: 'string' }
                    }
                },
                required: ['name', 'ingredients', 'steps']
            }
        },
        responseFormat: 'json'
    }
});
```

Note: The library automatically adds `additionalProperties: false` to all object levels in JSON schemas to ensure strict validation. You don't need to specify this in your schema.

### Streaming with Schema Validation

```typescript
const stream = await caller.streamCall<typeof UserSchema>({
    message: 'Generate a profile for a user named Bob',
    settings: {
        jsonSchema: {
            name: 'UserProfile',
            schema: UserSchema
        },
        responseFormat: 'json'
    }
});

for await (const chunk of stream) {
    if (chunk.isComplete) {
        // Final chunk contains the validated JSON object
        console.log(chunk.content);
    }
}
```

### Error Handling

When using schema validation, the library provides detailed validation errors:

```typescript
try {
    const response = await caller.chatCall({
        message: 'Generate data',
        settings: {
            jsonSchema: {
                name: 'Data',
                schema: UserSchema
            },
            responseFormat: 'json'
        }
    });
} catch (error) {
    if (error instanceof SchemaValidationError) {
        console.log('Validation errors:', error.validationErrors);
    }
}
```



## Available Settings

| Setting | Type | Description |
|---------|------|-------------|
| temperature | number | Controls randomness (0-1) |
| maxTokens | number | Maximum tokens to generate |
| topP | number | Nucleus sampling parameter |
| frequencyPenalty | number | Reduces repetition |
| presencePenalty | number | Encourages new topics |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| OPENAI_API_KEY | OpenAI API key | Yes (if using OpenAI) |

## Development

```bash
# Install dependencies
yarn install

# Build the project
yarn build

# Run tests
yarn test

# Try example
yarn example
```

## Contributing

To add support for a new provider:
1. Create a new adapter in `src/adapters`
2. Implement the `LLMProvider` interface
3. Add the provider to `SupportedProviders` type
4. Add default models in a `models.ts` file

## License

MIT 

## Advanced Features

### Usage Tracking

The library provides built-in usage tracking capabilities through an optional callback system. This feature allows you to monitor and analyze the costs and token usage of your LLM calls in real-time. You can implement saving the usage data to a database or other storage.

For streaming calls, the usage is tracked in chunks of 100 tokens and at the end of the streaming response. The first chunk includes both input and output costs, while subsequent chunks only include output costs.

```typescript
const usageCallback = (usageData: UsageData) => {
    console.log(`Usage for caller ${usageData.callerId}:`, {
        costs: usageData.usage.costs,
        tokens: {
            input: usageData.usage.inputTokens,
            output: usageData.usage.outputTokens,
            total: usageData.usage.totalTokens
        },
        timestamp: new Date(usageData.timestamp).toISOString()
    });
};

const caller = new LLMCaller('openai', 'gpt-4', 'You are a helpful assistant.', {
    callerId: 'my-custom-id',
    usageCallback
});
```

#### Why Usage Tracking?

- **Cost Monitoring**: Track expenses in real-time for better budget management
- **Usage Analytics**: Analyze token usage patterns across different conversations
- **Billing Integration**: Easily integrate with billing systems by grouping costs by caller ID
- **Debugging**: Monitor token usage to optimize prompts and prevent token limit issues

The callback receives detailed usage data including:
- Unique caller ID (automatically generated if not provided)
- Input and output token counts
- Cost breakdown (input cost, output cost, total cost)
- Timestamp of the usage

You can change the caller ID during runtime:
```typescript
caller.setCallerId('new-conversation-id');
```

## Error Handling 