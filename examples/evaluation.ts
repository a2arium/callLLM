import 'dotenv/config';
import { z } from 'zod';
import {
    LLMCaller,
    booleanQuestion,
    choiceQuestion,
    scoreQuestion
} from '../src/index.ts';

const ticket = 'Hi, I have been trying to connect my Stripe account for 3 days and the integration keeps failing. I am losing sales. Please help ASAP.';

const caller = new LLMCaller(
    'vercel',
    { model: 'typesafe-ai/jev' },
    undefined,
    {
        callerId: 'evaluation-example',
        usageCallback: ({ usage }) => {
            console.log('Input tokens:', usage.tokens.input.total);
            console.log('Estimated cost:', usage.costs.total, usage.costs.unit);
        }
    }
);

console.log('--- Literal questions ---');
const literal = await caller.evaluate({
    state: ticket,
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

console.log(JSON.stringify(literal.answers, null, 2));

console.log('\n--- Zod helpers ---');
const TicketEval = z.object({
    isUrgent: booleanQuestion('Does this message express urgency?'),
    department: choiceQuestion('Which team should handle this?', {
        billing: 'Payment or subscription issues',
        technical: 'Bugs or integration problems',
        sales: 'Pricing or account questions'
    }),
    frustration: scoreQuestion('How frustrated the customer appears', [
        'Calm, just stating facts',
        'Frustrated but civil',
        'Very angry, strong language'
    ])
});

const fromZod = await caller.evaluate({
    state: ticket,
    questions: TicketEval
});

console.log(JSON.stringify(fromZod.answers, null, 2));
