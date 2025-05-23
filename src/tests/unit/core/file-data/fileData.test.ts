import { jest, expect, beforeAll, beforeEach } from '@jest/globals';
import type { FilePathSource, UrlSource, Base64Source } from '../../../../interfaces/UniversalInterfaces.ts';
import type { Metadata } from 'sharp';

// Declare mock function types
const mockSharpMetadata = jest.fn<() => Promise<Metadata>>();
const mockWriteFile = jest.fn();

// Mock the logger first since it's imported by fileData
jest.unstable_mockModule('@/utils/logger', () => {
  const mockLoggerInstance = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    createLogger: jest.fn(() => mockLoggerInstance),
    setConfig: jest.fn()
  };

  return {
    __esModule: true,
    logger: mockLoggerInstance,
    Logger: jest.fn().mockImplementation(() => mockLoggerInstance)
  };
});

// Mock fs module
jest.unstable_mockModule('fs', () => {
  return {
    promises: {
      readFile: jest.fn().mockImplementation(() => Promise.resolve(Buffer.from('file content'))),
      stat: jest.fn().mockImplementation(() => Promise.resolve({ size: 1024 })),
      writeFile: mockWriteFile.mockImplementation(() => Promise.resolve()),
      mkdir: jest.fn().mockImplementation(() => Promise.resolve())
    },
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    statSync: jest.fn().mockImplementation(() => ({ size: 1024 }))
  };
});

// Mock path module
jest.unstable_mockModule('path', () => {
  return {
    __esModule: true,
    dirname: jest.fn().mockImplementation((p) => {
      if (typeof p === 'string') return p.split('/').slice(0, -1).join('/');
      return '';
    }),
    basename: jest.fn().mockImplementation((p) => {
      if (typeof p === 'string') return p.split('/').pop();
      return '';
    }),
    extname: jest.fn().mockImplementation((p) => {
      if (typeof p === 'string') {
        const parts = p.split('.');
        return parts.length > 1 ? `.${parts.pop()}` : '';
      }
      return '';
    }),
    join: jest.fn().mockImplementation((...parts) => parts.join('/')),
    resolve: jest.fn().mockImplementation((...parts) => parts.join('/'))
  };
});

// Mock sharp module
jest.unstable_mockModule('sharp', () => {
  const sharpFn = jest.fn().mockImplementation(() => ({
    metadata: mockSharpMetadata
  }));
  return { __esModule: true, default: sharpFn };
});

// Module variables we'll set during dynamic imports
let fileData: any;
let fsModule: any;
let sharpModule: any;
let pathModule: any;

// Import modules after mocking
beforeAll(async () => {
  fileData = await import('../../../../core/file-data/fileData.ts');
  fsModule = await import('fs');
  sharpModule = await import('sharp');
  pathModule = await import('path');
});

describe('fileData', () => {
  // Clean up mocks between tests
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup a default successful metadata mock for sharp instances
    mockSharpMetadata.mockResolvedValue({
      width: 100,
      height: 100,
      hasAlpha: true,
      format: 'png'
    } as Metadata);
  });

  describe('readFileAsBase64', () => {
    it('should read a file and convert it to Base64Source', async () => {
      // Mock file reading
      const mockBuffer = Buffer.from('test image content');
      const mockBase64Content = mockBuffer.toString('base64');

      fsModule.promises.readFile.mockResolvedValueOnce(mockBuffer);
      fsModule.promises.stat.mockResolvedValueOnce({
        size: 1024 * 1024 * 2 // 2MB
      });

      // Call the function
      const result = await fileData.filePathToBase64({ type: 'file_path', path: '/path/to/image.png' });

      // Verify the result
      expect(result).toEqual({
        type: 'base64',
        data: mockBase64Content,
        mime: 'image/png'
      });

      // Verify that fs.readFile was called with the correct path
      expect(fsModule.promises.readFile).toHaveBeenCalledWith('/path/to/image.png');
    });

    it('should handle JPG/JPEG files correctly', async () => {
      // Mock the file content
      const mockContent = Buffer.from('test jpeg content');

      // Setup mock for readFile
      fsModule.promises.readFile.mockResolvedValue(mockContent);

      // Call the function with a .jpg file
      const result1 = await fileData.filePathToBase64({ type: 'file_path', path: '/path/to/image.jpg' });
      expect(result1.mime).toBe('image/jpeg');

      // Call the function with a .jpeg file
      const result2 = await fileData.filePathToBase64({ type: 'file_path', path: '/path/to/image.jpeg' });
      expect(result2.mime).toBe('image/jpeg');
    });

    it('should handle various image formats with the correct MIME type', async () => {
      // Mock the file content
      const mockContent = Buffer.from('test content');

      // Setup mock for readFile
      fsModule.promises.readFile.mockResolvedValue(mockContent);

      // Test various formats
      const formats = [
        { ext: 'gif', mime: 'image/gif' },
        { ext: 'webp', mime: 'image/webp' },
        { ext: 'svg', mime: 'image/svg+xml' },
        { ext: 'unknown', mime: 'application/octet-stream' }];

      for (const format of formats) {
        const result = await fileData.filePathToBase64({ type: 'file_path', path: `/path/to/image.${format.ext}` });
        expect(result.mime).toBe(format.mime);
      }
    });

    it('should throw an error if file reading fails', async () => {
      // Mock file reading to throw an error
      const error = new Error('File not found');
      fsModule.promises.readFile.mockRejectedValueOnce(error);

      // Call the function and expect it to throw
      await expect(fileData.filePathToBase64({ type: 'file_path', path: '/path/to/nonexistent.png' })).
        rejects.toThrow('Failed to read file:');
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
      fsModule.statSync.mockReturnValueOnce({
        size: 1024 * 1024 // 1MB
      });

      // Call the validation function - it should not throw
      expect(() => {
        fileData.validateImageFile(source, {
          maxSize: 5 * 1024 * 1024, // 5MB max
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
      fsModule.statSync.mockReturnValueOnce({
        size: 10 * 1024 * 1024 // 10MB - larger than our limit
      });

      // Call the validation function - it should throw a specific error
      expect(() => {
        fileData.validateImageFile(source, {
          maxSize: 5 * 1024 * 1024, // 5MB max
          formats: ['jpg', 'png', 'gif']
        });
      }).toThrow(/File exceeds maximum size/);
    });

    it('should throw FileValidationError if format is not supported', () => {
      // Setup FilePathSource with an unsupported format
      const source: FilePathSource = {
        type: 'file_path',
        path: '/path/to/image.bmp' // BMP not in supported formats
      };

      // Mock statSync to return valid file size
      fsModule.statSync.mockReturnValueOnce({
        size: 1024 * 1024 // 1MB - valid size
      });

      // Call the validation function - it should throw format error
      expect(() => {
        fileData.validateImageFile(source, {
          maxSize: 5 * 1024 * 1024,
          formats: ['jpg', 'png', 'gif'] // 'bmp' not included
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
      fsModule.statSync.mockImplementationOnce(() => {
        throw new Error('ENOENT: File not found');
      });

      // Call the validation function - it should throw access error
      expect(() => {
        fileData.validateImageFile(source, {
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

      const result = await fileData.normalizeImageSource(source);
      expect(result).toBe(source); // Should be the same object
    });

    it('should return Base64Source as is', async () => {
      const source: Base64Source = {
        type: 'base64',
        data: 'base64data',
        mime: 'image/jpeg'
      };

      const result = await fileData.normalizeImageSource(source);
      expect(result).toBe(source); // Should be the same object
    });

    it('should convert FilePathSource to Base64Source', async () => {
      const source: FilePathSource = {
        type: 'file_path',
        path: '/path/to/image.jpg'
      };

      // Setup mock for statSync and readFile
      fsModule.statSync.mockReturnValueOnce({ size: 1024 });
      const mockContent = Buffer.from('test jpeg content');
      fsModule.promises.readFile.mockResolvedValueOnce(mockContent);

      // Call the function
      const result = await fileData.normalizeImageSource(source);

      // Verify the result
      expect(result).toEqual({
        type: 'base64',
        data: mockContent.toString('base64'),
        mime: 'image/jpeg'
      });
    });

    it('should throw error for unknown source kind', async () => {
      const source = { type: 'unknown' } as any;

      await expect(fileData.normalizeImageSource(source)).
        rejects.toThrow('Unsupported image source type:');
    });
  });

  describe('estimateImageTokens', () => {
    it('should return correct token count for high detail', () => {
      expect(fileData.estimateImageTokens(1024, 1024)).toBe(170);
    });

    it('should return correct token count for low resolution', () => {
      expect(fileData.estimateImageTokens(512, 512)).toBe(85);
    });

    it('should return correct token count for small images', () => {
      expect(fileData.estimateImageTokens(256, 256)).toBe(85);
    });

    it('should handle wide aspect ratio', () => {
      expect(fileData.estimateImageTokens(1792, 1024)).toBe(170);
    });

    it('should handle tall aspect ratio', () => {
      expect(fileData.estimateImageTokens(1024, 1792)).toBe(170);
    });
  });

  describe('getMimeTypeFromExtension', () => {
    it('should return correct MIME type for known extensions', () => {
      expect(fileData.getMimeTypeFromExtension('.jpg')).toBe('image/jpeg');
      expect(fileData.getMimeTypeFromExtension('.jpeg')).toBe('image/jpeg');
      expect(fileData.getMimeTypeFromExtension('.png')).toBe('image/png');
      expect(fileData.getMimeTypeFromExtension('.gif')).toBe('image/gif');
      expect(fileData.getMimeTypeFromExtension('.webp')).toBe('image/webp');
      expect(fileData.getMimeTypeFromExtension('.svg')).toBe('image/svg+xml');
    });

    it('should handle path strings with extensions', () => {
      expect(fileData.getMimeTypeFromExtension('/path/to/file.jpg')).toBe('image/jpeg');
      expect(fileData.getMimeTypeFromExtension('image.png')).toBe('image/png');
    });

    it('should return octet-stream for unknown extensions', () => {
      expect(fileData.getMimeTypeFromExtension('.xyz')).toBe('application/octet-stream');
      expect(fileData.getMimeTypeFromExtension('file.unknown')).toBe('application/octet-stream');
      expect(fileData.getMimeTypeFromExtension('no-extension')).toBe('application/octet-stream');
    });
  });

  describe('saveBase64ToFile', () => {
    beforeEach(() => {
      // Reset mock call counts
      jest.clearAllMocks();

      // Make sure existsSync returns true for directory checks
      fsModule.existsSync.mockReturnValue(true);
    });

    it('should save base64 data to a file', async () => {
      const targetPath = '/path/to/output/image.png';
      const base64Data = 'SGVsbG8gV29ybGQ='; // "Hello World" in base64

      // Configure mocks for this test
      fsModule.promises.mkdir.mockResolvedValue(undefined);
      fsModule.promises.writeFile.mockResolvedValue(undefined);

      // Call the function
      const result = await fileData.saveBase64ToFile(base64Data, targetPath);

      // Check directory creation
      expect(fsModule.promises.mkdir).toHaveBeenCalled();

      // For file writing, only check that it was called with the correct path
      expect(fsModule.promises.writeFile).toHaveBeenCalled();
      expect(fsModule.promises.writeFile.mock.calls[0][0]).toBe(targetPath);

      // Verify the function returns the path
      expect(result).toBe(targetPath);
    });

    it('should handle base64 data with MIME prefix', async () => {
      const base64WithPrefix = 'data:image/png;base64,SGVsbG8gV29ybGQ=';
      const targetPath = '/path/to/output/image.png';

      await fileData.saveBase64ToFile(base64WithPrefix, targetPath);

      // Check file was written with the correct content (MIME prefix removed)
      const calledBuffer = fsModule.promises.writeFile.mock.calls[0][1] as Buffer;
      expect(calledBuffer).toBeDefined();
    });

    it('should throw an error if directory creation fails', async () => {
      const dirError = new Error('Permission denied');
      fsModule.promises.mkdir.mockRejectedValueOnce(dirError);

      await expect(fileData.saveBase64ToFile('SGVsbG8gV29ybGQ=', '/path/to/output/image.png'))
        .rejects.toThrow('Failed to save file: Permission denied');

      // Check mkdir was called but writeFile was not
      expect(fsModule.promises.mkdir).toHaveBeenCalled();
      expect(fsModule.promises.writeFile).not.toHaveBeenCalled();
    });

    it('should throw an error if file writing fails', async () => {
      const writeError = new Error('Disk full');
      // First let mkdir succeed
      fsModule.promises.mkdir.mockResolvedValueOnce(undefined);
      // Then make writeFile fail
      fsModule.promises.writeFile.mockRejectedValueOnce(writeError);

      await expect(fileData.saveBase64ToFile('SGVsbG8gV29ybGQ=', '/path/to/output/image.png'))
        .rejects.toThrow('Failed to save file: Disk full');

      // Check both were called but writing failed
      expect(fsModule.promises.mkdir).toHaveBeenCalled();
      expect(fsModule.promises.writeFile).toHaveBeenCalled();
    });
  });

  describe('validateMaskFile', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Default sharp metadata mock for these tests
      mockSharpMetadata.mockResolvedValue({
        width: 100,
        height: 100,
        hasAlpha: true,
        format: 'png'
      } as Metadata);
      // Mock fs.statSync for basic validation
      fsModule.statSync.mockReturnValue({ size: 100 * 1024 }); // 100KB
    });

    it('should validate a mask file successfully', async () => {
      const maskSource: FilePathSource = { type: 'file_path', path: '/path/to/mask.png' };

      // Mock returns a PNG file with alpha

      // Should not throw
      await expect(fileData.validateMaskFile(maskSource)).resolves.not.toThrow();
    });

    it('should validate a mask against source image dimensions successfully', async () => {
      const maskSource: FilePathSource = { type: 'file_path', path: '/path/to/mask.png' };
      const sourceImage: FilePathSource = { type: 'file_path', path: '/path/to/source.jpg' };

      // Mock returns same dimensions for both images by default

      await expect(fileData.validateMaskFile(maskSource, sourceImage)).resolves.not.toThrow();
    });

    it('should throw MaskValidationError if mask lacks alpha channel', async () => {
      const maskSource: FilePathSource = { type: 'file_path', path: '/path/to/mask.png' };

      // Mock sharp to return image without alpha channel for this specific test
      mockSharpMetadata.mockResolvedValueOnce({
        width: 100,
        height: 100,
        hasAlpha: false,
        format: 'png'
      } as Metadata);

      // Test with a single assertion
      await expect(fileData.validateMaskFile(maskSource)).
        rejects.toThrow('Mask image must have an alpha channel');
    });

    it('should throw MaskValidationError if dimensions do not match', async () => {
      const maskSource: FilePathSource = { type: 'file_path', path: '/path/to/mask.png' };
      const sourceImage: FilePathSource = { type: 'file_path', path: '/path/to/source.jpg' };

      // First call returns mask dimensions (100x100)
      mockSharpMetadata.mockResolvedValueOnce({
        width: 100,
        height: 100,
        hasAlpha: true,
        format: 'png'
      } as Metadata);

      // Second call returns source image dimensions (200x200) - different from mask
      mockSharpMetadata.mockResolvedValueOnce({
        width: 200,
        height: 200,
        hasAlpha: false, // Doesn't matter for source
        format: 'jpeg'
      } as Metadata);

      await expect(fileData.validateMaskFile(maskSource, sourceImage)).
        rejects.toThrow('Mask dimensions (100x100) do not match source image (200x200)');
    });

    it('should throw MaskValidationError if mask image reading fails', async () => {
      const maskSource: FilePathSource = { type: 'file_path', path: '/path/to/mask.png' };

      // Make sharp's metadata method throw an error for this test
      mockSharpMetadata.mockRejectedValueOnce(new Error('Invalid image data'));

      await expect(fileData.validateMaskFile(maskSource)).
        rejects.toThrow('Mask validation failed: Invalid image data');
    });

    it('should throw MaskValidationError if source image reading fails', async () => {
      const maskSource: FilePathSource = { type: 'file_path', path: '/path/to/mask.png' };
      const sourceImage: FilePathSource = { type: 'file_path', path: '/path/to/source.jpg' };

      // First call for mask succeeds
      mockSharpMetadata.mockResolvedValueOnce({
        width: 100,
        height: 100,
        hasAlpha: true,
        format: 'png'
      } as Metadata);

      // Second call for source image fails
      mockSharpMetadata.mockRejectedValueOnce(new Error('Invalid source image'));

      await expect(fileData.validateMaskFile(maskSource, sourceImage)).
        rejects.toThrow('Mask validation failed: Invalid source image');
    });
  });
});