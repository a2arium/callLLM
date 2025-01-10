import { LLMProvider } from '../../interfaces/LLMProvider';
import { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse, FinishReason, ModelInfo } from '../../interfaces/UniversalInterfaces';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { defaultModels } from './models';
import { encoding_for_model } from '@dqbd/tiktoken';

dotenv.config();

export class OpenAIAdapter implements LLMProvider {
    private client: OpenAI;
    private models: Map<string, ModelInfo>;
    private currentModel: string = '';

    constructor(apiKey?: string) {
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || apiKey
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

        return {
            model,
            messages: adjustedMessages,
            temperature,
            max_tokens: params.settings?.maxTokens,
            top_p: params.settings?.topP,
            frequency_penalty: params.settings?.frequencyPenalty,
            presence_penalty: params.settings?.presencePenalty,
            stream: false
        };
    }

    public convertFromProviderResponse(response: OpenAI.Chat.ChatCompletion): UniversalChatResponse {
        const choice = response.choices[0];
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
            content: choice.message?.content || '',
            role: choice.message?.role || 'assistant',
            metadata: {
                finishReason: this.mapFinishReason(choice.finish_reason),
                created: response.created,
                model: response.model,
                usage
            }
        };
    }

    public convertFromProviderStreamResponse(chunk: OpenAI.Chat.ChatCompletionChunk): UniversalStreamResponse {
        const choice = chunk.choices[0];
        return {
            content: choice.delta?.content || '',
            role: choice.delta?.role || 'assistant',
            isComplete: choice.finish_reason !== null,
            metadata: {
                finishReason: this.mapFinishReason(choice.finish_reason),
                created: chunk.created,
                model: chunk.model
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
                            usage
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