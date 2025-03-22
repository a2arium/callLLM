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
    private chunkCount = 0;

    constructor() {
        logger.setConfig({
            level: process.env.LOG_LEVEL as any || 'info',
            prefix: 'StreamBuffer'
        });
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
        this.chunkCount++;
        const startTime = Date.now();

        // Reset streamable content for this chunk
        this.streamableContent = '';

        logger.debug('Processing chunk on receiving', {
            chunkIndex: this.chunkCount,
            chunk: chunk,
            activeToolBuffers: this.toolCallBuffers.size
        });

        // Accumulate content
        if (chunk.content) {
            this.contentBuffer += chunk.content;
            this.streamableContent = chunk.content;
        }

        // Process tool calls
        const completedToolCalls: ToolCall[] = [];

        // Process incoming tool calls
        if (chunk.toolCalls?.length) {
            logger.debug('Processing tool calls from chunk', {
                count: chunk.toolCalls.length,
                chunkIndex: this.chunkCount
            });

            chunk.toolCalls.forEach(toolCall => {
                const id = (toolCall as any).id || `tool-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                const name = toolCall.name;
                const args = typeof toolCall.arguments === 'string'
                    ? toolCall.arguments
                    : JSON.stringify(toolCall.arguments);

                // Check if we already have a buffer for this tool call
                if (!this.toolCallBuffers.has(id)) {
                    // Create a new buffer
                    logger.debug('Creating new tool call buffer', {
                        toolId: id,
                        toolName: name,
                        initialArgLength: args.length,
                        chunkIndex: this.chunkCount
                    });

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
                    const prevLength = buffer.argumentsBuffer.length;
                    buffer.argumentsBuffer += args;

                    logger.debug('Updated existing tool call buffer', {
                        toolId: id,
                        toolName: name,
                        prevArgLength: prevLength,
                        newArgLength: buffer.argumentsBuffer.length,
                        addedLength: args.length,
                        chunkIndex: this.chunkCount,
                        bufferAgeMs: Date.now() - buffer.startedAt
                    });
                }
            });
        }

        // Check for completed tool calls
        let buffersChecked = 0;
        this.toolCallBuffers.forEach((buffer, id) => {
            buffersChecked++;
            if (buffer.isComplete) {
                return; // Skip already completed buffers
            }

            try {
                // Try to parse the arguments as JSON
                const args = buffer.argumentsBuffer.trim();
                const bufferAgeMs = Date.now() - buffer.startedAt;

                logger.debug('Checking tool call buffer completeness', {
                    toolId: id,
                    toolName: buffer.name,
                    argLength: args.length,
                    bufferAgeMs,
                    chunkIndex: this.chunkCount,
                    firstChar: args.charAt(0),
                    lastChar: args.charAt(args.length - 1)
                });

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

                logger.debug('JSON structure analysis', {
                    toolId: id,
                    openBraces,
                    inString,
                    startsWithBraceOrBracket: args.length > 0 && (args.startsWith('{') || args.startsWith('[')),
                    bufferAgeMs,
                    chunkIndex: this.chunkCount,
                    isTimeoutPending: bufferAgeMs > this.TOOL_ARGS_TIMEOUT_MS
                });

                // Also check for timeout to prevent hanging
                const timeSinceStart = Date.now() - buffer.startedAt;

                // JSON is complete if braces are balanced or we've timed out
                if (openBraces === 0 && args.length > 0 && (args.startsWith('{') || args.startsWith('['))) {
                    // Valid complete JSON
                    try {
                        const parsedArgs = JSON.parse(args);
                        logger.info('Tool call args complete - JSON is valid and complete', {
                            toolId: id,
                            toolName: buffer.name,
                            argLength: args.length,
                            bufferAgeMs,
                            chunkIndex: this.chunkCount
                        });

                        completedToolCalls.push({
                            id: buffer.id,
                            name: buffer.name,
                            parameters: parsedArgs
                        });
                        buffer.isComplete = true;
                        logger.debug('Tool call arguments complete', { id, name: buffer.name });
                    } catch (e) {
                        // Not valid JSON yet
                        logger.debug('JSON parse failed despite balanced braces', {
                            toolId: id,
                            error: e instanceof Error ? e.message : 'Unknown error',
                            argLength: args.length,
                            bufferAgeMs
                        });

                        if (timeSinceStart > this.TOOL_ARGS_TIMEOUT_MS) {
                            logger.warn('Tool call arguments timed out, trying to parse anyway', {
                                id,
                                error: e,
                                timeMs: timeSinceStart,
                                argLength: args.length
                            });
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
                    logger.warn('Tool call arguments timed out', {
                        id,
                        timeSinceStart,
                        openBraces,
                        argLength: args.length,
                        chunkIndex: this.chunkCount
                    });
                    completedToolCalls.push({
                        id: buffer.id,
                        name: buffer.name,
                        parameters: { value: buffer.argumentsBuffer }
                    });
                    buffer.isComplete = true;
                }
            } catch (error) {
                logger.error('Error processing tool call buffer', {
                    id,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    bufferAgeMs: Date.now() - buffer.startedAt,
                    chunkIndex: this.chunkCount
                });
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

        if (completedToolCalls.length > 0) {
            logger.info('Completed tool calls this chunk', {
                count: completedToolCalls.length,
                toolNames: completedToolCalls.map(t => t.name),
                chunkIndex: this.chunkCount,
                processingTimeMs: Date.now() - startTime
            });
        }

        logger.debug('Chunk processing complete', {
            chunkIndex: this.chunkCount,
            completedToolCalls: completedToolCalls.length,
            buffersChecked,
            activeBuffers: this.toolCallBuffers.size,
            contentLength: this.streamableContent.length,
            isComplete: chunk.isComplete || false,
            processingTimeMs: Date.now() - startTime
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
        logger.debug('Resetting stream buffer', {
            previousBuffers: this.toolCallBuffers.size,
            contentLength: this.contentBuffer.length,
            chunkCount: this.chunkCount
        });
        this.toolCallBuffers.clear();
        this.contentBuffer = '';
        this.streamableContent = '';
        this.chunkCount = 0;
    }
} 