import { jest, beforeAll, beforeEach, describe, it, expect } from '@jest/globals';
// Remove static import
// import { ToolsFolderLoader } from '../../../../../core/tools/toolLoader/ToolsFolderLoader.ts';
let ToolsFolderLoader;
let FunctionFileParser;
import { ToolParsingError, type ParsedFunctionMeta } from '../../../../../core/tools/toolLoader/types.ts';
// import * as fs from 'fs'; // Remove direct import
// import * as path from 'path'; // Remove direct import

// Declare suite-level variables for mocked modules
let mockFsModule;
let mockPathModule;

// Define the standalone mock for parseFile here
const mockParseFile = jest.fn()

// Define fs and path mock functions
const mockExistsSync = jest.fn();
const mockStatSync = jest.fn();
const mockReaddirSync = jest.fn();
const mockJoin = jest.fn();
const mockResolve = jest.fn();
const mockBasename = jest.fn()

// Define mocks for path utilities
const mockGetImportMetaUrl = jest.fn();
const mockGetDirname = jest.fn();
const mockGetFilename = jest.fn();
const mockResolveFromFile = jest.fn()

jest.unstable_mockModule('fs', () => ({
  __esModule: true,
  existsSync: mockExistsSync,
  statSync: mockStatSync,
  readdirSync: mockReaddirSync,
  default: {
    existsSync: mockExistsSync,
    statSync: mockStatSync,
    readdirSync: mockReaddirSync
  }
}));

jest.unstable_mockModule('path', () => ({
  __esModule: true,
  join: mockJoin,
  resolve: mockResolve,
  basename: mockBasename,
  default: {
    join: mockJoin,
    resolve: mockResolve,
    basename: mockBasename
  }
}));

// Mock the path utilities
jest.unstable_mockModule('@/utils/importMetaUrl.ts', () => ({
  __esModule: true,
  getImportMetaUrl: mockGetImportMetaUrl,
  default: mockGetImportMetaUrl
}));

jest.unstable_mockModule('@/utils/paths.ts', () => ({
  __esModule: true,
  getDirname: mockGetDirname,
  getFilename: mockGetFilename,
  resolveFromFile: mockResolveFromFile,
  default: {
    getDirname: mockGetDirname,
    getFilename: mockGetFilename,
    resolveFromFile: mockResolveFromFile
  }
}));

jest.unstable_mockModule('@/core/tools/toolLoader/FunctionFileParser.ts', () => ({
  __esModule: true,
  // We need to mock the constructor and its prototype methods for FunctionFileParser
  FunctionFileParser: jest.fn().mockImplementation(() => ({
    parseFile: mockParseFile // Use the standalone mock function
  }))
}));

// Import fs and path AFTER jest.unstable_mockModule has been set up
// import * as fs from 'fs';
// import * as path from 'path';

beforeAll(async () => {
  // Set up the mocks for import.meta.url related functions
  mockGetImportMetaUrl.mockReturnValue('file:///mock/path/to/file.ts');
  mockGetDirname.mockReturnValue('/mock/path/to');
  mockGetFilename.mockReturnValue('/mock/path/to/file.ts');
  mockResolveFromFile.mockImplementation((_importMetaUrl, relativePath) => `/mock/path/to/${relativePath}`);

  mockFsModule = await import('fs');
  mockPathModule = await import('path');
  const FunctionFileParserModule = await import('../../../../../core/tools/toolLoader/FunctionFileParser.ts');
  FunctionFileParser = FunctionFileParserModule.FunctionFileParser;
  const ToolsFolderLoaderModule = await import('../../../../../core/tools/toolLoader/ToolsFolderLoader.ts');
  ToolsFolderLoader = ToolsFolderLoaderModule.ToolsFolderLoader;
});


describe('ToolsFolderLoader', () => {
  // let mockFs and mockPath are defined at suite level and populated in beforeAll
  let MockFunctionFileParser: jest.MockedClass<typeof FunctionFileParser>; // Declare type at suite level

  beforeEach(() => {
    jest.clearAllMocks();
    mockParseFile.mockClear();
    MockFunctionFileParser = FunctionFileParser as jest.MockedClass<typeof FunctionFileParser>;

    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ isDirectory: () => true } as any);
    // Default to only tool1.ts and tool2.ts for most tests
    mockReaddirSync.mockReturnValue(['tool1.ts', 'tool2.ts'] as any);
    mockJoin.mockImplementation((...args) => args.join('/'));
    mockResolve.mockImplementation((...args) => args.join('/'));
    mockBasename.mockImplementation((filePath, ext) => {
      const base = (filePath as string).split('/').pop() || '';
      return typeof ext === 'string' ? base.replace(ext, '') : base;
    });

    // Reset path utilities mocks
    mockGetImportMetaUrl.mockReturnValue('file:///mock/path/to/file.ts');
    mockGetDirname.mockReturnValue('/mock/path/to');
    mockGetFilename.mockReturnValue('/mock/path/to/file.ts');
    mockResolveFromFile.mockImplementation((_importMetaUrl, relativePath) => `/mock/path/to/${relativePath}`);
  });

  describe('constructor', () => {
    it('should initialize correctly', () => {
      const mockTool1: ParsedFunctionMeta = {
        name: 'tool1',
        description: 'Tool 1 description',
        schema: { type: 'object', properties: {} },
        runtimePath: '/mock/tools/dir/tool1.ts'
      };

      const mockTool2: ParsedFunctionMeta = {
        name: 'tool2',
        description: 'Tool 2 description',
        schema: { type: 'object', properties: {} },
        runtimePath: '/mock/tools/dir/tool2.ts'
      };

      mockParseFile.mockReturnValueOnce(mockTool1).mockReturnValueOnce(mockTool2);

      const loader = new ToolsFolderLoader('/mock/tools/dir');

      expect(mockFsModule.existsSync).toHaveBeenCalledWith('/mock/tools/dir');
      expect(mockFsModule.statSync).toHaveBeenCalledWith('/mock/tools/dir');
      expect(mockFsModule.readdirSync).toHaveBeenCalledWith('/mock/tools/dir');
      expect(mockParseFile).toHaveBeenCalledTimes(2);
    });

    it('should throw error if directory does not exist', () => {
      (mockFsModule.existsSync as jest.Mock).mockReturnValue(false);

      expect(() => new ToolsFolderLoader('/nonexistent/dir')).
        toThrow('Tools directory not found');
    });

    it('should throw error if path is not a directory', () => {
      (mockFsModule.statSync as jest.Mock).mockReturnValue({ isDirectory: () => false } as any);

      expect(() => new ToolsFolderLoader('/not/a/dir')).
        toThrow('Path is not a directory');
    });

    it('should handle errors during directory scanning', () => {
      (mockFsModule.readdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('Read directory error');
      });

      expect(() => new ToolsFolderLoader('/error/dir')).
        toThrow('Failed to scan tools directory');
    });
  });

  describe('getAvailableTools', () => {
    it('should return list of available tools', () => {
      const mockTool1: ParsedFunctionMeta = {
        name: 'tool1',
        description: 'Tool 1 description',
        schema: { type: 'object', properties: {} },
        runtimePath: '/mock/tools/dir/tool1.ts'
      };

      const mockTool2: ParsedFunctionMeta = {
        name: 'tool2',
        description: 'Tool 2 description',
        schema: { type: 'object', properties: {} },
        runtimePath: '/mock/tools/dir/tool2.ts'
      };

      mockParseFile.mockReturnValueOnce(mockTool1).mockReturnValueOnce(mockTool2);

      const loader = new ToolsFolderLoader('/mock/tools/dir');
      const tools = loader.getAvailableTools();

      expect(tools).toEqual(['tool1', 'tool2']);
    });

    it('should return empty array when no tools are available', () => {
      (mockFsModule.readdirSync as jest.Mock).mockReturnValue([]);

      const loader = new ToolsFolderLoader('/mock/tools/dir');
      const tools = loader.getAvailableTools();

      expect(tools).toEqual([]);
    });

    it('should handle empty results from readdir', () => {
      // Mock readdirSync to return an empty array
      (mockFsModule.readdirSync as jest.Mock).mockReturnValue([]);

      // Create the loader
      const loader = new ToolsFolderLoader('/mock/tools/dir');

      // Verify no files were processed
      expect(mockParseFile).not.toHaveBeenCalled();
      expect(loader.getAvailableTools()).toEqual([]);
      expect(loader.getAvailableTools().length).toBe(0);
    });

    it('should handle null or undefined from readdir', () => {
      // Mock readdirSync to return null
      (mockFsModule.readdirSync as jest.Mock).mockReturnValue(null as any);

      // Create the loader - this should not throw
      const loader = new ToolsFolderLoader('/mock/tools/dir');

      // Verify no files were processed
      expect(mockParseFile).not.toHaveBeenCalled();
      expect(loader.getAvailableTools()).toEqual([]);

      // Test with undefined as well
      jest.clearAllMocks();
      (mockFsModule.readdirSync as jest.Mock).mockReturnValue(undefined as any);

      const loader2 = new ToolsFolderLoader('/mock/tools/dir');
      expect(mockParseFile).not.toHaveBeenCalled();
      expect(loader2.getAvailableTools()).toEqual([]);
    });
  });

  describe('hasToolFunction', () => {
    it('should return true for existing tool', () => {
      const mockTool: ParsedFunctionMeta = {
        name: 'tool1',
        description: 'Tool 1 description',
        schema: { type: 'object', properties: {} },
        runtimePath: '/mock/tools/dir/tool1.ts'
      };

      mockParseFile.mockReturnValue(mockTool);

      const loader = new ToolsFolderLoader('/mock/tools/dir');

      expect(loader.hasToolFunction('tool1')).toBe(true);
    });

    it('should return false for non-existent tool', () => {
      const mockTool: ParsedFunctionMeta = {
        name: 'tool1',
        description: 'Tool 1 description',
        schema: { type: 'object', properties: {} },
        runtimePath: '/mock/tools/dir/tool1.ts'
      };

      mockParseFile.mockReturnValue(mockTool);

      const loader = new ToolsFolderLoader('/mock/tools/dir');

      expect(loader.hasToolFunction('nonExistentTool')).toBe(false);
    });
  });

  describe('getTool', () => {
    it('should return tool definition for existing tool', async () => {
      const mockTool: ParsedFunctionMeta = {
        name: 'tool1',
        description: 'Tool 1 description',
        schema: { type: 'object', properties: {} },
        runtimePath: '/mock/tools/dir/tool1.ts'
      };

      mockParseFile.mockReturnValue(mockTool);

      const loader = new ToolsFolderLoader('/mock/tools/dir');
      const tool = await loader.getTool('tool1');

      expect(tool).toHaveProperty('name', 'tool1');
      expect(tool).toHaveProperty('description', 'Tool 1 description');
      expect(tool).toHaveProperty('parameters');
      expect(tool).toHaveProperty('callFunction');
    });

    it('should throw error for non-existent tool', async () => {
      const mockTool: ParsedFunctionMeta = {
        name: 'tool1',
        description: 'Tool 1 description',
        schema: { type: 'object', properties: {} },
        runtimePath: '/mock/tools/dir/tool1.ts'
      };

      mockParseFile.mockReturnValue(mockTool);

      const loader = new ToolsFolderLoader('/mock/tools/dir');

      await expect(loader.getTool('nonExistentTool')).rejects.toThrow("Tool function 'nonExistentTool' not found");
    });

    it('should return cached tool definition on subsequent calls', async () => {
      const mockTool: ParsedFunctionMeta = {
        name: 'tool1',
        description: 'Tool 1 description',
        schema: { type: 'object', properties: {} },
        runtimePath: '/mock/tools/dir/tool1.ts'
      };

      mockParseFile.mockReturnValue(mockTool);

      const loader = new ToolsFolderLoader('/mock/tools/dir');

      // First call should cache the tool
      await loader.getTool('tool1');

      // Reset mock to verify it's not called again
      jest.clearAllMocks();

      // Second call should use cached version
      await loader.getTool('tool1');

      // parseFile should not be called again
      expect(mockParseFile).not.toHaveBeenCalled();
    });
  });

  describe('getAllTools', () => {
    it('should return all tool definitions', async () => {
      // Only return tool1.ts and tool2.ts for this test
      mockReaddirSync.mockReturnValue(['tool1.ts', 'tool2.ts'] as any);

      const mockTool1: ParsedFunctionMeta = {
        name: 'tool1',
        description: 'Tool 1 description',
        schema: { type: 'object', properties: {} },
        runtimePath: '/mock/tools/dir/tool1.ts'
      };
      const mockTool2: ParsedFunctionMeta = {
        name: 'tool2',
        description: 'Tool 2 description',
        schema: { type: 'object', properties: {} },
        runtimePath: '/mock/tools/dir/tool2.ts'
      };

      mockParseFile.mockReturnValueOnce(mockTool1).mockReturnValueOnce(mockTool2);

      const loader = new ToolsFolderLoader('/mock/tools/dir');
      const tools = await loader.getAllTools();

      expect(tools).toHaveLength(2);
      expect(tools[0]).toHaveProperty('name', 'tool1');
      expect(tools[1]).toHaveProperty('name', 'tool2');
    });

    it('should return empty array when no tools are available', async () => {
      (mockFsModule.readdirSync as jest.Mock).mockReturnValue([]);

      const loader = new ToolsFolderLoader('/mock/tools/dir');
      const tools = await loader.getAllTools();

      expect(tools).toEqual([]);
    });
  });

  describe('filterTypeScriptFiles', () => {
    it('should filter TypeScript files correctly during directory scanning', () => {
      // Set up a mix of .ts and non-.ts files
      mockReaddirSync.mockReturnValue([
        'tool1.ts', 'tool2.ts', 'notATool.ts', 'README.md', 'tool3.js', 'tool4', '.tool5.ts', 'tool6.txt', 'tool7.d.ts'
      ] as any);

      const mockTool1: ParsedFunctionMeta = {
        name: 'tool1',
        description: 'Tool 1 description',
        schema: { type: 'object', properties: {} },
        runtimePath: '/mock/tools/dir/tool1.ts'
      };
      const mockTool2: ParsedFunctionMeta = {
        name: 'tool2',
        description: 'Tool 2 description',
        schema: { type: 'object', properties: {} },
        runtimePath: '/mock/tools/dir/tool2.ts'
      };
      const mockNotATool: ParsedFunctionMeta = {
        name: 'notATool',
        description: 'Not a tool',
        schema: { type: 'object', properties: {} },
        runtimePath: '/mock/tools/dir/notATool.ts'
      };
      const mockDotTool5: ParsedFunctionMeta = {
        name: '.tool5',
        description: 'Dot tool 5',
        schema: { type: 'object', properties: {} },
        runtimePath: '/mock/tools/dir/.tool5.ts'
      };
      const mockTool7: ParsedFunctionMeta = {
        name: 'tool7',
        description: 'Tool 7',
        schema: { type: 'object', properties: {} },
        runtimePath: '/mock/tools/dir/tool7.d.ts'
      };

      mockParseFile
        .mockReturnValueOnce(mockTool1)
        .mockReturnValueOnce(mockTool2)
        .mockReturnValueOnce(mockNotATool)
        .mockReturnValueOnce(mockDotTool5)
        .mockReturnValueOnce(mockTool7);

      const loader = new ToolsFolderLoader('/mock/tools/dir');

      // Should only process files ending with .ts
      // In this case, tool1.ts, tool2.ts, notATool.ts, .tool5.ts, tool7.d.ts
      expect(mockParseFile).toHaveBeenCalledTimes(5);

      // Verify the correct files were processed
      const parsedFilePaths = mockParseFile.mock.calls.map((call) => call[0]);
      expect(parsedFilePaths).toEqual([
        '/mock/tools/dir/tool1.ts',
        '/mock/tools/dir/tool2.ts',
        '/mock/tools/dir/notATool.ts',
        '/mock/tools/dir/.tool5.ts',
        '/mock/tools/dir/tool7.d.ts'
      ]);
    });
  });
});