import { describe, expect, it } from '@jest/globals';
import { z } from 'zod';
import {
    booleanQuestion,
    choiceQuestion,
    compileEvaluateQuestions,
    normalizeEvaluateQuestions,
    scoreQuestion
} from '@/core/evaluate/questions.ts';
import { EvaluateController } from '@/core/evaluate/EvaluateController.ts';
import type { BaseAdapter } from '@/adapters/base/baseAdapter.ts';
import type { EvaluateParams, EvaluateResponse } from '@/interfaces/UniversalInterfaces.ts';

describe('evaluate question helpers', () => {
    it('builds plain questions via helpers and compiles Zod objects', () => {
        const schema = z.object({
            refund: booleanQuestion('Is a refund requested?'),
            team: choiceQuestion('Which team?', {
                billing: 'charges',
                technical: 'bugs'
            }),
            urgency: scoreQuestion('How urgent?', ['low', 'medium', 'high'])
        });

        const questions = compileEvaluateQuestions(schema);
        expect(questions).toEqual({
            refund: {
                type: 'boolean',
                instructions: 'Is a refund requested?'
            },
            team: {
                type: 'choice',
                instructions: 'Which team?',
                criteria: { billing: 'charges', technical: 'bugs' }
            },
            urgency: {
                type: 'score',
                instructions: 'How urgent?',
                criteria: ['low', 'medium', 'high']
            }
        });
    });

    it('normalizes mixed helper and plain question maps', () => {
        const questions = normalizeEvaluateQuestions({
            a: booleanQuestion('yes?'),
            b: {
                type: 'choice',
                instructions: 'pick',
                criteria: { x: 'X', y: 'Y' }
            }
        });
        expect(questions.a.type).toBe('boolean');
        expect(questions.b.type).toBe('choice');
    });

    it('rejects generic Zod fields', () => {
        expect(() => compileEvaluateQuestions(z.object({
            name: z.string()
        }))).toThrow(/booleanQuestion/);
    });
});

describe('EvaluateController', () => {
    it('validates questions and answers through evaluateCall', async () => {
        const evaluateCall = async (
            _model: string,
            params: EvaluateParams
        ): Promise<EvaluateResponse> => ({
            model: 'typesafe-ai/jev',
            answers: {
                refund: { type: 'boolean', probability: 0.9 }
            },
            usage: {
                tokens: {
                    input: { total: 10, cached: 0 },
                    output: { total: 2, reasoning: 0 },
                    total: 12
                },
                costs: {
                    input: { total: 0, cached: 0 },
                    output: { total: 0, reasoning: 0 },
                    total: 0,
                    unit: 'USD'
                }
            }
        });

        const adapter = { evaluateCall } as unknown as BaseAdapter;
        const controller = new EvaluateController(adapter);
        const response = await controller.evaluate('typesafe-ai/jev', {
            state: 'Please refund me',
            questions: {
                refund: { type: 'boolean', instructions: 'Is a refund requested?' }
            }
        });
        expect(response.answers.refund).toEqual({ type: 'boolean', probability: 0.9 });
    });

    it('rejects score questions with fewer than two levels', async () => {
        const adapter = {
            evaluateCall: async () => {
                throw new Error('should not call');
            }
        } as unknown as BaseAdapter;
        const controller = new EvaluateController(adapter);
        await expect(controller.evaluate('typesafe-ai/jev', {
            state: 'x',
            questions: {
                // @ts-expect-error intentional invalid criteria length
                bad: { type: 'score', instructions: 'rate', criteria: ['only-one'] }
            }
        })).rejects.toThrow(/at least two/);
    });
});
