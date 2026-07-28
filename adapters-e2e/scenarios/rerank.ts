import type { Scenario } from '../types.ts';

export const rerankScenario: Scenario = {
    id: 'rerank',
    title: 'Query/document reranking',
    requirements: {
        reranking: { required: true }
    },
    run: async ({ caller, model }) => {
        const response = await caller.rerank({
            model,
            query: 'How can I reset a forgotten password?',
            documents: [
                { type: 'text', id: 'billing', text: 'Invoices can be downloaded from the billing page.' },
                { type: 'text', id: 'password', text: 'Use the Forgot password link to receive a password reset email.' },
                { type: 'text', id: 'profile', text: 'You can upload a profile photo in account settings.' }
            ],
            topN: 2
        });
        return {
            usage: response.usage,
            metadata: {
                results: response.results,
                provider: response.metadata?.provider,
                model: response.metadata?.model
            }
        };
    },
    judge: async (_ctx, result) => {
        const results = (result.metadata?.results ?? []) as Array<{
            index: number;
            documentId?: string;
            relevanceScore?: number;
        }>;
        const indices = results.map(item => item.index);
        const scores = results.map(item => item.relevanceScore).filter((score): score is number => score !== undefined);
        const structural = results.length === 2
            && new Set(indices).size === 2
            && indices.every(index => Number.isInteger(index) && index >= 0 && index < 3)
            && scores.every(Number.isFinite)
            && scores.every((score, index) => index === 0 || score <= scores[index - 1]);
        const pass = structural
            && results[0]?.documentId === 'password'
            && (result.usage?.tokens.input.total ?? 0) > 0;
        return {
            pass,
            score: pass ? 1 : structural ? 0.5 : 0,
            reason: pass ? 'Relevant password document ranked first with valid usage' : 'Invalid ranking structure or relevance order'
        };
    }
};
