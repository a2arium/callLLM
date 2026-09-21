# Evaluation

Evaluation models (System One) answer typed questions against shared state. They return booleans (probabilities), choices, and scores — not free-form text. This is separate from chat [structured output](structured-output.md).

On Vercel AI Gateway, Jev is available as `typesafe-ai/jev` through `caller.evaluate()`.

## Basic evaluation

```ts
import { LLMCaller } from 'callllm';

const caller = new LLMCaller('vercel', { model: 'typesafe-ai/jev' });

const result = await caller.evaluate({
  state: 'I was charged twice. Please refund the duplicate.',
  questions: {
    refund: {
      type: 'boolean',
      instructions: 'Is the customer asking for money back?'
    },
    team: {
      type: 'choice',
      instructions: 'Which team should handle this?',
      criteria: {
        billing: 'Charges and refunds',
        technical: 'Bugs and outages'
      }
    }
  }
});

console.log(result.answers.refund.probability);
console.log(result.answers.team.choice);
```

Run the full example:

```bash
yarn example:evaluation
```

See [`examples/evaluation.ts`](../../examples/evaluation.ts).

## Question helpers and Zod

Helpers build the three question primitives. The same helpers can be composed into a Zod object that compiles to the wire questions map (arbitrary `z.string()` / nested object schemas are rejected):

```ts
import { z } from 'zod';
import { LLMCaller, booleanQuestion, choiceQuestion, scoreQuestion } from 'callllm';

const TicketEval = z.object({
  isUrgent: booleanQuestion('Does this message express urgency?'),
  department: choiceQuestion('Which team should handle this?', {
    billing: 'Payment issues',
    technical: 'Bugs or integrations',
    sales: 'Pricing'
  }),
  frustration: scoreQuestion('How frustrated the customer appears', [
    'Calm',
    'Frustrated but civil',
    'Very angry'
  ])
});

const caller = new LLMCaller('vercel', { model: 'typesafe-ai/jev' });
const result = await caller.evaluate({
  state: ticketText,
  questions: TicketEval
});
```

## Model selection

Presets and policies resolve against `capabilities.evaluation` and the provider `evaluateCall` interface. Chat and embedding models are never selected for evaluation merely because they accept text.

```ts
caller.getAvailableEvaluationModels();
caller.checkEvaluationCapabilities('typesafe-ai/jev');
```

## Gateway options

Pass AI Gateway routing / ZDR flags under `settings.providerOptions.gateway`, same as chat:

```ts
await caller.evaluate({
  state: ticketText,
  questions: { refund: { type: 'boolean', instructions: 'Refund requested?' } },
  settings: {
    providerOptions: {
      gateway: { zeroDataRetention: true }
    }
  }
});
```
