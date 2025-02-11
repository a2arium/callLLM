import { ToolController } from '../../../../core/tools/ToolController';
import { ToolsManager } from '../../../../core/tools/ToolsManager';
import type { ToolDefinition } from '../../../../core/types';

describe('ToolController', () => {
    let toolsManager: ToolsManager;
    let toolController: ToolController;

    beforeEach(() => {
        toolsManager = new ToolsManager();
        toolController = new ToolController(toolsManager);
    });

    describe('processToolCalls', () => {
        it('should execute a single tool call successfully', async () => {
            const mockTool: ToolDefinition = {
                name: 'testTool',
                description: 'Test tool',
                parameters: {
                    type: 'object',
                    properties: {
                        param1: { type: 'string' },
                        param2: { type: 'number' }
                    }
                },
                callFunction: jest.fn().mockResolvedValue('Success result')
            };

            toolsManager.addTool(mockTool);

            const content = '<tool>testTool:{"param1": "value1", "param2": 42}</tool>';
            const result = await toolController.processToolCalls(content);

            expect(result.toolCalls).toHaveLength(1);
            expect(result.messages).toHaveLength(1);
            expect(result.requiresResubmission).toBe(true);
            expect(mockTool.callFunction).toHaveBeenCalledWith({
                param1: 'value1',
                param2: 42
            });
            expect(result.messages[0]).toEqual({
                role: 'function',
                content: 'Success result',
                name: 'testTool'
            });
        });

        it('should handle multiple tool calls', async () => {
            const mockTool1: ToolDefinition = {
                name: 'tool1',
                description: 'Tool 1',
                parameters: { type: 'object', properties: {} },
                callFunction: jest.fn().mockResolvedValue('Result 1')
            };

            const mockTool2: ToolDefinition = {
                name: 'tool2',
                description: 'Tool 2',
                parameters: { type: 'object', properties: {} },
                callFunction: jest.fn().mockResolvedValue('Result 2')
            };

            toolsManager.addTool(mockTool1);
            toolsManager.addTool(mockTool2);

            const content = `
                <tool>tool1:{"param": "value1"}</tool>
                Some text in between
                <tool>tool2:{"param": "value2"}</tool>
            `;

            const result = await toolController.processToolCalls(content);

            expect(result.toolCalls).toHaveLength(2);
            expect(result.messages).toHaveLength(2);
            expect(result.requiresResubmission).toBe(true);
            expect(mockTool1.callFunction).toHaveBeenCalledWith({ param: 'value1' });
            expect(mockTool2.callFunction).toHaveBeenCalledWith({ param: 'value2' });
        });

        it('should handle non-existent tools', async () => {
            const content = '<tool>nonExistentTool:{"param": "value"}</tool>';
            const result = await toolController.processToolCalls(content);

            expect(result.toolCalls).toHaveLength(1);
            expect(result.messages).toHaveLength(1);
            expect(result.requiresResubmission).toBe(true);
            expect(result.messages[0].content).toContain("Tool 'nonExistentTool' not found");
            expect(result.toolCalls[0].error).toBeDefined();
        });

        it('should handle tool execution errors', async () => {
            const mockTool: ToolDefinition = {
                name: 'errorTool',
                description: 'Error tool',
                parameters: { type: 'object', properties: {} },
                callFunction: jest.fn().mockRejectedValue(new Error('Tool execution failed'))
            };

            toolsManager.addTool(mockTool);

            const content = '<tool>errorTool:{"param": "value"}</tool>';
            const result = await toolController.processToolCalls(content);

            expect(result.toolCalls).toHaveLength(1);
            expect(result.messages).toHaveLength(1);
            expect(result.requiresResubmission).toBe(true);
            expect(result.messages[0].content).toContain('Tool execution failed');
            expect(result.toolCalls[0].error).toBeDefined();
        });

        it('should handle tool with postCallLogic', async () => {
            const mockTool: ToolDefinition = {
                name: 'postProcessTool',
                description: 'Post process tool',
                parameters: { type: 'object', properties: {} },
                callFunction: jest.fn().mockResolvedValue({ raw: 'data' }),
                postCallLogic: jest.fn().mockResolvedValue(['Processed message 1', 'Processed message 2'])
            };

            toolsManager.addTool(mockTool);

            const content = '<tool>postProcessTool:{"param": "value"}</tool>';
            const result = await toolController.processToolCalls(content);

            expect(result.messages).toHaveLength(2);
            expect(result.requiresResubmission).toBe(true);
            expect(mockTool.postCallLogic).toHaveBeenCalledWith({ raw: 'data' });
            expect(result.messages[0].content).toBe('Processed message 1');
            expect(result.messages[1].content).toBe('Processed message 2');
        });

        it('should throw error when iteration limit is exceeded', async () => {
            const toolController = new ToolController(toolsManager, 1);
            const content = '<tool>testTool:{"param": "value"}</tool>';

            await toolController.processToolCalls(content);
            await expect(toolController.processToolCalls(content)).rejects.toThrow('Tool call iteration limit');
        });

        it('should handle content without tool calls', async () => {
            const content = 'Just some regular text without tool calls';
            const result = await toolController.processToolCalls(content);

            expect(result.toolCalls).toHaveLength(0);
            expect(result.messages).toHaveLength(0);
            expect(result.requiresResubmission).toBe(false);
        });
    });

    describe('resetIterationCount', () => {
        it('should reset iteration count', async () => {
            const toolController = new ToolController(toolsManager, 2);
            const content = '<tool>testTool:{"param": "value"}</tool>';

            await toolController.processToolCalls(content);
            toolController.resetIterationCount();
            await toolController.processToolCalls(content);

            // Should not throw iteration limit error
            expect(async () => {
                await toolController.processToolCalls(content);
            }).not.toThrow();
        });
    });
}); 