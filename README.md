# callLLM - Unified LLM Orchestration for TypeScript

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/lang-TypeScript-007ACC.svg)



```typescript
// Unified example across providers
const caller = new LLMCaller('openai', 'balanced', 'Analyst assistant');
const response = await caller.call({
    message: "Analyze these logs:",
    data: massiveSecurityLogs, // 250MB+ of data
    endingMessage: "Identify critical vulnerabilities",
    settings: {
        responseFormat: 'json',
        jsonSchema: VulnerabilitySchema
    }
});
```

## Why callLLM?

*   **Multi-Provider Support**: Easily switch between different LLM providers (currently OpenAI, with others planned).
*   **Streaming**: Native support for handling streaming responses.
*   **Large Data Handling**: Automatic chunking and processing of large text or JSON data that exceeds model context limits.
*   **JSON Mode & Schema Validation**: Robust support for enforcing JSON output, validating against Zod or JSON schemas.
*   **Tool Calling**: Unified interface for defining and using tools (function calling) with LLMs.
*   **Cost Tracking**: Automatic calculation and reporting of token usage and costs per API call.
*   **Model Management**: Flexible model selection using aliases (`fast`, `cheap`, `balanced`, `premium`) or specific names, with built-in defaults and support for custom models.
*   **Retry Mechanisms**: Built-in resilience against transient API errors using exponential backoff.
*   **History Management**: Easy management of conversation history.


```bash
yarn add callllm
```
or 
```bash
npm install callllm
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
    // For intermediate chunks, use content for incremental display
    if (!chunk.isComplete) {
        process.stdout.write(chunk.content);
    } else {
        // For the final chunk, contentText has the complete response
        console.log(`\nFinal response: ${chunk.contentText}`);
    }
    
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
- `'balanced'`: Good balance of speed and quality and cost
- `'cheap'`: Optimized for cost (best price/quality ratio)

## Model Information

Each model includes the following information:
```typescript
type ModelInfo = {
    name: string;              // Model identifier
    inputPricePerMillion: number;   // Price per million input tokens
    inputCachedPricePerMillion?: number;  // Price per million cached input tokens
    outputPricePerMillion: number;  // Price per million output tokens
    maxRequestTokens: number;  // Maximum tokens in request
    maxResponseTokens: number; // Maximum tokens in response
    tokenizationModel?: string;  // Optional model name to use for token counting
    capabilities?: {
        streaming?: boolean;        // Support for streaming responses (default: true)
        toolCalls?: boolean;        // Support for tool/function calling (default: false)
        parallelToolCalls?: boolean; // Support parallel tool calls (default: false)
        batchProcessing?: boolean;   // Support for batch processing (default: false)
        systemMessages?: boolean;    // Support for system messages (default: true)
        temperature?: boolean;       // Support for temperature setting (default: true)
        jsonMode?: boolean;         // Support for JSON mode output (default: false)
    };
    characteristics: {
        qualityIndex: number;      // 0-100 quality score
        outputSpeed: number;       // Tokens per second
        firstTokenLatency: number; // Time to first token in milliseconds
    };
};
```

Default OpenAI Models:
| Model | Input Price (per 1M) | Cached Input Price (per 1M) | Output Price (per 1M) | Quality Index | Output Speed (t/s) | First Token Latency (ms) |
|-------|---------------------|---------------------------|---------------------|---------------|-----------------|----------------------|
| gpt-4o | $2.50 | $1.25 | $10.00 | 78 | 109.3 | 720 |
| gpt-4o-mini | $0.15 | $0.075 | $0.60 | 73 | 183.8 | 730 |
| o1 | $15.00 | $7.50 | $60.00 | 85 | 151.2 | 22490 |
| o1-mini | $3.00 | $1.50 | $12.00 | 82 | 212.1 | 10890 |

Model characteristics (quality index, output speed, and latency) are sourced from comprehensive benchmarks and real-world usage data. https://artificialanalysis.ai/models 


### Model Capabilities

Each model defines its capabilities, which determine what features are supported:

- **streaming**: Support for streaming responses (default: true)
- **toolCalls**: Support for tool/function calling (default: false)
- **parallelToolCalls**: Support for parallel tool calls (default: false)
- **batchProcessing**: Support for batch processing (default: false)
- **systemMessages**: Support for system messages (default: true)
- **temperature**: Support for temperature setting (default: true)
- **jsonMode**: Support for JSON mode output (default: false)

The library automatically handles unsupported features:
- Requests using unsupported features will be rejected with clear error messages
- Some features (like system messages) will be gracefully degraded when unsupported

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
interface UniversalStreamResponse<T = unknown> {
    content: string;      // Current chunk content
    contentText?: string; // Complete accumulated text (available when isComplete is true)
    contentObject?: T;    // Parsed object (available for JSON responses when isComplete is true)
    role: string;
    isComplete: boolean;
    metadata?: {
        finishReason?: FinishReason;
        usage?: Usage;
        [key: string]: any;
    };
}
```

### Streaming Content Handling

When streaming responses, there are different properties available depending on whether you're streaming text or JSON:

#### Streaming Text
```typescript
const stream = await caller.streamCall({
    message: 'Tell me a story',
    settings: { temperature: 0.9 }
});

for await (const chunk of stream) {
    // For incremental updates, use content
    if (!chunk.isComplete) {
        process.stdout.write(chunk.content);
    } else {
        // For the final complete text, use contentText
        console.log(`\nComplete story: ${chunk.contentText}`);
    }
}
```

#### Streaming JSON
```typescript
import { z } from 'zod';

// Define a schema for your JSON response
const UserSchema = z.object({
    name: z.string(),
    age: z.number(),
    email: z.string().email(),
    interests: z.array(z.string())
});

// Use the generic type parameter for proper typing
const stream = await caller.streamCall<typeof UserSchema>({
    message: 'Generate user profile data',
    settings: {
        jsonSchema: { 
            name: 'UserProfile',
            schema: UserSchema 
        },
        responseFormat: 'json'
    }
});

for await (const chunk of stream) {
    // For incremental updates (showing JSON forming), use content
    if (!chunk.isComplete) {
        process.stdout.write(chunk.content);
    } else {
        // For the complete response, you have two options:
        
        // 1. contentText - Complete raw JSON string
        console.log('\nComplete JSON string:', chunk.contentText);
        
        // 2. contentObject - Already parsed and validated JSON object
        // TypeScript knows this is of type z.infer<typeof UserSchema>
        console.log('\nParsed JSON object:', chunk.contentObject);
        
        // No need for type assertion when using generic type parameter
        if (chunk.contentObject) {
            console.log(`Name: ${chunk.contentObject.name}`);
            console.log(`Age: ${chunk.contentObject.age}`);
            console.log('Interests:');
            chunk.contentObject.interests.forEach(interest => {
                console.log(`- ${interest}`);
            });
        }
    }
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

1. The data is automatically split into chunks that fit within token limits. Both strings and objects are supported.
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
import { z } from 'zod';

const UserSchema = z.object({
    name: z.string(),
    age: z.number(),
    interests: z.array(z.string())
});

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
    // For intermediate chunks, display content as it arrives
    if (!chunk.isComplete) {
        process.stdout.write(chunk.content);
    } else {
        // Final chunk provides two important properties:
        
        // 1. contentText - The complete, accumulated JSON text
        console.log('\nComplete JSON text:', chunk.contentText);
        
        // 2. contentObject - The parsed, validated JSON object with proper typing
        console.log('\nParsed object:', chunk.contentObject);
        
        // TypeScript ensures correct typing of contentObject
        // You can access properties directly with type safety
        const profile = chunk.contentObject as z.infer<typeof UserSchema>;
        console.log(`\nName: ${profile.name}, Age: ${profile.age}`);
        
        // Type inference works with generic type parameter
        profile.interests.forEach(interest => {
            console.log(`- ${interest}`);
        });
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

## Error Handling and Retries

The library includes a robust retry mechanism for both regular and streaming calls. This helps handle transient failures and network issues gracefully.

### Retry Configuration

You can configure retries at both the class level and method level using the `maxRetries` setting:

```typescript
// Set maxRetries at class level
const caller = new LLMCaller('openai', 'gpt-4', 'You are a helpful assistant.', {
    settings: {
        maxRetries: 3  // Will retry up to 3 times
    }
});

// Override maxRetries for a specific call
const response = await caller.chatCall({
    message: 'Hello',
    settings: {
        maxRetries: 2  // Will retry up to 2 times for this call only
    }
});
```

### Regular Call Retries

For regular (non-streaming) calls, the library will:
1. Attempt the call
2. If it fails, wait with exponential backoff (1s, 2s, 4s, etc.)
3. Retry up to the specified number of times
4. Throw an error if all retries are exhausted

```typescript
try {
    const response = await caller.chatCall({
        message: 'Hello',
        settings: { maxRetries: 2 }
    });
} catch (error) {
    // Will contain message like: "Failed after 2 retries. Last error: API error"
    console.error(error);
}
```

### Streaming Call Retries

The library provides two levels of retry protection for streaming calls:

1. **Initial Connection Retries**:
   - Uses the same retry mechanism as regular calls
   - Handles failures during stream initialization
   - Uses exponential backoff between attempts

```typescript
try {
    const stream = await caller.streamCall({
        message: 'Hello',
        settings: { maxRetries: 2 }
    });
    
    for await (const chunk of stream) {
        console.log(chunk.content);
    }
} catch (error) {
    // Will contain message like: "Failed to start stream after 2 retries"
    console.error(error);
}
```

2. **Mid-Stream Retries**:
   - Handles failures after the stream has started
   - Preserves accumulated content across retries
   - Continues from where it left off
   - Uses exponential backoff between attempts

```typescript
const stream = await caller.streamCall({
    message: 'Tell me a story',
    settings: { maxRetries: 2 }
});

try {
    for await (const chunk of stream) {
        // If stream fails mid-way:
        // 1. Previous content is preserved
        // 2. Stream is re-established
        // 3. Continues from where it left off
        console.log(chunk.content);
    }
} catch (error) {
    // Will contain message like: "Stream failed after 2 retries"
    console.error(error);
}
```

### Exponential Backoff

Both regular and streaming retries use exponential backoff to avoid overwhelming the API:
- First retry: 1 second delay
- Second retry: 2 seconds delay
- Third retry: 4 seconds delay
- And so on...

This helps prevent rate limiting and gives transient issues time to resolve.

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
        costs: {
            input: usageData.usage.costs.inputCost,
            inputCached: usageData.usage.costs.inputCachedCost, // Cost for cached input tokens
            output: usageData.usage.costs.outputCost,
            total: usageData.usage.costs.totalCost
        },
        tokens: {
            input: usageData.usage.inputTokens,
            inputCached: usageData.usage.inputCachedTokens, // Number of cached input tokens
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

- **Cost Monitoring**: Track expenses in real-time for better budget management, including savings from cached inputs
- **Usage Analytics**: Analyze token usage patterns across different conversations
- **Billing Integration**: Easily integrate with billing systems by grouping costs by caller ID
- **Debugging**: Monitor token usage to optimize prompts and prevent token limit issues
- **Cache Performance**: Track cached input token usage to measure caching effectiveness

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

## Tool Calling

The library now supports OpenAI's function calling feature through a unified tool calling interface. This allows you to define tools (functions) that the model can use to perform actions or retrieve information.

## Overview

The library now supports OpenAI's function calling feature through a unified tool calling interface. This allows you to define tools (functions) that the model can use to perform actions or retrieve information.

## Basic Usage

```typescript
// Define your tools
const tools = [{
    name: 'get_weather',
    description: 'Get the current weather',
    parameters: {
        type: 'object',
        properties: {
            location: {
                type: 'string',
                description: 'The city and state'
            }
        },
        required: ['location']
    }
}];

// Make a chat call with tool definitions
const response = await adapter.chatCall({
    messages: [
        { role: 'user', content: 'What\'s the weather in New York?' }
    ],
    settings: {
        tools,
        toolChoice: 'auto' // Let the model decide when to use tools
    }
});

// Handle tool calls in the response
if (response.toolCalls) {
    for (const call of response.toolCalls) {
        if (call.name === 'get_weather') {
            const weather = await getWeather(call.arguments.location);
            // Send the tool's response back to continue the conversation
            const followUpResponse = await adapter.chatCall({
                messages: [
                    ...previousMessages,
                    { role: 'assistant', content: response.content, toolCalls: response.toolCalls },
                    { role: 'tool', name: 'get_weather', content: JSON.stringify(weather) }
                ]
            });
        }
    }
}
```

## Streaming Support

Tool calls are also supported in streaming mode:

```typescript
const stream = await adapter.streamCall({
    messages: [
        { role: 'user', content: 'What\'s the weather in New York?' }
    ],
    settings: {
        tools,
        toolChoice: 'auto',
        stream: true
    }
});

for await (const chunk of stream) {
    if (chunk.toolCallDeltas) {
        // Handle partial tool calls
        console.log('Partial tool call:', chunk.toolCallDeltas);
    }
    if (chunk.toolCalls) {
        // Handle complete tool calls
        console.log('Complete tool calls:', chunk.toolCalls);
    }
    
    // For intermediate chunks, display content as it arrives
    if (!chunk.isComplete) {
        process.stdout.write(chunk.content);
    } else {
        // For final chunk, use contentText for complete response
        console.log('\nComplete response:', chunk.contentText);
    }
}
```

## Parallel Tool Calls

For models that support it, you can make parallel tool calls:

```typescript
const response = await adapter.chatCall({
    messages: [
        { role: 'user', content: 'Get weather for multiple cities' }
    ],
    settings: {
        tools,
        toolCalls: [
            { name: 'get_weather', arguments: { location: 'New York, NY' } },
            { name: 'get_weather', arguments: { location: 'Los Angeles, CA' } }
        ]
    }
});
```

## Best Practices

### Tool Definition

1. Keep tool names concise and descriptive
2. Use clear parameter names and descriptions
3. Specify required parameters
4. Use appropriate JSON Schema types
5. Include examples in descriptions when helpful

### Tool Call Handling

1. Always validate tool call arguments
2. Implement proper error handling for tool execution
3. Format tool responses as JSON strings
4. Include relevant context in tool responses
5. Handle streaming tool calls appropriately

### Error Handling

The library includes built-in error handling for tool calls:

```typescript
try {
    const response = await adapter.chatCall({
        messages: [{ role: 'user', content: 'Check weather' }],
        settings: { tools }
    });
} catch (error) {
    if (error instanceof ToolCallError) {
        console.error('Tool call failed:', error.message);
    }
}
```

## Logging Configuration

The library uses a configurable logging system that can be controlled through environment variables. You can set different log levels to control the verbosity of the output.

For detailed logging guidelines and best practices, see [Logging Rules](.cursor/rules/logging.mdc).

### Log Levels

Set the `LOG_LEVEL` environment variable to one of the following values:

- `debug`: Show all logs including detailed debug information
- `info`: Show informational messages, warnings, and errors
- `warn`: Show only warnings and errors
- `error`: Show only errors

### Configuration

1. Create a `.env` file in your project root (or copy the example):
```env
LOG_LEVEL=warn  # or debug, info, error
```

2. The log level can also be set programmatically:
```typescript
import { logger } from './utils/logger';

logger.setConfig({ level: 'debug' });
```

### Default Behavior

- If no `LOG_LEVEL` is specified, it defaults to `info`
- In test environments, logging is automatically minimized
- Warning and error messages are always shown regardless of log level

### Log Categories

The logger automatically prefixes logs with their source component:
- `[ToolController]` - Tool execution related logs
- `[ToolOrchestrator]` - Tool orchestration and workflow logs
- `[ChatController]` - Chat and message processing logs
- `[StreamController]` - Streaming related logs
