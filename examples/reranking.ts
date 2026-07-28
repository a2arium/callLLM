import 'dotenv/config';
import { LLMCaller, type RerankDocument } from '../src/index.ts';

const documents: RerankDocument[] = [
    { type: 'text', id: 'billing', text: 'Download invoices from Billing → Invoices.' },
    { type: 'text', id: 'password', text: 'Reset your password from the sign-in screen.' },
    { type: 'text', id: 'members', text: 'Invite teammates from Workspace → Members.' }
];

const caller = new LLMCaller(
    'siliconflow',
    { model: 'Qwen/Qwen3-Reranker-0.6B' },
    undefined,
    {
        callerId: 'reranking-example',
        usageCallback: ({ usage }) => {
            console.log('Input tokens:', usage.tokens.input.total);
            console.log('Estimated cost:', usage.costs.total, usage.costs.unit);
        }
    }
);

const response = await caller.rerank({
    query: 'How can I change a forgotten password?',
    documents,
    topN: 2
});

for (const result of response.results) {
    console.log({
        id: result.documentId,
        score: result.relevanceScore,
        document: documents[result.index]
    });
}

