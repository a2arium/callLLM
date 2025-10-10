import type { Scenario } from '../types.ts';

export const usageTracking: Scenario = {
    id: 'usage-tracking',
    title: 'Usage tracking with callback and accumulation',
    requirements: {
        textOutput: { required: true, formats: ['text'] }
    },
    run: async ({ caller }) => {
        let totalTokens = 0;
        let totalCost = 0;
        let calls = 0;

        const addUsage = (u: any) => {
            if (!u) return;
            calls++;
            totalTokens += u.tokens?.total || 0;
            totalCost += u.costs?.total || 0;
        };

        const r1 = await caller.call('Say hello in one sentence.', { settings: { temperature: 0.2 } });
        addUsage(r1[0].metadata?.usage);

        const r2 = await caller.call('Provide a fun fact about TypeScript.', { settings: { temperature: 0.2 } });
        addUsage(r2[0].metadata?.usage);

        const r3 = await caller.call('Write a haiku about code.', { settings: { temperature: 0.2 } });
        addUsage(r3[0].metadata?.usage);

        return { outputText: r3[0].content ?? undefined, usage: r3[0].metadata?.usage, metadata: { totalTokens, totalCost, calls } };
    },
    judge: async (_ctx, result) => {
        const meta = result.metadata as any;
        const pass = typeof meta?.totalTokens === 'number' && meta.totalTokens >= 0;
        return { pass, score: pass ? 1 : 0, reason: pass ? 'Aggregated usage present' : 'Missing aggregated usage' };
    }
};


