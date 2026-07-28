import { ModelManager } from '@/core/models/ModelManager.ts';
import { FinishReason, type UniversalChatParams } from '@/interfaces/UniversalInterfaces.ts';
import { SiliconFlowConverter } from '@/adapters/siliconflow/converter.ts';

const createParams = (): UniversalChatParams => ({
    model: 'Qwen/Qwen3-14B',
    messages: [
        { role: 'system', content: 'Be concise.' },
        { role: 'user', content: 'What is the weather?' },
        {
            role: 'assistant',
            content: '',
            toolCalls: [{
                id: 'call_1',
                name: 'get_weather',
                arguments: { city: 'Riga' }
            }],
            metadata: {
                providerState: {
                    siliconflow: { reasoningContent: 'Need current weather.' }
                }
            }
        },
        { role: 'tool', content: '{"temperature":20}', toolCallId: 'call_1' }
    ],
    settings: {
        temperature: 0.2,
        topP: 0.8,
        maxTokens: 1024,
        frequencyPenalty: 0.1,
        presencePenalty: 0.2,
        stop: ['DONE'],
        n: 1,
        user: 'test-user',
        toolChoice: 'auto',
        reasoning: { effort: 'low' },
        providerOptions: {
            siliconflow: {
                top_k: 40,
                min_p: 0.05
            }
        }
    },
    responseFormat: 'json',
    tools: [{
        name: 'get_weather',
        description: 'Get weather',
        parameters: {
            type: 'object',
            properties: {
                city: { type: 'string', minLength: 2 }
            },
            required: ['city']
        }
    }]
});

describe('SiliconFlowConverter', () => {
    const converter = new SiliconFlowConverter(new ModelManager('siliconflow'));

    it('maps universal chat parameters and replays opaque reasoning state', async () => {
        const result = await converter.convertToProviderParams(
            'Qwen/Qwen3-14B',
            createParams()
        );

        expect(result).toMatchObject({
            model: 'Qwen/Qwen3-14B',
            stream: false,
            temperature: 0.2,
            top_p: 0.8,
            max_tokens: 1024,
            frequency_penalty: 0.1,
            presence_penalty: 0.2,
            stop: ['DONE'],
            n: 1,
            user: 'test-user',
            tool_choice: 'auto',
            enable_thinking: true,
            thinking_budget: 2048,
            top_k: 40,
            min_p: 0.05,
            response_format: { type: 'json_object' }
        });
        expect(result.messages[2]).toMatchObject({
            role: 'assistant',
            content: null,
            reasoning_content: 'Need current weather.',
            tool_calls: [{
                id: 'call_1',
                type: 'function',
                function: {
                    name: 'get_weather',
                    arguments: '{"city":"Riga"}'
                }
            }]
        });
        expect(result.messages[3]).toMatchObject({
            role: 'tool',
            tool_call_id: 'call_1'
        });
        expect(result.tools?.[0].function.parameters).toMatchObject({
            type: 'object',
            required: ['city']
        });
        expect(
            (result.tools?.[0].function.parameters.properties as Record<string, Record<string, unknown>>)
                .city.description
        ).toContain('minimum 2 characters');
    });

    it('protects model, messages, and stream fields from provider option overrides', async () => {
        const params = createParams();
        params.settings = {
            providerOptions: {
                siliconflow: {
                    model: 'wrong-model',
                    messages: [],
                    stream: false,
                    enable_thinking: false
                }
            }
        };

        const result = await converter.convertToProviderParams(
            'Qwen/Qwen3-14B',
            params,
            { stream: true }
        );

        expect(result.model).toBe('Qwen/Qwen3-14B');
        expect(result.messages).toHaveLength(4);
        expect(result.stream).toBe(true);
        expect(result.enable_thinking).toBe(false);
        expect(result.stream_options).toEqual({ include_usage: true });
    });

    it('maps responses, tool calls, provider state, usage, and costs', () => {
        const result = converter.convertFromProviderResponse({
            id: 'chat_1',
            object: 'chat.completion',
            created: 123,
            model: 'deepseek-ai/DeepSeek-V3.2',
            choices: [{
                index: 0,
                finish_reason: 'tool_calls',
                logprobs: null,
                message: {
                    role: 'assistant',
                    content: null,
                    reasoning_content: 'I should call the tool.',
                    refusal: null,
                    tool_calls: [{
                        id: 'call_1',
                        type: 'function',
                        function: {
                            name: 'lookup',
                            arguments: '{"id":7}'
                        }
                    }]
                }
            }],
            usage: {
                prompt_tokens: 1000,
                completion_tokens: 500,
                total_tokens: 1500,
                prompt_tokens_details: { cached_tokens: 200 },
                completion_tokens_details: { reasoning_tokens: 300 }
            }
        });

        expect(result.content).toBeNull();
        expect(result.reasoning).toBe('I should call the tool.');
        expect(result.toolCalls).toEqual([{
            id: 'call_1',
            name: 'lookup',
            arguments: { id: 7 }
        }]);
        expect(result.metadata?.finishReason).toBe(FinishReason.TOOL_CALLS);
        expect(result.metadata?.providerState).toEqual({
            siliconflow: { reasoningContent: 'I should call the tool.' }
        });
        expect(result.metadata?.usage?.tokens).toEqual({
            input: { total: 1000, cached: 200 },
            output: { total: 500, reasoning: 300 },
            total: 1500
        });
        expect(result.metadata?.usage?.costs.total).toBeGreaterThan(0);
        expect(result.metadata?.usage?.costs.unit).toBe('USD');
    });

    it('uses prompt/schema fallback instead of claiming native JSON for unknown models', async () => {
        const params = createParams();
        params.jsonSchema = {
            name: 'answer',
            schema: '{"type":"object","properties":{"answer":{"type":"string"}}}'
        };
        const result = await converter.convertToProviderParams('unknown-model', params);
        expect(result.response_format).toBeUndefined();
        expect(result.messages[0]).toMatchObject({
            role: 'system'
        });
        expect(result.messages[0].content).toContain('"answer"');
    });
});
