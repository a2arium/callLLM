import { describe, it, expect, jest } from '@jest/globals';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { GeminiAdapter } from '@/adapters/gemini/adapter.ts';

describe('GeminiAdapter audio', () => {
    it('maps Gemini transcription usage metadata to non-zero audio cost', async () => {
        const adapter = new GeminiAdapter({ apiKey: 'test-gemini-key' });
        const audioData = `data:audio/wav;base64,${Buffer.alloc(100).toString('base64')}`;
        const generateContent = jest.fn().mockResolvedValue({
            text: 'hello world',
            usageMetadata: {
                promptTokenCount: 120,
                candidatesTokenCount: 4,
                totalTokenCount: 124,
            },
        });
        (adapter as unknown as { client: unknown }).client = {
            models: { generateContent },
        };

        const result = await adapter.audioCall('gemini-3.1-flash-lite', 'transcribe', {
            file: audioData,
            model: 'gemini-3.1-flash-lite',
        });

        expect(result.text).toBe('hello world');
        expect(result.usage.tokens.input.total).toBe(120);
        expect(result.usage.tokens.input.audio).toBe(120);
        expect(result.usage.tokens.output.total).toBe(4);
        expect(result.usage.costs.input.audio).toBeGreaterThan(0);
        expect(result.usage.costs.total).toBeGreaterThan(0);
    });

    it('wraps Gemini PCM speech output as WAV and maps usage', async () => {
        const adapter = new GeminiAdapter({ apiKey: 'test-gemini-key' });
        const pcm = Buffer.alloc(48000, 0);
        const generateContent = jest.fn().mockResolvedValue({
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                inlineData: {
                                    data: pcm.toString('base64'),
                                    mimeType: 'audio/L16;codec=pcm;rate=24000',
                                },
                            },
                        ],
                    },
                },
            ],
            usageMetadata: {
                promptTokenCount: 8,
                candidatesTokenCount: 50,
                totalTokenCount: 58,
            },
        });
        (adapter as unknown as { client: unknown }).client = {
            models: { generateContent },
        };

        const outPath = path.join(os.tmpdir(), `gemini-tts-${Date.now()}.wav`);
        try {
            const result = await adapter.audioCall('gemini-2.5-flash-preview-tts', 'synthesize', {
                input: 'Hello from Gemini.',
                model: 'gemini-2.5-flash-preview-tts',
                voice: 'alloy',
                responseFormat: 'wav',
                outputPath: outPath,
            });

            expect(result.audio.mime).toBe('audio/wav');
            expect(result.audio.format).toBe('wav');
            expect(result.audio.sizeBytes).toBe(pcm.length + 44);
            expect(result.usage.tokens.input.total).toBe(8);
            expect(result.usage.tokens.output.audio).toBe(50);
            expect(result.usage.costs.output.audio).toBeGreaterThan(0);
            expect(result.usage.durations).toEqual({
                output: { audio: 1 },
                total: 1,
                unit: 'seconds',
            });
            expect(result.metadata?.audioSavedPath).toBe(outPath);
            expect(fs.readFileSync(outPath).subarray(0, 4).toString('ascii')).toBe('RIFF');
            expect(fs.readFileSync(outPath).subarray(8, 12).toString('ascii')).toBe('WAVE');
            expect(generateContent).toHaveBeenCalledWith(
                expect.objectContaining({
                    config: expect.objectContaining({
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: 'Despina',
                                },
                            },
                        },
                    }),
                }),
            );
        } finally {
            if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
        }
    });

    it('maps OpenAI-style voice names to Gemini voices with gender-aware families', async () => {
        const expected: Record<string, string> = {
            alloy: 'Despina',
            ash: 'Sadachbia',
            ballad: 'Algieba',
            coral: 'Autonoe',
            echo: 'Iapetus',
            fable: 'Rasalgethi',
            onyx: 'Orus',
            nova: 'Laomedeia',
            sage: 'Gacrux',
            shimmer: 'Achernar',
            verse: 'Sadaltager',
            marin: 'Sulafat',
            cedar: 'Schedar',
        };

        for (const [openAiVoice, geminiVoice] of Object.entries(expected)) {
            const adapter = new GeminiAdapter({ apiKey: 'test-gemini-key' });
            const generateContent = jest.fn().mockResolvedValue({
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    inlineData: {
                                        data: Buffer.alloc(10).toString('base64'),
                                        mimeType: 'audio/L16;codec=pcm;rate=24000',
                                    },
                                },
                            ],
                        },
                    },
                ],
            });
            (adapter as unknown as { client: unknown }).client = {
                models: { generateContent },
            };

            await adapter.audioCall('gemini-2.5-flash-preview-tts', 'synthesize', {
                input: 'Hello',
                model: 'gemini-2.5-flash-preview-tts',
                voice: openAiVoice,
            });

            expect(generateContent).toHaveBeenCalledWith(
                expect.objectContaining({
                    config: expect.objectContaining({
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: geminiVoice,
                                },
                            },
                        },
                    }),
                }),
            );
        }
    });

    it('passes provider-native Gemini voices through unchanged', async () => {
        const adapter = new GeminiAdapter({ apiKey: 'test-gemini-key' });
        const generateContent = jest.fn().mockResolvedValue({
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                inlineData: {
                                    data: Buffer.alloc(10).toString('base64'),
                                    mimeType: 'audio/L16;codec=pcm;rate=24000',
                                },
                            },
                        ],
                    },
                },
            ],
        });
        (adapter as unknown as { client: unknown }).client = {
            models: { generateContent },
        };

        await adapter.audioCall('gemini-2.5-flash-preview-tts', 'synthesize', {
            input: 'Hello',
            model: 'gemini-2.5-flash-preview-tts',
            voice: { id: 'Charon' },
        });

        expect(generateContent).toHaveBeenCalledWith(
            expect.objectContaining({
                config: expect.objectContaining({
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: 'Charon',
                            },
                        },
                    },
                }),
            }),
        );
    });
});
