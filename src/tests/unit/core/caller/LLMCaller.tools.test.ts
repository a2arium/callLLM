import { LLMCaller } from '../../../../core/caller/LLMCaller';
import type { ToolDefinition } from '../../../../types/tooling';
import { ModelManager } from '../../../../core/models/ModelManager';
import { ToolsFolderLoader } from '../../../../core/tools/toolLoader/ToolsFolderLoader';
import path from 'path';
import fs from 'fs';

jest.mock('../../../../core/models/ModelManager');
jest.mock('../../../../core/tools/toolLoader/ToolsFolderLoader');
jest.mock('path');
jest.mock('fs');

describe('LLMCaller Tool Management', () => {
    let llmCaller: LLMCaller;
    let mockTool: ToolDefinition;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup ModelManager mock
        (ModelManager as jest.Mock).mockImplementation(() => ({
            getModel: jest.fn().mockReturnValue({
                name: 'gpt-3.5-turbo',
                inputPricePerMillion: 0.1,
                outputPricePerMillion: 0.2,
                maxRequestTokens: 1000,
                maxResponseTokens: 500,
                tokenizationModel: 'test',
                characteristics: {
                    qualityIndex: 80,
                    outputSpeed: 100,
                    firstTokenLatency: 100
                },
                capabilities: {
                    streaming: true,
                    toolCalls: true,
                    parallelToolCalls: true,
                    batchProcessing: true,
                    input: {
                        text: true
                    },
                    output: {
                        text: {
                            textOutputFormats: ['text', 'json']
                        }
                    }
                }
            }),
            getAvailableModels: jest.fn()
        }));

        llmCaller = new LLMCaller('openai', 'gpt-3.5-turbo');
        mockTool = {
            name: 'mockTool',
            description: 'A mock tool for testing',
            parameters: {
                type: 'object',
                properties: {
                    testParam: {
                        type: 'string',
                        description: 'A test parameter'
                    }
                },
                required: ['testParam']
            },
            callFunction: async <T>(params: Record<string, unknown>): Promise<T> => {
                return {} as T;
            }
        };

        // Mock path.resolve to return the input unchanged for simplicity
        (path.resolve as jest.Mock).mockImplementation((p) => p);

        // Mock fs.existsSync and fs.statSync
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.statSync as jest.Mock).mockReturnValue({
            isDirectory: () => true
        });
    });

    describe('Tool Management', () => {
        it('should add and retrieve a tool successfully', () => {
            llmCaller.addTool(mockTool);
            const retrievedTool = llmCaller.getTool(mockTool.name);
            expect(retrievedTool).toEqual(mockTool);
        });

        it('should throw error when adding duplicate tool', () => {
            llmCaller.addTool(mockTool);
            expect(() => llmCaller.addTool(mockTool)).toThrow("Tool with name 'mockTool' already exists");
        });

        it('should remove a tool successfully', () => {
            llmCaller.addTool(mockTool);
            llmCaller.removeTool(mockTool.name);
            expect(llmCaller.getTool(mockTool.name)).toBeUndefined();
        });

        it('should throw error when removing non-existent tool', () => {
            expect(() => llmCaller.removeTool('nonexistent')).toThrow(
                "Tool with name 'nonexistent' does not exist"
            );
        });

        it('should update a tool successfully', () => {
            llmCaller.addTool(mockTool);
            const update = { description: 'Updated description' };
            llmCaller.updateTool(mockTool.name, update);
            const updatedTool = llmCaller.getTool(mockTool.name);
            expect(updatedTool?.description).toBe('Updated description');
        });

        it('should throw error when updating non-existent tool', () => {
            expect(() => llmCaller.updateTool('nonexistent', {})).toThrow(
                "Tool with name 'nonexistent' does not exist"
            );
        });

        it('should list all tools', () => {
            const secondTool: ToolDefinition = {
                ...mockTool,
                name: 'secondTool'
            };

            llmCaller.addTool(mockTool);
            llmCaller.addTool(secondTool);

            const tools = llmCaller.listTools();
            expect(tools).toHaveLength(2);
            expect(tools).toEqual(expect.arrayContaining([mockTool, secondTool]));
        });

        it('should return empty array when no tools exist', () => {
            expect(llmCaller.listTools()).toEqual([]);
        });

        it('should add multiple tools successfully', async () => {
            const mockTools = [
                {
                    name: 'tool1',
                    description: 'First tool',
                    parameters: {
                        type: 'object',
                        properties: {}
                    }
                },
                {
                    name: 'tool2',
                    description: 'Second tool',
                    parameters: {
                        type: 'object',
                        properties: {}
                    }
                }
            ] as ToolDefinition[];

            await llmCaller.addTools(mockTools);
            expect(llmCaller.getTool('tool1')).toEqual(mockTools[0]);
            expect(llmCaller.getTool('tool2')).toEqual(mockTools[1]);
        });
    });

    describe('ToolsDir Resolution', () => {
        const mockToolsDir = '/mock/tools/dir';
        const mockOverrideToolsDir = '/mock/override/tools/dir';
        const mockToolName = 'mockStringTool';
        let mockGetTool: jest.Mock;

        beforeEach(() => {
            // Create a shared mock for getTool that we can check in tests
            mockGetTool = jest.fn().mockResolvedValue({
                name: mockToolName,
                description: 'A mock tool for testing',
                parameters: {
                    type: 'object',
                    properties: {}
                },
                callFunction: jest.fn()
            });

            // Setup ToolsFolderLoader mock
            (ToolsFolderLoader as jest.Mock).mockImplementation((dirPath) => ({
                getToolsDir: jest.fn().mockReturnValue(dirPath),
                getTool: mockGetTool,
                hasToolFunction: jest.fn().mockReturnValue(true)
            }));
        });

        it('should initialize ToolsFolderLoader when toolsDir is provided in constructor', async () => {
            const toolsDirCaller = new LLMCaller('openai', 'gpt-3.5-turbo', 'You are a helpful assistant', {
                toolsDir: mockToolsDir
            });

            // Call a method that uses toolsDir
            await toolsDirCaller.call('Test message', {
                tools: [mockToolName]
            });

            // Verify ToolsFolderLoader was constructed with the correct directory
            expect(ToolsFolderLoader).toHaveBeenCalledWith(mockToolsDir);
            expect(ToolsFolderLoader).toHaveBeenCalledTimes(1);
        });

        it('should not initialize ToolsFolderLoader when toolsDir is not provided', () => {
            const noToolsDirCaller = new LLMCaller('openai', 'gpt-3.5-turbo');
            expect(ToolsFolderLoader).not.toHaveBeenCalled();
        });

        it('should use constructor toolsDir when none provided in call options', async () => {
            const toolsDirCaller = new LLMCaller('openai', 'gpt-3.5-turbo', 'You are a helpful assistant', {
                toolsDir: mockToolsDir
            });

            // Suppress other API calls
            jest.spyOn(toolsDirCaller as any, 'internalChatCall').mockResolvedValue({});

            // Access to private members for testing
            const resolveToolSpy = jest.spyOn(toolsDirCaller as any, 'resolveToolDefinitions');

            await toolsDirCaller.call('Test message', {
                tools: [mockToolName]
            });

            // Verify resolveToolDefinitions was called with no toolsDir param (undefined)
            expect(resolveToolSpy).toHaveBeenCalledWith([mockToolName], undefined);

            // Verify that getTool was called with the correct tool name
            expect(mockGetTool).toHaveBeenCalledWith(mockToolName);
        });

        it('should use call-level toolsDir when provided, overriding constructor value', async () => {
            const toolsDirCaller = new LLMCaller('openai', 'gpt-3.5-turbo', 'You are a helpful assistant', {
                toolsDir: mockToolsDir
            });

            // Suppress other API calls
            jest.spyOn(toolsDirCaller as any, 'internalChatCall').mockResolvedValue({});

            // Clear constructor calls to verify new instance creation
            (ToolsFolderLoader as jest.Mock).mockClear();

            await toolsDirCaller.call('Test message', {
                tools: [mockToolName],
                toolsDir: mockOverrideToolsDir
            });

            // Verify a new ToolsFolderLoader was created with override path
            expect(ToolsFolderLoader).toHaveBeenCalledWith(mockOverrideToolsDir);
        });

        it('should throw error when tool is used without toolsDir at either level', async () => {
            const noToolsDirCaller = new LLMCaller('openai', 'gpt-3.5-turbo');

            await expect(noToolsDirCaller.call('Test message', {
                tools: [mockToolName]
            })).rejects.toThrow(`Tools specified as strings require a toolsDir to be provided either during LLMCaller initialization or in the call options.`);
        });

        it('should use constructor toolsDir when streaming with string tools', async () => {
            const toolsDirCaller = new LLMCaller('openai', 'gpt-3.5-turbo', 'You are a helpful assistant', {
                toolsDir: mockToolsDir
            });

            // Mock internalStreamCall to prevent actual streaming
            jest.spyOn(toolsDirCaller as any, 'internalStreamCall').mockResolvedValue({
                [Symbol.asyncIterator]: () => ({
                    next: async () => ({ done: true, value: undefined })
                })
            });

            const resolveToolSpy = jest.spyOn(toolsDirCaller as any, 'resolveToolDefinitions');

            const stream = await toolsDirCaller.stream('Test message', {
                tools: [mockToolName]
            });

            // Consume the stream (empty in this mock)
            for await (const _ of stream) { /* consume stream */ }

            // Verify resolveToolDefinitions was called with no toolsDir param (undefined)
            expect(resolveToolSpy).toHaveBeenCalledWith([mockToolName], undefined);

            // Verify that getTool was called with the correct tool name
            expect(mockGetTool).toHaveBeenCalledWith(mockToolName);
        });

        it('should use call-level toolsDir when streaming, overriding constructor value', async () => {
            const toolsDirCaller = new LLMCaller('openai', 'gpt-3.5-turbo', 'You are a helpful assistant', {
                toolsDir: mockToolsDir
            });

            // Mock internalStreamCall to prevent actual streaming
            jest.spyOn(toolsDirCaller as any, 'internalStreamCall').mockResolvedValue({
                [Symbol.asyncIterator]: () => ({
                    next: async () => ({ done: true, value: undefined })
                })
            });

            // Clear constructor calls to verify new instance creation
            (ToolsFolderLoader as jest.Mock).mockClear();

            const stream = await toolsDirCaller.stream('Test message', {
                tools: [mockToolName],
                toolsDir: mockOverrideToolsDir
            });

            // Consume the stream (empty in this mock)
            for await (const _ of stream) { /* consume stream */ }

            // Verify a new ToolsFolderLoader was created with override path
            expect(ToolsFolderLoader).toHaveBeenCalledWith(mockOverrideToolsDir);
        });
    });
}); 