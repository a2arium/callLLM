import { describe, expect, it, jest } from '@jest/globals';
import { VercelAdapter } from '@/adapters/vercel/adapter.ts';
import { VercelValidationError } from '@/adapters/vercel/errors.ts';
import { ProviderManager } from '@/core/caller/ProviderManager.ts';

describe('VercelAdapter image and rerank surfaces', () => {
    const originalKey = process.env.AI_GATEWAY_API_KEY;

    beforeEach(() => {
        process.env.AI_GATEWAY_API_KEY = 'test-key';
    });

    afterEach(() => {
        if (originalKey === undefined) delete process.env.AI_GATEWAY_API_KEY;
        else process.env.AI_GATEWAY_API_KEY = originalKey;
        jest.restoreAllMocks();
    });

    it('exposes image and rerank interfaces through ProviderManager', () => {
        const manager = new ProviderManager('vercel', 'test-key');
        expect(manager.supportsImageGeneration()).toBe(true);
        expect(manager.supportsReranking()).toBe(true);
        expect(manager.supportsVideoGeneration()).toBe(false);
        expect(manager.supportsAudio()).toBe(false);
    });

    it('maps images.generate b64 responses', async () => {
        const adapter = new VercelAdapter({ apiKey: 'test-key' });
        const client = (adapter as unknown as {
            client: {
                images: {
                    generate: (params: unknown, opts?: unknown) => Promise<unknown>;
                };
            };
        }).client;
        const generate = jest.spyOn(client.images, 'generate').mockResolvedValue({
            data: [{ b64_json: 'abc123' }]
        });

        const response = await adapter.imageCall('openai/gpt-image-1-mini', 'generate', {
            prompt: 'a cat',
            size: '1024x1024'
        });

        expect(generate).toHaveBeenCalledWith(
            expect.objectContaining({
                model: 'openai/gpt-image-1-mini',
                prompt: 'a cat',
                response_format: 'b64_json'
            })
        );
        expect(response.image).toMatchObject({
            data: 'abc123',
            dataSource: 'base64',
            operation: 'generate',
            width: 1024,
            height: 1024
        });
        expect(response.metadata?.provider).toBe('vercel');
    });

    it('maps images.edit with file input', async () => {
        const adapter = new VercelAdapter({ apiKey: 'test-key' });
        const client = (adapter as unknown as {
            client: {
                images: {
                    edit: (params: unknown, opts?: unknown) => Promise<unknown>;
                };
            };
        }).client;
        const edit = jest.spyOn(client.images, 'edit').mockResolvedValue({
            data: [{ url: 'https://example.com/edited.png' }]
        });

        const response = await adapter.imageCall('openai/gpt-image-1-mini', 'edit', {
            prompt: 'make it blue',
            files: [{ type: 'base64', data: Buffer.from('png').toString('base64'), mime: 'image/png' }]
        });

        expect(edit).toHaveBeenCalled();
        expect(response.image).toMatchObject({
            data: '',
            dataSource: 'url',
            operation: 'edit'
        });
        expect(response.metadata?.imageUrl).toBe('https://example.com/edited.png');
    });

    it('rejects composite image operations', async () => {
        const adapter = new VercelAdapter({ apiKey: 'test-key' });
        await expect(adapter.imageCall('openai/gpt-image-1-mini', 'composite', {
            prompt: 'x'
        })).rejects.toBeInstanceOf(VercelValidationError);
    });

    it('posts /v2/rerank and maps results', async () => {
        const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                id: 'rank-1',
                results: [{ index: 1, relevance_score: 0.77 }],
                meta: { billed_units: { search_units: 1 } }
            }),
            headers: new Headers()
        } as Response);

        try {
            const adapter = new VercelAdapter({ apiKey: 'test-key' });
            const response = await adapter.rerankCall('cohere/rerank-v3.5', {
                query: 'apple',
                documents: ['fruit', 'car'],
                topN: 1
            });
            expect(fetchMock).toHaveBeenCalledWith(
                'https://ai-gateway.vercel.sh/v2/rerank',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        authorization: 'Bearer test-key'
                    })
                })
            );
            expect(response.results).toEqual([{ index: 1, relevanceScore: 0.77 }]);
        } finally {
            fetchMock.mockRestore();
        }
    });
});
