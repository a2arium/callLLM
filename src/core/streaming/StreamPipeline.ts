import type { StreamChunk, IStreamProcessor } from "./types.js";
import { logger } from '../../utils/logger.js';

export class StreamPipeline implements IStreamProcessor {
    private processors: IStreamProcessor[];

    constructor(processors: IStreamProcessor[] = []) {
        this.processors = processors;
        logger.setConfig({
            level: process.env.LOG_LEVEL as any || 'debug',
            prefix: 'StreamPipeline'
        });
    }

    addProcessor(processor: IStreamProcessor): void {
        this.processors.push(processor);
    }

    async *processStream(stream: AsyncIterable<StreamChunk>): AsyncIterable<StreamChunk> {
        const log = logger.createLogger({ prefix: 'StreamPipeline.processStream' });
        let currentStream = stream;

        // Apply each processor in sequence
        for (const processor of this.processors) {
            log.debug('Processing stream with processor:', processor.constructor.name);
            currentStream = processor.processStream(currentStream);
        }
        // Yield the fully processed stream
        yield* currentStream;
    }
} 