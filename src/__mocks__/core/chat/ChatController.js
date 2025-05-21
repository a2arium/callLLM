import { jest } from '@jest/globals';

export class ChatController {
  constructor() {}
  
  formatMessages = jest.fn().mockReturnValue([]);
  handleSystemMessage = jest.fn().mockReturnValue([]);
  addUserMessage = jest.fn().mockReturnValue([]);
  buildPrompt = jest.fn().mockReturnValue({
    messages: [],
    promptPrefix: ''
  });
}

export const __esModule = true; 