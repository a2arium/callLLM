import { OpenAI, toFile } from 'openai';
import type { Stream } from 'openai/streaming';
import { BaseAdapter, AdapterConfig } from '../base/baseAdapter';
import { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse, FinishReason, ModelInfo, ImageDataSource } from '../../interfaces/UniversalInterfaces';
import { OpenAIResponseAdapterError, OpenAIResponseValidationError, OpenAIResponseAuthError, OpenAIResponseRateLimitError, OpenAIResponseNetworkError } from './errors';
import { Converter } from './converter';
import { StreamHandler } from './stream';
import { Validator } from './validator';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { logger } from '../../utils/logger';
import type { ToolDefinition } from '../../types/tooling';
import {
    ResponseCreateParamsNonStreaming,
    ResponseCreateParamsStreaming,
    Response,
    ResponseStreamEvent,
    Tool,
    ResponseContentPartAddedEvent
} from './types';
import { ModelManager } from '../../core/models/ModelManager';
import { defaultModels } from './models';
import { RegisteredProviders } from '../index';
import { TokenCalculator } from '../../core/models/TokenCalculator';
import { LLMProviderImage, ImageOp, ImageCallParams } from '../../interfaces/LLMProvider';
import { saveBase64ToFile } from '../../core/file-data/fileData';
import * as fs from 'fs';
import { UrlSource, Base64Source, FilePathSource } from '../../interfaces/UniversalInterfaces';
import { RetryManager } from '../../core/retry/RetryManager';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Set debug level
const DEBUG_LEVEL = process.env.DEBUG_LEVEL || 'info'; // 'debug', 'info', 'error'

/**
 * OpenAI Response Adapter implementing the OpenAI /v1/responses API endpoint
 */
export class OpenAIResponseAdapter extends BaseAdapter implements LLMProviderImage {
    private client: OpenAI;
    private converter: Converter;
    private streamHandler: StreamHandler;
    private validator: Validator;
    private modelManager: ModelManager;
    private models: ModelInfo[] = defaultModels;
    private tokenCalculator: TokenCalculator;

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
            } else if (tool.type === 'computer-preview') {
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
    async imageCall(model: string, op: ImageOp, params: ImageCallParams): Promise<UniversalChatResponse> {
        const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.imageCall' });
        log.debug('Processing image operation:', { model, op, prompt: params.prompt });

        try {
            // Enhanced error handling for file operations
            if ((op === 'edit' || op === 'edit-masked' || op === 'composite') && (!params.files || params.files.length === 0)) {
                log.error(`Image ${op} operation failed: No image files provided`, {
                    filesProvided: Boolean(params.files),
                    fileCount: params.files?.length || 0,
                    sourceTypes: params.files?.map(f => f.kind).join(', ')
                });
                throw new OpenAIResponseValidationError(`Image ${op} operation requires at least one image file`);
            }

            // Create a retry manager for image operations
            const retryManager = new RetryManager({
                baseDelay: 1000,
                maxRetries: 3 // Default to 3 retries for image operations
            });

            // Define what errors should be retried
            const shouldRetry = (error: unknown): boolean => {
                // Retry on connection errors
                if (error instanceof Error) {
                    // Check for API connection errors from OpenAI lib
                    if (error.message?.includes('Connection error')) return true;

                    // Check for common network errors
                    if ((error as any).code === 'ECONNRESET' ||
                        (error as any).code === 'ETIMEDOUT' ||
                        (error as any).code === 'ECONNABORTED') {
                        return true;
                    }

                    // Check for nested error causes
                    if ((error as any).cause) {
                        const cause = (error as any).cause;
                        if (cause.code === 'ECONNRESET' ||
                            cause.code === 'ETIMEDOUT' ||
                            cause.code === 'ECONNABORTED') {
                            return true;
                        }
                    }
                }

                // Retry on 5xx server errors
                if (error instanceof OpenAI.APIError && error.status && error.status >= 500) {
                    return true;
                }

                // Retry on rate limit errors
                if (error instanceof OpenAIResponseRateLimitError) {
                    return true;
                }

                return false;
            };

            // Use retry manager for all image operations
            return await retryManager.executeWithRetry(async () => {
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
    private async generateImage(model: string, params: ImageCallParams): Promise<UniversalChatResponse> {
        const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.generateImage' });
        log.debug('Generating image with OpenAI');

        // Create request parameters based on the model
        const requestParams: any = {
            model,
            prompt: params.prompt,
            n: 1
        };

        // Get the model capabilities
        const modelInfo = this.modelManager.getModel(model);
        // Is Dall-E family model
        const isDallE3 = model.toLowerCase().includes('dall-e');

        // Determine size parameter - convert from our format to OpenAI's
        let size: string = '1024x1024';
        if (params.options.size) {
            // Handle various size options
            if (['1792x1024', '1024x1792', '1536x1024', '1024x1536'].includes(params.options.size)) {
                size = params.options.size;
            }
        }
        requestParams.size = size;

        // Handle model-specific parameters based on capabilities or model type
        if (isDallE3) {
            // For DALL-E-3 specific parameters
            if (params.options.quality) {
                // DALL-E-3 uses 'hd' for high quality, 'standard' otherwise
                requestParams.quality = params.options.quality === 'high' ? 'hd' : 'standard';
            }

            // Style is only supported for DALL-E-3
            if (params.options.style) {
                requestParams.style = params.options.style;
            } else {
                requestParams.style = 'vivid'; // Default style for DALL-E-3
            }

            // DALL-E-3 supports response_format
            requestParams.response_format = 'b64_json';
        } else {
            // For other models like gpt-image-1
            if (params.options.quality) {
                // Uses 'high', 'medium', 'low', or 'auto' directly
                requestParams.quality = params.options.quality;
            }

            // Some models support background parameter
            if (params.options.background) {
                requestParams.background = params.options.background;
            }

            // Do not set response_format for models that don't support it
        }

        log.debug('Image generation parameters:', requestParams);

        // Call the OpenAI API to generate the image
        const response = await this.client.images.generate(requestParams);

        // Get the image data from the response
        if (!response.data || response.data.length === 0) {
            throw new OpenAIResponseAdapterError('No image data received from OpenAI API');
        }

        // Handle image data based on response format
        let imageData: string;
        let dataSource: 'url' | 'base64' = 'base64';

        if (response.data[0].b64_json) {
            // Base64 data is available directly
            imageData = response.data[0].b64_json;
            dataSource = 'base64';
        } else if (response.data[0].url) {
            // URL data is available
            imageData = response.data[0].url;
            dataSource = 'url';
        } else {
            throw new OpenAIResponseAdapterError('No image data or URL received from OpenAI API');
        }

        const imageWidth = parseInt(size.split('x')[0]);
        const imageHeight = parseInt(size.split('x')[1]);

        // Create the response object
        const result: UniversalChatResponse = {
            content: null,
            role: 'assistant',
            image: {
                data: imageData,
                dataSource: dataSource,
                mime: 'image/png', // Default mime type
                width: imageWidth,
                height: imageHeight,
                operation: 'generate'
            },
            metadata: {
                created: Date.now(),
                model
            }
        };

        // If outputPath is provided, save the image to file
        if (params.outputPath) {
            try {
                // For URL responses, we'll need to handle downloading differently
                if (dataSource === 'url') {
                    log.debug(`Image URL received (${imageData.substring(0, 30)}...), saving to ${params.outputPath} not supported yet`);
                    if (!result.metadata) result.metadata = {};
                    result.metadata.imageSavedPath = params.outputPath;
                    result.metadata.imageUrl = imageData;
                    // TODO: Implement URL-to-file saving
                } else {
                    await saveBase64ToFile(imageData, params.outputPath, 'image/png');
                    // Ensure metadata exists before setting a property on it
                    if (!result.metadata) {
                        result.metadata = {};
                    }
                    result.metadata.imageSavedPath = params.outputPath;
                    log.debug(`Image saved to ${params.outputPath}`);
                }
            } catch (error) {
                log.error(`Failed to save image to ${params.outputPath}:`, error);
                // Don't fail the operation if saving fails
            }
        }

        return result;
    }

    /**
     * Edit an existing image using OpenAI's DALL-E model
     */
    private async editImage(model: string, params: ImageCallParams): Promise<UniversalChatResponse> {
        const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.editImage' });
        log.debug('Editing image with OpenAI');

        // Check if at least one image is provided 
        if (!params.files || params.files.length === 0) {
            throw new OpenAIResponseValidationError('Image edit operation requires at least one image file');
        }

        log.debug(`Editing image with ${params.files.length} image file(s)`);

        try {
            // Create base request parameters
            const requestParams: any = {
                model,
                prompt: params.prompt
            };

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

            // Add size parameter if specified
            if (params.options.size) {
                requestParams.size = params.options.size;
            }

            // Add quality parameter if specified
            if (params.options.quality) {
                requestParams.quality = params.options.quality;
            }

            // Add background parameter if provided
            if (params.options.background) {
                requestParams.background = params.options.background;
            }

            // Log request parameters for debugging
            log.debug('Image edit parameters:', {
                model: requestParams.model,
                prompt: requestParams.prompt,
                imageCount: params.files.length,
                hasOptions: !!params.options
            });

            // Call the OpenAI API to edit the image
            const response = await this.client.images.edit(requestParams);

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

            // Determine image dimensions from size or default to 1024x1024
            let size = params.options.size || '1024x1024';
            const imageWidth = parseInt(size.split('x')[0]);
            const imageHeight = parseInt(size.split('x')[1]);

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
                    operation: 'edit'
                },
                metadata: {
                    created: Date.now(),
                    model
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
    private async editImageWithMask(model: string, params: ImageCallParams): Promise<UniversalChatResponse> {
        const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.editImageWithMask' });
        log.debug('Editing image with mask using OpenAI');

        // Ensure we have the required files
        if (!params.files || params.files.length === 0) {
            throw new OpenAIResponseValidationError('Image edit-masked operation requires at least one image file');
        }
        if (!params.mask) {
            throw new OpenAIResponseValidationError('Image edit-masked operation requires a mask file');
        }

        try {
            // Create request parameters
            const requestParams: any = {
                model,
                prompt: params.prompt,
                image: await this.toOpenAIImageArg(params.files[0]),
                mask: await this.toOpenAIImageArg(params.mask)
            };

            // Add size parameter if specified
            if (params.options.size) {
                requestParams.size = params.options.size;
            }

            // Add quality parameter if specified
            if (params.options.quality) {
                requestParams.quality = params.options.quality;
            }

            // Add background parameter if provided
            if (params.options.background) {
                requestParams.background = params.options.background;
            }

            // Log request parameters for debugging (not including actual image/mask data)
            log.debug('Image edit with mask parameters:', {
                model: requestParams.model,
                prompt: requestParams.prompt,
                hasImage: !!requestParams.image,
                hasMask: !!requestParams.mask,
                options: params.options
            });

            // Call the OpenAI API to edit the image with mask
            const response = await this.client.images.edit(requestParams);

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

            // Determine image dimensions from size or default to 1024x1024
            let size = params.options.size || '1024x1024';
            const imageWidth = parseInt(size.split('x')[0]);
            const imageHeight = parseInt(size.split('x')[1]);

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
                    model
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
    private async generateVariation(model: string, params: ImageCallParams): Promise<UniversalChatResponse> {
        const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.generateVariation' });
        log.debug('Generating variations/composite with OpenAI');

        // Ensure we have the required files
        if (!params.files || params.files.length < 2) {
            throw new OpenAIResponseValidationError('Image composite operation requires at least two image files');
        }

        try {
            // Create request parameters
            const requestParams: any = {
                model,
                prompt: params.prompt,
                image: await Promise.all(params.files.map(file => this.toOpenAIImageArg(file)))
            };

            // Add size parameter if specified
            if (params.options.size) {
                requestParams.size = params.options.size;
            }

            // Add quality parameter if specified
            if (params.options.quality) {
                requestParams.quality = params.options.quality;
            }

            // Add background parameter if provided
            if (params.options.background) {
                requestParams.background = params.options.background;
            }

            // Log request parameters for debugging
            log.debug('Image composite parameters:', {
                model: requestParams.model,
                prompt: requestParams.prompt,
                imageCount: params.files.length,
                hasOptions: !!params.options
            });

            // Call the OpenAI API to create composite image
            const response = await this.client.images.edit(requestParams);

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

            // Determine image dimensions from size or default to 1024x1024
            let size = params.options.size || '1024x1024';
            const imageWidth = parseInt(size.split('x')[0]);
            const imageHeight = parseInt(size.split('x')[1]);

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
                    model
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
            log.error('Image composite operation failed:', error);
            throw new OpenAIResponseAdapterError(`Image composite operation failed: ${error.message || String(error)}`);
        }
    }

    /**
     * Convert various image source types to the format expected by OpenAI's Image API
     * @param src Source of the image data
     * @returns Promise resolving to a format appropriate for OpenAI Image API
     */
    private async toOpenAIImageArg(src: UrlSource | Base64Source | FilePathSource): Promise<any> {
        const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.toOpenAIImageArg' });

        try {
            if (src.kind === 'filePath') {
                // For file paths, use toFile with a readable stream
                log.debug(`Using file path: ${src.value}`);
                const stream = fs.createReadStream(src.value);
                return await toFile(stream, path.basename(src.value), {
                    type: 'image/png'
                });
            } else if (src.kind === 'base64') {
                // For base64 data, convert to Buffer and use toFile
                log.debug('Converting base64 to file object');
                // Remove potential data URL prefix
                const base64Data = src.value.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                return await toFile(buffer, 'image.png', {
                    type: 'image/png'
                });
            } else if (src.kind === 'url') {
                // For URLs, we need to fetch the content and convert to a file object
                log.debug(`Downloading from URL: ${src.value.substring(0, 30)}...`);
                try {
                    // Use node-fetch (which is packaged with the OpenAI SDK)
                    const { default: fetch } = await import('node-fetch');
                    const response = await fetch(src.value);

                    if (!response.ok) {
                        throw new Error(`Failed to fetch image from URL: ${response.status} ${response.statusText}`);
                    }

                    // Get the URL filename or use a default
                    const urlParts = src.value.split('/');
                    const filename = urlParts[urlParts.length - 1].split('?')[0] || 'image.png';

                    // Convert the response to a buffer
                    const buffer = await response.buffer();

                    // Use OpenAI's toFile utility
                    return await toFile(buffer, filename, {
                        type: 'image/png' // Assume PNG - could detect from content-type header
                    });
                } catch (error: any) {
                    log.error(`Failed to download image from URL: ${src.value}`, error);
                    throw new Error(`Failed to download image from URL: ${error.message}`);
                }
            }

            throw new Error(`Unsupported image source kind: ${(src as any).kind}`);
        } catch (error) {
            log.error('Failed to convert image source:', error);
            throw new OpenAIResponseValidationError(
                `Failed to convert image source: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
}