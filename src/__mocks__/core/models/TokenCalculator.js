import { jest } from '@jest/globals';

export class TokenCalculator {
  constructor() {}
  
  // Common methods
  countTokens = jest.fn().mockReturnValue(10);
  countMessageTokens = jest.fn().mockReturnValue(10);
  getTokenUsage = jest.fn().mockReturnValue({ promptTokens: 10, completionTokens: 20, totalTokens: 30 });
  getCompletionTokens = jest.fn().mockReturnValue(20);
  getPromptTokens = jest.fn().mockReturnValue(10);
}

export const __esModule = true; 