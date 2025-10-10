import type { Scenario } from '../types.ts';

export const historyDynamic: Scenario = {
    id: 'history-dynamic',
    title: 'Dynamic history truncation',
    requirements: {
        textOutput: { required: true, formats: ['text'] }
    },
    run: async ({ caller }) => {
        await caller.call('Remember: My name is Alex.', { settings: { temperature: 0.2 }, historyMode: 'dynamic' });
        await caller.call('Remember: I like coffee.', { settings: { temperature: 0.2 }, historyMode: 'dynamic' });
        const resp = await caller.call('What is my name and what do I like? Keep it short.', { settings: { temperature: 0.2 }, historyMode: 'dynamic' });
        return { outputText: resp[0].content ?? undefined, usage: resp[0].metadata?.usage };
    },
    judge: async (_ctx, result) => {
        const text = (result.outputText || '').toLowerCase();
        const pass = text.includes('alex') && text.includes('coffee');
        return { pass, score: pass ? 1 : 0.6, reason: pass ? 'Preserved key facts' : 'Missing remembered facts' };
    }
};


