import type { ToolCall } from './tooling';
import type { Usage } from '../interfaces/UniversalInterfaces';

export type StreamChunk = {
    content?: string;
    contentText?: string;
    toolCalls?: ToolCall[];
    isComplete?: boolean;
    usage?: Usage;
}; 