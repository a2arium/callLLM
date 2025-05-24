import { TokenCalculator } from '../models/TokenCalculator.ts';
import { logger } from '../../utils/logger.ts';
import type { DataChunk, HierarchicalChunkInfo } from './DataSplitter.ts';

/**
 * Represents a markdown section in hierarchical structure
 */
export type MarkdownSection = {
    heading: {
        depth: number;
        title: string;
    };
    content: string;
    children: MarkdownSection[];
    path: string[]; // Full path from root
};

/**
 * MarkdownSplitter implements hierarchical splitting for markdown documents
 * Based on the approach described in the Glama blog post about RAG document splitting
 */
export class MarkdownSplitter {
    constructor(
        private tokenCalculator: TokenCalculator,
        private maxChunkSize: number = 2000,
        private minChunkSize: number = 1000
    ) { }

    /**
     * Splits markdown content into hierarchically-aware chunks
     */
    public async split(content: string, maxTokens: number, maxCharsPerChunk?: number): Promise<DataChunk[]> {
        const log = logger.createLogger({ prefix: 'MarkdownSplitter.split' });
        log.debug('Starting markdown split', {
            contentLength: content.length,
            maxTokens,
            maxCharsPerChunk,
            contentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : '')
        });

        // If maxCharsPerChunk is specified and content fits, return single chunk
        if (maxCharsPerChunk && content.length <= maxCharsPerChunk) {
            log.debug('Content fits within maxCharsPerChunk, returning single chunk');
            return [{
                content,
                tokenCount: this.tokenCalculator.calculateTokens(content),
                chunkIndex: 0,
                totalChunks: 1,
                metadata: {
                    contentType: 'markdown',
                    preservedElements: this.identifyPreservedElements(content)
                }
            }];
        }

        // If maxCharsPerChunk is specified, use character-based splitting instead of hierarchical
        if (maxCharsPerChunk) {
            log.debug('Using character-based splitting for markdown');
            return this.splitByCharacterLimit(content, maxCharsPerChunk);
        }

        // Default hierarchical splitting for token-based limits
        return this.splitHierarchically(content, maxTokens);
    }

    /**
     * Splits content by character limits while preserving markdown structure
     */
    private splitByCharacterLimit(content: string, maxCharsPerChunk: number): DataChunk[] {
        const log = logger.createLogger({ prefix: 'MarkdownSplitter.splitByCharacterLimit' });
        const chunks: DataChunk[] = [];
        const lines = content.split('\n');
        let currentChunk = '';
        let currentLineIndex = 0;

        while (currentLineIndex < lines.length) {
            const line = lines[currentLineIndex];
            const lineWithNewline = currentLineIndex === lines.length - 1 ? line : line + '\n';

            // If adding this line would exceed the limit
            if (currentChunk.length + lineWithNewline.length > maxCharsPerChunk && currentChunk.trim()) {
                // Create a chunk with current content
                chunks.push({
                    content: currentChunk.trim(),
                    tokenCount: this.tokenCalculator.calculateTokens(currentChunk.trim()),
                    chunkIndex: chunks.length,
                    totalChunks: 0, // Will be updated later
                    metadata: {
                        contentType: 'markdown',
                        preservedElements: this.identifyPreservedElements(currentChunk)
                    }
                });
                currentChunk = '';
            }

            // Add the current line
            currentChunk += lineWithNewline;
            currentLineIndex++;
        }

        // Add final chunk if there's content
        if (currentChunk.trim()) {
            chunks.push({
                content: currentChunk.trim(),
                tokenCount: this.tokenCalculator.calculateTokens(currentChunk.trim()),
                chunkIndex: chunks.length,
                totalChunks: 0, // Will be updated later
                metadata: {
                    contentType: 'markdown',
                    preservedElements: this.identifyPreservedElements(currentChunk)
                }
            });
        }

        log.debug('Character-based splitting completed', {
            totalChunks: chunks.length,
            chunkLengths: chunks.map(c => c.content.length)
        });

        // Update total chunks count
        return chunks.map(chunk => ({
            ...chunk,
            totalChunks: chunks.length
        }));
    }

    /**
     * Splits content hierarchically based on markdown structure (original behavior)
     */
    private async splitHierarchically(content: string, maxTokens: number): Promise<DataChunk[]> {
        const log = logger.createLogger({ prefix: 'MarkdownSplitter.splitHierarchically' });

        // Parse markdown into hierarchical structure
        const sections = this.parseMarkdownSections(content);
        log.debug(`Parsed ${sections.length} top-level sections`, {
            sectionTitles: sections.map(s => s.heading.title),
            sectionDepths: sections.map(s => s.heading.depth),
            sectionContentLengths: sections.map(s => s.content.length)
        });

        // Split each section into chunks while preserving hierarchy
        const chunks: DataChunk[] = [];
        for (const section of sections) {
            log.debug(`Processing section: ${section.heading.title}`, {
                depth: section.heading.depth,
                contentLength: section.content.length,
                childrenCount: section.children.length
            });
            const sectionChunks = await this.splitSection(section, maxTokens);
            log.debug(`Section produced ${sectionChunks.length} chunks`);
            chunks.push(...sectionChunks);
        }

        log.debug('Hierarchical splitting completed', {
            totalChunks: chunks.length,
            chunkLengths: chunks.map(c => typeof c.content === 'string' ? c.content.length : 0),
            chunkTokenCounts: chunks.map(c => c.tokenCount)
        });

        // Update chunk indices and totals
        return chunks.map((chunk, index) => ({
            ...chunk,
            chunkIndex: index,
            totalChunks: chunks.length
        }));
    }

    /**
     * Parses markdown content into hierarchical sections
     */
    private parseMarkdownSections(content: string): MarkdownSection[] {
        const lines = content.split('\n');
        const sections: MarkdownSection[] = [];
        const sectionStack: MarkdownSection[] = [];
        let currentContent: string[] = [];

        for (const line of lines) {
            const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

            if (headingMatch) {
                // Save any accumulated content to current section
                if (currentContent.length > 0 && sectionStack.length > 0) {
                    const currentSection = sectionStack[sectionStack.length - 1];
                    currentSection.content += currentContent.join('\n') + '\n';
                    currentContent = [];
                }

                const depth = headingMatch[1].length;
                const title = headingMatch[2].trim();

                // Pop sections that are at the same level or deeper
                while (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].heading.depth >= depth) {
                    sectionStack.pop();
                }

                // Create new section
                const parentPath = sectionStack.length > 0 ? sectionStack[sectionStack.length - 1].path : [];
                const newSection: MarkdownSection = {
                    heading: { depth, title },
                    content: line + '\n',
                    children: [],
                    path: [...parentPath, title]
                };

                // Add to parent or root
                if (sectionStack.length > 0) {
                    sectionStack[sectionStack.length - 1].children.push(newSection);
                } else {
                    sections.push(newSection);
                }

                sectionStack.push(newSection);
            } else {
                // Accumulate content lines
                currentContent.push(line);
            }
        }

        // Add any remaining content to the last section or create a default section
        if (currentContent.length > 0) {
            if (sectionStack.length > 0) {
                const currentSection = sectionStack[sectionStack.length - 1];
                currentSection.content += currentContent.join('\n');
            } else {
                // Create a default section for content without headers
                const defaultSection: MarkdownSection = {
                    heading: { depth: 1, title: 'Content' },
                    content: currentContent.join('\n'),
                    children: [],
                    path: ['Content']
                };
                sections.push(defaultSection);
            }
        }

        return sections;
    }

    /**
     * Splits a section into chunks, respecting semantic boundaries
     */
    private async splitSection(section: MarkdownSection, maxTokens: number): Promise<DataChunk[]> {
        const chunks: DataChunk[] = [];

        // Calculate tokens for the section content
        const sectionTokens = this.tokenCalculator.calculateTokens(section.content);

        const hierarchicalInfo: HierarchicalChunkInfo = {
            sectionPath: section.path,
            headingDepth: section.heading.depth,
            headingTitle: section.heading.title,
            parentSections: section.path.slice(0, -1), // All but the current section
            isCompleteSection: sectionTokens <= maxTokens
        };

        if (sectionTokens <= maxTokens) {
            // Section fits in one chunk
            chunks.push({
                content: section.content,
                tokenCount: sectionTokens,
                chunkIndex: 0, // Will be updated later
                totalChunks: 0, // Will be updated later
                metadata: {
                    contentType: 'markdown',
                    hierarchicalInfo,
                    preservedElements: this.identifyPreservedElements(section.content)
                }
            });
        } else {
            // Split section into smaller chunks
            const subChunks = await this.splitLargeSection(section, maxTokens);
            chunks.push(...subChunks);
        }

        // Recursively process children
        for (const child of section.children) {
            const childChunks = await this.splitSection(child, maxTokens);
            chunks.push(...childChunks);
        }

        return chunks;
    }

    /**
     * Splits a large section while preserving semantic elements
     */
    private async splitLargeSection(section: MarkdownSection, maxTokens: number): Promise<DataChunk[]> {
        const chunks: DataChunk[] = [];
        const lines = section.content.split('\n');
        let currentChunk = '';
        let currentTokens = 0;

        const hierarchicalInfo: HierarchicalChunkInfo = {
            sectionPath: section.path,
            headingDepth: section.heading.depth,
            headingTitle: section.heading.title,
            parentSections: section.path.slice(0, -1),
            isCompleteSection: false
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineWithNewline = line + '\n';
            const lineTokens = this.tokenCalculator.calculateTokens(lineWithNewline);

            // If a single line exceeds token limits, we need to split it further
            if (lineTokens > maxTokens) {
                // First, add any accumulated content as a chunk
                if (currentChunk.trim()) {
                    chunks.push({
                        content: currentChunk.trim(),
                        tokenCount: this.tokenCalculator.calculateTokens(currentChunk.trim()),
                        chunkIndex: 0,
                        totalChunks: 0,
                        metadata: {
                            contentType: 'markdown',
                            hierarchicalInfo: { ...hierarchicalInfo },
                            preservedElements: this.identifyPreservedElements(currentChunk)
                        }
                    });
                    currentChunk = '';
                    currentTokens = 0;
                }

                // Split the long line by characters/words
                const lineChunks = this.splitLongLine(line, maxTokens, hierarchicalInfo);
                chunks.push(...lineChunks);
                continue;
            }

            // Check for semantic boundaries that shouldn't be split
            const isSemanticBoundary = this.isSemanticBoundary(line, lines, i);

            // If adding this line would exceed token limit and we have content, create a chunk
            if (currentTokens + lineTokens > maxTokens && currentChunk.trim() && !isSemanticBoundary) {
                chunks.push({
                    content: currentChunk.trim(),
                    tokenCount: this.tokenCalculator.calculateTokens(currentChunk.trim()),
                    chunkIndex: 0, // Will be updated later
                    totalChunks: 0, // Will be updated later
                    metadata: {
                        contentType: 'markdown',
                        hierarchicalInfo: { ...hierarchicalInfo },
                        preservedElements: this.identifyPreservedElements(currentChunk)
                    }
                });

                currentChunk = '';
                currentTokens = 0;
            }

            currentChunk += lineWithNewline;
            currentTokens = this.tokenCalculator.calculateTokens(currentChunk);
        }

        // Add final chunk if there's content
        if (currentChunk.trim()) {
            chunks.push({
                content: currentChunk.trim(),
                tokenCount: this.tokenCalculator.calculateTokens(currentChunk.trim()),
                chunkIndex: 0, // Will be updated later
                totalChunks: 0, // Will be updated later
                metadata: {
                    contentType: 'markdown',
                    hierarchicalInfo: { ...hierarchicalInfo },
                    preservedElements: this.identifyPreservedElements(currentChunk)
                }
            });
        }

        return chunks;
    }

    /**
     * Splits a single long line that exceeds token limits
     */
    private splitLongLine(line: string, maxTokens: number, hierarchicalInfo: HierarchicalChunkInfo): DataChunk[] {
        const chunks: DataChunk[] = [];
        const words = line.split(' ');
        let currentChunk = '';
        let currentTokens = 0;

        for (const word of words) {
            const wordWithSpace = (currentChunk ? ' ' : '') + word;
            const wordTokens = this.tokenCalculator.calculateTokens(wordWithSpace);

            if (currentTokens + wordTokens > maxTokens && currentChunk.trim()) {
                chunks.push({
                    content: currentChunk.trim(),
                    tokenCount: this.tokenCalculator.calculateTokens(currentChunk.trim()),
                    chunkIndex: 0,
                    totalChunks: 0,
                    metadata: {
                        contentType: 'markdown',
                        hierarchicalInfo: { ...hierarchicalInfo },
                        preservedElements: []
                    }
                });
                currentChunk = '';
                currentTokens = 0;
            }

            currentChunk += wordWithSpace;
            currentTokens = this.tokenCalculator.calculateTokens(currentChunk);
        }

        if (currentChunk.trim()) {
            chunks.push({
                content: currentChunk.trim(),
                tokenCount: this.tokenCalculator.calculateTokens(currentChunk.trim()),
                chunkIndex: 0,
                totalChunks: 0,
                metadata: {
                    contentType: 'markdown',
                    hierarchicalInfo: { ...hierarchicalInfo },
                    preservedElements: []
                }
            });
        }

        return chunks;
    }

    /**
     * Determines if a line represents a semantic boundary that shouldn't be split
     */
    private isSemanticBoundary(line: string, allLines: string[], currentIndex: number): boolean {
        // Don't split within code blocks
        if (line.startsWith('```')) return true;

        // Don't split tables
        if (line.includes('|')) return true;

        // Don't split lists in the middle
        if (line.match(/^\s*[\*\-\+]\s+/) || line.match(/^\s*\d+\.\s+/)) return true;

        // Don't split blockquotes
        if (line.match(/^\s*>\s+/)) return true;

        return false;
    }

    /**
     * Identifies preserved elements in the content
     */
    private identifyPreservedElements(content: string): ('table' | 'codeBlock' | 'list' | 'blockquote')[] {
        const elements: ('table' | 'codeBlock' | 'list' | 'blockquote')[] = [];

        if (content.includes('```')) elements.push('codeBlock');
        if (content.includes('|')) elements.push('table');
        if (content.match(/^\s*[\*\-\+]\s+/m) || content.match(/^\s*\d+\.\s+/m)) elements.push('list');
        if (content.match(/^\s*>\s+/m)) elements.push('blockquote');

        return elements;
    }
} 