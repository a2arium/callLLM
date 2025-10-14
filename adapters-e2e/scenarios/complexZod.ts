import type { Scenario } from '../types.ts';
import { z } from 'zod';

// Complex Zod 
const UpdateOp = z.enum(['set', 'unset']);
const Update = z.object({
    path: z.string().min(1),
    op: UpdateOp,
    value: z.any().optional(),
    confidence: z.number().min(0).max(1),
    requiresConfirmation: z.boolean().optional(),
});

const Audit = z.object({
    inputLanguage: z.string().optional(),
    assumptions: z.array(z.string()).optional(),
}).optional();

const ExtractorPayload = z.object({
    updates: z.array(Update).default([]),
    audit: Audit,
    assistant_message: z.union([
        z.object({
            type: z.literal('text'),
            text: z.string().min(1),
            format: z.literal('markdown')
        }).describe('Use to send a text message to the user'),
        z.object({
            type: z.literal('markup'),
            value: z.object({
                kind: z.literal('buttons'),
                prompt: z.string().min(1),
                buttons: z.array(z.object({
                    title: z.string().min(1).describe('The text of the button in the free form, derived from payload. Update for better readability, but keep short.'),
                    payload: z.record(z.string(), z.unknown()).describe('The data that will be sent when the button is pressed. Should satisfy the JSON schema.')
                })).min(1).max(6)
            })
        }).describe('Use when user needs to pick an option from a list or boolean')
    ]),
});

export const complexZod: Scenario = {
    id: 'complex-zod',
    title: 'Structured output with complex Zod',
    requirements: {
        textOutput: { required: true, formats: ['json'] }
    },
    run: async ({ caller }) => {
        const resp = await caller.call('Return a valid JSON object for ExtractorPayload.', {
            jsonSchema: { name: 'ExtractorPayload', schema: ExtractorPayload },
            responseFormat: 'json',
            settings: { temperature: 0.1 }
        });
        return {
            outputText: resp[0].content ?? undefined,
            contentObject: resp[0].contentObject,
            usage: resp[0].metadata?.usage
        };
    },
    judge: async (_ctx, result) => {
        const parsed = ExtractorPayload.safeParse(result.contentObject);
        if (parsed.success) {
            return { pass: true, score: 1, reason: 'Schema valid' };
        }
        const issues = (parsed as any).error?.issues || [];
        const details = issues.slice(0, 8).map((i: any) => {
            const path = Array.isArray(i.path) ? i.path.join('.') : String(i.path ?? '');
            return `${path}: ${i.message}`;
        });
        const preview = typeof result.outputText === 'string' ? result.outputText.slice(0, 300) : '';
        const reason = `Schema invalid. Issues: ${details.join(' | ')}${preview ? ` | output preview: ${preview}` : ''}`;
        return { pass: false, score: 0, reason };
    }
};


