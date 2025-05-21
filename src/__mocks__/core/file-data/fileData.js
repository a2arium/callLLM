import { jest } from '@jest/globals';

// Mock image metadata
const mockImageMetadata = {
  width: 512,
  height: 512,
  format: 'png',
  channels: 4,
  hasAlpha: true,
  size: 262144
};

// Mock image buffer
const mockImageBuffer = Buffer.from('mock-image-data');

// Mock methods
export const normalizeImageSource = jest.fn().mockImplementation(async (source) => {
  // Handle all image source types
  if (typeof source === 'string') {
    // File path or URL
    return {
      data: mockImageBuffer,
      metadata: mockImageMetadata,
      format: 'png',
      source
    };
  } else if (Buffer.isBuffer(source)) {
    // Buffer
    return {
      data: source,
      metadata: mockImageMetadata,
      format: 'png',
      source: 'buffer'
    };
  } else if (source && typeof source === 'object' && source.data) {
    // Already normalized
    return source;
  }
  
  throw new Error('Invalid image source');
});

export const getMimeType = jest.fn().mockImplementation((format) => {
  const mimeTypes = {
    'png': 'image/png',
    'jpeg': 'image/jpeg',
    'jpg': 'image/jpeg',
    'webp': 'image/webp',
    'gif': 'image/gif'
  };
  
  return mimeTypes[format] || 'image/png';
});

export const saveImageToFile = jest.fn().mockResolvedValue('/path/to/saved/image.png');

export const base64ToBuffer = jest.fn().mockImplementation((base64String) => {
  return mockImageBuffer;
});

export const estimateImageTokens = jest.fn().mockReturnValue(85);

export const getImageDimensions = jest.fn().mockResolvedValue({
  width: 512,
  height: 512
});

export const getDominantColors = jest.fn().mockResolvedValue(['#FF0000', '#00FF00', '#0000FF']);

export const readFileAsBase64 = jest.fn().mockResolvedValue('base64-encoded-mock-data');

export const __esModule = true; 