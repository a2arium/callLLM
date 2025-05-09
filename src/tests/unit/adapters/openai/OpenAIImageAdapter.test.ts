import { jest } from '@jest/globals';
import { OpenAIResponseAdapter } from '../../../../adapters/openai/adapter';
import { ImageOp, ImageCallParams } from '../../../../interfaces/LLMProvider';
import * as fileData from '../../../../core/file-data/fileData';

// Mock OpenAI client
jest.mock('openai', () => {
    return {
        OpenAI: jest.fn().mockImplementation(() => ({
            images: {
                generate: jest.fn().mockImplementation(() => Promise.resolve({
                    data: [
                        {
                            b64_json: 'mock-base64-image-data',
                            url: null
                        }
                    ]
                }))
            }
        }))
    };
});

// Mock file-data utilities
jest.mock('../../../../core/file-data/fileData', () => ({
    saveBase64ToFile: jest.fn().mockImplementation(() => Promise.resolve())
}));

describe('OpenAIResponseAdapter Image Generation', () => {
    let adapter: OpenAIResponseAdapter;

    beforeEach(() => {
        jest.clearAllMocks();
        adapter = new OpenAIResponseAdapter({
            apiKey: 'test-api-key'
        });
    });

    describe('imageCall method', () => {
        // Test case for image generation operation
        test('should handle generate operation', async () => {
            // Define test parameters
            const model = 'dall-e-3';
            const op: ImageOp = 'generate';
            const params: ImageCallParams = {
                prompt: 'A beautiful sunset over mountains',
                options: {
                    quality: 'high',
                    size: '1024x1024'
                }
            };

            // Call the method
            const result = await adapter.imageCall(model, op, params);

            // Verify the result
            expect(result).toBeDefined();
            expect(result.image).toBeDefined();
            expect(result.image?.data).toBe('mock-base64-image-data');
            expect(result.image?.operation).toBe('generate');
        });

        // Test case for image generation with output path
        test('should save image when outputPath is provided', async () => {
            // Define test parameters
            const model = 'dall-e-3';
            const op: ImageOp = 'generate';
            const params: ImageCallParams = {
                prompt: 'A beautiful sunset over mountains',
                options: {
                    quality: 'high',
                    size: '1024x1024'
                },
                outputPath: '/path/to/output.png'
            };

            // Call the method
            const result = await adapter.imageCall(model, op, params);

            // Verify the result
            expect(result).toBeDefined();
            expect(result.image).toBeDefined();
            expect(result.metadata?.imageSavedPath).toBe('/path/to/output.png');

            // Verify that saveBase64ToFile was called with the correct arguments
            expect(fileData.saveBase64ToFile).toHaveBeenCalledWith(
                'mock-base64-image-data',
                '/path/to/output.png',
                'image/png'
            );
        });

        // Test case for image edit operation
        test('should handle edit operation', async () => {
            // Define test parameters
            const model = 'dall-e-3';
            const op: ImageOp = 'edit';
            const params: ImageCallParams = {
                prompt: 'Make the sky more colorful',
                files: [
                    { kind: 'url', value: 'https://example.com/image.jpg' }
                ],
                options: {
                    quality: 'high',
                    size: '1024x1024'
                }
            };

            // Call the method
            const result = await adapter.imageCall(model, op, params);

            // Verify the result
            expect(result).toBeDefined();
            expect(result.image).toBeDefined();
            expect(result.image?.operation).toBe('edit');
        });

        // Test case for image edit-masked operation
        test('should handle edit-masked operation', async () => {
            // Define test parameters
            const model = 'dall-e-3';
            const op: ImageOp = 'edit-masked';
            const params: ImageCallParams = {
                prompt: 'Replace the masked area with flowers',
                files: [
                    { kind: 'url', value: 'https://example.com/image.jpg' }
                ],
                mask: { kind: 'url', value: 'https://example.com/mask.jpg' },
                options: {
                    quality: 'high',
                    size: '1024x1024'
                }
            };

            // Call the method
            const result = await adapter.imageCall(model, op, params);

            // Verify the result
            expect(result).toBeDefined();
            expect(result.image).toBeDefined();
            expect(result.image?.operation).toBe('edit-masked');
        });

        // Test case for image composite operation
        test('should handle composite operation', async () => {
            // Define test parameters
            const model = 'dall-e-3';
            const op: ImageOp = 'composite';
            const params: ImageCallParams = {
                prompt: 'Combine these images into a cohesive scene',
                files: [
                    { kind: 'url', value: 'https://example.com/image1.jpg' },
                    { kind: 'url', value: 'https://example.com/image2.jpg' }
                ],
                options: {
                    quality: 'high',
                    size: '1024x1024'
                }
            };

            // Call the method
            const result = await adapter.imageCall(model, op, params);

            // Verify the result
            expect(result).toBeDefined();
            expect(result.image).toBeDefined();
            expect(result.image?.operation).toBe('composite');
        });

        // Test case for validation errors
        test('should throw error for edit operation with no files', async () => {
            // Define test parameters
            const model = 'dall-e-3';
            const op: ImageOp = 'edit';
            const params: ImageCallParams = {
                prompt: 'Edit this image',
                options: {
                    quality: 'high',
                    size: '1024x1024'
                }
            };

            // Expect the method to throw an error
            await expect(adapter.imageCall(model, op, params)).rejects.toThrow();
        });

        // Test case for validation errors
        test('should throw error for composite operation with less than 2 files', async () => {
            // Define test parameters
            const model = 'dall-e-3';
            const op: ImageOp = 'composite';
            const params: ImageCallParams = {
                prompt: 'Combine these images',
                files: [
                    { kind: 'url', value: 'https://example.com/image1.jpg' }
                ],
                options: {
                    quality: 'high',
                    size: '1024x1024'
                }
            };

            // Expect the method to throw an error
            await expect(adapter.imageCall(model, op, params)).rejects.toThrow();
        });
    });
}); 