import { OpenAI } from 'openai';
import { BaseAdapter, AdapterConfig } from '../base/baseAdapter';
import { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse, FinishReason, ModelInfo } from '../../interfaces/UniversalInterfaces';
import { LLMProvider } from '../../interfaces/LLMProvider';
import { Converter } from './converter';
import { StreamHandler } from './stream';
import { Validator } from './validator';
import { OpenAIResponse, OpenAIModelParams } from './types';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { defaultModels } from './models';
import { ChatCompletionChunk, ChatCompletionMessage, ChatCompletionMessageToolCall } from 'openai/resources/chat';
import { Stream } from 'openai/streaming';
import type { ProviderAdapter, ProviderSpecificParams, ProviderSpecificResponse, ProviderSpecificStream } from '../types';
import type { StreamChunk } from '../../core/streaming/types';
import { logger } from '../../utils/logger';
import type { ToolCall } from '../../types/tooling';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

type ToolCallFunction = { name: string; arguments: string };
type ValidToolCall = { function: ToolCallFunction; type: 'function'; id: string };

type StreamDelta = Partial<ChatCompletionMessage> & {
    finish_reason?: string | null;
    created?: number;
    model?: string;
    tool_calls?: Array<ChatCompletionMessageToolCall>;
};

/**
 * OpenAI Adapter implementing both LLMProvider and ProviderAdapter interfaces.
 * 
 * This adapter is responsible for converting between OpenAI-specific formats
 * and our universal formats. According to Phase 4 refactoring, it focuses on 
 * format conversion with business logic moved to core components.
 */
export class OpenAIAdapter extends BaseAdapter implements LLMProvider, ProviderAdapter {
    private client: OpenAI;
    private converter: Converter;
    private streamHandler: StreamHandler;
    private validator: Validator;
    private models: Map<string, ModelInfo>;

    constructor(config?: Partial<AdapterConfig>) {
        const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OpenAI API key is required. Please provide it in the config or set OPENAI_API_KEY environment variable.');
        }

        super({
            apiKey,
            organization: config?.organization || process.env.OPENAI_ORGANIZATION,
            baseUrl: config?.baseUrl || process.env.OPENAI_API_BASE
        });

        this.client = new OpenAI({
            apiKey: this.config.apiKey,
            organization: this.config.organization,
            baseURL: this.config.baseUrl,
        });
        this.converter = new Converter();
        this.streamHandler = new StreamHandler();
        this.validator = new Validator();
        this.models = new Map(defaultModels.map(model => [model.name, model]));
        logger.setConfig({ level: process.env.LOG_LEVEL as any || 'info', prefix: 'OpenAIAdapter' });
    }

    private mapFinishReason(reason: string | null): FinishReason {
        if (!reason) return FinishReason.NULL;
        switch (reason) {
            case 'stop': return FinishReason.STOP;
            case 'length': return FinishReason.LENGTH;
            case 'content_filter': return FinishReason.CONTENT_FILTER;
            case 'tool_calls': return FinishReason.TOOL_CALLS;
            case 'function_call': return FinishReason.TOOL_CALLS;
            default: return FinishReason.NULL;
        }
    }

    // private isValidToolCallFunction(func: unknown): func is ToolCallFunction {
    //     return !!func &&
    //         typeof func === 'object' &&
    //         'name' in func &&
    //         'arguments' in func &&
    //         typeof (func as any).name === 'string' &&
    //         typeof (func as any).arguments === 'string';
    // }

    // private processToolCalls(delta: StreamDelta): { id?: string; name: string; argumentsChunk: string; }[] | undefined {
    //     if (!delta.tool_calls?.length) {
    //         return undefined;
    //     }

    //     if (delta.tool_calls?.length) {
    //         const validCalls = delta.tool_calls
    //             .filter((call): call is ChatCompletionMessageToolCall =>
    //                 call.type === 'function' &&
    //                 !!call.function &&
    //                 this.isValidToolCallFunction(call.function)
    //             )
    //             .map(call => ({
    //                 id: call.id,
    //                 name: call.function.name,
    //                 argumentsChunk: call.function.arguments,
    //                 // arguments: JSON.parse(call.function.arguments)
    //             }));
    //         return validCalls.length > 0 ? validCalls : undefined;
    //     }

    //     return undefined;
    // }

    async chatCall(model: string, params: UniversalChatParams): Promise<UniversalChatResponse> {
        try {
            this.validator.validateParams(params);
            const modelInfo = this.models.get(model);
            if (modelInfo) {
                this.converter.setModel(modelInfo);
                // Validate tool calling capabilities
                if (params.settings?.tools && !modelInfo.capabilities?.toolCalls) {
                    throw new Error('Model does not support tool calls');
                }
                if (params.settings?.toolCalls && !modelInfo.capabilities?.parallelToolCalls) {
                    throw new Error('Model does not support parallel tool calls');
                }
            }
            this.converter.setParams(params);
            const openAIParams = this.convertToProviderParams({
                ...params,
                settings: {
                    ...params.settings,
                    model,
                    stream: false,
                    tools: params.settings?.tools,
                    toolChoice: params.settings?.toolChoice,
                    toolCalls: params.settings?.toolCalls
                }
            });

            // Use as unknown to first erase the type, then cast to ProviderSpecificResponse
            const response = await this.client.chat.completions.create(openAIParams as any) as unknown as ProviderSpecificResponse;
            return this.convertFromProviderResponse(response);
        } catch (error) {
            if (error instanceof Error && error.message === 'Model not set') {
                throw new Error('Model not found');
            }
            throw this.mapProviderError(error);
        }
    }

    async streamCall(model: string, params: UniversalChatParams): Promise<AsyncIterable<UniversalStreamResponse>> {
        try {
            this.validator.validateParams(params);
            const modelInfo = this.models.get(model);
            if (modelInfo) {
                this.converter.setModel(modelInfo);
                // Validate tool calling capabilities
                if (params.settings?.tools && !modelInfo.capabilities?.toolCalls) {
                    throw new Error('Model does not support tool calls');
                }
                if (params.settings?.toolCalls && !modelInfo.capabilities?.parallelToolCalls) {
                    throw new Error('Model does not support parallel tool calls');
                }
            }
            this.converter.setParams(params);
            const openAIParams = this.convertToProviderParams({
                ...params,
                settings: {
                    ...params.settings,
                    model,
                    stream: true,
                    tools: params.settings?.tools,
                    toolChoice: params.settings?.toolChoice,
                    toolCalls: params.settings?.toolCalls
                }
            });

            const stream = await this.client.chat.completions.create({ ...openAIParams as any, stream: true }) as unknown as Stream<ChatCompletionChunk>;

            // Convert provider stream to StreamChunk format
            const streamChunks = this.convertProviderStream(stream);

            return streamChunks;
            // Convert StreamChunk to UniversalStreamResponse (add metadata)
            // return this.convertStreamChunksToUniversalResponse(streamChunks);
        } catch (error) {
            throw this.mapProviderError(error);
        }
    }

    // Implementations for BaseAdapter interface
    // This method is kept for backward compatibility with BaseAdapter
    convertToProviderParams(model: string, params: UniversalChatParams): unknown;
    // This method is for the ProviderAdapter interface
    convertToProviderParams<T extends ProviderSpecificParams = Record<string, unknown>>(params: UniversalChatParams): T;
    // Implementation that handles both signatures
    convertToProviderParams<T extends ProviderSpecificParams = Record<string, unknown>>(
        modelOrParams: string | UniversalChatParams,
        params?: UniversalChatParams
    ): T {
        const log = logger.createLogger({ prefix: 'OpenAIAdapter.convertToProviderParams' });
        log.debug('Converting to provider params:', modelOrParams, params);
        // Handle different method signatures
        let model: string | undefined;
        let actualParams: UniversalChatParams;

        if (typeof modelOrParams === 'string') {
            model = modelOrParams;
            actualParams = params as UniversalChatParams;
        } else {
            model = undefined;
            actualParams = modelOrParams;
        }

        const openAIParams: Record<string, unknown> = {
            messages: actualParams.messages.map(msg => {
                // Base message properties
                const openAIMsg: Record<string, unknown> = {
                    role: msg.role,
                    content: msg.content || ''
                };

                // Handle tool calls (for function calling)
                if (msg.toolCalls && msg.toolCalls.length > 0) {
                    openAIMsg.tool_calls = msg.toolCalls.map(call => ({
                        id: call.id,
                        type: 'function',
                        function: {
                            name: call.name,
                            arguments: JSON.stringify(call.arguments || {})
                        }
                    }));
                }

                // Handle tool responses
                if (msg.toolCallId) {
                    openAIMsg.tool_call_id = msg.toolCallId;
                }

                return openAIMsg;
            }),
            model: model || actualParams.settings?.model || '',
            stream: actualParams.settings?.stream || false
        };

        // Handle additional settings
        if (actualParams.settings) {
            // Temperature
            if (actualParams.settings.temperature !== undefined) {
                openAIParams.temperature = actualParams.settings.temperature;
            }

            // Max tokens
            if (actualParams.settings.maxTokens !== undefined) {
                openAIParams.max_tokens = actualParams.settings.maxTokens;
            }

            // Tools
            if (actualParams.settings.tools && actualParams.settings.tools.length > 0) {
                openAIParams.tools = actualParams.settings.tools.map((tool: any) => ({
                    type: 'function',
                    function: {
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.parameters
                    }
                }));
            }

            // Tool choice
            if (actualParams.settings.toolChoice) {
                if (actualParams.settings.toolChoice === 'auto') {
                    openAIParams.tool_choice = 'auto';
                } else if (actualParams.settings.toolChoice === 'none') {
                    openAIParams.tool_choice = 'none';
                } else if (typeof actualParams.settings.toolChoice === 'object') {
                    openAIParams.tool_choice = {
                        type: 'function',
                        function: {
                            name: actualParams.settings.toolChoice.name
                        }
                    };
                }
            }
        }

        return openAIParams as T;
    }

    /**
     * Converts an OpenAI-specific response to universal format
     */
    convertFromProviderResponse<T extends ProviderSpecificResponse = Record<string, unknown>>(
        response: T
    ): UniversalChatResponse {
        // Cast the response to any to bypass type checking
        // This is necessary because OpenAI's response type doesn't match our ProviderSpecificResponse type
        const typedResponse = response as any;

        // Basic response structure
        const universalResponse: UniversalChatResponse = {
            role: 'assistant',
            content: '',
            metadata: {}
        };

        // Extract content from the first choice
        if (typedResponse.choices && typedResponse.choices.length > 0) {
            const choice = typedResponse.choices[0];

            if (choice.message) {
                universalResponse.content = choice.message.content || '';

                // Extract tool calls if present
                if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
                    universalResponse.toolCalls = choice.message.tool_calls.map((call: any) => ({
                        id: call.id,
                        name: call.function.name,
                        arguments: JSON.parse(call.function.arguments)
                    }));
                }
            }

            // Add finish reason to metadata
            if (choice.finish_reason && universalResponse.metadata) {
                universalResponse.metadata.finishReason = this.mapFinishReason(choice.finish_reason);
            }
        }

        // Add model info to metadata
        if (typedResponse.model && universalResponse.metadata) {
            universalResponse.metadata.model = typedResponse.model;
        }

        // Add usage info if available
        if (typedResponse.usage && universalResponse.metadata) {
            universalResponse.metadata.usage = {
                inputTokens: typedResponse.usage.prompt_tokens,
                outputTokens: typedResponse.usage.completion_tokens,
                totalTokens: typedResponse.usage.total_tokens,
                costs: {
                    inputCost: 0, // Calculate these based on model pricing
                    outputCost: 0,
                    totalCost: 0
                }
            };
        }

        return universalResponse;
    }

    convertFromProviderStreamResponse(chunk: unknown): UniversalStreamResponse {
        const log = logger.createLogger({ prefix: 'OpenAIAdapter.convertFromProviderStreamResponse' });
        log.debug('Chunk:', chunk);
        return chunk as UniversalStreamResponse;
    }

    /**
     * Converts from provider stream response to a universal stream response format
     * Required by BaseAdapter
     */
    // convertFromProviderStreamResponse(chunk: unknown): UniversalStreamResponse {
    //     if (!chunk || typeof chunk !== 'object') {
    //         throw new Error('Invalid chunk format');
    //     }

    //     const typedChunk = chunk as ChatCompletionChunk;
    //     const delta = typedChunk.choices[0]?.delta as StreamDelta;

    //     if (!delta) {
    //         throw new Error('No delta in chunk');
    //     }

    //     // const toolCallDeltas = this.processToolCalls(delta);
    //     const response: UniversalStreamResponse = {
    //         content: delta.content || '',
    //         role: delta.role || 'assistant',
    //         isComplete: typedChunk.choices[0]?.finish_reason !== null,
    //         // toolCallDeltas,
    //         metadata: {
    //             finishReason: this.mapFinishReason(typedChunk.choices[0]?.finish_reason),
    //             created: delta.created,
    //             model: delta.model
    //         }
    //     };
    //     return response;
    // }

    /**
     * Converts an OpenAI-specific stream to universal format
     */
    convertProviderStream<T extends ProviderSpecificStream>(
        stream: T
    ): AsyncIterable<UniversalStreamResponse> {
        return this.streamHandler.convertProviderStream(stream as any);
    }

    /**
     * Converts StreamChunk objects to UniversalStreamResponse objects
     * This helper method bridges the gap between our internal StreamChunk format
     * and the UniversalStreamResponse format expected by LLMProvider
     */
    // private async *convertStreamChunksToUniversalResponse(
    //     streamChunks: AsyncIterable<StreamChunk>
    // ): AsyncIterable<UniversalStreamResponse> {
    //     const log = logger.createLogger({ prefix: 'OpenAIAdapter.convertStreamChunksToUniversalResponse' });

    //     for await (const chunk of streamChunks) {
    //         log.debug('Chunk:', chunk);
    //         const universalChunk: UniversalStreamResponse = {
    //             content: chunk.content || '',
    //             role: 'assistant',
    //             isComplete: chunk.isComplete ?? false,
    //             metadata: chunk.metadata as any
    //         };

    //         // Include tool calls if present
    //         if (chunk.toolCalls && chunk.toolCalls.length > 0) {
    //             universalChunk.toolCalls = chunk.toolCalls.map(call => ({
    //                 name: call.name,
    //                 arguments: call.parameters || {}
    //             }));
    //         }

    //         yield universalChunk;
    //     }
    // }

    /**
     * Maps an OpenAI-specific error to a universal error format
     */
    mapProviderError(error: unknown): Error {
        if (error instanceof Error) {
            // Extract OpenAI error details if available
            const openAIError = error as any;
            if (openAIError.response && openAIError.response.data) {
                const errorData = openAIError.response.data;
                return new Error(`OpenAI Error (${errorData.error?.type}): ${errorData.error?.message}`);
            }
            return error;
        }
        return new Error(String(error));
    }

    // For testing purposes only
    setModelForTesting(name: string, model: ModelInfo): void {
        if (process.env.NODE_ENV !== 'test') {
            throw new Error('This method is only available in test environment');
        }
        this.models.set(name, model);
    }
} 