import { ToolsFolderLoader } from '../../../../../core/tools/toolLoader/ToolsFolderLoader';
import { FunctionFileParser } from '../../../../../core/tools/toolLoader/FunctionFileParser';
import { ToolParsingError, ParsedFunctionMeta } from '../../../../../core/tools/toolLoader/types';
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
}); 