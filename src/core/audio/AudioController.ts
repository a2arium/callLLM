import type {
    TranscriptionParams,
    TranslationParams,
    SpeechParams,
    TranscriptionResponse,
    TranslationResponse,
    SpeechResponse,
    AudioOp
} from '../../interfaces/UniversalInterfaces.ts';
import type { BaseAdapter } from '../../adapters/base/baseAdapter.ts';
import { CapabilityError } from '../models/CapabilityError.ts';
import { ModelManager } from '../models/ModelManager.ts';
import { logger } from '../../utils/logger.ts';
import type { UsageCallback } from '../../interfaces/UsageInterfaces.ts';
import { UsageTracker } from '../telemetry/UsageTracker.ts';
import { normalizeUsage } from '../telemetry/UsageNormalizer.ts';
import { TokenCalculator } from '../models/TokenCalculator.ts';
import * as path from 'path';
import {
    assertFfmpegAvailable,
    isLocalAudioFilePath,
    localFileExceedsTranscriptionByteThreshold,
    localFileExceedsTranscriptionDurationThreshold,
    getAudioDurationSeconds,
    splitLocalAudioForTranscription,
    transcodeAudioBuffer
} from './ffmpegAudioPrep.ts';
import { mergeTranscriptionResponses } from './transcriptionMerge.ts';
import {
    resolveTranscriptionSplitThresholds,
    resolveSplitChunkSeconds
} from './transcriptionLimits.ts';

export class AudioController {
    private log = logger.createLogger({ prefix: 'AudioController' });
    private usageTracker: UsageTracker;

    constructor(
        private adapter: BaseAdapter,
        private modelManager: ModelManager,
        private tokenCalculator: TokenCalculator,
        private globalUsageCallback?: UsageCallback,
        private callerId?: string
    ) {
        this.usageTracker = new UsageTracker(
            this.tokenCalculator,
            this.globalUsageCallback,
            this.callerId || 'unknown'
        );
    }

    async transcribe(params: TranscriptionParams): Promise<TranscriptionResponse> {
        this.log.debug('Transcribe request', { model: params.model, file: params.file?.slice(0, 80) });

        if (params.splitLargeFile === true) {
            const fileRef = params.file.trim();
            if (!isLocalAudioFilePath(fileRef)) {
                throw new Error(
                    'transcribe with splitLargeFile requires a local file path. For remote audio, download to disk first or omit splitLargeFile.'
                );
            }
            const absolute = path.resolve(fileRef);
            const modelInfo = this.modelManager.getModel(params.model);
            const thresholds = resolveTranscriptionSplitThresholds(modelInfo);

            const tooBigByBytes = await localFileExceedsTranscriptionByteThreshold(absolute, thresholds);
            let needsSplit = tooBigByBytes;

            let ffmpegReady = false;
            const ensureFfmpeg = async (): Promise<void> => {
                if (!ffmpegReady) {
                    await assertFfmpegAvailable();
                    ffmpegReady = true;
                }
            };

            if (!needsSplit && thresholds.maxDurationSecondsForSplit !== null) {
                await ensureFfmpeg();
                needsSplit = await localFileExceedsTranscriptionDurationThreshold(absolute, thresholds);
            }

            if (!needsSplit) {
                return this.transcribeSingle(params, { dispatchUsage: true });
            }

            await ensureFfmpeg();
            const chunkSeconds = resolveSplitChunkSeconds(params.splitChunkSeconds, thresholds);
            const { chunkPaths, cleanup } = await splitLocalAudioForTranscription(absolute, { chunkSeconds });
            try {
                const parts: TranscriptionResponse[] = [];
                for (const chunkPath of chunkPaths) {
                    const { splitLargeFile: _s, splitChunkSeconds: _c, ...rest } = params;
                    parts.push(
                        await this.transcribeSingle({ ...rest, file: chunkPath }, { dispatchUsage: false })
                    );
                }
                const merged = mergeTranscriptionResponses(parts, params.model);
                await this.dispatchUsageCallbacks(params.usageCallback, merged.usage);
                this.log.info('Chunked transcription completed', {
                    model: params.model,
                    chunks: chunkPaths.length,
                    textLength: merged.text?.length
                });
                return merged;
            } catch (error) {
                this.log.error('Chunked transcription failed:', error, { model: params.model });
                throw error;
            } finally {
                await cleanup();
            }
        }

        return this.transcribeSingle(params, { dispatchUsage: true });
    }

    private async transcribeSingle(
        params: TranscriptionParams,
        options?: { dispatchUsage: boolean }
    ): Promise<TranscriptionResponse> {
        const dispatchUsage = options?.dispatchUsage !== false;
        this.validateAudioSupport(params.model, 'transcribe');
        if (!this.adapter.audioCall) {
            throw new CapabilityError('Provider does not support audio operations');
        }
        try {
            const response = await this.adapter.audioCall(params.model, 'transcribe', params) as TranscriptionResponse;
            if (dispatchUsage) {
                await this.dispatchUsageCallbacks(params.usageCallback, response.usage);
            }
            this.log.info('Transcription completed', { model: params.model, textLength: response.text?.length });
            return response;
        } catch (error) {
            this.log.error('Transcription failed:', error, { model: params.model });
            throw error;
        }
    }

    async translate(params: TranslationParams): Promise<TranslationResponse> {
        this.log.debug('Audio translation request', { model: params.model, file: params.file?.slice(0, 80) });
        this.validateAudioSupport(params.model, 'translate');
        if (!this.adapter.audioCall) {
            throw new CapabilityError('Provider does not support audio operations');
        }
        try {
            const response = await this.adapter.audioCall(params.model, 'translate', params);
            await this.dispatchUsageCallbacks(params.usageCallback, response.usage);
            this.log.info('Audio translation completed', { model: params.model, textLength: (response as TranslationResponse).text?.length });
            return response as TranslationResponse;
        } catch (error) {
            this.log.error('Audio translation failed:', error, { model: params.model });
            throw error;
        }
    }

    async synthesize(params: SpeechParams): Promise<SpeechResponse> {
        this.log.debug('Speech synthesis request', { model: params.model, inputLength: params.input?.length });
        this.validateAudioSupport(params.model, 'synthesize');
        if (!this.adapter.audioCall) {
            throw new CapabilityError('Provider does not support audio operations');
        }
        try {
            const response = await this.adapter.audioCall(params.model, 'synthesize', params) as SpeechResponse;
            const normalizedOutput = await this.normalizeSpeechOutput(response, params);
            const normalized = await this.ensureSpeechOutputDuration(normalizedOutput);
            await this.dispatchUsageCallbacks(params.usageCallback, normalized.usage);
            this.log.info('Speech synthesis completed', {
                model: params.model,
                sizeBytes: normalized.audio?.sizeBytes
            });
            return normalized;
        } catch (error) {
            this.log.error('Speech synthesis failed:', error, { model: params.model });
            throw error;
        }
    }

    private async dispatchUsageCallbacks(
        perCallCallback: UsageCallback | undefined,
        usage: TranscriptionResponse['usage']
    ): Promise<void> {
        try {
            await this.usageTracker.triggerCallback(usage);
        } catch (error) {
            this.log.warn('Global usage callback failed:', error);
        }
        if (perCallCallback) {
            try {
                await perCallCallback({
                    callerId: this.callerId || 'unknown',
                    usage: normalizeUsage(usage),
                    timestamp: Date.now()
                });
            } catch (error) {
                this.log.warn('Per-call usage callback failed:', error);
            }
        }
    }

    private async normalizeSpeechOutput(response: SpeechResponse, params: SpeechParams): Promise<SpeechResponse> {
        const requestedFormat = params.responseFormat ?? this.formatFromPath(params.outputPath);
        if (!requestedFormat || response.audio.format === requestedFormat) {
            return response;
        }

        const inputBuffer = Buffer.from(response.audio.data, 'base64');
        const transcoded = await transcodeAudioBuffer({
            input: inputBuffer,
            inputMime: response.audio.mime,
            outputFormat: requestedFormat as 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm'
        });

        let audioSavedPath = response.metadata?.audioSavedPath;
        if (params.outputPath) {
            const targetPath = this.pathWithAudioExtension(params.outputPath, transcoded.format);
            const fs = await import('fs/promises');
            await fs.mkdir(path.dirname(targetPath), { recursive: true });
            await fs.writeFile(targetPath, transcoded.data);
            if (audioSavedPath && audioSavedPath !== targetPath) {
                await fs.rm(audioSavedPath, { force: true });
            }
            audioSavedPath = targetPath;
        }

        return {
            ...response,
            audio: {
                data: transcoded.data.toString('base64'),
                mime: transcoded.mime,
                format: transcoded.format,
                sizeBytes: transcoded.data.length
            },
            metadata: {
                ...response.metadata,
                audioSavedPath,
                usage: response.usage
            }
        };
    }

    private async ensureSpeechOutputDuration(response: SpeechResponse): Promise<SpeechResponse> {
        if (response.usage.durations?.output?.audio !== undefined) {
            return response;
        }

        const audioSavedPath = response.metadata?.audioSavedPath;
        if (!audioSavedPath) {
            return response;
        }

        try {
            const duration = await getAudioDurationSeconds(audioSavedPath);
            if (duration === null || duration <= 0) {
                return response;
            }

            const usage = normalizeUsage({
                ...response.usage,
                durations: {
                    ...response.usage.durations,
                    output: {
                        ...response.usage.durations?.output,
                        audio: duration
                    },
                    unit: 'seconds'
                }
            });

            return {
                ...response,
                usage,
                metadata: {
                    ...response.metadata,
                    usage
                }
            };
        } catch (error) {
            this.log.warn('Could not determine synthesized audio duration with ffprobe:', error);
            return response;
        }
    }

    private pathWithAudioExtension(outputPath: string, format: SpeechResponse['audio']['format']): string {
        const expectedExt = `.${format}`;
        if (path.extname(outputPath).toLowerCase() === expectedExt) {
            return outputPath;
        }
        return path.join(path.dirname(outputPath), `${path.basename(outputPath, path.extname(outputPath))}${expectedExt}`);
    }

    private formatFromPath(outputPath: string | undefined): SpeechResponse['audio']['format'] | undefined {
        if (!outputPath) return undefined;
        const ext = path.extname(outputPath).toLowerCase().replace('.', '');
        if (ext === 'mp3' || ext === 'opus' || ext === 'aac' || ext === 'flac' || ext === 'wav' || ext === 'pcm') {
            return ext;
        }
        return undefined;
    }

    private validateAudioSupport(modelName: string, op: AudioOp): void {
        const capabilities = ModelManager.getCapabilities(modelName);
        const audioCap = capabilities.audio;
        if (!audioCap) {
            throw new CapabilityError(`Model ${modelName} does not support audio APIs`);
        }
        if (typeof audioCap === 'boolean') {
            this.log.debug('Model audio capability validated (boolean true)', { model: modelName, op });
            return;
        }
        if (op === 'transcribe' && audioCap.transcribe !== true) {
            throw new CapabilityError(`Model ${modelName} does not support transcription`);
        }
        if (op === 'translate' && audioCap.translate !== true) {
            throw new CapabilityError(`Model ${modelName} does not support audio translation`);
        }
        if (op === 'synthesize' && audioCap.synthesize !== true) {
            throw new CapabilityError(`Model ${modelName} does not support speech synthesis`);
        }
        this.log.debug('Model audio capability validated', { model: modelName, op });
    }

    /**
     * Inspect standalone audio API support for a model.
     */
    public checkAudioCapabilities(modelName: string): {
        supported: boolean;
        transcribe?: boolean;
        translate?: boolean;
        synthesize?: boolean;
        supportedInputFormats?: string[];
        supportedOutputFormats?: string[];
        voices?: string[];
    } {
        const capabilities = ModelManager.getCapabilities(modelName);
        const audioCap = capabilities.audio;
        if (!audioCap) {
            return { supported: false };
        }
        if (typeof audioCap === 'boolean') {
            return {
                supported: true,
                transcribe: true,
                translate: true,
                synthesize: true
            };
        }
        return {
            supported: true,
            transcribe: audioCap.transcribe === true,
            translate: audioCap.translate === true,
            synthesize: audioCap.synthesize === true,
            supportedInputFormats: audioCap.supportedInputFormats,
            supportedOutputFormats: audioCap.supportedOutputFormats,
            voices: audioCap.voices
        };
    }
}
