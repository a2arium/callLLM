import type { Scenario } from '../types.ts';
import { z } from 'zod';

const UserSchema = z.object({
    name: z.string(),
    age: z.number(),
    interests: z.array(z.string())
});

// Extra test to ensure sanitizer handles removed fields not lingering in required
const StrictUserSchema = z.object({
    name: z.string().min(1), // minLength should be stripped but hinted
    format: z.string().optional(), // ensure optional field doesn't leak into required
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
        // Run second call to assert sanitizer correctness with tricky fields
        const resp2 = await caller.call('Generate strictly a name string.', {
            jsonSchema: { name: 'StrictUser', schema: StrictUserSchema },
            responseFormat: 'json',
            settings: { temperature: 0.1 }
        });
        const obj2 = resp2[0].contentObject as any;
        return {
            outputText: resp[0].content ?? undefined,
            contentObject: obj,
            strictContentObject: obj2,
            usage: resp[0].metadata?.usage
        };
    },
    judge: async (_ctx, result) => {
        const valid1 = UserSchema.safeParse(result.contentObject).success;
        const valid2 = StrictUserSchema.safeParse(result.strictContentObject).success;
        const pass = valid1 && valid2;
        const reason = pass ? 'Both schemas valid' : (!valid1 ? 'UserSchema invalid' : 'StrictUserSchema invalid');
        return { pass, score: pass ? 1 : 0, reason };
    }
};


