import { describe, expect, it, jest } from '@jest/globals';
import { RerankController } from '../../../../core/rerank/RerankController.ts';
import type { RerankParams, RerankResponse } from '../../../../interfaces/UniversalInterfaces.ts';

const usage = {
    tokens: { input: { total: 12, cached: 0 }, output: { total: 0, reasoning: 0 }, total: 12 },
    costs: { input: { total: 0.001, cached: 0 }, output: { total: 0, reasoning: 0 }, total: 0.001, unit: 'USD' as const }
};

describe('RerankController', () => {
    it('normalizes documents, preserves provider order, and attaches IDs', async () => {
        const rerankCall = jest.fn(async (_model: string, params: RerankParams): Promise<RerankResponse> => ({
            model: 'reranker',
            results: [
                { index: 1, relevanceScore: 0.9 },
                { index: 0, relevanceScore: 0.3 }
            ],
            usage
        }));
        const controller = new RerankController({ rerankCall } as never);
        const result = await controller.rerank('reranker', {
            query: 'reset password',
            documents: [
                { type: 'text', id: 'billing', text: 'Billing help' },
                { type: 'text', id: 'password', text: 'Reset your password' }
            ],
            topN: 2
        });

        expect(rerankCall).toHaveBeenCalledWith('reranker', expect.objectContaining({
            documents: ['Billing help', 'Reset your password'],
            topN: 2
        }), undefined);
        expect(result.results).toEqual([
            { index: 1, documentId: 'password', relevanceScore: 0.9 },
            { index: 0, documentId: 'billing', relevanceScore: 0.3 }
        ]);
    });

    it.each([
        [{ query: '', documents: ['x'] }, 'query'],
        [{ query: 'q', documents: [] }, 'documents'],
        [{ query: 'q', documents: [''] }, 'document'],
        [{ query: 'q', documents: ['x'], topN: 2 }, 'topN'],
        [{ query: 'q', documents: [
            { type: 'text', id: 'same', text: 'a' },
            { type: 'text', id: 'same', text: 'b' }
        ] }, 'Duplicate']
    ])('rejects invalid input %#', async (options, message) => {
        const controller = new RerankController({ rerankCall: jest.fn() } as never);
        await expect(controller.rerank('reranker', options as never)).rejects.toThrow(message);
    });

    it.each([
        [[{ index: -1, relevanceScore: 1 }], 'invalid document index'],
        [[{ index: 0 }, { index: 0 }], 'duplicate document index'],
        [[{ index: 0, relevanceScore: Number.NaN }], 'finite'],
        [[{ index: 0 }, { index: 1 }], 'more results']
    ])('rejects malformed provider results %#', async (results, message) => {
        const controller = new RerankController({
            rerankCall: jest.fn(async () => ({ model: 'reranker', results, usage }))
        } as never);
        await expect(controller.rerank('reranker', {
            query: 'q',
            documents: ['a', 'b'],
            topN: message === 'more results' ? 1 : 2
        })).rejects.toThrow(message);
    });
});
