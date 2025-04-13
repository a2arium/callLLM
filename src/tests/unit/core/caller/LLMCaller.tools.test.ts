import { LLMCaller } from '../../../../core/caller/LLMCaller';
import type { ToolDefinition } from '../../../../types/tooling';
import { ModelManager } from '../../../../core/models/ModelManager';

jest.mock('../../../../core/models/ModelManager');

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

            llmCaller.addTools(mockTools);
            expect(llmCaller.getTool('tool1')).toEqual(mockTools[0]);
            expect(llmCaller.getTool('tool2')).toEqual(mockTools[1]);
        });
    });
}); 