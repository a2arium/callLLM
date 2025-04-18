import { OpenAI } from 'openai';
import type { Stream } from 'openai/streaming';
import { BaseAdapter, AdapterConfig } from '../base/baseAdapter';
import { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse, FinishReason, ModelInfo } from '../../interfaces/UniversalInterfaces';
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

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Set debug level
const DEBUG_LEVEL = process.env.DEBUG_LEVEL || 'info'; // 'debug', 'info', 'error'

/**
 * OpenAI Response Adapter implementing the OpenAI /v1/responses API endpoint
 */
export class OpenAIResponseAdapter extends BaseAdapter {
    private client: OpenAI;
    private converter: Converter;
    private streamHandler: StreamHandler;
    private validator: Validator;
    private modelManager: ModelManager;
    private models: ModelInfo[] = defaultModels;

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

        // Register models with model manager
        for (const model of this.models) {
            this.modelManager.addModel(model);
        }

        this.streamHandler = new StreamHandler();
        this.validator = new Validator();
        (this.validator as any).modelManager = this.modelManager;
        this.converter = new Converter(this.modelManager);
        logger.setConfig({ level: process.env.LOG_LEVEL as any || 'info', prefix: 'OpenAIResponseAdapter' });
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
        const baseParams = this.converter.convertToOpenAIResponseParams(model, params);
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
        const baseParams = this.converter.convertToOpenAIResponseParams(model, params);
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
                this.streamHandler = new StreamHandler(params.tools);

                // Register tools for execution with the enhanced properties
                this.registerToolsForExecution(params.tools);
            } else {
                log.debug('Initializing StreamHandler without tools');
                this.streamHandler = new StreamHandler();
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
    convertToProviderParams(model: string, params: UniversalChatParams): ResponseCreateParamsNonStreaming {
        const baseParams = this.converter.convertToOpenAIResponseParams(model, params);
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
}