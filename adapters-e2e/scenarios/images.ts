import type { Scenario } from '../types.ts';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export const imageGenerate: Scenario = {
    id: 'image-generate',
    title: 'Image generation',
    requirements: {
        imageOutput: { required: true, operations: ['generate'] }
    },
    run: async ({ caller }) => {
        const tmpDir = os.tmpdir();
        const outputPath = path.join(tmpDir, `callllm-e2e-img-${Date.now()}.png`);

        const resp = await caller.call({
            text: 'A peaceful mountain landscape with a lake and forest',
            output: { image: { quality: 'low', size: '1024x1024' } },
            outputPath,
        } as any);

        const savedPath = resp[0].metadata?.imageSavedPath as string | undefined;
        const hasData = Boolean(resp[0].image?.data);

        // Verify file exists and has content
        let fileExists = false;
        let fileSize = 0;
        try {
            if (savedPath && fs.existsSync(savedPath)) {
                const stat = fs.statSync(savedPath);
                fileExists = true;
                fileSize = stat.size;
            }
        } catch { /* ignore */ }

        // Clean up temp file
        try {
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        } catch { /* ignore */ }

        return {
            metadata: {
                imageSavedPath: savedPath,
                hasData,
                fileExists,
                fileSize,
            },
            usage: resp[0].metadata?.usage
        };
    },
    judge: async (_ctx, result) => {
        const meta = result.metadata as {
            imageSavedPath?: string;
            hasData?: boolean;
            fileExists?: boolean;
            fileSize?: number;
        };

        const hasData = Boolean(meta?.hasData);
        const fileExists = Boolean(meta?.fileExists);
        const fileSize = meta?.fileSize ?? 0;
        const hasSavedPath = Boolean(meta?.imageSavedPath);

        // Base64 data must be present
        if (!hasData) {
            return { pass: false, score: 0, reason: 'No image base64 data returned' };
        }

        // Adapter must set imageSavedPath when outputPath is provided
        if (!hasSavedPath) {
            return { pass: false, score: 0.5, reason: 'Image data returned but imageSavedPath not set (adapter missing file save)' };
        }

        // File must actually exist on disk
        if (!fileExists) {
            return { pass: false, score: 0.5, reason: `imageSavedPath set to '${meta?.imageSavedPath}' but file does not exist on disk` };
        }

        // File must have meaningful size (> 1KB)
        if (fileSize < 1024) {
            return { pass: false, score: 0.5, reason: `Image file exists but is too small (${fileSize} bytes)` };
        }

        return {
            pass: true,
            score: 1,
            reason: `Image produced and saved (${(fileSize / 1024).toFixed(0)}KB at ${meta?.imageSavedPath})`
        };
    }
};
