import { describe, it, expect } from '@jest/globals';
import { TranscriptionFfmpegError } from '../../../../core/audio/transcriptionFfmpegError.ts';

describe('TranscriptionFfmpegError', () => {
    it('formats not_found with install and PATH guidance', () => {
        const err = new TranscriptionFfmpegError('ffprobe', 'not_found', {
            cause: new Error('spawn ffprobe ENOENT')
        });
        expect(err).toBeInstanceOf(Error);
        expect(err.name).toBe('TranscriptionFfmpegError');
        expect(err.tool).toBe('ffprobe');
        expect(err.kind).toBe('not_found');
        expect(err.message).toContain('ffprobe');
        expect(err.message).toContain('brew install ffmpeg');
        expect(err.message).toContain('which ffmpeg');
        expect(err.message).toContain('process.env.PATH');
        expect(err.cause?.message).toBe('spawn ffprobe ENOENT');
    });

    it('includes stderr tail for bad_exit', () => {
        const err = new TranscriptionFfmpegError('ffmpeg', 'bad_exit', {
            exitCode: 1,
            stderr: 'x'.repeat(100) + 'tail-marker'
        });
        expect(err.exitCode).toBe(1);
        expect(err.stderrSnippet).toContain('tail-marker');
        expect(err.message).toContain('tail-marker');
    });
});
