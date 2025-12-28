# Adapter Creation Rules

### What an adapter must implement (contract)

- You must implement the `LLMProvider` contract:
```4:13:src/interfaces/LLMProvider.ts
export interface LLMProvider {
    // Basic chat methods
    chatCall(model: string, params: UniversalChatParams): Promise<UniversalChatResponse>;
    streamCall(model: string, params: UniversalChatParams): Promise<AsyncIterable<UniversalStreamResponse>>;

    // Conversion methods that each provider must implement
    convertToProviderParams(model: string, params: UniversalChatParams): unknown;
    convertFromProviderResponse(response: unknown): UniversalChatResponse;
    convertFromProviderStreamResponse(response: unknown): UniversalStreamResponse;
}
```
- The `BaseAdapter` enforces these methods and provides config validation:
```11:29:src/adapters/base/baseAdapter.ts
export type AdapterConfig = {
    apiKey: string;
    baseUrl?: string;
    organization?: string;
};

export abstract class BaseAdapter implements LLMProvider {
    protected config: AdapterConfig;

    constructor(config: AdapterConfig) {
        this.validateConfig(config);
        this.config = config;
    }

    abstract chatCall(model: string, params: UniversalChatParams): Promise<UniversalChatResponse>;
    abstract streamCall(model: string, params: UniversalChatParams): Promise<AsyncIterable<UniversalStreamResponse>>;
    abstract convertToProviderParams(model: string, params: UniversalChatParams): unknown;
    abstract convertFromProviderResponse(response: unknown): UniversalChatResponse;
    abstract convertFromProviderStreamResponse(response: unknown): UniversalStreamResponse;
}
```
```31:53:src/adapters/base/baseAdapter.ts
    /**
     * Optional embedding support. Providers that support embeddings should implement this.
     */
    embeddingCall?(model: string, params: EmbeddingParams): Promise<EmbeddingResponse>;

    /**
     * Convert embedding parameters to provider-specific format.
     * Should be implemented by providers that support embeddings.
     */
    convertToProviderEmbeddingParams?(model: string, params: EmbeddingParams): unknown;

    /**
     * Convert provider embedding response to universal format.
     * Should be implemented by providers that support embeddings.
     */
    convertFromProviderEmbeddingResponse?(response: unknown): EmbeddingResponse;

    protected validateConfig(config: AdapterConfig): void {
        if (!config.apiKey) {
            throw new AdapterError('API key is required');
        }
    }
}
```

### The universal types you must map to/from

- Requests (`UniversalChatParams`):
```277:299:src/interfaces/UniversalInterfaces.ts
export type UniversalChatParams = {
    messages: Array<UniversalMessage>;
    // Use the refined settings type
    settings?: UniversalChatSettings;
    callerId?: string;
    inputCachedTokens?: number;
    inputCachedPricePerMillion?: number;
    // Add tools, jsonSchema, responseFormat here as they are part of the core request structure passed down
    tools?: ToolDefinition[];
    jsonSchema?: { name?: string; schema: JSONSchemaDefinition };
    responseFormat?: ResponseFormat;
    // Add model name here as it's essential for the request
    model: string;
    // System message might be handled differently (e.g., within messages), but include if needed directly
    systemMessage?: string;
    // Include historyMode as it needs to be passed down to controllers
    historyMode?: HistoryMode;
    /**
     * Batch size for incremental usage callbacks. Default applied by StreamHandler when callback provided.
     */
    usageBatchSize?: number;
};
```
- Non-stream responses:
```363:397:src/interfaces/UniversalInterfaces.ts
export interface UniversalChatResponse<T = unknown> {
    content: string | null; // Content can be null if tool_calls are present
    contentObject?: T;

    /**
     * Summary of the model's reasoning process, if available.
     * Only provided for models with reasoning capabilities when reasoning.summary is enabled.
     */
    reasoning?: string;

    /**
     * Generated image data, if the model was asked to generate an image.
     * Only present if output.image was requested.
     */
    image?: {
        /** Image data as base64 string or URL */
        data: string;
        /** Source of the image data (base64, url, file) */
        dataSource?: ImageResponseDataSource;
        /** MIME type of the image (e.g., 'image/png') */
        mime: string;
        /** Width of the image in pixels */
        width: number;
        /** Height of the image in pixels */
        height: number;
        /** Operation that was performed to generate this image */
        operation: 'generate' | 'edit' | 'edit-masked' | 'composite';
    };

    role: string; // Typically 'assistant'
    messages?: UniversalMessage[];  // May include history or context messages
    // Use imported ToolCall type
    toolCalls?: ToolCall[];
metadata?: Metadata;
}
```

### Schema sanitization expectations

- All adapters should pass any JSON Schema or Zod-based `jsonSchema` through the shared `SchemaSanitizer` (in `src/core/schema`) before attaching it to provider payloads. That sanitizer clones the schema, normalizes `$defs`, enforces object rules, and strips unsupported constraints (and can append hints).
- When a provider cannot handle JSON Schema composition keywords (`allOf`, `anyOf`, `oneOf`), enable the `stripCompositionKeywords` option, which removes those properties and documents the removal in descriptions when hints are enabled. OpenAI and Cerebras already use that toggle, so follow their example for new adapters that need composition-free schemas.
- Stream responses/chunks:
```399:465:src/interfaces/UniversalInterfaces.ts
export interface UniversalStreamResponse<T = unknown> {
    /**
     * The content of the current chunk being streamed.
     */
    content: string;

    /**
     * Summary of the model's reasoning process, if available.
     */
    reasoning?: string;

    /**
     * The complete accumulated text content, always present when isComplete is true.
     */
    contentText?: string;

    /**
     * The complete accumulated reasoning text, always present when isComplete is true.
     */
    reasoningText?: string;

    /**
     * True when this is the first streamed chunk that includes non-empty content.
     */
    isFirstContentChunk?: boolean;
    /**
     * True when this is the first streamed chunk that includes non-empty reasoning.
     */
    isFirstReasoningChunk?: boolean;
    /**
     * The parsed object from the response, only available for JSON responses when isComplete is true.
     */
    contentObject?: T;

    /**
     * Generated image data, if the model was asked to generate an image.
     * Only present if output.image was requested and isComplete is true.
     */
    image?: {
        /** Base64-encoded image data */
        data: string;
        /** MIME type of the image (e.g., 'image/png') */
        mime: string;
        /** Width of the image in pixels */
        width: number;
        /** Height of the image in pixels */
        height: number;
        /** Operation that was performed to generate this image */
        operation: 'generate' | 'edit' | 'edit-masked' | 'composite';
    };

    role: string; // Typically 'assistant'
    isComplete: boolean;
    messages?: UniversalMessage[];  // Array of messages for tool call responses
    // Use imported ToolCall type
    toolCalls?: ToolCall[];
    // Structure for tool results sent back *to* the model (if applicable in response)
    toolCallResults?: Array<{
        id: string;
        name: string;
        result: string;
    }>;
    // Use imported ToolCallChunk type for partial tool calls during streaming
    toolCallChunks?: ToolCallChunk[];
    metadata?: Metadata;
}
```

### How adapters are discovered and instantiated

- Register new adapters in `src/adapters/index.ts`:
```11:16:src/adapters/index.ts
const ADAPTER_REGISTRY = {
    'openai': OpenAIResponseAdapter as AdapterConstructor,
} as const;

export const adapterRegistry = new Map<string, AdapterConstructor>(
    Object.entries(ADAPTER_REGISTRY)
);
```
- The `ProviderManager` constructs the adapter from the registry:
```16:25:src/core/caller/ProviderManager.ts
    private createProvider(providerName: string, apiKey?: string): LLMProvider {
        const config: Partial<AdapterConfig> = apiKey ? { apiKey } : {};

        const AdapterClass = adapterRegistry.get(providerName);
        if (!AdapterClass) {
            throw new ProviderNotFoundError(providerName);
        }

        return new AdapterClass(config);
    }
```

### Reference architecture: OpenAI adapter at a glance

- Constructor: validate config, create provider SDK, wire `ModelManager`, `TokenCalculator`, `RetryManager`, `StreamHandler`, `Validator`, `Converter`:
```74:97:src/adapters/openai/adapter.ts
    constructor(config: Partial<AdapterConfig> | string) {
        // Handle the case where config is just an API key string for backward compatibility
        const configObj = typeof config === 'string'
            ? { apiKey: config }
            : config;

        const apiKey = configObj?.apiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new OpenAIResponseAdapterError('OpenAI API key is required. Please provide it in the config or set OPENAI_API_KEY environment variable.');
        }

        super({
            apiKey,
            organization: configObj?.organization || process.env.OPENAI_ORGANIZATION,
            baseUrl: configObj?.baseUrl || process.env.OPENAI_API_BASE
        });

        this.client = new OpenAI({
            apiKey: this.config.apiKey,
            organization: this.config.organization,
            baseURL: this.config.baseUrl,
        });
```
- Non-streaming call: validate, convert, call SDK, convert response, map errors:
```119:151:src/adapters/openai/adapter.ts
    async chatCall(model: string, params: UniversalChatParams): Promise<UniversalChatResponse> {
        const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.chatCall' });
        log.debug('Validating universal params:', params);

        // Validate input parameters
        this.validator.validateParams(params);

        // Validate tools specifically for OpenAI Response API
        if (params.tools) {
            this.validator.validateTools(params.tools);
        }

        // Convert parameters to OpenAI Response format using native types
        // The converter needs to return a type compatible with ResponseCreateParamsNonStreaming base
        const baseParams = await this.converter.convertToOpenAIResponseParams(model, params);
        const openAIParams: ResponseCreateParamsNonStreaming = {
            ...(baseParams as any),
            stream: false,
        };
        log.debug('Converted params before sending:', JSON.stringify(openAIParams, null, 2));

        // Validate tools format based on the native Tool type
        this.validateToolsFormat(openAIParams.tools);

        try {
            // Use the SDK's responses.create method with native types
            const response: Response = await this.client.responses.create(openAIParams);

            // Convert the native response to UniversalChatResponse using our converter
            const universalResponse = this.converter.convertFromOpenAIResponse(response as any);
            log.debug('Converted response:', universalResponse);
            return universalResponse;
        } catch (error: any) {
            // Log the specific error received from the OpenAI SDK call
            console.error(`[OpenAIResponseAdapter.chatCall] API call failed. Error Status: ${error.status}, Error Response:`, error.response?.data || error.message);
            log.error('API call failed:', error);
```
- Streaming call: validate, convert, request provider stream, translate events to `UniversalStreamResponse` via adapter-level stream handler:
```175:219:src/adapters/openai/adapter.ts
    async streamCall(model: string, params: UniversalChatParams): Promise<AsyncIterable<UniversalStreamResponse>> {
        const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.streamCall' });
        log.debug('Validating universal params:', params);

        // Validate input parameters
        this.validator.validateParams(params);

        // Validate tools specifically for OpenAI Response API
        if (params.tools) {
            this.validator.validateTools(params.tools);
        }

        // Convert parameters to OpenAI Response format using native types
        // The converter needs to return a type compatible with ResponseCreateParamsStreaming base
        const baseParams = await this.converter.convertToOpenAIResponseParams(model, params);
        const openAIParams: ResponseCreateParamsStreaming = {
            ...(baseParams as any),
            stream: true, // IMPORTANT: Ensure stream is explicitly set to true
        };

        log.debug('Converted params for streaming:', JSON.stringify(openAIParams, null, 2));

        // Validate tools format based on the native Tool type
        this.validateToolsFormat(openAIParams.tools);

        try {
            // Use the SDK's streaming capability with native types
            // The stream yields ResponseStreamEvent types
            const stream: Stream<ResponseStreamEvent> = await this.client.responses.create(openAIParams);

            // Initialize a new StreamHandler with the tools if available
            if (params.tools && params.tools.length > 0) {
                log.debug(`Initializing StreamHandler with ${params.tools.length} tools: ${params.tools.map(t => t.name).join(', ')}`);
                this.streamHandler = new StreamHandler(params.tools, this.tokenCalculator);

                // Register tools for execution with the enhanced properties
                this.registerToolsForExecution(params.tools);
            } else {
                log.debug('Initializing StreamHandler without tools');
                this.streamHandler = new StreamHandler(undefined, this.tokenCalculator);
            }

            // Process the stream with our handler, passing the native stream type
            return this.streamHandler.handleStream(stream);
        } catch (error: any) {
```
- Provider param conversion (adapter-level method):
```279:285:src/adapters/openai/adapter.ts
    async convertToProviderParams(model: string, params: UniversalChatParams): Promise<ResponseCreateParamsNonStreaming> {
        const baseParams = await this.converter.convertToOpenAIResponseParams(model, params);
        return {
            ...(baseParams as any),
            stream: false
        } as ResponseCreateParamsNonStreaming;
    }
```
- Minimal stream-event-to-universal mapping (fallback/non-pipeline path):
```337:387:src/adapters/openai/adapter.ts
    convertFromProviderStreamResponse(chunk: ResponseStreamEvent): UniversalStreamResponse {
        const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.convertFromProviderStreamResponse' });

        // Basic structure for handling stream events
        let content = '';
        let contentText = '';
        let finishReason = FinishReason.NULL;
        let isComplete = false;
        let toolCalls: UniversalStreamResponse['toolCalls'] = undefined;

        // Handle different event types
        if (chunk.type === 'response.output_text.delta') {
            content = chunk.delta || '';
            contentText = content;
            log.debug(`Processing text delta: '${content}'`);
        } else if (chunk.type === 'response.completed') {
            log.debug('Processing completion event');
            isComplete = true;
            finishReason = FinishReason.STOP;
        } else if (chunk.type === 'response.function_call_arguments.done') {
            log.debug('Processing function call arguments done event');
            finishReason = FinishReason.TOOL_CALLS;

            // In a real implementation, we'd need to track the tool call state
            // This is handled more completely in the StreamHandler
        } else if (chunk.type === 'response.failed') {
            log.debug('Processing failed event');
            isComplete = true;
            finishReason = FinishReason.ERROR;
        } else if (chunk.type === 'response.incomplete') {
            log.debug('Processing incomplete event');
            isComplete = true;
            finishReason = FinishReason.LENGTH;
        } else if (chunk.type === 'response.content_part.added') {
            const contentPartEvent = chunk as ResponseContentPartAddedEvent;
            content = contentPartEvent.content || '';
            contentText = content;
            log.debug(`Processing content part: '${content}'`);
        } else {
            log.debug(`Unhandled event type: ${chunk.type}`);
        }

        return {
            content,
            contentText,
            role: 'assistant',
            isComplete,
            toolCalls,
            metadata: { finishReason }
        };
    }
```

### Converter responsibilities (map universal → provider and provider → universal)

- Convert requests: model, messages, tools, JSON mode, settings, files/images, providerOptions. Example (OpenAI):
```70:85:src/adapters/openai/converter.ts
    /**
     * Converts UniversalChatParams to OpenAI Response API parameters (native types)
     * @param model The model name to use
     * @param params Universal chat parameters
     * @param adapterOpts Additional adapter-specific options
     * @returns Parameters formatted for the OpenAI Response API (native type)
     */
    async convertToOpenAIResponseParams(
        model: string,
        params: UniversalChatParams,
        adapterOpts?: { imageDetail?: 'low' | 'high' | 'auto' }
    ): Promise<Partial<ResponseCreateParams>> { // Return partial native type
        const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.convertToOpenAIResponseParams' });
        log.debug('Converting universal params:', params);
```
- Tool definition mapping with provider quirks/workarounds:
```91:156:src/adapters/openai/converter.ts
        const formattedTools = (params.tools || []).map((toolDef: ToolDefinition): FunctionTool => {
            if (!toolDef.name || !toolDef.parameters) {
                throw new OpenAIResponseValidationError(`Invalid tool definition: ${toolDef.name || 'Unnamed tool'}`);
            }

            log.debug(`Processing tool definition for OpenAI`, {
                name: toolDef.name,
                originalName: toolDef.metadata?.originalName,
                hasParameters: Boolean(toolDef.parameters),
                parametersType: toolDef.parameters?.type,
                requiredParams: toolDef.parameters?.required || [],
                propertiesCount: Object.keys(toolDef.parameters?.properties || {}).length
            });

            // Check for potential issues before conversion
            if (Object.keys(toolDef.parameters?.properties || {}).length === 0) {
                log.info(`Tool has empty properties object: ${toolDef.name}`, {
                    toolName: toolDef.name,
                    originalName: toolDef.metadata?.originalName
                });
            }

            if (toolDef.parameters?.required?.length) {
                const missingProps = toolDef.parameters.required.filter(
                    param => !(param in (toolDef.parameters?.properties || {}))
                );

                if (missingProps.length > 0) {
                    log.info(`Tool has required params not in properties: ${toolDef.name}`, {
                        toolName: toolDef.name,
                        originalName: toolDef.metadata?.originalName,
                        missingProperties: missingProps
                    });
                }
            }

            // Start with the parameters prepared by the core logic (includes correct required array)
            const baseParameters = this.prepareParametersForOpenAIResponse(toolDef.parameters);

            // --- OpenAI Workaround: Add ALL properties to the required array --- 
            const allPropertyKeys = baseParameters.properties ? Object.keys(baseParameters.properties) : [];

            // Conditionally create finalParameters with or without the required field
            let finalParameters: Record<string, unknown>;
            if (allPropertyKeys.length > 0) {
                finalParameters = {
                    ...baseParameters,
                    required: allPropertyKeys // Override required with all keys
                };
                log.debug(`[OpenAI WORKAROUND] Overriding required array for tool ${toolDef.name}. Original: ${JSON.stringify(baseParameters.required || [])}, Final: ${JSON.stringify(finalParameters.required)}`);
            } else {
                // If no properties, omit the required field entirely
                finalParameters = { ...baseParameters };
                delete finalParameters.required; // Still need to remove it if baseParameters had it
                log.info(`Tool has no properties, removing required field: ${toolDef.name}`);
            }
            // --- End OpenAI Workaround ---

            // Map to the native FunctionTool structure
            const openAITool: FunctionTool = {
                type: 'function',
                name: toolDef.name,
                parameters: finalParameters, // Use the modified parameters
                description: toolDef.description || undefined,
                strict: true
            };
            const toolParams = (openAITool.parameters || {}) as Record<string, unknown>;
            log.debug(`Formatted tool ${toolDef.name} for OpenAI native:`, {
                name: openAITool.name,
                parametersType: toolParams.type as string,
                propertiesCount: toolParams.properties ? Object.keys(toolParams.properties as Record<string, unknown>).length : 0,
                requiredParams: (toolParams.required as string[]) || 'none'
            });
            return openAITool;
        });
```

### Streaming translation (provider events → UniversalStreamResponse)

- Adapter-level stream handler reads provider stream events and yields universal chunks. Example snippets:
```53:61:src/adapters/openai/stream.ts
    async *handleStream(
        stream: Stream<types.ResponseStreamEvent>
    ): AsyncGenerator<UniversalStreamResponse> {
        this.log.debug('Starting to handle native stream...');
        this.toolCallIndex = 0; // Reset index for each stream
        this.toolCallMap.clear(); // Clear map for each stream
        this.inputTokens = 0; // Reset input tokens
```
```113:166:src/adapters/openai/stream.ts
                switch (chunk.type) {
                    case 'response.output_text.delta': {
                        const textDeltaEvent = chunk as types.ResponseOutputTextDeltaEvent;
                        const delta = textDeltaEvent.delta || '';
                        if (delta) {
                            if (!accumulatedContent.endsWith(delta)) {
                                accumulatedContent += delta;
                                outputChunk.content = delta; // Yield only the delta

                                // Add incremental token count as an estimate
                                const deltaTokenCount = this.tokenCalculator ?
                                    this.tokenCalculator.calculateTokens(delta) :
                                    Math.ceil(delta.length / 4); // Very rough estimate if no calculator

                                // Get the latest known reasoning tokens
                                const currentReasoningTokens = latestReasoningTokens ?? 0;

                                // Only add usage if we have a delta token count
                                if (deltaTokenCount > 0) {
                                    outputChunk.metadata = outputChunk.metadata || {};
                                    outputChunk.metadata.usage = {
                                        tokens: {
                                            input: {
                                                total: this.inputTokens,
                                                cached: 0,
                                                image: this.reportedImageTokens > 0 ? this.reportedImageTokens : undefined
                                            },
                                            output: {
                                                total: deltaTokenCount,
                                                reasoning: currentReasoningTokens
                                            },
                                            total: this.inputTokens + deltaTokenCount + currentReasoningTokens
                                        },
                                        costs: {
                                            input: {
                                                total: 0,
                                                cached: 0
                                            },
                                            output: {
                                                total: 0,
                                                reasoning: 0
                                            },
                                            total: 0
                                        },
                                        incremental: deltaTokenCount // Signal this is an incremental update
                                    };

                                    // Update reported token totals
                                    this.reportedOutputTokens += deltaTokenCount;
                                    this.reportedReasoningTokens = currentReasoningTokens; // This is an absolute value, not incremental
                                }

                                yieldChunk = true;
                            }
                        }
                        break;
                    }
```

### Error handling

- Create provider-specific error classes and a mapping helper. Example (OpenAI):
```60:83:src/adapters/openai/errors.ts
// Helper function to map provider-specific errors to our custom error types
export const mapProviderError = (error: unknown): OpenAIResponseAdapterError => {
    // Basic implementation to be expanded in later phases
    if (error instanceof Error) {
        const errorMessage = error.message;

        // Handle API errors based on message patterns or specific error types
        if (errorMessage.includes('API key')) {
            return new OpenAIResponseAuthError('Invalid API key or authentication error');
        } else if (errorMessage.includes('rate limit')) {
            return new OpenAIResponseRateLimitError('Rate limit exceeded');
        } else if (errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout')) {
            return new OpenAIResponseNetworkError('Network error occurred', error);
        } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
            return new OpenAIResponseValidationError(errorMessage);
        }

        // Default case: wrap the original error
        return new OpenAIResponseAdapterError(errorMessage, error);
    }

    // If the error is not an Error instance
    return new OpenAIResponseAdapterError('Unknown error occurred');
};
```

### Models and capabilities

- Add a `models.ts` in your adapter directory and register those in `ModelManager` based on provider name:
```41:49:src/core/models/ModelManager.ts
    private initializeModels(providerName: RegisteredProviders): void {
        switch (providerName) {
            case 'openai':
                openAIResponseModels.forEach(model => this.models.set(model.name, model));
                break;
            // Add other providers here when implemented
            default:
                throw new Error(`Unsupported provider: ${providerName}`);
        }
    }
```
- Each `ModelInfo` should declare pricing, token limits, and capabilities (streaming, toolCalls, parallelToolCalls, reasoning, input/output formats). The capability map drives features like tool calling and JSON mode decisions across controllers.

### Video generation support (Sora-like models)

If your provider supports asynchronous video generation, implement it in a provider-agnostic way mirroring OpenAI Sora:

1) Capabilities and pricing
- In your adapter’s `models.ts`, add models with:
  - `capabilities.input.text = true` (and optionally `input.image = true` if images can seed first frame)
  - `capabilities.output.video = true | { sizes?: string[]; maxSeconds?: number; variants?: ('video'|'thumbnail'|'spritesheet')[] }
  - `capabilities.output.audio = true` if audio is emitted with the video
  - `outputPricePerSecond` set to per-second price

2) Provider interface
- Implement `LLMProviderVideo` in your adapter:
  - `videoCall(model, { prompt, size, seconds, wait, variant, outputPath })`:
    - `seconds` is a number (provider-specific constraints; e.g., OpenAI accepts 1-60). Validate or convert as needed for your provider's API.
    - `wait: 'none'` → create job, return `metadata.videoJobId`, `videoStatus`, `videoProgress`, and computed `usage`
    - `wait: 'poll'` → create-and-poll until complete, compute `usage`, and if `outputPath` provided, download requested `variant` and set `metadata.videoSavedPath`
  - `retrieveVideo(videoId)` → return `{ id, status, progress?, model?, seconds?, size? }`
  - `downloadVideo(videoId, variant)` → return binary (ArrayBuffer) for `video|thumbnail|spritesheet`

3) Usage and cost
- Compute usage for video as:
  - `usage.tokens.output.videoSeconds = seconds`
  - `usage.costs.output.video = seconds * model.outputPricePerSecond`
  - Ensure `usage.costs.total` includes the video cost
- Attach `usage` to `UniversalChatResponse.metadata`
- The framework will invoke `usageCallback` if configured; streaming is not applicable to video creation itself (it’s async by job status)

4) LLMCaller routing
- The core caller checks `output.video` and routes to `provider.videoCall` with capability validation. New adapters only need to implement the interface above; no core edits required.

5) Error mapping
- Map auth, rate limit, network, and validation errors to your adapter’s error types; include retry-after when available. For long jobs, `wait: 'poll'` should propagate provider failures clearly.

6) Examples and docs
- Provide an example demonstrating:
  - Blocking (poll + auto-download to `outputPath`)
  - Non-blocking (create → retrieve loop → download)
- Print `metadata.usage` so per-second pricing is visible.

### Tool calling capabilities (granular)

- For simple providers, `capabilities.toolCalls` can be a boolean `true` (interpreted as full support: non‑streaming tool calls, streaming tool call deltas, parallel enabled), or `false`.
- For nuanced model behavior, use the structured form:

```
capabilities: {
  toolCalls: {
    nonStreaming: boolean,                  // supports tool calls in non‑streaming completion calls
    streamingMode: 'none' | 'deltas',       // 'none' = unsupported in streaming; 'deltas' = mid‑stream tool_call deltas
    parallel?: boolean                      // supports parallel tool calls
  },
  // parallelToolCalls (deprecated) is still read for backwards compatibility
}
```

- Guidance:
  - Prefer structured `toolCalls` per model when behavior differs.
  - Keep `parallelToolCalls` in sync or omit it; selection code reads `toolCalls.parallel` first and falls back to `parallelToolCalls`.

### Streaming tools in e2e scenarios

- Some models do not support streaming tool calls (`streamingMode: 'none'`). For these, the `streaming-tools` e2e scenario will skip execution (treated as pass) and annotate the result with a skip reason. This is expected and ensures providers/models that only support non‑streaming tools still pass the suite.

### Implementation blueprint (recommended files)

- `src/adapters/<provider>/adapter.ts`
- `src/adapters/<provider>/converter.ts`
- `src/adapters/<provider>/stream.ts`
- `src/adapters/<provider>/types.ts` (provider SDK type wrappers)
- `src/adapters/<provider>/errors.ts`
- `src/adapters/<provider>/models.ts`

### Skeleton for a new adapter

```ts
// src/adapters/yourprovider/adapter.ts
import { BaseAdapter, type AdapterConfig } from '../base/baseAdapter';
import type {
  UniversalChatParams,
  UniversalChatResponse,
  UniversalStreamResponse,
  EmbeddingParams,
  EmbeddingResponse,
  ModelInfo
} from '../../interfaces/UniversalInterfaces';
import { logger } from '../../utils/logger';
import { ModelManager } from '../../core/models/ModelManager';
import type { RegisteredProviders } from '../index';
import { TokenCalculator } from '../../core/models/TokenCalculator';
import { RetryManager } from '../../core/retry/RetryManager';
import { YourProviderConverter } from './converter';
import { YourProviderStreamHandler } from './stream';
import { defaultModels } from './models';
import { YourProviderErrors } from './errors';

export class YourProviderAdapter extends BaseAdapter {
  private converter: YourProviderConverter;
  private streamHandler: YourProviderStreamHandler;
  private modelManager: ModelManager;
  private tokenCalculator: TokenCalculator;
  private retryManager: RetryManager;
  private models: ModelInfo[] = defaultModels;

  constructor(config: Partial<AdapterConfig>) {
    // Read apiKey from config or env
    super({ apiKey: config.apiKey || process.env.YOURPROVIDER_API_KEY! });
    this.modelManager = new ModelManager('yourprovider' as RegisteredProviders);
    this.tokenCalculator = new TokenCalculator();
    this.retryManager = new RetryManager({ baseDelay: 1000, maxRetries: 3 });
    for (const m of this.models) this.modelManager.addModel(m);
    this.converter = new YourProviderConverter(this.modelManager);
    this.streamHandler = new YourProviderStreamHandler(undefined, this.tokenCalculator);
  }

  async chatCall(model: string, params: UniversalChatParams): Promise<UniversalChatResponse> {
    // 1) validate (json schema presence vs model capabilities), 2) convert, 3) SDK call, 4) convert response, 5) map errors
  }

  async streamCall(model: string, params: UniversalChatParams): Promise<AsyncIterable<UniversalStreamResponse>> {
    // 1) validate, 2) convert (stream=true), 3) get provider stream, 4) yield via YourProviderStreamHandler
  }

  async convertToProviderParams(model: string, params: UniversalChatParams): Promise<unknown> {
    return this.converter.convertToProviderParams(model, params);
  }

  convertFromProviderResponse(resp: unknown): UniversalChatResponse {
    return this.converter.convertFromProviderResponse(resp);
  }

  convertFromProviderStreamResponse(ev: unknown): UniversalStreamResponse {
    // Optional minimal event mapping fallback
    return this.streamHandler.minimalConvert(ev);
  }

  // Optional: embeddingCall and imageCall if supported
}
```

```ts
// src/adapters/yourprovider/converter.ts
import type {
  UniversalChatParams,
  UniversalChatResponse
} from '../../interfaces/UniversalInterfaces';
import type { ToolDefinition } from '../../types/tooling';
import { ModelManager } from '../../core/models/ModelManager';
import { logger } from '../../utils/logger';

export class YourProviderConverter {
  constructor(private modelManager: ModelManager) {}

  async convertToProviderParams(model: string, params: UniversalChatParams): Promise<unknown> {
    // - map messages (roles, system/instructions vs user),
    // - map settings (temperature, topP, maxTokens, stop, user id, toolChoice),
    // - map json mode (native vs prompt), schema if native supported,
    // - map tools (ToolDefinition -> provider format), strictness,
    // - attach providerOptions passthrough,
    // - include model name, response format, etc.
  }

  convertFromProviderResponse(resp: unknown): UniversalChatResponse {
    // - content string or null (if tool calls present)
    // - role, toolCalls, messages (if needed), metadata.finishReason, usage
    // - reasoning summary if supported
  }
}
```

```ts
// src/adapters/yourprovider/stream.ts
import type { UniversalStreamResponse } from '../../interfaces/UniversalInterfaces';
import type { ToolDefinition } from '../../types/tooling';
import { TokenCalculator } from '../../core/models/TokenCalculator';

export class YourProviderStreamHandler {
  constructor(private tools?: ToolDefinition[], private tokenCalculator?: TokenCalculator) {}

  async *handleStream(stream: AsyncIterable<any>): AsyncGenerator<UniversalStreamResponse> {
    // - parse provider events
    // - yield content deltas as { content, isComplete: false, role: 'assistant', metadata.usage? }
    // - emit toolCallChunks for function_call delta/name/args,
    // - on completion, emit final chunk with isComplete=true, contentText, reasoningText (if any),
    // - set metadata.finishReason appropriately
  }

  minimalConvert(ev: unknown): UniversalStreamResponse {
    // Map a single event to a UniversalStreamResponse chunk (used if needed)
    return { content: '', role: 'assistant', isComplete: false };
  }
}
```

### Mapping details you must handle

- Messages
  - Map `UniversalMessage.role` to provider roles.
  - Include tool messages correctly when sending tool results back to the model.
  - If provider merges system into instructions, do that in the converter (as in OpenAI reasoning models).

- Tools
  - Convert `ToolDefinition` to provider tool schema. Validate presence of `name`, `parameters`, and property/required consistency.
  - Apply provider-specific workarounds (e.g., OpenAI requires all properties be in `required`).

- JSON Mode and Schema
  - If provider has native JSON mode, set it and include schema (when supported).
  - If not, rely on prompt injection and universal validation pipeline. On final content, validate with `SchemaValidator` and optionally repair JSON when necessary.
  - Use the shared `SchemaSanitizer` before sending any schema to a provider. This ensures consistent, provider-safe schemas and teaches the model the constraints:
    - IMPORTANT: DO NOT SANITIZE WHAT IS SUPPORTED BY THE PROVIDER. Sanitize only not supported Json Schema constructs.
    - Normalizes `definitions` → `$defs` and rewrites `#/definitions/...` → `#/$defs/...`.
    - Strips meta/vendor keys such as `$schema`, `$anchor`, `def`, and any keys starting with `~`.
    - Enforces for strict decoding: every object sets `required` to all property keys and `additionalProperties: false` (recursively, including inside `$defs`).
    - Removes strict JSON Schema validators often rejected by providers in constrained mode (e.g., `minLength`, `maxLength`, `pattern`, `format`, numeric and array bounds, `uniqueItems`).
    - Appends a concise hint describing stripped constraints to each field’s `description` so the LLM still sees expectations during generation.
    - And other tweaks - see SchemaSanitizer.ts for more details.
    - Reference: `src/core/schema/SchemaSanitizer.ts`.
  - IMPORTANT: Replace any ad-hoc schema munging with the shared `SchemaSanitizer.sanitize(schema, options)` prior to provider calls.
    - Providers have differing strictness; the sanitizer produces a common-denominator schema they both accept and augments `description` with constraint hints.
    - Adapters may still apply tiny provider-specific tweaks when absolutely required, but prefer leaving most logic in `SchemaSanitizer`.

- Settings
  - Map `temperature`, `topP`, `maxTokens`, `frequencyPenalty`, `presencePenalty`, `stop`, `n`, `user`.
  - Reasoning:
    - Map `settings.reasoning.effort` to provider equivalent. Support the project requirement to accept “minimal” and map to the provider’s “low” when applicable.
  - Verbosity:
    - If provider supports verbosity (like “text.verbosity”), pass through.
    - For non-reasoning models, when `verbosity` is provided and `maxTokens` is not, map verbosity to derived `max_output_tokens` per project guidance.
  - `settings.providerOptions` should be passed through verbatim to the provider SDK (namespaced to avoid collisions).

- Streaming
  - Emit `content` deltas as they arrive.
  - Maintain accumulated `contentText`/`reasoningText` for the final chunk.
  - Populate `toolCallChunks` while arguments are streaming; emit `toolCalls` on completion (if provider returns full calls).
  - Set `metadata.finishReason` with appropriate values: `stop`, `length`, `tool_calls`, `error`.
  - Include incremental usage in `metadata.usage` with an “incremental” signal when estimating per-delta tokens.

- Usage and costs
  - If provider returns token usage, map it to `Usage` and compute costs via model pricing.
  - If not, estimate output tokens (use `TokenCalculator`) and combine with model pricing for cost metadata. For streaming, update per-delta.

- Images and embeddings (optional)
  - Implement `LLMProviderImage` or `LLMProviderEmbedding` when supported; convert params to provider format and convert responses with usage and costs.

- Errors
  - Catch provider SDK exceptions and map to auth/ratelimit/network/validation/service errors; include retry-after seconds if available.

- Logging
  - Use the centralized logger with a clear prefix for each method.
  - Prefer structured logs (no JSON.stringify in messages; pass objects as separate args).

### Registering your adapter

- Add an entry in `src/adapters/index.ts`:
```ts
import { YourProviderAdapter } from './yourprovider/adapter';
const ADAPTER_REGISTRY = {
  openai: OpenAIResponseAdapter as AdapterConstructor,
  yourprovider: YourProviderAdapter as AdapterConstructor,
} as const;
```

### Tests and scenarios to add

- Unit tests for:
  - Param conversion (messages, tools, JSON, settings).
  - Response conversion (content, toolCalls, metadata, usage/costs).
  - Stream conversion (deltas, toolCallChunks, finish reasons).
  - Error mapping cases.
- Integration/e2e:
  - Add scenarios under `adapters-e2e/scenarios/` mirroring `streaming`, `streamingTools`, `jsonOutput`, `usageTracking`.
- Verify with existing examples by swapping provider where feasible.

### Definition of Done checklist

- Adapter implements all required methods without using any `any` types.
- Converter maps all universal settings and features appropriately (tools, JSON mode, reasoning, verbosity, providerOptions).
- Streaming handler yields correct `UniversalStreamResponse` structure including tool call chunks.
- Pricing/usage works (real mapping or reasonable estimation) and appears in metadata.
- Errors are mapped to typed errors; retry-after honored where applicable.
- Models are registered with realistic capabilities and pricing.
- Adapter is added to `adapterRegistry` and works through `ProviderManager`.
- Tests pass and examples run with your provider.

- - -

- Validated your framework’s adapter contract, registry wiring, and OpenAI reference paths, and distilled them into a step-by-step authoring guide with code skeletons and key code references.
- Highlighted critical mappings (tools, JSON mode/schema, reasoning, verbosity [[memory:5593323]], streaming, usage/costs, errors) to ensure new adapters behave consistently with the framework.
