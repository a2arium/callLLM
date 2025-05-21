import { jest } from '@jest/globals';

export class MCPServiceAdapter {
  constructor() {}
  connect = jest.fn().mockResolvedValue(true);
  hasConnection = jest.fn().mockReturnValue(true);
  runTool = jest.fn().mockResolvedValue({ result: 'mock result' });
  listTools = jest.fn().mockResolvedValue([]);
  getStreamToolResponse = jest.fn().mockImplementation(() => {
    return {
      [Symbol.asyncIterator]: () => ({
        next: async () => ({ done: true, value: undefined })
      })
    };
  });
}

export const __esModule = true; 