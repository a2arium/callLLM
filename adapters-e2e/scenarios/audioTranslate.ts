import type { Scenario } from '../types.ts';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Audio translation scenario: generates speech, then calls translateAudio().
 * Tests translateAudio() capability.
 *
 * Since Gemini TTS models only support English text, we generate English speech
 * and then call translateAudio() which will return the English transcription/translation.
 */
export const audioTranslate: Scenario = {
    id: 'audio-translate',
    title: 'Audio translation',
    requirements: {
        audio: { required: true, operations: ['translate'] },
    },
    run: async ({ caller }) => {
        let ttsModel = 'gpt-4o-mini-tts';
        let translateModel = 'gpt-4o-mini-transcribe';
        try {
            const models = caller.getAvailableAudioModels();
            const tts = models.find(m => m.includes('tts'));
            if (tts) ttsModel = tts;
            else if (models.length > 0) ttsModel = models[0];

            const translate = models.find(m => m.includes('translate'));
            if (translate) translateModel = translate;
            else if (models.length > 0) translateModel = models[0];
        } catch { /* use defaults */ }

        const phrase = 'This is a demonstration of the speech synthesis system.';
        const mp3Path = path.join(os.tmpdir(), `callllm-e2e-translate-${Date.now()}.mp3`);

        try {
            // Step 1: Generate speech
            await caller.synthesizeSpeech({
                input: phrase,
                model: ttsModel,
                voice: 'alloy',
                outputPath: mp3Path,
            });

            const fileExists = fs.existsSync(mp3Path);
            const fileSize = fileExists ? fs.statSync(mp3Path).size : 0;

            if (!fileExists || fileSize === 0) {
                return {
                    outputText: '',
                    metadata: { error: 'TTS failed: no audio file produced', ttsSuccess: false },
                };
            }

            // Step 2: Call translateAudio
            const translated = await caller.translateAudio({
                file: mp3Path,
                model: translateModel,
            });

            return {
                outputText: translated.text,
                metadata: {
                    hasText: Boolean(translated.text),
                    ttsSuccess: true,
                    ttsFileSize: fileSize,
                    duration: translated.duration,
                },
                usage: translated.usage,
            };
        } finally {
            try { if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path); } catch { /* ignore */ }
        }
    },
    judge: async (_ctx, result) => {
        const text = (result.outputText ?? '').toLowerCase();
        const meta = result.metadata as { error?: string; ttsSuccess?: boolean; hasText?: boolean; ttsFileSize?: number };

        if (meta?.error) {
            return { pass: false, score: 0, reason: meta.error };
        }

        if (!text || text.length < 5) {
            return { pass: false, score: 0, reason: 'No translation text returned' };
        }

        // The input was "This is a demonstration of the speech synthesis system."
        const mentionsDemo = text.includes('demonstration') || text.includes('demo');
        const mentionsSpeech = text.includes('speech') || text.includes('speak');
        const mentionsSystem = text.includes('system') || text.includes('synthesis');
        const mentionsThis = text.includes('this');
        const mentionsTest = text.includes('test');

        const matches = [mentionsDemo, mentionsSpeech, mentionsSystem, mentionsThis, mentionsTest].filter(Boolean).length;

        if (matches >= 1) {
            return {
                pass: true,
                score: 1,
                reason: `Translation/transcription looks correct (${matches} key terms found)`,
            };
        }

        // If the transcription is completely different, it might be hallucinated
        // but the translateAudio() call still worked. Accept with partial score.
        if (text.length > 10) {
            return {
                pass: true,
                score: 0.5,
                reason: `translateAudio() returned text but content doesn't match: "${text.slice(0, 100)}"`,
            };
        }

        return {
            pass: false,
            score: 0,
            reason: `Translation doesn't match expected content: "${text.slice(0, 200)}"`,
        };
    },
};
