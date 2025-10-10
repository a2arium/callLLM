import type { Scenario } from '../types.ts';

export const embeddingsScenario: Scenario = {
    id: 'embeddings',
    title: 'Embeddings single and batch',
    requirements: {
        embeddings: { required: true }
    },
    run: async ({ caller }) => {
        // Prefer explicit embedding model if available; fallback to current
        let model = 'text-embedding-3-small';
        try {
            const models = caller.getAvailableEmbeddingModels();
            if (models.length > 0) model = models[0];
        } catch { }
        const single = await caller.embeddings({ input: 'hello world', model });
        const dim = single.embeddings[0].embedding.length;
        const batch = await caller.embeddings({ input: ['a', 'b', 'c'], model });
        return { metadata: { dim, count: batch.embeddings.length }, usage: batch.usage };
    },
    judge: async (_ctx, result) => {
        const meta = result.metadata as any;
        const pass = typeof meta?.dim === 'number' && meta.dim > 0 && meta.count === 3;
        return { pass, score: pass ? 1 : 0, reason: pass ? 'Dim > 0 and batch size 3' : 'Invalid dimension or batch size' };
    }
};


