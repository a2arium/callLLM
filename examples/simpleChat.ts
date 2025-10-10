import { LLMCaller } from '../src/core/caller/LLMCaller.ts';

async function main() {
    // Initialize the caller with OpenAI
    const caller = new LLMCaller('openai', 'fast');

    try {
        // Test regular chat call
        console.log('Testing chat call...');
        const response = await caller.call(
            'What is TypeScript and why should I use it?',
            {
                settings: {
                    verbosity: 'low'
                }
            }
        );
        console.log('\nChat Response:', response[0].content);
        console.log('\nUsage Information:');
        console.log('Tokens:', response[0].metadata?.usage?.tokens);
        console.log('Costs:', response[0].metadata?.usage?.costs);

        // Test streaming call
        console.log('\nTesting streaming call...');
        const stream = await caller.stream(
            'Tell me a short story about a programmer.',
            {
                settings: {
                    verbosity: 'low',
                    temperature: 0.9
                }
            }
        );

        console.log('\nStream Response:');
        let lastUsage;
        for await (const chunk of stream) {
            // For incremental chunks (not the final one)
            if (!chunk.isComplete) {
                // Display content as it comes in
                process.stdout.write(chunk.content);
            } else {
                // For the final chunk, we can access the complete accumulated text
                console.log('\n\nComplete response text:');
                console.log(chunk.contentText);
            }

            // Track usage information for final reporting
            lastUsage = chunk.metadata?.usage;
        }
        console.log('\n\nFinal Usage Information:');
        console.log('Tokens:', lastUsage?.tokens);
        console.log('Costs:', lastUsage?.costs);

    } catch (error) {
        console.error('Error:', error);
    }
}

main().catch(console.error); 