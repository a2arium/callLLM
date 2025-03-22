import { OpenAI } from 'openai';
import { BaseAdapter, AdapterConfig } from '../base/baseAdapter';
import { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse, FinishReason, ModelInfo } from '../../interfaces/UniversalInterfaces';
import { LLMProvider } from '../../interfaces/LLMProvider';
import { Converter } from './converter';
import { StreamHandler } from './stream';
import { Validator } from './validator';
import { OpenAIResponse, OpenAIStreamResponse, OpenAIModelParams } from './types';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { defaultModels } from './models';
import { ChatCompletionChunk, ChatCompletionMessage, ChatCompletionMessageToolCall } from 'openai/resources/chat';
import { Stream } from 'openai/streaming';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

type ToolCallFunction = { name: string; arguments: string };
type ValidToolCall = { function: ToolCallFunction; type: 'function'; id: string };

type StreamDelta = Partial<ChatCompletionMessage> & {
    finish_reason?: string | null;
    created?: number;
    model?: string;
    function_call?: ToolCallFunction;
    tool_calls?: Array<ChatCompletionMessageToolCall>;
};

export class OpenAIAdapter extends BaseAdapter implements LLMProvider {
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
        this.streamHandler = new StreamHandler(this.converter);
        this.validator = new Validator();
        this.models = new Map(defaultModels.map(model => [model.name, model]));
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

    private isValidToolCallFunction(func: unknown): func is ToolCallFunction {
        return !!func &&
            typeof func === 'object' &&
            'name' in func &&
            'arguments' in func &&
            typeof (func as any).name === 'string' &&
            typeof (func as any).arguments === 'string';
    }

    private processToolCalls(delta: StreamDelta): { id?: string; name: string; arguments: Record<string, unknown>; }[] | undefined {
        if (!delta.tool_calls?.length && !delta.function_call) {
            return undefined;
        }

        if (delta.tool_calls?.length) {
            const validCalls = delta.tool_calls
                .filter((call): call is ChatCompletionMessageToolCall =>
                    call.type === 'function' &&
                    !!call.function &&
                    this.isValidToolCallFunction(call.function)
                )
                .map(call => ({
                    id: call.id,
                    name: call.function.name,
                    arguments: JSON.parse(call.function.arguments)
                }));
            return validCalls.length > 0 ? validCalls : undefined;
        }

        if (delta.function_call && this.isValidToolCallFunction(delta.function_call)) {
            // For function calls, generate a unique ID if one doesn't exist
            const id = `call_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            return [{
                id,
                name: delta.function_call.name,
                arguments: JSON.parse(delta.function_call.arguments)
            }];
        }

        return undefined;
    }

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
            const openAIParams = this.convertToProviderParams(model, {
                ...params,
                settings: {
                    ...params.settings,
                    stream: false,
                    tools: params.settings?.tools,
                    toolChoice: params.settings?.toolChoice,
                    toolCalls: params.settings?.toolCalls
                }
            }) as OpenAIModelParams;
            // console.log('openAIParams', JSON.stringify(openAIParams, null, 2));
            const response = await this.client.chat.completions.create(openAIParams);
            const convResponse = this.converter.convertFromProviderResponse(response as unknown as OpenAIResponse);
            // Response now directly contains content, role and toolCalls if present
            return convResponse;
        } catch (error) {
            if (error instanceof Error && error.message === 'Model not set') {
                throw new Error('Model not found');
            }
            throw error;
        }
    }

    async streamCall(model: string, params: UniversalChatParams): Promise<AsyncIterable<UniversalStreamResponse>> {
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
        const openAIParams = this.convertToProviderParams(model, {
            ...params,
            settings: {
                ...params.settings,
                stream: true,
                tools: params.settings?.tools,
                toolChoice: params.settings?.toolChoice,
                toolCalls: params.settings?.toolCalls
            }
        }) as OpenAIModelParams;

        const stream = await this.client.chat.completions.create({ ...openAIParams, stream: true }) as Stream<ChatCompletionChunk>;

        const self = this;
        async function* transformStream(stream: Stream<ChatCompletionChunk>): AsyncIterable<UniversalStreamResponse> {
            let seenToolCallIds = new Set<string>();

            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta as StreamDelta;
                if (!delta) continue;

                // Handle function calls
                if (delta.function_call || delta.tool_calls) {
                    const toolCalls = self.processToolCalls(delta);
                    if (toolCalls) {
                        // Filter to only new tool calls
                        const newToolCalls = toolCalls.filter(call => {
                            if (!call.id) return true; // Consider calls without IDs as new
                            const isNew = !seenToolCallIds.has(call.id);
                            if (isNew && call.id) seenToolCallIds.add(call.id);
                            return isNew;
                        });

                        // Only yield if we have new tool calls
                        if (newToolCalls.length > 0) {
                            const response: UniversalStreamResponse = {
                                content: '',
                                role: 'assistant',
                                isComplete: false,
                                toolCalls: newToolCalls,
                                metadata: {
                                    finishReason: self.mapFinishReason(delta.finish_reason || null),
                                    created: delta.created,
                                    model: delta.model
                                }
                            };
                            yield response;
                            continue;
                        }
                    }
                }

                // Handle regular content
                const response: UniversalStreamResponse = {
                    content: delta.content || '',
                    role: delta.role || 'assistant',
                    isComplete: chunk.choices[0]?.finish_reason !== null,
                    metadata: {
                        finishReason: self.mapFinishReason(chunk.choices[0]?.finish_reason)
                    }
                };
                yield response;
            }
        }

        return transformStream(stream);
    }

    convertToProviderParams(model: string, params: UniversalChatParams): OpenAIModelParams {
        const openAIParams = this.converter.convertToProviderParams(params);
        return { ...openAIParams, model } as OpenAIModelParams;
    }

    convertFromProviderResponse(response: unknown): UniversalChatResponse {
        // Response now directly contains content, role and toolCalls if present
        return this.converter.convertFromProviderResponse(response as OpenAIResponse);
    }

    convertFromProviderStreamResponse(chunk: unknown): UniversalStreamResponse {
        if (!chunk || typeof chunk !== 'object') {
            throw new Error('Invalid chunk format');
        }

        const typedChunk = chunk as ChatCompletionChunk;
        const delta = typedChunk.choices[0]?.delta as StreamDelta;

        if (!delta) {
            throw new Error('No delta in chunk');
        }

        const toolCalls = this.processToolCalls(delta);
        const response: UniversalStreamResponse = {
            content: delta.content || '',
            role: delta.role || 'assistant',
            isComplete: true,
            toolCalls: toolCalls,
            metadata: {
                finishReason: this.mapFinishReason(delta.finish_reason || null),
                created: delta.created,
                model: delta.model
            }
        };
        return response;
    }

    // For testing purposes only
    setModelForTesting(name: string, model: ModelInfo): void {
        if (process.env.NODE_ENV !== 'test') {
            throw new Error('This method is only available in test environment');
        }
        this.models.set(name, model);
    }
} 