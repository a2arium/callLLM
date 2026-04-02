import type { Scenario } from '../types.ts';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export const audioSpeech: Scenario = {
    id: 'audio-speech',
    title: 'Text-to-speech synthesis',
    requirements: {
        audio: { required: true, operations: ['synthesize'] }
    },
    run: async ({ caller }) => {
        let model = 'gpt-4o-mini-tts';
        try {
            const models = caller.getAvailableAudioModels();
            const tts = models.find(m => m.includes('tts'));
            if (tts) model = tts;
        } catch {
            /* use default */
        }

        const outputPath = path.join(os.tmpdir(), `callllm-tts-${Date.now()}.mp3`);
        const result = await caller.synthesizeSpeech({
            input: 'Hello, this is a test of text to speech synthesis.',
            model,
            voice: 'alloy',
            outputPath
        });

        const fileExists = fs.existsSync(outputPath);
        const fileSize = fileExists ? fs.statSync(outputPath).size : 0;
        try {
            if (fileExists) fs.unlinkSync(outputPath);
        } catch {
            /* ignore */
        }

        return {
            metadata: {
                audioSavedPath: result.metadata?.audioSavedPath,
                fileSize,
                hasData: Boolean(result.audio?.data)
            },
            usage: result.usage
        };
    },
    judge: async (_ctx, result) => {
        const meta = result.metadata as { fileSize?: number; hasData?: boolean };
        const pass = Boolean((meta?.fileSize ?? 0) > 0 || meta?.hasData);
        return {
            pass,
            score: pass ? 1 : 0,
            reason: pass ? 'Audio file produced' : 'No audio output'
        };
    }
};
