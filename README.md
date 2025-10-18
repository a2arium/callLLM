# callLLM - Unified LLM Orchestration for TypeScript

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/lang-TypeScript-007ACC.svg)


# NOTE: This is a work in progress and is not yet ready for production use.

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
*   **JSON Mode & Schema Validation**: Support for enforcing JSON output with native JSON mode or prompt enhancement fallback for models that don't support structured output. Validation against Zod or JSON schemas.
*   **Tool Calling**: Unified interface for defining and using tools (function calling) with LLMs.
*   **Function Folders**: Organize tools in separate files and load them dynamically using a directory, with automatic type and documentation extraction.
*   **MCP Client Support**: Connect to Model Context Protocol (MCP) servers to access external tools and resources. Seamlessly integrate with LLM tools.
*   **Cost Tracking**: Automatic calculation and reporting of token usage and costs per API call.
*   **Model Management**: Flexible model selection using aliases (`fast`, `cheap`, `balanced`, `premium`) or specific names, with built-in defaults and support for custom models.
*   **Retry Mechanisms**: Built-in resilience against transient API errors using exponential backoff.
*   **History Management**: Conversation history management to build chat based conversation or stateless calls without prior history.


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

## Documentation

- [Function Folders](docs/function-folders.md) - Learn how to organize tools in separate files
- [Working with Images](docs/images.md) - Guide to using multimodal models with image inputs and generating images
- Video generation with OpenAI Sora (see below)
- [GPT-5, Reasoning & Verbosity](docs/gpt5.md) - Using GPT-5 features, reasoning effort (incl. 'minimal'), and verbosity
- More documentation coming soon

## Usage

```typescript
import { LLMCaller } from 'callllm';

// Standard initialization
const caller = new LLMCaller('openai', 'gpt-4');

// With system message
const caller = new LLMCaller('openai', 'gpt-4', 'You are a helpful assistant.');

// With options
const caller = new LLMCaller('openai', 'gpt-4', 'You are a helpful assistant.', {
    apiKey: 'your-api-key',  // Use env var instead in production
    historyMode: 'stateless',
    maxChunkIterations: 50,  // Allow up to 50 data chunks (default: 20)
    settings: {
        temperature: 0.7,
        maxTotalTokens: 4000
    }
});
```

### Simple Chat

```typescript
// Basic call
const response = await caller.call('Tell me about AI');

// Response is an array of chat responses
console.log(response[0].content);

// For streaming, use an async generator
for await (const chunk of caller.stream('Tell me about AI')) {
    process.stdout.write(chunk.contentChunk || '');
}
```

### Image Generation and Editing

```typescript
// Generate an image and save to file
const result = await caller.call({
  text: "A beautiful mountain landscape",
  output: {
    image: {
      quality: "high",
      size: "1024x1024"
    }
  },
  outputPath: "./mountain.png"
});

console.log("Image saved to:", result[0].metadata?.imageSavedPath);

// Get image as base64 data
const result = await caller.call({
  text: "A futuristic city skyline",
  output: {
    image: {
      quality: "medium",
      size: "1024x1024"
    }
  }
});

// Image data is available in the response
console.log("Image data:", result[0].image?.data);

// Edit an existing image
const editResult = await caller.call({
  text: "Add a small cabin to this landscape",
  file: "./mountain.png",
  output: {
    image: { quality: "high" }
  },
  outputPath: "./mountain_with_cabin.png"
});
```

For more examples, see the [examples directory](examples).

### JSON Output

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
    capabilities?: ModelCapabilities;
    characteristics: {
        qualityIndex: number;      // 0-100 quality score
        outputSpeed: number;       // Tokens per second
        firstTokenLatency: number; // Time to first token in milliseconds
    };
};

/**
 * Model capabilities configuration.
 * Defines what features the model supports.
 */
type ModelCapabilities = {
    /**
     * Whether the model supports streaming responses.
     * @default true
     */
    streaming?: boolean;

    /**
     * Whether the model supports tool/function calling.
     * @default false
     */
    toolCalls?: boolean;

    /**
     * Whether the model supports parallel tool/function calls.
     * @default false
     */
    parallelToolCalls?: boolean;

    /**
     * Whether the model supports batch processing.
     * @default false
     */
    batchProcessing?: boolean;
    
    /**
     * Whether the model supports system messages.
     * @default true
     */
    systemMessages?: boolean;
    
    /**
     * Whether the model supports temperature settings.
     * @default true
     */
    temperature?: boolean;

    /**
     * Capabilities related to model input.
     * The presence of a modality key indicates support for that input type.
     */
    input: {
        /**
         * Text input capability.
         * Boolean true indicates basic support, object provides configuration options.
         */
        text: true | {
            // Additional text input configuration options could be added here
        };

        /**
         * Image input capability.
         * Boolean true indicates basic support, object provides configuration options.
         */
        image?: true | {
            /** Supported image formats */
            formats?: string[];
            /** Maximum dimensions supported */
            maxDimensions?: [number, number];
            /** Maximum file size in bytes */
            maxSize?: number;
        };
    };

    /**
     * Capabilities related to model output.
     * The presence of a modality key indicates support for that output type.
     */
    output: {
        /**
         * Text output capability.
         * Boolean true indicates basic text output only, object provides configuration options.
         */
        text: true | {
            /**
             * Supported text output formats.
             * If 'json' is included, JSON output is supported.
             * @default ['text']
             */
            textOutputFormats: ('text' | 'json')[];
        };

        /**
         * Image output capability.
         * Boolean true indicates basic support, object provides configuration options.
         */
        image?: true | {
            /** Supported image formats */
            formats?: string[];
            /** Available image dimensions */
            dimensions?: Array<[number, number]>;
        };
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
and
https://models.litellm.ai/ 

### Model Capabilities

Each model defines its capabilities, which determine what features are supported:

- **streaming**: Support for streaming responses (default: true)
- **toolCalls**: Support for tool/function calling (default: false)
- **parallelToolCalls**: Support for parallel tool calls (default: false)
- **batchProcessing**: Support for batch processing (default: false)
- **input**: Supported input modalities:
  - **text**: Text input support (required)
  - **image**: Image input support (optional)
  - **audio**: Audio input support (optional)
- **output**: Supported output modalities:
  - **text**: Text output support (required)
    - **textOutputFormats**: Supported formats (e.g., ['text', 'json'])

The library automatically handles unsupported features:
- Requests using unsupported features will be rejected with clear error messages
- Some features will be gracefully degraded when unsupported

For example, a model with JSON support would have:
```typescript
capabilities: {
  streaming: true,
  toolCalls: true,
  input: {
    text: true // Basic text input support
  },
  output: {
    text: {
      textOutputFormats: ['text', 'json'] // Both text and JSON output supported
    }
  }
}
```

### Video Generation 

Video creation is asynchronous. You can either block until completion or create a job and poll it later.  

Blocking (poll + auto‑download):
```typescript
const caller = new LLMCaller('openai', 'sora-2');
const result = await caller.call({
  text: "A video of the words 'Thank you' in sparkling letters",
  output: { video: { size: '1280x720', seconds: 8, wait: 'poll' } },
  outputPath: './output/video.mp4' // auto-download final MP4 when complete
});

console.log('Status:', result[0].metadata?.videoStatus);
console.log('Saved:', result[0].metadata?.videoSavedPath);
console.log('Usage:', result[0].metadata?.usage); // includes videoSeconds and cost
```

Non‑blocking (create + manual retrieve/download):
```typescript
const res = await caller.call({
  text: 'A cool cat on a motorcycle in the night',
  output: { video: { size: '1280x720', seconds: 8, wait: 'none' } }
});

const jobId = res[0].metadata?.videoJobId!;
let job = await caller.retrieveVideo(jobId);
while (job.status === 'queued' || job.status === 'in_progress') {
  await new Promise(r => setTimeout(r, 2000));
  job = await caller.retrieveVideo(jobId);
}
if (job.status === 'completed') {
  await caller.downloadVideo(jobId, { variant: 'video', outputPath: './output/video2.mp4' });
}
```

Models and capabilities:
- `sora-2`, `sora-2-pro` support `input.text`, `input.image`, `output.video`, and `output.audio` (synced audio with video).
- `output.video` options: `size` (`'1280x720' | '720x1280'`), `seconds` (number, provider-specific; OpenAI accepts 1-60), `wait` (`'none' | 'poll'`), `variant` (`'video' | 'thumbnail' | 'spritesheet'`).

Pricing and usage:
- Video cost is computed as `seconds × model.outputPricePerSecond` and exposed in `metadata.usage.costs.output.video`.
- `usageCallback` (if provided) is invoked with usage after a video call completes.

Example script:
```bash
yarn example:video
```

## Token Counting and Pricing

The library automatically tracks token usage and calculates costs for each request:

- Uses provider's token counts when available (e.g., from OpenAI response)
- Falls back to local token counting using `@dqbd/tiktoken` when needed
- Calculates costs based on model's price per million tokens
- Provides real-time token counting for streaming responses
- Includes both input and output token counts and costs

For streaming calls, usage is reported in 100‑token batches (by default) via delta callbacks, and after the final chunk, the metadata carries the full cumulative usage. The first callback includes prompt-input, output, and reasoning tokens/costs; subsequent callbacks include only output and reasoning.

## Supported Providers

Currently supported LLM providers:
- OpenAI (ChatGPT)
- More coming soon (Anthropic, Google, etc.)

## Capability-Aware Alias Resolution

The library now supports capability-aware alias resolution, which means that when you use model aliases (`cheap`, `balanced`, `fast`, `premium`), the system will automatically select the best model that supports the specific capabilities you need.

### How It Works

When you request specific features like image generation, JSON output, or embeddings, the library will:

1. **Filter models** based on the required capabilities
2. **Apply the alias selection logic** (cheapest, fastest, etc.) on the filtered models
3. **Return the optimal model** that meets your requirements

### Examples

```typescript
import { LLMCaller } from 'callllm';
import type { CapabilityRequirement } from 'callllm';

const caller = new LLMCaller('openai', 'cheap', 'You are a helpful assistant.');

// Basic text output - selects cheapest text-capable model
const textModel = caller.getModel('cheap');

// JSON output - automatically finds a cheap model that supports JSON
const jsonRequirements: CapabilityRequirement = {
    textOutput: {
        required: true,
        formats: ['json']
    }
};
const jsonModel = caller.getModel('cheap', jsonRequirements);

// Image generation - finds a cheap model that can generate images
const imageGenRequirements: CapabilityRequirement = {
    imageOutput: {
        required: true,
        operations: ['generate']
    }
};
const imageModel = caller.getModel('cheap', imageGenRequirements);

// Embeddings - finds a cheap embedding model
const embeddingRequirements: CapabilityRequirement = {
    embeddings: { required: true }
};
const embeddingModel = caller.getModel('cheap', embeddingRequirements);

// Tool calls - finds a cheap model that supports function calling
const toolCallRequirements: CapabilityRequirement = {
    toolCalls: { required: true }
};
const toolCallModel = caller.getModel('cheap', toolCallRequirements);
```

### Supported Capability Requirements

- **Text Output**: `textOutput: { required: boolean, formats?: ('text' | 'json')[] }`
- **Image Input**: `imageInput: { required: boolean }`
- **Image Output**: `imageOutput: { required: boolean, operations?: ('generate' | 'edit' | 'editWithMask')[] }`
- **Tool Calls**: `toolCalls: { required: boolean, parallel?: boolean }`
- **Streaming**: `streaming: { required: boolean }`
- **Embeddings**: `embeddings: { required: boolean, dimensions?: number[], encodingFormat?: 'float' | 'base64' }`
- **Reasoning**: `reasoning: { required: boolean }`

The capability-aware resolution is automatically used in:

- `embeddings()` method calls
- `call()` and `stream()` methods when image output is requested
- `call()` and `stream()` methods when JSON output is requested
- Manual model resolution via `getModel(nameOrAlias, requirements)`

### Adding New Providers

The library uses an extensible adapter pattern that makes it easy to add support for new LLM providers. To add a new provider:

1. Create a new adapter class implementing the `ProviderAdapter` interface
2. Add the adapter to the adapter registry in `src/adapters/index.ts`
3. The provider will automatically be added to the `RegisteredProviders` type

See [ADAPTERS.md](ADAPTERS.md) for detailed instructions on implementing new provider adapters.

```typescript
// Example usage with a new provider
const caller = new LLMCaller('your-provider', 'your-model', 'You are a helpful assistant.');
```

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
interface UniversalChatResponse<T = unknown> {
    content: string;
    contentObject?: T;
    /**
     * Summary of the model's reasoning process, if available.
     */
    reasoning?: string;
    role: string;
    messages?: UniversalMessage[];
    metadata?: {
        finishReason?: FinishReason;
        created?: number;
        usage?: Usage;
        [key: string]: any;
    };
}

interface Usage {
    tokens: {
        input: {
            total: number;
            cached: number;
        },
        output: {
            total: number;
            reasoning: number;
        },
        total: number;
    };
    costs: {
        input: {
            total: number;
            cached: number;
        },
        output: {
            total: number;
            reasoning: number;
        },
        total: number;
    };
}
```

### Stream Response
```typescript
interface UniversalStreamResponse<T = unknown> {
    content: string;         // Current chunk content
    /**
     * Chunk-level reasoning summary or delta.
     */
    reasoning?: string;
    contentText?: string;    // Complete accumulated text (available when isComplete is true)
    /**
     * Complete accumulated reasoning text (available when isComplete is true).
     */
    reasoningText?: string;
    /**
     * True on the first streamed chunk with non-empty content.
     */
    isFirstContentChunk?: boolean;
    /**
     * True on the first streamed chunk with non-empty reasoning.
     */
    isFirstReasoningChunk?: boolean;
    contentObject?: T;       // Parsed object (available for JSON responses when isComplete is true)
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
const stream = await caller.stream(
    'Tell me a story',
    {
        settings: { temperature: 0.9 }
    }
);

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
const stream = await caller.stream<typeof UserSchema>(
    'Generate user profile data',
    {
        settings: {
            jsonSchema: { 
                name: 'UserProfile',
                schema: UserSchema 
            },
            responseFormat: 'json'
        }
    }
);

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

#### Smart Markdown Splitting

When processing markdown content, the library automatically detects markdown formatting and uses intelligent hierarchical splitting:

- **Automatic Detection**: Uses pattern matching to identify markdown content (headers, lists, code blocks, tables, etc.)
- **Hierarchical Awareness**: Splits along semantic boundaries like section headers rather than arbitrary token limits
- **Structure Preservation**: Maintains document hierarchy and context, keeping related content together
- **Metadata Enrichment**: Provides section paths, heading information, and preserved elements for enhanced processing

For example, a markdown document with sections will be split at natural boundaries:
```markdown
# Recipe Book
## Chocolate Chip Cookies
### Ingredients
* 2 cups flour
* 1 cup sugar
### Instructions
1. Mix ingredients
2. Bake at 350°F
```

The library will split this into logical sections rather than cutting in the middle of ingredient lists or instructions, ensuring each chunk maintains semantic meaning.

### Forcing Input Splitting with maxCharsPerChunk

If you want to force splitting of your input data into smaller pieces—regardless of token limits—you can use the `maxCharsPerChunk` option:

- **Purpose:**
  - Enforces a maximum number of characters per chunk when processing input data (string, array, or object).
  - Useful when you want to control chunk size by character count, not by limiting the tokens on the model level.
- **How it works:**
  - If `maxCharsPerChunk` is set, the input will be split so that no chunk exceeds this character limit.
  - The splitting logic still uses intelligent strategies (sentence/word boundaries) when possible, so chunks are as natural as possible.
  - Both token and character limits are respected: the stricter of the two is always enforced.

**Example:**
```typescript
const response = await caller.call({
    message: "Analyze this text:",
    data: veryLongText,
    maxCharsPerChunk: 1000, // Each chunk will be at most 1000 characters});
// Returns an array of responses, one for each chunk
```

This is especially useful for:
- Forcing smaller chunk sizes for downstream processing
- Working with models or APIs that have additional non-token-based limits
- Debugging or testing chunking behavior

### Chunk Iteration Limits

To prevent runaway processing with extremely large datasets, the library enforces a maximum number of chunks that can be processed in a single call:

- **Default limit**: 20 chunks per call
- **Configurable**: Set `maxChunkIterations` when creating the LLMCaller
- **Safety mechanism**: Prevents excessive API calls and processing time

**Example:**
```typescript
// Configure higher chunk limit for large datasets
const caller = new LLMCaller('openai', 'gpt-4', 'You are a helpful assistant.', {
    maxChunkIterations: 50,  // Allow up to 50 chunks (default: 20)
    settings: {
        temperature: 0.7
    }
});

// This will now work with larger datasets that require more chunks
const response = await caller.call({
    message: "Analyze this large dataset:",
    data: veryLargeDataset,
    settings: { maxTokens: 1000 }
});
```

If you encounter a `ChunkIterationLimitError`, you can:
1. **Increase the limit**: Set a higher `maxChunkIterations` value
2. **Optimize your data**: Use `maxCharsPerChunk` to create smaller chunks
3. **Pre-process your data**: Split your dataset before passing it to the library

**When to adjust the limit:**
- Large document processing (>1MB of text)
- Bulk data analysis tasks
- Processing datasets with many small items
- Working with verbose JSON structures

## JSON Mode and Schema Validation

The library supports structured outputs with schema validation using either Zod schemas or JSON Schema. You can configure these parameters either at the root level of the options object or within the settings property:

### JSON Mode Support

The library provides flexible control over how JSON responses are handled through the `jsonMode` setting:

1. **Native JSON Mode**: Uses the model's built-in JSON mode 
2. **Prompt Enhancement**: Uses prompt engineering and response parsing to ensure JSON output

You can control this behavior with three modes:

```typescript
// Default behavior: Use native if available, fallback to prompt if not
const response = await caller.call(
    'Generate a user profile',
    {
        responseFormat: 'json',
        jsonSchema: {
            name: 'UserProfile',
            schema: UserSchema
        },
        settings: {
            jsonMode: 'fallback'  // Default value
        }
    }
);

// Require native JSON mode support
const response = await caller.call(
    'Generate a user profile',
    {
        responseFormat: 'json',
        jsonSchema: {
            name: 'UserProfile',
            schema: UserSchema
        },
        settings: {
            jsonMode: 'native-only'  // Will throw error if model doesn't support JSON mode
        }
    }
);

// Force using prompt enhancement
const response = await caller.call(
    'Generate a user profile',
    {
        responseFormat: 'json',
        jsonSchema: {
            name: 'UserProfile',
            schema: UserSchema
        },
        settings: {
            jsonMode: 'force-prompt'  // Always use prompt enhancement, even if native JSON mode is available
        }
    }
);
```

The three modes are:

- **fallback** (default): 
  - Uses native JSON mode if the model supports it
  - Falls back to prompt enhancement if native support is unavailable
  - Ensures consistent JSON output across all supported models

- **native-only**:
  - Only uses native JSON mode
  - Throws an error if the model doesn't support JSON mode
  - Useful when you need guaranteed native JSON support

- **force-prompt**:
  - Always uses prompt enhancement
  - Ignores native JSON mode even if available
  - Useful when you prefer the prompt-based approach or need consistent behavior across different models

### Using Zod Schema

```typescript
import { z } from 'zod';

const UserSchema = z.object({
    name: z.string(),
    age: z.number(),
    interests: z.array(z.string())
});

// Recommended approach: properties at root level
const response = await caller.call<typeof UserSchema>(
    'Generate a profile for a user named Alice',
    {
        jsonSchema: {
            name: 'UserProfile',
            schema: UserSchema
        },
        responseFormat: 'json',
        settings: {
            temperature: 0.7
        }
    }
);

// Alternative approach: properties nested in settings
const response = await caller.call<typeof UserSchema>(
    'Generate a profile for a user named Alice',
    {
        settings: {
            jsonSchema: {
                name: 'UserProfile',
                schema: UserSchema
            },
            responseFormat: 'json',
            temperature: 0.7
        }
    }
);

// response.content is typed as { name: string; age: number; interests: string[] }
```

### Using JSON Schema

```typescript
// Recommended approach: properties at root level
const response = await caller.call(
    'Generate a recipe',
    {
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
);
```

Note: The library automatically adds `additionalProperties: false` to all object levels in JSON schemas to ensure strict validation. You don't need to specify this in your schema.

### Tool Configuration

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

// Recommended approach: tools at root level
const response = await caller.call(
    'What is the weather in New York?',
    {
        tools,
        settings: {
            temperature: 0.7,
            toolChoice: 'auto' // toolChoice remains in settings
        }
    }
);
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
| verbosity | 'low' \| 'medium' \| 'high' | Controls verbosity (native for GPT-5 via text.verbosity; mapped to max_output_tokens on non-reasoning models when maxTokens is not set) | model dependent |

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
const response = await caller.call(
    "Hello",
    {
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
    }
);
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
const response = await caller.call(
    "Hello",
    {
        settings: {
            temperature: 0.5  // This takes precedence over class-level setting
        }
    }
);

// Settings work with all call types
const stream = await caller.stream(
    "Hello",
    {
        settings: { temperature: 0.5 }
    }
);
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
const response = await caller.call(
    "Hello",
    {
        settings: {
            temperature: 0.5,  // Overrides class-level
            topP: 0.8         // New setting
        }
    }
);
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
const response = await caller.call(
    'Hello',
    {
        settings: {
            maxRetries: 2  // Will retry up to 2 times for this call only
        }
    }
);
```

### Regular Call Retries

For regular (non-streaming) calls, the library will:
1. Attempt the call
2. If it fails, wait with exponential backoff (1s, 2s, 4s, etc.)
3. Retry up to the specified number of times
4. Throw an error if all retries are exhausted

```typescript
try {
    const response = await caller.call(
        'Hello',
        {
            settings: { maxRetries: 2 }
        }
    );
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
    const stream = await caller.stream(
        'Hello',
        {
            settings: { maxRetries: 2 }
        }
    );
    
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
const stream = await caller.stream(
    'Tell me a story',
    {
        settings: { maxRetries: 2 }
    }
);

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

The library provides two ways to retrieve usage and cost information:

1) Final usage (metadata):
   - **Non-streaming calls**: After `caller.call()`, inspect `response.metadata?.usage` for the full cumulative token and cost breakdown.
   - **Streaming calls**: The last chunk (`chunk.isComplete === true`) includes `chunk.metadata.usage` with full totals (input, cached input, output, reasoning, total, and costs).

2) Real-time callbacks:
   - Pass a `usageCallback` when creating your `LLMCaller` or in `stream()`/`call()` options (via `usageCallback` and optional `usageBatchSize`).
   - For **streaming** calls, the callback fires in *delta* batches of tokens (default every 100 tokens). Each invocation reports only the incremental tokens and costs since the last callback.
   - The **first** callback can include prompt-input and cached-input counts; subsequent callbacks report only output and reasoning deltas.
   - You can override the batch size by specifying `usageBatchSize`:
     ```typescript
     const stream = await caller.stream('...', {
       usageCallback,
       usageBatchSize: 50  // fire callback every 50 tokens
     });
     ```

Example metadata vs. callback:
```ts
// 1) Final usage metadata on non-streaming call
const response = await caller.call('Hello');
console.log(response.metadata.usage);  // full totals

// 2) Streaming with callbacks
const stream = await caller.stream('Tell me a story', {
  usageCallback,
  usageBatchSize: 100
});
for await (const chunk of stream) {
  if (!chunk.isComplete) {
    // delta callbacks have already been called behind the scenes
    process.stdout.write(chunk.content);
  } else {
    // final metadata.usage has full totals
    console.log('Full usage:', chunk.metadata.usage);
  }
}
```

The callback receives detailed usage data including:
- Caller ID  (automatically generated if not provided)
- Incremental token counts (input, cached input, output, reasoning) for that batch
- Incremental costs for that batch
- Timestamp of the usage

You can change the caller ID during runtime:
```typescript
caller.setCallerId('new-conversation-id');
```

### Reasoning Effort Control

Some models, like OpenAI's `o1` and `o3-mini`, and Anthropic's `claude-3.7-sonnet`, perform internal "reasoning" steps before generating the final output. These steps consume tokens and incur costs, which are tracked separately as `outputReasoning` tokens and costs in the usage data (both in metadata and callbacks).

You can influence the amount of reasoning the model performs using `settings.reasoning.effort`. This allows you to balance response quality and complexity against cost and latency.

```typescript
const response = await caller.call(
    'Solve this complex problem...',
    {
        settings: {
            reasoningEffort: 'high' // Or 'low', 'medium'
        }
    }
);
```

Available effort levels:
- **minimal**: Minimal reasoning. Fastest and cheapest, but may be less thorough for complex tasks.
- **low**: Low reasoning. Fast and cheap, but may be less thorough for complex tasks.
- **medium**: Balanced reasoning. Good default for moderate complexity.
- **high**: Extensive reasoning. Most thorough, potentially higher quality responses for complex tasks, but slowest and most expensive due to increased reasoning token usage.

Notes:
- On GPT-5, 'minimal' is supported natively.
- On non‑GPT‑5 reasoning models, 'minimal' is mapped to 'low' for backward compatibility.
- If a model has reasoning capability, temperature is ignored and a warning is logged; see docs/gpt5.md.

### History Modes

The library provides three different history management modes that control how conversation history is handled:

```typescript
// Initialize with specific history mode
const caller = new LLMCaller('openai', 'gpt-4o-mini', 'You are a helpful assistant.', {
    apiKey: process.env.OPENAI_API_KEY,
    historyMode: 'full' // One of: 'full', 'dynamic', 'stateless'
});

// Or update history mode after initialization
caller.updateSettings({
    historyMode: 'dynamic'
});
```

#### Available History Modes

1. **stateless** (Default): Only send system message and current user message to model
   - No conversation history is sent to the model
   - Each question is treated independently
   - Most token-efficient option
   - Best for independent questions or to avoid context contamination
   - Default mode

2. **dynamic**: Keep the history within available context windows. Intelligently truncate history if it exceeds the model's token limit
   - Automatically manages token limits by removing older messages when needed
   - Always preserves the system message and current question
   - Prioritizes keeping recent context over older messages
   - Best for long conversations with high token usage
   - Ideal for production applications to prevent token limit errors

3. **full**: Send all historical messages to the model
   - Maintains complete conversation context
   - Best for short to medium-length conversations
   - Provides most coherent responses for context-dependent queries
   - Will fail, if the history is too long


#### History Mode Examples

```typescript
// 1. Full mode example - maintains complete context
const fullModeCaller = new LLMCaller('openai', 'gpt-4o-mini', 'You are a helpful assistant.', {
    apiKey: process.env.OPENAI_API_KEY,
    historyMode: 'full'
});

// User can refer to previous messages
await fullModeCaller.call('What is the capital of France?');
const response = await fullModeCaller.call('What is its population?');
// Model understands 'its' refers to Paris from previous context

// 2. Dynamic mode example - handles long conversations
const truncateCaller = new LLMCaller('openai', 'gpt-4o-mini', 'You are a helpful assistant.', {
    apiKey: process.env.OPENAI_API_KEY,
    historyMode: 'dynamic'
});

// When conversation gets too long, older messages are removed automatically
// but recent context is preserved

// 3. Stateless mode example - for independent questions
const statelessCaller = new LLMCaller('openai', 'gpt-4o-mini', 'You are a helpful assistant.', {
    apiKey: process.env.OPENAI_API_KEY,
    historyMode: 'stateless'
});

// Each question is treated independently
await statelessCaller.call('What is the capital of France?');
const response = await statelessCaller.call('What is its population?');
// Model won't understand 'its' refers to Paris, as there's no history context
```

#### Streaming with History Modes

All three history modes work seamlessly with streaming:

```typescript
// Streaming with history modes
const streamingCaller = new LLMCaller('openai', 'gpt-4o-mini', 'You are a helpful assistant.', {
    apiKey: process.env.OPENAI_API_KEY,
    historyMode: 'full' // or 'dynamic' or 'stateless'
});

// Stream with history context
const stream = await streamingCaller.stream('Tell me about the solar system');
for await (const chunk of stream) {
    process.stdout.write(chunk.content);
}
```

#### When to Use Each History Mode

- **full**: Use for conversational applications where context continuity is important, such as chatbots or virtual assistants.
- **dynamic**: Use for applications with long conversations or large amounts of context, where you need to manage token limits automatically.
- **stateless**: Use for applications where each query should be treated independently, such as one-off analysis tasks or when you want to avoid context contamination.

## Error Handling 

## Tool Calling

The library now supports OpenAI's function calling feature through a unified tool calling interface. This allows you to define tools (functions) that the model can use to perform actions or retrieve information.

### Adding Tools

You can provide tools to the `LLMCaller` during initialization using the `tools` option in the constructor:

```typescript
// Define tools
const weatherTool = { /* ... definition ... */ };
const timeTool = { /* ... definition ... */ };

// Initialize LLMCaller with tools
const caller = new LLMCaller('openai', 'gpt-4o-mini', 'System message', {
    tools: [weatherTool, timeTool]
});
```

You can also add tools later using the `addTools` method, which is useful for dynamically adding tools after the caller has been created:

```typescript
// Add another tool later
const calculateTool = { /* ... definition ... */ };
await caller.addTools([calculateTool]);
```

You can mix tool definitions, string identifiers for function folders, and MCP configurations in the `tools` array passed to the constructor or `addTools`.

Alternatively, you can pass a tool at a call level, which will be used for that specific call only.

### Tool Behavior

When making a call, you can control which tools are available to the model in two ways:
- Provide a specific `tools` array in your call options to make only those tools available for that specific call
- Omit the `tools` option to make all previously registered tools (via `addTool` or `addTools`) available to the model

### Tool Configuration

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

// Recommended approach: tools at root level
const response = await caller.call(
    'What is the weather in New York?',
    {
        tools,
        settings: {
            temperature: 0.7,
            toolChoice: 'auto' // toolChoice remains in settings
        }
    }
);
```

## Overview

The library now supports OpenAI's function calling feature through a unified tool calling interface. This allows you to define tools (functions) that the model can use to perform actions or retrieve information.

## Basic Usage

```typescript
// Define your tools
const weatherTool = {
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
    },
    callFunction: async (params) => { /* ... implementation ... */ }
};

// Initialize caller with the tool
const caller = new LLMCaller('openai', 'gpt-4o-mini', 'You are a helpful assistant.', {
    tools: [weatherTool]
});

// Make a chat call - the model can now use get_weather
const response = await caller.call(
    'What is the weather in New York?',
    {
        settings: {
            toolChoice: 'auto' // Let the model decide when to use tools
        }
    }
);

// The caller handles the tool execution and sends the result back automatically
console.log(response[0].content);
```

## Streaming Support

Tool calls are also supported in streaming mode:

```typescript
const stream = await adapter.stream(
    'Hello, how are you?',
    {
        settings: {
            temperature: 0.7,
            maxTokens: 100,
            tools,
            toolChoice: 'auto',
            stream: true
        }
    }
);

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
const response = await adapter.call(
    'Hello',
    {
        settings: {
            temperature: 0.7,
            maxTokens: 100,
            tools,
            toolCalls: [
                { name: 'get_weather', arguments: { location: 'New York, NY' } },
                { name: 'get_weather', arguments: { location: 'Los Angeles, CA' } }
            ]
        }
    }
);
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
    const response = await adapter.call(
        'Hello',
        {
            settings: {
                temperature: 0.7,
                maxTokens: 100,
                tools
            }
        }
    );
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

## Recent Updates

- **v0.9.2**: Fixed JSON structured responses in non-streaming calls.
  - The `contentObject` property is now properly populated in non-streaming responses.
  - Enhanced JSON schema validation to work consistently across streaming and non-streaming calls.
  - Ensured proper passing of response format and JSON schema parameters throughout the validation pipeline.

- **v0.9.1**: Fixed a critical issue with tool call responses not being properly incorporated in follow-up messages.
  - When making API calls after tool execution, the tool results are now properly included in the message history.
  - This ensures the model correctly uses information from tool results in all responses.
  - The fix prevents the model from falsely claiming it doesn't have information it has already received through tools.

- **v0.9.0**: Added support for JSON schemas, streaming, and tool calling at the root level of the options object.
  - `jsonSchema`, `responseFormat`, and `tools` can now be used as top-level options instead of being nested under `settings`.
  - Backward compatibility is maintained, supporting both formats.
  - Fixed a critical issue with tool calls where original tool call IDs were not preserved, causing API errors with multiple tool calls.
  - Fixed an issue where assistant messages were being duplicated in history when using tool calls.

## Tool Calling Best Practices

When working with tool calls, ensure that:

1. Tool definitions are clear and properly typed
2. Every tool call response uses the **exact** tool call ID from the API response
3. For multi-tool calls, all tool calls in an assistant message must have corresponding tool responses

Example of correct tool call handling:

```typescript
// Receive a response with tool calls from the API
const response = await caller.call('What time is it in Tokyo?', {
  tools: [timeTool],
  settings: {
    toolChoice: 'auto'
  }
});

// Process each tool call with the EXACT same ID
if (response.toolCalls && response.toolCalls.length > 0) {
  for (const toolCall of response.toolCalls) {
    const result = await executeYourTool(toolCall.arguments);
    
    // Add the result with the EXACT same ID from the API
    caller.addToolResult(
      toolCall.id, // Keep the original ID!
      JSON.stringify(result),
      toolCall.name
    );
  }
}
```

### Streaming Text with Reasoning Flags
```typescript
const stream = await caller.stream(
  'Tell me a story with your thinking steps explained',
  {
    settings: {
      temperature: 0.9,
      maxTokens: 5000,
      reasoning: { effort: 'medium', summary: 'auto' }
    }
  }
);

for await (const chunk of stream) {
  if (chunk.isFirstContentChunk) {
    console.log('=== CONTENT START ===');
  }
  if (chunk.content) {
    process.stdout.write(chunk.content);
  }

  if (chunk.isFirstReasoningChunk) {
    console.log('\n=== REASONING START ===');
  }
  if (chunk.reasoning) {
    process.stdout.write(chunk.reasoning);
  }

  if (chunk.isComplete) {
    console.log(`\nComplete story: ${chunk.contentText}`);
    console.log(`Complete reasoning: ${chunk.reasoningText}`);
  }
}
```

### Using MCP Servers

Model Context Protocol (MCP) is a standard protocol for providing AI models access to external tools and resources. callLLM now supports connecting to MCP servers, allowing you to use tools provided by these servers directly in your LLM calls.

```typescript
import { LLMCaller } from 'callllm';

// Initialize the caller as usual
const caller = new LLMCaller('openai', 'gpt-4o', 'You are a helpful assistant.');

// Create an MCP config object
const mcpConfig = {
  mcpServers: {
    // A filesystem server with access to the current directory
    filesystem: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '.']
    },
    // A GitHub server with auth via environment variable
    github: {
      url: 'https://api.mcp-example.com/github',
      headers: {
        'Authorization': 'Bearer ${GITHUB_TOKEN}'
      }
    }
  }
};

// Use the MCP servers alongside other tools
const response = await caller.call(
  'List files in the current directory and create a README.md',
  {
    tools: [mcpConfig], // Pass the MCP config as a tool
    settings: { toolChoice: 'auto' }
  }
);

console.log(response.content);
```

#### MCP Server Configuration

You can configure MCP servers using the following options:

```typescript
type MCPServerConfig = {
  // Transport type: 'stdio', 'http', or 'custom'
  // Automatically inferred if not specified
  type?: 'stdio' | 'http' | 'custom';
  
  // For stdio transport
  command?: string;
  args?: string[];
  env?: Record<string, string>; // Environment variables
  
  // For HTTP transport
  url?: string;
  mode?: 'sse' | 'streamable';
  headers?: Record<string, string>;
  
  // Generic options
  description?: string;
  disabled?: boolean;
  autoApprove?: string[];
};
```

#### Environment Variable Substitution

You can reference environment variables in the `env` and `headers` fields using the `${ENV_VAR}` syntax:

```typescript
{
  mcpServers: {
    github: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: {
        GITHUB_TOKEN: '${GITHUB_PAT}' // Will be replaced with process.env.GITHUB_PAT
      }
    }
  }
}
```

#### Mixing Tool Types

You can mix MCP servers with function folders and static tool definitions:

```typescript
const response = await caller.call(
  'Check the weather and list repository files',
  {
    tools: [
      weatherTool,           // Static ToolDefinition
      'getStock',            // Function folder tool
      mcpConfig              // MCP servers
    ],
    toolsDir: './my-tools',  // For resolving function folder tools
    settings: { toolChoice: 'auto' }
  }
);
```

Tools from MCP servers are exposed with names in the format `${serverKey}.${toolName}` to avoid name collisions.

### Video Generation

callLLM supports video generation with OpenAI's Sora models (`sora-2` and `sora-2-pro`). Video generation can be done in two modes:
- **Non-blocking mode** (`wait: 'none'`): Creates a video job and immediately returns with the job ID
- **Blocking mode** (`wait: 'poll'`): Automatically polls until the video is complete and optionally downloads it

#### Basic Video Generation (Blocking)

```typescript
import { LLMCaller } from 'callllm';
import path from 'path';

const caller = new LLMCaller('openai', 'sora-2-pro');

// Generate video and auto-download when complete
const response = await caller.call({
    text: "A serene mountain landscape with a cabin",
    output: { 
        video: { 
            size: '1280x720',     // '1280x720' | '720x1280'
            seconds: 8,            // Duration (OpenAI accepts 1-60 seconds)
            wait: 'poll'           // Poll until complete
        } 
    },
    outputPath: path.join(__dirname, 'output', 'video.mp4')
});

console.log('Video status:', response[0].metadata?.videoStatus);
console.log('Video saved to:', response[0].metadata?.videoSavedPath);
console.log('Cost:', response[0].metadata?.usage?.costs.total);
```

#### Video Generation with Image Input

You can provide an image to guide the video generation (first frame reference):

```typescript
const response = await caller.call({
    text: "Transform this into a flowing river scene",
    file: path.join(__dirname, 'landscape.jpg'),  // Image input
    output: { 
        video: { 
            size: '1280x720', 
            seconds: 4,
            wait: 'poll'
        } 
    },
    outputPath: path.join(__dirname, 'output', 'river.mp4')
});
```

#### Non-Blocking Video Generation

For long-running videos, you can create the job and retrieve it later:

```typescript
// Start video generation
const response = await caller.call({
    text: "Epic space battle scene",
    output: { 
        video: { 
            size: '1280x720', 
            seconds: 30,
            wait: 'none'  // Don't wait, return immediately
        } 
    }
});

const jobId = response[0].metadata?.videoJobId;
console.log('Video job started:', jobId);

// Later, check status
const status = await caller.retrieveVideo(jobId);
console.log('Status:', status.status, 'Progress:', status.progress);

// When complete, download the video
if (status.status === 'completed') {
    await caller.downloadVideo(jobId, {
        variant: 'video',  // 'video' | 'thumbnail' | 'spritesheet'
        outputPath: './output/battle.mp4'
    });
}
```

#### Cost Tracking

Video generation costs are tracked per second of video:
- `sora-2`: $0.10 per second
- `sora-2-pro`: $0.30 per second

The cost is calculated based on:
- **Completed videos**: Full duration is charged
- **Failed videos**: If the video fails after >50% progress, the full duration is charged; otherwise, no charge

```typescript
const response = await caller.call({
    text: "Generate a video",
    output: { video: { seconds: 10, wait: 'poll' } },
    outputPath: './video.mp4'
});

// Cost information in usage metadata
const usage = response[0].metadata?.usage;
console.log('Video duration:', usage?.tokens.output.videoSeconds, 'seconds');
console.log('Video cost:', usage?.costs.output.video);
console.log('Total cost:', usage?.costs.total);
```

#### Telemetry Support

Video generation is fully integrated with telemetry providers (Opik, OpenTelemetry):
- Input prompt and image references are logged
- Output includes video job status, file path, and error details (if failed)
- Cost and duration metrics are tracked
- Failed generations include error reasons

For more details, see the [videoGeneration.ts](examples/videoGeneration.ts) example.

### More Examples

Find more examples in the [examples/](examples/) directory:

- [simpleChat.ts](examples/simpleChat.ts) - Basic chat with an LLM
- [toolCalling.ts](examples/toolCalling.ts) - Using tools with an LLM
- [historyModes.ts](examples/historyModes.ts) - Different ways to manage conversation history
- [jsonOutput.ts](examples/jsonOutput.ts) - Getting structured JSON responses from LLMs
- [videoGeneration.ts](examples/videoGeneration.ts) - Generating videos with Sora models
- [mcpClient.ts](examples/mcpClient.ts) - Using Model Context Protocol (MCP) servers
- [mcpDirectTools.ts](examples/mcpDirectTools.ts) - Direct access to MCP tools
- [aliasChat.ts](examples/aliasChat.ts) - Using model aliases
