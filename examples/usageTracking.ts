import { LLMCaller } from '../src/core/caller/LLMCaller';
import { UsageData } from '../src/interfaces/UsageInterfaces';

async function main() {
    // Example usage callback
    const usageCallback = (usageData: UsageData) => {
        console.log(`Usage for caller ${usageData.callerId}:`, {
            costs: usageData.usage.costs,
            tokens: {
                input: usageData.usage.inputTokens,
                output: usageData.usage.outputTokens,
                total: usageData.usage.totalTokens
            },
            timestamp: new Date(usageData.timestamp).toISOString()
        });
    };

    const caller = new LLMCaller('openai', 'cheap', 'You are a helpful assistant.', {
        callerId: 'my-custom-id', // Optional, if not provided, a random UUID will be generated
        usageCallback
    });

    // Make some calls
    await caller.chatCall({
        message: 'Hello, how are you?'
    });

    // Change the caller ID midway
    caller.setCallerId('different-conversation');

    await caller.chatCall({
        message: 'What is the weather like?'
    });

    // Example streaming call with usageCallback
    caller.setCallerId('streaming-conversation');
    console.log('\nTesting streaming call with usage tracking...');
    const stream = await caller.streamCall({
        message: 'Tell me a story about a programmer.',
        settings: {
            temperature: 0.9,
            maxTokens: 500
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
}

main(); 