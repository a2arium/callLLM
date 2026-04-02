import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { OpenAI } from 'openai';
import type { AudioOp } from '@/interfaces/UniversalInterfaces.ts';
import { OpenAIResponseAdapter } from '@/adapters/openai/adapter.ts';
import {
    OpenAIResponseAuthError,
    OpenAIResponseRateLimitError,
    OpenAIResponseNetworkError,
    OpenAIResponseValidationError
} from '@/adapters/openai/errors.ts';

function writeTinyWav(filePath: string): void {
    const sampleRate = 8000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;
    const numSamples = 40;
    const dataSize = numSamples * blockAlign;
    const buffer = Buffer.alloc(44 + dataSize);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    fs.writeFileSync(filePath, buffer);
}

describe('OpenAIResponseAdapter audio', () => {
    let adapter: OpenAIResponseAdapter;
    let mockTranscriptionsCreate: jest.Mock;
    let mockTranslationsCreate: jest.Mock;
    let mockSpeechCreate: jest.Mock;

    beforeEach(() => {
        mockTranscriptionsCreate = jest.fn();
        mockTranslationsCreate = jest.fn();
        mockSpeechCreate = jest.fn();

        adapter = new OpenAIResponseAdapter({ apiKey: 'sk-test-audio' });
        (adapter as unknown as { client: OpenAI }).client = {
            audio: {
                transcriptions: { create: mockTranscriptionsCreate },
                translations: { create: mockTranslationsCreate },
                speech: { create: mockSpeechCreate }
            }
        } as unknown as OpenAI;
    });

    it('maps token-based transcription usage and text', async () => {
        mockTranscriptionsCreate.mockResolvedValue({
            text: 'hello world',
            usage: {
                type: 'tokens',
                input_tokens: 100,
                output_tokens: 20,
                total_tokens: 120,
                input_token_details: { audio_tokens: 90, text_tokens: 10 }
            }
        });

        const wav = path.join(os.tmpdir(), `stt-${Date.now()}.wav`);
        writeTinyWav(wav);
        try {
            const result = await adapter.audioCall('gpt-4o-mini-transcribe', 'transcribe', {
                file: wav,
                model: 'gpt-4o-mini-transcribe'
            });
            expect(result.text).toBe('hello world');
            expect(result.usage.tokens.input.audio).toBe(90);
            expect(result.usage.tokens.output.total).toBe(20);
        } finally {
            fs.unlinkSync(wav);
        }
        expect(mockTranscriptionsCreate).toHaveBeenCalled();
        const body = mockTranscriptionsCreate.mock.calls[0][0] as Record<string, unknown>;
        expect(body.model).toBe('gpt-4o-mini-transcribe');
        expect(body.stream).toBe(false);
    });

    it('maps duration-based transcription usage', async () => {
        mockTranscriptionsCreate.mockResolvedValue({
            text: 'x',
            usage: { type: 'duration', seconds: 12 }
        });

        const wav = path.join(os.tmpdir(), `stt2-${Date.now()}.wav`);
        writeTinyWav(wav);
        try {
            const result = await adapter.audioCall('whisper-1', 'transcribe', {
                file: wav,
                model: 'whisper-1'
            });
            expect(result.usage.durations?.inputAudioSeconds).toBe(12);
            expect(result.usage.costs.input.audio).toBeGreaterThan(0);
        } finally {
            fs.unlinkSync(wav);
        }
    });

    it('maps translation response', async () => {
        mockTranslationsCreate.mockResolvedValue({
            text: 'translated',
            usage: { type: 'tokens', input_tokens: 5, output_tokens: 1, total_tokens: 6 }
        });

        const wav = path.join(os.tmpdir(), `tr-${Date.now()}.wav`);
        writeTinyWav(wav);
        try {
            const result = await adapter.audioCall('whisper-1', 'translate', {
                file: wav,
                model: 'whisper-1'
            });
            expect(result.text).toBe('translated');
        } finally {
            fs.unlinkSync(wav);
        }
    });

    it('returns speech as base64 and optional outputPath metadata', async () => {
        const bytes = Buffer.from([0xff, 0xd8, 0xff]);
        mockSpeechCreate.mockResolvedValue({
            arrayBuffer: async () => new Uint8Array(bytes).buffer
        });

        const outDir = os.tmpdir();
        const outPath = path.join(outDir, `tts-out-${Date.now()}.mp3`);
        const result = await adapter.audioCall('gpt-4o-mini-tts', 'synthesize', {
            input: 'Hi',
            model: 'gpt-4o-mini-tts',
            voice: 'alloy',
            outputPath: outPath
        });

        expect(result.audio.format).toBe('mp3');
        expect(result.audio.data.length).toBeGreaterThan(0);
        expect(result.metadata?.audioSavedPath).toBe(outPath);
        expect(fs.existsSync(outPath)).toBe(true);
        expect(fs.readFileSync(outPath).equals(bytes)).toBe(true);
        fs.unlinkSync(outPath);
        expect(result.usage.costs.output.audio).toBeGreaterThan(0);
    });

    it('rejects unsupported audio op', async () => {
        await expect(
            adapter.audioCall('m', 'invalid' as AudioOp, {
                file: 'unused',
                model: 'm'
            })
        ).rejects.toThrow(OpenAIResponseValidationError);
    });

    it('maps OpenAI API errors to adapter errors', async () => {
        const wav = path.join(os.tmpdir(), `err-${Date.now()}.wav`);
        writeTinyWav(wav);
        try {
            mockTranscriptionsCreate.mockRejectedValue(new OpenAI.APIError(401, undefined, 'unauth', undefined));
            await expect(
                adapter.audioCall('whisper-1', 'transcribe', { file: wav, model: 'whisper-1' })
            ).rejects.toBeInstanceOf(OpenAIResponseAuthError);

            mockTranscriptionsCreate.mockRejectedValue(
                new OpenAI.APIError(429, undefined, 'limit', undefined, { headers: { 'retry-after': '30' } })
            );
            await expect(
                adapter.audioCall('whisper-1', 'transcribe', { file: wav, model: 'whisper-1' })
            ).rejects.toBeInstanceOf(OpenAIResponseRateLimitError);

            mockTranscriptionsCreate.mockRejectedValue(new OpenAI.APIError(503, undefined, 'down', undefined));
            await expect(
                adapter.audioCall('whisper-1', 'transcribe', { file: wav, model: 'whisper-1' })
            ).rejects.toBeInstanceOf(OpenAIResponseNetworkError);

            mockTranscriptionsCreate.mockRejectedValue(new OpenAI.APIError(400, undefined, 'bad', undefined));
            await expect(
                adapter.audioCall('whisper-1', 'transcribe', { file: wav, model: 'whisper-1' })
            ).rejects.toBeInstanceOf(OpenAIResponseValidationError);
        } finally {
            fs.unlinkSync(wav);
        }
    });
});
