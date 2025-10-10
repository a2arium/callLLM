import type { Scenario } from '../types.ts';

export const jsonRawSchema: Scenario = {
    id: 'json-raw-schema',
    title: 'JSON mode with raw schema string',
    requirements: {
        textOutput: { required: true, formats: ['json'] }
    },
    run: async ({ caller }) => {
        const recipeSchema = {
            type: 'object',
            properties: {
                name: { type: 'string' },
                preparationTime: { type: 'number' },
                difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
                ingredients: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            item: { type: 'string' },
                            amount: { type: 'string' }
                        },
                        required: ['item', 'amount']
                    }
                },
                steps: { type: 'array', items: { type: 'string' } }
            },
            required: ['name', 'preparationTime', 'difficulty', 'ingredients', 'steps']
        };

        const resp = await caller.call('Generate a vegetarian pasta recipe', {
            jsonSchema: { name: 'Recipe', schema: JSON.stringify(recipeSchema) },
            responseFormat: 'json',
            settings: { jsonMode: 'force-prompt', temperature: 0.3 }
        });
        return {
            outputText: resp[0].content ?? undefined,
            contentObject: resp[0].contentObject,
            usage: resp[0].metadata?.usage
        };
    },
    judge: async (_ctx, result) => {
        const obj = result.contentObject as any;
        const hasKeys = obj && typeof obj === 'object' && ['name', 'preparationTime', 'difficulty', 'ingredients', 'steps'].every(k => k in obj);
        return { pass: !!hasKeys, score: hasKeys ? 1 : 0, reason: hasKeys ? 'All keys present' : 'Missing required keys' };
    }
};


