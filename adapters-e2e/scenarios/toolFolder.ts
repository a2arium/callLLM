import type { Scenario } from '../types.ts';
import path from 'path';
import { getDirname } from '../../src/utils/paths.ts';

const __dirname = getDirname(import.meta.url);

export const toolFolderScenario: Scenario = {
    id: 'tool-folder',
    title: 'Tool folder loading',
    requirements: {
        textOutput: { required: true, formats: ['text'] },
        toolCalls: { required: true }
    },
    run: async ({ caller }) => {
        const toolsDir = path.join(__dirname, '../../examples/functions');
        // With toolsDir configured in caller constructor, pass tool names only
        const resp = await caller.call('Call get_time for Tokyo and get_weather for London. Then write a one-sentence summary that explicitly mentions both Tokyo and London and uses the outputs.', {
            tools: ['getTime', 'getWeather'],
            settings: { toolChoice: 'auto' }
        });
        return { outputText: resp[0].content ?? undefined, usage: resp[0].metadata?.usage };
    },
    judge: async (_ctx, result) => {
        const text = (result.outputText || '').toLowerCase();
        const pass = text.includes('tokyo') && (text.includes('london') || text.includes('weather'));
        return { pass, score: pass ? 1 : 0.7, reason: pass ? 'Referenced both tools' : 'Missing tool references' };
    }
};


