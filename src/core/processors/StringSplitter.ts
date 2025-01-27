import { TokenCalculator } from '../models/TokenCalculator';

/**
 * Options for controlling the string splitting behavior
 */
export type SplitOptions = {
    /** When true, skips smart sentence-based splitting and uses fixed splitting */
    forceFixedSplit?: boolean;
};

/**
 * A utility class that splits text into smaller chunks while respecting token limits.
 * It uses different strategies based on the input:
 * 1. Smart splitting - preserves sentence boundaries when possible
 * 2. Fixed splitting - splits by words when sentence splitting isn't suitable
 * 3. Character splitting - used as a last resort for very long words
 */
export class StringSplitter {
    constructor(private tokenCalculator: TokenCalculator) { }

    /**
     * Splits a string into chunks, each chunk having no more than maxTokensPerChunk tokens.
     * The method tries to preserve sentence boundaries unless forced to use fixed splitting.
     * 
     * @param input - The text to split
     * @param maxTokensPerChunk - Maximum number of tokens allowed per chunk
     * @param options - Configuration options for splitting behavior
     * @returns An array of text chunks, each within the token limit
     */
    public split(input: string, maxTokensPerChunk: number, options: SplitOptions = {}): string[] {
        // Handle edge cases
        if (!input || maxTokensPerChunk <= 0) {
            return [];
        }

        const inputTokens = this.tokenCalculator.calculateTokens(input);

        // If the input is small enough, return it as is
        if (inputTokens <= maxTokensPerChunk) {
            return [input];
        }

        // Try smart splitting first unless forced to use fixed splitting
        if (!options.forceFixedSplit && !this.shouldSkipSmartSplit(input)) {
            try {
                const smartChunks = this.splitWithSmartStrategy(input, maxTokensPerChunk);
                if (smartChunks.length > 0) {
                    return smartChunks;
                }
            } catch (error) {
                // Fall back to fixed splitting if smart splitting fails
            }
        }

        // Fall back to fixed splitting if smart splitting was skipped or failed
        return this.splitFixed(input, maxTokensPerChunk);
    }

    /**
     * Determines whether to skip smart splitting based on text characteristics.
     * Smart splitting is skipped for:
     * 1. Very long texts (>100K chars) for performance reasons
     * 2. Texts with long number sequences (10+ digits) which might be important to keep together
     */
    private shouldSkipSmartSplit(text: string): boolean {
        return text.length > 100000 || /\d{10,}/.test(text);
    }

    /**
     * Splits text into sentences using regex.
     * Handles various sentence endings:
     * - Latin punctuation (., !, ?)
     * - CJK punctuation (。, ！, ？)
     * - Line breaks
     * Also preserves the sentence endings with their sentences.
     */
    private splitSentences(text: string): string[] {
        // The regex matches:
        // 1. Any text not containing sentence endings, followed by a sentence ending
        // 2. Line breaks as sentence boundaries
        // 3. The last segment if it doesn't end with a sentence ending
        const sentenceRegex = /[^.!?。！？\n]+[.!?。！？\n]|\n|[^.!?。！？\n]+$/g;

        const sentences = text.match(sentenceRegex) || [];

        // Clean up the sentences and remove empty ones
        return sentences
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }

    /**
     * Splits text using a smart strategy that tries to preserve sentence boundaries.
     * The algorithm:
     * 1. Splits text into sentences
     * 2. Estimates optimal chunk size based on total tokens
     * 3. Combines sentences into chunks while respecting token limits
     * 4. Handles edge cases like very long sentences
     */
    private splitWithSmartStrategy(input: string, maxTokensPerChunk: number): string[] {
        const sentences = this.splitSentences(input);
        const chunks: string[] = [];

        // Estimate the optimal distribution of sentences across chunks
        const totalTokens = this.tokenCalculator.calculateTokens(input);
        const estimatedChunks = Math.ceil(totalTokens / maxTokensPerChunk);
        const avgSentencesPerChunk = Math.ceil(sentences.length / estimatedChunks);

        let currentStart = 0;

        while (currentStart < sentences.length) {
            // Take an initial chunk slightly larger than the average
            const roughEnd = Math.min(currentStart + avgSentencesPerChunk + 5, sentences.length);
            let currentEnd = roughEnd;

            // Join sentences and calculate tokens
            let currentText = sentences.slice(currentStart, currentEnd).join(' ');
            let tokens = this.tokenCalculator.calculateTokens(currentText);

            // If the chunk is too big, remove sentences until it fits
            while (tokens > maxTokensPerChunk && currentEnd > currentStart + 1) {
                currentEnd--;
                currentText = sentences.slice(currentStart, currentEnd).join(' ');
                tokens = this.tokenCalculator.calculateTokens(currentText);
            }

            // Try to add more sentences if there's room
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

            // Handle the case where a single sentence is too long
            if (currentEnd === currentStart + 1 && tokens > maxTokensPerChunk) {
                const longSentence = sentences[currentStart];
                chunks.push(...this.splitByWords(longSentence, maxTokensPerChunk));
            } else {
                chunks.push(currentText);
            }

            currentStart = currentEnd;
        }

        return chunks;
    }

    /**
     * Splits text by words when sentence-based splitting isn't suitable.
     * Uses a batching strategy for better performance with large texts:
     * 1. Processes words in batches
     * 2. Uses binary-like approach to find optimal batch size
     * 3. Falls back to character splitting for very long words
     */
    private splitByWords(text: string, maxTokensPerChunk: number): string[] {
        const BATCH_SIZE = 1000; // Process words in large batches for better performance
        const chunks: string[] = [];
        const words = text.split(/\s+/);
        let batchStart = 0;

        while (batchStart < words.length) {
            // Take a batch of words
            const batchEnd = Math.min(batchStart + BATCH_SIZE, words.length);
            let currentBatch = words.slice(batchStart, batchEnd);
            let currentText = currentBatch.join(' ');
            let tokens = this.tokenCalculator.calculateTokens(currentText);

            // If the batch is too big, reduce it by half repeatedly until it fits
            while (tokens > maxTokensPerChunk && currentBatch.length > 1) {
                const halfPoint = Math.floor(currentBatch.length / 2);
                currentBatch = currentBatch.slice(0, halfPoint);
                currentText = currentBatch.join(' ');
                tokens = this.tokenCalculator.calculateTokens(currentText);
            }

            // Handle very long single words
            if (currentBatch.length === 1 && tokens > maxTokensPerChunk) {
                const word = currentBatch[0];
                chunks.push(...this.splitByCharacters(word, maxTokensPerChunk));
            } else {
                chunks.push(currentText);
            }

            batchStart += currentBatch.length;
        }

        return chunks;
    }

    /**
     * Splits a single word into smaller chunks when necessary.
     * Uses binary search to efficiently find the maximum number of characters
     * that can fit within the token limit.
     */
    private splitByCharacters(word: string, maxTokensPerChunk: number): string[] {
        const chunks: string[] = [];
        const CHAR_BATCH_SIZE = 100; // Initial batch size for characters
        let start = 0;

        while (start < word.length) {
            // Take an initial chunk of characters
            let end = Math.min(start + CHAR_BATCH_SIZE, word.length);
            let currentChunk = word.slice(start, end);
            let tokens = this.tokenCalculator.calculateTokens(currentChunk);

            // If the chunk is too big, use binary search to find the optimal size
            if (tokens > maxTokensPerChunk) {
                let left = 1;
                let right = currentChunk.length;
                let bestSize = 1;

                // Binary search for the largest chunk that fits within token limit
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

    /**
     * Fallback method that uses word-based splitting.
     * Used when smart splitting is not appropriate or has failed.
     */
    private splitFixed(input: string, maxTokensPerChunk: number): string[] {
        return this.splitByWords(input, maxTokensPerChunk);
    }
}