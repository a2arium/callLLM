
The core component responsible for managing conversation history is the `HistoryManager` class, which is integrated into the `LLMCaller`. The `LLMCaller` provides several methods to interact with this history.

Here are the primary ways you can add, manage, and influence the history used in your calls:

1.  **Adding Messages Incrementally**:
    You can add individual messages (user, assistant, tool, etc.) to the history using the `addMessage` method on your `LLMCaller` instance. Messages added this way contribute to the ongoing conversation history.

    ```typescript
    import { LLMCaller } from 'callllm';

    const caller = new LLMCaller('openai', 'gpt-4o-mini', 'You are a helpful assistant.');

    // Add a user message
    caller.addMessage('user', 'What is the capital of France?');

    // Add the assistant's response (assuming you received it from a previous call)
    caller.addMessage('assistant', 'The capital of France is Paris.');

    // Add another user message
    caller.addMessage('user', 'What is its population?');

    // When you make the next call, these messages will be included based on the history mode
    // const response = await caller.call('...');
    ```
    Messages with roles like `'tool'` or `'function'` can also be added, often including a `toolCallId` to link them to a previous assistant message that requested the tool.

2.  **Setting/Replacing the Entire History**:
    If you need to load a previous conversation state or set the history programmatically, you can use `setMessages`. This replaces the entire current history with the provided array of messages.

    ```typescript
    import { LLMCaller, UniversalMessage } from 'callllm';

    const caller = new LLMCaller('openai', 'gpt-4o-mini', 'You are a helpful assistant.');

    const previousConversation: UniversalMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What is 1 + 1?' },
        { role: 'assistant', content: '1 + 1 equals 2.' },
    ];

    caller.setMessages(previousConversation);

    // Now the history contains the messages from `previousConversation`
    // const response = await caller.call('...');
    ```

3.  **Clearing History**:
    To start a fresh conversation, you can clear all previous messages using `clearHistory`. By default, this method also re-initializes the history with the initial `systemMessage` provided during the `LLMCaller` constructor.

    ```typescript
    import { LLMCaller } from 'callllm';

    const caller = new LLMCaller('openai', 'gpt-4o-mini', 'You are a helpful assistant.');

    // ... add some messages ...
    caller.addMessage('user', 'Message 1');
    console.log('History size before clear:', caller.getMessages().length); // Will be > 0

    caller.clearHistory(); // Clears messages and re-adds the system message

    console.log('History size after clear:', caller.getMessages().length); // Will be 1 (system message)
    ```

4.  **Updating the System Message**:
    The initial system message is crucial for setting the AI's persona and instructions. You can update it using `updateSystemMessage`. You can choose whether to preserve the existing conversation history (`preserveHistory = true`, default) or clear it (`preserveHistory = false`).

    ```typescript
    import { LLMCaller } from 'callllm';

    const caller = new LLMCaller('openai', 'gpt-4o-mini', 'You are a helpful assistant.');

    // Change the system message and keep history
    caller.updateSystemMessage('You are now an expert in history.', true);

    // Change the system message and clear history
    caller.updateSystemMessage('You are now a creative writer.', false);
    ```

5.  **Controlling History Behavior (`historyMode`)**:
    The library offers different modes to control how the historical messages stored in the `HistoryManager` are included in the actual API call requests sent to the LLM provider. This is managed by the `historyMode` setting.

    You can set the `historyMode` during `LLMCaller` initialization or override it for specific `call` or `stream` requests:

    ```typescript
    import { LLMCaller } from 'callllm';

    // Set default history mode in constructor
    const callerFullHistory = new LLMCaller('openai', 'gpt-4o-mini', '...', {
        historyMode: 'full'
    });

    // Override history mode for a specific call
    const responseStateless = await callerFullHistory.call('What is the current time?', {
        historyMode: 'stateless' // This call will be stateless, but future calls on callerFullHistory will default to 'full'
    });

    const streamDynamic = await callerFullHistory.stream('Analyze this long document...', {
        historyMode: 'dynamic' // This streaming call will use dynamic truncation
    });
    ```

    The available `historyMode` values are:
    *   `'full'`: (Default mode if not specified in constructor/options) Sends *all* messages currently in the `HistoryManager` (including the system message) to the model. Best for preserving full conversation context.
    *   `'dynamic'`: Intelligently truncates the history to fit within the model's `maxRequestTokens`. It prioritizes the system message, the first user message, and the most recent messages. Useful for long conversations to avoid hitting token limits while retaining recent context.
    *   `'stateless'`: Only sends the current user message and the system message (if one is set in `HistoryManager`) to the model. No previous conversation turns are included. Each call is independent. Most token-efficient.

6.  **Accessing History**:
    You can retrieve the current message history using methods like `getMessages()` (excluding the initial system message unless it was explicitly added back) or `getMessages(true)` (includes the initial system message). `getHistorySummary()` provides a condensed view.

    ```typescript
    // Get all messages including system message
    const allMessages = caller.getMessages(true);

    // Get messages excluding the initial system message
    const historicalMessages = caller.getMessages();

    // Get a summary of the history
    const summary = caller.getHistorySummary({ maxContentLength: 50 });
    ```

By using these methods and the `historyMode` option, you have fine-grained control over how conversation history is managed and utilized in your interactions with the LLM.