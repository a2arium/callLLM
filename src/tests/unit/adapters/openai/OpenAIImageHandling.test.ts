import { jest } from '@jest/globals';
import { OpenAIResponseAdapter } from '../../../../adapters/openai/adapter';
import { normalizeImageSource } from '../../../../core/file-data/fileData';
import { ModelManager } from '../../../../core/models/ModelManager';

// Mock the dependencies
jest.mock('openai', () => {
    return {
        OpenAI: jest.fn().mockImplementation(() => ({
            images: {
                generate: jest.fn().mockResolvedValue({
                    created: Date.now(),
                    data: [
                        {
                            b64_json: 'mock-base64-data',
                            url: null
                        }
                    ],
                    usage: {
                        input_tokens: 15,
                        output_tokens: 1056,
                        total_tokens: 1071
                    }
                }),
                edit: jest.fn().mockResolvedValue({
                    created: Date.now(),
                    data: [
                        {
                            b64_json: 'mock-edited-base64-data',
                            url: null
                        }
                    ]
                })
            }
        }))
    };
});

jest.mock('../../../../core/file-data/fileData', () => {
    return {
        normalizeImageSource: jest.fn().mockResolvedValue({
            type: 'base64',
            data: 'mock-normalized-base64',
            mime: 'image/png'
        }),
        saveBase64ToFile: jest.fn().mockResolvedValue('/path/to/saved/image.png')
    };
});

jest.mock('../../../../core/models/ModelManager', () => {
    return {
        ModelManager: jest.fn().mockImplementation(() => ({
            getModel: jest.fn().mockReturnValue({
                name: 'gpt-image-1',
                capabilities: {
                    output: {
                        image: {
                            generate: true,
                            edit: true,
                            editWithMask: true
                        }
                    }
                }
            })
        }))
    };
});

// Mock fs module
jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn().mockResolvedValue(Buffer.from('mock-file-content')),
        writeFile: jest.fn().mockResolvedValue(undefined)
    }
}));

describe('OpenAI Image Handling', () => {
    let adapter: OpenAIResponseAdapter;
    let mockOpenAI: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup adapter
        adapter = new OpenAIResponseAdapter({
            apiKey: 'test-key'
        });

        // Get mock instances for spying
        mockOpenAI = (adapter as any).client;
    });

    describe('Image Generation Tests', () => {
        test('should include base64 image data in response when using b64_json format', async () => {
            // Arrange
            const mockBase64Data = 'mock-base64-data';
            const mockResponse = {
                created: Date.now(),
                data: [{
                    b64_json: mockBase64Data
                }],
                usage: {
                    input_tokens: 15,
                    output_tokens: 1056,
                    total_tokens: 1071
                }
            };

            mockOpenAI.images.generate.mockResolvedValueOnce(mockResponse);

            // Act
            const result = await adapter.imageCall('gpt-image-1', 'generate', {
                prompt: 'A test image prompt'
            });

            // Assert
            expect(result.image).toBeDefined();
            expect(result.image?.data).toBe(mockBase64Data);
            expect(result.image?.dataSource).toBe('base64');
            expect(result.image?.operation).toBe('generate');
        });

        test('should include URL in response when using url format', async () => {
            // Arrange
            const mockUrl = 'https://example.com/image.png';
            const mockResponse = {
                created: Date.now(),
                data: [{
                    url: mockUrl
                }],
                usage: {
                    input_tokens: 15,
                    output_tokens: 1056,
                    total_tokens: 1071
                }
            };

            mockOpenAI.images.generate.mockResolvedValueOnce(mockResponse);

            // Act
            const result = await adapter.imageCall('gpt-image-1', 'generate', {
                prompt: 'A test image prompt',
                response_format: 'url'
            });

            // Assert
            expect(result.image).toBeDefined();
            expect(result.image?.dataSource).toBe('url');
            expect(result.metadata?.imageUrl).toBe(mockUrl);
        });

        test('should calculate image dimensions from size parameter', async () => {
            // Arrange
            const mockBase64Data = 'mock-base64-data';
            const mockResponse = {
                created: Date.now(),
                data: [{
                    b64_json: mockBase64Data
                }],
                usage: {
                    input_tokens: 15,
                    output_tokens: 1056,
                    total_tokens: 1071
                }
            };

            mockOpenAI.images.generate.mockResolvedValueOnce(mockResponse);

            // Act
            const result = await adapter.imageCall('gpt-image-1', 'generate', {
                prompt: 'A test image prompt',
                size: '512x512'
            });

            // Assert
            expect(result.image).toBeDefined();
            expect(result.image?.width).toBe(512);
            expect(result.image?.height).toBe(512);
        });

        test('should use default dimensions when size is not provided', async () => {
            // Arrange
            const mockBase64Data = 'mock-base64-data';
            const mockResponse = {
                created: Date.now(),
                data: [{
                    b64_json: mockBase64Data
                }],
                usage: {
                    input_tokens: 15,
                    output_tokens: 1056,
                    total_tokens: 1071
                }
            };

            mockOpenAI.images.generate.mockResolvedValueOnce(mockResponse);

            // Act
            const result = await adapter.imageCall('gpt-image-1', 'generate', {
                prompt: 'A test image prompt'
                // No size provided
            });

            // Assert
            expect(result.image).toBeDefined();
            expect(result.image?.width).toBe(1024); // Default width
            expect(result.image?.height).toBe(1024); // Default height
        });
    });

    describe('End-to-End Image Flow Tests', () => {
        test('should correctly flow image data through LLMCaller', async () => {
            // This test would be implemented in the LLMCaller.images.test.ts file
            // by verifying the image data flows correctly through the entire chain
        });
    });
}); 