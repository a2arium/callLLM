import { LLMCaller } from '../src/core/caller/LLMCaller.ts';
import { RegisteredProviders } from '../src/adapters/index.ts';

/**
 * This example demonstrates the different history modes available in the LLMCaller:
 * 
 * 1. Full - Send all historical messages to the model (default)
 * 2. Dynamic - Intelligently truncate history if it exceeds the model's token limit
 * 3. Stateless - Only send system message and current user message to model,
 *    then reset history state after each call
 * 
 * Each mode is demonstrated with a separate LLMCaller instance for clarity.
 */
async function runHistoryModeExample() {
    console.log('═════════════════════════════════════════');
    console.log('║        HISTORY MODES EXAMPLES         ║');
    console.log('═════════════════════════════════════════\n');

    // ────────────────────────────────────────────────────────────────────────
    // FULL HISTORY MODE EXAMPLE 
    // ────────────────────────────────────────────────────────────────────────
    console.log('┌────────────────────────────────────────┐');
    console.log('│         FULL HISTORY MODE              │');
    console.log('└────────────────────────────────────────┘');

    // Create an LLM caller instance with  'Full' mode
    const fullModeCaller = new LLMCaller(
        'openai' as RegisteredProviders,
        'cheap',
        'You are a helpful assistant that remembers the conversation context.',
        {
            apiKey: process.env.OPENAI_API_KEY,
            historyMode: 'full' // Explicitly set 
        }
    );

    console.log('\n[1] Initial question:');
    const response1 = await fullModeCaller.call('What is the capital of France?');
    console.log(`User: What is the capital of France?`);
    console.log(`Assistant: ${response1[0].content}`);

    console.log('\n[2] Follow-up question:');
    const response2 = await fullModeCaller.call('What is its population?');
    console.log(`User: What is its population?`);
    console.log(`Assistant: ${response2[0].content}`);

    console.log('\n[3] Another follow-up question:');
    const response3 = await fullModeCaller.call('Name three famous landmarks there.');
    console.log(`User: Name three famous landmarks there.`);
    console.log(`Assistant: ${response3[0].content}`);

    console.log('\nHistory after Full mode conversation:');
    const fullModeHistory = fullModeCaller.getHistoricalMessages();
    fullModeHistory.forEach(msg => {
        console.log(`- ${msg.role}: ${msg.content}`);
    });

    console.log('\n✓ Full mode sends ALL previous messages to the model');
    console.log('✓ The model maintains complete conversation context');
    console.log('✓ Best for short to medium-length conversations\n');

    // ────────────────────────────────────────────────────────────────────────
    // FULL HISTORY STREAMING MODE EXAMPLE
    // ────────────────────────────────────────────────────────────────────────
    console.log('┌────────────────────────────────────────┐');
    console.log('│      FULL HISTORY STREAMING MODE       │');
    console.log('└────────────────────────────────────────┘');

    // Create a new LLM caller instance with 'Full' mode for streaming
    const fullStreamingCaller = new LLMCaller(
        'openai' as RegisteredProviders,
        'cheap',
        'You are a helpful assistant that remembers the conversation context.',
        {
            apiKey: process.env.OPENAI_API_KEY,
            historyMode: 'full' // Using Full mode for streaming
        }
    );

    console.log('\n[1] Initial streaming question:');
    console.log(`User: What is the capital of Italy?`);
    console.log(`Assistant (streaming): `);

    // Process streaming chunks for first question
    let fullStreamContent1 = '';
    const fullStream1 = await fullStreamingCaller.stream('What is the capital of Italy?');
    for await (const chunk of fullStream1) {
        process.stdout.write(chunk.content);
        fullStreamContent1 += chunk.contentText || '';
    }
    console.log('\n');

    console.log('\n[2] Follow-up streaming question with pronoun:');
    console.log(`User: What is its population?`);
    console.log(`Assistant (streaming): `);

    // Process streaming chunks for second question
    let fullStreamContent2 = '';
    const fullStream2 = await fullStreamingCaller.stream('What is its population?');
    for await (const chunk of fullStream2) {
        process.stdout.write(chunk.content);
        fullStreamContent2 += chunk.contentText || '';
    }
    console.log('\n');

    console.log('\n[3] Another follow-up streaming question:');
    console.log(`User: Name three famous landmarks there.`);
    console.log(`Assistant (streaming): `);

    // Process streaming chunks for third question
    let fullStreamContent3 = '';
    const fullStream3 = await fullStreamingCaller.stream('Name three famous landmarks there.');
    for await (const chunk of fullStream3) {
        process.stdout.write(chunk.content);
        fullStreamContent3 += chunk.contentText || '';
    }
    console.log('\n');

    console.log('\nHistory after Full History streaming mode conversation:');
    const fullStreamingHistory = fullStreamingCaller.getHistoricalMessages();
    fullStreamingHistory.forEach(msg => {
        console.log(`- ${msg.role}: ${msg.content}`);
    });

    console.log('\n✓ Full streaming mode combines streaming with complete history context');
    console.log('✓ Response content arrives in real-time chunks for responsive UI experiences');
    console.log('✓ Each streaming request retains full conversation context from previous exchanges');
    console.log('✓ History state is preserved for follow-up questions with pronouns or references');
    console.log('✓ Ideal for interactive experiences where context continuity is important\n');

    // ────────────────────────────────────────────────────────────────────────
    // STATELESS MODE EXAMPLE
    // ────────────────────────────────────────────────────────────────────────
    console.log('┌────────────────────────────────────────┐');
    console.log('│         STATELESS HISTORY MODE         │');
    console.log('└────────────────────────────────────────┘');

    // Create a new LLM caller instance with 'Stateless' mode
    const statelessCaller = new LLMCaller(
        'openai' as RegisteredProviders,
        'cheap',
        'You are a helpful assistant that focuses on the current question.',
        {
            apiKey: process.env.OPENAI_API_KEY,
            historyMode: 'stateless'  // It is default so may not set it up
        }
    );

    console.log('\n[1] Initial question:');
    const stateless1 = await statelessCaller.call('What is the capital of France?');
    console.log(`User: What is the capital of France?`);
    console.log(`Assistant: ${stateless1[0].content}`);

    // Log what was sent to the model
    console.log('\nMessages sent to model in Stateless mode (first call):');
    console.log('- system: You are a helpful assistant that focuses on the current question.');
    console.log('- user: What is the capital of France?');

    console.log('\n[2] Follow-up question with pronoun:');
    const stateless2 = await statelessCaller.call('What is its population?');
    console.log(`User: What is its population?`);
    console.log(`Assistant: ${stateless2[0].content}`);

    // Log what was sent to the model - proving no context
    console.log('\nMessages sent to model in Stateless mode (second call):');
    console.log('- system: You are a helpful assistant that focuses on the current question.');
    console.log('- user: What is its population?');
    console.log('NOTE: The model does not know what "its" refers to, as previous question about France is not included!');

    console.log('\n[3] Another follow-up question:');
    const stateless3 = await statelessCaller.call('Name three famous landmarks in the place mentioned above.');
    console.log(`User: Name three famous landmarks in the place mentioned above.`);
    console.log(`Assistant: ${stateless3[0].content}`);

    // Log what was sent to the model - proving no context
    console.log('\nMessages sent to model in Stateless mode (third call):');
    console.log('- system: You are a helpful assistant that focuses on the current question.');
    console.log('- user: Name three famous landmarks in the place mentioned above.');
    console.log('NOTE: The model does not know what "above" refers to, as previous context is not included!');

    console.log('\nHistory after Stateless mode conversation:');
    const statelessHistory = statelessCaller.getHistoricalMessages();
    statelessHistory.forEach(msg => {
        console.log(`- ${msg.role}: ${msg.content}`);
    });

    console.log('\n✓ Stateless mode only sends the system message and current question');
    console.log('✓ The model cannot reference previous questions or answers');
    console.log('✓ If your question contains pronouns like "it", "that", or "there", the model won\'t have context');
    console.log('✓ Each question is treated independently as if no previous conversation occurred');
    console.log('✓ Best for independent questions or to avoid context contamination');
    console.log('✓ Most token-efficient option');
    console.log('✓ Internal history state is reset after each call, ensuring true statelessness\n');

    // ────────────────────────────────────────────────────────────────────────
    // STATELESS STREAMING MODE EXAMPLE
    // ────────────────────────────────────────────────────────────────────────
    console.log('┌────────────────────────────────────────┐');
    console.log('│      STATELESS STREAMING MODE          │');
    console.log('└────────────────────────────────────────┘');

    // Create a new LLM caller instance with 'Stateless' mode
    const statelessStreamingCaller = new LLMCaller(
        'openai' as RegisteredProviders,
        'cheap',
        'You are a helpful assistant that focuses on the current question.',
        {
            apiKey: process.env.OPENAI_API_KEY,
            historyMode: 'stateless'
        }
    );

    console.log('\n[1] Initial streaming question:');
    console.log(`User: What is the capital of Japan?`);
    console.log(`Assistant (streaming): `);

    // Process streaming chunks for first question
    let statelessStreamContent1 = '';
    const statelessStream1 = await statelessStreamingCaller.stream('What is the capital of Japan?');
    for await (const chunk of statelessStream1) {
        process.stdout.write(chunk.content);
        statelessStreamContent1 += chunk.contentText || '';
    }
    console.log('\n');

    // Log what was sent to the model
    console.log('\nMessages sent to model in Stateless streaming mode (first call):');
    console.log('- system: You are a helpful assistant that focuses on the current question.');
    console.log('- user: What is the capital of Japan?');

    console.log('\n[2] Follow-up streaming question with pronoun:');
    console.log(`User: What is its population?`);
    console.log(`Assistant (streaming): `);

    // Process streaming chunks for second question
    let statelessStreamContent2 = '';
    const statelessStream2 = await statelessStreamingCaller.stream('What is its population?');
    for await (const chunk of statelessStream2) {
        process.stdout.write(chunk.content);
        statelessStreamContent2 += chunk.contentText || '';
    }
    console.log('\n');

    // Log what was sent to the model - proving no context
    console.log('\nMessages sent to model in Stateless streaming mode (second call):');
    console.log('- system: You are a helpful assistant that focuses on the current question.');
    console.log('- user: What is its population?');
    console.log('NOTE: The model does not know what "its" refers to, as previous question about Japan is not included!');

    console.log('\n[3] Another follow-up streaming question:');
    console.log(`User: Name three famous landmarks in the place mentioned above.`);
    console.log(`Assistant (streaming): `);

    // Process streaming chunks for third question
    let statelessStreamContent3 = '';
    const statelessStream3 = await statelessStreamingCaller.stream('Name three famous landmarks in the place mentioned above.');
    for await (const chunk of statelessStream3) {
        process.stdout.write(chunk.content);
        statelessStreamContent3 += chunk.contentText || '';
    }
    console.log('\n');

    // Log what was sent to the model - proving no context
    console.log('\nMessages sent to model in Stateless streaming mode (third call):');
    console.log('- system: You are a helpful assistant that focuses on the current question.');
    console.log('- user: Name three famous landmarks in the place mentioned above.');
    console.log('NOTE: The model does not know what "above" refers to, as previous context is not included!');

    console.log('\nHistory after Stateless streaming mode conversation:');
    const statelessStreamingHistory = statelessStreamingCaller.getHistoricalMessages();
    statelessStreamingHistory.forEach(msg => {
        console.log(`- ${msg.role}: ${msg.content}`);
    });

    console.log('\n✓ Stateless streaming mode combines the benefits of streaming and stateless mode');
    console.log('✓ Response content arrives in real-time chunks for responsive UI experiences');
    console.log('✓ Each streaming request is treated independently with no history context');
    console.log('✓ History state is reset after each streaming call');
    console.log('✓ Ideal for independent streaming queries where context is not required');
    console.log('✓ Most token-efficient option for streaming responses\n');

    // ────────────────────────────────────────────────────────────────────────
    // TRUNCATE MODE EXAMPLE
    // ────────────────────────────────────────────────────────────────────────
    console.log('┌────────────────────────────────────────┐');
    console.log('│         DYNAMIC HISTORY MODE          │');
    console.log('└────────────────────────────────────────┘');

    // Create a new LLM caller instance with 'dynamic' mode
    const dynamicCaller = new LLMCaller(
        'openai' as RegisteredProviders,
        'gpt-4o-mini',
        'You are a helpful assistant that maintains essential conversation context.',
        {
            apiKey: process.env.OPENAI_API_KEY,
            historyMode: 'dynamic'
        }
    );

    dynamicCaller.updateModel('gpt-4o-mini', {
        maxRequestTokens: 2000,
        maxResponseTokens: 1000
    });


    console.log('\n[1] First question:');
    await dynamicCaller.call('What is machine learning?');
    console.log(`User: What is machine learning?`);

    console.log('\n[2] Second question:');
    await dynamicCaller.call('What are the main types of machine learning?');
    console.log(`User: What are the main types of machine learning?`);

    // Add more messages to build history and trigger truncation
    console.log('\nAdding more messages to build history and trigger truncation...');

    // Add 10 more exchanges to build history
    for (let i = 1; i <= 4; i++) {
        await dynamicCaller.call(`Tell me more details about deep learning technique #${i}`);
        console.log(`Added message ${i}/10: Tell me more details about deep learning technique #${i}`);
    }

    console.log('\n[3] Follow-up question after building history:');
    const truncateResponse = await dynamicCaller.call('Compare supervised and unsupervised learning approaches.');
    console.log(`User: Compare supervised and unsupervised learning approaches.`);
    console.log(`Assistant: ${truncateResponse[0]?.content?.substring(0, 200) || 'No response'}...`);

    console.log('\nHistory after Dynamic mode conversation:');
    const truncateHistory = dynamicCaller.getHistorySummary();
    console.log(`Total messages in history: ${truncateHistory.length}`);
    console.log('First few and last few messages:');

    // Show first 2 messages
    truncateHistory.slice(0, 2).forEach(msg => {
        console.log(`- ${msg.role}: ${msg.contentPreview}`);
    });

    console.log('...')

    // Show last 3 messages
    truncateHistory.slice(-3).forEach(msg => {
        console.log(`- ${msg.role}: ${msg.contentPreview}`);
    });

    console.log('\n✓ Dynamic mode intelligently removes older messages when token limit is reached');
    console.log('✓ Always preserves the system message and current question');
    console.log('✓ Prioritizes keeping recent context over older messages');
    console.log('✓ Best for long conversations with high token usage');
    console.log('✓ Ideal for production applications to prevent token limit errors\n');

    // ────────────────────────────────────────────────────────────────────────
    // DYNAMIC STREAMING MODE EXAMPLE
    // ────────────────────────────────────────────────────────────────────────
    console.log('┌────────────────────────────────────────┐');
    console.log('│      DYNAMIC STREAMING MODE           │');
    console.log('└────────────────────────────────────────┘');

    // Create a new LLM caller instance with 'dynamic' mode for streaming
    const dynamicStreamingCaller = new LLMCaller(
        'openai' as RegisteredProviders,
        'gpt-4o-mini',
        'You are a helpful assistant that maintains essential conversation context.',
        {
            apiKey: process.env.OPENAI_API_KEY,
            historyMode: 'dynamic'
        }
    );

    dynamicStreamingCaller.updateModel('gpt-4o-mini', {
        maxRequestTokens: 2000,
        maxResponseTokens: 1000
    });

    console.log('\n[1] First streaming question:');
    console.log(`User: What is artificial intelligence?`);
    console.log(`Assistant (streaming): `);

    // Process streaming chunks for first question
    let truncateStreamContent1 = '';
    const truncateStream1 = await dynamicStreamingCaller.stream('What is artificial intelligence?');
    for await (const chunk of truncateStream1) {
        process.stdout.write(chunk.content);
        truncateStreamContent1 += chunk.contentText || '';
    }
    console.log('\n');

    console.log('\n[2] Second streaming question:');
    console.log(`User: How does AI differ from machine learning?`);
    console.log(`Assistant (streaming): `);

    // Process streaming chunks for second question
    let truncateStreamContent2 = '';
    const truncateStream2 = await dynamicStreamingCaller.stream('How does AI differ from machine learning?');
    for await (const chunk of truncateStream2) {
        process.stdout.write(chunk.content);
        truncateStreamContent2 += chunk.contentText || '';
    }
    console.log('\n');

    // Add more messages to build history and trigger truncation
    console.log('\nAdding more messages to build history and trigger truncation...');

    // Add 4 more exchanges to build history
    for (let i = 1; i <= 4; i++) {
        console.log(`Adding message ${i}/4: Tell me about AI application #${i}`);
        const bulkStream = await dynamicStreamingCaller.stream(`Tell me about AI application #${i}`);
        for await (const chunk of bulkStream) {
            // We're not displaying these intermediate responses to keep output clean
        }
    }

    console.log('\n[3] Follow-up streaming question after building history:');
    console.log(`User: What are the ethical concerns around AI development?`);
    console.log(`Assistant (streaming): `);

    // Process streaming chunks for final question
    let truncateStreamContent3 = '';
    const truncateStream3 = await dynamicStreamingCaller.stream('What are the ethical concerns around AI development?');
    for await (const chunk of truncateStream3) {
        process.stdout.write(chunk.content);
        truncateStreamContent3 += chunk.contentText || '';
    }
    console.log('\n');

    console.log('\nHistory after Dynamic streaming mode conversation:');
    const truncateStreamingHistory = dynamicStreamingCaller.getHistorySummary();
    console.log(`Total messages in history: ${truncateStreamingHistory.length}`);
    console.log('First few and last few messages:');

    // Show first 2 messages
    truncateStreamingHistory.slice(0, 2).forEach(msg => {
        console.log(`- ${msg.role}: ${msg.contentPreview}`);
    });

    console.log('...')

    // Show last 3 messages
    truncateStreamingHistory.slice(-3).forEach(msg => {
        console.log(`- ${msg.role}: ${msg.contentPreview}`);
    });

    console.log('\n✓ Dynamic streaming mode combines streaming with intelligent history management');
    console.log('✓ Response content arrives in real-time chunks for responsive UI experiences');
    console.log('✓ Automatically manages token limits by removing older messages when needed');
    console.log('✓ Preserves important context while allowing for long-running conversations');
    console.log('✓ Ideal for production applications with streaming requirements\n');

}

// Run the example
runHistoryModeExample().catch(console.error); 