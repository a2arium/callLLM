import { UniversalChatParams, UniversalChatResponse, FinishReason, ModelInfo, UniversalStreamResponse, UniversalMessage } from '../../interfaces/UniversalInterfaces';
import { OpenAIModelParams, OpenAIResponse, OpenAIChatMessage, OpenAIUsage, OpenAIRole, OpenAIToolCall } from './types';
import { ToolDefinition } from '../../core/types';
import { zodResponseFormat } from 'openai/helpers/zod';
import { ChatCompletionCreateParams, ChatCompletionMessageParam } from 'openai/resources/chat';
import { z } from 'zod';
import { OpenAIStreamResponse } from './types';

export class Converter {
    private currentModel?: ModelInfo;
    private currentParams?: UniversalChatParams;

    setModel(model: ModelInfo) {
        this.currentModel = model;
    }

    setParams(params: UniversalChatParams) {
        this.currentParams = params;
    }

    private getResponseFormat(settings: UniversalChatParams['settings']): ChatCompletionCreateParams['response_format'] {
        if (settings?.jsonSchema) {
            const schema = settings.jsonSchema.schema;

            // Handle Zod schema
            if (schema instanceof z.ZodObject) {
                // Use a default name if none provided
                const schemaName = settings.jsonSchema.name || 'response';
                return zodResponseFormat(schema, schemaName);
            }

            // Handle JSON Schema string or object
            if (typeof schema === 'string' || (typeof schema === 'object' && schema !== null && !(schema instanceof Date))) {
                try {
                    const jsonSchema = typeof schema === 'string' ? JSON.parse(schema) : schema;
                    return {
                        type: 'json_schema',
                        json_schema: {
                            name: settings.jsonSchema.name || 'response',
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
        if (settings?.responseFormat === 'json') {
            return { type: 'json_object' };
        }

        return undefined;
    }

    private convertMessages(messages: UniversalMessage[]): ChatCompletionMessageParam[] {
        if (!this.currentModel) {
            throw new Error('Model not set');
        }

        const systemMessagesDisabled = this.currentModel.capabilities?.systemMessages === false;

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
                refusal: null
            };

            switch (role) {
                case 'system':
                    return { ...baseMessage, role: 'system' } as const;
                case 'user':
                    return { ...baseMessage, role: 'user' } as const;
                case 'assistant':
                    return { ...baseMessage, role: 'assistant' } as const;
                case 'function':
                    return { ...baseMessage, role: 'function', name: msg.name || 'function' } as const;
                case 'tool':
                    // Skip tool messages for now as they require tool_call_id which we don't have
                    return { ...baseMessage, role: 'user' } as const;
                case 'developer':
                    return { ...baseMessage, role: 'developer' } as const;
                default:
                    return { ...baseMessage, role: 'user' } as const;
            }
        });
    }

    private convertToolCalls(toolCalls?: OpenAIToolCall[]): Array<{
        id?: string;
        name: string;
        arguments: Record<string, unknown>;
    }> | undefined {
        if (!toolCalls?.length) {
            return undefined;
        }

        try {
            return toolCalls.map(call => ({
                id: call.id,
                name: call.function.name,
                arguments: JSON.parse(call.function.arguments)
            }));
        } catch (error) {
            throw new Error(`Failed to parse tool call arguments: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private convertToolCallDeltas(toolCalls?: Partial<OpenAIToolCall>[]): Array<{
        id?: string;
        index: number;
        name?: string;
        arguments?: string | Record<string, unknown>;
    }> | undefined {
        if (!toolCalls?.length) {
            return undefined;
        }
        // console.log('toolCalls for openai converter', toolCalls);

        return toolCalls.map((call, index) => ({
            index,
            ...(call.id && { id: call.id }),
            ...(call.function?.name && { name: call.function.name }),
            ...(call.function?.arguments && { arguments: call.function.arguments })
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
        const shouldSetTemperature = this.currentModel.capabilities?.temperature !== false;  // default true
        const hasToolCalls = this.currentModel.capabilities?.toolCalls === true;  // default false
        const hasParallelToolCalls = this.currentModel.capabilities?.parallelToolCalls === true;  // default false
        const hasBatchProcessing = this.currentModel.capabilities?.batchProcessing === true;  // default false

        // Convert tool settings if tool calls are enabled
        const toolSettings = hasToolCalls ? {
            tools: settings.tools?.map((tool: ToolDefinition) => ({
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
                tool_calls: settings.toolCalls
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
            response_format: this.getResponseFormat(settings),
            ...toolSettings
        };
    }

    private extractMessageFromResponse(response: OpenAIResponse): UniversalMessage {
        if (!response.choices || response.choices.length === 0 || !response.choices[0].message) {
            throw new Error('Invalid OpenAI response structure: missing choices or message');
        }
        return response.choices[0].message as unknown as UniversalMessage;
    }

    convertFromProviderResponse(response: OpenAIResponse): UniversalChatResponse {
        const message = this.extractMessageFromResponse(response);
        console.log('[Converter] Original message from LLM:', JSON.stringify(message, null, 2));

        if (message.type === 'function' && message.content) {
            // Keep the original function call message exactly as received
            const originalMessage = { ...message };
            // Get the result content before we clear it from original message
            const resultContent = originalMessage.content;
            // Clear content from original message as it should only contain function call details
            originalMessage.content = '';

            const toolResponse: UniversalChatResponse = {
                content: resultContent,
                role: 'tool' as const,
                messages: [
                    originalMessage,
                    {
                        role: 'tool' as const,
                        tool_call_id: originalMessage.id,
                        content: resultContent
                    }
                ]
            };
            console.log('[Converter] Preparing tool result response:', JSON.stringify(toolResponse, null, 2));
            return toolResponse;
        }

        const normalResponse: UniversalChatResponse = {
            content: message.content || '',
            role: message.role
        };
        console.log('[Converter] Regular message response:', JSON.stringify(normalResponse, null, 2));
        return normalResponse;
    }

    private convertUsage(usage: OpenAIUsage) {
        if (!usage) {
            return undefined;
        }

        const result = {
            inputTokens: usage.prompt_tokens,
            outputTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
            ...(usage.prompt_tokens_details?.cached_tokens !== undefined && {
                inputCachedTokens: usage.prompt_tokens_details.cached_tokens
            })
        };

        // Always return zero costs when no model info is available
        if (!this.currentModel) {
            return {
                ...result,
                costs: {
                    inputCost: 0,
                    outputCost: 0,
                    totalCost: 0
                }
            };
        }

        // Calculate costs with model info
        const inputCost = Number(((usage.prompt_tokens / 1_000_000) * this.currentModel.inputPricePerMillion).toFixed(6));
        const outputCost = Number(((usage.completion_tokens / 1_000_000) * this.currentModel.outputPricePerMillion).toFixed(6));
        const totalCost = Number((inputCost + outputCost).toFixed(6));

        return {
            ...result,
            costs: {
                inputCost,
                outputCost,
                totalCost
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

    async *convertStreamResponse(stream: AsyncIterable<OpenAIStreamResponse>, params: UniversalChatParams): AsyncIterable<UniversalStreamResponse> {
        for await (const chunk of stream) {
            const message = this.convertStreamChunk(chunk);
            console.log('[Converter] Stream chunk message:', JSON.stringify(message, null, 2));

            if (message.type === 'function' && message.content) {
                // Keep the original function call message exactly as received
                const originalMessage = { ...message };
                // Get the result content before we clear it from original message
                const resultContent = originalMessage.content;
                // Clear content from original message as it should only contain function call details
                originalMessage.content = '';

                const streamToolResponse: UniversalStreamResponse = {
                    content: resultContent,
                    role: 'tool' as const,
                    isComplete: false,
                    messages: [
                        originalMessage,
                        {
                            role: 'tool' as const,
                            tool_call_id: originalMessage.id,
                            content: resultContent
                        }
                    ]
                };
                console.log('[Converter] Preparing stream tool result response:', JSON.stringify(streamToolResponse, null, 2));
                yield streamToolResponse;
            } else {
                const streamResponse: UniversalStreamResponse = {
                    content: message.content || '',
                    role: message.role,
                    isComplete: false
                };
                console.log('[Converter] Regular stream response:', JSON.stringify(streamResponse, null, 2));
                yield streamResponse;
            }
        }
    }

    private convertStreamChunk(chunk: OpenAIStreamResponse): UniversalMessage {
        if (!chunk.choices || chunk.choices.length === 0) {
            throw new Error('Invalid stream chunk: missing choices');
        }
        const delta = chunk.choices[0].delta;
        if (!delta) {
            throw new Error('Invalid stream chunk: missing delta');
        }
        return delta as unknown as UniversalMessage;
    }

    public getCurrentParams(): UniversalChatParams | undefined {
        return this.currentParams;
    }

    public clearModel() {
        this.currentModel = undefined;
    }
}

// New extended type definitions for the converter output

type ExtendedUniversalChatMessage = {
    id: string;
    type: string;
    role: string;
    content?: string;
    function?: {
        name: string;
        arguments: string;
    };
    tool_call_id?: string;
    // ... other possible fields ...
};

type ExtendedUniversalChatResponse = {
    messages: ExtendedUniversalChatMessage[];
};

type ExtendedUniversalStreamResponse = {
    messages: ExtendedUniversalChatMessage[];
};

// The following types (OpenAIResponse, OpenAIStreamResponse, UniversalChatParams) are assumed
// to be imported from the respective modules, so we do not redeclare them here. 