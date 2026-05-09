import { GoogleGenAI } from '@google/genai';
import { BaseAdapter, type AdapterConfig } from '../base/baseAdapter.ts';
import type { LLMProvider, LLMProviderEmbedding, LLMProviderImage, LLMProviderAudio, LLMProviderVideo, ImageOp, ImageCallParams, AudioOp, VideoCallParams } from '../../interfaces/LLMProvider.ts';
import { saveBase64ToFile } from '../../core/file-data/fileData.ts';
import type {
    UniversalChatParams,
    UniversalChatResponse,
    UniversalStreamResponse,
    EmbeddingParams,
    EmbeddingResponse,
    TranscriptionParams,
    TranslationParams,
    SpeechParams,
    TranscriptionResponse,
    TranslationResponse,
    SpeechResponse,
} from '../../interfaces/UniversalInterfaces.ts';
import { logger } from '../../utils/logger.ts';
import { FinishReason } from '../../interfaces/UniversalInterfaces.ts';
import { ModelManager } from '../../core/models/ModelManager.ts';
import type { RegisteredProviders } from '../index.ts';
import { TokenCalculator } from '../../core/models/TokenCalculator.ts';
import { GeminiConverter } from './converter.ts';
import { GeminiStreamHandler } from './stream.ts';
import { mapGeminiError, GeminiAdapterError } from './errors.ts';
import type { GeminiResponse } from './types.ts';

/**
 * Adapter for Google Gemini using the @google/genai SDK
 */
export class GeminiAdapter extends BaseAdapter implements LLMProvider, LLMProviderEmbedding, LLMProviderImage, LLMProviderAudio, LLMProviderVideo {
    private client: GoogleGenAI;
    private converter: GeminiConverter;
    private streamHandler: GeminiStreamHandler | undefined;
    private modelManager: ModelManager;
    private tokenCalculator: TokenCalculator;

    constructor(config: Partial<AdapterConfig> | string) {
        const configObj = typeof config === 'string' ? { apiKey: config } : config;

        const apiKey = configObj?.apiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new GeminiAdapterError('Gemini API key is required. Please provide it in the config or set GEMINI_API_KEY environment variable.');
        }

        super({
            apiKey,
            baseUrl: configObj?.baseUrl,
            organization: configObj?.organization,
        });

        this.client = new GoogleGenAI({ apiKey: this.config.apiKey });

        this.modelManager = new ModelManager('gemini' as RegisteredProviders);
        this.tokenCalculator = new TokenCalculator();
        this.converter = new GeminiConverter(this.modelManager);
        this.streamHandler = undefined;
    }

    async chatCall(model: string, params: UniversalChatParams): Promise<UniversalChatResponse> {
        const log = logger.createLogger({ prefix: 'GeminiAdapter.chatCall' });
        log.debug('Converting params for model:', model);

        const geminiParams = await this.converter.convertToProviderParams(model, params);
        log.debug('Converted Gemini params for model:', model);

        try {
            const response = await this.client.models.generateContent(geminiParams);
            const universalResponse = this.converter.convertFromProviderResponse(response as GeminiResponse, model);
            log.debug('Converted universal response:', {
                hasContent: universalResponse.content !== null,
                toolCalls: universalResponse.toolCalls?.length ?? 0,
            });
            return universalResponse;
        } catch (error: unknown) {
            const mapped = mapGeminiError(error);
            logger.createLogger({ prefix: 'GeminiAdapter.chatCall' }).error('API call failed:', mapped);
            throw mapped;
        }
    }

    async streamCall(model: string, params: UniversalChatParams): Promise<AsyncIterable<UniversalStreamResponse>> {
        const log = logger.createLogger({ prefix: 'GeminiAdapter.streamCall' });
        log.debug('Converting params for streaming, model:', model);

        const geminiParams = await this.converter.convertToProviderParams(model, params, { stream: true });
        log.debug('Converted Gemini streaming params for model:', model);

        try {
            const stream = await this.client.models.generateContentStream(geminiParams);
            this.streamHandler = new GeminiStreamHandler(this.tokenCalculator);
            return this.streamHandler.handleStream(stream);
        } catch (error: unknown) {
            const mapped = mapGeminiError(error);
            logger.createLogger({ prefix: 'GeminiAdapter.streamCall' }).error('Streaming call failed:', mapped);
            throw mapped;
        }
    }

    async embeddingCall(model: string, params: EmbeddingParams): Promise<EmbeddingResponse> {
        const log = logger.createLogger({ prefix: 'GeminiAdapter.embeddingCall' });
        log.debug('Calling embedContent for model:', model);

        try {
            const contents = Array.isArray(params.input) ? params.input : [params.input];
            const response = await this.client.models.embedContent({
                model,
                contents,
                config: {
                    outputDimensionality: params.dimensions,
                },
            });

            const embeddings = (response.embeddings ?? []).map((emb, idx) => ({
                embedding: emb.values ?? [],
                index: idx,
                object: 'embedding' as const,
            }));

            return {
                embeddings,
                model,
                usage: {
                    tokens: {
                        input: { total: 0, cached: 0 },
                        output: { total: 0, reasoning: 0 },
                        total: 0,
                    },
                    costs: {
                        input: { total: 0, cached: 0 },
                        output: { total: 0, reasoning: 0 },
                        total: 0,
                    },
                },
            };
        } catch (error: unknown) {
            const mapped = mapGeminiError(error);
            log.error('Embedding call failed:', mapped);
            throw mapped;
        }
    }

    async imageCall(model: string, op: ImageOp, params: ImageCallParams): Promise<UniversalChatResponse> {
        const log = logger.createLogger({ prefix: 'GeminiAdapter.imageCall' });
        log.debug('Image call:', { model, op });

        try {
            // Nano Banana models generate images through generateContent with responseModalities
            const parts: Array<Record<string, unknown>> = [];

            // Add text prompt
            if (params.prompt) {
                parts.push({ text: params.prompt });
            }

            // Add reference images for edit operations
            if ((op === 'edit' || op === 'edit-masked') && params.files && params.files.length > 0) {
                for (const fileSource of params.files) {
                    if ('data' in fileSource && 'mime' in fileSource) {
                        parts.push({
                            inlineData: {
                                mimeType: (fileSource as Record<string, unknown>).mime || 'image/png',
                                data: (fileSource as Record<string, unknown>).data,
                            },
                        });
                    }
                }
            }

            const config: Record<string, unknown> = {
                responseModalities: ['TEXT', 'IMAGE'],
            };

            const geminiParams = {
                model,
                contents: [{ role: 'user' as const, parts }],
                config,
            };

            const response = await this.client.models.generateContent(geminiParams as any);
            const universal = this.converter.convertFromProviderResponse(response as GeminiResponse, model);

            // If the response has an image, set the operation type and save to file
            if (universal.image) {
                universal.image.operation = op;

                // Save image to file if outputPath is provided
                if (params.outputPath && universal.image.data) {
                    try {
                        const savedPath = await saveBase64ToFile(
                            universal.image.data,
                            params.outputPath,
                            universal.image.mime?.split('/')[1] || 'png',
                        );
                        universal.metadata = universal.metadata ?? {};
                        universal.metadata.imageSavedPath = savedPath;
                        log.debug('Image saved to:', savedPath);
                    } catch (saveErr) {
                        log.error('Failed to save image:', saveErr);
                    }
                }
            }

            return universal;
        } catch (error: unknown) {
            const mapped = mapGeminiError(error);
            log.error('Image call failed:', mapped);
            throw mapped;
        }
    }

    async audioCall(
        model: string,
        op: AudioOp,
        params: TranscriptionParams | TranslationParams | SpeechParams,
    ): Promise<TranscriptionResponse | TranslationResponse | SpeechResponse> {
        const log = logger.createLogger({ prefix: 'GeminiAdapter.audioCall' });
        log.debug('Audio call:', { model, op });

        try {
            if (op === 'synthesize') {
                return await this.synthesizeSpeech(model, params as SpeechParams);
            }

            if (op === 'transcribe' || op === 'translate') {
                return await this.transcribeOrTranslate(model, op, params as TranscriptionParams | TranslationParams);
            }

            throw new GeminiAdapterError(`Unsupported audio operation: ${op}`);
        } catch (error: unknown) {
            if (error instanceof GeminiAdapterError) throw error;
            const mapped = mapGeminiError(error);
            log.error('Audio call failed:', mapped);
            throw mapped;
        }
    }

    private static readonly OPENAI_TO_GEMINI_VOICE: Record<string, string> = {
        alloy: 'achernar',
        echo: 'charon',
        fable: 'leda',
        onyx: 'orus',
        nova: 'kore',
        shimmer: 'puck',
    };

    private mapVoice(voice: string | Record<string, unknown> | undefined): string | undefined {
        if (!voice) return undefined;
        const name = typeof voice === 'string' ? voice : (voice.name as string);
        if (!name) return undefined;
        return GeminiAdapter.OPENAI_TO_GEMINI_VOICE[name.toLowerCase()] ?? name;
    }

    private async synthesizeSpeech(model: string, params: SpeechParams): Promise<SpeechResponse> {
        const config: Record<string, unknown> = {
            responseModalities: ['AUDIO'],
        };

        const mappedVoice = this.mapVoice(params.voice);
        if (mappedVoice) {
            config.speechConfig = {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: mappedVoice,
                    },
                },
            };
        }

        if (params.instructions) {
            config.systemInstruction = params.instructions;
        }

        const geminiParams = {
            model,
            contents: [{ role: 'user' as const, parts: [{ text: params.input }] }],
            config,
        };

        const response = await this.client.models.generateContent(geminiParams as any);
        const candidates = response.candidates ?? [];
        const parts = candidates[0]?.content?.parts ?? [];

        let audioData = '';
        let audioMime = 'audio/mp3';

        for (const part of parts) {
            if ((part as Record<string, unknown>).inlineData) {
                const blob = (part as Record<string, unknown>).inlineData as Record<string, unknown>;
                audioData = (blob.data as string) ?? '';
                audioMime = (blob.mimeType as string) ?? 'audio/mp3';
            }
        }

        let audioSavedPath: string | undefined;
        if (params.outputPath && audioData) {
            const fs = await import('fs/promises');
            const path = await import('path');
            const dir = path.dirname(params.outputPath);
            await fs.mkdir(dir, { recursive: true });
            const buffer = Buffer.from(audioData, 'base64');
            await fs.writeFile(params.outputPath, buffer);
            audioSavedPath = params.outputPath;
        }

        return {
            audio: {
                data: audioData,
                mime: audioMime,
                format: params.responseFormat ?? 'mp3',
                sizeBytes: audioData.length,
            },
            usage: {
                tokens: {
                    input: { total: 0, cached: 0 },
                    output: { total: 0, reasoning: 0 },
                    total: 0,
                },
                costs: {
                    input: { total: 0, cached: 0 },
                    output: { total: 0, reasoning: 0 },
                    total: 0,
                },
            },
            model,
            metadata: {
                model,
                audioSavedPath,
            },
        };
    }

    private async transcribeOrTranslate(
        model: string,
        op: AudioOp,
        params: TranscriptionParams | TranslationParams,
    ): Promise<TranscriptionResponse | TranslationResponse> {
        const audioFile = (params as TranscriptionParams).file;

        // Build parts with audio content
        const parts: Array<Record<string, unknown>> = [];

        // Add audio as inline data
        if (typeof audioFile === 'string') {
            if (audioFile.startsWith('data:')) {
                const match = audioFile.match(/^data:([^;]+);base64,(.+)$/);
                if (match) {
                    parts.push({
                        inlineData: { mimeType: match[1], data: match[2] },
                    });
                }
            } else if (audioFile.startsWith('http')) {
                parts.push({
                    fileData: { fileUri: audioFile },
                });
            } else {
                // Local file path - try to read as base64
                try {
                    const fs = await import('fs');
                    const path = await import('path');
                    const buffer = fs.readFileSync(audioFile);
                    const ext = path.extname(audioFile).toLowerCase();
                    const mimeMap: Record<string, string> = {
                        '.mp3': 'audio/mp3', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
                        '.m4a': 'audio/mp4', '.flac': 'audio/flac', '.webm': 'audio/webm',
                    };
                    parts.push({
                        inlineData: {
                            mimeType: mimeMap[ext] ?? 'audio/mp3',
                            data: buffer.toString('base64'),
                        },
                    });
                } catch {
                    parts.push({ text: audioFile });
                }
            }
        }

        // Add transcription/translation instruction
        const instruction = op === 'translate'
            ? 'Translate the following audio to text in English.'
            : 'Transcribe the following audio to text.';

        const geminiParams = {
            model,
            contents: [{ role: 'user' as const, parts }],
            config: {
                systemInstruction: instruction,
            },
        };

        const response = await this.client.models.generateContent(geminiParams as any);
        const text = response.text ?? '';

        const baseUsage = {
            tokens: { input: { total: 0, cached: 0 }, output: { total: 0, reasoning: 0 }, total: 0 },
            costs: { input: { total: 0, cached: 0 }, output: { total: 0, reasoning: 0 }, total: 0 },
        };

        if (op === 'translate') {
            return { text, usage: baseUsage, model } as TranslationResponse;
        }

        return { text, usage: baseUsage, model } as TranscriptionResponse;
    }

    // ═══════════════════════════════════════════
    // LLMProviderVideo (Veo)
    // ═══════════════════════════════════════════

    async videoCall(model: string, params: VideoCallParams): Promise<UniversalChatResponse> {
        const log = logger.createLogger({ prefix: 'GeminiAdapter.videoCall' });
        log.debug('Video call:', { model });

        try {
            const source: Record<string, unknown> = {};
            if (params.prompt) source.prompt = params.prompt;
            if (params.image) {
                // Reference image for video generation
                if (params.image.startsWith('data:')) {
                    const match = params.image.match(/^data:([^;]+);base64,(.+)$/);
                    if (match) {
                        source.image = { imageBytes: match[2], mimeType: match[1] };
                    }
                } else if (params.image.startsWith('http')) {
                    source.image = { fileUri: params.image };
                }
            }

            const config: Record<string, unknown> = {};
            if (params.seconds) {
                // Veo 3.1 only accepts specific values: 4, 6, or 8
                // Snap to nearest valid value
                const validDurations = [4, 6, 8];
                const requested = params.seconds;
                const snapped = validDurations.reduce((prev, curr) =>
                    Math.abs(curr - requested) < Math.abs(prev - requested) ? curr : prev
                );
                config.durationSeconds = snapped;
            }
            if (params.size) {
                const sizeToRatio: Record<string, string> = {
                    '1280x720': '16:9',
                    '720x1280': '9:16',
                    '1920x1080': '16:9',
                    '1080x1920': '9:16',
                };
                const ratio = sizeToRatio[params.size];
                if (ratio) config.aspectRatio = ratio;
            }

            const operation = await this.client.models.generateVideos({
                model,
                source: source as any,
                config: Object.keys(config).length > 0 ? config as any : undefined,
            });

            // If polling is requested, wait for completion
            if (params.wait === 'poll') {
                let op = operation;
                while (!op.done) {
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    op = await this.client.operations.getVideosOperation({ operation: op } as any);
                }

                if (op.response?.generatedVideos?.[0]) {
                    const generatedVideo = op.response.generatedVideos[0];
                    const videoObj = generatedVideo.video;
                    const videoBytes = videoObj?.videoBytes ?? '';
                    const videoUri = videoObj?.uri ?? '';

                    log.info('Video generated', {
                        hasVideoObj: Boolean(videoObj),
                        hasVideoBytes: Boolean(videoBytes),
                        videoBytesLength: videoBytes?.length ?? 0,
                        videoUri,
                        generatedVideoKeys: Object.keys(generatedVideo),
                        videoObjKeys: videoObj ? Object.keys(videoObj) : [],
                    });

                    let videoSavedPath: string | undefined;
                    if (params.outputPath) {
                        try {
                            if (videoBytes) {
                                // Save directly from base64 bytes
                                const fsPromises = await import('fs/promises');
                                const pathModule = await import('path');
                                const dir = pathModule.dirname(params.outputPath);
                                await fsPromises.mkdir(dir, { recursive: true });
                                const buffer = Buffer.from(videoBytes, 'base64');
                                await fsPromises.writeFile(params.outputPath, buffer);
                                videoSavedPath = params.outputPath;
                            } else if (videoUri) {
                                // Download from URI using fetch
                                const fsPromises = await import('fs/promises');
                                const pathModule = await import('path');
                                const dir = pathModule.dirname(params.outputPath);
                                await fsPromises.mkdir(dir, { recursive: true });

                                const apiKey = process.env.GEMINI_API_KEY ?? '';
                                const url = videoUri.includes('?')
                                    ? `${videoUri}&key=${apiKey}`
                                    : `${videoUri}?key=${apiKey}`;

                                const response = await fetch(url);
                                if (!response.ok) {
                                    throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
                                }
                                const arrayBuffer = await response.arrayBuffer();
                                await fsPromises.writeFile(params.outputPath, Buffer.from(arrayBuffer));
                                videoSavedPath = params.outputPath;
                            }
                        } catch (downloadErr) {
                            log.warn('Failed to save/download video:', downloadErr);
                        }
                    }

                    return {
                        content: `Video generated successfully`,
                        role: 'assistant',
                        metadata: {
                            finishReason: FinishReason.STOP,
                            videoJobId: op.name,
                            videoStatus: 'completed' as const,
                            videoSavedPath,
                        },
                    };
                }
            }

            // Return the operation ID for async retrieval
            return {
                content: `Video generation started`,
                role: 'assistant',
                metadata: {
                    finishReason: FinishReason.STOP,
                    videoJobId: operation.name,
                },
            };
        } catch (error: unknown) {
            const mapped = mapGeminiError(error);
            log.error('Video call failed:', mapped);
            throw mapped;
        }
    }

    async retrieveVideo(videoId: string): Promise<{ id: string; status: 'queued' | 'in_progress' | 'completed' | 'failed'; progress?: number; model?: string; seconds?: number; size?: string }> {
        const operation = await this.client.operations.getVideosOperation({
            operation: { name: videoId } as any,
        } as any);

        const status = operation.done
            ? 'completed' as const
            : operation.error
                ? 'failed' as const
                : 'in_progress' as const;

        return {
            id: videoId,
            status,
            model: operation.metadata?.model as string | undefined,
        };
    }

    async downloadVideo(videoId: string, variant?: 'video' | 'thumbnail' | 'spritesheet'): Promise<ArrayBuffer> {
        // Retrieve the operation to get the video URI
        const operation = await this.client.operations.getVideosOperation({
            operation: { name: videoId } as any,
        } as any);

        const videos = (operation.response as Record<string, unknown>)?.generatedVideos;
        if (!videos || !Array.isArray(videos) || videos.length === 0) {
            throw new GeminiAdapterError('No video available for download');
        }

        const video = videos[0] as Record<string, unknown>;
        const videoObj = video.video as Record<string, unknown>;

        if (videoObj?.uri) {
            const response = await fetch(videoObj.uri as string);
            return await response.arrayBuffer();
        }

        if (videoObj?.videoBytes) {
            const base64 = videoObj.videoBytes as string;
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            return bytes.buffer;
        }

        throw new GeminiAdapterError('No video data available for download');
    }

    async convertToProviderParams(model: string, params: UniversalChatParams): Promise<unknown> {
        return this.converter.convertToProviderParams(model, params);
    }

    convertFromProviderResponse(response: unknown, model?: string): UniversalChatResponse {
        return this.converter.convertFromProviderResponse(response as GeminiResponse, model);
    }

    convertFromProviderStreamResponse(response: unknown): UniversalStreamResponse {
        return this.streamHandler?.minimalConvert(response) || { content: '', role: 'assistant', isComplete: false };
    }
}

export default GeminiAdapter;
