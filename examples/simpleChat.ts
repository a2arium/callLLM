import { LLMCaller } from '../src/core/caller/LLMCaller';

async function main() {
    // Initialize the caller with OpenAI
    const caller = new LLMCaller('openai', 'gpt-4o-mini', 'You are a helpful assistant.');

    try {
        // Test regular chat call
        console.log('Testing chat call...');
        const response = await caller.chatCall({
            message: 'What is TypeScript and why should I use it?',
            settings: {
                temperature: 0.7,
                maxTokens: 500
            }
        });
        console.log('\nChat Response:', response.content);
        console.log('\nUsage Information:');
        console.log('Input Tokens:', response.metadata?.usage?.inputTokens);
        console.log('Output Tokens:', response.metadata?.usage?.outputTokens);
        console.log('Total Tokens:', response.metadata?.usage?.totalTokens);
        console.log('Costs:', response.metadata?.usage?.costs);

        // Test streaming call
        console.log('\nTesting streaming call...');
        const stream = await caller.streamCall({
            message: 'Tell me a short story about a programmer.',
            settings: {
                temperature: 0.9,
                maxTokens: 300
            }
        });

        console.log('\nStream Response:');
        let lastUsage;
        for await (const chunk of stream) {
            process.stdout.write(chunk.content);
            lastUsage = chunk.metadata?.usage;
        }
        console.log('\n\nFinal Usage Information:');
        console.log('Input Tokens:', lastUsage?.inputTokens);
        console.log('Output Tokens:', lastUsage?.outputTokens);
        console.log('Total Tokens:', lastUsage?.totalTokens);
        console.log('Costs:', lastUsage?.costs);

    } catch (error) {
        console.error('Error:', error);
    }
}

main(); 