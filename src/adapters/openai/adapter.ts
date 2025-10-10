import { OpenAI } from 'openai';
import { toFile } from 'openai/uploads';
import type { Stream } from 'openai/streaming';
import { BaseAdapter, type AdapterConfig } from '../base/baseAdapter.ts';
import type {
    UniversalChatParams,
    UniversalChatResponse,
    UniversalStreamResponse,
    ModelInfo,
    ImageSource,
    ImageCallParams as BaseImageCallParams,
    Usage,
    EmbeddingParams,
    EmbeddingResponse
} from '../../interfaces/UniversalInterfaces.ts';
import { FinishReason } from '../../interfaces/UniversalInterfaces.ts';
import { OpenAIResponseAdapterError, OpenAIResponseValidationError, OpenAIResponseAuthError, OpenAIResponseRateLimitError, OpenAIResponseNetworkError, OpenAIResponseServiceError } from './errors.ts';
import { Converter } from './converter.ts';
import { StreamHandler } from './stream.ts';
import { Validator } from './validator.ts';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { getDirname } from '../../utils/paths.ts';
import { logger } from '../../utils/logger.ts';
import type { ToolDefinition } from '../../types/tooling.ts';
import type {
    ResponseCreateParamsNonStreaming,
    ResponseCreateParamsStreaming,
    Response,
    ResponseStreamEvent,
    Tool,
    ResponseContentPartAddedEvent
} from './types.ts';
import { ModelManager } from '../../core/models/ModelManager.ts';
import { defaultModels } from './models.ts';
import type { RegisteredProviders } from '../index.ts';
import { TokenCalculator } from '../../core/models/TokenCalculator.ts';
import type { LLMProviderImage, LLMProviderEmbedding, ImageOp } from '../../interfaces/LLMProvider.ts';
import { saveBase64ToFile } from '../../core/file-data/fileData.ts';
import * as fs from 'fs';
import type { UrlSource, Base64Source, FilePathSource } from '../../interfaces/UniversalInterfaces.ts';
import { RetryManager } from '../../core/retry/RetryManager.ts';
import { UsageTracker } from '../../core/telemetry/UsageTracker.ts';
import type { UsageCallback } from '../../interfaces/UsageInterfaces.ts';

// Use the paths utility to get the directory name for resolving .env
const adapterProjectRootForEnv = getDirname();

// Load environment variables
dotenv.config({ path: path.resolve(adapterProjectRootForEnv, '../../../.env') });

// Set debug level
const DEBUG_LEVEL = process.env.DEBUG_LEVEL || 'info'; // 'debug', 'info', 'error'

// Extend the ImageCallParams interface with usage tracking properties
interface ExtendedImageCallParams extends BaseImageCallParams {
    callerId?: string;
    usageCallback?: UsageCallback;
}

/**
 * OpenAI Response Adapter implementing the OpenAI /v1/responses API endpoint
 */
export class OpenAIResponseAdapter extends BaseAdapter implements LLMProviderImage, LLMProviderEmbedding {
    private client: OpenAI;
    private converter: Converter;
    private streamHandler: StreamHandler;
    private validator: Validator;
    private modelManager: ModelManager;
    private models: ModelInfo[] = defaultModels;
    private tokenCalculator: TokenCalculator;
    private retryManager: RetryManager;

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

        this.modelManager = new ModelManager('openai' as RegisteredProviders);
        this.tokenCalculator = new TokenCalculator();
        this.retryManager = new RetryManager({
            baseDelay: 1000,
            maxRetries: 3 // Default to 3 retries for image operations
        });

        // Register models with model manager if supported
        for (const model of this.models) {
            if (typeof this.modelManager.addModel === 'function') {
                this.modelManager.addModel(model);
            }
        }

        this.streamHandler = new StreamHandler(undefined, this.tokenCalculator);
        this.validator = new Validator();
        (this.validator as any).modelManager = this.modelManager;
        this.converter = new Converter(this.modelManager);
        // Create reusable logger instead of using setConfig
        const log = logger.createLogger({ level: process.env.LOG_LEVEL as any || 'info', prefix: 'OpenAIResponseAdapter' });
    }

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

            // Handle specific OpenAI API error types
            if (error instanceof OpenAI.APIError) {
                if (error.status === 401) {
                    throw new OpenAIResponseAuthError('Invalid API key or authentication error');
                } else if (error.status === 429) {
                    const retryAfter = error.headers?.['retry-after'];
                    throw new OpenAIResponseRateLimitError('Rate limit exceeded',
                        retryAfter ? parseInt(retryAfter, 10) : 60);
                } else if (error.status >= 500) {
                    throw new OpenAIResponseNetworkError(`OpenAI server error: ${error.message}`);
                } else if (error.status === 400) {
                    throw new OpenAIResponseValidationError(error.message || 'Invalid request parameters');
                }
            }

            throw new OpenAIResponseAdapterError(`OpenAI API error: ${error?.message || String(error)}`);
        }
    }

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
            // Handle specific OpenAI API error types
            if (error instanceof OpenAI.APIError) {
                if (error.status === 401) {
                    throw new OpenAIResponseAuthError('Invalid API key or authentication error');
                } else if (error.status === 429) {
                    const retryAfter = error.headers?.['retry-after'];
                    throw new OpenAIResponseRateLimitError('Rate limit exceeded',
                        retryAfter ? parseInt(retryAfter, 10) : 60);
                } else if (error.status >= 500) {
                    throw new OpenAIResponseNetworkError(`OpenAI server error: ${error.message}`);
                } else if (error.status === 400) {
                    throw new OpenAIResponseValidationError(error.message || 'Invalid request parameters');
                }
            }
            log.error('Stream API call failed:', error);
            throw new OpenAIResponseAdapterError(`OpenAI API stream error: ${error?.message || String(error)}`);
        }
    }

    /**
     * Creates a debugging wrapper around a stream to inspect events
     */
    private async *createDebugStreamWrapper(
        stream: AsyncIterable<UniversalStreamResponse>
    ): AsyncGenerator<UniversalStreamResponse> {
        if (DEBUG_LEVEL !== 'debug') {
            // If not in debug mode, just pass through the stream
            yield* stream;
            return;
        }

        let eventCount = 0;
        for await (const chunk of stream) {
            eventCount++;

            // Log diagnostic information about each chunk
            console.log(`[DEBUG] Stream Event #${eventCount}:`, JSON.stringify({
                hasContent: !!chunk.content && chunk.content.length > 0,
                contentLength: chunk.content?.length || 0,
                isComplete: chunk.isComplete,
                hasToolCalls: chunk.toolCalls && chunk.toolCalls.length > 0,
                toolCallsCount: chunk.toolCalls?.length || 0,
                finishReason: chunk.metadata?.finishReason
            }, null, 2));

            // If there are tool calls, log them in full
            if (chunk.toolCalls && chunk.toolCalls.length > 0) {
                console.log(`[DEBUG] Tool Calls in Event #${eventCount}:`, JSON.stringify(chunk.toolCalls, null, 2));
            }

            // Pass the chunk through to the caller
            yield chunk;
        }

        console.log(`[DEBUG] Stream completed after ${eventCount} events`);
    }

    // Update method signatures to use native types
    // Note: The return type from converter might need adjustment to align with the base param type
    async convertToProviderParams(model: string, params: UniversalChatParams): Promise<ResponseCreateParamsNonStreaming> {
        const baseParams = await this.converter.convertToOpenAIResponseParams(model, params);
        return {
            ...(baseParams as any),
            stream: false
        } as ResponseCreateParamsNonStreaming;
    }

    // Update method signatures to use native types
    convertFromProviderResponse(response: Response): UniversalChatResponse {
        return this.converter.convertFromOpenAIResponse(response as any);
    }

    /**
     * Validate that tools are properly formatted using the native OpenAI Response Tool type
     * @param tools Array of native OpenAI Response Tools
     * @throws OpenAIResponseValidationError if tools are not properly formatted
     */
    private validateToolsFormat(tools: Tool[] | undefined | null): void {
        if (!tools || !Array.isArray(tools)) {
            return;
        }

        // Validate each tool using the native type structure
        tools.forEach((tool: Tool, index) => {
            if (!tool.type) {
                throw new OpenAIResponseValidationError(`Tool at index ${index} is missing 'type' field`);
            }

            if (tool.type === 'function') {
                // For function tools (using the native FunctionTool structure)
                const functionTool = tool as OpenAI.Responses.FunctionTool;
                if (!functionTool.name) {
                    throw new OpenAIResponseValidationError(`Function tool at index ${index} is missing 'name' field`);
                }
                if (!functionTool.parameters) {
                    throw new OpenAIResponseValidationError(`Function tool at index ${index} is missing 'parameters' field`);
                }
            }
            // Add validation for other tool types like 'file_search' or 'web_search' if needed
            else if (tool.type === 'file_search') {
                // Validate file_search specific fields if needed
                const fileSearchTool = tool as OpenAI.Responses.FileSearchTool;
                if (!fileSearchTool.vector_store_ids || !Array.isArray(fileSearchTool.vector_store_ids)) {
                    throw new OpenAIResponseValidationError(`File search tool at index ${index} is missing 'vector_store_ids' field`);
                }
            } else if (tool.type === 'web_search_preview') {
                // No specific validation needed for web search at this time
            } else if (tool.type === 'computer_use_preview') {
                // No specific validation needed for computer-preview at this time
            } else {
                // Handle potentially unknown tool types
                logger.warn(`Unknown tool type encountered during validation: ${tool.type}`);
            }
        });
    }

    // Update method signature for stream response conversion
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

    /**
     * Registers a copy of the tools with the streamHandler to ensure IDs are consistent across execution
     * This is critical for the StreamPipeline to properly execute tool calls
     */
    private registerToolsForExecution(tools: ToolDefinition[]): void {
        if (!tools || tools.length === 0) return;

        const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.registerToolsForExecution' });
        log.debug(`Registering ${tools.length} tools for execution with StreamPipeline`);

        const mappedTools = tools.map(tool => ({
            ...tool,
            // Add a special property to the tool definition to flag it for execution
            executionEnabled: true
        }));

        // Update the tools in the stream handler
        if (this.streamHandler) {
            this.streamHandler.updateTools(mappedTools);
            log.debug('Tools updated in StreamHandler for execution');
        }

        // Log the registered tools for debugging
        mappedTools.forEach(tool => {
            log.debug(`Registered tool: ${tool.name} (executionEnabled: ${tool.executionEnabled})`);
        });
    }

    /**
     * Performs image generation, editing, or composite operations using OpenAI's DALL-E API
     * @param model The OpenAI model to use (e.g. 'dall-e-3')
     * @param op The image operation to perform ('generate', 'edit', 'edit-masked', or 'composite')
     * @param params Parameters for the image operation
     * @returns A Promise resolving to a UniversalChatResponse containing the image data
     */
    async imageCall(model: string, op: ImageOp, params: ExtendedImageCallParams): Promise<UniversalChatResponse> {
        const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.imageCall' });
        log.debug('Processing image operation:', { model, op, prompt: params.prompt });

        try {
            // Check if the model supports this image operation
            const supportCheck = this.supportsImageOperation(model, op);
            if (!supportCheck.supported) {
                throw new OpenAIResponseValidationError(supportCheck.reason || `Operation '${op}' not supported`);
            }

            // Enhanced error handling for file operations
            if ((op === 'edit' || op === 'edit-masked' || op === 'composite') && (!params.files || params.files.length === 0)) {
                log.error(`Image ${op} operation failed: No image files provided`, {
                    filesProvided: Boolean(params.files),
                    fileCount: params.files?.length || 0,
                    sourceTypes: params.files?.map(f => f.type).join(', ')
                });
                throw new OpenAIResponseValidationError(`Image ${op} operation requires at least one image file`);
            }

            // Create a retry manager for image operations
            const retryManager = new RetryManager({
                baseDelay: 1000,
                maxRetries: 3 // Default to 3 retries for image operations
            });

            // Function to determine if we should retry based on error
            const shouldRetry = (error: any): boolean => {
                // Network errors should be retried
                if (error instanceof OpenAIResponseNetworkError) {
                    return true;
                }

                // Handle rate limit errors
                if (error instanceof OpenAIResponseRateLimitError) {
                    return true;
                }

                // Handle ECONNRESET errors which are typically transient
                if (error.code === 'ECONNRESET' ||
                    (error.message && error.message.includes('ECONNRESET'))) {
                    log.warn('Connection reset error detected, will retry', { error });
                    return true;
                }

                // Handle 500-level server errors
                if (error instanceof Error &&
                    error.message &&
                    (error.message.includes('500') ||
                        error.message.includes('502') ||
                        error.message.includes('503') ||
                        error.message.includes('504'))) {
                    return true;
                }

                // Don't retry validation or input errors
                if (error instanceof OpenAIResponseValidationError ||
                    error instanceof OpenAIResponseAuthError) {
                    return false;
                }

                // Default to not retrying for unknown errors
                return false;
            };

            // Use retry manager for all image operations
            return await retryManager.executeWithRetry(async () => {
                // Extract parameters from parent call if available
                if (params.usageCallback) {
                    log.debug(`Image operation has usageCallback from caller`);
                }
                if (params.callerId) {
                    log.debug(`Image operation has callerId: ${params.callerId}`);
                }

                switch (op) {
                    case 'generate':
                        return await this.generateImage(model, params);
                    case 'edit':
                        // Check for image files
                        if (!params.files || params.files.length === 0) {
                            throw new OpenAIResponseValidationError('Image edit operation requires at least one image file');
                        }
                        return await this.editImage(model, params);
                    case 'edit-masked':
                        // Check for both image and mask files
                        if (!params.files || params.files.length === 0) {
                            throw new OpenAIResponseValidationError('Image edit-masked operation requires at least one image file');
                        }
                        if (!params.mask) {
                            throw new OpenAIResponseValidationError('Image edit-masked operation requires a mask file');
                        }
                        return await this.editImageWithMask(model, params);
                    case 'composite':
                        // Check for multiple image files
                        if (!params.files || params.files.length < 2) {
                            throw new OpenAIResponseValidationError('Image composite operation requires at least two image files');
                        }
                        return await this.generateVariation(model, params);
                    default:
                        throw new OpenAIResponseValidationError(`Unsupported image operation: ${op}`);
                }
            }, shouldRetry);
        } catch (error: any) {
            // Check for OpenAI API errors - use the error.name instead of instanceof to be more robust
            if (error && error.name === 'APIError' || error.status) {
                if (error.status === 401) {
                    throw new OpenAIResponseAuthError('Invalid API key or authentication error');
                } else if (error.status === 429) {
                    throw new OpenAIResponseRateLimitError('Rate limit exceeded', error.headers?.['retry-after']);
                } else if (error.status >= 500) {
                    throw new OpenAIResponseServiceError(`OpenAI service error: ${error.message}`);
                } else {
                    throw new OpenAIResponseValidationError(`OpenAI API error: ${error.message}`);
                }
            }

            // Handle connection errors specifically
            if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' ||
                (error.cause && (error.cause.code === 'ECONNRESET' || error.cause.code === 'ETIMEDOUT'))) {
                throw new OpenAIResponseNetworkError(`Connection error: ${error.message || String(error)}`);
            }

            // If it's not an OpenAI API error, wrap it
            if (!(error instanceof OpenAIResponseAdapterError)) {
                log.error('Image operation failed:', error);
                throw new OpenAIResponseAdapterError(`Image operation '${op}' failed: ${error.message || String(error)}`);
            }

            // Otherwise, just re-throw
            throw error;
        }
    }

    /**
     * Generate a new image using OpenAI 
     */
    private async generateImage(model: string, params: ExtendedImageCallParams): Promise<UniversalChatResponse> {
        const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.generateImage' });
        log.debug('Generating image with OpenAI', { prompt: params.prompt, model });

        // Create request parameters based on the model
        const requestParams: any = {
            model,
            prompt: params.prompt,
            n: 1
        };

        // Get the model capabilities
        const modelInfo = this.modelManager.getModel(model);
        // Check model type
        const isDallE3 = model.toLowerCase().includes('dall-e-3');
        const isDallE2 = model.toLowerCase().includes('dall-e-2');
        const isGptImage = model.toLowerCase().includes('gpt-image');

        // Process image options safely
        const imageOptions = this.handleImageOptions(params);

        // Add size parameter if provided
        if (imageOptions.size) {
            requestParams.size = imageOptions.size;
        }

        // Add quality parameter if specified - handle differently based on model
        if (imageOptions.quality) {
            const quality = imageOptions.quality.toLowerCase();

            if (isGptImage) {
                // For gpt-image-1: use high, medium, or low directly
                if (['high', 'medium', 'low'].includes(quality)) {
                    requestParams.quality = quality;
                    log.debug(`Using quality for gpt-image: ${quality}`);
                } else if (quality === 'auto') {
                    // Auto is default, don't need to specify
                    log.debug('Using auto quality (default) for gpt-image');
                } else {
                    log.warn(`Invalid quality '${quality}' for gpt-image model, using auto`);
                }
            } else if (isDallE3) {
                // For dall-e-3: use hd or standard
                if (quality === 'high' || quality === 'hd') {
                    requestParams.quality = 'hd';
                } else {
                    requestParams.quality = 'standard';
                }
                log.debug(`Quality for dall-e-3 converted: ${quality} → ${requestParams.quality}`);
            } else if (isDallE2) {
                // For dall-e-2: only standard is supported
                requestParams.quality = 'standard';
                log.debug('Using standard quality (only option) for dall-e-2');
            }
        }

        // Add response_format parameter for DALL-E models only
        if (isDallE3 || model.toLowerCase().includes('dall-e-2')) {
            requestParams.response_format = params.response_format === 'url' ? 'url' : 'b64_json';
        }

        log.debug('Image generation parameters:', requestParams);

        try {
            // Call the OpenAI API to generate the image
            const response = await this.client.images.generate(requestParams);

            // Log the raw OpenAI response for debugging with truncated data
            log.debug('Raw OpenAI image generation response:', this.truncateLogData(response));

            // Get the image data from the response
            if (!response.data || response.data.length === 0) {
                throw new OpenAIResponseAdapterError('No image data received from OpenAI API');
            }

            // IMPORTANT: Always use the actual token count from the API response when available
            // Calculate prompt tokens only if API doesn't provide them
            let promptTokens = 0;

            // Handle response usage data if available (cast to any since API types may not include usage for images)
            const responseWithUsage = response as any;

            if (responseWithUsage.usage?.input_tokens) {
                promptTokens = responseWithUsage.usage.input_tokens;
                log.debug('Using actual input token count from API:', promptTokens);
            } else if (params.prompt) {
                // Fall back to estimation ONLY if the API doesn't provide token counts
                promptTokens = this.tokenCalculator.calculateTokens(params.prompt);
                log.debug('Estimated prompt tokens (fallback):', promptTokens);
            }

            // Create usage tracking data for image generation
            const usageData = this.formatImageUsage(
                imageOptions.size || '1024x1024',
                1, // Only generating one image
                'generation',
                promptTokens // Pass prompt tokens to be included in usage
            );

            // If we have complete usage data from the API, use it to update our usage calculation
            if (responseWithUsage.usage?.total_tokens) {
                log.debug('Updating usage data with actual API counts:', {
                    input_tokens: responseWithUsage.usage.input_tokens,
                    output_tokens: responseWithUsage.usage.output_tokens,
                    total_tokens: responseWithUsage.usage.total_tokens
                });

                // Update token counts with actual values from the API
                usageData.tokens.input.total = responseWithUsage.usage.input_tokens || usageData.tokens.input.total;
                usageData.tokens.output.total = responseWithUsage.usage.output_tokens || usageData.tokens.output.total;
                usageData.tokens.output.image = responseWithUsage.usage.output_tokens || usageData.tokens.output.image;
                usageData.tokens.total = responseWithUsage.usage.total_tokens || usageData.tokens.total;

                // Recalculate costs based on actual token usage
                const inputCost = usageData.tokens.input.total * (0.5 / 1_000_000); // Adjust cost rates as needed
                const outputCost = usageData.tokens.output.total * (30 / 1_000_000);
                usageData.costs.input.total = inputCost;
                usageData.costs.output.total = outputCost;
                usageData.costs.output.image = outputCost;
                usageData.costs.total = inputCost + outputCost;
            }

            log.debug('Image generation usage data:', usageData);

            // Trigger usage callback if caller has set one
            if (params.usageCallback && params.callerId) {
                try {
                    const usageTracker = new UsageTracker(this.tokenCalculator, params.usageCallback, params.callerId);
                    await usageTracker.triggerCallback(usageData);
                    log.debug(`Triggered usage callback for callerId: ${params.callerId}`);
                } catch (error) {
                    log.error('Error triggering usage callback:', error);
                }
            }

            // Handle image data based on response format
            let imageData: string;
            let imageFormat: 'b64_json' | 'url' = 'b64_json';

            if (response.data[0].b64_json) {
                // Base64 data is available directly
                imageData = response.data[0].b64_json;
                imageFormat = 'b64_json';
            } else if (response.data[0].url) {
                // URL to the generated image
                imageData = response.data[0].url;
                imageFormat = 'url';
            } else {
                throw new OpenAIResponseAdapterError('No image data or URL received from OpenAI API');
            }

            // Handle output path if provided
            let imageSavedPath: string | undefined;
            if (params.outputPath) {
                if (imageFormat === 'b64_json') {
                    // Save base64 image to file
                    imageSavedPath = await saveBase64ToFile(imageData, params.outputPath, 'base64');
                } else {
                    // Download image from URL and save to file
                    imageSavedPath = await saveUrlToFile(imageData, params.outputPath);
                }
            }

            // Return formatted universal response
            return {
                content: '',
                role: 'assistant',
                image: {
                    data: imageFormat === 'b64_json' ? imageData : '',
                    dataSource: imageFormat === 'b64_json' ? 'base64' : 'url',
                    mime: 'image/png',
                    width: imageOptions.size ? parseInt(imageOptions.size.split('x')[0]) : 1024,
                    height: imageOptions.size ? parseInt(imageOptions.size.split('x')[1]) : 1024,
                    operation: 'generate'
                },
                metadata: {
                    model,
                    imageUrl: imageFormat === 'url' ? imageData : undefined,
                    imageSavedPath,
                    usage: usageData
                }
            };
        } catch (error: any) {
            log.error('Image generation failed:', error);
            throw new OpenAIResponseAdapterError(`Image generation failed: ${error.message || String(error)}`);
        }
    }

    /**
     * Edit an existing image using OpenAI's DALL-E model
     */
    private async editImage(model: string, params: ExtendedImageCallParams): Promise<UniversalChatResponse> {
        const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.editImage' });
        log.debug('Editing image with OpenAI');

        // Check if at least one image is provided 
        if (!params.files || params.files.length === 0) {
            throw new OpenAIResponseValidationError('Image edit operation requires at least one image file');
        }

        log.debug(`Editing image with ${params.files.length} image file(s)`);

        try {
            // Get image options safely
            const imageOptions = this.handleImageOptions(params);

            // Check model type
            const isDallE3 = model.toLowerCase().includes('dall-e-3');
            const isDallE2 = model.toLowerCase().includes('dall-e-2');
            const isGptImage = model.toLowerCase().includes('gpt-image');

            // Create base request parameters
            const requestParams: any = {
                model,
                prompt: params.prompt || '',
                size: imageOptions.size
            };

            // Add quality parameter if specified - handle differently based on model
            if (imageOptions.quality) {
                const quality = imageOptions.quality.toLowerCase();

                if (isGptImage) {
                    // For gpt-image-1: use high, medium, or low directly
                    if (['high', 'medium', 'low'].includes(quality)) {
                        requestParams.quality = quality;
                        log.debug(`Using quality for gpt-image: ${quality}`);
                    } else if (quality === 'auto') {
                        // Auto is default, don't need to specify
                        log.debug('Using auto quality (default) for gpt-image');
                    } else {
                        log.warn(`Invalid quality '${quality}' for gpt-image model, using auto`);
                    }
                } else if (isDallE3) {
                    // For dall-e-3: use hd or standard
                    if (quality === 'high' || quality === 'hd') {
                        requestParams.quality = 'hd';
                    } else {
                        requestParams.quality = 'standard';
                    }
                    log.debug(`Quality for dall-e-3 converted: ${quality} → ${requestParams.quality}`);
                } else if (isDallE2) {
                    // For dall-e-2: only standard is supported
                    requestParams.quality = 'standard';
                    log.debug('Using standard quality (only option) for dall-e-2');
                }
            }

            // Add style parameter if specified
            if (imageOptions.style) {
                requestParams.style = imageOptions.style;
            }

            // Add background parameter if provided (using optional chaining)
            if (params.options?.background) {
                requestParams.background = params.options.background;
            }

            // Process image(s) based on whether we have single or multiple images
            if (params.files.length === 1) {
                // Single image case
                requestParams.image = await this.toOpenAIImageArg(params.files[0]);
            } else {
                // Multiple images case - need to await all the conversions
                requestParams.image = await Promise.all(
                    params.files.map(file => this.toOpenAIImageArg(file))
                );
            }

            // Log requestParams without the actual image data for security/readability
            const debugParams = { ...requestParams };
            if (debugParams.image) {
                debugParams.image = '[Image data omitted]';
            }
            log.debug('Image edit parameters:', debugParams);

            // Call the OpenAI API to edit the image
            const response = await this.client.images.edit(requestParams);

            // Log raw OpenAI response for debugging
            log.debug('Raw OpenAI image edit response:', this.truncateLogData(response));

            // Calculate prompt tokens if a prompt was provided
            let promptTokens = 0;
            if (params.prompt) {
                promptTokens = this.tokenCalculator.calculateTokens(params.prompt);
                log.debug('Calculated prompt tokens:', promptTokens);
            }

            // Create usage tracking data for image edit
            const usageData = this.formatImageUsage(
                imageOptions.size || '1024x1024',
                params.files?.length || 1,
                'edit',
                promptTokens
            );

            log.debug('Calculated usage data:', JSON.stringify(usageData, null, 2));

            // Trigger usage callback if caller has set one
            if (params.usageCallback && params.callerId) {
                try {
                    const usageTracker = new UsageTracker(this.tokenCalculator, params.usageCallback, params.callerId);
                    await usageTracker.triggerCallback(usageData);
                    log.debug(`Triggered usage callback for callerId: ${params.callerId}`);
                } catch (error) {
                    log.error('Error triggering usage callback:', error);
                }
            }

            // Process the response
            if (!response.data || response.data.length === 0) {
                throw new OpenAIResponseAdapterError('No image data received from OpenAI API');
            }

            // Handle image data
            let imageData: string;
            let dataFormat: 'b64_json' | 'url' = 'b64_json';

            if (response.data[0].b64_json) {
                imageData = response.data[0].b64_json;
                dataFormat = 'b64_json';
            } else if (response.data[0].url) {
                imageData = response.data[0].url;
                dataFormat = 'url';
            } else {
                throw new OpenAIResponseAdapterError('No image data or URL received from OpenAI API');
            }

            // Determine image dimensions from size
            const dimensions = imageOptions.size.split('x');
            const imageWidth = parseInt(dimensions[0]);
            const imageHeight = parseInt(dimensions[1]);

            // Create the response object
            const result: UniversalChatResponse = {
                content: null,
                role: 'assistant',
                image: {
                    data: imageData,
                    dataSource: dataFormat === 'url' ? 'url' : 'base64',
                    mime: 'image/png',
                    width: imageWidth,
                    height: imageHeight,
                    operation: 'edit'
                },
                metadata: {
                    created: Date.now(),
                    model,
                    usage: usageData
                }
            };

            // Save to file if outputPath provided
            if (params.outputPath) {
                try {
                    if (dataFormat === 'url') {
                        log.debug(`Image URL received (${imageData.substring(0, 30)}...), saving to ${params.outputPath} not supported yet`);
                        if (!result.metadata) result.metadata = {};
                        result.metadata.imageSavedPath = params.outputPath;
                        result.metadata.imageUrl = imageData;
                    } else {
                        await saveBase64ToFile(imageData, params.outputPath, 'image/png');
                        if (!result.metadata) result.metadata = {};
                        result.metadata.imageSavedPath = params.outputPath;
                        log.debug(`Edited image saved to ${params.outputPath}`);
                    }
                } catch (error) {
                    log.error(`Failed to save edited image to ${params.outputPath}:`, error);
                }
            }

            return result;
        } catch (error: any) {
            log.error('Image edit operation failed:', error);
            throw new OpenAIResponseAdapterError(`Image edit operation failed: ${error.message || String(error)}`);
        }
    }

    /**
     * Edit an image with a mask using OpenAI's DALL-E model
     */
    private async editImageWithMask(model: string, params: ExtendedImageCallParams): Promise<UniversalChatResponse> {
        const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.editImageWithMask' });
        log.debug('Editing image with mask using OpenAI');

        // Validate required parameters
        if (!params.files || params.files.length === 0) {
            throw new OpenAIResponseValidationError('editImageWithMask requires at least one image file');
        }
        if (!params.mask) {
            throw new OpenAIResponseValidationError('editImageWithMask requires a mask file');
        }

        try {
            // Get image options safely
            const imageOptions = this.handleImageOptions(params);

            // Check model type
            const isDallE3 = model.toLowerCase().includes('dall-e-3');
            const isDallE2 = model.toLowerCase().includes('dall-e-2');
            const isGptImage = model.toLowerCase().includes('gpt-image');

            // Create base request parameters
            const requestParams: any = {
                model,
                prompt: params.prompt || '',
                size: imageOptions.size
            };

            // Add quality parameter if specified - handle differently based on model
            if (imageOptions.quality) {
                const quality = imageOptions.quality.toLowerCase();

                if (isGptImage) {
                    // For gpt-image-1: use high, medium, or low directly
                    if (['high', 'medium', 'low'].includes(quality)) {
                        requestParams.quality = quality;
                        log.debug(`Using quality for gpt-image: ${quality}`);
                    } else if (quality === 'auto') {
                        // Auto is default, don't need to specify
                        log.debug('Using auto quality (default) for gpt-image');
                    } else {
                        log.warn(`Invalid quality '${quality}' for gpt-image model, using auto`);
                    }
                } else if (isDallE3) {
                    // For dall-e-3: use hd or standard
                    if (quality === 'high' || quality === 'hd') {
                        requestParams.quality = 'hd';
                    } else {
                        requestParams.quality = 'standard';
                    }
                    log.debug(`Quality for dall-e-3 converted: ${quality} → ${requestParams.quality}`);
                } else if (isDallE2) {
                    // For dall-e-2: only standard is supported
                    requestParams.quality = 'standard';
                    log.debug('Using standard quality (only option) for dall-e-2');
                }
            }

            // Add style parameter if specified (for DALL-E 3)
            if (imageOptions.style) {
                requestParams.style = imageOptions.style;
            }

            // Process the main image
            requestParams.image = await this.toOpenAIImageArg(params.files[0]);

            // Process the mask image
            requestParams.mask = await this.toOpenAIImageArg(params.mask);

            // Log requestParams without the actual image data for security/readability
            const debugParams = { ...requestParams };
            if (debugParams.image) {
                debugParams.image = '[Image data omitted]';
            }
            if (debugParams.mask) {
                debugParams.mask = '[Mask data omitted]';
            }
            log.debug('Image edit with mask parameters:', debugParams);

            // Call the OpenAI API to edit the image with mask
            const response = await this.client.images.edit(requestParams);

            // Log raw OpenAI response for debugging
            log.debug('Raw OpenAI image edit with mask response:', this.truncateLogData(response));

            // Calculate prompt tokens if a prompt was provided
            let promptTokens = 0;
            if (params.prompt) {
                promptTokens = this.tokenCalculator.calculateTokens(params.prompt);
                log.debug('Calculated prompt tokens:', promptTokens);
            }

            // Create usage tracking data
            const usageData = this.formatImageUsage(
                imageOptions.size || '1024x1024',
                1, // Main image
                'edit',
                promptTokens
            );

            log.debug('Image edit with mask usage data:', usageData);

            // Trigger usage callback if caller has set one
            if (params.usageCallback && params.callerId) {
                try {
                    const usageTracker = new UsageTracker(this.tokenCalculator, params.usageCallback, params.callerId);
                    await usageTracker.triggerCallback(usageData);
                    log.debug(`Triggered usage callback for callerId: ${params.callerId}`);
                } catch (error) {
                    log.error('Error triggering usage callback:', error);
                }
            }

            // Process the response
            if (!response.data || response.data.length === 0) {
                throw new OpenAIResponseAdapterError('No image data received from OpenAI API');
            }

            // Handle image data
            let imageData: string;
            let dataSource: 'url' | 'base64' = 'base64';

            if (response.data[0].b64_json) {
                imageData = response.data[0].b64_json;
                dataSource = 'base64';
            } else if (response.data[0].url) {
                imageData = response.data[0].url;
                dataSource = 'url';
            } else {
                throw new OpenAIResponseAdapterError('No image data or URL received from OpenAI API');
            }

            // Determine image dimensions from size
            const imageWidth = parseInt(imageOptions.size.split('x')[0]);
            const imageHeight = parseInt(imageOptions.size.split('x')[1]);

            // Create the response object
            const result: UniversalChatResponse = {
                content: null,
                role: 'assistant',
                image: {
                    data: imageData,
                    dataSource: dataSource,
                    mime: 'image/png',
                    width: imageWidth,
                    height: imageHeight,
                    operation: 'edit-masked'
                },
                metadata: {
                    created: Date.now(),
                    model,
                    usage: usageData
                }
            };

            // Save to file if outputPath provided
            if (params.outputPath) {
                try {
                    if (dataSource === 'url') {
                        log.debug(`Image URL received (${imageData.substring(0, 30)}...), saving to ${params.outputPath} not supported yet`);
                        if (!result.metadata) result.metadata = {};
                        result.metadata.imageSavedPath = params.outputPath;
                        result.metadata.imageUrl = imageData;
                    } else {
                        await saveBase64ToFile(imageData, params.outputPath, 'image/png');
                        if (!result.metadata) result.metadata = {};
                        result.metadata.imageSavedPath = params.outputPath;
                        log.debug(`Edited image with mask saved to ${params.outputPath}`);
                    }
                } catch (error) {
                    log.error(`Failed to save edited image with mask to ${params.outputPath}:`, error);
                }
            }

            return result;
        } catch (error: any) {
            log.error('Image edit with mask operation failed:', error);
            throw new OpenAIResponseAdapterError(`Image edit with mask operation failed: ${error.message || String(error)}`);
        }
    }

    /**
     * Generate variations or composites of multiple images
     */
    private async generateVariation(model: string, params: ExtendedImageCallParams): Promise<UniversalChatResponse> {
        const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.generateVariation' });
        log.debug('Generating image variation with OpenAI');

        // Check if at least one image is provided
        if (!params.files || params.files.length === 0) {
            throw new OpenAIResponseValidationError('Image variation operation requires at least one image file');
        }

        try {
            // Get image options safely
            const imageOptions = this.handleImageOptions(params);

            // Create base request parameters
            const requestParams: any = {
                model,
                image: await this.toOpenAIImageArg(params.files[0]),
                n: 1 // Currently only supporting single variation generation
            };

            // Add size parameter
            if (imageOptions.size) {
                requestParams.size = imageOptions.size;
            }

            // Add response format parameter
            requestParams.response_format = params.response_format === 'url' ? 'url' : 'b64_json';

            // Log requestParams without the actual image data for security/readability
            const debugParams = { ...requestParams };
            if (debugParams.image) {
                debugParams.image = '[Image data omitted]';
            }
            log.debug('Image variation parameters:', debugParams);

            // Call the OpenAI API to generate image variations
            const response = await this.client.images.createVariation(requestParams);

            // Log raw OpenAI response for debugging
            log.debug('Raw OpenAI image variation response:', this.truncateLogData(response));

            // Calculate prompt tokens if a prompt was provided
            let promptTokens = 0;
            if (params.prompt) {
                promptTokens = this.tokenCalculator.calculateTokens(params.prompt);
                log.debug('Calculated prompt tokens:', promptTokens);
            }

            // Create usage tracking data
            const usageData = this.formatImageUsage(
                imageOptions.size || '1024x1024',
                1, // Using one image for variation
                'variation',
                promptTokens
            );

            log.debug('Image variation usage data:', usageData);

            // Trigger usage callback if caller has set one
            if (params.usageCallback && params.callerId) {
                try {
                    const usageTracker = new UsageTracker(this.tokenCalculator, params.usageCallback, params.callerId);
                    await usageTracker.triggerCallback(usageData);
                    log.debug(`Triggered usage callback for callerId: ${params.callerId}`);
                } catch (error) {
                    log.error('Error triggering usage callback:', error);
                }
            }

            // Process the response
            if (!response.data || response.data.length === 0) {
                throw new OpenAIResponseAdapterError('No image data received from OpenAI API');
            }

            // Handle image data
            let imageData: string;
            let dataSource: 'url' | 'base64' = 'base64';

            if (response.data[0].b64_json) {
                imageData = response.data[0].b64_json;
                dataSource = 'base64';
            } else if (response.data[0].url) {
                imageData = response.data[0].url;
                dataSource = 'url';
            } else {
                throw new OpenAIResponseAdapterError('No image data or URL received from OpenAI API');
            }

            // Determine image dimensions from size
            const imageWidth = parseInt(imageOptions.size.split('x')[0]);
            const imageHeight = parseInt(imageOptions.size.split('x')[1]);

            // Create the response object
            const result: UniversalChatResponse = {
                content: null,
                role: 'assistant',
                image: {
                    data: imageData,
                    dataSource: dataSource,
                    mime: 'image/png',
                    width: imageWidth,
                    height: imageHeight,
                    operation: 'composite'
                },
                metadata: {
                    created: Date.now(),
                    model,
                    usage: usageData
                }
            };

            // Save to file if outputPath provided
            if (params.outputPath) {
                try {
                    if (dataSource === 'url') {
                        log.debug(`Image URL received (${imageData.substring(0, 30)}...), saving to ${params.outputPath} not supported yet`);
                        if (!result.metadata) result.metadata = {};
                        result.metadata.imageSavedPath = params.outputPath;
                        result.metadata.imageUrl = imageData;
                    } else {
                        await saveBase64ToFile(imageData, params.outputPath, 'image/png');
                        if (!result.metadata) result.metadata = {};
                        result.metadata.imageSavedPath = params.outputPath;
                        log.debug(`Composite image saved to ${params.outputPath}`);
                    }
                } catch (error) {
                    log.error(`Failed to save composite image to ${params.outputPath}:`, error);
                }
            }

            return result;
        } catch (error: any) {
            log.error('Image variation operation failed:', error);
            throw new OpenAIResponseAdapterError(`Image variation operation failed: ${error.message || String(error)}`);
        }
    }

    /**
     * Convert various image source types to an OpenAI-compatible image argument
     * @param imageSource The image source to convert
     * @returns A promise resolving to an OpenAI-compatible image parameter (File | string)
     */
    private async toOpenAIImageArg(imageSource: ImageSource): Promise<any> {
        const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.toOpenAIImageArg' });
        log.debug('Converting image source to OpenAI format', { sourceType: imageSource.type });

        try {
            // Handle different types of image sources
            switch (imageSource.type) {
                case 'url':
                    // For URLs, return as-is
                    return imageSource.url;

                case 'base64':
                    // For base64, convert to a File object using OpenAI's toFile helper
                    return toFile(
                        Buffer.from(imageSource.data, 'base64'),
                        'image.png', // Default filename, overridden by mime type
                        { type: imageSource.mime || 'image/png' }
                    );

                case 'file_path':
                    // For file paths, read the file and convert to a File object
                    try {
                        const fileData = await fs.promises.readFile(imageSource.path);
                        const mimeType = imageSource.path.toLowerCase().endsWith('.png')
                            ? 'image/png'
                            : imageSource.path.toLowerCase().endsWith('.jpeg') || imageSource.path.toLowerCase().endsWith('.jpg')
                                ? 'image/jpeg'
                                : 'application/octet-stream';

                        return toFile(
                            fileData,
                            path.basename(imageSource.path),
                            { type: mimeType }
                        );
                    } catch (fileError: unknown) {
                        log.error(`Failed to read file from path ${imageSource.path}:`, fileError);
                        const errorMessage = fileError instanceof Error ? fileError.message : String(fileError);
                        throw new OpenAIResponseAdapterError(`Failed to read image file: ${errorMessage}`);
                    }

                default:
                    throw new OpenAIResponseValidationError(`Unsupported image source type: ${(imageSource as any).type}`);
            }
        } catch (error: any) {
            log.error('Failed to convert image source to OpenAI format:', error);
            throw new OpenAIResponseAdapterError(`Image conversion failed: ${error.message || String(error)}`);
        }
    }

    /**
     * Utility function to check if a file is a valid image (simplistic check)
     */
    private isValidImage(path: string): boolean {
        const extension = path.split('.').pop()?.toLowerCase();
        return !!extension && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension);
    }

    /**
     * Handle and validate image options from the parameters
     */
    private handleImageOptions(params: ExtendedImageCallParams): {
        size: string;
        quality?: 'standard' | 'hd';
        style?: 'vivid' | 'natural';
    } {
        // Default size and quality
        const result = {
            size: params.size || '1024x1024',
            quality: undefined as 'standard' | 'hd' | undefined,
            style: undefined as 'vivid' | 'natural' | undefined
        };

        // Only access options if they exist
        if (params.options) {
            // Handle size option
            if (params.options.size) {
                result.size = params.options.size;
            }

            // Handle quality option
            if (params.options.quality) {
                result.quality = params.options.quality;
            }

            // Handle style option
            if (params.options.style) {
                result.style = params.options.style;
            }
        }

        return result;
    }

    /**
     * Format usage data for image operations
     * @param size Image size
     * @param imageCount Number of images
     * @param type Operation type ('generation', 'edit', or 'variation')
     * @param promptTokens Number of tokens in the prompt text (for generation)
     * @returns Usage data
     */
    private formatImageUsage(
        size: string = '1024x1024',
        imageCount: number = 1,
        type: 'generation' | 'edit' | 'variation',
        promptTokens: number = 0
    ): Usage {
        const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.formatImageUsage' });

        // Estimate image tokens based on size
        const sizeTokens: Record<string, number> = {
            '256x256': 500,
            '512x512': 700,
            '1024x1024': 1000,
            '1024x1792': 1300,
            '1792x1024': 1300,
        };

        const tokenPerImage = sizeTokens[size] || 1000; // Default to 1000 tokens for unknown sizes

        // Calculate input tokens
        // For generation, input is the text prompt tokens
        // For edit/variation, we need to account for both prompt tokens and the input image tokens
        const inputImageTokens = type !== 'generation' ? tokenPerImage * imageCount : 0;
        const totalInputTokens = inputImageTokens + promptTokens;

        // Calculate output tokens (always count the generated images)
        const outputImageTokens = tokenPerImage * imageCount;

        log.debug('Image token calculation:', {
            size,
            imageCount,
            type,
            tokenPerImage,
            promptTokens,
            inputImageTokens,
            totalInputTokens,
            outputImageTokens
        });

        // Estimate costs - using placeholder pricing per million tokens
        const inputImagePricePerMillion = 10; // $10 per million tokens for input images (placeholder)
        const outputImagePricePerMillion = 30; // $30 per million tokens for output images (placeholder)
        const promptPricePerMillion = 0.5; // $0.50 per million tokens for text prompts

        // Calculate estimated costs
        const inputImageCost = inputImageTokens * (inputImagePricePerMillion / 1_000_000);
        const promptCost = promptTokens * (promptPricePerMillion / 1_000_000);
        const outputCost = outputImageTokens * (outputImagePricePerMillion / 1_000_000);
        const totalCost = inputImageCost + promptCost + outputCost;

        // Create usage data structure
        const usage: Usage = {
            tokens: {
                total: totalInputTokens + outputImageTokens,
                input: {
                    total: totalInputTokens,
                    cached: 0,
                    ...(inputImageTokens > 0 ? { image: inputImageTokens } : {})
                },
                output: {
                    total: outputImageTokens,
                    reasoning: 0,
                    image: outputImageTokens
                }
            },
            costs: {
                total: totalCost,
                input: {
                    total: inputImageCost + promptCost,
                    cached: 0
                },
                output: {
                    total: outputCost,
                    reasoning: 0,
                    image: outputCost
                }
            }
        };

        return usage;
    }

    /**
     * Check if the given model supports image operations
     * @param model Model name to check
     * @param op Image operation
     * @returns Object with support status and reason if not supported
     */
    private supportsImageOperation(model: string, op: ImageOp): { supported: boolean; reason?: string } {
        // Get model capabilities
        const modelInfo = this.modelManager.getModel(model);
        if (!modelInfo) {
            return { supported: false, reason: `Model ${model} not found` };
        }

        // Check for image output capability
        if (!modelInfo.capabilities?.output?.image) {
            return { supported: false, reason: `Model ${model} does not support image output` };
        }

        // If image capability is an object, check for specific operations
        if (typeof modelInfo.capabilities.output.image === 'object') {
            if (op === 'generate' && !modelInfo.capabilities.output.image.generate) {
                return { supported: false, reason: `Model ${model} does not support image generation` };
            }
            if ((op === 'edit' || op === 'composite') && !modelInfo.capabilities.output.image.edit) {
                return { supported: false, reason: `Model ${model} does not support image editing` };
            }
            if (op === 'edit-masked' && !modelInfo.capabilities.output.image.editWithMask) {
                return { supported: false, reason: `Model ${model} does not support masked image editing` };
            }
        }

        // Default to supported if we don't have detailed capability info
        return { supported: true };
    }

    /**
     * Helper method to truncate long data in log messages
     */
    private truncateLogData(data: any, maxLength: number = 100): any {
        if (!data) return data;

        // Create a deep copy to avoid modifying the original
        const result = JSON.parse(JSON.stringify(data));

        // Process the data object
        const truncateString = (str: string, maxLength: number = 100) => {
            if (str && str.length > maxLength) {
                return `${str.substring(0, maxLength)}... [truncated, ${str.length} chars total]`;
            }
            return str;
        };

        // Process data array if it exists
        if (result.data && Array.isArray(result.data)) {
            result.data = result.data.map((item: any) => {
                // Truncate b64_json if present
                if (item.b64_json) {
                    item.b64_json = truncateString(item.b64_json);
                }
                // Truncate url if present and very long
                if (item.url && item.url.length > 100) {
                    item.url = truncateString(item.url);
                }
                return item;
            });
        }

        return result;
    }

    async embeddingCall(model: string, params: EmbeddingParams): Promise<EmbeddingResponse> {
        const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.embeddingCall' });
        log.debug('Generating embeddings', {
            model,
            inputType: Array.isArray(params.input) ? 'batch' : 'single',
            inputCount: Array.isArray(params.input) ? params.input.length : 1
        });

        try {
            // Convert to OpenAI embedding parameters
            const openAIParams = this.convertToProviderEmbeddingParams(model, params);

            // Call OpenAI embeddings API
            const response = await this.client.embeddings.create(openAIParams);

            // Convert response to universal format
            const universalResponse = this.convertFromProviderEmbeddingResponse(response);

            log.info('Successfully generated embeddings', {
                model,
                inputCount: Array.isArray(params.input) ? params.input.length : 1,
                tokensUsed: universalResponse.usage.tokens.total,
                cost: universalResponse.usage.costs.total
            });

            return universalResponse;
        } catch (error: any) {
            log.error('Failed to generate embeddings:', error);

            // Handle specific OpenAI API error types
            if (error instanceof OpenAI.APIError) {
                if (error.status === 401) {
                    throw new OpenAIResponseAuthError('Invalid API key or authentication error');
                } else if (error.status === 429) {
                    const retryAfter = error.headers?.['retry-after'];
                    throw new OpenAIResponseRateLimitError('Rate limit exceeded',
                        retryAfter ? parseInt(retryAfter, 10) : 60);
                } else if (error.status >= 500) {
                    throw new OpenAIResponseNetworkError(`OpenAI server error: ${error.message}`);
                } else if (error.status === 400) {
                    throw new OpenAIResponseValidationError(error.message || 'Invalid request parameters');
                }
            }

            throw new OpenAIResponseAdapterError(`OpenAI embedding API error: ${error?.message || String(error)}`);
        }
    }

    convertToProviderEmbeddingParams(model: string, params: EmbeddingParams): OpenAI.EmbeddingCreateParams {
        return {
            model,
            input: params.input,
            dimensions: params.dimensions,
            encoding_format: params.encodingFormat,
            user: params.user,
        };
    }

    convertFromProviderEmbeddingResponse(response: OpenAI.CreateEmbeddingResponse): EmbeddingResponse {
        // Calculate usage based on OpenAI's response
        const usage: Usage = {
            tokens: {
                input: {
                    total: response.usage.prompt_tokens,
                    cached: 0, // OpenAI doesn't provide cached token info for embeddings
                },
                output: {
                    total: 0, // Embeddings don't generate output tokens
                    reasoning: 0,
                },
                total: response.usage.prompt_tokens,
            },
            costs: this.calculateEmbeddingCosts(response.usage.prompt_tokens, response.model)
        };

        return {
            embeddings: response.data.map((item, index) => ({
                embedding: item.embedding,
                index: index,
                object: 'embedding' as const,
            })),
            model: response.model,
            usage,
            metadata: {
                created: Date.now(),
                model: response.model,
            },
        };
    }

    private calculateEmbeddingCosts(inputTokens: number, modelName: string): Usage['costs'] {
        // Get model info for pricing
        const modelInfo = this.modelManager.getModel(modelName);
        const inputPricePerMillion = modelInfo?.inputPricePerMillion || 0.02; // Default to text-embedding-3-small pricing

        const inputCost = (inputTokens * inputPricePerMillion) / 1_000_000;

        return {
            input: {
                total: inputCost,
                cached: 0,
            },
            output: {
                total: 0, // No output costs for embeddings
                reasoning: 0,
            },
            total: inputCost,
        };
    }
}

/**
 * Save an image from a URL to a file
 * @param url URL of the image
 * @param outputPath Path to save the image to
 * @returns Path where the image was saved
 */
const saveUrlToFile = async (url: string, outputPath: string): Promise<string> => {
    const log = logger.createLogger({ prefix: 'saveUrlToFile' });
    log.debug(`Downloading image from URL to ${outputPath}`);

    try {
        // Implementation would normally fetch the image and save it
        // For now, just return the output path
        log.warn('URL downloading not implemented, returning path only');
        return outputPath;
    } catch (error: any) {
        throw new Error(`Failed to save image from URL: ${error.message}`);
    }
};