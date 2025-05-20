import { LLMCaller, UniversalMessage, UniversalChatResponse } from '../src.js'; // Adjust path based on your project structure

/**
 * Demonstrates how to preload a conversation history into the LLMCaller
 * before making a new call, allowing the LLM to have context from a
 * previous interaction.
 */
async function runLoadHistoryExample() {
    console.log('--- Preloading History Example ---');

    // 1. Initialize LLMCaller
    const caller = new LLMCaller(
        'openai',
        'gpt-4o-mini',
        'You are a helpful assistant focusing on capitals and their countries.'
    );

    // 2. Define the historical messages to preload
    const previousConversation: UniversalMessage[] = [
        { role: 'user', content: 'What is the capital of France?' },
        { role: 'assistant', content: 'The capital of France is Paris.' },
        { role: 'user', content: 'And which country is Rome the capital of?' },
        { role: 'assistant', content: 'Rome is the capital of Italy.' },
    ];

    console.log('Preloading the following historical messages:');
    console.log(JSON.stringify(previousConversation, null, 2));


    // 3. Set the historical messages
    caller.setHistoricalMessages(previousConversation);

    // // Log history state *after* setting and *before* the call
    // const messagesBeforeCall = caller.getMessages();
    // console.log(`\nHistory set. Current message count before call: ${messagesBeforeCall.length}`);
    // console.log('Messages before call:', JSON.stringify(messagesBeforeCall, null, 2));

    // 4. Make a new call that relies on the preloaded context
    const followUpQuestion = 'Based on our previous discussion, list the country for each capital mentioned.';
    console.log(`\nMaking a follow-up call with the question: "${followUpQuestion}"`);

    try {
        // Use the call method which adds the response to history automatically
        // Assuming .call() returns an array, access the first response
        // Explicitly set historyMode for clarity/debugging, though 'full' is default
        const responses = await caller.call(followUpQuestion, { historyMode: 'full' });
        const response = responses && responses.length > 0 ? responses[0] : null;

        console.log('\nLLM Response:');
        // Ensure response and content exist before logging
        if (response && response.content) {
            console.log(response.content);
        } else {
            console.log('(No content received in response)');
        }

        // Log history state *after* the call
        const messagesAfterCall1 = caller.getMessages();
        console.log(`\nFinal message count after first call: ${messagesAfterCall1.length}`);
        console.log('Messages after first call:', JSON.stringify(messagesAfterCall1, null, 2)); // Check if it has expected count

    } catch (error) {
        console.error('\nError during first LLM call:', error);
    }

    // 5. Demonstrate adding messages incrementally with addMessage
    console.log('\n--- Demonstrating addMessage ---');
    const newMessageContent = "What about Berlin?";
    console.log(`Adding new user message: "${newMessageContent}"`);
    caller.addMessage('user', newMessageContent);

    const messagesAfterAdd = caller.getMessages();
    console.log(`\nCurrent message count after addMessage: ${messagesAfterAdd.length}`);
    console.log('Messages after addMessage:', JSON.stringify(messagesAfterAdd, null, 2));

    console.log(`\nMaking a second call with the question about Berlin...`);
    try {
        // This call should use the history accumulated so far (preloaded + first call + added message)
        const responses2 = await caller.call("Which country is that in?", { historyMode: 'full' });
        const response2 = responses2 && responses2.length > 0 ? responses2[0] : null;

        console.log('\nLLM Response (Second Call):');
        if (response2 && response2.content) {
            console.log(response2.content);
        } else {
            console.log('(No content received in response)');
        }

        // Log final history state
        const messagesAfterCall2 = caller.getMessages();
        console.log(`\nFinal message count after second call: ${messagesAfterCall2.length}`);
        console.log('Messages after second call:', JSON.stringify(messagesAfterCall2, null, 2));

    } catch (error) {
        console.error('\nError during second LLM call:', error);
    }


    console.log('\n--- Example Complete ---');
}


runLoadHistoryExample().catch(error => {
    console.error("\nExample failed to run:", error);
}); 