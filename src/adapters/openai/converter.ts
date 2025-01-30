import { UniversalChatParams, UniversalChatResponse, FinishReason, ModelInfo, UniversalStreamResponse } from '../../interfaces/UniversalInterfaces';
import { OpenAIModelParams, OpenAIResponse, OpenAIChatMessage, OpenAIUsage } from './types';
import { zodResponseFormat } from 'openai/helpers/zod';
import { ChatCompletionCreateParams } from 'openai/resources/chat';
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

    convertToProviderParams(params: UniversalChatParams): Omit<OpenAIModelParams, 'model'> {
        this.currentParams = params;
        const messages = this.convertMessages(params.messages);
        const settings = params.settings || {};

        return {
            messages,
            temperature: settings.temperature,
            top_p: settings.topP,
            n: 1,
            stream: false,
            stop: undefined,
            max_tokens: settings.maxTokens,
            presence_penalty: settings.presencePenalty,
            frequency_penalty: settings.frequencyPenalty,
            response_format: this.getResponseFormat(settings),
        };
    }

    convertFromProviderResponse(response: OpenAIResponse): UniversalChatResponse {
        return {
            content: response.choices[0].message.content || '',
            role: response.choices[0].message.role,
            metadata: {
                finishReason: this.mapFinishReason(response.choices[0].finish_reason),
                created: response.created,
                model: response.model,
                usage: this.convertUsage(response.usage),
                responseFormat: this.currentParams?.settings?.responseFormat || 'text'
            }
        };
    }

    private convertMessages(messages: Array<{ role: string; content: string; name?: string }>): OpenAIChatMessage[] {
        return messages.map(msg => ({
            role: msg.role as OpenAIChatMessage['role'],
            content: msg.content,
            name: msg.name,
            refusal: null,
        }));
    }

    private convertUsage(usage: OpenAIUsage) {
        if (!this.currentModel) {
            return {
                inputTokens: usage.prompt_tokens,
                outputTokens: usage.completion_tokens,
                totalTokens: usage.total_tokens,
                ...(usage.prompt_tokens_details?.cached_tokens !== undefined && {
                    inputCachedTokens: usage.prompt_tokens_details.cached_tokens
                }),
                costs: {
                    inputCost: 0,
                    outputCost: 0,
                    totalCost: 0
                }
            };
        }

        const inputCost = (usage.prompt_tokens / 1_000_000) * this.currentModel.inputPricePerMillion;
        const outputCost = (usage.completion_tokens / 1_000_000) * this.currentModel.outputPricePerMillion;

        return {
            inputTokens: usage.prompt_tokens,
            outputTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
            ...(usage.prompt_tokens_details?.cached_tokens !== undefined && {
                inputCachedTokens: usage.prompt_tokens_details.cached_tokens
            }),
            costs: {
                inputCost,
                outputCost,
                totalCost: inputCost + outputCost
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
} 