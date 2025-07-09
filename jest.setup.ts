/**
 * Global Jest setup file that runs before each test file
 * This ensures mocks are hoisted properly and applied consistently
 */

import { jest } from '@jest/globals';

// Set up environment variables for testing
process.env.OPENAI_API_KEY = 'test-api-key-for-jest';

// Core Node.js modules (never auto-mocked)
jest.mock('fs');
jest.mock('path');
jest.mock('sharp');

// Absolute paths for src/ modules using @/ alias
// Removed: jest.mock('@/core/models/ModelManager'); // Example if it were here
jest.mock('@/core/caller/ProviderManager');
jest.mock('@/utils/logger');
jest.mock('@/core/file-data/fileData');
jest.mock('@/core/history/HistoryManager');
jest.mock('@/core/streaming/StreamController');
jest.mock('@/core/models/TokenCalculator');
jest.mock('@/core/chat/ChatController');
jest.mock('@/core/streaming/StreamingService');
jest.mock('@/core/schema/SchemaValidator');
jest.mock('@/core/mcp/MCPServiceAdapter');


// Global Jest setup file

// Silence specific console errors that are expected during tests
const originalConsoleError = console.error;
console.error = (...args) => {
    // Filter out known warnings
    const errorMessage = args[0]?.toString() || '';
    if (
        errorMessage.includes('validateExportsMatchingESM') ||
        errorMessage.includes('Warning: Received `%s` for a non-boolean attribute') ||
        errorMessage.includes('Mock for function was not found in the mocked module') ||
        errorMessage.includes('TypeError: Cannot read properties of undefined')
    ) {
        return;
    }
    originalConsoleError(...args);
};

// Silence TypeScript 'never' warnings in mocks by muting console.warn
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
    // Filter out known warnings
    const warnMessage = args[0]?.toString() || '';
    if (
        warnMessage.includes('TypeScript') && warnMessage.includes('never')
    ) {
        return;
    }
    originalConsoleWarn(...args);
};

// Add additional Jest setup as needed 