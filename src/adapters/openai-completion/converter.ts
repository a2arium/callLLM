import { UniversalChatParams, UniversalChatResponse, FinishReason, ModelInfo, UniversalStreamResponse, UniversalMessage } from '../../interfaces/UniversalInterfaces';
import { OpenAIModelParams, OpenAIResponse, OpenAIChatMessage, OpenAIUsage, OpenAIRole, OpenAIToolCall, OpenAIAssistantMessage } from './types';
import { ToolDefinition, ToolCall } from '../../types/tooling';
import { zodResponseFormat } from 'openai/helpers/zod';
import { ChatCompletionCreateParams, ChatCompletionMessageParam } from 'openai/resources/chat';
import { z } from 'zod';
import { OpenAIStreamResponse, OpenAIStreamDelta } from './types';
import { logger } from '../../utils/logger';

export class Converter {
    private currentModel?: ModelInfo;
    private currentParams?: UniversalChatParams;

    constructor() {
        logger.setConfig({ prefix: 'Converter', level: process.env.LOG_LEVEL as any || 'info' });
    }

    setModel(model: ModelInfo) {
        this.currentModel = model;
    }

    setParams(params: UniversalChatParams) {
        this.currentParams = params;
    }

    private getResponseFormat(params: UniversalChatParams): ChatCompletionCreateParams['response_format'] {
        if (params.jsonSchema) {
            const schema = params.jsonSchema.schema;

            // Handle Zod schema
            if (schema instanceof z.ZodObject) {
                // Use a default name if none provided
                const schemaName = params.jsonSchema.name || 'response';
                return zodResponseFormat(schema, schemaName);
            }

            // Handle JSON Schema string or object
            if (typeof schema === 'string' || (typeof schema === 'object' && schema !== null && !(schema instanceof Date))) {
                try {
                    const jsonSchema = typeof schema === 'string' ? JSON.parse(schema) : schema;
                    return {
                        type: 'json_schema',
                        json_schema: {
                            name: params.jsonSchema.name || 'response',
                            schema: jsonSchema
                        }
                    };
                } catch (error) {
                    throw new Error('Invalid JSON schema string');
                }
            }

            throw new Error('Invalid schema type provided');
        }

        // Default JSON format if requested
        if (params.responseFormat === 'json') {
            return { type: 'json_object' };
        }

        return undefined;
    }

    private convertMessages(messages: UniversalMessage[]): ChatCompletionMessageParam[] {
        if (!this.currentModel) {
            throw new Error('Model not set');
        }

        // TODO: set correctly for reasoning models - they don't support system messages
        const systemMessagesDisabled = false;

        return messages.map(msg => {
            let role = msg.role;

            // Convert system messages based on capabilities
            if (role === 'system' && systemMessagesDisabled) {
                role = 'user';
            }

            // Create message based on role
            const baseMessage = {
                content: msg.content || '',
                name: msg.name,
            };

            switch (role) {
                case 'system':
                    return { ...baseMessage, role: 'system' } as ChatCompletionMessageParam;
                case 'user':
                    return { ...baseMessage, role: 'user' } as ChatCompletionMessageParam;
                case 'assistant':
                    if (msg.toolCalls) {
                        return {
                            ...baseMessage,
                            role: 'assistant',
                            tool_calls: msg.toolCalls.map(call => {
                                if ('function' in call) {
                                    // Already in OpenAI format
                                    return call;
                                } else {
                                    // Convert our format to OpenAI format
                                    return {
                                        id: call.id,
                                        type: 'function' as const,
                                        function: {
                                            name: call.name,
                                            arguments: JSON.stringify(call.arguments)
                                        }
                                    };
                                }
                            })
                        } as ChatCompletionMessageParam;
                    }
                    return { ...baseMessage, role: 'assistant' } as ChatCompletionMessageParam;
                case 'function':
                    return { ...baseMessage, role: 'function', name: msg.name || 'function' } as ChatCompletionMessageParam;
                case 'tool':
                    return {
                        role: 'tool',
                        content: msg.content || '',
                        tool_call_id: msg.toolCallId || ''
                    } as ChatCompletionMessageParam;
                case 'developer':
                    return { ...baseMessage, role: 'user' } as ChatCompletionMessageParam; // OpenAI doesn't support developer role
                default:
                    return { ...baseMessage, role: 'user' } as ChatCompletionMessageParam;
            }
        });
    }

    private convertToolCalls(toolCalls?: OpenAIToolCall[]): UniversalChatResponse['toolCalls'] | undefined {
        if (!toolCalls?.length) return undefined;

        return toolCalls.map(call => ({
            id: call.id,
            name: call.function.name,
            arguments: JSON.parse(call.function.arguments)
        }));
    }

    convertToProviderParams(params: UniversalChatParams): Omit<OpenAIModelParams, 'model'> {
        this.currentParams = params;
        const messages = this.convertMessages(params.messages);
        const settings = params.settings || {};

        if (!this.currentModel) {
            throw new Error('Model not found');
        }

        // Handle capabilities with their new defaults
        const shouldStream = this.currentModel.capabilities?.streaming !== false && settings.stream === true;  // Only stream if explicitly requested
        // TODO: set correctly for reasoning models - they don't support temperature
        const shouldSetTemperature = true;  // default true
        const hasToolCalls = this.currentModel.capabilities?.toolCalls === true;  // default false
        const hasParallelToolCalls = this.currentModel.capabilities?.parallelToolCalls === true;  // default false
        const hasBatchProcessing = this.currentModel.capabilities?.batchProcessing === true;  // default false

        // Convert tool settings if tool calls are enabled
        const toolSettings = hasToolCalls ? {
            tools: params.tools?.map((tool: ToolDefinition) => ({
                type: 'function' as const,
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters
                }
            })),
            tool_choice: settings.toolChoice,
            // Only include tool_calls if parallel tool calls are supported
            ...(hasParallelToolCalls && settings.toolCalls && {
                tool_calls: settings.toolCalls.map((call) => ({
                    type: 'function' as const,
                    function: {
                        name: call.name,
                        arguments: JSON.stringify(call.arguments)
                    }
                }))
            })
        } : {};

        return {
            messages,
            temperature: shouldSetTemperature ? settings.temperature : undefined,
            top_p: settings.topP,
            n: hasBatchProcessing ? settings.n || 1 : 1,
            stream: shouldStream,
            stop: undefined,
            max_completion_tokens: settings.maxTokens,
            presence_penalty: settings.presencePenalty,
            frequency_penalty: settings.frequencyPenalty,
            response_format: this.getResponseFormat(params),
            ...toolSettings
        };
    }

    private extractMessageFromResponse(response: OpenAIResponse): OpenAIAssistantMessage {
        if (!response.choices || response.choices.length === 0 || !response.choices[0].message) {
            throw new Error('Invalid OpenAI response structure: missing choices or message');
        }
        const message = response.choices[0].message;

        return {
            ...message,
            content: message.content || '',
            tool_calls: message.tool_calls
        };
    }

    convertFromProviderResponse(response: OpenAIResponse): UniversalChatResponse {
        const message = this.extractMessageFromResponse(response);
        logger.debug('[Converter] Original message from LLM:', JSON.stringify(message, null, 2));

        // Convert role to UniversalMessage role type
        const role: UniversalMessage['role'] =
            message.role === 'assistant' ? 'assistant' :
                message.role === 'system' ? 'system' :
                    message.role === 'function' ? 'function' : 'user';

        // Handle tool calls in the response
        const toolCalls = this.convertToolCalls(message.tool_calls);
        const finishReason = this.mapFinishReason(response.choices[0].finish_reason);

        const normalResponse: UniversalChatResponse = {
            content: message.content || '',
            role,
            toolCalls,
            metadata: {
                model: response.model,
                created: response.created,
                finishReason,
                usage: this.convertUsage(response.usage)
            }
        };
        logger.debug('Regular response:', JSON.stringify(normalResponse, null, 2));
        return normalResponse;
    }

    private convertUsage(usage: OpenAIUsage) {
        if (!usage) {
            return undefined;
        }

        // Calculate the cached tokens value
        const cachedTokens = usage.prompt_tokens_details?.cached_tokens ?? 0;

        // Always return zero costs when no model info is available
        if (!this.currentModel) {
            return {
                tokens: {
                    input: usage.prompt_tokens,
                    inputCached: cachedTokens,
                    output: usage.completion_tokens,
                    total: usage.total_tokens
                },
                costs: {
                    input: 0,
                    inputCached: 0,
                    output: 0,
                    total: 0
                }
            };
        }

        // Calculate costs with model info
        const inputCost = Number(((usage.prompt_tokens / 1_000_000) * this.currentModel.inputPricePerMillion).toFixed(6));
        const outputCost = Number(((usage.completion_tokens / 1_000_000) * this.currentModel.outputPricePerMillion).toFixed(6));

        // Calculate cached costs if applicable
        const inputCachedCost = this.currentModel.inputCachedPricePerMillion
            ? Number(((cachedTokens / 1_000_000) * this.currentModel.inputCachedPricePerMillion).toFixed(6))
            : 0;

        const totalCost = Number((inputCost + inputCachedCost + outputCost).toFixed(6));

        return {
            tokens: {
                input: usage.prompt_tokens,
                inputCached: cachedTokens,
                output: usage.completion_tokens,
                total: usage.total_tokens
            },
            costs: {
                input: inputCost,
                inputCached: inputCachedCost,
                output: outputCost,
                total: totalCost
            }
        };
    }

    public mapFinishReason(reason: string | null): FinishReason {
        if (!reason) return FinishReason.NULL;
        switch (reason) {
            case 'stop': return FinishReason.STOP;
            case 'length': return FinishReason.LENGTH;
            case 'content_filter': return FinishReason.CONTENT_FILTER;
            case 'tool_calls': return FinishReason.TOOL_CALLS;
            default: return FinishReason.NULL;
        }
    }

    private convertStreamDelta(delta: OpenAIStreamDelta, toolCallArguments: Map<string, string>, lastToolCalls: Map<string, { id: string; name: string; arguments: string }>, finish_reason: string | null): UniversalStreamResponse {
        const streamResponse: UniversalStreamResponse = {
            role: delta.role ?? 'assistant',
            content: delta.content ?? '',
            isComplete: false,
            metadata: {
                finishReason: finish_reason ? this.mapFinishReason(finish_reason) : undefined
            }
        };

        // If this is the final chunk with a finish reason, include all accumulated tool calls
        if (finish_reason) {
            const toolCalls = Array.from(lastToolCalls.values()).map(lastToolCall => {
                const toolCall: ToolCall = {
                    id: lastToolCall.id,
                    name: lastToolCall.name,
                    arguments: {}
                };

                // Try to parse the accumulated arguments
                const accumulatedArgs = toolCallArguments.get(lastToolCall.id) ?? '{}';
                try {
                    toolCall.arguments = JSON.parse(accumulatedArgs);
                } catch {
                    toolCall.arguments = {};
                }

                return toolCall;
            });

            if (toolCalls.length > 0) {
                streamResponse.toolCalls = toolCalls;
            }
            return streamResponse;
        }

        if (delta.tool_calls) {
            const toolCalls = delta.tool_calls.map((call) => {
                const id = call.id;
                const name = call.function?.name;
                const args = call.function?.arguments ?? '';

                // Store the tool call info for later use
                if (name) {
                    lastToolCalls.set(id, {
                        id,
                        name,
                        arguments: args
                    });
                }

                // Accumulate arguments
                if (args) {
                    const existingArgs = toolCallArguments.get(id) ?? '';
                    const newArgs = existingArgs + args;
                    toolCallArguments.set(id, newArgs);
                }

                const lastToolCall = lastToolCalls.get(id);
                if (!lastToolCall?.name) {
                    return null;
                }

                // For non-final chunks, only include the tool call without arguments
                const toolCall: ToolCall = {
                    id: lastToolCall.id,
                    name: lastToolCall.name,
                    arguments: {}
                };
                return toolCall;
            }).filter((call): call is ToolCall => call !== null);

            if (toolCalls.length > 0) {
                streamResponse.toolCalls = toolCalls;
            }
        }

        return streamResponse;
    }

    public async *convertStreamResponse(stream: AsyncIterable<OpenAIStreamResponse>, params: UniversalChatParams): AsyncGenerator<UniversalStreamResponse> {
        this.setParams(params);
        const toolCallArguments = new Map<string, string>();
        const lastToolCalls = new Map<string, { id: string; name: string; arguments: string }>();

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            const finish_reason = chunk.choices[0]?.finish_reason;
            if (!delta) continue;

            yield this.convertStreamDelta(delta, toolCallArguments, lastToolCalls, finish_reason);
        }
    }

    public getCurrentParams(): UniversalChatParams | undefined {
        return this.currentParams;
    }

    public clearModel() {
        this.currentModel = undefined;
    }
}
