import { LLMCaller } from '../src/core/caller/LLMCaller.ts';
import type { RegisteredProviders } from '../src/adapters/index.ts';
import type { Judgement } from './types.ts';
import { z } from 'zod';

const JudgementSchema = z.object({
    pass: z.boolean(),
    score: z.number().min(0).max(1),
    reason: z.string()
});

export async function judgeWithLLM(params: {
    provider?: RegisteredProviders; // defaults to 'openai'
    modelOrAlias?: string;          // defaults to 'premium'
    system?: string;
    prompt: string;
}): Promise<Judgement> {
    const provider = params.provider ?? 'openai';
    const modelOrAlias = params.modelOrAlias ?? 'premium';
    const caller = new LLMCaller(provider, modelOrAlias, params.system ?? 'You are a precise evaluator that returns only valid JSON per the schema.');
    const resp = await caller.call(params.prompt, {
        jsonSchema: { name: 'Judgement', schema: JudgementSchema },
        responseFormat: 'json',
        settings: { temperature: 0 }
    });

    const contentObj = resp[0].contentObject as unknown;
    const parsed = JudgementSchema.safeParse(contentObj);
    if (!parsed.success) {
        return { pass: false, score: 0, reason: 'Invalid judge output' };
    }
    return parsed.data;
}

export function judgeFromOutputText(outputText: string | undefined, keywords: string[], minMatches = Math.max(1, Math.ceil(keywords.length / 2))): Judgement {
    const text = (outputText ?? '').toLowerCase();
    const matches = keywords.filter(k => text.includes(k.toLowerCase())).length;
    const pass = matches >= minMatches;
    const score = Math.min(1, matches / Math.max(1, keywords.length));
    return { pass, score, reason: `Matched ${matches}/${keywords.length} keywords` };
}


