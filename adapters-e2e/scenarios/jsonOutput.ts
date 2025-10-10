import type { Scenario } from '../types.ts';
import { z } from 'zod';

const UserSchema = z.object({
    name: z.string(),
    age: z.number(),
    interests: z.array(z.string())
});

export const jsonOutput: Scenario = {
    id: 'json-output',
    title: 'JSON mode with schema',
    requirements: {
        textOutput: { required: true, formats: ['json'] }
    },
    run: async ({ caller }) => {
        const resp = await caller.call('Generate a user profile for a fictional person who loves technology.', {
            jsonSchema: { name: 'UserProfile', schema: UserSchema },
            responseFormat: 'json',
            settings: { temperature: 0.3 }
        });
        const obj = resp[0].contentObject as any;
        return {
            outputText: resp[0].content ?? undefined,
            contentObject: obj,
            usage: resp[0].metadata?.usage
        };
    },
    judge: async (_ctx, result) => {
        const valid = UserSchema.safeParse(result.contentObject).success;
        return { pass: valid, score: valid ? 1 : 0, reason: valid ? 'Schema valid' : 'Schema invalid' };
    }
};


