import { ToolController } from '../../../../core/tools/ToolController';
import type { ToolDefinition, ToolsManager } from '../../../../core/types';

describe('ToolController', () => {
    let toolController: ToolController;
    let mockToolsManager: jest.Mocked<ToolsManager>;
    let mockTool: ToolDefinition;

    beforeEach(() => {
        mockTool = {
            name: 'testTool',
            description: 'A test tool',
            parameters: {
                type: 'object',
                properties: {
                    param1: {
                        type: 'string',
                        description: 'Test parameter'
                    }
                },
                required: ['param1']
            },
            callFunction: jest.fn().mockResolvedValue({ result: 'success' }),
            postCallLogic: jest.fn().mockResolvedValue(['Processed result: success'])
        };

        mockToolsManager = {
            getTool: jest.fn().mockReturnValue(mockTool),
            addTool: jest.fn(),
            removeTool: jest.fn(),
            updateTool: jest.fn(),
            listTools: jest.fn()
        };

        toolController = new ToolController(mockToolsManager);
    });

    describe('processToolCalls', () => {
        it('should process valid tool calls', async () => {
            const content = '<tool>testTool:{"param1":"test"}</tool>';
            const result = await toolController.processToolCalls(content);

            expect(mockToolsManager.getTool).toHaveBeenCalledWith('testTool');
            expect(mockTool.callFunction).toHaveBeenCalledWith({ param1: 'test' });
            expect(mockTool.postCallLogic).toHaveBeenCalledWith({ result: 'success' });
            expect(result.messages[0]).toEqual({
                role: 'function',
                content: 'Processed result: success',
                name: 'testTool'
            });
            expect(result.requiresResubmission).toBe(true);
        });

        it('should handle multiple tool calls', async () => {
            const content = `
                <tool>testTool:{"param1":"test1"}</tool>
                <tool>testTool:{"param1":"test2"}</tool>
            `;
            const result = await toolController.processToolCalls(content);

            expect(mockToolsManager.getTool).toHaveBeenCalledTimes(2);
            expect(mockTool.callFunction).toHaveBeenCalledTimes(2);
            expect(result.messages).toHaveLength(2);
            expect(result.toolCalls).toHaveLength(2);
        });

        it('should handle non-existent tools', async () => {
            mockToolsManager.getTool.mockReturnValue(undefined);
            const content = '<tool>nonexistentTool:{"param1":"test"}</tool>';
            const result = await toolController.processToolCalls(content);

            expect(result.messages[0]).toEqual({
                role: 'system',
                content: "Error: Tool 'nonexistentTool' not found"
            });
            expect(result.toolCalls[0].error).toBe("Tool 'nonexistentTool' not found");
        });

        it('should handle tool execution errors', async () => {
            const error = new Error('Test error');
            mockTool.callFunction = jest.fn().mockRejectedValue(error);
            const content = '<tool>testTool:{"param1":"test"}</tool>';
            const result = await toolController.processToolCalls(content);

            expect(result.messages[0]).toEqual({
                role: 'system',
                content: "Error executing tool 'testTool': Test error"
            });
            expect(result.toolCalls[0].error).toBe('Test error');
        });

        it('should handle invalid tool call format', async () => {
            const content = 'Invalid tool call format';
            const result = await toolController.processToolCalls(content);

            expect(result.messages).toHaveLength(0);
            expect(result.toolCalls).toHaveLength(0);
            expect(result.requiresResubmission).toBe(false);
        });

        it('should handle invalid JSON in parameters', async () => {
            const content = '<tool>testTool:invalid_json</tool>';
            const result = await toolController.processToolCalls(content);

            expect(mockTool.callFunction).toHaveBeenCalledWith({});
        });

        it('should enforce iteration limit', async () => {
            const toolController = new ToolController(mockToolsManager, 2);
            const content = '<tool>testTool:{"param1":"test"}</tool>';

            await toolController.processToolCalls(content);
            await toolController.processToolCalls(content);
            await expect(toolController.processToolCalls(content)).rejects.toThrow('Tool call iteration limit (2) exceeded');
        });

        it('should reset iteration count', async () => {
            const toolController = new ToolController(mockToolsManager, 2);
            const content = '<tool>testTool:{"param1":"test"}</tool>';

            await toolController.processToolCalls(content);
            await toolController.processToolCalls(content);
            toolController.resetIterationCount();
            await expect(toolController.processToolCalls(content)).resolves.toBeDefined();
        });

        it('should handle tool without postCallLogic', async () => {
            const toolWithoutPostLogic: ToolDefinition = {
                ...mockTool,
                postCallLogic: undefined
            };
            mockToolsManager.getTool.mockReturnValue(toolWithoutPostLogic);

            const content = '<tool>testTool:{"param1":"test"}</tool>';
            const result = await toolController.processToolCalls(content);

            expect(result.messages[0]).toEqual({
                role: 'function',
                content: JSON.stringify({ result: 'success' }),
                name: 'testTool'
            });
        });

        it('should handle string output without postCallLogic', async () => {
            const toolWithStringOutput: ToolDefinition = {
                ...mockTool,
                callFunction: jest.fn().mockResolvedValue('string result'),
                postCallLogic: undefined
            };
            mockToolsManager.getTool.mockReturnValue(toolWithStringOutput);

            const content = '<tool>testTool:{"param1":"test"}</tool>';
            const result = await toolController.processToolCalls(content);

            expect(result.messages[0]).toEqual({
                role: 'function',
                content: 'string result',
                name: 'testTool'
            });
        });
    });
}); 