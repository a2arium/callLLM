import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { logger } from '../../utils/logger.ts';
import type { TranscriptionSplitThresholds } from './transcriptionLimits.ts';
import { DEFAULT_SPLIT_CHUNK_SECONDS } from './transcriptionLimits.ts';
import { TranscriptionFfmpegError } from './transcriptionFfmpegError.ts';

const log = logger.createLogger({ prefix: 'ffmpegAudioPrep' });

type RunResult = { code: number; stdout: string; stderr: string };

function runCommand(cmd: string, args: string[]): Promise<RunResult> {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        child.stdout?.on('data', (chunk: Buffer) => {
            stdout += chunk.toString();
        });
        child.stderr?.on('data', (chunk: Buffer) => {
            stderr += chunk.toString();
        });
        child.on('error', err => {
            reject(err);
        });
        child.on('close', code => {
            resolve({ code: code ?? 1, stdout, stderr });
        });
    });
}

function verifyToolVersion(tool: 'ffmpeg' | 'ffprobe'): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn(tool, ['-hide_banner', '-version'], { stdio: ['ignore', 'pipe', 'pipe'] });
        let stderr = '';
        child.stderr?.on('data', (c: Buffer) => {
            stderr += c.toString();
        });
        child.stdout?.on('data', (c: Buffer) => {
            stderr += c.toString();
        });
        child.on('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'ENOENT') {
                reject(new TranscriptionFfmpegError(tool, 'not_found', { cause: err }));
            } else {
                reject(new TranscriptionFfmpegError(tool, 'spawn_failed', { cause: err }));
            }
        });
        child.on('close', code => {
            if (code === 0) {
                resolve();
            } else {
                reject(
                    new TranscriptionFfmpegError(tool, 'bad_exit', {
                        exitCode: code ?? undefined,
                        stderr
                    })
                );
            }
        });
    });
}

/**
 * Ensures `ffmpeg` and `ffprobe` are available on PATH. Throws {@link TranscriptionFfmpegError} with a long, actionable message.
 */
export async function assertFfmpegAvailable(): Promise<void> {
    await verifyToolVersion('ffmpeg');
    await verifyToolVersion('ffprobe');
}

export type AudioTranscodeFormat = 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';

export type TranscodeAudioBufferOptions = {
    input: Buffer;
    inputMime: string;
    outputFormat: AudioTranscodeFormat;
};

export type TranscodeAudioBufferResult = {
    data: Buffer;
    mime: string;
    format: AudioTranscodeFormat;
};

function parsePcmRate(mime: string): number {
    const match = /rate=(\d+)/i.exec(mime);
    return match ? Number(match[1]) : 24000;
}

function isRawPcmMime(mime: string): boolean {
    const lower = mime.toLowerCase();
    return lower.includes('audio/l16') || lower.includes('audio/pcm');
}

function outputMime(format: AudioTranscodeFormat): string {
    switch (format) {
        case 'mp3': return 'audio/mpeg';
        case 'opus': return 'audio/opus';
        case 'aac': return 'audio/aac';
        case 'flac': return 'audio/flac';
        case 'wav': return 'audio/wav';
        case 'pcm': return 'audio/pcm';
    }
}

function codecArgs(format: AudioTranscodeFormat): string[] {
    switch (format) {
        case 'mp3': return ['-codec:a', 'libmp3lame'];
        case 'opus': return ['-codec:a', 'libopus'];
        case 'aac': return ['-codec:a', 'aac'];
        case 'flac': return ['-codec:a', 'flac'];
        case 'wav': return ['-codec:a', 'pcm_s16le'];
        case 'pcm': return ['-f', 's16le', '-codec:a', 'pcm_s16le'];
    }
}

/**
 * Transcodes a synthesized audio buffer to the requested output format.
 * Raw Gemini PCM/L16 input is described explicitly to ffmpeg; container formats are auto-detected.
 */
export async function transcodeAudioBuffer(options: TranscodeAudioBufferOptions): Promise<TranscodeAudioBufferResult> {
    await assertFfmpegAvailable();

    const workDir = path.join(os.tmpdir(), `callllm-audio-transcode-${randomUUID()}`);
    await fsPromises.mkdir(workDir, { recursive: true });

    const inputIsRawPcm = isRawPcmMime(options.inputMime);
    const inputPath = path.join(workDir, inputIsRawPcm ? 'input.pcm' : 'input.audio');
    const outputPath = path.join(workDir, `output.${options.outputFormat}`);

    try {
        await fsPromises.writeFile(inputPath, options.input);
        const args = [
            '-hide_banner',
            '-loglevel',
            'error',
            '-y',
        ];
        if (inputIsRawPcm) {
            args.push('-f', 's16le', '-ar', String(parsePcmRate(options.inputMime)), '-ac', '1');
        }
        args.push('-i', inputPath, ...codecArgs(options.outputFormat), outputPath);

        const { code, stderr } = await runCommand('ffmpeg', args);
        if (code !== 0) {
            throw new TranscriptionFfmpegError('ffmpeg', 'bad_exit', { exitCode: code, stderr });
        }

        return {
            data: await fsPromises.readFile(outputPath),
            mime: outputMime(options.outputFormat),
            format: options.outputFormat,
        };
    } catch (err) {
        const e = err as NodeJS.ErrnoException;
        if (e.code === 'ENOENT') {
            throw new TranscriptionFfmpegError('ffmpeg', 'not_found', { cause: e });
        }
        throw err;
    } finally {
        await fsPromises.rm(workDir, { recursive: true, force: true });
    }
}

/**
 * Whether the file reference is a resolvable local path (not URL or data URI).
 */
export function isLocalAudioFilePath(file: string): boolean {
    const t = file.trim();
    if (!t) return false;
    if (t.startsWith('data:') || t.startsWith('http://') || t.startsWith('https://')) {
        return false;
    }
    try {
        return fs.existsSync(path.resolve(t));
    } catch {
        return false;
    }
}

/**
 * Returns container duration in seconds, or null if ffprobe could not read it.
 */
export async function getAudioDurationSeconds(filePath: string): Promise<number | null> {
    const resolved = path.resolve(filePath);
    try {
        const { code, stdout, stderr } = await runCommand('ffprobe', [
            '-v',
            'error',
            '-show_entries',
            'format=duration',
            '-of',
            'default=noprint_wrappers=1:nokey=1',
            resolved
        ]);
        if (code !== 0) {
            log.warn('ffprobe duration failed', { stderr: stderr.slice(-500) });
            return null;
        }
        const parsed = Number.parseFloat(stdout.trim());
        if (!Number.isFinite(parsed) || parsed < 0) {
            return null;
        }
        return parsed;
    } catch (err) {
        const e = err as NodeJS.ErrnoException;
        if (e.code === 'ENOENT') {
            throw new TranscriptionFfmpegError('ffprobe', 'not_found', { cause: e });
        }
        throw err;
    }
}

/**
 * True if local file size alone exceeds the model byte threshold (no ffprobe).
 */
export async function localFileExceedsTranscriptionByteThreshold(
    filePath: string,
    thresholds: TranscriptionSplitThresholds
): Promise<boolean> {
    const resolved = path.resolve(filePath);
    const st = await fsPromises.stat(resolved);
    return st.size > thresholds.maxFileBytesForSplit;
}

/**
 * True if duration (ffprobe) exceeds threshold. Call only after {@link assertFfmpegAvailable}.
 */
export async function localFileExceedsTranscriptionDurationThreshold(
    filePath: string,
    thresholds: TranscriptionSplitThresholds
): Promise<boolean> {
    if (thresholds.maxDurationSecondsForSplit === null) {
        return false;
    }
    const resolved = path.resolve(filePath);
    const duration = await getAudioDurationSeconds(resolved);
    return duration !== null && duration > thresholds.maxDurationSecondsForSplit;
}

export type SplitAudioResult = {
    chunkPaths: string[];
    cleanup: () => Promise<void>;
};

/**
 * Re-encodes to mono 16 kHz MP3 and splits into fixed-length segments.
 * Output files are under a unique temp directory; call `cleanup()` when done.
 */
export async function splitLocalAudioForTranscription(
    inputPath: string,
    options?: { chunkSeconds?: number; workDir?: string }
): Promise<SplitAudioResult> {
    const resolved = path.resolve(inputPath);
    const chunkSeconds = options?.chunkSeconds ?? DEFAULT_SPLIT_CHUNK_SECONDS;
    const workDir = options?.workDir ?? path.join(os.tmpdir(), `callllm-audio-chunks-${randomUUID()}`);

    await fsPromises.mkdir(workDir, { recursive: true });
    const pattern = path.join(workDir, 'chunk_%03d.mp3');

    const args = [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-i',
        resolved,
        '-f',
        'segment',
        '-segment_time',
        String(chunkSeconds),
        '-reset_timestamps',
        '1',
        '-c:a',
        'libmp3lame',
        '-b:a',
        '64k',
        '-ac',
        '1',
        '-ar',
        '16000',
        pattern
    ];

    let code: number;
    let stderr: string;
    try {
        const r = await runCommand('ffmpeg', args);
        code = r.code;
        stderr = r.stderr;
    } catch (err) {
        await fsPromises.rm(workDir, { recursive: true, force: true });
        const e = err as NodeJS.ErrnoException;
        if (e.code === 'ENOENT') {
            throw new TranscriptionFfmpegError('ffmpeg', 'not_found', { cause: e });
        }
        throw err;
    }

    if (code !== 0) {
        await fsPromises.rm(workDir, { recursive: true, force: true });
        throw new TranscriptionFfmpegError('ffmpeg', 'bad_exit', { exitCode: code, stderr });
    }

    const names = (await fsPromises.readdir(workDir))
        .filter(n => n.startsWith('chunk_') && n.endsWith('.mp3'))
        .sort();
    const chunkPaths = names.map(n => path.join(workDir, n));

    if (chunkPaths.length === 0) {
        await fsPromises.rm(workDir, { recursive: true, force: true });
        throw new Error('ffmpeg produced no audio chunks');
    }

    log.debug('Split audio for transcription', { chunks: chunkPaths.length, workDir });

    return {
        chunkPaths,
        cleanup: async () => {
            await fsPromises.rm(workDir, { recursive: true, force: true });
        }
    };
}
