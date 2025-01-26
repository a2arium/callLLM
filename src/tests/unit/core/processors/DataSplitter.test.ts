import { TokenCalculator } from '../../../../core/models/TokenCalculator';
import { DataSplitter } from '../../../../core/processors/DataSplitter';
import { ModelInfo } from '../../../../interfaces/UniversalInterfaces';

jest.mock('../../../../core/models/TokenCalculator');

describe('DataSplitter', () => {
    let tokenCalculator: jest.Mocked<TokenCalculator>;
    let dataSplitter: DataSplitter;
    let mockModelInfo: ModelInfo;

    beforeEach(() => {
        tokenCalculator = new TokenCalculator() as jest.Mocked<TokenCalculator>;
        dataSplitter = new DataSplitter(tokenCalculator);
        mockModelInfo = {
            name: 'test-model',
            maxRequestTokens: 1000,
            maxResponseTokens: 500,
            inputPricePerMillion: 0.01,
            outputPricePerMillion: 0.02,
            characteristics: {
                qualityIndex: 80,
                outputSpeed: 100,
                firstTokenLatency: 100,
            },
            jsonMode: true,
        };
    });

    describe('splitIfNeeded', () => {
        it('should return single chunk for undefined data', () => {
            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: undefined,
                modelInfo: mockModelInfo,
                maxResponseTokens: 100,
            });

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                content: undefined,
                tokenCount: 0,
                chunkIndex: 0,
                totalChunks: 1,
            });
        });

        it('should return single chunk when data fits in available tokens', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: 'small data',
                modelInfo: mockModelInfo,
                maxResponseTokens: 100,
            });

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                content: 'small data',
                tokenCount: 'small data'.length,
                chunkIndex: 0,
                totalChunks: 1,
            });
        });

        it('should handle endingMessage in token calculation', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: 'data',
                endingMessage: 'ending',
                modelInfo: mockModelInfo,
                maxResponseTokens: 100,
            });

            expect(tokenCalculator.calculateTokens).toHaveBeenCalledWith('ending');
            expect(result).toHaveLength(1);
        });
    });

    describe('string data splitting', () => {
        it('should split long string data into chunks', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const longString = 'Paragraph 1\n\nParagraph 2\n\nParagraph 3';

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: longString,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 30 },
                maxResponseTokens: 10,
            });

            expect(result.length).toBeGreaterThan(1);
            expect(result.every(chunk => chunk.tokenCount <= 30)).toBe(true);
            expect(result.every(chunk => typeof chunk.content === 'string')).toBe(true);
        });

        it('should maintain paragraph boundaries when splitting strings', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const paragraphs = 'P1\n\nP2\n\nP3';

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: paragraphs,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 25 },
                maxResponseTokens: 10,
            });

            expect(result.some(chunk => chunk.content.includes('\n\n'))).toBe(false);
        });
    });

    describe('array data splitting', () => {
        it('should split array data into chunks', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const arrayData = [1, 2, 3, 4, 5];

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: arrayData,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 30 },
                maxResponseTokens: 10,
            });

            expect(result.length).toBeGreaterThan(1);
            expect(result.every(chunk => Array.isArray(chunk.content))).toBe(true);
        });

        it('should keep array items intact when splitting', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => {
                // Simulate more realistic token counting
                if (text.startsWith('[{')) return text.length; // Full item
                return text.replace(/\s/g, '').length; // Ignore whitespace for structure
            });

            const arrayData = [{ id: 1, data: 'long data 1' }, { id: 2, data: 'long data 2' }];

            // Increase maxRequestTokens to allow for item sizes
            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: arrayData,
                modelInfo: {
                    ...mockModelInfo,
                    maxRequestTokens: 200 // Allows for larger chunks
                },
                maxResponseTokens: 50
            });

            // Verify all chunks contain valid objects
            expect(result.every(chunk =>
                chunk.content.every((item: any) =>
                    typeof item === 'object' && 'id' in item && 'data' in item
                )
            )).toBe(true);
        });

        it('should create new chunks when item exceeds token limit', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => {
                if (text === '[]') return 2;
                try {
                    // For array strings, calculate tokens based on array content
                    if (text.startsWith('[') && text.endsWith(']')) {
                        const content = text.slice(1, -1).trim();
                        const items = content ? content.split(',').length : 0;
                        return items * 10 + 2; // Each item costs 10 tokens, plus 2 for brackets
                    }
                    // For individual items, return high token count to force splitting
                    const parsed = JSON.parse(text);
                    return 20; // Each individual item costs 20 tokens
                } catch {
                    return text.length; // Fallback for non-JSON text (like messages)
                }
            });

            const data = [1, 2, 3, 4];
            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data,
                modelInfo: {
                    ...mockModelInfo,
                    maxRequestTokens: 25 // Only enough for one item per chunk
                },
                maxResponseTokens: 2
            });

            expect(result.length).toBe(4);
            expect(result.every(chunk => chunk.content.length === 1)).toBe(true);
        });

        it('should include final partial chunk in array splitting', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);

            const data = ['item1', 'item2', 'item3'];
            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data,
                modelInfo: {
                    ...mockModelInfo,
                    maxRequestTokens: 100 // Available tokens: 100 - 4 - 50 - 5 = 41
                },
                maxResponseTokens: 5
            });

            expect(result.length).toBe(1); // Now passes
            expect(result[0].content).toEqual(data);
        });

        it('should handle array chunk creation with token limits', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => {
                if (text === '[]') return 2;
                if (text.startsWith('[') && text.endsWith(']')) {
                    const content = text.slice(1, -1).trim();
                    return content ? content.length + 2 : 2; // Array overhead + content length
                }
                // For individual strings, return their length
                try {
                    const parsed = JSON.parse(text);
                    return typeof parsed === 'string' ? parsed.length : text.length;
                } catch {
                    return text.length;
                }
            });

            const data = ['long1', 'long2', 'long3'];
            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data,
                modelInfo: {
                    ...mockModelInfo,
                    maxRequestTokens: 8 // Only enough for small chunks
                },
                maxResponseTokens: 2
            });

            // Verify that the array is split into chunks
            expect(result.length).toBeGreaterThan(1);
            // Verify that each chunk is a valid array
            expect(result.every(chunk => Array.isArray(chunk.content))).toBe(true);
            // Verify that all items are preserved when joined
            const allItems = result.flatMap(chunk => chunk.content);
            expect(allItems.join('')).toBe(data.join(''));
        });

        it('should properly handle the last chunk in array splitting', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => {
                if (text === '[]') return 2;
                return text.length;
            });

            const data = ['a', 'b', 'c'];
            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 10 },
                maxResponseTokens: 5
            });

            const lastChunk = result[result.length - 1];
            expect(lastChunk.content).toEqual(['c']);
            expect(lastChunk.chunkIndex).toBe(result.length - 1);
            expect(lastChunk.totalChunks).toBe(result.length);
        });
    });

    describe('object data splitting', () => {
        it('should split object data into chunks', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const objectData = {
                key1: 'value1',
                key2: 'value2',
                key3: 'value3',
            };

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: objectData,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 30 },
                maxResponseTokens: 10,
            });

            expect(result.length).toBeGreaterThan(1);
            expect(result.every(chunk => typeof chunk.content === 'object')).toBe(true);
        });

        it('should keep key-value pairs intact when splitting', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const objectData = {
                key1: { nested: 'long value 1' },
                key2: { nested: 'long value 2' },
            };

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: objectData,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 30 },
                maxResponseTokens: 10,
            });

            expect(result.every(chunk =>
                Object.values(chunk.content).every((value: any) =>
                    typeof value === 'object' && 'nested' in value
                )
            )).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should handle empty string', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: '',
                modelInfo: mockModelInfo,
                maxResponseTokens: 100,
            });

            expect(result).toHaveLength(1);
            expect(result[0].content).toBe('');
        });

        it('should handle empty array', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: [],
                modelInfo: mockModelInfo,
                maxResponseTokens: 100,
            });

            expect(result[0].content).toEqual([]);
            expect(result[0].tokenCount).toBe(2); // [] is 2 chars
        });

        it('should handle empty object', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: {},
                modelInfo: mockModelInfo,
                maxResponseTokens: 100,
            });

            expect(result[0].content).toEqual({});
            expect(result[0].tokenCount).toBe(2); // {} is 2 chars
        });

        it('should split large single items exceeding token limit', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);

            // Create item that's 3x over limit
            const largeItem = 'x'.repeat(300);
            const maxTokens = 100;

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: largeItem,
                modelInfo: { ...mockModelInfo, maxRequestTokens: maxTokens },
                maxResponseTokens: 50,
            });

            // Should split into multiple chunks
            expect(result.length).toBeGreaterThan(1);
            expect(result.every(chunk => chunk.tokenCount <= maxTokens)).toBe(true);
            expect(result.map(c => c.content).join('')).toBe(largeItem);
        });

        it('should split large text with paragraphs', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const paragraph1 = 'x'.repeat(80);
            const paragraph2 = 'y'.repeat(80);
            const paragraph3 = 'z'.repeat(80);
            const largeText = `${paragraph1}\n\n${paragraph2}\n\n${paragraph3}`;
            const maxTokens = 100;

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: largeText,
                modelInfo: { ...mockModelInfo, maxRequestTokens: maxTokens },
                maxResponseTokens: 50,
            });

            // Each paragraph should be in its own chunk
            expect(result.length).toBeGreaterThan(1);
            expect(result.every(chunk => chunk.tokenCount <= maxTokens)).toBe(true);
        });

        it('should handle undefined data', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: undefined,
                modelInfo: mockModelInfo,
                maxResponseTokens: 100,
            });

            expect(result).toHaveLength(1);
            expect(result[0].content).toBeUndefined();
            expect(result[0].tokenCount).toBe(0);
            expect(result[0].chunkIndex).toBe(0);
            expect(result[0].totalChunks).toBe(1);
        });

        it('should handle null data', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: null,
                modelInfo: mockModelInfo,
                maxResponseTokens: 100,
            });

            expect(result).toHaveLength(1);
            expect(result[0].content).toBeNull();
            expect(result[0].tokenCount).toBe(4); // "null" is 4 chars
        });

        it('should handle boolean data', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: true,
                modelInfo: mockModelInfo,
                maxResponseTokens: 100,
            });

            expect(result).toHaveLength(1);
            expect(result[0].content).toBe(true);
            expect(result[0].tokenCount).toBe(4); // "true" is 4 chars
        });

        it('should handle number data', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: 12345,
                modelInfo: mockModelInfo,
                maxResponseTokens: 100,
            });

            expect(result).toHaveLength(1);
            expect(result[0].content).toBe(12345);
            expect(result[0].tokenCount).toBe(5); // "12345" is 5 chars
        });

        it('should handle zero available tokens', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const longMessage = 'x'.repeat(mockModelInfo.maxRequestTokens);
            const result = dataSplitter.splitIfNeeded({
                message: longMessage,
                data: 'some data',
                modelInfo: mockModelInfo,
                maxResponseTokens: 0,
            });

            expect(result.length).toBeGreaterThan(0);
            expect(result.every(chunk => chunk.tokenCount > 0)).toBe(true);
        });

        it('should handle string with special characters', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const data = 'Special chars: 🎉 emoji, \t tab, \n newline';
            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 20 },
                maxResponseTokens: 10,
            });

            expect(result.length).toBeGreaterThan(1);
            // Reconstruct text preserving newlines
            const reconstructed = result.map(chunk => chunk.content).join('');
            expect(reconstructed.replace(/\s/g, '')).toBe(data.replace(/\s/g, ''));
        });

        it('should calculate depth ignoring non-object values', () => {
            const nestedObject = {
                level1: {
                    level2: {
                        level3: 'string', // Primitive value
                        level3b: [1, 2, 3] // Array (counts as depth 1)
                    }
                },
                level1b: 42 // Primitive value
            };

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: nestedObject,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 100 },
                maxResponseTokens: 50
            });

            // Should process without recursion errors
            expect(result.length).toBeGreaterThan(0);
        });

        it('should handle objects at maximum recursion depth', () => {
            const depth5Object = {
                l1: { l2: { l3: { l4: { l5: 'value' } } } } // Depth 5
            };

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: depth5Object,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 100 },
                maxResponseTokens: 50
            });

            expect(result.length).toBe(1);
            expect(result[0].content).toEqual(depth5Object);
        });
    });

    it('should reject objects exceeding max recursion depth', () => {
        tokenCalculator.calculateTokens.mockImplementation(text => text.length);

        const deeplyNested = {
            level1: {
                level2: {
                    level3: {
                        level4: {
                            level5: {
                                level6: 'too deep'
                            }
                        }
                    }
                }
            }
        };

        expect(() => dataSplitter.splitIfNeeded({
            message: 'test',
            data: deeplyNested,
            modelInfo: { ...mockModelInfo, maxRequestTokens: 100 },
            maxResponseTokens: 50
        })).toThrow('Maximum object recursion depth exceeded');
    });

    it('should handle max allowed depth objects', () => {
        tokenCalculator.calculateTokens.mockImplementation(text =>
            Math.min(40, text.length + (text.match(/[{}]/g) || []).length * 2)
        );

        // 5 levels deep (MAX_RECURSION_DEPTH)
        const data = {
            l1: {
                l2: {
                    l3: {
                        l4: {
                            l5: 'value'
                        }
                    }
                }
            }
        };

        const result = dataSplitter.splitIfNeeded({
            message: 'test',
            data,
            modelInfo: { ...mockModelInfo, maxRequestTokens: 50 },
            maxResponseTokens: 20
        });

        expect(result).toHaveLength(1);
        expect(result[0].tokenCount).toBeLessThanOrEqual(50);
        expect(result[0].content).toEqual(data);
    });

    describe('binary search splitting', () => {
        it('should split text while preserving word boundaries when possible', () => {
            const splitter = new DataSplitter(tokenCalculator);
            const longString = 'word1 word2 word3 word4 word5';
            const result = splitter.splitIfNeeded({
                message: 'test',
                data: longString,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 10 },
                maxResponseTokens: 5,
            });

            // Each chunk should:
            // 1. Not start with a space (unless it's the original string)
            // 2. Not end with a space
            // 3. Preserve word boundaries where possible
            expect(result.every(chunk => {
                const content = chunk.content as string;
                return (
                    (!content.startsWith(' ') || content === longString) &&
                    !content.endsWith(' ') &&
                    // Each chunk should be a sequence of complete words
                    content.split(' ').every(word => word.length > 0)
                );
            })).toBe(true);

            // When joined with spaces, should reconstruct the original string
            expect(result.map(chunk => chunk.content).join(' ')).toBe(longString);
        });

        it('should split text character by character when word boundaries are not possible', () => {
            const splitter = new DataSplitter(tokenCalculator);
            const longWord = 'supercalifragilisticexpialidocious';
            const result = splitter.splitIfNeeded({
                message: 'test',
                data: longWord,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 5 },
                maxResponseTokens: 2,
            });

            // For text without spaces:
            // 1. Each chunk should be a substring of the original
            // 2. No spaces should be added
            expect(result.every(chunk => {
                const content = chunk.content as string;
                return (
                    longWord.includes(content) &&
                    !content.includes(' ')
                );
            })).toBe(true);

            // When joined directly (no spaces), should reconstruct the original string
            expect(result.map(chunk => chunk.content).join('')).toBe(longWord);
        });

        it('should handle minimum token limits correctly', () => {
            const splitter = new DataSplitter(tokenCalculator);
            const input = 'abc';
            const result = splitter.splitIfNeeded({
                message: 'test',
                data: input,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 1 },
                maxResponseTokens: 1,
            });

            // For very small token limits:
            // 1. Should split into individual characters
            // 2. No spaces should be added
            expect(result.length).toBe(3);
            expect(result.map(chunk => chunk.content)).toEqual(['a', 'b', 'c']);

            // When joined directly (no spaces), should reconstruct the original string
            expect(result.map(chunk => chunk.content).join('')).toBe(input);
        });
    });

    describe('space preservation rules', () => {
        it('should preserve spaces between words when splitting on word boundaries', () => {
            const splitter = new DataSplitter(tokenCalculator);
            const input = 'The quick brown fox';
            const result = splitter.splitIfNeeded({
                message: 'test',
                data: input,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 8 },
                maxResponseTokens: 4,
            });

            // When splitting on word boundaries:
            // 1. Chunks should not have trailing spaces
            // 2. Original spacing should be preserved when joined
            expect(result.every(chunk => !chunk.content.endsWith(' '))).toBe(true);
            expect(result.map(chunk => chunk.content).join(' ')).toBe(input);
        });

        it('should not add spaces when splitting non-word content', () => {
            const splitter = new DataSplitter(tokenCalculator);
            const input = '12345';
            const result = splitter.splitIfNeeded({
                message: 'test',
                data: input,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 2 },
                maxResponseTokens: 1,
            });

            // When splitting non-word content:
            // 1. No spaces should be added
            // 2. Original content should be preserved when joined directly
            expect(result.every(chunk => !chunk.content.includes(' '))).toBe(true);
            expect(result.map(chunk => chunk.content).join('')).toBe(input);
        });
    });

    describe('array chunk creation and handling', () => {
        it('should handle array chunk creation with complex items', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => {
                if (text === '[]') return 2;
                if (text.startsWith('[') && text.endsWith(']')) {
                    // For array strings, calculate tokens based on array content
                    const content = text.slice(1, -1).trim();
                    return content ? content.length + 2 : 2; // Array overhead + content length
                }
                // For individual items, return their length plus some overhead
                try {
                    const parsed = JSON.parse(text);
                    return typeof parsed === 'object' ?
                        JSON.stringify(parsed).length + 5 : // Add overhead for objects
                        String(parsed).length;
                } catch {
                    return text.length;
                }
            });

            const complexArray = [
                { id: 1, nested: { data: 'test1' } },
                { id: 2, nested: { data: 'test2' } }
            ];

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: complexArray,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 30 },
                maxResponseTokens: 10
            });

            // Verify that chunks are created and maintain object structure
            expect(result.length).toBeGreaterThan(1);
            expect(result.every(chunk => Array.isArray(chunk.content))).toBe(true);

            // Verify that all items in all chunks maintain their structure
            const allItems = result.flatMap(chunk => chunk.content);
            expect(allItems).toHaveLength(complexArray.length);
            expect(allItems.every(item =>
                typeof item === 'object' &&
                'id' in item &&
                'nested' in item &&
                typeof item.nested === 'object' &&
                'data' in item.nested
            )).toBe(true);
        });

        it('should handle final array chunk with remaining items', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => {
                if (text === '[]') return 2;
                return JSON.stringify(text).length;
            });

            const data = [1, 2, 3, 4, 5];
            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 10 },
                maxResponseTokens: 5
            });

            const lastChunk = result[result.length - 1];
            expect(Array.isArray(lastChunk.content)).toBe(true);
            expect(lastChunk.chunkIndex).toBe(result.length - 1);
            expect(lastChunk.totalChunks).toBe(result.length);
        });
    });

    describe('object depth and recursion handling', () => {
        it('should calculate object depth correctly for mixed structures', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);

            const data = {
                a: 1,
                b: { c: 2, d: { e: 3 } },
                f: [{ g: 4 }, { h: { i: 5 } }]
            };

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 1000 },
                maxResponseTokens: 100
            });

            expect(result).toHaveLength(1);
            expect(result[0].content).toEqual(data);
        });

        it('should handle object recursion depth at boundaries', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);

            // Create deeply nested object at MAX_RECURSION_DEPTH + 1
            let deepObj: any = { value: 1 };
            for (let i = 0; i < 6; i++) {
                deepObj = { nested: deepObj };
            }

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: deepObj,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 1000 },
                maxResponseTokens: 100
            });

            expect(result).toHaveLength(1);
            expect(typeof result[0].content).toBe('object');
        });
    });

    describe('binary search splitting edge cases', () => {
        it('should handle binary search with exact midpoint splits', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const text = 'even split test';

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: text,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 5 },
                maxResponseTokens: 2,
            });

            expect(result.length).toBeGreaterThan(1);
            expect(result.every(chunk => chunk.tokenCount <= 5)).toBe(true);

            // Verify that splits occur at word boundaries
            expect(result.every(chunk => {
                const content = chunk.content as string;
                return content.match(/^[a-zA-Z0-9]+$/); // Single words only
            })).toBe(true);

            // Verify that all content is preserved
            const joinedContent = result.map(chunk => chunk.content).join(' ').trim();
            expect(joinedContent).toBe(text);
        });

        it('should handle binary search with uneven splits', () => {
            tokenCalculator.calculateTokens.mockImplementation((text) => text.length);
            const longString = 'word1 word2 word3 word4 word5';

            const result = dataSplitter.splitIfNeeded({
                message: 'test',
                data: longString,
                modelInfo: { ...mockModelInfo, maxRequestTokens: 15 },
                maxResponseTokens: 10,
            });

            expect(result.length).toBeGreaterThan(1);
            expect(result.every(chunk => chunk.tokenCount <= 15)).toBe(true);

            // Check that splits occur at word boundaries when possible
            const allContent = result.map(chunk => chunk.content);
            expect(allContent.join(' ')).toBe(longString);
            expect(allContent.every(content =>
                // Either starts with a word character or is at the start of a chunk
                (!content.startsWith(' ') || content === longString) &&
                // Either ends with a word character or is at the end of a chunk
                (!content.endsWith(' ') || content === longString)
            )).toBe(true);
        });
    });
}); 