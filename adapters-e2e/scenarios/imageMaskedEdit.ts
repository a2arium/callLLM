import type { Scenario } from '../types.ts';
import path from 'path';
import { getDirname } from '../../src/utils/paths.ts';

const __dirname = getDirname(import.meta.url);

export const imageMaskedEdit: Scenario = {
    id: 'image-masked-edit',
    title: 'Image masked edit',
    requirements: {
        imageOutput: { required: true, operations: ['editWithMask'] },
        imageInput: { required: true }
    },
    run: async ({ caller }) => {
        const resp = await caller.call({
            text: "Replace the masked area with a lion's face",
            files: [path.join(__dirname, '../../examples/dogs.jpg')],
            mask: path.join(__dirname, '../../examples/mask.png'),
            output: { image: { quality: 'low' } }
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


