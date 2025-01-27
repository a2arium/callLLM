import { TokenCalculator } from '../models/TokenCalculator';
import nlp from 'compromise';

export type SplitOptions = {
    forceFixedSplit?: boolean;
};

type BenchmarkData = {
    totalTime: number;
    inputLength: number;
    inputTokens: number;
    outputChunks: number;
    strategy: 'nlp' | 'fixed';
};

export class StringSplitter {
    private readonly nlpInstance: typeof nlp;

    constructor(private tokenCalculator: TokenCalculator) {
        console.log('Initializing StringSplitter...');
        this.nlpInstance = nlp;
        console.log('StringSplitter initialized');
    }

    /**
     * Splits a string into chunks based on token limits.
     * Returns both the chunks and benchmarking data.
     */
    public split(input: string, maxTokensPerChunk: number, options: SplitOptions = {}): { chunks: string[], benchmark: BenchmarkData } {
        console.log(`\nStarting split operation:
Input length: ${input.length}
Max tokens per chunk: ${maxTokensPerChunk}
Force fixed split: ${options.forceFixedSplit}`);

        const startTime = performance.now();
        let strategy: 'nlp' | 'fixed' = 'fixed';

        if (!input || maxTokensPerChunk <= 0) {
            console.log('Empty input or invalid token limit, returning empty result');
            return {
                chunks: [],
                benchmark: {
                    totalTime: performance.now() - startTime,
                    inputLength: 0,
                    inputTokens: 0,
                    outputChunks: 0,
                    strategy
                }
            };
        }

        const inputTokens = this.tokenCalculator.calculateTokens(input);
        console.log(`Input tokens: ${inputTokens}`);

        if (inputTokens <= maxTokensPerChunk) {
            console.log('Input fits in single chunk, no splitting needed');
            return {
                chunks: [input],
                benchmark: {
                    totalTime: performance.now() - startTime,
                    inputLength: input.length,
                    inputTokens,
                    outputChunks: 1,
                    strategy
                }
            };
        }

        let chunks: string[] = [];

        if (!options.forceFixedSplit && !this.shouldSkipNLP(input)) {
            console.log('Attempting NLP-based splitting...');
            try {
                const nlpChunks = this.splitWithNLP(input, maxTokensPerChunk);
                if (nlpChunks.length > 0) {
                    chunks = nlpChunks;
                    strategy = 'nlp';
                    console.log(`NLP splitting successful, created ${chunks.length} chunks`);
                }
            } catch (error) {
                console.log('NLP splitting failed, falling back to fixed splitting:', error);
            }
        } else {
            console.log('Skipping NLP splitting due to options or content type');
        }

        if (chunks.length === 0) {
            console.log('Using fixed splitting strategy...');
            chunks = this.splitFixed(input, maxTokensPerChunk);
            console.log(`Fixed splitting created ${chunks.length} chunks`);
        }

        const endTime = performance.now();
        const totalTime = endTime - startTime;

        console.log('\nSplitting Benchmark:');
        console.log(`Strategy: ${strategy}`);
        console.log(`Input length: ${input.length} chars`);
        console.log(`Input tokens: ${inputTokens}`);
        console.log(`Output chunks: ${chunks.length}`);
        console.log(`Total time: ${totalTime.toFixed(2)}ms`);
        console.log(`Average time per chunk: ${(totalTime / chunks.length).toFixed(2)}ms`);
        console.log(`Processing speed: ${(input.length / totalTime * 1000).toFixed(2)} chars/second`);

        return {
            chunks,
            benchmark: {
                totalTime,
                inputLength: input.length,
                inputTokens,
                outputChunks: chunks.length,
                strategy
            }
        };
    }

    private shouldSkipNLP(text: string): boolean {
        // Allow common punctuation but still catch unusual symbols
        const unusualSymbolsRegex = /[^a-zA-Z0-9\s.,!?:;'"()-]/;
        const shouldSkip = text.length > 100000 ||
            /\d{10,}/.test(text) || // Long number sequences
            (unusualSymbolsRegex.test(text.slice(0, 100)) && // Unusual symbols in first 100 chars
                text.slice(0, 100).match(unusualSymbolsRegex)!.length > 5); // More than 5 different unusual symbols
        console.log(`NLP skip check result: ${shouldSkip}`);
        return shouldSkip;
    }

    private splitSentences(text: string): string[] {
        console.log('Splitting text into sentences using compromise...');
        // const doc = this.nlpInstance(text);
        // const sentences = doc.sentences().out('array');
        const sentences = this.nlpInstance.tokenize(text).fullSentences().out('array')
        console.log(`Found ${sentences.length} sentences`);
        return sentences;
    }

    private splitWithNLP(input: string, maxTokensPerChunk: number): string[] {
        console.log('Starting NLP-based splitting...');
        const sentences = this.splitSentences(input);
        const chunks: string[] = [];

        // Calculate approximate number of chunks needed
        const totalTokens = this.tokenCalculator.calculateTokens(input);
        const estimatedChunks = Math.ceil(totalTokens / maxTokensPerChunk);
        const avgSentencesPerChunk = Math.ceil(sentences.length / estimatedChunks);

        console.log(`Estimated chunks needed: ${estimatedChunks}`);
        console.log(`Average sentences per chunk: ${avgSentencesPerChunk}`);

        let currentStart = 0;

        while (currentStart < sentences.length) {
            // Take a rough chunk based on average size
            const roughEnd = Math.min(currentStart + avgSentencesPerChunk + 5, sentences.length);
            let currentEnd = roughEnd;

            // Join sentences and check tokens
            let currentText = sentences.slice(currentStart, currentEnd).join(' ');
            let tokens = this.tokenCalculator.calculateTokens(currentText);

            // If too big, move boundary back until it fits
            while (tokens > maxTokensPerChunk && currentEnd > currentStart + 1) {
                currentEnd--;
                currentText = sentences.slice(currentStart, currentEnd).join(' ');
                tokens = this.tokenCalculator.calculateTokens(currentText);
            }

            // If too small and not the last chunk, try to add more sentences
            const nextFewSentences = sentences.slice(currentEnd, Math.min(currentEnd + 5, sentences.length));
            for (const sentence of nextFewSentences) {
                const testText = currentText + ' ' + sentence;
                const testTokens = this.tokenCalculator.calculateTokens(testText);
                if (testTokens <= maxTokensPerChunk) {
                    currentText = testText;
                    currentEnd++;
                } else {
                    break;
                }
            }

            // If a single sentence is too big, split it by words
            if (currentEnd === currentStart + 1 && tokens > maxTokensPerChunk) {
                const longSentence = sentences[currentStart];
                chunks.push(...this.splitByWords(longSentence, maxTokensPerChunk));
            } else {
                chunks.push(currentText);
            }

            currentStart = currentEnd;
            console.log(`Created chunk ${chunks.length}, processed ${currentEnd}/${sentences.length} sentences`);
        }

        console.log(`NLP splitting complete, created ${chunks.length} chunks`);
        return chunks;
    }

    private splitByWords(text: string, maxTokensPerChunk: number): string[] {
        const BATCH_SIZE = 1000; // Larger batch size for better performance
        const chunks: string[] = [];
        const words = text.split(/\s+/);

        console.log(`Processing ${words.length} words in batches of ${BATCH_SIZE}...`);

        let batchStart = 0;

        while (batchStart < words.length) {
            const batchEnd = Math.min(batchStart + BATCH_SIZE, words.length);
            let currentBatch = words.slice(batchStart, batchEnd);
            let currentText = currentBatch.join(' ');
            let tokens = this.tokenCalculator.calculateTokens(currentText);

            // If batch is too big, try half
            while (tokens > maxTokensPerChunk && currentBatch.length > 1) {
                const halfPoint = Math.floor(currentBatch.length / 2);
                currentBatch = currentBatch.slice(0, halfPoint);
                currentText = currentBatch.join(' ');
                tokens = this.tokenCalculator.calculateTokens(currentText);
            }

            if (currentBatch.length === 1 && tokens > maxTokensPerChunk) {
                // Single word is too long, need to split it
                const word = currentBatch[0];
                chunks.push(...this.splitByCharacters(word, maxTokensPerChunk));
            } else {
                chunks.push(currentText);
            }

            batchStart += currentBatch.length;
            console.log(`Processed ${batchStart}/${words.length} words...`);
        }

        console.log(`Created ${chunks.length} chunks from words`);
        return chunks;
    }

    private splitByCharacters(word: string, maxTokensPerChunk: number): string[] {
        const chunks: string[] = [];
        const CHAR_BATCH_SIZE = 100; // Larger batch size for characters
        let start = 0;

        while (start < word.length) {
            let end = Math.min(start + CHAR_BATCH_SIZE, word.length);
            let currentChunk = word.slice(start, end);
            let tokens = this.tokenCalculator.calculateTokens(currentChunk);

            // If chunk is too big, binary search for the right size
            if (tokens > maxTokensPerChunk) {
                let left = 1;
                let right = currentChunk.length;
                let bestSize = 1;

                while (left <= right) {
                    const mid = Math.floor((left + right) / 2);
                    const testChunk = word.slice(start, start + mid);
                    tokens = this.tokenCalculator.calculateTokens(testChunk);

                    if (tokens <= maxTokensPerChunk) {
                        bestSize = mid;
                        left = mid + 1;
                    } else {
                        right = mid - 1;
                    }
                }

                currentChunk = word.slice(start, start + bestSize);
                end = start + bestSize;
            }

            chunks.push(currentChunk);
            start = end;
        }

        return chunks;
    }

    private splitFixed(input: string, maxTokensPerChunk: number): string[] {
        console.log('Starting fixed split...');
        return this.splitByWords(input, maxTokensPerChunk);
    }
}