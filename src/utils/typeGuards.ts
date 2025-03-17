import { UniversalStreamResponse } from '../interfaces/UniversalInterfaces';

/**
 * Type guard to check if a stream chunk is complete and has contentText
 * @param chunk The stream chunk to check
 * @returns True if the chunk is complete and has contentText
 */
export function isCompleteStreamChunk<T>(chunk: UniversalStreamResponse<T>): chunk is UniversalStreamResponse<T> & { contentText: string } {
    return chunk.isComplete && typeof chunk.contentText === 'string';
} 