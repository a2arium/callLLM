import { ToolsFolderLoader } from '../../../../../core/tools/toolLoader/ToolsFolderLoader.js';
import { FunctionFileParser } from '../../../../../core/tools/toolLoader/FunctionFileParser.js';
import { ToolParsingError, ParsedFunctionMeta } from '../../../../../core/tools/toolLoader/types.js';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('path');
jest.mock('../../../../../core/tools/toolLoader/FunctionFileParser');

describe('ToolsFolderLoader', () => {
    const mockFs = fs as jest.Mocked<typeof fs>;
    const mockPath = path as jest.Mocked<typeof path>;
    const MockFunctionFileParser = FunctionFileParser as jest.MockedClass<typeof FunctionFileParser>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockFs.existsSync.mockReturnValue(true);
        mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
        mockFs.readdirSync.mockReturnValue(['tool1.ts', 'tool2.ts', 'notATool.js'] as any);
        mockPath.join.mockImplementation((...args) => args.join('/'));
        mockPath.resolve.mockImplementation((...args) => args.join('/'));
        mockPath.basename.mockImplementation((filePath, ext) => {
            const base = filePath.split('/').pop() || '';
            return ext ? base.replace(ext, '') : base;
        });
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

            MockFunctionFileParser.prototype.parseFile
                .mockReturnValueOnce(mockTool1)
                .mockReturnValueOnce(mockTool2);

            const loader = new ToolsFolderLoader('/mock/tools/dir');

            expect(mockFs.existsSync).toHaveBeenCalledWith('/mock/tools/dir');
            expect(mockFs.statSync).toHaveBeenCalledWith('/mock/tools/dir');
            expect(mockFs.readdirSync).toHaveBeenCalledWith('/mock/tools/dir');
            expect(MockFunctionFileParser.prototype.parseFile).toHaveBeenCalledTimes(2);
        });

        it('should throw error if directory does not exist', () => {
            mockFs.existsSync.mockReturnValue(false);

            expect(() => new ToolsFolderLoader('/nonexistent/dir'))
                .toThrow('Tools directory not found');
        });

        it('should throw error if path is not a directory', () => {
            mockFs.statSync.mockReturnValue({ isDirectory: () => false } as any);

            expect(() => new ToolsFolderLoader('/not/a/dir'))
                .toThrow('Path is not a directory');
        });

        it('should handle errors during directory scanning', () => {
            mockFs.readdirSync.mockImplementation(() => {
                throw new Error('Read directory error');
            });

            expect(() => new ToolsFolderLoader('/error/dir'))
                .toThrow('Failed to scan tools directory');
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

            MockFunctionFileParser.prototype.parseFile
                .mockReturnValueOnce(mockTool1)
                .mockReturnValueOnce(mockTool2);

            const loader = new ToolsFolderLoader('/mock/tools/dir');
            const tools = loader.getAvailableTools();

            expect(tools).toEqual(['tool1', 'tool2']);
        });

        it('should return empty array when no tools are available', () => {
            mockFs.readdirSync.mockReturnValue([]);

            const loader = new ToolsFolderLoader('/mock/tools/dir');
            const tools = loader.getAvailableTools();

            expect(tools).toEqual([]);
        });

        it('should handle empty results from readdir', () => {
            // Mock readdirSync to return an empty array
            mockFs.readdirSync.mockReturnValue([]);

            // Create the loader
            const loader = new ToolsFolderLoader('/mock/tools/dir');

            // Verify no files were processed
            expect(MockFunctionFileParser.prototype.parseFile).not.toHaveBeenCalled();
            expect(loader.getAvailableTools()).toEqual([]);
            expect(loader.getAvailableTools().length).toBe(0);
        });

        it('should handle null or undefined from readdir', () => {
            // Mock readdirSync to return null
            mockFs.readdirSync.mockReturnValue(null as any);

            // Create the loader - this should not throw
            const loader = new ToolsFolderLoader('/mock/tools/dir');

            // Verify no files were processed
            expect(MockFunctionFileParser.prototype.parseFile).not.toHaveBeenCalled();
            expect(loader.getAvailableTools()).toEqual([]);

            // Test with undefined as well
            jest.clearAllMocks();
            mockFs.readdirSync.mockReturnValue(undefined as any);

            const loader2 = new ToolsFolderLoader('/mock/tools/dir');
            expect(MockFunctionFileParser.prototype.parseFile).not.toHaveBeenCalled();
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

            MockFunctionFileParser.prototype.parseFile.mockReturnValue(mockTool);

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

            MockFunctionFileParser.prototype.parseFile.mockReturnValue(mockTool);

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

            MockFunctionFileParser.prototype.parseFile.mockReturnValue(mockTool);

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

            MockFunctionFileParser.prototype.parseFile.mockReturnValue(mockTool);

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

            MockFunctionFileParser.prototype.parseFile.mockReturnValue(mockTool);

            const loader = new ToolsFolderLoader('/mock/tools/dir');

            // First call should cache the tool
            await loader.getTool('tool1');

            // Reset mock to verify it's not called again
            jest.clearAllMocks();

            // Second call should use cached version
            await loader.getTool('tool1');

            // parseFile should not be called again
            expect(MockFunctionFileParser.prototype.parseFile).not.toHaveBeenCalled();
        });
    });

    describe('getAllTools', () => {
        it('should return all tool definitions', async () => {
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

            MockFunctionFileParser.prototype.parseFile
                .mockReturnValueOnce(mockTool1)
                .mockReturnValueOnce(mockTool2);

            const loader = new ToolsFolderLoader('/mock/tools/dir');
            const tools = await loader.getAllTools();

            expect(tools).toHaveLength(2);
            expect(tools[0]).toHaveProperty('name', 'tool1');
            expect(tools[1]).toHaveProperty('name', 'tool2');
        });

        it('should return empty array when no tools are available', async () => {
            mockFs.readdirSync.mockReturnValue([]);

            const loader = new ToolsFolderLoader('/mock/tools/dir');
            const tools = await loader.getAllTools();

            expect(tools).toEqual([]);
        });
    });

    describe('filterTypeScriptFiles', () => {
        it('should filter TypeScript files correctly during directory scanning', () => {
            // Create a mix of files with different extensions
            const mockFiles = [
                'tool1.ts',      // TypeScript file - should be processed
                'tool2.js',      // JavaScript file - should be ignored
                'tool3.tsx',     // TypeScript JSX file - should be ignored
                'README.md',     // Markdown file - should be ignored
                '.tool5.ts',     // Hidden TypeScript file - should be processed
                'tool7.d.ts'     // TypeScript declaration file - should be processed
            ];

            mockFs.readdirSync.mockReturnValue(mockFiles as any);

            const mockTool: ParsedFunctionMeta = {
                name: 'tool',
                description: 'Tool description',
                schema: { type: 'object', properties: {} },
                runtimePath: '/mock/tools/dir/tool.ts'
            };

            MockFunctionFileParser.prototype.parseFile.mockReturnValue(mockTool);

            const loader = new ToolsFolderLoader('/mock/tools/dir');

            // Should only process files ending with .ts
            // In this case, tool1.ts, .tool5.ts, and tool7.d.ts
            expect(MockFunctionFileParser.prototype.parseFile).toHaveBeenCalledTimes(3);

            // Verify the correct files were processed
            const parsedFilePaths = MockFunctionFileParser.prototype.parseFile.mock.calls.map(call => call[0]);
            expect(parsedFilePaths).toContain('/mock/tools/dir/tool1.ts');
            expect(parsedFilePaths).toContain('/mock/tools/dir/.tool5.ts');
            expect(parsedFilePaths).toContain('/mock/tools/dir/tool7.d.ts');

            // Verify the other files were not processed
            expect(parsedFilePaths).not.toContain('/mock/tools/dir/tool2.js');
            expect(parsedFilePaths).not.toContain('/mock/tools/dir/tool3.tsx');
            expect(parsedFilePaths).not.toContain('/mock/tools/dir/README.md');
        });
    });
}); 