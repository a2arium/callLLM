import { ModelManager } from '@/core/models/ModelManager.ts';
import { TokenCalculator } from '@/core/models/TokenCalculator.ts';
import { FinishReason } from '@/interfaces/UniversalInterfaces.ts';
import { VercelConverter } from '@/adapters/vercel/converter.ts';
import { VercelStreamHandler } from '@/adapters/vercel/stream.ts';

async function* createStream(): AsyncGenerator<unknown> {
    yield {
        id: 'chunk_1',
        object: 'chat.completion.chunk',
        created: 1,
        model: 'alibaba/qwen-3-14b',
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
        model: 'alibaba/qwen-3-14b',
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
        model: 'alibaba/qwen-3-14b',
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
        model: 'alibaba/qwen-3-14b',
        choices: [],
        usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15
        }
    };
}

describe('VercelStreamHandler', () => {
    it('maps reasoning and tool deltas and emits one complete final chunk', async () => {
        const converter = new VercelConverter(new ModelManager('vercel'));
        const handler = new VercelStreamHandler(
            converter,
            new TokenCalculator(),
            'alibaba/qwen-3-14b'
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
                provider: 'vercel',
                providerState: {
                    vercel: { reasoningContent: 'Need a lookup. ' }
                }
            }
        });
        expect(final?.metadata?.usage?.tokens.total).toBe(15);
    });
});
