/**
 * Global Jest setup file that runs before each test file
 * This ensures mocks are hoisted properly and applied consistently
 */

import { jest } from '@jest/globals';

// Mock @dqbd/tiktoken to resolve WebAssembly issues
jest.mock('@dqbd/tiktoken', () => ({
    encoding_for_model: jest.fn().mockReturnValue({
        encode: jest.fn().mockReturnValue(Array(10).fill(0)),
        decode: jest.fn().mockReturnValue([]),
        free: jest.fn()
    }),
    get_encoding: jest.fn().mockReturnValue({
        encode: jest.fn().mockReturnValue(Array(10).fill(0)),
        decode: jest.fn().mockReturnValue([]),
        free: jest.fn()
    })
}));

// Core Node.js modules (never auto-mocked)
jest.mock('fs');
jest.mock('path');
jest.mock('sharp');

// Absolute paths for src/ modules
// Removed: jest.mock('./src/core/models/ModelManager.js');
jest.mock('./src/core/caller/ProviderManager.js');
jest.mock('./src/utils/logger.js');
jest.mock('./src/core/file-data/fileData.js');
jest.mock('./src/core/history/HistoryManager.js');
jest.mock('./src/core/streaming/StreamController.js');
jest.mock('./src/core/models/TokenCalculator.js');
jest.mock('./src/core/chat/ChatController.js');
jest.mock('./src/core/streaming/StreamingService.js');
jest.mock('./src/core/schema/SchemaValidator.js');
jest.mock('./src/core/mcp/MCPServiceAdapter.js');

// Additional relative path variations to avoid duplicate modules
// Removed all jest.mock calls for ModelManager.js
// Removed: jest.mock('../../../../core/caller/ProviderManager.js', () => { ... });

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