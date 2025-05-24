import { jest, describe, expect, test, beforeAll, beforeEach } from '@jest/globals';
import type { ModelInfo } from '../../../../interfaces/UniversalInterfaces.ts';

// Declare variables for modules to be dynamically imported
let MarkdownSplitter;
let TokenCalculator;

// Mock variables
const mockCalculateTokens = jest.fn().mockImplementation((text: any) => typeof text === 'string' ? text.length : 0);
const mockTokenCalculator = jest.fn().mockImplementation(() => ({
    calculateTokens: mockCalculateTokens
}));

// Setup mocks before importing actual modules
jest.unstable_mockModule('@/core/models/TokenCalculator.ts', () => ({
    __esModule: true,
    TokenCalculator: mockTokenCalculator
}));

// Dynamically import modules after mocks are set up
beforeAll(async () => {
    const MarkdownSplitterModule = await import('@/core/processors/MarkdownSplitter.ts');
    MarkdownSplitter = MarkdownSplitterModule.MarkdownSplitter;
});

describe('MarkdownSplitter', () => {
    let markdownSplitter;

    beforeEach(() => {
        // Reset mock functions
        mockCalculateTokens.mockReset();
        // Default implementation to use string length as token count
        mockCalculateTokens.mockImplementation((...args: any[]) => {
            const text = args[0];
            return typeof text === 'string' ? text.length : 0;
        });

        // Create a new MarkdownSplitter instance for each test
        markdownSplitter = new MarkdownSplitter(new mockTokenCalculator());
    });

    describe('split', () => {
        test('should split simple markdown with headers', async () => {
            const markdown = `# Main Title

Some content here.

## Section 1

Content for section 1.

### Subsection 1.1

More detailed content.

## Section 2

Content for section 2.`;

            const result = await markdownSplitter.split(markdown, 1000);

            expect(result.length).toBeGreaterThan(0);
            expect(result.every(chunk => chunk.metadata?.contentType === 'markdown')).toBe(true);
            expect(result.some(chunk => chunk.metadata?.hierarchicalInfo?.headingTitle === 'Main Title')).toBe(true);
            expect(result.some(chunk => chunk.metadata?.hierarchicalInfo?.headingTitle === 'Section 1')).toBe(true);
        });

        test('should preserve hierarchical structure', async () => {
            const markdown = `# Recipe Book

## Chocolate Chip Cookies

### Ingredients

* 2 cups flour
* 1 cup sugar

### Instructions

1. Mix ingredients
2. Bake at 350°F`;

            const result = await markdownSplitter.split(markdown, 1000);

            const ingredientsChunk = result.find(chunk =>
                chunk.metadata?.hierarchicalInfo?.headingTitle === 'Ingredients'
            );

            expect(ingredientsChunk).toBeDefined();
            expect(ingredientsChunk.metadata?.hierarchicalInfo?.sectionPath).toEqual([
                'Recipe Book', 'Chocolate Chip Cookies', 'Ingredients'
            ]);
            expect(ingredientsChunk.metadata?.hierarchicalInfo?.parentSections).toEqual([
                'Recipe Book', 'Chocolate Chip Cookies'
            ]);
            expect(ingredientsChunk.metadata?.hierarchicalInfo?.headingDepth).toBe(3);
        });

        test('should identify preserved elements', async () => {
            const markdown = `# Document

## Code Section

\`\`\`javascript
console.log('hello');
\`\`\`

## Table Section

| Name | Age |
|------|-----|
| John | 25  |

## List Section

* Item 1
* Item 2

> This is a blockquote`;

            const result = await markdownSplitter.split(markdown, 1000);

            const codeChunk = result.find(chunk =>
                chunk.metadata?.preservedElements?.includes('codeBlock')
            );
            const tableChunk = result.find(chunk =>
                chunk.metadata?.preservedElements?.includes('table')
            );
            const listChunk = result.find(chunk =>
                chunk.metadata?.preservedElements?.includes('list')
            );
            const blockquoteChunk = result.find(chunk =>
                chunk.metadata?.preservedElements?.includes('blockquote')
            );

            expect(codeChunk).toBeDefined();
            expect(tableChunk).toBeDefined();
            expect(listChunk).toBeDefined();
            expect(blockquoteChunk).toBeDefined();
        });

        test('should handle content without headers', async () => {
            const markdown = `Just some plain text without any headers.

This should still be processed as markdown content.`;

            const result = await markdownSplitter.split(markdown, 1000);

            expect(result.length).toBe(1); // Should return at least one chunk
            expect(result[0].metadata?.contentType).toBe('markdown');
        });

        test('should split large sections', async () => {
            // Create a large section that will exceed token limits
            const largeContent = Array(50).fill('This is a very long line of content that will force splitting. ').join('');
            const markdown = `# Large Section

${largeContent}

## Another Section

More content here.`;

            // Set a low token limit to force splitting
            const result = await markdownSplitter.split(markdown, 100);

            expect(result.length).toBeGreaterThan(2); // Should be split into multiple chunks
            expect(result.every(chunk => chunk.tokenCount <= 100)).toBe(true);
        });
    });
}); 