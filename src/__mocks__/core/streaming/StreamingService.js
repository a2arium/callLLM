import { jest } from '@jest/globals';

export class StreamingService {
  constructor() {}
  
  streamChatCall = jest.fn().mockImplementation(() => {
    return {
      [Symbol.asyncIterator]: () => ({
        next: async () => ({ done: true, value: undefined })
      })
    };
  });
  
  streamCompletionCall = jest.fn().mockImplementation(() => {
    return {
      [Symbol.asyncIterator]: () => ({
        next: async () => ({ done: true, value: undefined })
      })
    };
  });
}

export const __esModule = true; 