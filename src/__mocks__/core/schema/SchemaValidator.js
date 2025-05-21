import { jest } from '@jest/globals';

export class SchemaValidator {
  constructor() {}
  
  validateSchema = jest.fn().mockReturnValue({ valid: true, value: {} });
  validateFunction = jest.fn().mockReturnValue({ valid: true, args: {} });
  repairInvalidJson = jest.fn().mockReturnValue({ valid: true, value: {} });
  extractFunctionCall = jest.fn().mockReturnValue(null);
}

export const __esModule = true; 