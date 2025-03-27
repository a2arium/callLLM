import { ToolController } from '../../../../core/tools/ToolController';
import { ToolIterationLimitError, ToolNotFoundError, ToolExecutionError } from '../../../../types/tooling';
import { ToolsManager } from '../../../../core/tools/ToolsManager';

// Define a FakeToolsManager that extends the real ToolsManager
class FakeToolsManager extends ToolsManager {
    constructor() {
        super();
        this.getTool = jest.fn();
        this.addTool = jest.fn();
        this.removeTool = jest.fn();
        this.updateTool = jest.fn();
        this.listTools = jest.fn();
    }
}

const createFakeToolsManager = (): ToolsManager => new FakeToolsManager();

describe('ToolController', () => {
    const dummyContent = 'dummyContent';

    test('should throw ToolIterationLimitError when iteration limit is exceeded', async () => {
        const fakeToolsManager = createFakeToolsManager();
        const controller = new ToolController(fakeToolsManager, 1); // maxIterations = 1
        // First call: iterationCount becomes 1
        await controller.processToolCalls(dummyContent, { content: '', role: 'assistant' });
        // Second call should exceed the limit and throw
        await expect(controller.processToolCalls(dummyContent, { content: '', role: 'assistant' })).rejects.toThrow(ToolIterationLimitError);
    });

    test('should handle direct tool calls with missing tool', async () => {
        const fakeToolsManager = createFakeToolsManager();
        // getTool returns undefined for any tool
        (fakeToolsManager.getTool as jest.Mock).mockReturnValue(undefined);
        const controller = new ToolController(fakeToolsManager);
        const response = {
            content: '',
            role: 'assistant',
            toolCalls: [
                { name: 'nonExistentTool', arguments: { param: 'value' } }
            ]
        };
        const result = await controller.processToolCalls('', response);
        expect(result.messages[0]).toMatchObject({ role: 'system', content: expect.stringContaining('nonExistentTool') });
        expect(result.toolCalls[0]).toMatchObject({ toolName: 'nonExistentTool', error: expect.stringContaining('not found') });
        expect(result.requiresResubmission).toBe(true);
    });

    test('should process direct tool call without postCallLogic', async () => {
        const fakeToolsManager = createFakeToolsManager();
        const dummyTool = {
            callFunction: jest.fn().mockResolvedValue({ result: 'resultValue' })
            // no postCallLogic provided
        };
        (fakeToolsManager.getTool as jest.Mock).mockImplementation((name: string) => {
            return name === 'dummyTool' ? dummyTool : undefined;
        });
        const controller = new ToolController(fakeToolsManager);
        const response = {
            content: '',
            role: 'assistant',
            toolCalls: [
                { name: 'dummyTool', arguments: { key: 'value' } }
            ]
        };
        const result = await controller.processToolCalls('', response);
        expect(dummyTool.callFunction).toHaveBeenCalledWith({ key: 'value' });
        // If result is not a string, JSON.stringify will be used
        expect(result.messages[0]).toMatchObject({ role: 'function', content: JSON.stringify({ result: 'resultValue' }), name: 'dummyTool' });
        expect(result.toolCalls[0]).toMatchObject({ toolName: 'dummyTool', result: JSON.stringify({ result: 'resultValue' }) });
    });

    test('should process direct tool call with postCallLogic', async () => {
        const fakeToolsManager = createFakeToolsManager();
        const dummyTool = {
            callFunction: jest.fn().mockResolvedValue('rawResult'),
            postCallLogic: jest.fn().mockResolvedValue(['processedMessage'])
        };
        (fakeToolsManager.getTool as jest.Mock).mockImplementation((name: string) => {
            return name === 'dummyTool' ? dummyTool : undefined;
        });
        const controller = new ToolController(fakeToolsManager);
        const response = {
            content: '',
            role: 'assistant',
            toolCalls: [
                { name: 'dummyTool', arguments: { key: 'value' } }
            ]
        };
        const result = await controller.processToolCalls('', response);
        expect(dummyTool.callFunction).toHaveBeenCalledWith({ key: 'value' });
        expect(dummyTool.postCallLogic).toHaveBeenCalledWith('rawResult');
        expect(result.messages[0]).toMatchObject({ role: 'function', content: 'processedMessage', name: 'dummyTool' });
        // Even with postCallLogic, the original result is used for toolCalls
        expect(result.toolCalls[0]).toMatchObject({ toolName: 'dummyTool', result: 'rawResult' });
    });

    test('should handle error thrown by tool call', async () => {
        const fakeToolsManager = createFakeToolsManager();
        const dummyError = new Error('call failed');
        const dummyTool = {
            callFunction: jest.fn().mockRejectedValue(dummyError)
        };
        (fakeToolsManager.getTool as jest.Mock).mockImplementation((name: string) => {
            return name === 'failingTool' ? dummyTool : undefined;
        });
        const controller = new ToolController(fakeToolsManager);
        const response = {
            content: '',
            role: 'assistant',
            toolCalls: [
                { name: 'failingTool', arguments: {} }
            ]
        };
        const result = await controller.processToolCalls('', response);
        expect(result.messages[0]).toMatchObject({ role: 'system', content: expect.stringContaining('failingTool') });
        expect(result.toolCalls[0]).toMatchObject({ toolName: 'failingTool', error: expect.stringContaining('call failed') });
    });

    test('should not fall back to parsing content when response is missing toolCalls', async () => {
        const fakeToolsManager = createFakeToolsManager();
        const dummyTool = {
            callFunction: jest.fn().mockResolvedValue('parsedResult')
        };
        (fakeToolsManager.getTool as jest.Mock).mockImplementation((name: string) => {
            return name === 'parseTool' ? dummyTool : undefined;
        });
        const controller = new ToolController(fakeToolsManager);

        // Create a mock toolCallParser property manually since it doesn't actually exist in the ToolController
        // We're only doing this for test purposes
        (controller as any).toolCallParser = {
            parse: jest.fn().mockReturnValue({
                toolCalls: [{ toolName: 'parseTool', arguments: { a: 1 } }],
                requiresResubmission: false
            }),
            hasToolCalls: jest.fn().mockReturnValue(false)
        };
        const parseSpy = jest.spyOn((controller as any).toolCallParser, 'parse');

        const result = await controller.processToolCalls('some content');
        expect(parseSpy).not.toHaveBeenCalled();
        expect(dummyTool.callFunction).not.toHaveBeenCalled();
        expect(result.toolCalls).toEqual([]);
        expect(result.requiresResubmission).toBe(false);
        parseSpy.mockRestore();
    });

    test('resetIterationCount should reset the iteration count', async () => {
        const fakeToolsManager = createFakeToolsManager();
        const controller = new ToolController(fakeToolsManager, 2);
        // First call to increment iterationCount
        await controller.processToolCalls('content', { content: '', role: 'assistant' });
        // Reset iteration count
        controller.resetIterationCount();
        // After reset, should be able to call without reaching limit
        await expect(controller.processToolCalls('content', { content: '', role: 'assistant' })).resolves.toBeDefined();
    });
}); 