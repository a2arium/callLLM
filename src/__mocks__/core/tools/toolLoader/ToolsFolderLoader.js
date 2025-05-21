import { jest } from '@jest/globals';

/**
 * Mock ToolDefinition with complete properties
 */
const MOCK_TOOL = {
  name: 'mock_tool',
  description: 'Mock tool for testing',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  callFunction: jest.fn().mockImplementation(async () => ({ result: 'mock result' }))
};

const MOCK_TOOL_PARAMS = {
  type: 'object',
  properties: {},
  required: []
};

// This is the object that will be returned by instances of the mocked ToolsFolderLoader
export const mockToolsFolderLoaderInstanceMethods = {
  getToolsDir: jest.fn(() => '/mock/tools/dir'),
  getTool: jest.fn().mockImplementation(async (name) => ({
    name: name || 'mock_tool',
    description: 'Mocked tool instance',
    parameters: MOCK_TOOL_PARAMS,
    callFunction: jest.fn().mockResolvedValue({ result: 'mock tool result' }),
  })),
  hasToolFunction: jest.fn().mockReturnValue(true),
  getAvailableTools: jest.fn().mockReturnValue(['mock_tool', 'mockStringTool']),
  getAllTools: jest.fn().mockImplementation(async () => [
    {
      name: 'mock_tool',
      description: 'Mocked tool instance',
      parameters: MOCK_TOOL_PARAMS,
      callFunction: jest.fn().mockResolvedValue({ result: 'mock tool result' }),
    },
  ]),
  scanDirectory: jest.fn(), // No-op
  createToolDefinition: jest.fn().mockImplementation(async (name) => ({
    name: name || 'mock_tool',
    description: 'Mocked tool instance via createToolDefinition',
    parameters: MOCK_TOOL_PARAMS,
    callFunction: jest.fn().mockResolvedValue({ result: 'mock tool result' }),
  })),
};

// This is the mock constructor for ToolsFolderLoader
// When `new ToolsFolderLoader()` is called in the code under test,
// this mock constructor will be invoked, and it will return an object
// with the mocked instance methods defined above.
export const ToolsFolderLoader = jest.fn().mockImplementation(() => mockToolsFolderLoaderInstanceMethods);

// Optional: if there's any code that tries to access properties directly on ToolsFolderLoader itself (static-like access)
// ToolsFolderLoader.someStaticMethod = jest.fn();

export default ToolsFolderLoader; // Default export can be the same mock constructor 