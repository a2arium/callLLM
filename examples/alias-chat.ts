import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env file from:', envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
    console.error('Error loading .env file:', result.error.message);
} else {
    console.log('Environment variables loaded successfully');
}

import { LLMCaller } from '../src/core/LLMCaller';

async function runAliasExample() {
    // Initialize LLMCaller with different aliases
    console.log('\nTesting different model aliases:');
    console.log('Using API key:', process.env.OPENAI_API_KEY ? 'Found' : 'Not found');
    if (process.env.OPENAI_API_KEY) {
        console.log('API key length:', process.env.OPENAI_API_KEY.length);
    }

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
    const chatResponse = await balancedCaller.chatCall({
        message: 'What is the weather like today?'
    });
    console.log('\nChat Response:', chatResponse.content);

    const stream = await balancedCaller.streamCall({
        message: 'Tell me a joke.'
    });
    console.log('\nStream Response:');
    for await (const chunk of stream) {
        process.stdout.write(chunk.content);
    }
    console.log('\n');
}

runAliasExample().catch(console.error); 