import type { Scenario } from '../types.ts';

export const reasoningScenario: Scenario = {
    id: 'reasoning',
    title: 'Reasoning model (minimal effort)',
    requirements: {
        textOutput: { required: true, formats: ['text'] }
    },
    run: async ({ caller }) => {
        const resp = await caller.call('Solve: If x + 3 = 7, what is x? Show concise reasoning.', {
            settings: { reasoning: { effort: 'minimal' }, temperature: 0.2 }
        });
        return {
            outputText: resp[0].content ?? undefined,
            usage: resp[0].metadata?.usage
        };
    },
    judge: async (_ctx, result) => {
        const text = (result.outputText || '').toLowerCase();
        const pass = text.includes('x = 4') || text.includes('x=4') || text.includes('4');
        return { pass, score: pass ? 1 : 0.5, reason: pass ? 'Contains correct answer 4' : 'Missing explicit 4' };
    }
};


