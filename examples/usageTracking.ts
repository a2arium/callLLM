import { LLMCaller } from '../src/core/caller/LLMCaller';
import { UsageData } from '../src/interfaces/UsageInterfaces';

async function main() {
    // Example usage callback
    const usageCallback = (usageData: UsageData) => {
        console.log(`Usage for caller ${usageData.callerId}:`, {
            costs: usageData.usage.costs,
            tokens: usageData.usage.tokens,
            timestamp: new Date(usageData.timestamp).toISOString()
        });
    };

    const caller = new LLMCaller('openai', 'cheap', 'You are a helpful assistant.', {
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
        console.log('Input Tokens:', response[0].metadata.usage.tokens.input);
        console.log('Input Cached Tokens:', response[0].metadata.usage.tokens.inputCached);
        console.log('Output Tokens:', response[0].metadata.usage.tokens.output);
        console.log('Output Reasoning Tokens:', response[0].metadata.usage.tokens.outputReasoning);
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
            }
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
        console.log('Input Tokens:', finalUsage.tokens.input);
        console.log('Input Cached Tokens:', finalUsage.tokens.inputCached);
        console.log('Output Tokens:', finalUsage.tokens.output);
        console.log('Total Tokens:', finalUsage.tokens.total);
        console.log('Costs:', finalUsage.costs);
    }
}

main().catch(console.error); 