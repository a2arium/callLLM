import * as dotenv from 'dotenv';
import * as path from 'path';
import { resolveFromFile } from './paths.ts';

// Load environment variables using cross-platform path resolution
// Use resolveFromFile without parameter - it will use getImportMetaUrl internally
dotenv.config({ path: resolveFromFile(undefined, '../../.env') });

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LoggerConfig = {
    level?: LogLevel;
    prefix?: string;
};

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

/**
 * Logger class with support for isolated instances to prevent prefix/level conflicts
 * between different parts of the codebase.
 */
export class Logger {
    private static rootInstance: Logger;
    private level: LogLevel;
    private prefix: string;

    /**
     * Create a new Logger instance with isolated state
     */
    constructor(config?: LoggerConfig) {
        this.level = config?.level || (process.env.LOG_LEVEL as LogLevel) || 'info';
        this.prefix = config?.prefix || '';
    }

    /**
     * Get the global singleton root logger instance
     */
    public static getInstance(): Logger {
        if (!Logger.rootInstance) {
            Logger.rootInstance = new Logger();
        }
        return Logger.rootInstance;
    }

    /**
     * Static log method for backward compatibility with older code
     * @param message Message to log
     * @param args Additional arguments
     */
    public static log(message: string, ...args: unknown[]): void {
        Logger.getInstance().info(message, ...args);
    }

    /**
     * Create a new isolated logger instance with its own configuration
     * @param config Optional configuration (level defaults to process.env.LOG_LEVEL)
     * @returns A new Logger instance with isolated state
     */
    public createLogger(config?: LoggerConfig): Logger {
        return new Logger(config);
    }

    /**
     * Configure this logger instance
     * @param config Configuration options
     */
    public setConfig(config: LoggerConfig): void {
        if (config.level) {
            this.level = config.level;
        }
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

// Export the root logger instance
export const logger = Logger.getInstance(); 