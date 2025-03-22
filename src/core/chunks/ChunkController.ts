import { TokenCalculator } from '../models/TokenCalculator';
import { logger } from '../../utils/logger';
import { DataSplitter } from '../processors/DataSplitter';
import type { UniversalMessage, UniversalChatResponse, UniversalStreamResponse } from '../../interfaces/UniversalInterfaces';
import { ChatController } from '../chat/ChatController';
import { StreamController } from '../streaming/StreamController';

/**
 * Error thrown when chunk iteration limit is exceeded
 */
export class ChunkIterationLimitError extends Error {
    constructor(maxIterations: number) {
        super(`Chunk iteration limit of ${maxIterations} exceeded`);
        this.name = "ChunkIterationLimitError";
    }
}

export type ChunkProcessingParams = {
    model: string;
    systemMessage: string;
    historicalMessages?: UniversalMessage[];
    settings?: Record<string, unknown>;
};

/**
 * ChunkController is responsible for managing the processing of data chunks.
 * It handles the chunking of large data and coordinates the processing of each chunk,
 * completely separate from tool orchestration.
 */
export class ChunkController {
    private iterationCount: number = 0;
    private maxIterations: number;
    private dataSplitter: DataSplitter;

    /**
     * Creates a new ChunkController instance
     * @param tokenCalculator - The TokenCalculator instance for token calculations
     * @param chatController - The ChatController for LLM interactions
     * @param streamController - The StreamController for streaming responses
     * @param maxIterations - Maximum number of chunk iterations allowed (default: 20)
     */
    constructor(
        private tokenCalculator: TokenCalculator,
        private chatController: ChatController,
        private streamController: StreamController,
        maxIterations: number = 20
    ) {
        this.maxIterations = maxIterations;
        this.dataSplitter = new DataSplitter(tokenCalculator);

        logger.setConfig({
            level: process.env.LOG_LEVEL as any || 'info',
            prefix: 'ChunkController'
        });
        logger.debug(`Initialized with maxIterations: ${maxIterations}`);
    }

    /**
     * Processes chunked data for non-streaming responses
     */
    async processChunks(
        messages: string[],
        params: ChunkProcessingParams
    ): Promise<UniversalChatResponse[]> {
        this.resetIterationCount();
        const responses: UniversalChatResponse[] = [];

        for (const message of messages) {
            if (this.iterationCount >= this.maxIterations) {
                logger.warn(`Chunk iteration limit exceeded: ${this.maxIterations}`);
                throw new ChunkIterationLimitError(this.maxIterations);
            }
            this.iterationCount++;

            const response = await this.chatController.execute({
                model: params.model,
                systemMessage: params.systemMessage,
                settings: params.settings,
                historicalMessages: [
                    ...(params.historicalMessages || []),
                    { role: 'user', content: message }
                ]
            });

            responses.push(response);
        }

        return responses;
    }

    /**
     * Processes chunked data for streaming responses
     */
    async *streamChunks(
        messages: string[],
        params: ChunkProcessingParams
    ): AsyncIterable<UniversalStreamResponse> {
        this.resetIterationCount();

        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            const isLastChunk = i === messages.length - 1;

            if (this.iterationCount >= this.maxIterations) {
                logger.warn(`Chunk iteration limit exceeded: ${this.maxIterations}`);
                throw new ChunkIterationLimitError(this.maxIterations);
            }
            this.iterationCount++;

            const stream = await this.streamController.createStream(
                params.model,
                {
                    messages: [
                        { role: 'system', content: params.systemMessage },
                        ...(params.historicalMessages || []),
                        { role: 'user', content: message }
                    ],
                    settings: params.settings
                },
                0 // inputTokens, not important for our case
            );

            let accumulatedContent = '';

            for await (const chunk of stream) {
                accumulatedContent += chunk.content;

                // Forward the chunk to caller
                yield {
                    ...chunk,
                    isComplete: chunk.isComplete && isLastChunk
                };
            }
        }
    }

    /**
     * Resets the iteration counter
     */
    resetIterationCount(): void {
        this.iterationCount = 0;
    }
} 