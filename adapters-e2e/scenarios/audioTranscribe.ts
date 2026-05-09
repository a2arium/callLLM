import type { Scenario } from '../types.ts';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/** Short, distinctive phrase so STT can be judged without exact punctuation match. */
const ROUNDTRIP_PHRASE = 'Hello, this is the callllm end to end audio round trip test.';

function normalizeForMatch(s: string): string {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

export const audioTranscribe: Scenario = {
    id: 'audio-transcribe',
    title: 'Audio round-trip: text-to-speech then transcribe',
    requirements: {
        audio: { required: true, operations: ['transcribe'] }
    },
    run: async ({ caller }) => {
        let sttModel = 'gpt-4o-mini-transcribe';
        let ttsModel = 'gpt-4o-mini-tts';
        try {
            const models = caller.getAvailableAudioModels();
            const stt = models.find(m => m.includes('transcribe') && !m.includes('diarize'));
            if (stt) sttModel = stt;
            const tts = models.find(m => m.includes('tts'));
            if (tts) ttsModel = tts;
            // If no dedicated STT model found, use the first audio-capable model
            if (!stt && models.length > 0) sttModel = models[0];
        } catch {
            /* use defaults */
        }

        const base = `callllm-e2e-audio-${Date.now()}`;
        const mp3Path = path.join(os.tmpdir(), `${base}.mp3`);

        try {
            // Caller may be constructed with an STT-only model; pass TTS explicitly.
            await caller.synthesizeSpeech({
                input: ROUNDTRIP_PHRASE,
                model: ttsModel,
                voice: 'alloy',
                outputPath: mp3Path
            });

            const transcribed = await caller.transcribe({
                file: mp3Path,
                model: sttModel
            });

            return {
                outputText: transcribed.text,
                metadata: {
                    duration: transcribed.duration,
                    hasText: Boolean(transcribed.text),
                    expectedPhrase: ROUNDTRIP_PHRASE
                },
                usage: transcribed.usage
            };
        } finally {
            try {
                if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path);
            } catch {
                /* ignore */
            }
        }
    },
    judge: async (_ctx, result) => {
        const text = result.outputText ?? '';
        const expected = normalizeForMatch(ROUNDTRIP_PHRASE);
        const actual = normalizeForMatch(text);
        const tokens = expected.split(/\s+/).filter(t => t.length > 2);
        const matched = tokens.filter(t => actual.includes(t));
        const ratio = tokens.length > 0 ? matched.length / tokens.length : 0;
        const pass = ratio >= 0.5 && text.length > 0;
        return {
            pass,
            score: pass ? 1 : 0,
            reason: pass
                ? `Transcript matches expected content (${matched.length}/${tokens.length} key tokens)`
                : `Transcript missing expected words (got "${text.slice(0, 120)}${text.length > 120 ? '…' : ''}")`
        };
    }
};
