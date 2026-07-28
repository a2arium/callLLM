import { describe, expect, it, jest } from '@jest/globals';
import { LLMCaller } from '../../../../core/caller/LLMCaller.ts';
import type { ModelInfo, RerankResponse } from '../../../../interfaces/UniversalInterfaces.ts';

const rerankModel: ModelInfo = {
    name: 'Qwen/Qwen3-Reranker-0.6B',
    inputPricePerMillion: 0.01,
    outputPricePerMillion: 0,
    rerankPricing: { unit: 'token', price: 0.01, per: 1_000_000 },
    maxRequestTokens: 32768,
    maxResponseTokens: 0,
    capabilities: {
        reranking: { documentTypes: ['text'], maxTotalTokens: 32768 },
        input: { text: true },
        output: { text: false }
    },
    characteristics: { qualityIndex: 75, outputSpeed: 0, firstTokenLatency: 0 }
};

describe('LLMCaller rerank API', () => {
    it('resolves, delegates, annotates metadata, invokes callback once, and preserves history', async () => {
        const response: RerankResponse = {
            model: rerankModel.name,
            results: [{ index: 1, relevanceScore: 0.9 }],
            usage: {
                tokens: { input: { total: 20, cached: 0 }, output: { total: 0, reasoning: 0 }, total: 20 },
                costs: { input: { total: 0.0000002, cached: 0 }, output: { total: 0, reasoning: 0 }, total: 0.0000002, unit: 'USD' }
            }
        };
        const adapter = { rerankCall: jest.fn(async () => response) };
        const providerManager = {
            getProvider: jest.fn(() => adapter),
            getCurrentProviderName: jest.fn(() => 'siliconflow')
        };
        const modelManager = {
            getModel: jest.fn((name: string) => name === rerankModel.name ? rerankModel : undefined),
            getAvailableModels: jest.fn(() => [rerankModel])
        };
        const callback = jest.fn();
        const caller = new LLMCaller('siliconflow', 'cheap', 'system', {
            apiKey: 'test-key',
            providerManager: providerManager as never,
            modelManager: modelManager as never,
            callerId: 'rank-call'
        });
        const before = caller.getMessages();

        const result = await caller.rerank({
            query: 'password',
            documents: ['billing', { type: 'text', id: 'password', text: 'reset password' }],
            topN: 1,
            usageCallback: callback
        });

        expect(adapter.rerankCall).toHaveBeenCalledTimes(1);
        expect(result.results[0]).toMatchObject({ index: 1, documentId: 'password' });
        expect(result.metadata).toMatchObject({
            provider: 'siliconflow',
            model: rerankModel.name,
            selectionMode: 'preset'
        });
        expect(callback).toHaveBeenCalledTimes(1);
        expect(caller.getMessages()).toEqual(before);
    });
});
