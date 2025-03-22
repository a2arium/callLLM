import { logger } from '../../utils/logger';
import { UniversalStreamResponse } from '../../interfaces/UniversalInterfaces';
import { ToolCall } from '../../types/tooling';

/**
 * Represents a buffer for a single tool call's arguments
 */
type ToolCallBuffer = {
    id: string;
    name: string;
    argumentsBuffer: string;
    isComplete: boolean;
    startedAt: number;
};

/**
 * StreamBuffer handles the accumulation of content and tool call arguments
 * across multiple stream chunks. It detects when tool call arguments are complete
 * and ready for execution.
 */
export class StreamBuffer {
    private toolCallBuffers = new Map<string, ToolCallBuffer>();
    private contentBuffer = '';
    private streamableContent = '';
    private readonly TOOL_ARGS_TIMEOUT_MS = 10000; // 10 second timeout for tool args collection

    constructor() {
        logger.debug('StreamBuffer initialized');
    }

    /**
     * Process a stream chunk and track tool call arguments
     * @param chunk The stream chunk to process
     * @returns Object containing streamable content and completed tool calls
     */
    processChunk(chunk: UniversalStreamResponse): {
        streamableContent: string;
        completedToolCalls: ToolCall[];
        isComplete: boolean;
    } {
        // Reset streamable content for this chunk
        this.streamableContent = '';

        // Accumulate content
        if (chunk.content) {
            this.contentBuffer += chunk.content;
            this.streamableContent = chunk.content;
        }

        // Process tool calls
        const completedToolCalls: ToolCall[] = [];

        // Process incoming tool calls
        if (chunk.toolCalls?.length) {
            chunk.toolCalls.forEach(toolCall => {
                const id = (toolCall as any).id || `tool-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                const name = toolCall.name;
                const args = typeof toolCall.arguments === 'string'
                    ? toolCall.arguments
                    : JSON.stringify(toolCall.arguments);

                // Check if we already have a buffer for this tool call
                if (!this.toolCallBuffers.has(id)) {
                    // Create a new buffer
                    this.toolCallBuffers.set(id, {
                        id,
                        name,
                        argumentsBuffer: args,
                        isComplete: false,
                        startedAt: Date.now()
                    });
                } else {
                    // Update existing buffer
                    const buffer = this.toolCallBuffers.get(id)!;
                    buffer.argumentsBuffer += args;
                }
            });
        }

        // Check for completed tool calls
        this.toolCallBuffers.forEach((buffer, id) => {
            if (buffer.isComplete) {
                return; // Skip already completed buffers
            }

            try {
                // Try to parse the arguments as JSON
                const args = buffer.argumentsBuffer.trim();

                // Check if JSON is complete by counting braces
                let openBraces = 0;
                let inString = false;
                let escaped = false;

                for (let i = 0; i < args.length; i++) {
                    const char = args[i];

                    if (escaped) {
                        escaped = false;
                        continue;
                    }

                    if (char === '\\' && inString) {
                        escaped = true;
                        continue;
                    }

                    if (char === '"' && !escaped) {
                        inString = !inString;
                        continue;
                    }

                    if (!inString) {
                        if (char === '{' || char === '[') {
                            openBraces++;
                        } else if (char === '}' || char === ']') {
                            openBraces--;
                        }
                    }
                }

                // Also check for timeout to prevent hanging
                const timeSinceStart = Date.now() - buffer.startedAt;

                // JSON is complete if braces are balanced or we've timed out
                if (openBraces === 0 && args.length > 0 && (args.startsWith('{') || args.startsWith('['))) {
                    // Valid complete JSON
                    try {
                        const parsedArgs = JSON.parse(args);
                        completedToolCalls.push({
                            id: buffer.id,
                            name: buffer.name,
                            parameters: parsedArgs
                        });
                        buffer.isComplete = true;
                        logger.debug('Tool call arguments complete', { id, name: buffer.name });
                    } catch (e) {
                        // Not valid JSON yet
                        if (timeSinceStart > this.TOOL_ARGS_TIMEOUT_MS) {
                            logger.warn('Tool call arguments timed out, trying to parse anyway', { id, error: e });
                            // Force completion on timeout
                            completedToolCalls.push({
                                id: buffer.id,
                                name: buffer.name,
                                parameters: { value: buffer.argumentsBuffer }
                            });
                            buffer.isComplete = true;
                        }
                    }
                } else if (timeSinceStart > this.TOOL_ARGS_TIMEOUT_MS) {
                    // Timeout reached, force completion
                    logger.warn('Tool call arguments timed out', { id, timeSinceStart });
                    completedToolCalls.push({
                        id: buffer.id,
                        name: buffer.name,
                        parameters: { value: buffer.argumentsBuffer }
                    });
                    buffer.isComplete = true;
                }
            } catch (error) {
                logger.error('Error processing tool call buffer', { id, error });
                // On error, mark as complete and return what we have
                if (Date.now() - buffer.startedAt > this.TOOL_ARGS_TIMEOUT_MS) {
                    completedToolCalls.push({
                        id: buffer.id,
                        name: buffer.name,
                        parameters: { value: buffer.argumentsBuffer }
                    });
                    buffer.isComplete = true;
                }
            }
        });

        return {
            streamableContent: this.streamableContent,
            completedToolCalls,
            isComplete: chunk.isComplete || false
        };
    }

    /**
     * Get all currently accumulated content
     */
    getAccumulatedContent(): string {
        return this.contentBuffer;
    }

    /**
     * Reset the buffer for a new streaming session
     */
    reset(): void {
        this.toolCallBuffers.clear();
        this.contentBuffer = '';
        this.streamableContent = '';
    }
} 