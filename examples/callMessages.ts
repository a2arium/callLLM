import { LLMCaller } from '../src/core/caller/LLMCaller.ts';

/**
 * Demonstrates request-scoped transcripts via callMessages().
 *
 * Unlike setMessages() + call(), this API:
 * - accepts the complete transcript atomically (including the current user turn)
 * - never reads or mutates the caller's persistent HistoryManager
 * - does not inject the constructor system prompt
 * - replays the same immutable snapshot on transport retries
 */
async function main() {
    const caller = new LLMCaller('openai', 'gpt-4o-mini', 'Constructor system (not injected by callMessages).');

    // Pre-existing history stays untouched across callMessages.
    caller.setMessages([
        { role: 'system', content: 'Persistent conversation system.' },
        { role: 'user', content: 'Remember: my name is Ada.' },
        { role: 'assistant', content: 'Hello Ada.' }
    ]);
    const historyBefore = caller.getMessages(true);

    const response = await caller.callMessages([
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'What is 1 + 1?' },
        { role: 'assistant', content: '2.' },
        { role: 'user', content: 'And 2 + 2?' }
    ], {
        providerStorage: 'disabled'
    });

    console.log('Assistant:', response[0].content);
    console.log('History unchanged:', JSON.stringify(caller.getMessages(true)) === JSON.stringify(historyBefore));
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
