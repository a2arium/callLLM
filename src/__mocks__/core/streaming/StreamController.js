import { jest } from '@jest/globals';

export class StreamController {
  constructor() {}
  
  createStreamHandler = jest.fn().mockReturnValue({
    handleStreamingResponse: jest.fn().mockImplementation(() => ({
      [Symbol.asyncIterator]: () => ({
        next: async () => ({ done: true, value: undefined })
      })
    }))
  });
  
  processToolCalls = jest.fn().mockResolvedValue({ toolCalls: [] });
}

export const __esModule = true; 