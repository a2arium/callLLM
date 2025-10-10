import type { Scenario } from '../types.ts';
import type { ToolDefinition } from '../../src/types/tooling.ts';

const timeTool: ToolDefinition = {
    name: 'get_time',
    description: 'Get the current time for a location',
    parameters: {
        type: 'object',
        properties: { location: { type: 'string' } },
        required: ['location']
    },
    callFunction: async <TParams extends Record<string, unknown>, TResponse>(params: TParams): Promise<TResponse> => {
        return { time: new Date().toISOString(), location: params.location } as TResponse;
    }
};

const weatherTool: ToolDefinition = {
    name: 'get_weather',
    description: 'Get mock weather',
    parameters: {
        type: 'object',
        properties: { location: { type: 'string' } },
        required: ['location']
    },
    callFunction: async <TParams extends Record<string, unknown>, TResponse>(params: TParams): Promise<TResponse> => {
        return { temperature: 20, conditions: 'sunny', location: params.location } as TResponse;
    }
};

export const streamingTools: Scenario = {
    id: 'streaming-tools',
    title: 'Streaming with tools (single and multi-tool)',
    requirements: {
        textOutput: { required: true, formats: ['text'] },
        toolCalls: { required: true },
        streaming: { required: true }
    },
    run: async ({ caller }) => {
        const stream = await caller.stream('Give me the current time in Tokyo and then a short weather summary for London.', {
            tools: [timeTool, weatherTool],
            settings: { toolChoice: 'auto' }
        });

        let chunks = 0;
        let text = '';
        let finalUsage;
        for await (const chunk of stream) {
            if (chunk.content) text += chunk.content;
            chunks++;
            if (chunk.isComplete) {
                finalUsage = chunk.metadata?.usage;
            }
        }
        const streamed = chunks > 1 && text.trim().length > 0;
        return { outputText: text, streamed, usage: finalUsage, metadata: { chunkCount: chunks } };
    },
    judge: async (_ctx, result) => {
        const text = (result.outputText || '').toLowerCase();
        const mentionsTime = text.includes('time') || text.includes('tokyo');
        const mentionsWeather = text.includes('weather') || text.includes('london') || text.includes('sunny');
        const pass = Boolean(result.streamed) && mentionsTime && mentionsWeather;
        return { pass, score: pass ? 1 : 0.5, reason: pass ? 'Streamed and referenced tool info' : 'Missing tool info or not streamed' };
    }
};


