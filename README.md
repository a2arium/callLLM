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

## Message Composition

The library provides flexible message composition through three components, with intelligent handling of large data:

### Basic Message Structure
```typescript
const response = await caller.call({
    message: "Your main message here",
    data?: string | object, // Optional data to include, text or object
    endingMessage?: string,  // Optional concluding message
    settings?: { ... }       // Optional settings
});
```

Each component serves a specific purpose in the request:

1. `message`: The primary instruction or prompt (required)
   - Defines what operation to perform on the data
   - Example: "Translate the following text to French" or "Summarize this data"

2. `data`: Additional context or information (optional)
   - Can be a string or object
   - Automatically handles large data by splitting it into manageable chunks
   - For large datasets, multiple API calls are made and results are combined

3. `endingMessage`: Final instructions or constraints (optional)
   - Applied to each chunk when data is split
   - Example: "Keep the translation formal" or "Summarize in bullet points"

### Simple Examples

Here's how components are combined:

```typescript
// With string data
{
    message: "Analyze this text:",
    data: "The quick brown fox jumps over the lazy dog.",
    endingMessage: "Keep the response under 100 words"
}
// Results in:
"Analyze this text:

The quick brown fox jumps over the lazy dog.

Keep the response under 100 words"

// With object data
{
    message: "Analyze this data:",
    data: { temperature: 25, humidity: 60 }
}
// Results in:
"Analyze this data:

{
  "temperature": 25,
  "humidity": 60
}"
```

### Handling Large Data

When the data is too large to fit in the model's context window:

1. The data is automatically split into chunks that fit within token limits
2. Each chunk is processed separately with the same message and endingMessage
3. Results are returned as an array of responses

Example with large text:
```typescript
const response = await caller.call({
    message: "Translate this text to French:",
    data: veryLongText,  // Text larger than model's context window
    endingMessage: "Maintain formal language style"
});
// Returns array of translations, one for each chunk
```

Example with large object:
```typescript
const response = await caller.call({
    message: "Summarize this customer data:",
    data: largeCustomerDatabase,  // Object too large for single request
    endingMessage: "Focus on key trends"
});
// Returns array of summaries, one for each data chunk
```

In both cases:
- Each chunk is sent to the model as: message + data_chunk + endingMessage
- Token limits are automatically respected
- Context and instructions are preserved across chunks

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

The library supports both universal settings and model-specific settings. Settings are passed through to the underlying model provider when applicable.

### Universal Settings

| Setting | Type | Description | Default |
|---------|------|-------------|---------|
| temperature | number | Controls randomness (0-1). Higher values make output more random, lower values make it more deterministic | 1.0 |
| maxTokens | number | Maximum tokens to generate. If not set, uses model's maxResponseTokens | model dependent |
| topP | number | Nucleus sampling parameter (0-1). Alternative to temperature for controlling randomness | 1.0 |
| frequencyPenalty | number | Reduces repetition (-2.0 to 2.0). Higher values penalize tokens based on their frequency | 0.0 |
| presencePenalty | number | Encourages new topics (-2.0 to 2.0). Higher values penalize tokens that have appeared at all | 0.0 |
| responseFormat | 'text' \| 'json' | Specifies the desired response format | 'text' |
| jsonSchema | { name?: string; schema: JSONSchemaDefinition } | Schema for response validation and formatting | undefined |

### Model-Specific Settings

Some settings are specific to certain providers or models. These settings are passed through to the underlying API:

#### OpenAI-Specific Settings
```typescript
{
    // OpenAI-specific settings
    user?: string;           // Unique identifier for end-user
    n?: number;             // Number of completions (default: 1)
    stop?: string[];        // Custom stop sequences
    logitBias?: Record<string, number>; // Token biasing
}
```

### Settings Validation

The library validates settings before passing them to the model:
- Temperature must be between 0 and 2
- TopP must be between 0 and 1
- Frequency and presence penalties must be between -2 and 2
- MaxTokens must be positive and within model limits

Example with model-specific settings:
```typescript
const response = await caller.chatCall({
    message: "Hello",
    settings: {
        // Universal settings
        temperature: 0.7,
        maxTokens: 1000,
        
        // OpenAI-specific settings
        user: "user-123",
        stop: ["\n", "Stop"],
        logitBias: {
            50256: -100  // Bias against specific token
        }
    }
});
```

## Settings Management

The library provides flexible settings management at both the class level and method level. You can:
1. Initialize settings when creating the LLMCaller instance
2. Update settings after initialization
3. Override settings for individual calls

### Class-Level Settings

Set default settings for all calls when initializing:

```typescript
const caller = new LLMCaller('openai', 'gpt-4', 'You are a helpful assistant.', {
    apiKey: 'your-api-key',
    settings: {
        temperature: 0.7,
        maxTokens: 1000
    }
});
```

Update settings after initialization:

```typescript
// Update specific settings
caller.updateSettings({
    temperature: 0.9
});
```

### Method-Level Settings

Override class-level settings for individual calls:

```typescript
// Override temperature just for this call
const response = await caller.chatCall({
    message: "Hello",
    settings: {
        temperature: 0.5  // This takes precedence over class-level setting
    }
});

// Settings work with all call types
const stream = await caller.streamCall({
    message: "Hello",
    settings: { temperature: 0.5 }
});

const responses = await caller.call({
    message: "Hello",
    settings: { temperature: 0.5 }
});
```

### Settings Merging

When both class-level and method-level settings are provided:
- Method-level settings take precedence over class-level settings
- Settings not specified at method level fall back to class-level values
- Settings not specified at either level use the model's defaults

Example:
```typescript
// Initialize with class-level settings
const caller = new LLMCaller('openai', 'gpt-4', 'You are a helpful assistant.', {
    settings: {
        temperature: 0.7,
        maxTokens: 1000
    }
});

// Make a call with method-level settings
const response = await caller.chatCall({
    message: "Hello",
    settings: {
        temperature: 0.5,  // Overrides class-level
        topP: 0.8         // New setting
    }
});
// Effective settings:
// - temperature: 0.5 (from method)
// - maxTokens: 1000 (from class)
// - topP: 0.8 (from method)
```

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