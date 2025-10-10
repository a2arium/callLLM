import type { Scenario } from '../types.ts';

export const imageGenerate: Scenario = {
    id: 'image-generate',
    title: 'Image generation',
    requirements: {
        imageOutput: { required: true, operations: ['generate'] }
    },
    run: async ({ caller }) => {
        const resp = await caller.call({
            text: 'A peaceful mountain landscape with a lake and forest',
            output: { image: { quality: 'low', size: '1024x1024' } }
        } as any);

        const saved = resp[0].metadata?.imageSavedPath;
        const hasData = Boolean(resp[0].image?.data);
        return { metadata: { imageSavedPath: saved, hasData }, usage: resp[0].metadata?.usage };
    },
    judge: async (_ctx, result) => {
        const saved = Boolean((result.metadata as any)?.imageSavedPath);
        const hasData = Boolean((result.metadata as any)?.hasData);
        const pass = saved || hasData;
        return { pass, score: pass ? 1 : 0, reason: pass ? 'Image produced' : 'No image returned' };
    }
};


