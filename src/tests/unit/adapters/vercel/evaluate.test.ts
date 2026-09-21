import { describe, expect, it, jest } from '@jest/globals';
import { ModelManager } from '@/core/models/ModelManager.ts';
import { VercelConverter } from '@/adapters/vercel/converter.ts';
import { VercelAdapter } from '@/adapters/vercel/adapter.ts';
import { ProviderManager } from '@/core/caller/ProviderManager.ts';

describe('Vercel evaluate surface', () => {
    const originalKey = process.env.AI_GATEWAY_API_KEY;

    beforeEach(() => {
        process.env.AI_GATEWAY_API_KEY = 'test-key';
    });

    afterEach(() => {
        if (originalKey === undefined) delete process.env.AI_GATEWAY_API_KEY;
        else process.env.AI_GATEWAY_API_KEY = originalKey;
        jest.restoreAllMocks();
    });

    it('catalogs jev as an evaluation model', () => {
        const model = new ModelManager('vercel').getModel('typesafe-ai/jev');
        expect(model?.capabilities?.evaluation).toEqual({
            questionTypes: ['boolean', 'choice', 'score']
        });
        expect(model?.capabilities?.output.text).toBe(false);
    });

    it('exposes evaluate through ProviderManager', () => {
        const manager = new ProviderManager('vercel', 'test-key');
        expect(manager.supportsEvaluation()).toBe(true);
        expect(manager.supportsReranking()).toBe(true);
    });

    it('maps noul answers to boolean and builds usage costs', () => {
        const converter = new VercelConverter(new ModelManager('vercel'));
        const response = converter.convertFromProviderEvaluateResponse({
            model: 'typesafe-ai/jev',
            answers: {
                refund: { type: 'noul', noul: 0.98 },
                team: {
                    type: 'choice',
                    choice: 'billing',
                    probabilities: { billing: 0.9, technical: 0.1 },
                    confidence: 0.8
                },
                urgency: {
                    type: 'score',
                    score: 2,
                    probabilities: { '0': 0, '1': 0.1, '2': 0.9 },
                    legend: { '0': 'low', '1': 'medium', '2': 'high' },
                    confidence: 0.85
                }
            },
            usage: { inputTokens: 1000, outputTokens: 20 }
        }, 'typesafe-ai/jev', {
            refund: { type: 'boolean', instructions: 'refund?' },
            team: {
                type: 'choice',
                instructions: 'team?',
                criteria: { billing: 'b', technical: 't' }
            },
            urgency: {
                type: 'score',
                instructions: 'urgency?',
                criteria: ['low', 'medium', 'high']
            }
        });

        expect(response.answers.refund).toEqual({ type: 'boolean', probability: 0.98 });
        expect(response.answers.team).toMatchObject({
            type: 'choice',
            choice: 'billing'
        });
        expect(response.answers.urgency).toMatchObject({
            type: 'score',
            score: 2
        });
        expect(response.usage.tokens.input.total).toBe(1000);
        expect(response.usage.costs.total).toBeGreaterThan(0);
        expect(response.metadata?.provider).toBe('vercel');
    });

    it('posts /v1/evaluate and maps the response', async () => {
        const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                model: 'typesafe-ai/jev',
                answers: {
                    refund: { type: 'boolean', probability: 0.91 }
                },
                usage: { inputTokens: 50, outputTokens: 5 }
            }),
            headers: new Headers()
        } as Response);

        try {
            const adapter = new VercelAdapter({ apiKey: 'test-key' });
            const response = await adapter.evaluateCall('typesafe-ai/jev', {
                state: 'I was charged twice. Please refund.',
                questions: {
                    refund: {
                        type: 'boolean',
                        instructions: 'Is the customer asking for money back?'
                    }
                }
            });
            expect(fetchMock).toHaveBeenCalledWith(
                'https://ai-gateway.vercel.sh/v1/evaluate',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        authorization: 'Bearer test-key'
                    })
                })
            );
            expect(response.answers.refund).toEqual({
                type: 'boolean',
                probability: 0.91
            });
        } finally {
            fetchMock.mockRestore();
        }
    });
});
