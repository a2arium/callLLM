# Working with Images in callllm

> User-facing media documentation starts at [Media: images, video, and audio](../guides/media.md). This page is a deeper image-specific reference.

This guide explains how to use `callllm` with models that support image inputs and image generation/editing.

## Prerequisites

- A model that supports image input or image output, depending on the operation
- Provider API key configured with access to multimodal models

## Input Methods

`callllm` supports two primary methods for including images in your LLM requests:

### Method 1: Using `file` and `input.image.detail`

This is the recommended approach for most use cases:

```typescript
const response = await caller.call({
  text: "Analyze this image",
  file: "https://example.com/path/to/image.jpg",
  input: {
    image: { detail: "high" }
  }
});
```

Parameters:

- **file**: Path to an image file. Can be:
  - URL string (web image)
  - Local file path (will be read from disk)
  - Base64-encoded image data

- **input.image.detail**: Controls the resolution/detail level for the image:
  - **"low"**: Lower resolution, fewer tokens, faster processing
  - **"high"**: Higher resolution, more tokens, better for detailed analysis
  - **"auto"** (default): Let the provider choose based on image content

### Method 2: Using File Placeholders

For advanced use cases or when embedding images directly in messages:

```typescript
const response = await caller.call("<file:path/to/image.jpg> What's in this image?");
```

- The placeholder format `<file:path>` will be detected and converted to the appropriate format for the provider.
- This approach is especially useful when you want to include the image inline with your text prompt.
- For multiple images, use multiple placeholders: `<file:image1.jpg> and <file:image2.jpg> Compare these images.`

## Token Usage and Cost Considerations

Images consume a significant number of tokens compared to text, which affects:

1. **Context Window**: Images take up space in your context window, potentially limiting text content.
2. **Token Usage**: Images typically use hundreds to thousands of tokens.
3. **Cost**: Image tokens are billed at the same rate as text tokens, making image calls more expensive.

### Token Consumption by Detail Level

Approximate token usage for a typical image:

| Detail Level | Approximate Tokens | Use Case |
|--------------|-------------------|----------|
| Low          | ~85 tokens        | Simple visual recognition, basic image content |
| Auto         | ~130 tokens       | General purpose, provider optimized |
| High         | ~170 tokens       | Detailed text recognition, complex visual analysis |

### Tracking Image Token Usage

`callllm` tracks image token usage in response metadata when the provider reports enough usage information or the framework can estimate it:

```typescript
const response = await caller.call("Analyze this image", {
  file: "path/to/image.jpg"
});

// Access image token usage 
const imageTokens = response[0].metadata?.usage?.tokens.input.image || 0;
console.log(`Image used ${imageTokens} tokens`);
```

This information is also included in usage callbacks for real-time token monitoring.

## Best Practices

1. **Use appropriate detail level**: Choose "low" when detailed analysis isn't required.
2. **Resize images before sending**: Sending smaller images reduces token usage.
3. **Use streaming**: For better user experience when processing image-heavy requests.
4. **Consider batching**: Group related image analyses to avoid multiple API calls.
5. **Monitor usage**: Track image token consumption to control costs.

## Provider-Specific Considerations

- **OpenAI**: 
  - GPT-4o supports both URLs and base64-encoded images
  - Image tokens count against both input and output token limits

- **Gemini**:
  - Gemini image-capable models support image input through the Gemini adapter.
  - Image generation and editing support depends on the selected model catalog entry.

## Examples

See [examples/imageInput.ts](../../examples/imageInput.ts) for a complete working example.

```typescript
// Example with a web image
const response = await caller.call({
  text: "Describe this image",
  file: "https://example.com/path/to/image.jpg",
  input: { image: { detail: "high" } }
});

// Example with a local file
const response = await caller.call({
  text: "What text is in this image?",
  file: "./screenshots/receipt.jpg",
  input: { image: { detail: "high" } }
});
``` 

## Image Output and Model Selection

Image input chat and image output are different model requirements.

- Image input chat requires a chat model with image input support.
- Image output requires an image-capable model and a provider adapter that implements the image operation interface.

When the constructor uses a preset or policy, `callllm` resolves the model at request time after it sees the actual image operation:

```typescript
const caller = new LLMCaller(['openai', 'gemini'], 'fast');

const result = await caller.call({
  text: 'Create a clean app icon',
  output: { image: { size: '1024x1024', quality: 'high' } },
  outputPath: './icon.png'
});

console.log(result[0].metadata?.provider);
console.log(result[0].metadata?.model);
console.log(result[0].metadata?.selectionMode); // preset
```

The resolver infers the image operation from the request:

| Request shape | Inferred operation |
| --- | --- |
| `output.image` only | generate |
| `output.image` plus `file` or one `files[]` item | edit |
| `output.image` plus multiple `files[]` items | composite edit |
| `output.image` plus `mask` | masked edit |

These inferred capabilities are hard filters. If the selected exact model cannot perform the requested operation, the call fails instead of silently switching models.

For advanced routing, use a policy:

```typescript
const caller = new LLMCaller(['openai', 'gemini'], {
  preset: 'balanced',
  prefer: { cost: 0.35, latency: 0.25 },
  constraints: {
    maxImagePricePerImage: 0.05
  },
  resolution: { explain: true }
});
```
