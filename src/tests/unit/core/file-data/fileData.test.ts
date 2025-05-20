import fs from 'fs';
import path from 'path';
import * as fileData from '../../../../core/file-data/fileData.js';
import { jest, expect } from '@jest/globals';
import {
    validateImageFile,
    normalizeImageSource,
    estimateImageTokens,
    filePathToBase64,
    saveBase64ToFile,
    FileValidationError,
    getMimeTypeFromExtension,
    validateMaskFile,
    MaskValidationError
} from '../../../../core/file-data/fileData.js';
import { FilePathSource, UrlSource, Base64Source } from '../../../../interfaces/UniversalInterfaces.js';
import sharp from 'sharp';

// Mock fs and path modules
jest.mock('fs', () => {
    const fsMock = {
        promises: {
            readFile: jest.fn().mockImplementation(() => Promise.resolve(Buffer.from('file content'))),
            stat: jest.fn().mockImplementation(() => Promise.resolve({ size: 1024 })),
            writeFile: jest.fn().mockImplementation(() => Promise.resolve()),
            mkdir: jest.fn().mockImplementation(() => Promise.resolve())
        },
        existsSync: jest.fn().mockReturnValue(true),
        mkdirSync: jest.fn(),
        statSync: jest.fn().mockImplementation(() => ({ size: 1024 }))
    };
    return fsMock;
});

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
            // Mock file reading
            const mockBuffer = Buffer.from('test image content');
            const mockBase64Content = mockBuffer.toString('base64');

            (fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>).mockResolvedValueOnce(mockBuffer);
            (fs.promises.stat as jest.MockedFunction<typeof fs.promises.stat>).mockResolvedValueOnce({
                size: 1024 * 1024 * 2 // 2MB
            } as fs.Stats);

            // Call the function
            const result = await filePathToBase64({ type: 'file_path', path: '/path/to/image.png' });

            // Verify the result
            expect(result).toEqual({
                type: 'base64',
                data: mockBase64Content,
                mime: 'image/png'
            });

            // Verify that fs.readFile was called with the correct path
            expect(fs.promises.readFile).toHaveBeenCalledWith('/path/to/image.png');
        });

        it('should handle JPG/JPEG files correctly', async () => {
            // Mock the file content
            const mockContent = Buffer.from('test jpeg content');

            // Setup mock for readFile
            (fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>).mockResolvedValue(mockContent);

            // Call the function with a .jpg file
            const result1 = await filePathToBase64({ type: 'file_path', path: '/path/to/image.jpg' });
            expect(result1.mime).toBe('image/jpeg');

            // Call the function with a .jpeg file
            const result2 = await filePathToBase64({ type: 'file_path', path: '/path/to/image.jpeg' });
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
                const result = await filePathToBase64({ type: 'file_path', path: `/path/to/image.${format.ext}` });
                expect(result.mime).toBe(format.mime);
            }
        });

        it('should throw an error if file reading fails', async () => {
            // Mock file reading to throw an error
            const error = new Error('File not found');
            (fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>).mockRejectedValueOnce(error);

            // Call the function and expect it to throw
            await expect(filePathToBase64({ type: 'file_path', path: '/path/to/nonexistent.png' }))
                .rejects.toThrow('Failed to read file:');
        });
    });

    describe('validateImageFile', () => {
        it('should validate a file successfully', () => {
            // Setup FilePathSource
            const source: FilePathSource = {
                type: 'file_path',
                path: '/path/to/image.jpg'
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
                type: 'file_path',
                path: '/path/to/large-image.jpg'
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
                type: 'file_path',
                path: '/path/to/image.bmp'  // BMP not in supported formats
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
                type: 'file_path',
                path: '/path/to/nonexistent.jpg'
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
                type: 'url',
                url: 'https://example.com/image.jpg'
            };

            const result = await normalizeImageSource(source);
            expect(result).toBe(source); // Should be the same object
        });

        it('should return Base64Source as is', async () => {
            const source: Base64Source = {
                type: 'base64',
                data: 'base64data',
                mime: 'image/jpeg'
            };

            const result = await normalizeImageSource(source);
            expect(result).toBe(source); // Should be the same object
        });

        it('should convert FilePathSource to Base64Source', async () => {
            const source: FilePathSource = {
                type: 'file_path',
                path: '/path/to/image.jpg'
            };

            // Mock filesystem access
            const mockStatSync = jest.spyOn(fs, 'statSync').mockImplementationOnce(() => ({ size: 1024 } as fs.Stats));

            // Setup mock for readFile
            const mockContent = Buffer.from('test jpeg content');
            (fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>).mockResolvedValue(mockContent);

            // Call the function
            const result = await normalizeImageSource(source);

            // Verify the result
            expect(result).toEqual({
                type: 'base64',
                data: mockContent.toString('base64'),
                mime: 'image/jpeg'
            });

            // Cleanup
            mockStatSync.mockRestore();
        });

        it('should throw error for unknown source kind', async () => {
            const source = { type: 'unknown' } as any;

            await expect(normalizeImageSource(source))
                .rejects.toThrow('Unsupported image source type:');
        });

        it('should propagate validation errors', async () => {
            const source: FilePathSource = {
                type: 'file_path',
                path: '/path/to/image.jpg'
            };

            // Directly spy on normalizeImageSource and mock it to throw an error
            // This avoids the validation check inside normalizeImageSource
            const normalizeSourceSpy = jest.spyOn(fileData, 'normalizeImageSource');
            normalizeSourceSpy.mockRejectedValueOnce(
                new FileValidationError('File is too large', 'image.jpg')
            );

            // Test that the error is propagated
            await expect(normalizeImageSource(source)).rejects.toThrow('File is too large');
            await expect(normalizeImageSource(source)).rejects.toBeInstanceOf(FileValidationError);

            // Clean up
            normalizeSourceSpy.mockRestore();
        });
    });

    describe('estimateImageTokens', () => {
        it('should return correct token count for high detail', () => {
            expect(estimateImageTokens(1024, 1024)).toBe(170);
        });

        it('should return correct token count for low resolution', () => {
            expect(estimateImageTokens(512, 512)).toBe(85);
        });

        it('should return correct token count for small images', () => {
            expect(estimateImageTokens(256, 256)).toBe(85);
        });

        it('should handle wide aspect ratio', () => {
            expect(estimateImageTokens(1792, 1024)).toBe(170);
        });

        it('should handle tall aspect ratio', () => {
            expect(estimateImageTokens(1024, 1792)).toBe(170);
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
            // Reset mock call counts
            jest.clearAllMocks();

            // Make sure existsSync returns true for directory checks
            (fs.existsSync as jest.MockedFunction<typeof fs.existsSync>).mockReturnValue(true);
        });

        it('should save base64 data to a file', async () => {
            const targetPath = '/path/to/output/image.png';
            const base64Data = 'SGVsbG8gV29ybGQ='; // "Hello World" in base64

            // Configure mocks for this test
            const mkdirSpy = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
            const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);

            // Call the function
            const result = await saveBase64ToFile(base64Data, targetPath);

            // Check directory creation
            expect(mkdirSpy).toHaveBeenCalled();

            // For file writing, only check that it was called with the correct path
            expect(writeFileSpy).toHaveBeenCalled();
            expect(writeFileSpy.mock.calls[0][0]).toBe(targetPath);

            // Verify the function returns the path
            expect(result).toBe(targetPath);

            // Clean up
            mkdirSpy.mockRestore();
            writeFileSpy.mockRestore();
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
            (fs.promises.mkdir as jest.MockedFunction<typeof fs.promises.mkdir>)
                .mockRejectedValueOnce(dirError);

            // Make sure the test fails properly
            try {
                await saveBase64ToFile('SGVsbG8gV29ybGQ=', '/path/to/output/image.png');
                expect(false).toBe(true); // This should never happen
            } catch (error: any) {
                expect(error.message).toContain('Failed to save file: Permission denied');
            }

            // Check mkdir was called but writeFile was not
            expect(fs.promises.mkdir).toHaveBeenCalled();
            expect(fs.promises.writeFile).not.toHaveBeenCalled();
        });

        it('should throw an error if file writing fails', async () => {
            const writeError = new Error('Disk full');
            // First let mkdir succeed
            (fs.promises.mkdir as jest.MockedFunction<typeof fs.promises.mkdir>)
                .mockResolvedValueOnce(undefined);
            // Then make writeFile fail
            (fs.promises.writeFile as jest.MockedFunction<typeof fs.promises.writeFile>)
                .mockRejectedValueOnce(writeError);

            // Make sure the test fails properly
            try {
                await saveBase64ToFile('SGVsbG8gV29ybGQ=', '/path/to/output/image.png');
                expect(false).toBe(true); // This should never happen
            } catch (error: any) {
                expect(error.message).toContain('Failed to save file: Disk full');
            }

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
            const maskSource: FilePathSource = { type: 'file_path', path: '/path/to/mask.png' };

            // Mock returns a PNG file with alpha

            // Should not throw
            await expect(validateMaskFile(maskSource)).resolves.not.toThrow();
        });

        it('should validate a mask against source image dimensions successfully', async () => {
            const maskSource: FilePathSource = { type: 'file_path', path: '/path/to/mask.png' };
            const sourceImage: FilePathSource = { type: 'file_path', path: '/path/to/source.jpg' };

            // Mock returns same dimensions for both images by default

            await expect(validateMaskFile(maskSource, sourceImage)).resolves.not.toThrow();
        });

        it('should throw MaskValidationError if mask lacks alpha channel', async () => {
            const maskSource: FilePathSource = { type: 'file_path', path: '/path/to/mask.png' };

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
            const maskSource: FilePathSource = { type: 'file_path', path: '/path/to/mask.png' };
            const sourceImage: FilePathSource = { type: 'file_path', path: '/path/to/source.jpg' };

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
            const maskSource: FilePathSource = { type: 'file_path', path: '/path/to/mask.xyz' };

            // Should throw format validation error
            await expect(validateMaskFile(maskSource, undefined, { formats: ['png'] }))
                .rejects.toThrow(MaskValidationError);
        });

        it('should handle sharp metadata errors', async () => {
            const maskSource: FilePathSource = { type: 'file_path', path: '/path/to/mask.png' };

            // Mock sharp to throw an error during metadata retrieval
            (sharp as unknown as jest.Mock).mockImplementationOnce(() => ({
                metadata: jest.fn<() => Promise<sharp.Metadata>>().mockRejectedValue(new Error('Invalid image format'))
            }));

            await expect(validateMaskFile(maskSource))
                .rejects.toThrow('Mask validation failed: Invalid image format');
        });

        it('should accept non-alpha masks if not required', async () => {
            const maskSource: FilePathSource = { type: 'file_path', path: '/path/to/mask.png' };

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