import * as os from 'os';

export type TranscriptionFfmpegErrorKind = 'not_found' | 'spawn_failed' | 'bad_exit';

/**
 * Thrown when audio processing cannot run ffmpeg/ffprobe.
 * Message is multi-line for logs and terminal display.
 */
export class TranscriptionFfmpegError extends Error {
    readonly tool: 'ffmpeg' | 'ffprobe';

    readonly kind: TranscriptionFfmpegErrorKind;

    readonly exitCode?: number;

    readonly stderrSnippet?: string;

    /** Underlying spawn or system error when available (mirrors `Error.cause` for older TS lib targets). */
    readonly cause?: Error;

    constructor(
        tool: 'ffmpeg' | 'ffprobe',
        kind: TranscriptionFfmpegErrorKind,
        options?: { cause?: Error; exitCode?: number; stderr?: string }
    ) {
        super(TranscriptionFfmpegError.formatMessage(tool, kind, options));
        this.name = 'TranscriptionFfmpegError';
        this.tool = tool;
        this.kind = kind;
        this.exitCode = options?.exitCode;
        if (options?.stderr) {
            this.stderrSnippet = options.stderr.length > 2000 ? `${options.stderr.slice(-2000)}…` : options.stderr;
        }
        if (options?.cause !== undefined) {
            this.cause = options.cause;
        }
    }

    private static formatMessage(
        tool: 'ffmpeg' | 'ffprobe',
        kind: TranscriptionFfmpegErrorKind,
        options?: { cause?: Error; exitCode?: number; stderr?: string }
    ): string {
        const platform = os.platform();
        const lines: string[] = [
            `[callllm] Cannot run "${tool}" for audio processing.`,
            '',
            'What this means:',
            '- callllm uses the FFmpeg toolchain for local audio processing.',
            '- This includes chunked transcription and speech-output transcoding when a provider cannot natively return the requested format.',
            '- Both `ffmpeg` and `ffprobe` must be installed and visible on the same PATH your Node process uses.',
            '- If only one of the two is missing, install the full `ffmpeg` package (it normally ships both binaries).',
            '',
            `Detected platform: ${platform} (${os.arch()}).`,
            '',
            'How to install (pick one that matches your environment):',
            '- macOS (Homebrew):     brew install ffmpeg',
            '- Ubuntu / Debian:      sudo apt update && sudo apt install -y ffmpeg',
            '- Fedora / RHEL:        sudo dnf install ffmpeg',
            '- Arch:                 sudo pacman -S ffmpeg',
            '- Nix (dev shell):      nix-shell -p ffmpeg',
            '- Windows (Chocolatey): choco install ffmpeg',
            '- Windows (winget):     winget install --id Gyan.FFmpeg',
            '',
            'Containers / CI:',
            '- Debian-based image:   RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*',
            '- Alpine:               RUN apk add --no-cache ffmpeg',
            '- GitHub Actions ubuntu-latest: add a step `sudo apt-get update && sudo apt-get install -y ffmpeg` if the runner image lacks it.',
            '',
            'Verify in a new terminal (same user / environment as the app):',
            '  which ffmpeg && which ffprobe',
            '  ffmpeg -version',
            '  ffprobe -version',
            '',
            'If both print version banners but Node still fails:',
            '- Compare PATH: run `node -e "console.log(process.env.PATH)"` and ensure the directory containing ffmpeg/ffprobe appears there.',
            '- IDEs, launchd, systemd, PM2, and Docker often use a minimal PATH; set PATH in the service file or shell profile the process actually loads.',
            ''
        ];

        if (kind === 'not_found') {
            lines.push(
                `Reason: "${tool}" was not found (typical cause: executable missing or not on PATH).`,
                options?.cause?.message ? `System: ${options.cause.message}` : ''
            );
        } else if (kind === 'spawn_failed') {
            lines.push(
                `Reason: failed to start "${tool}" (permissions, sandbox, or anti-virus blocking spawn).`,
                options?.cause?.message ? `System: ${options.cause.message}` : ''
            );
        } else {
            lines.push(
                `Reason: "${tool}" exited with a non-zero status (unexpected for -version).`,
                options?.exitCode !== undefined ? `Exit code: ${options.exitCode}` : '',
                options?.stderr ? `Stderr (tail):\n${options.stderr.slice(-1500)}` : ''
            );
        }

        return lines.filter(Boolean).join('\n');
    }
}
