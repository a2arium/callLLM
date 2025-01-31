import { UniversalChatParams, UniversalChatResponse, FinishReason, ModelInfo, UniversalStreamResponse, UniversalMessage } from '../../interfaces/UniversalInterfaces';
import { OpenAIModelParams, OpenAIResponse, OpenAIChatMessage, OpenAIUsage, OpenAIRole } from './types';
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

    convertToProviderParams(params: UniversalChatParams): Omit<OpenAIModelParams, 'model'> {
        this.currentParams = params;
        const messages = this.convertMessages(params.messages);
        const settings = params.settings || {};

        if (!this.currentModel) {
            throw new Error('Model not set');
        }

        // Handle capabilities with their new defaults
        const shouldStream = this.currentModel.capabilities?.streaming !== false && settings.stream === true;  // Only stream if explicitly requested
        const shouldSetTemperature = this.currentModel.capabilities?.temperature !== false;  // default true
        const hasToolCalls = this.currentModel.capabilities?.toolCalls === true;  // default false
        const hasParallelToolCalls = this.currentModel.capabilities?.parallelToolCalls === true;  // default false
        const hasBatchProcessing = this.currentModel.capabilities?.batchProcessing === true;  // default false

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
            // Only include tool-related fields if tool calls are enabled
            ...(hasToolCalls && {
                tool_choice: settings.toolChoice,
                tools: settings.tools,
                tool_calls: hasParallelToolCalls ? settings.toolCalls : undefined
            })
        };
    }

    convertFromProviderResponse(response: OpenAIResponse): UniversalChatResponse {
        // Validate OpenAI response structure
        if (!response?.choices?.[0]?.message) {
            throw new Error('Invalid OpenAI response structure: missing required fields');
        }

        const message = response.choices[0].message;
        const content = message.content ?? '';  // Use empty string if content is null
        const role = message.role;

        // Check if we have a valid response
        if (response.choices[0].finish_reason === 'length' && !content.trim()) {
            throw new Error('Response was truncated before any content could be generated. Try reducing maxTokens or adjusting your prompt.');
        }

        return {
            content,
            role,
            metadata: {
                finishReason: this.mapFinishReason(response.choices[0].finish_reason),
                created: response.created,
                model: response.model,
                usage: this.convertUsage(response.usage),
                responseFormat: this.currentParams?.settings?.responseFormat || 'text'
            }
        };
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

    public convertStreamResponse(chunk: OpenAIStreamResponse, params?: UniversalChatParams): UniversalStreamResponse {
        const choices = chunk.choices || [];
        const firstChoice = choices[0] || {};
        const delta = firstChoice.delta || {};

        return {
            content: delta.content || '',
            role: delta.role || 'assistant',
            isComplete: firstChoice.finish_reason !== null,
            metadata: {
                finishReason: this.mapFinishReason(firstChoice.finish_reason),
                responseFormat: params?.settings?.responseFormat || 'text',
            },
        };
    }

    public getCurrentParams(): UniversalChatParams | undefined {
        return this.currentParams;
    }

    public clearModel() {
        this.currentModel = undefined;
    }
} 