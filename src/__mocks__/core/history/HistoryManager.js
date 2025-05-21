import { jest } from '@jest/globals';

export class HistoryManager {
  constructor() {}
  
  addMessage = jest.fn().mockResolvedValue(true);
  getMessages = jest.fn().mockResolvedValue([]);
  clearMessages = jest.fn().mockResolvedValue(true);
  getContext = jest.fn().mockResolvedValue({ messages: [] });
  mergeMessages = jest.fn();
}

export const __esModule = true; 