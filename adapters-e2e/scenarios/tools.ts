import type { Scenario } from '../types.ts';
import type { ToolDefinition } from '../../src/types/tooling.ts';

const timeTool: ToolDefinition = {
    name: 'get_time',
    description: 'Get the current time for a location',
    parameters: {
        type: 'object',
        properties: {
            location: { type: 'string', description: 'City, Country' }
        },
        required: ['location']
    },
    callFunction: async <TParams extends Record<string, unknown>, TResponse>(params: TParams): Promise<TResponse> => {
        const result = { time: new Date().toISOString() } as TResponse;
        return result;
    }
};

export const toolCalling: Scenario = {
    id: 'tool-calling',
    title: 'Tool calling basic',
    requirements: {
        textOutput: { required: true, formats: ['text'] },
        toolCalls: { required: true }
    },
    run: async ({ caller }) => {
        const resp = await caller.call('What time is it in Tokyo?', {
            tools: [timeTool],
            settings: { toolChoice: 'auto' }
        });
        return {
            outputText: resp[0].content ?? undefined,
            usage: resp[0].metadata?.usage
        };
    },
    judge: async (_ctx, result) => {
        const text = (result.outputText ?? '').toLowerCase();
        const pass = text.includes('tokyo') || text.includes('time');
        return { pass, score: pass ? 1 : 0.7, reason: pass ? 'Mentions time context' : 'No time context found' };
    }
};


