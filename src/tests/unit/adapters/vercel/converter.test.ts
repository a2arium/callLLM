import { ModelManager } from '@/core/models/ModelManager.ts';
import { FinishReason, type UniversalChatParams } from '@/interfaces/UniversalInterfaces.ts';
import { VercelConverter } from '@/adapters/vercel/converter.ts';

const createParams = (): UniversalChatParams => ({
    model: 'alibaba/qwen-3-14b',
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
                    vercel: { reasoningContent: 'Need current weather.' }
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
        reasoning: { effort: 'minimal' },
        providerOptions: {
            gateway: {
                order: ['bedrock', 'anthropic'],
                tags: ['callllm-test']
            }
        }
    },
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

describe('VercelConverter', () => {
    const converter = new VercelConverter(new ModelManager('vercel'));

    it('maps universal chat parameters, minimal reasoning to low, and gateway options', async () => {
        const result = await converter.convertToProviderParams(
            'alibaba/qwen-3-14b',
            createParams()
        );

        expect(result).toMatchObject({
            model: 'alibaba/qwen-3-14b',
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
            reasoning_effort: 'low',
            providerOptions: {
                gateway: {
                    order: ['bedrock', 'anthropic'],
                    tags: ['callllm-test']
                }
            }
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

    it('uses json_schema for structured-output models and json_object otherwise', async () => {
        const schemaParams: UniversalChatParams = {
            model: 'alibaba/qwen3.8-omni-flash',
            messages: [{ role: 'user', content: 'Return JSON' }],
            jsonSchema: {
                name: 'answer',
                schema: {
                    type: 'object',
                    properties: { answer: { type: 'string' } },
                    required: ['answer']
                }
            }
        };

        const structured = await converter.convertToProviderParams(
            'alibaba/qwen3.8-omni-flash',
            schemaParams
        );
        expect(structured.response_format).toMatchObject({
            type: 'json_schema',
            json_schema: {
                name: 'answer',
                strict: true
            }
        });

        const jsonObject = await converter.convertToProviderParams(
            'alibaba/qwen3.8-omni-flash',
            {
                model: 'alibaba/qwen3.8-omni-flash',
                messages: [{ role: 'user', content: 'Return JSON' }],
                responseFormat: 'json'
            }
        );
        expect(jsonObject.response_format).toEqual({ type: 'json_object' });
    });

    it('includes stream usage options when streaming', async () => {
        const result = await converter.convertToProviderParams(
            'alibaba/qwen-3-14b',
            createParams(),
            { stream: true }
        );

        expect(result.stream).toBe(true);
        expect(result.stream_options).toEqual({ include_usage: true });
    });

    it('maps responses, tool calls, provider state, usage, and costs', () => {
        const result = converter.convertFromProviderResponse({
            id: 'chat_1',
            object: 'chat.completion',
            created: 123,
            model: 'alibaba/qwen-3.6-max-preview',
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
        expect(result.metadata?.provider).toBe('vercel');
        expect(result.metadata?.providerState).toEqual({
            vercel: { reasoningContent: 'I should call the tool.' }
        });
        expect(result.metadata?.usage?.tokens).toEqual({
            input: { total: 1000, cached: 200 },
            output: { total: 500, reasoning: 300 },
            total: 1500
        });
        expect(result.metadata?.usage?.costs.total).toBeGreaterThan(0);
        expect(result.metadata?.usage?.costs.unit).toBe('USD');
        expect(result.metadata?.usage?.costs.input.cached).toBeGreaterThan(0);
    });

    it('uses prompt/schema fallback instead of claiming native JSON for unknown models', async () => {
        const params = createParams();
        params.jsonSchema = {
            name: 'answer',
            schema: '{"type":"object","properties":{"answer":{"type":"string"}}}'
        };
        const result = await converter.convertToProviderParams('unknown-model', params);
        expect(result.response_format).toBeUndefined();
        expect(result.messages[0].content).toContain('JSON Schema');
    });

    it('parses <file:...> placeholders into multimodal image_url content parts', async () => {
        const previous = process.env.TEST_MODE;
        process.env.TEST_MODE = 'true';
        try {
            const result = await converter.convertToProviderParams('openai/gpt-4.1-mini', {
                model: 'openai/gpt-4.1-mini',
                messages: [{
                    role: 'user',
                    content: 'Describe this image <file:/tmp/sample.png> please'
                }]
            });
            expect(result.messages[0].content).toEqual([
                { type: 'text', text: 'Describe this image' },
                {
                    type: 'image_url',
                    image_url: {
                        url: 'data:image/png;base64,TEST_MODE_PLACEHOLDER',
                        detail: 'auto'
                    }
                },
                { type: 'text', text: 'please' }
            ]);
        } finally {
            if (previous === undefined) delete process.env.TEST_MODE;
            else process.env.TEST_MODE = previous;
        }
    });

    it('passes through data: and http(s) image sources without reading disk', async () => {
        const result = await converter.convertToProviderParams('openai/gpt-4.1-mini', {
            model: 'openai/gpt-4.1-mini',
            messages: [{
                role: 'user',
                content: 'Look <file:https://example.com/a.png>'
            }]
        });
        expect(result.messages[0].content).toEqual([
            { type: 'text', text: 'Look' },
            {
                type: 'image_url',
                image_url: {
                    url: 'https://example.com/a.png',
                    detail: 'auto'
                }
            }
        ]);
    });

    it('maps rerank request and response with usage', () => {
        const request = converter.convertToProviderRerankParams('cohere/rerank-v3.5', {
            query: 'fruit',
            documents: ['apple', 'car'],
            topN: 1
        });
        expect(request).toEqual({
            model: 'cohere/rerank-v3.5',
            query: 'fruit',
            documents: ['apple', 'car'],
            top_n: 1
        });

        const response = converter.convertFromProviderRerankResponse({
            id: 'rr-1',
            results: [{ index: 0, relevance_score: 0.9 }],
            meta: {
                tokens: { input_tokens: 20, output_tokens: 0 },
                billed_units: { search_units: 1 }
            }
        }, 'cohere/rerank-v3.5');
        expect(response.results).toEqual([{ index: 0, relevanceScore: 0.9 }]);
        expect(response.metadata?.callId).toBe('rr-1');
        expect(response.usage.tokens.input.total).toBe(20);
        expect(response.usage.measurements).toEqual([{
            name: 'searches',
            value: 1,
            unit: 'search',
            source: 'provider'
        }]);
    });

    it('parses image size strings', () => {
        expect(converter.parseSize('512x768')).toEqual({ width: 512, height: 768 });
        expect(converter.parseSize(undefined)).toEqual({ width: 1024, height: 1024 });
    });
});
