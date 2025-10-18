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
    run: async ({ caller, provider, model }) => {
        // Skip (treat as pass) when model does not support streaming tool calls
        try {
            const mi = caller.getModel(model);
            const tc = (mi?.capabilities as any)?.toolCalls;
            const streamingMode = typeof tc === 'object' ? tc.streamingMode : 'deltas';
            if (streamingMode === 'none') {
                return { outputText: '', streamed: false, usage: undefined, metadata: { skipped: true, reason: 'Model does not support streaming tool calls' } };
            }
        } catch { }

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
    judge: async (ctx, result) => {
        const { caller, model } = ctx;
        let streamingMode: 'none' | 'onComplete' | 'deltas' = 'deltas';
        try {
            const mi = caller.getModel(model);
            const tc = (mi?.capabilities as any)?.toolCalls;
            streamingMode = typeof tc === 'object' && tc?.streamingMode ? tc.streamingMode : 'deltas';
        } catch { }

        const text = (result.outputText || '').toLowerCase();
        const mentionsTime = text.includes('time') || text.includes('tokyo');
        const mentionsWeather = text.includes('weather') || text.includes('london') || text.includes('sunny');

        const streamedOk = streamingMode === 'deltas'
            ? Boolean(result.streamed)
            : text.trim().length > 0; // accept single-chunk final-only models

        const pass = streamedOk && mentionsTime && mentionsWeather;
        const reason = pass ? 'Streamed (or final-only) and referenced tool info' : 'Missing tool info or not streamed';
        return { pass, score: pass ? 1 : 0.5, reason };
    }
};


