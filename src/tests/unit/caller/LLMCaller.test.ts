import { LLMCaller } from '../../../core/caller/LLMCaller';
import { UniversalChatParams, UniversalStreamResponse, UniversalMessage } from '../../../interfaces/UniversalInterfaces';
import { SupportedProviders } from '../../../core/types';
import { ModelManager } from '../../../core/models/ModelManager';

// Minimal dummy async iterable for testing
async function* dummyAsyncIterable(): AsyncIterable<UniversalStreamResponse> {
    yield {
        content: 'dummy response',
        role: 'assistant',
        isComplete: true,
        metadata: {}
    };
}

describe('LLMCaller streamCall', () => {
    let llmCaller: LLMCaller;

    beforeEach(() => {
        jest.spyOn(ModelManager.prototype, 'getModel').mockReturnValue({ name: 'test-model', capabilities: { streaming: true } } as any);
        // Create an instance of LLMCaller with dummy parameters
        // Using 'openai' and 'test-model', with a system message
        llmCaller = new LLMCaller('openai' as SupportedProviders, 'test-model', 'system test message');

        // Override streamController.createStream with a jest mock
        llmCaller['streamController'].createStream = jest.fn(() => Promise.resolve(dummyAsyncIterable()));
    });

    it('should include historical messages in the messages array in streamCall', async () => {
        const historicalMessages: UniversalMessage[] = [
            { role: 'assistant', content: 'historical message' }
        ];
        const userMessage = 'user message test';

        // Call streamCall with historicalMessages provided
        await llmCaller.streamCall({ message: userMessage, historicalMessages });

        // Verify that streamController.createStream was called once
        expect(llmCaller['streamController'].createStream).toHaveBeenCalledTimes(1);

        // Get the arguments passed into createStream: [model, params, inputTokens]
        const createStreamCallArgs = (llmCaller['streamController'].createStream as jest.Mock).mock.calls[0];
        const paramsPassed: UniversalChatParams = createStreamCallArgs[1];

        // Expected messages array: system message, historical messages, and user message
        expect(paramsPassed.messages).toEqual([
            { role: 'system', content: 'system test message' },
            ...historicalMessages,
            { role: 'user', content: userMessage }
        ]);
    });
}); 