import { ModelManager } from '@/core/models/ModelManager.ts';
import { TokenCalculator } from '@/core/models/TokenCalculator.ts';
import { FinishReason } from '@/interfaces/UniversalInterfaces.ts';
import { SiliconFlowConverter } from '@/adapters/siliconflow/converter.ts';
import { SiliconFlowStreamHandler } from '@/adapters/siliconflow/stream.ts';

async function* createStream(): AsyncGenerator<unknown> {
    yield {
        id: 'chunk_1',
        object: 'chat.completion.chunk',
        created: 1,
        model: 'deepseek-ai/DeepSeek-V3.2',
        choices: [{
            index: 0,
            finish_reason: null,
            delta: { role: 'assistant', reasoning_content: 'Need a lookup. ' }
        }]
    };
    yield {
        id: 'chunk_2',
        object: 'chat.completion.chunk',
        created: 1,
        model: 'deepseek-ai/DeepSeek-V3.2',
        choices: [{
            index: 0,
            finish_reason: null,
            delta: {
                tool_calls: [{
                    index: 0,
                    id: 'call_1',
                    type: 'function',
                    function: { name: 'lookup', arguments: '{"id":' }
                }]
            }
        }]
    };
    yield {
        id: 'chunk_3',
        object: 'chat.completion.chunk',
        created: 1,
        model: 'deepseek-ai/DeepSeek-V3.2',
        choices: [{
            index: 0,
            finish_reason: 'tool_calls',
            delta: {
                tool_calls: [{
                    index: 0,
                    function: { arguments: '7}' }
                }]
            }
        }]
    };
    yield {
        id: 'chunk_4',
        object: 'chat.completion.chunk',
        created: 1,
        model: 'deepseek-ai/DeepSeek-V3.2',
        choices: [],
        usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15
        }
    };
}

describe('SiliconFlowStreamHandler', () => {
    it('maps reasoning and tool deltas and emits one complete final chunk', async () => {
        const converter = new SiliconFlowConverter(new ModelManager('siliconflow'));
        const handler = new SiliconFlowStreamHandler(
            converter,
            new TokenCalculator(),
            'deepseek-ai/DeepSeek-V3.2'
        );

        const chunks = [];
        for await (const chunk of handler.handleStream(createStream())) {
            chunks.push(chunk);
        }

        expect(chunks[0]).toMatchObject({
            reasoning: 'Need a lookup. ',
            isFirstReasoningChunk: true,
            isComplete: false
        });
        expect(chunks[1].toolCallChunks?.[0]).toEqual({
            id: 'call_1',
            index: 0,
            name: 'lookup',
            argumentsChunk: '{"id":'
        });
        const final = chunks.at(-1);
        expect(final).toMatchObject({
            contentText: '',
            reasoningText: 'Need a lookup. ',
            isComplete: true,
            toolCalls: [{
                id: 'call_1',
                name: 'lookup',
                arguments: { id: 7 }
            }],
            metadata: {
                finishReason: FinishReason.TOOL_CALLS,
                provider: 'siliconflow',
                providerState: {
                    siliconflow: { reasoningContent: 'Need a lookup. ' }
                }
            }
        });
        expect(final?.metadata?.usage?.tokens.total).toBe(15);
    });
});
