import type { StreamChunk, IStreamProcessor } from "./types.ts";
import { logger } from '../../utils/logger.ts';

export class StreamPipeline implements IStreamProcessor {
    private processors: IStreamProcessor[];
    private readonly log = logger.createLogger({ prefix: 'StreamPipeline' });

    constructor(processors: IStreamProcessor[] = []) {
        this.processors = processors;
    }

    addProcessor(processor: IStreamProcessor): void {
        this.processors.push(processor);
    }

    async *processStream(stream: AsyncIterable<StreamChunk>): AsyncIterable<StreamChunk> {
        let currentStream = stream;

        // Apply each processor in sequence
        for (const processor of this.processors) {
            this.log.debug('Processing stream with processor:', processor.constructor.name);
            currentStream = processor.processStream(currentStream);
        }
        // Yield the fully processed stream
        yield* currentStream;
    }
} 
