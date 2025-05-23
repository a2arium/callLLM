import type { StreamChunk, IStreamProcessor, ToolCallChunk } from "../types.ts";
import type { ToolCall } from "../../../types/tooling.ts";
import { logger } from "../../../utils/logger.ts";
import { FinishReason } from "../../../interfaces/UniversalInterfaces.ts";

// Track the accumulation state of a tool call
type ToolCallAccumulator = {
    id?: string;
    name: string;
    accumulatedArguments: string;
    isComplete: boolean;
};

export class ContentAccumulator implements IStreamProcessor {
    private accumulatedContent = "";
    private inProgressToolCalls: Map<number, ToolCallAccumulator> = new Map();
    private completedToolCalls: ToolCall[] = [];

    constructor() {
        logger.setConfig({
            level: process.env.LOG_LEVEL as any || 'info',
            prefix: 'ContentAccumulator'
        });
        logger.debug('ContentAccumulator initialized');
    }

    async *processStream(stream: AsyncIterable<StreamChunk>): AsyncIterable<StreamChunk> {
        logger.debug('Starting to process stream');

        for await (const chunk of stream) {
            logger.debug('Processing chunk to accumulate:', { chunk });

            // Accumulate content from all chunks, including the final chunk
            if (chunk.content) {
                this.accumulatedContent += chunk.content;
                logger.debug(`Accumulated content, length: ${this.accumulatedContent.length}`);
            }

            // Handle tool calls directly present in the chunk
            if (chunk.toolCalls && chunk.toolCalls.length > 0) {
                logger.debug(`Processing ${chunk.toolCalls.length} complete tool calls from chunk`);
                // Store these directly in the completedToolCalls array
                this.completedToolCalls.push(...chunk.toolCalls);
                logger.debug('Added tool calls from chunk:',
                    chunk.toolCalls.map(call => ({ id: call.id, name: call.name }))
                );
            }

            // Process any raw tool call chunks
            if (chunk.toolCallChunks?.length) {
                logger.debug(`Processing ${chunk.toolCallChunks.length} raw tool call chunks`);

                for (const toolChunk of chunk.toolCallChunks) {
                    // Get or initialize this tool call
                    if (!this.inProgressToolCalls.has(toolChunk.index) && toolChunk.name) {
                        logger.debug(`Initializing new tool call accumulator with index: ${toolChunk.index}, name: ${toolChunk.name}`);

                        this.inProgressToolCalls.set(toolChunk.index, {
                            id: toolChunk.id,
                            name: toolChunk.name,
                            accumulatedArguments: '',
                            isComplete: false
                        });
                    }

                    // Accumulate arguments
                    const call = this.inProgressToolCalls.get(toolChunk.index);
                    if (call && toolChunk.argumentsChunk) {
                        logger.debug(`Accumulated arguments for index ${toolChunk.index}, length: ${call.accumulatedArguments.length}`);
                        logger.debug('Accumulating arguments', {
                            index: toolChunk.index,
                            name: call.name,
                            newChunk: toolChunk.argumentsChunk
                        });

                        call.accumulatedArguments += toolChunk.argumentsChunk;

                        logger.debug('Current accumulated arguments', {
                            index: toolChunk.index,
                            arguments: call.accumulatedArguments
                        });
                    }
                }
            }


            // Check for completion
            if (chunk.isComplete && chunk.metadata?.finishReason === FinishReason.TOOL_CALLS) {
                logger.debug('Stream complete with TOOL_CALLS finish reason, marking all tool calls as complete');
                // Mark all tool calls as complete
                for (const [index, call] of this.inProgressToolCalls.entries()) {
                    call.isComplete = true;
                    logger.debug(`Marked tool call at index ${index} as complete`);
                }
            }

            // Convert completed tool calls to ToolCall format
            const completedToolCalls: ToolCall[] = [];

            for (const [index, call] of this.inProgressToolCalls.entries()) {
                if (call.isComplete) {
                    try {
                        logger.debug(`Attempting to parse arguments for tool call at index ${index}`);
                        const callArguments = JSON.parse(call.accumulatedArguments);

                        const completedCall = {
                            id: call.id,
                            name: call.name,
                            arguments: callArguments
                        };

                        completedToolCalls.push(completedCall);
                        // Also store in our completed calls array for later retrieval
                        this.completedToolCalls.push(completedCall);

                        logger.debug(`Successfully parsed arguments for tool: ${call.name}, index: ${index}`);

                        // Remove completed tool calls
                        this.inProgressToolCalls.delete(index);
                    } catch (e) {
                        // If JSON parsing fails, it wasn't complete after all
                        const error = e as Error;
                        logger.debug(`Failed to parse tool arguments at index ${index}: ${error.message}`);
                        call.isComplete = false;
                    }
                }
            }

            // Log the completed tool calls for this chunk
            if (completedToolCalls.length > 0) {
                logger.debug(`Completed ${completedToolCalls.length} tool call(s) in this chunk`);
                logger.debug('Completed tool calls', { completedToolCalls });
                completedToolCalls.forEach(call => {
                    logger.debug(`Completed tool: ${call.name}, id: ${call.id}, params: ${JSON.stringify(call.arguments)}`);
                });
            }

            // Yield the enhanced chunk
            yield {
                ...chunk,
                content: chunk.content,
                toolCalls: completedToolCalls.length > 0 ? completedToolCalls : undefined,
                metadata: {
                    ...(chunk.metadata || {}),
                    accumulatedContent: this.accumulatedContent,
                    toolCallsInProgress: this.inProgressToolCalls.size
                }
            };
        }

        logger.debug('Finished processing stream');
    }


    getAccumulatedContent(): string {
        logger.debug(`Getting accumulated content, length: ${this.accumulatedContent.length}`);
        return this.accumulatedContent;
    }

    getCompletedToolCalls(): ToolCall[] {
        logger.debug(`Getting completed tool calls, count: ${this.completedToolCalls.length}`);

        // Return the stored completed tool calls
        return [...this.completedToolCalls];
    }

    reset(): void {
        logger.debug('Resetting ContentAccumulator');
        this.accumulatedContent = "";
        this.inProgressToolCalls.clear();
        this.completedToolCalls = [];
    }
} 