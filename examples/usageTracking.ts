import { LLMCaller } from '../src/core/caller/LLMCaller.ts';
import type { UsageData } from '../src/interfaces/UsageInterfaces.ts';

async function main() {
    // Example usage callback
    const usageCallback = (usageData: UsageData) => {
        console.log(`Usage for caller ${usageData.callerId}:`, {
            costs: usageData.usage.costs,
            tokens: usageData.usage.tokens,
            timestamp: new Date(usageData.timestamp).toISOString()
        });
    };

    const caller = new LLMCaller('openai', 'gpt-5-mini', 'You are a helpful assistant.', {
        callerId: 'my-custom-id', // Optional, if not provided, a random UUID will be generated
        usageCallback
    });

    // Make some calls
    await caller.call('Hello, how are you?');

    // Change the caller ID midway
    caller.setCallerId('different-conversation');

    const response = await caller.call('What is the weather like?');

    console.log('\nChat Response:', response[0].content);
    console.log('\nUsage Information:');
    if (response[0].metadata?.usage) {
        console.log('Usage Stats:');
        console.log('Input Tokens:', response[0].metadata.usage.tokens.input.total);
        console.log('Input Cached Tokens:', response[0].metadata.usage.tokens.input.cached);
        console.log('Output Tokens:', response[0].metadata.usage.tokens.output.total);
        console.log('Output Reasoning Tokens:', response[0].metadata.usage.tokens.output.reasoning);
        console.log('Total Tokens:', response[0].metadata.usage.tokens.total);
        console.log('Costs:', response[0].metadata.usage.costs);
    }

    // Example streaming call with usageCallback
    caller.setCallerId('streaming-conversation');
    console.log('\nTesting streaming call with usage tracking...');
    const stream = await caller.stream(
        'Tell me a story about a programmer.',
        {
            settings: {
                temperature: 0.9,
                maxTokens: 500
            },
            usageBatchSize: 50
        }
    );

    console.log('\nStream Response:');
    let finalUsage;
    for await (const chunk of stream) {
        // Display incremental content
        process.stdout.write(chunk.content);

        // Keep track of the latest usage information
        if (chunk.metadata?.usage) {
            finalUsage = chunk.metadata.usage;
        }
    }

    if (finalUsage) {
        console.log('\n\nFinal Usage Information:');
        console.log('Usage Stats:');
        console.log('Input Tokens:', finalUsage.tokens.input.total);
        console.log('Input Cached Tokens:', finalUsage.tokens.input.cached);
        console.log('Output Tokens:', finalUsage.tokens.output.total);
        console.log('Total Tokens:', finalUsage.tokens.total);
        console.log('Costs:', finalUsage.costs);
    }
}

main().catch(console.error); 