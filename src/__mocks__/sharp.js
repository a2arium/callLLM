import { jest } from '@jest/globals';

const mockSharp = jest.fn().mockImplementation(() => {
  return {
    metadata: jest.fn().mockResolvedValue({
      width: 100,
      height: 100,
      format: 'jpeg',
      size: 1024,
      channels: 3
    }),
    resize: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-image-data')),
    composite: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toFormat: jest.fn().mockReturnThis(),
    withMetadata: jest.fn().mockReturnThis()
  };
});

module.exports = mockSharp; 