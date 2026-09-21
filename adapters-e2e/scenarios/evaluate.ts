import type { Scenario } from '../types.ts';

export const evaluateScenario: Scenario = {
    id: 'evaluate',
    title: 'System One evaluation (boolean/choice/score)',
    requirements: {
        evaluation: { required: true }
    },
    run: async ({ caller, model }) => {
        const response = await caller.evaluate({
            model,
            state: 'Hi, I have been trying to connect my Stripe account for 3 days and the integration keeps failing. I am losing sales. Please help ASAP.',
            questions: {
                isUrgent: {
                    type: 'boolean',
                    instructions: 'Does this message express urgency?',
                    criteria: {
                        true: 'Explicitly time-sensitive',
                        false: 'No urgency expressed'
                    }
                },
                department: {
                    type: 'choice',
                    instructions: 'Which team should handle this?',
                    criteria: {
                        billing: 'Payment or subscription issues',
                        technical: 'Bugs or integration problems',
                        sales: 'Pricing or account questions'
                    }
                },
                frustration: {
                    type: 'score',
                    instructions: 'How frustrated the customer appears',
                    criteria: [
                        'Calm, just stating facts',
                        'Frustrated but civil',
                        'Very angry, strong language'
                    ]
                }
            }
        });

        return {
            usage: response.usage,
            metadata: {
                answers: response.answers,
                provider: response.metadata?.provider,
                model: response.metadata?.model
            }
        };
    },
    judge: async (_ctx, result) => {
        const answers = (result.metadata?.answers ?? {}) as Record<string, {
            type?: string;
            probability?: number;
            choice?: string;
            score?: number;
        }>;
        const isUrgent = answers.isUrgent;
        const department = answers.department;
        const frustration = answers.frustration;
        const structural = isUrgent?.type === 'boolean'
            && typeof isUrgent.probability === 'number'
            && isUrgent.probability >= 0
            && isUrgent.probability <= 1
            && department?.type === 'choice'
            && typeof department.choice === 'string'
            && frustration?.type === 'score'
            && typeof frustration.score === 'number'
            && (result.usage?.tokens.input.total ?? 0) > 0;
        const pass = structural
            && isUrgent.probability! >= 0.5
            && department.choice === 'technical';
        return {
            pass,
            score: pass ? 1 : structural ? 0.5 : 0,
            reason: pass
                ? 'Evaluation returned urgent technical ticket with valid usage'
                : 'Invalid evaluation answers or relevance'
        };
    }
};
