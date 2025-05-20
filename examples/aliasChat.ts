import { LLMCaller } from '../src/core/caller/LLMCaller.js';

async function runAliasExample() {
    // Initialize LLMCaller with different aliases
    console.log('\nTesting different model aliases:');


    // Fast model
    const fastCaller = new LLMCaller('openai', 'fast', 'You are a helpful assistant.');
    console.log('\nFast Model:', fastCaller.getModel('fast'));

    // Premium model
    const premiumCaller = new LLMCaller('openai', 'premium', 'You are a helpful assistant.');
    console.log('\nPremium Model:', premiumCaller.getModel('premium'));

    // Balanced model
    const balancedCaller = new LLMCaller('openai', 'balanced', 'You are a helpful assistant.');
    console.log('\nBalanced Model:', balancedCaller.getModel('balanced'));

    // Cheap model
    const cheapCaller = new LLMCaller('openai', 'cheap', 'You are a helpful assistant.');
    console.log('\nCheap Model:', cheapCaller.getModel('cheap'));

    // Make calls using the balanced model
    console.log('\nMaking calls with balanced model:');
    const chatResponse = await balancedCaller.call('What is the weather like today?');
    console.log('\nChat Response:', chatResponse[0].content);

    const stream = await balancedCaller.stream('Tell me a joke.');
    console.log('\nStream Response:');
    for await (const chunk of stream) {
        process.stdout.write(chunk.content);
    }
    console.log('\n');
}

runAliasExample().catch(console.error); 