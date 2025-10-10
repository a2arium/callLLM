import type { Scenario } from '../types.ts';
import { judgeFromOutputText } from '../judge.ts';

export const simpleChat: Scenario = {
    id: 'simple-chat',
    title: 'Simple chat',
    requirements: {
        textOutput: { required: true, formats: ['text'] }
    },
    run: async ({ caller }) => {
        const resp = await caller.call('What is TypeScript and why should I use it?', {
            settings: { temperature: 0.2 }
        });
        return {
            outputText: resp[0].content ?? undefined,
            usage: resp[0].metadata?.usage
        };
    },
    judge: async (_ctx, result) => {
        return judgeFromOutputText(result.outputText, ['TypeScript', 'type', 'JavaScript', 'safety', 'tooling']);
    }
};


