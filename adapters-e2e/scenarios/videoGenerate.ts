import type { Scenario } from '../types.ts';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Video generation scenario: generates a short video from a text prompt.
 * Tests LLMProviderVideo / output.video capability.
 *
 * Note: Video generation is slow (30-120s). Uses wait:'poll' for automatic polling.
 */
export const videoGenerate: Scenario = {
    id: 'video-generate',
    title: 'Video generation',
    requirements: {
        videoOutput: { required: true },
    },
    run: async ({ caller }) => {
        const tmpDir = os.tmpdir();
        const outputPath = path.join(tmpDir, `callllm-e2e-video-${Date.now()}.mp4`);

        try {
            const resp = await caller.call({
                text: 'A cat walking across a wooden floor',
                output: {
                    video: {
                        size: '1280x720',
                        seconds: 5,
                        wait: 'poll',
                        variant: 'video',
                    },
                },
                outputPath,
            } as any);

            const meta = resp[0].metadata ?? {};
            const videoStatus = meta.videoStatus as string | undefined;
            const videoJobId = meta.videoJobId as string | undefined;

            // Check if video was saved to file
            let fileExists = false;
            let fileSize = 0;
            try {
                if (fs.existsSync(outputPath)) {
                    fileExists = true;
                    fileSize = fs.statSync(outputPath).size;
                }
            } catch { /* ignore */ }

            // Check for inline video data
            const hasVideoData = Boolean((resp[0] as any).video?.data);

            return {
                metadata: {
                    videoStatus,
                    videoJobId,
                    fileExists,
                    fileSize,
                    hasVideoData,
                    outputPath,
                },
                usage: meta.usage,
            };
        } finally {
            try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch { /* ignore */ }
        }
    },
    judge: async (_ctx, result) => {
        const meta = result.metadata as {
            videoStatus?: string;
            fileExists?: boolean;
            fileSize?: number;
            hasVideoData?: boolean;
        };

        const fileExists = Boolean(meta?.fileExists);
        const fileSize = meta?.fileSize ?? 0;
        const hasVideoData = Boolean(meta?.hasVideoData);

        // Video must be available either as file or inline data
        if (!fileExists && !hasVideoData) {
            const status = meta?.videoStatus ?? 'unknown';
            return {
                pass: false,
                score: 0,
                reason: `No video produced (status: ${status})`,
            };
        }

        // If file exists, check it has meaningful size (> 10KB for a video)
        if (fileExists && fileSize < 10240) {
            return {
                pass: false,
                score: 0.5,
                reason: `Video file too small (${fileSize} bytes)`,
            };
        }

        const sizeLabel = fileExists ? `${(fileSize / 1024).toFixed(0)}KB file` : 'inline data';
        return {
            pass: true,
            score: 1,
            reason: `Video generated successfully (${sizeLabel})`,
        };
    },
};
