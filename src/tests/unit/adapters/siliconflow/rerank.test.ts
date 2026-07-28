import { describe, expect, it, jest } from '@jest/globals';
import { SiliconFlowConverter } from '../../../../adapters/siliconflow/converter.ts';
import { defaultModels } from '../../../../adapters/siliconflow/models.ts';
import { ModelManager } from '../../../../core/models/ModelManager.ts';
import { SiliconFlowValidationError } from '../../../../adapters/siliconflow/errors.ts';
import { SiliconFlowAdapter } from '../../../../adapters/siliconflow/adapter.ts';
import { LLMAbortError } from '../../../../core/execution/errors.ts';

const converter = new SiliconFlowConverter(new ModelManager('siliconflow'));

describe('SiliconFlow reranking', () => {
    it('maps universal params and protects reserved fields', () => {
        const request = converter.convertToProviderRerankParams('Qwen/Qwen3-Reranker-0.6B', {
            query: 'Apple',
            documents: ['apple', 'banana'],
            topN: 1,
            providerOptions: {
                siliconflow: {
                    model: 'wrong',
                    query: 'wrong',
                    return_documents: true,
                    future_option: 'ok'
                }
            }
        });
        expect(request).toMatchObject({
            model: 'Qwen/Qwen3-Reranker-0.6B',
            query: 'Apple',
            documents: ['apple', 'banana'],
            top_n: 1,
            return_documents: false,
            future_option: 'ok'
        });
    });

    it('validates model-specific chunking options', () => {
        expect(() => converter.convertToProviderRerankParams('Qwen/Qwen3-Reranker-0.6B', {
            query: 'q',
            documents: ['d'],
            providerOptions: { siliconflow: { overlap_tokens: 81 } }
        })).toThrow(SiliconFlowValidationError);
        expect(() => converter.convertToProviderRerankParams('Qwen/Qwen3-Reranker-0.6B', {
            query: 'q',
            documents: ['d'],
            providerOptions: { siliconflow: { overlap_tokens: 20 } }
        })).toThrow('not supported');
    });

    it('normalizes results, request ID, token usage, and cost', () => {
        const response = converter.convertFromProviderRerankResponse({
            id: 'rank-1',
            results: [{ index: 1, relevance_score: 0.95 }],
            tokens: { input_tokens: 1_000, output_tokens: 2 }
        }, 'Qwen/Qwen3-Reranker-0.6B');
        expect(response.results).toEqual([{ index: 1, relevanceScore: 0.95 }]);
        expect(response.metadata?.callId).toBe('rank-1');
        expect(response.usage.tokens.total).toBe(1_002);
        expect(response.usage.costs.total).toBeCloseTo(0.00001);
    });

    it('normalizes the live meta token and billing shape', () => {
        const response = converter.convertFromProviderRerankResponse({
            id: 'rank-live',
            results: [{ index: 0, relevance_score: 0.8 }],
            meta: {
                tokens: { input_tokens: 257, output_tokens: 0, image_tokens: 0 },
                billed_units: {
                    input_tokens: 257,
                    output_tokens: 0,
                    image_tokens: 0,
                    search_units: 2,
                    classifications: 0
                }
            }
        }, 'Qwen/Qwen3-Reranker-0.6B');
        expect(response.usage.tokens.input.total).toBe(257);
        expect(response.usage.measurements).toEqual([
            { name: 'searches', value: 2, unit: 'search', source: 'provider' }
        ]);
        expect(response.usage.costs.total).toBeCloseTo(0.00000257);
    });

    it('rejects malformed provider results', () => {
        expect(() => converter.convertFromProviderRerankResponse({
            id: 'rank-1',
            results: [{ index: '1', relevance_score: Number.NaN }],
            tokens: { input_tokens: 10, output_tokens: 0 }
        }, 'Qwen/Qwen3-Reranker-0.6B')).toThrow(SiliconFlowValidationError);
    });

    it('posts the native rerank request and maps the response', async () => {
        const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                id: 'rank-native',
                results: [{ index: 0, relevance_score: 0.8 }],
                tokens: { input_tokens: 12, output_tokens: 0 }
            }),
            headers: new Headers()
        } as Response);
        try {
            const adapter = new SiliconFlowAdapter({ apiKey: 'test-key', baseUrl: 'https://example.test/v1' });
            const response = await adapter.rerankCall('Qwen/Qwen3-Reranker-0.6B', {
                query: 'q',
                documents: ['d']
            });
            expect(fetchMock).toHaveBeenCalledWith('https://example.test/v1/rerank', expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({ authorization: 'Bearer test-key' })
            }));
            expect(response.results).toEqual([{ index: 0, relevanceScore: 0.8 }]);
        } finally {
            fetchMock.mockRestore();
        }
    });

    it('preserves universal cancellation errors', async () => {
        const controller = new AbortController();
        controller.abort();
        const fetchMock = jest.spyOn(globalThis, 'fetch').mockRejectedValue(
            new DOMException('Aborted', 'AbortError')
        );
        try {
            const adapter = new SiliconFlowAdapter({ apiKey: 'test-key' });
            await expect(adapter.rerankCall('Qwen/Qwen3-Reranker-0.6B', {
                query: 'q',
                documents: ['d']
            }, { signal: controller.signal })).rejects.toBeInstanceOf(LLMAbortError);
        } finally {
            fetchMock.mockRestore();
        }
    });

    it('catalogs all supported Qwen3 rerankers as non-generative', () => {
        const rerankers = defaultModels.filter(model => model.capabilities?.reranking);
        expect(rerankers.map(model => model.name)).toEqual([
            'Qwen/Qwen3-Reranker-0.6B',
            'Qwen/Qwen3-Reranker-4B',
            'Qwen/Qwen3-Reranker-8B'
        ]);
        expect(rerankers.every(model => model.maxResponseTokens === 0 && model.capabilities?.output.text === false)).toBe(true);
    });
});
