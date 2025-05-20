import type { StreamChunk, IStreamProcessor } from "../types.js";
import { logger } from "../../../utils/logger.js";

/**
 * ReasoningProcessor
 * 
 * A stream processor that extracts and manages reasoning content from stream chunks.
 * The processor accumulates reasoning content from stream chunks and adds it to metadata.
 * 
 * This processor ensures that reasoning is properly tracked and persisted across chunks,
 * making it available in the final response or via its getter methods.
 */
export class ReasoningProcessor implements IStreamProcessor {
    private accumulatedReasoning = "";
    private hasReasoningContent = false;

    constructor() {
        logger.setConfig({
            level: process.env.LOG_LEVEL as any || 'info',
            prefix: 'ReasoningProcessor'
        });
        logger.debug('ReasoningProcessor initialized');
    }

    async *processStream(stream: AsyncIterable<StreamChunk>): AsyncIterable<StreamChunk> {
        logger.debug('Starting to process stream for reasoning');

        for await (const chunk of stream) {
            logger.debug('Processing chunk for reasoning:', {
                hasReasoning: chunk.reasoning ? true : false,
                reasoningLength: chunk.reasoning ? chunk.reasoning.length : 0
            });

            // Accumulate reasoning content if present
            if (chunk.reasoning) {
                this.accumulatedReasoning += chunk.reasoning;
                this.hasReasoningContent = true;
                logger.debug(`Accumulated reasoning, length: ${this.accumulatedReasoning.length}`);
            }

            // Enhanced metadata with reasoning information
            const enhancedMetadata = {
                ...(chunk.metadata || {}),
                accumulatedReasoning: this.accumulatedReasoning,
                hasReasoningContent: this.hasReasoningContent
            };

            // Yield the enhanced chunk
            yield {
                ...chunk,
                metadata: enhancedMetadata
            };
        }

        logger.debug('Finished processing stream for reasoning');
    }

    /**
     * Returns the accumulated reasoning content
     */
    getAccumulatedReasoning(): string {
        logger.debug(`Getting accumulated reasoning, length: ${this.accumulatedReasoning.length}`);
        return this.accumulatedReasoning;
    }

    /**
     * Indicates whether any reasoning content was received
     */
    hasReasoning(): boolean {
        return this.hasReasoningContent;
    }

    /**
     * Resets the processor state
     */
    reset(): void {
        logger.debug('Resetting ReasoningProcessor');
        this.accumulatedReasoning = "";
        this.hasReasoningContent = false;
    }
} 