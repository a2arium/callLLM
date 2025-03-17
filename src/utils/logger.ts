import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LoggerConfig = {
    level: LogLevel;
    prefix?: string;
};

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

export class Logger {
    private static instance: Logger;
    private level: LogLevel;
    private prefix: string;

    private constructor() {
        this.level = (process.env.LOG_LEVEL as LogLevel) || 'info';
        this.prefix = '';
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public setConfig(config: LoggerConfig): void {
        this.level = config.level;
        this.prefix = config.prefix || '';
    }

    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
    }

    private formatMessage(message: string): string {
        return this.prefix ? `[${this.prefix}] ${message}` : message;
    }

    public debug(message: string, ...args: unknown[]): void {
        if (this.shouldLog('debug')) {
            console.log(this.formatMessage(message), ...args);
        }
    }

    public info(message: string, ...args: unknown[]): void {
        if (this.shouldLog('info')) {
            console.log(this.formatMessage(message), ...args);
        }
    }

    public warn(message: string, ...args: unknown[]): void {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage(message), ...args);
        }
    }

    public error(message: string, ...args: unknown[]): void {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage(message), ...args);
        }
    }
}

// Export a default instance
export const logger = Logger.getInstance(); 