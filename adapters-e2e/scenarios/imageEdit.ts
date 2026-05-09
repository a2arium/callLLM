import type { Scenario } from '../types.ts';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Image edit scenario: takes a generated image and edits it with a text prompt.
 * Tests output.image.edit capability and image input handling.
 */
export const imageEdit: Scenario = {
    id: 'image-edit',
    title: 'Image edit (no mask)',
    requirements: {
        imageOutput: { required: true, operations: ['edit'] },
        imageInput: { required: true },
    },
    run: async ({ caller }) => {
        // Step 1: Generate a base image to edit
        const tmpDir = os.tmpdir();
        const basePath = path.join(tmpDir, `callllm-e2e-edit-base-${Date.now()}.png`);
        const editPath = path.join(tmpDir, `callllm-e2e-edit-result-${Date.now()}.png`);

        try {
            const genResp = await caller.call({
                text: 'A simple red circle on a white background',
                output: { image: { quality: 'low' } },
                outputPath: basePath,
            } as any);

            if (!genResp[0].image?.data) {
                return { metadata: { error: 'Base image generation failed' } };
            }

            // Step 2: Edit the generated image
            const editResp = await caller.call({
                text: 'Change the red circle to a blue square',
                files: [basePath],
                output: { image: { quality: 'low' } },
                outputPath: editPath,
            } as any);

            const savedPath = editResp[0].metadata?.imageSavedPath as string | undefined;
            const hasData = Boolean(editResp[0].image?.data);

            let fileExists = false;
            let fileSize = 0;
            try {
                if (savedPath && fs.existsSync(savedPath)) {
                    fileExists = true;
                    fileSize = fs.statSync(savedPath).size;
                }
            } catch { /* ignore */ }

            return {
                metadata: {
                    imageSavedPath: savedPath,
                    hasData,
                    fileExists,
                    fileSize,
                    baseGenerated: true,
                },
                usage: editResp[0].metadata?.usage,
            };
        } finally {
            try { if (fs.existsSync(basePath)) fs.unlinkSync(basePath); } catch { /* ignore */ }
            try { if (fs.existsSync(editPath)) fs.unlinkSync(editPath); } catch { /* ignore */ }
        }
    },
    judge: async (_ctx, result) => {
        const meta = result.metadata as {
            error?: string;
            imageSavedPath?: string;
            hasData?: boolean;
            fileExists?: boolean;
            fileSize?: number;
            baseGenerated?: boolean;
        };

        if (meta?.error) {
            return { pass: false, score: 0, reason: meta.error };
        }

        const hasData = Boolean(meta?.hasData);
        const fileExists = Boolean(meta?.fileExists);
        const fileSize = meta?.fileSize ?? 0;
        const hasSavedPath = Boolean(meta?.imageSavedPath);

        if (!hasData) {
            return { pass: false, score: 0, reason: 'No edited image data returned' };
        }
        if (!hasSavedPath) {
            return { pass: false, score: 0.5, reason: 'Image data returned but imageSavedPath not set' };
        }
        if (!fileExists) {
            return { pass: false, score: 0.5, reason: 'imageSavedPath set but file does not exist' };
        }
        if (fileSize < 1024) {
            return { pass: false, score: 0.5, reason: `Edited image too small (${fileSize} bytes)` };
        }

        return {
            pass: true,
            score: 1,
            reason: `Edited image produced and saved (${(fileSize / 1024).toFixed(0)}KB)`,
        };
    },
};
