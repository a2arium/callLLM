import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { LLMCaller } from '../src/core/caller/LLMCaller.ts';
import { getDirname } from '../src/utils/paths.ts';

const __dirname = getDirname(import.meta.url);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DEFAULT_AUDIO = path.join(__dirname, 'output', 'speech-example.mp3');

/**
 * Speech-to-text via `transcribe` (OpenAI `audio/transcriptions`).
 *
 * Requires OPENAI_API_KEY. Run: `yarn example:speechTranscription [path-to-audio]`
 *
 * Default file: `examples/output/speech-example.mp3` — create it first with
 * `yarn example:speechSynthesis`, or pass any supported path / https URL / data: URI.
 *
 * Very large local files: pass `splitLargeFile: true` on `transcribe()` (requires ffmpeg/ffprobe on PATH).
 */
async function main(): Promise<void> {
    if (!process.env.OPENAI_API_KEY) {
        console.error('Set OPENAI_API_KEY in .env or the environment.');
        process.exit(1);
    }

    const fileArg = process.argv[2];
    const file = fileArg ?? DEFAULT_AUDIO;

    if (!fileArg && !fs.existsSync(file)) {
        console.error(
            `No audio file at ${DEFAULT_AUDIO}. Run \`yarn example:speechSynthesis\` first, or pass a file path:\n` +
                '  yarn example:speechTranscription ./my-recording.mp3'
        );
        process.exit(1);
    }

    const caller = new LLMCaller('openai', 'gpt-4o-mini-transcribe', 'You are a helpful assistant.');

    const result = await caller.transcribe({
        file,
        model: 'gpt-4o-mini-transcribe'
    });

    console.log('Transcript:', result.text);
    if (result.language) console.log('Language:', result.language);
    if (result.duration !== undefined) console.log('Duration (s):', result.duration);
    console.log('Usage:', JSON.stringify(result.usage, null, 2));
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
