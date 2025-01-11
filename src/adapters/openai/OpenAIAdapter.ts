import { OpenAI } from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { LLMProvider } from '../../interfaces/LLMProvider';
import { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse, FinishReason, ModelInfo, ResponseFormat } from '../../interfaces/UniversalInterfaces';
import { defaultModels } from './models';
import { encoding_for_model } from '@dqbd/tiktoken';
import { z } from 'zod';
import { SchemaFormatter } from '../../core/schema/SchemaFormatter';

interface JSONResponseFormat {
    type: 'json_object' | 'json_schema';
    json_schema?: Record<string, unknown>;
}

export class OpenAIAdapter implements LLMProvider {
    private client: OpenAI;
    private models: Map<string, ModelInfo>;
    private currentModel: string = '';
    private currentResponseFormat: ResponseFormat = 'text';

    constructor(apiKey?: string) {
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || apiKey,
            dangerouslyAllowBrowser: true
        });
        this.models = new Map(defaultModels.map(model => [model.name, model]));
    }

    private calculateCosts(model: string, inputTokens: number, outputTokens: number) {
        const modelInfo = this.models.get(this.currentModel);
        if (!modelInfo) return { inputCost: 0, outputCost: 0, totalCost: 0 };

        const inputCost = (inputTokens / 1_000_000) * modelInfo.inputPricePerMillion;
        const outputCost = (outputTokens / 1_000_000) * modelInfo.outputPricePerMillion;
        return {
            inputCost,
            outputCost,
            totalCost: inputCost + outputCost
        };
    }

    public convertToProviderParams(model: string, params: UniversalChatParams): OpenAI.Chat.ChatCompletionCreateParams {
        // Check if the model requires 'assistant' role instead of 'system'
        const adjustedMessages = params.messages.map(message => {
            if (message.role === 'system' && model.startsWith('o1')) {
                return { role: 'assistant' as const, content: message.content };
            }
            return { role: message.role, content: message.content };
        });

        // Validate temperature (0-2 range)
        let temperature = params.settings?.temperature ?? 1;
        if (temperature < 0 || temperature > 2) {
            console.warn(`Temperature ${temperature} is outside the valid range (0-2). Clamping to nearest valid value.`);
            temperature = Math.max(0, Math.min(2, temperature));
        }

        // Handle JSON mode and structured outputs
        let responseFormat: OpenAI.Chat.ChatCompletionCreateParams['response_format'] | undefined;
        if (params.settings?.jsonSchema) {
            const modelInfo = this.models.get(model);
            // Check if model supports structured outputs
            if (modelInfo?.jsonMode) {
                const { name, schema } = params.settings.jsonSchema;
                if (schema instanceof z.ZodType) {
                    responseFormat = zodResponseFormat(schema, name || 'Schema');
                } else {
                    // Format the JSON schema according to OpenAI's requirements
                    responseFormat = {
                        type: 'json_schema',
                        json_schema: SchemaFormatter.formatJsonSchema(name || 'Schema', schema)
                    };
                }
            } else {
                // Fallback to basic JSON mode for older models
                responseFormat = { type: 'json_object' };
                // Add JSON instruction to system message if not present
                if (!adjustedMessages.some(msg => msg.content.includes('JSON'))) {
                    adjustedMessages.unshift({
                        role: 'system',
                        content: 'You must respond with valid JSON output.'
                    });
                }
            }
        } else if (params.settings?.responseFormat === 'json') {
            responseFormat = { type: 'json_object' };
            // Add JSON instruction to system message if not present
            if (!adjustedMessages.some(msg => msg.content.includes('JSON'))) {
                adjustedMessages.unshift({
                    role: 'system',
                    content: 'You must respond with valid JSON output.'
                });
            }
        }

        // Store the response format setting for use in response conversion
        this.currentResponseFormat = params.settings?.responseFormat || 'text';

        return {
            model,
            messages: adjustedMessages,
            temperature,
            max_tokens: params.settings?.maxTokens,
            top_p: params.settings?.topP,
            frequency_penalty: params.settings?.frequencyPenalty,
            presence_penalty: params.settings?.presencePenalty,
            response_format: responseFormat,
            stream: false
        };
    }

    public convertFromProviderResponse(response: OpenAI.Chat.ChatCompletion): UniversalChatResponse {
        const choice = response.choices[0];
        const message = choice.message as any; // Cast to access potential refusal

        // Handle refusals in structured output
        if (message.refusal) {
            return {
                content: '',
                role: 'assistant',
                metadata: {
                    finishReason: FinishReason.CONTENT_FILTER,
                    refusal: message.refusal,
                    created: response.created,
                    model: response.model
                }
            };
        }

        const usage = response.usage ? {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
            costs: this.calculateCosts(
                response.model,
                response.usage.prompt_tokens,
                response.usage.completion_tokens
            )
        } : undefined;

        return {
            content: message.content || '',
            role: message.role || 'assistant',
            metadata: {
                finishReason: this.mapFinishReason(choice.finish_reason),
                created: response.created,
                model: response.model,
                usage,
                responseFormat: this.currentResponseFormat
            }
        };
    }

    public convertFromProviderStreamResponse(chunk: OpenAI.Chat.ChatCompletionChunk): UniversalStreamResponse {
        const choice = chunk.choices[0];
        const delta = choice.delta as any; // Cast to access potential refusal

        // Handle refusals in structured output
        if (delta.refusal) {
            return {
                content: '',
                role: 'assistant',
                isComplete: true,
                metadata: {
                    finishReason: FinishReason.CONTENT_FILTER,
                    refusal: delta.refusal,
                    created: chunk.created,
                    model: chunk.model
                }
            };
        }

        return {
            content: delta.content || '',
            role: delta.role || 'assistant',
            isComplete: choice.finish_reason !== null,
            metadata: {
                finishReason: this.mapFinishReason(choice.finish_reason),
                created: chunk.created,
                model: chunk.model,
                responseFormat: this.currentResponseFormat
            }
        };
    }

    private mapFinishReason(reason: string | null): FinishReason {
        if (!reason) return FinishReason.NULL;
        switch (reason) {
            case 'stop': return FinishReason.STOP;
            case 'length': return FinishReason.LENGTH;
            case 'content_filter': return FinishReason.CONTENT_FILTER;
            case 'tool_calls': return FinishReason.TOOL_CALLS;
            default: return FinishReason.NULL;
        }
    }

    public async chatCall(model: string, params: UniversalChatParams): Promise<UniversalChatResponse> {
        this.currentModel = model;
        const providerParams = this.convertToProviderParams(model, params);
        const response = await this.client.chat.completions.create(providerParams) as OpenAI.Chat.ChatCompletion;
        return this.convertFromProviderResponse(response);
    }

    public async streamCall(model: string, params: UniversalChatParams): Promise<AsyncIterable<UniversalStreamResponse>> {
        this.currentModel = model;
        const providerParams = this.convertToProviderParams(model, params);
        const stream = await this.client.chat.completions.create({
            ...providerParams,
            stream: true
        });

        let totalOutputTokens = 0;
        const inputTokens = this.calculateInputTokens(params.messages);

        return {
            [Symbol.asyncIterator]: async function* (this: OpenAIAdapter) {
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        totalOutputTokens += this.calculateOutputTokens(content);
                    }

                    const usage = {
                        inputTokens,
                        outputTokens: totalOutputTokens,
                        totalTokens: inputTokens + totalOutputTokens,
                        costs: this.calculateCosts(chunk.model, inputTokens, totalOutputTokens)
                    };

                    yield {
                        content,
                        role: chunk.choices[0]?.delta?.role || 'assistant',
                        isComplete: chunk.choices[0]?.finish_reason !== null,
                        metadata: {
                            finishReason: chunk.choices[0]?.finish_reason as FinishReason || FinishReason.NULL,
                            created: chunk.created,
                            model: chunk.model,
                            usage,
                            responseFormat: this.currentResponseFormat
                        }
                    };
                }
            }.bind(this)
        };
    }

    private calculateInputTokens(messages: UniversalChatParams['messages']): number {
        return messages.reduce((total, msg) => total + this.calculateOutputTokens(msg.content), 0);
    }

    private calculateOutputTokens(text: string): number {
        try {
            const modelInfo = this.models.get(this.currentModel);
            const tokenModel = modelInfo?.tokenizationModel || this.currentModel;
            const enc = encoding_for_model(tokenModel as any);
            const tokens = enc.encode(text);
            enc.free();
            return tokens.length;
        } catch (error) {
            console.warn('Failed to calculate tokens, using approximate count:', error);
            return Math.ceil(text.length / 4);
        }
    }
}
