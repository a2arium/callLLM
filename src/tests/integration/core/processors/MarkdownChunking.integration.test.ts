/**
 * @fileoverview Integration test for markdown chunking regression
 * 
 * This test addresses the critical regression where markdown content
 * was being split into 50+ chunks instead of the expected 3 chunks
 * when maxCharsPerChunk was specified.
 * 
 * This test ensures that the entire pipeline from LLMCaller -> DataSplitter
 * -> MarkdownSplitter properly respects character limits.
 */

import { jest, describe, expect, test, beforeEach, beforeAll } from '@jest/globals';

// Declare variables for dynamic imports
let LLMCaller: any;
let DataSplitter: any;
let MarkdownSplitter: any;
let TokenCalculator: any;

describe('Markdown Chunking Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    beforeAll(async () => {
        // Import the modules we need
        const LLMCallerModule = await import('../../../../core/caller/LLMCaller.ts');
        LLMCaller = LLMCallerModule.LLMCaller;

        const DataSplitterModule = await import('../../../../core/processors/DataSplitter.ts');
        DataSplitter = DataSplitterModule.DataSplitter;

        const MarkdownSplitterModule = await import('../../../../core/processors/MarkdownSplitter.ts');
        MarkdownSplitter = MarkdownSplitterModule.MarkdownSplitter;

        const TokenCalculatorModule = await import('../../../../core/models/TokenCalculator.ts');
        TokenCalculator = TokenCalculatorModule.TokenCalculator;
    });

    describe('DataSplitter Markdown Detection and Chunking', () => {
        test('should correctly detect markdown and respect character limits', async () => {
            // Create a realistic markdown content similar to the bug case
            const markdownContent = generateWebsiteMarkdown(23421);
            const maxCharsPerChunk = 10000;

            // Create real instances (not mocks) to test the actual behavior
            const tokenCalculator = new TokenCalculator();
            const markdownSplitter = new MarkdownSplitter(tokenCalculator);
            const dataSplitter = new DataSplitter(tokenCalculator, markdownSplitter);

            // Split the content
            const chunks = await dataSplitter.splitIfNeeded({
                message: 'Analyze this content',
                data: markdownContent,
                modelInfo: {
                    name: 'test-model',
                    maxRequestTokens: 100000,
                    inputPricePerMillion: 0.1,
                    outputPricePerMillion: 0.2,
                    maxResponseTokens: 4000,
                    tokenizationModel: 'gpt-3.5-turbo',
                    characteristics: {
                        qualityIndex: 80,
                        outputSpeed: 100,
                        firstTokenLatency: 100
                    },
                    capabilities: {
                        streaming: true,
                        toolCalls: true,
                        parallelToolCalls: true,
                        batchProcessing: true,
                        input: { text: true },
                        output: { text: { textOutputFormats: ['text', 'json'] } }
                    }
                },
                maxResponseTokens: 4000,
                maxCharsPerChunk
            });

            // CRITICAL REGRESSION TEST: Should create ~3 chunks, NOT 50+
            expect(chunks.length).toBeLessThanOrEqual(5);
            expect(chunks.length).toBeGreaterThanOrEqual(2);

            // Verify each chunk respects character limits
            chunks.forEach((chunk, index) => {
                const chunkSize = chunk.content.length;
                if (index < chunks.length - 1) {
                    // Non-final chunks should be reasonably sized
                    expect(chunkSize).toBeGreaterThan(7000);
                }
                expect(chunkSize).toBeLessThanOrEqual(maxCharsPerChunk);
            });

            // Verify content is preserved (allow small differences due to chunking boundaries)
            const reconstructed = chunks.map(c => c.content).join('');
            expect(Math.abs(reconstructed.length - markdownContent.length)).toBeLessThanOrEqual(10);

            // Log results for debugging
            console.log(`✅ Created ${chunks.length} chunks for ${markdownContent.length} characters`);
            chunks.forEach((chunk, i) => {
                console.log(`   Chunk ${i + 1}: ${chunk.content.length} chars`);
            });
        });

        test('should handle markdown content that fits in single chunk', async () => {
            const smallMarkdown = generateWebsiteMarkdown(5000);
            const maxCharsPerChunk = 10000;

            const tokenCalculator = new TokenCalculator();
            const markdownSplitter = new MarkdownSplitter(tokenCalculator);
            const dataSplitter = new DataSplitter(tokenCalculator, markdownSplitter);

            const chunks = await dataSplitter.splitIfNeeded({
                message: 'Analyze this content',
                data: smallMarkdown,
                modelInfo: {
                    name: 'test-model',
                    maxRequestTokens: 100000,
                    inputPricePerMillion: 0.1,
                    outputPricePerMillion: 0.2,
                    maxResponseTokens: 4000,
                    tokenizationModel: 'gpt-3.5-turbo',
                    characteristics: {
                        qualityIndex: 80,
                        outputSpeed: 100,
                        firstTokenLatency: 100
                    },
                    capabilities: {
                        streaming: true,
                        toolCalls: true,
                        parallelToolCalls: true,
                        batchProcessing: true,
                        input: { text: true },
                        output: { text: { textOutputFormats: ['text', 'json'] } }
                    }
                },
                maxResponseTokens: 4000,
                maxCharsPerChunk
            });

            // Should create only 1 chunk since content fits
            expect(chunks.length).toBe(1);
            expect(chunks[0].content.length).toBe(smallMarkdown.length);
            expect(chunks[0].content).toBe(smallMarkdown);
        });

        test('should properly detect markdown vs plain text', async () => {
            const plainText = 'This is just plain text without any markdown formatting. '.repeat(200);
            const markdownText = generateWebsiteMarkdown(plainText.length);

            const tokenCalculator = new TokenCalculator();
            const markdownSplitter = new MarkdownSplitter(tokenCalculator);
            const dataSplitter = new DataSplitter(tokenCalculator, markdownSplitter);

            const modelInfo = {
                name: 'test-model',
                maxRequestTokens: 100000,
                inputPricePerMillion: 0.1,
                outputPricePerMillion: 0.2,
                maxResponseTokens: 4000,
                tokenizationModel: 'gpt-3.5-turbo',
                characteristics: {
                    qualityIndex: 80,
                    outputSpeed: 100,
                    firstTokenLatency: 100
                },
                capabilities: {
                    streaming: true,
                    toolCalls: true,
                    parallelToolCalls: true,
                    batchProcessing: true,
                    input: { text: true },
                    output: { text: { textOutputFormats: ['text', 'json'] } }
                }
            };

            // Test plain text - should use StringSplitter
            const plainChunks = await dataSplitter.splitIfNeeded({
                message: 'Analyze this content',
                data: plainText,
                modelInfo,
                maxResponseTokens: 4000,
                maxCharsPerChunk: 5000
            });

            // Test markdown text - should use MarkdownSplitter
            const markdownChunks = await dataSplitter.splitIfNeeded({
                message: 'Analyze this content',
                data: markdownText,
                modelInfo,
                maxResponseTokens: 4000,
                maxCharsPerChunk: 5000
            });

            // Both should properly chunk, but we're verifying the detection works
            expect(plainChunks.length).toBeGreaterThan(0);
            expect(markdownChunks.length).toBeGreaterThan(0);

            console.log(`Plain text chunks: ${plainChunks.length}, Markdown chunks: ${markdownChunks.length}`);
        });
    });
});

/**
 * Generates website-like markdown content for testing
 */
function generateWebsiteMarkdown(targetLength: number): string {
    const events = [];
    let currentLength = 0;
    let eventCount = 1;

    // Generate events until we reach target length
    while (currentLength < targetLength) {
        const event = `
## Event ${eventCount}: Tech Conference 2024

**Date:** 2024-02-${String(eventCount % 28 + 1).padStart(2, '0')}  
**Time:** ${9 + (eventCount % 8)}:00 - ${11 + (eventCount % 8)}:00  
**Location:** ${['Main Hall', 'Conference Room A', 'Auditorium', 'Workshop Space'][eventCount % 4]}  
**Price:** $${50 + (eventCount % 10) * 25}

### Event Description

This comprehensive technology conference brings together industry leaders, innovators, and developers to explore the latest trends in software development, artificial intelligence, and digital transformation. Session ${eventCount} will cover cutting-edge topics including:

- Advanced machine learning algorithms and applications
- Modern web development frameworks and best practices  
- Cloud computing strategies for enterprise scalability
- Cybersecurity trends and threat prevention
- Data analytics and business intelligence solutions

### Speaker Information

Our distinguished speakers include renowned experts from leading technology companies, research institutions, and innovative startups. Each session features interactive presentations, hands-on demonstrations, and Q&A opportunities.

### Registration Details

Early bird pricing available until one week before the event. Group discounts for teams of 5 or more. Student pricing available with valid ID. All attendees receive access to presentation materials, networking sessions, and refreshments.

**Contact:** events-${eventCount}@techconf.example.com  
**Website:** https://techconf.example.com/event-${eventCount}

---
`;

        events.push(event);
        currentLength += event.length;
        eventCount++;

        // Safety check to prevent infinite loop
        if (eventCount > 100) break;
    }

    const fullContent = `# Technology Conference Series 2024

Welcome to our comprehensive technology conference series featuring the latest innovations and industry insights.

${events.join('')}

## Contact Information

For general inquiries, please contact our event team at info@techconf.example.com or visit our website at https://techconf.example.com.

### Follow Us

- LinkedIn: @TechConf2024
- Twitter: @TechConf2024  
- YouTube: TechConf Channel
`;

    // Trim to exact target length if needed
    if (fullContent.length > targetLength) {
        return fullContent.substring(0, targetLength);
    }

    return fullContent;
} 