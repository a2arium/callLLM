import * as fs from 'fs';
import path from 'path';
import { jest } from '@jest/globals';
import {
    readFileAsBase64,
    validateImageFile,
    normalizeImageSource,
    estimateImageTokens,
    FileValidationError,
    getMimeTypeFromExtension,
    saveBase64ToFile,
    validateMaskFile,
    MaskValidationError
} from '../../../../core/file-data/fileData';
import { FilePathSource, UrlSource, Base64Source } from '../../../../interfaces/UniversalInterfaces';
import sharp from 'sharp';

// Mock fs and path modules
jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
        stat: jest.fn(),
        writeFile: jest.fn(),
        mkdir: jest.fn()
    },
    statSync: jest.fn()
}));

// Mock sharp
jest.mock('sharp', () => {
    // The main sharp function mock returns an object that has a metadata method.
    // The metadata method itself is a jest.fn() that we can configure per test.
    return jest.fn().mockImplementation(() => ({
        metadata: jest.fn<() => Promise<sharp.Metadata>>().mockResolvedValue({
            width: 100,
            height: 100,
            hasAlpha: true,
            format: 'png'
        } as sharp.Metadata)
    }));
});

describe('fileData', () => {
    // Clean up mocks between tests
    beforeEach(() => {
        jest.clearAllMocks();
        // Setup a default successful metadata mock for sharp instances
        // Tests can override this with mockImplementationOnce if specific behavior is needed
        const sharpInstance = sharp();
        if (sharpInstance && sharpInstance.metadata) {
            (sharpInstance.metadata as jest.MockedFunction<typeof sharpInstance.metadata>).mockResolvedValue({
                width: 100,
                height: 100,
                hasAlpha: true,
                format: 'png'
            } as sharp.Metadata);
        }
    });

    describe('readFileAsBase64', () => {
        it('should read a file and convert it to Base64Source', async () => {
            // Mock the file content
            const mockContent = Buffer.from('test image content');
            const mockBase64Content = mockContent.toString('base64');

            // Setup mock for readFile
            (fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>).mockResolvedValue(mockContent);

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
            (fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>).mockResolvedValue(mockContent);

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
            (fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>).mockResolvedValue(mockContent);

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
            (fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>).mockRejectedValue(mockError);

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
            (fs.promises.stat as jest.MockedFunction<typeof fs.promises.stat>).mockResolvedValue({
                size: 1024  // 1KB - valid size
            } as fs.Stats);
            const mockContent = Buffer.from('file content');
            (fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>).mockResolvedValue(mockContent);

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
            (fs.promises.stat as jest.MockedFunction<typeof fs.promises.stat>).mockResolvedValue({
                size: 10 * 1024 * 1024  // 10MB - too large
            } as fs.Stats);

            await expect(normalizeImageSource(source))
                .rejects.toThrow(FileValidationError);
        });
    });

    describe('estimateImageTokens', () => {
        it('should return correct token count for low detail', () => {
            expect(estimateImageTokens('low')).toBe(85);
        });

        it('should return correct token count for high detail', () => {
            expect(estimateImageTokens('high')).toBe(170);
        });

        it('should default to low detail for auto mode', () => {
            expect(estimateImageTokens('auto')).toBe(85);
        });
    });

    describe('getMimeTypeFromExtension', () => {
        it('should return correct MIME type for known extensions', () => {
            expect(getMimeTypeFromExtension('.jpg')).toBe('image/jpeg');
            expect(getMimeTypeFromExtension('.jpeg')).toBe('image/jpeg');
            expect(getMimeTypeFromExtension('.png')).toBe('image/png');
            expect(getMimeTypeFromExtension('.gif')).toBe('image/gif');
            expect(getMimeTypeFromExtension('.webp')).toBe('image/webp');
            expect(getMimeTypeFromExtension('.svg')).toBe('image/svg+xml');
        });

        it('should handle path strings with extensions', () => {
            expect(getMimeTypeFromExtension('/path/to/file.jpg')).toBe('image/jpeg');
            expect(getMimeTypeFromExtension('image.png')).toBe('image/png');
        });

        it('should return octet-stream for unknown extensions', () => {
            expect(getMimeTypeFromExtension('.xyz')).toBe('application/octet-stream');
            expect(getMimeTypeFromExtension('file.unknown')).toBe('application/octet-stream');
            expect(getMimeTypeFromExtension('no-extension')).toBe('application/octet-stream');
        });
    });

    describe('saveBase64ToFile', () => {
        beforeEach(() => {
            // Reset mocks
            jest.clearAllMocks();
            // Default successful implementation
            (fs.promises.mkdir as jest.MockedFunction<typeof fs.promises.mkdir>).mockResolvedValue(undefined);
            (fs.promises.writeFile as jest.MockedFunction<typeof fs.promises.writeFile>).mockResolvedValue(undefined);
        });

        it('should save base64 data to a file', async () => {
            const base64Data = 'SGVsbG8gV29ybGQ='; // "Hello World" in base64
            const targetPath = '/path/to/output/image.png';

            await saveBase64ToFile(base64Data, targetPath);

            // Check directory creation
            expect(fs.promises.mkdir).toHaveBeenCalledWith(path.dirname(targetPath), { recursive: true });

            // Check file writing with buffer created from the base64 data
            expect(fs.promises.writeFile).toHaveBeenCalledWith(
                targetPath,
                expect.any(Buffer)
            );

            // Verify the buffer content matches our base64 data
            const calledBuffer = (fs.promises.writeFile as jest.Mock).mock.calls[0][1] as Buffer;
            expect(calledBuffer.toString('base64')).toBe(base64Data);
        });

        it('should handle base64 data with MIME prefix', async () => {
            const base64WithPrefix = 'data:image/png;base64,SGVsbG8gV29ybGQ=';
            const expectedBase64 = 'SGVsbG8gV29ybGQ=';
            const targetPath = '/path/to/output/image.png';

            await saveBase64ToFile(base64WithPrefix, targetPath);

            // Check file was written with the correct content (MIME prefix removed)
            const calledBuffer = (fs.promises.writeFile as jest.Mock).mock.calls[0][1] as Buffer;
            expect(calledBuffer.toString('base64')).toBe(expectedBase64);
        });

        it('should throw an error if directory creation fails', async () => {
            const dirError = new Error('Permission denied');
            (fs.promises.mkdir as jest.MockedFunction<typeof fs.promises.mkdir>).mockRejectedValue(dirError);

            await expect(saveBase64ToFile('SGVsbG8gV29ybGQ=', '/path/to/output/image.png'))
                .rejects.toThrow('Failed to save file: Permission denied');

            // Check mkdir was called but writeFile was not
            expect(fs.promises.mkdir).toHaveBeenCalled();
            expect(fs.promises.writeFile).not.toHaveBeenCalled();
        });

        it('should throw an error if file writing fails', async () => {
            const writeError = new Error('Disk full');
            (fs.promises.writeFile as jest.MockedFunction<typeof fs.promises.writeFile>).mockRejectedValue(writeError);

            await expect(saveBase64ToFile('SGVsbG8gV29ybGQ=', '/path/to/output/image.png'))
                .rejects.toThrow('Failed to save file: Disk full');

            // Check both were called but writing failed
            expect(fs.promises.mkdir).toHaveBeenCalled();
            expect(fs.promises.writeFile).toHaveBeenCalled();
        });
    });

    describe('validateMaskFile', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            // Default sharp metadata mock for these tests
            const sharpInstance = sharp();
            if (sharpInstance && sharpInstance.metadata) {
                (sharpInstance.metadata as jest.MockedFunction<typeof sharpInstance.metadata>).mockResolvedValue({
                    width: 100,
                    height: 100,
                    hasAlpha: true,
                    format: 'png'
                } as sharp.Metadata);
            }
            // Mock fs.statSync for basic validation
            (fs.statSync as jest.Mock).mockReturnValue({ size: 100 * 1024 }); // 100KB
        });

        it('should validate a mask file successfully', async () => {
            const maskSource: FilePathSource = { kind: 'filePath', value: '/path/to/mask.png' };

            // Mock returns a PNG file with alpha

            // Should not throw
            await expect(validateMaskFile(maskSource)).resolves.not.toThrow();
        });

        it('should validate a mask against source image dimensions successfully', async () => {
            const maskSource: FilePathSource = { kind: 'filePath', value: '/path/to/mask.png' };
            const sourceImage: FilePathSource = { kind: 'filePath', value: '/path/to/source.jpg' };

            // Mock returns same dimensions for both images by default

            await expect(validateMaskFile(maskSource, sourceImage)).resolves.not.toThrow();
        });

        it('should throw MaskValidationError if mask lacks alpha channel', async () => {
            const maskSource: FilePathSource = { kind: 'filePath', value: '/path/to/mask.png' };

            // Mock sharp to return image without alpha channel for this specific test
            (sharp as unknown as jest.Mock).mockImplementationOnce(() => ({
                metadata: jest.fn<() => Promise<sharp.Metadata>>().mockResolvedValue({
                    width: 100,
                    height: 100,
                    hasAlpha: false,
                    format: 'png'
                } as sharp.Metadata)
            }));

            // Test with a single assertion
            await expect(validateMaskFile(maskSource))
                .rejects.toThrow('Mask image must have an alpha channel');
        });

        it('should throw MaskValidationError if dimensions do not match', async () => {
            const maskSource: FilePathSource = { kind: 'filePath', value: '/path/to/mask.png' };
            const sourceImage: FilePathSource = { kind: 'filePath', value: '/path/to/source.jpg' };

            // Set up mocks with different dimensions
            // First mock for mask
            (sharp as unknown as jest.Mock)
                .mockImplementationOnce(() => ({
                    metadata: jest.fn<() => Promise<sharp.Metadata>>().mockResolvedValue({
                        width: 100,
                        height: 100,
                        hasAlpha: true,
                        format: 'png'
                    } as sharp.Metadata)
                }))
                // Second mock for source image
                .mockImplementationOnce(() => ({
                    metadata: jest.fn<() => Promise<sharp.Metadata>>().mockResolvedValue({
                        width: 200,
                        height: 200,
                        hasAlpha: true,
                        format: 'jpeg'
                    } as sharp.Metadata)
                }));

            await expect(validateMaskFile(maskSource, sourceImage))
                .rejects.toThrow('Mask dimensions (100x100) do not match source image (200x200)');
        });

        it('should convert FileValidationError to MaskValidationError', async () => {
            const maskSource: FilePathSource = { kind: 'filePath', value: '/path/to/mask.xyz' };

            // Should throw format validation error
            await expect(validateMaskFile(maskSource, undefined, { formats: ['png'] }))
                .rejects.toThrow(MaskValidationError);
        });

        it('should handle sharp metadata errors', async () => {
            const maskSource: FilePathSource = { kind: 'filePath', value: '/path/to/mask.png' };

            // Mock sharp to throw an error during metadata retrieval
            (sharp as unknown as jest.Mock).mockImplementationOnce(() => ({
                metadata: jest.fn<() => Promise<sharp.Metadata>>().mockRejectedValue(new Error('Invalid image format'))
            }));

            await expect(validateMaskFile(maskSource))
                .rejects.toThrow('Mask validation failed: Invalid image format');
        });

        it('should accept non-alpha masks if not required', async () => {
            const maskSource: FilePathSource = { kind: 'filePath', value: '/path/to/mask.png' };

            // Mock sharp to return image without alpha channel
            (sharp as unknown as jest.Mock).mockImplementationOnce(() => ({
                metadata: jest.fn<() => Promise<sharp.Metadata>>().mockResolvedValue({
                    width: 100,
                    height: 100,
                    hasAlpha: false,
                    format: 'png'
                } as sharp.Metadata)
            }));

            // Should not throw because requireAlphaChannel: false
            await expect(validateMaskFile(
                maskSource,
                undefined,
                { requireAlphaChannel: false, formats: ['png'] }
            )).resolves.not.toThrow();
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

    // Add test for saving base64 images
    describe('image saving functionality', () => {
        it('saveBase64ToFile should save a base64 image to file', async () => {
            // Setup
            const mockBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFdgJr0xqUaQAAAABJRU5ErkJggg==';
            const mockOutputPath = '/tmp/test-output.png';

            // Mock filesystem
            (fs.promises.writeFile as jest.MockedFunction<typeof fs.promises.writeFile>).mockResolvedValue(undefined);
            (fs.promises.mkdir as jest.MockedFunction<typeof fs.promises.mkdir>).mockResolvedValue(undefined);

            // Call the function
            await saveBase64ToFile(mockBase64, mockOutputPath);

            // Assertions
            expect(fs.promises.mkdir).toHaveBeenCalled();
            expect(fs.promises.writeFile).toHaveBeenCalled();
        });
    });
}); 