import { jest } from '@jest/globals';

export const logger = {
  createLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }),
  setConfig: jest.fn()
};

export const __esModule = true; 