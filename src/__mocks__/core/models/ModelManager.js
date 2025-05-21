import { jest } from '@jest/globals';

export class ModelManager {
  constructor() {}
  
  // Frequently used methods
  getModel = jest.fn().mockImplementation((name) => ({
    name: name || 'mock-model',
    provider: 'mock-provider',
    capabilities: {
      streaming: true,
      chat: true,
      completion: true,
      json: true,
      tools: true
    },
    inputPricing: { 1000: 0.01 },
    outputPricing: { 1000: 0.02 }
  }));
  
  modelExists = jest.fn().mockReturnValue(true);
  getModels = jest.fn().mockReturnValue([]);
  getModelsByProvider = jest.fn().mockReturnValue([]);
  getModelCategories = jest.fn().mockReturnValue([]);
}

export const __esModule = true; 