import type { Scenario } from '../types.ts';
import { z } from 'zod';

const UserSchema = z.object({
    name: z.string(),
    hobbies: z.array(z.string()).min(1)
});

export const streamingJson: Scenario = {
    id: 'streaming-json',
    title: 'Streaming JSON with schema',
    requirements: {
        textOutput: { required: true, formats: ['json'] },
        streaming: { required: true }
    },
    run: async ({ caller }) => {
        const stream = await caller.stream('Generate a fictional user with at least 2 hobbies.', {
            jsonSchema: { name: 'User', schema: UserSchema },
            responseFormat: 'json',
            settings: { temperature: 0.3 }
        });

        let chunks = 0;
        let finalText = '';
        let finalObj: unknown;
        let finalUsage;
        for await (const chunk of stream) {
            chunks++;
            if (chunk.isComplete) {
                finalText = chunk.contentText || '';
                finalObj = chunk.contentObject;
                finalUsage = chunk.metadata?.usage;
            }
        }
        const streamed = chunks > 1 && finalText.trim().length > 0;
        return { outputText: finalText, contentObject: finalObj, streamed, usage: finalUsage, metadata: { chunkCount: chunks } };
    },
    judge: async (_ctx, result) => {
        const streamed = Boolean(result.streamed);
        const ok = UserSchema.safeParse(result.contentObject).success;
        const pass = streamed && ok;
        return { pass, score: pass ? 1 : 0, reason: pass ? 'Streamed and schema valid' : 'Not streamed or invalid schema' };
    }
};


