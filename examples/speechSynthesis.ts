import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { LLMCaller } from '../src/core/caller/LLMCaller.ts';
import { getDirname } from '../src/utils/paths.ts';

const __dirname = getDirname(import.meta.url);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Text-to-speech via `synthesizeSpeech` (OpenAI `audio/speech`).
 *
 * Requires OPENAI_API_KEY. Run: `yarn example:speechSynthesis`
 * Output: `examples/output/speech-example.mp3` (overwritten each run).
 */
async function main(): Promise<void> {
    if (!process.env.OPENAI_API_KEY) {
        console.error('Set OPENAI_API_KEY in .env or the environment.');
        process.exit(1);
    }

    const outDir = path.join(__dirname, 'output');
    const outputPath = path.join(outDir, 'speech-example.mp3');
    await fs.promises.mkdir(outDir, { recursive: true });

    const caller = new LLMCaller('openai', 'gpt-4o-mini-tts', 'You are a helpful assistant.');

    const text =
        process.argv[2] ||
        'Hello. This sample was generated with callllm synthesizeSpeech and saved as an MP3 file.';

    const result = await caller.synthesizeSpeech({
        input: text,
        model: 'gpt-4o-mini-tts',
        voice: 'alloy',
        responseFormat: 'mp3',
        outputPath
    });

    console.log('Saved:', result.metadata?.audioSavedPath ?? outputPath);
    console.log('MIME:', result.audio.mime, 'bytes:', result.audio.sizeBytes);
    console.log('Usage:', JSON.stringify(result.usage, null, 2));
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
