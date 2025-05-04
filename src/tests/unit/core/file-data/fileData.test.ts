import * as fs from 'fs';
import * as path from 'path';
import {
    readFileAsBase64,
    validateImageFile,
    normalizeImageSource,
    estimateImageTokens,
    FileValidationError
} from '../../../../core/file-data/fileData';
import { FilePathSource, UrlSource, Base64Source } from '../../../../interfaces/UniversalInterfaces';

// Mock fs and path modules
jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
        stat: jest.fn()
    },
    statSync: jest.fn()
}));

describe('fileData', () => {
    // Clean up mocks between tests
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('readFileAsBase64', () => {
        it('should read a file and convert it to Base64Source', async () => {
            // Mock the file content
            const mockContent = Buffer.from('test image content');
            const mockBase64Content = mockContent.toString('base64');

            // Setup mock for readFile
            (fs.promises.readFile as jest.Mock).mockResolvedValue(mockContent);

            // Call the function with a .png file
            const result = await readFileAsBase64('/path/to/image.png');

            // Check that readFile was called with the right path
            expect(fs.promises.readFile).toHaveBeenCalledWith('/path/to/image.png');

            // Verify the result
            expect(result).toEqual({
                kind: 'base64',
                value: mockBase64Content,
                mime: 'image/png'
            });
        });

        it('should handle JPG/JPEG files correctly', async () => {
            // Mock the file content
            const mockContent = Buffer.from('test jpeg content');

            // Setup mock for readFile
            (fs.promises.readFile as jest.Mock).mockResolvedValue(mockContent);

            // Call the function with a .jpg file
            const result1 = await readFileAsBase64('/path/to/image.jpg');
            expect(result1.mime).toBe('image/jpeg');

            // Call the function with a .jpeg file
            const result2 = await readFileAsBase64('/path/to/image.jpeg');
            expect(result2.mime).toBe('image/jpeg');
        });

        it('should handle various image formats with the correct MIME type', async () => {
            // Mock the file content
            const mockContent = Buffer.from('test content');

            // Setup mock for readFile
            (fs.promises.readFile as jest.Mock).mockResolvedValue(mockContent);

            // Test various formats
            const formats = [
                { ext: 'gif', mime: 'image/gif' },
                { ext: 'webp', mime: 'image/webp' },
                { ext: 'svg', mime: 'image/svg+xml' },
                { ext: 'unknown', mime: 'application/octet-stream' }
            ];

            for (const format of formats) {
                const result = await readFileAsBase64(`/path/to/image.${format.ext}`);
                expect(result.mime).toBe(format.mime);
            }
        });

        it('should throw an error if file reading fails', async () => {
            // Setup mock for readFile to reject
            const mockError = new Error('File not found');
            (fs.promises.readFile as jest.Mock).mockRejectedValue(mockError);

            // Call the function and expect it to throw
            await expect(readFileAsBase64('/path/to/nonexistent.png'))
                .rejects.toThrow('Failed to read file: File not found');
        });
    });

    describe('validateImageFile', () => {
        it('should validate a file successfully', () => {
            // Setup FilePathSource
            const source: FilePathSource = {
                kind: 'filePath',
                value: '/path/to/image.jpg'
            };

            // Mock statSync to return valid file stats
            (fs.statSync as jest.Mock).mockReturnValue({
                size: 1024 * 1024  // 1MB
            });

            // Call the validation function - it should not throw
            expect(() => {
                validateImageFile(source, {
                    maxSize: 5 * 1024 * 1024,  // 5MB max
                    formats: ['jpg', 'png', 'gif']
                });
            }).not.toThrow();
        });

        it('should throw FileValidationError if file is too large', () => {
            // Setup FilePathSource
            const source: FilePathSource = {
                kind: 'filePath',
                value: '/path/to/large-image.jpg'
            };

            // Mock statSync to return large file stats
            (fs.statSync as jest.Mock).mockReturnValue({
                size: 10 * 1024 * 1024  // 10MB - larger than our limit
            });

            // Call the validation function - it should throw a specific error
            expect(() => {
                validateImageFile(source, {
                    maxSize: 5 * 1024 * 1024,  // 5MB max
                    formats: ['jpg', 'png', 'gif']
                });
            }).toThrow(/File exceeds maximum size/);
        });

        it('should throw FileValidationError if format is not supported', () => {
            // Setup FilePathSource with an unsupported format
            const source: FilePathSource = {
                kind: 'filePath',
                value: '/path/to/image.bmp'  // BMP not in supported formats
            };

            // Mock statSync to return valid file size
            (fs.statSync as jest.Mock).mockReturnValue({
                size: 1024 * 1024  // 1MB - valid size
            });

            // Call the validation function - it should throw format error
            expect(() => {
                validateImageFile(source, {
                    maxSize: 5 * 1024 * 1024,
                    formats: ['jpg', 'png', 'gif']  // 'bmp' not included
                });
            }).toThrow(/Unsupported image format/);
        });

        it('should throw FileValidationError if file is not accessible', () => {
            // Setup FilePathSource
            const source: FilePathSource = {
                kind: 'filePath',
                value: '/path/to/nonexistent.jpg'
            };

            // Mock statSync to throw an error
            (fs.statSync as jest.Mock).mockImplementation(() => {
                throw new Error('ENOENT: File not found');
            });

            // Call the validation function - it should throw access error
            expect(() => {
                validateImageFile(source, {
                    maxSize: 5 * 1024 * 1024,
                    formats: ['jpg', 'png', 'gif']
                });
            }).toThrow(/Failed to access file/);
        });
    });

    describe('normalizeImageSource', () => {
        it('should return UrlSource as is', async () => {
            const source: UrlSource = {
                kind: 'url',
                value: 'https://example.com/image.jpg'
            };

            const result = await normalizeImageSource(source);
            expect(result).toBe(source); // Should be the same object
        });

        it('should return Base64Source as is', async () => {
            const source: Base64Source = {
                kind: 'base64',
                value: 'base64data',
                mime: 'image/jpeg'
            };

            const result = await normalizeImageSource(source);
            expect(result).toBe(source); // Should be the same object
        });

        it('should convert FilePathSource to Base64Source', async () => {
            const source: FilePathSource = {
                kind: 'filePath',
                value: '/path/to/image.jpg'
            };

            // Mock stat and readFile for successful conversion
            (fs.promises.stat as jest.Mock).mockResolvedValue({
                size: 1024  // 1KB - valid size
            });
            const mockContent = Buffer.from('file content');
            (fs.promises.readFile as jest.Mock).mockResolvedValue(mockContent);

            const result = await normalizeImageSource(source);

            expect(result).toEqual({
                kind: 'base64',
                value: mockContent.toString('base64'),
                mime: 'image/jpeg'
            });
        });

        it('should throw error for unknown source kind', async () => {
            // Create an invalid source object
            const source = {
                kind: 'unknown',
                value: 'test'
            } as any;

            await expect(normalizeImageSource(source))
                .rejects.toThrow('Unsupported image source kind: unknown');
        });

        it('should propagate validation errors', async () => {
            const source: FilePathSource = {
                kind: 'filePath',
                value: '/path/to/large-image.jpg'
            };

            // Mock stat to report a very large file that will fail validation
            (fs.promises.stat as jest.Mock).mockResolvedValue({
                size: 10 * 1024 * 1024  // 10MB - too large
            });

            await expect(normalizeImageSource(source))
                .rejects.toThrow(FileValidationError);
        });
    });

    describe('estimateImageTokens', () => {
        it('should return 85 tokens for low detail', () => {
            const result = estimateImageTokens('low');
            expect(result).toBe(85);
        });

        it('should return 170 tokens for high detail', () => {
            const result = estimateImageTokens('high');
            expect(result).toBe(170);
        });

        it('should default to low detail (85 tokens) for auto setting', () => {
            const result = estimateImageTokens('auto');
            expect(result).toBe(85);
        });
    });

    describe('FileValidationError', () => {
        it('should create a proper error object with details', () => {
            const error = new FileValidationError(
                'File validation failed',
                'test.jpg',
                {
                    maxSize: 1024,
                    actualSize: 2048,
                    allowedFormats: ['jpg', 'png'],
                    detectedFormat: 'bmp'
                }
            );

            expect(error.name).toBe('FileValidationError');
            expect(error.message).toBe('File validation failed');
            expect(error.fileName).toBe('test.jpg');
            expect(error.details).toEqual({
                maxSize: 1024,
                actualSize: 2048,
                allowedFormats: ['jpg', 'png'],
                detectedFormat: 'bmp'
            });
        });

        it('should create a minimal error object without details', () => {
            const error = new FileValidationError('Simple error');

            expect(error.name).toBe('FileValidationError');
            expect(error.message).toBe('Simple error');
            expect(error.fileName).toBeUndefined();
            expect(error.details).toBeUndefined();
        });
    });
}); 