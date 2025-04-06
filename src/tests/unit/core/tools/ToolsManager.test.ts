import { ToolsManager } from '../../../../core/tools/ToolsManager';
import type { ToolDefinition } from '../../../../core/types';

describe('ToolsManager', () => {
    let toolsManager: ToolsManager;
    let mockTool: ToolDefinition;

    beforeEach(() => {
        toolsManager = new ToolsManager();
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
    });

    describe('addTool', () => {
        it('should add a tool successfully', () => {
            toolsManager.addTool(mockTool);
            const retrievedTool = toolsManager.getTool(mockTool.name);
            expect(retrievedTool).toEqual(mockTool);
        });

        it('should throw error when adding tool with duplicate name', () => {
            toolsManager.addTool(mockTool);
            expect(() => toolsManager.addTool(mockTool)).toThrow("Tool with name 'mockTool' already exists");
        });
    });

    describe('getTool', () => {
        it('should return undefined for non-existent tool', () => {
            expect(toolsManager.getTool('nonexistent')).toBeUndefined();
        });

        it('should return the correct tool', () => {
            toolsManager.addTool(mockTool);
            expect(toolsManager.getTool(mockTool.name)).toEqual(mockTool);
        });
    });

    describe('removeTool', () => {
        it('should remove an existing tool', () => {
            toolsManager.addTool(mockTool);
            toolsManager.removeTool(mockTool.name);
            expect(toolsManager.getTool(mockTool.name)).toBeUndefined();
        });

        it('should throw error when removing non-existent tool', () => {
            expect(() => toolsManager.removeTool('nonexistent')).toThrow("Tool with name 'nonexistent' does not exist");
        });
    });

    describe('updateTool', () => {
        it('should update an existing tool', () => {
            toolsManager.addTool(mockTool);
            const update = { description: 'Updated description' };
            toolsManager.updateTool(mockTool.name, update);
            const updatedTool = toolsManager.getTool(mockTool.name);
            expect(updatedTool?.description).toBe('Updated description');
        });

        it('should throw error when updating non-existent tool', () => {
            expect(() => toolsManager.updateTool('nonexistent', {})).toThrow(
                "Tool with name 'nonexistent' does not exist"
            );
        });

        it('should handle tool name updates correctly', () => {
            toolsManager.addTool(mockTool);
            const newName = 'newToolName';
            toolsManager.updateTool(mockTool.name, { name: newName });

            expect(toolsManager.getTool(mockTool.name)).toBeUndefined();
            expect(toolsManager.getTool(newName)).toBeDefined();
        });

        it('should throw error when updating to existing tool name', () => {
            const secondTool: ToolDefinition = {
                ...mockTool,
                name: 'secondTool'
            };

            toolsManager.addTool(mockTool);
            toolsManager.addTool(secondTool);

            expect(() => toolsManager.updateTool('secondTool', { name: mockTool.name })).toThrow(
                `Cannot update tool name to '${mockTool.name}' as it already exists`
            );
        });
    });

    describe('listTools', () => {
        it('should return empty array when no tools exist', () => {
            expect(toolsManager.listTools()).toEqual([]);
        });

        it('should return all tools', () => {
            const secondTool: ToolDefinition = {
                ...mockTool,
                name: 'secondTool'
            };

            toolsManager.addTool(mockTool);
            toolsManager.addTool(secondTool);

            const tools = toolsManager.listTools();
            expect(tools).toHaveLength(2);
            expect(tools).toEqual(expect.arrayContaining([mockTool, secondTool]));
        });
    });

    describe('addTools', () => {
        it('should add multiple tools successfully', () => {
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

            toolsManager.addTools(mockTools);
            expect(toolsManager.getTool('tool1')).toEqual(mockTools[0]);
            expect(toolsManager.getTool('tool2')).toEqual(mockTools[1]);
        });

        it('should throw error when adding tools with duplicate names within array', () => {
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
                    name: 'tool1',
                    description: 'Duplicate tool',
                    parameters: {
                        type: 'object',
                        properties: {}
                    }
                }
            ] as ToolDefinition[];

            expect(() => toolsManager.addTools(mockTools))
                .toThrow('Duplicate tool names found in the tools array');
        });

        it('should throw error when adding tools with existing names', () => {
            toolsManager.addTool(mockTool);
            const mockTools = [
                {
                    name: mockTool.name,
                    description: 'Conflicting tool',
                    parameters: {
                        type: 'object',
                        properties: {}
                    }
                }
            ] as ToolDefinition[];

            expect(() => toolsManager.addTools(mockTools))
                .toThrow(`Tool with name '${mockTool.name}' already exists`);
        });
    });
}); 