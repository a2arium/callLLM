import type { ToolCall } from '../../types/tooling';

/**
 * Represents a partial tool call chunk as received from provider
 */
export type ToolCallChunk = {
    id?: string;
    index: number;
    name?: string;
    argumentsChunk?: string;
};

export type StreamChunk = {
    content?: string;
    toolCalls?: ToolCall[];
    toolCallChunks?: ToolCallChunk[];
    isComplete?: boolean;
    metadata?: Record<string, unknown>;
};

export type IStreamProcessor = {
    processStream(stream: AsyncIterable<StreamChunk>): AsyncIterable<StreamChunk>;
};

export type IRetryPolicy = {
    shouldRetry(error: Error, attempt: number): boolean;
    getDelayMs(attempt: number): number;
};

export type IStreamFactory = {
    createStream(params: Record<string, unknown>): AsyncIterable<StreamChunk>;
};

export type IStreamConverter = {
    convert(stream: AsyncIterable<unknown>): AsyncIterable<StreamChunk>;
};

export abstract class BaseStreamHandler implements IStreamProcessor {
    abstract processStream(stream: AsyncIterable<StreamChunk>): AsyncIterable<StreamChunk>;
} 