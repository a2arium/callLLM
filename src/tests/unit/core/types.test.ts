import type { ToolDefinition, ToolsManager } from '../../../core/types';
import { UniversalChatParams, ToolChoice } from '../../../core/types';

describe('Tool Interfaces', () => {
    describe('ToolDefinition', () => {
        it('should validate a correctly structured tool definition', () => {
            const validTool: ToolDefinition = {
                name: 'testTool',
                description: 'A test tool',
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

            expect(validTool).toBeDefined();
            expect(validTool.name).toBe('testTool');
            expect(validTool.description).toBe('A test tool');
            expect(validTool.parameters.type).toBe('object');
            expect(typeof validTool.callFunction).toBe('function');
        });
    });

    describe('ToolsManager', () => {
        it('should validate a correctly structured tools manager', () => {
            const mockTool: ToolDefinition = {
                name: 'mockTool',
                description: 'A mock tool',
                parameters: {
                    type: 'object',
                    properties: {}
                },
                callFunction: async <T>(params: Record<string, unknown>): Promise<T> => {
                    return {} as T;
                }
            };

            const toolsManager: ToolsManager = {
                getTool: (name: string) => undefined,
                addTool: (tool: ToolDefinition) => { },
                addTools: (tools: ToolDefinition[]) => { },
                removeTool: (name: string) => { },
                updateTool: (name: string, updated: Partial<ToolDefinition>) => { },
                listTools: () => []
            };

            expect(toolsManager).toBeDefined();
            expect(typeof toolsManager.getTool).toBe('function');
            expect(typeof toolsManager.addTool).toBe('function');
            expect(typeof toolsManager.addTools).toBe('function');
            expect(typeof toolsManager.removeTool).toBe('function');
            expect(typeof toolsManager.updateTool).toBe('function');
            expect(typeof toolsManager.listTools).toBe('function');

            // Test method signatures
            expect(() => toolsManager.addTool(mockTool)).not.toThrow();
            expect(() => toolsManager.getTool('test')).not.toThrow();
            expect(() => toolsManager.removeTool('test')).not.toThrow();
            expect(() => toolsManager.updateTool('test', { description: 'updated' })).not.toThrow();
            expect(() => toolsManager.listTools()).not.toThrow();
        });
    });
});

describe('Tool Calling Type Definitions', () => {
    it('should allow creating valid UniversalChatParams with tool calling', () => {
        const mockTool: ToolDefinition = {
            name: 'test_tool',
            description: 'A test tool',
            parameters: {
                type: 'object',
                properties: {
                    test: {
                        type: 'string',
                        description: 'A test parameter'
                    }
                },
                required: ['test']
            },
            callFunction: async <TParams extends Record<string, unknown>, TResponse>(params: TParams): Promise<TResponse> => {
                return { result: 'success' } as TResponse;
            }
        };

        const params: UniversalChatParams = {
            model: 'gpt-4',
            provider: 'openai',
            messages: [
                {
                    role: 'user',
                    content: 'Hello'
                }
            ],
            tools: [mockTool],
            toolChoice: 'auto',
            temperature: 0.7
        };

        expect(params.tools).toHaveLength(1);
        expect(params.tools?.[0].name).toBe('test_tool');
        expect(params.toolChoice).toBe('auto');
    });

    it('should support all valid tool choice options', () => {
        const toolChoices: ToolChoice[] = [
            'none',
            'auto',
            { type: 'function', function: { name: 'test_tool' } }
        ];

        const params: UniversalChatParams = {
            model: 'gpt-4',
            provider: 'openai',
            messages: [{ role: 'user', content: 'test' }]
        };

        // Verify each tool choice option is valid
        toolChoices.forEach(choice => {
            params.toolChoice = choice;
            expect(params.toolChoice).toBe(choice);
        });
    });
}); 