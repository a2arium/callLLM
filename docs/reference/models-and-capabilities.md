# Models and Capabilities Reference

Model metadata is the catalog that powers validation, usage estimates, and dynamic model selection. Most users only need presets or exact model names, but custom models and provider contributors should understand this shape.

## Inspect Available Models

```ts
const caller = new LLMCaller('openai', 'balanced');

const models = caller.getAvailableModels();
for (const model of models) {
  console.log(model.name, model.maxRequestTokens, model.capabilities);
}
```

Get one model:

```ts
const model = caller.getModel('gpt-5-mini');
```

## `ModelInfo`

```ts
type ModelInfo = {
  name: string;
  canonicalSlug?: string;
  isUncensored?: boolean;
  inputPricePerMillion: number;
  inputCachedPricePerMillion?: number;
  outputPricePerMillion: number;
  imageInputPricePerMillion?: number;
  imageOutputPricePerMillion?: number;
  imagePricePerImage?: number;
  videoPricePerSecond?: number;
  audioInputPricePerMillion?: number;
  audioOutputPricePerMillion?: number;
  audioPricePerSecond?: number;
  ttsPricePerMillionChars?: number;
  transcriptionMaxFileBytes?: number;
  transcriptionMaxDurationSeconds?: number;
  maxRequestTokens: number;
  maxResponseTokens: number;
  tokenizationModel?: string;
  capabilities?: ModelCapabilities;
  characteristics: {
    qualityIndex: number;
    outputSpeed: number;
    firstTokenLatency: number;
  };
};
```

Pricing fields are used for estimated cost. Capability fields are used for hard filtering. Characteristics are used for preset and policy scoring.

## `ModelCapabilities`

Capabilities describe what a model can do:

```ts
type ModelCapabilities = {
  streaming?: boolean;
  toolCalls?: boolean | {
    nonStreaming: boolean;
    streamingMode: 'none' | 'onComplete' | 'deltas';
    parallel?: boolean;
  };
  parallelToolCalls?: boolean;
  batchProcessing?: boolean;
  reasoning?: boolean;
  embeddings?: boolean | {
    maxInputLength?: number;
    dimensions?: number[];
    defaultDimensions?: number;
    encodingFormats?: ('float' | 'base64')[];
  };
  audio?: boolean | {
    transcribe?: boolean;
    translate?: boolean;
    synthesize?: boolean;
    supportedInputFormats?: string[];
    supportedOutputFormats?: string[];
    maxInputDuration?: number;
    maxOutputChars?: number;
    voices?: string[];
  };
  input: {
    text: true | object;
    image?: true | {
      formats?: string[];
      maxDimensions?: [number, number];
      maxSize?: number;
    };
    audio?: true | object;
    video?: true | object;
  };
  output: {
    text: true | {
      textOutputFormats: ('text' | 'json')[];
    };
    image?: true | {
      generate?: boolean;
      edit?: boolean;
      editWithMask?: boolean;
      formats?: string[];
      dimensions?: Array<[number, number]>;
    };
    video?: true | {
      sizes?: string[];
      maxSeconds?: number;
      variants?: string[];
    };
    audio?: true | object;
  };
};
```

If a capability is absent, the resolver treats it as unsupported for hard requirements.

## Custom Models

Add a model to the current caller catalog:

```ts
caller.addModel({
  name: 'my-company-router',
  inputPricePerMillion: 1,
  outputPricePerMillion: 3,
  maxRequestTokens: 128000,
  maxResponseTokens: 8192,
  tokenizationModel: 'gpt-4o',
  capabilities: {
    streaming: true,
    toolCalls: true,
    input: { text: true },
    output: {
      text: { textOutputFormats: ['text', 'json'] }
    }
  },
  characteristics: {
    qualityIndex: 75,
    outputSpeed: 120,
    firstTokenLatency: 800
  }
});
```

Update a model:

```ts
caller.updateModel('my-company-router', {
  outputPricePerMillion: 2.5
});
```

## Tokenization Model

`tokenizationModel` tells the local token counter which tokenizer to use when provider usage is unavailable:

```ts
caller.addModel({
  name: 'custom-model',
  tokenizationModel: 'gpt-4',
  // other ModelInfo fields...
});
```

If `tokenizationModel` is omitted, the framework first tries the model's own name and then falls back to approximate counting.

## Capability Validation

Exact models are validated against the request:

```ts
const caller = new LLMCaller('openai', { model: 'gpt-5-mini' });

await caller.call({
  text: 'Create an icon.',
  output: { image: { size: '1024x1024' } }
}); // fails if gpt-5-mini is not image-output capable
```

Presets and policies filter models before scoring:

```ts
const caller = new LLMCaller(['openai', 'gemini'], 'fast');
await caller.embeddings({ input: 'hello' }); // selects an embedding-capable model
```

## Pricing Freshness

Catalog pricing and model characteristics can become outdated. Treat cost as an estimate and update model metadata when provider pricing changes. For strict budget enforcement, use constraints such as `maxOutputPricePerMillion`, `maxImagePricePerImage`, or `maxVideoPricePerSecond`.
