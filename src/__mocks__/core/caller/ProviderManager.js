import { jest } from '@jest/globals';

// Mock provider for tests
const mockProvider = {
  chatCall: jest.fn().mockImplementation(() => {
    return Promise.resolve({
      content: 'mock response',
      role: 'assistant',
      metadata: {},
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      }
    });
  }),
  completionCall: jest.fn().mockImplementation(() => {
    return Promise.resolve({
      content: 'mock completion',
      metadata: {},
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      }
    });
  }),
  imageCall: jest.fn().mockImplementation(() => {
    return Promise.resolve({
      images: [{
        url: 'https://example.com/image.png',
        b64: 'base64-image-data'
      }],
      metadata: {}
    });
  })
};

export class ProviderManager {
  constructor() {
    this.providers = new Map();
  }
  
  createProvider = jest.fn().mockReturnValue(mockProvider);
  
  getProvider = jest.fn().mockReturnValue(mockProvider);
  
  // Helper to explicitly set the mock provider for tests that need to control it
  __setMockProvider = (customProvider) => {
    this.getProvider.mockReturnValue(customProvider);
    return this;
  };
}

export const __esModule = true; 