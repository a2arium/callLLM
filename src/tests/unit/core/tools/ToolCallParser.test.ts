import { ToolCallParser } from '../../../../core/tools/ToolCallParser';

describe('ToolCallParser', () => {
    let parser: ToolCallParser;

    beforeEach(() => {
        parser = new ToolCallParser();
    });

    describe('parse', () => {
        it('should parse a single tool call correctly', () => {
            const content = 'Some text <tool>testTool:{"param1": "value1", "param2": 42}</tool> more text';
            const result = parser.parse(content);

            expect(result.toolCalls).toHaveLength(1);
            expect(result.requiresResubmission).toBe(true);
            expect(result.toolCalls[0]).toEqual({
                toolName: 'testTool',
                parameters: {
                    param1: 'value1',
                    param2: 42,
                },
            });
        });

        it('should parse multiple tool calls correctly', () => {
            const content = `
        <tool>tool1:{"param": "value1"}</tool>
        Some text in between
        <tool>tool2:{"param": "value2"}</tool>
      `;
            const result = parser.parse(content);

            expect(result.toolCalls).toHaveLength(2);
            expect(result.requiresResubmission).toBe(true);
            expect(result.toolCalls[0]).toEqual({
                toolName: 'tool1',
                parameters: { param: 'value1' },
            });
            expect(result.toolCalls[1]).toEqual({
                toolName: 'tool2',
                parameters: { param: 'value2' },
            });
        });

        it('should handle invalid JSON parameters gracefully', () => {
            const content = '<tool>testTool:invalid json here</tool>';
            const result = parser.parse(content);

            expect(result.toolCalls).toHaveLength(1);
            expect(result.toolCalls[0]).toEqual({
                toolName: 'testTool',
                parameters: {},
            });
        });

        it('should return empty array for no tool calls', () => {
            const content = 'Just some regular text without tool calls';
            const result = parser.parse(content);

            expect(result.toolCalls).toHaveLength(0);
            expect(result.requiresResubmission).toBe(false);
        });

        it('should handle custom tool call pattern', () => {
            const customParser = new ToolCallParser({
                toolCallPattern: /<custom>([^:]+):([^<]+)<\/custom>/g,
            });
            const content = '<custom>testTool:{"param": "value"}</custom>';
            const result = customParser.parse(content);

            expect(result.toolCalls).toHaveLength(1);
            expect(result.toolCalls[0]).toEqual({
                toolName: 'testTool',
                parameters: { param: 'value' },
            });
        });
    });

    describe('hasToolCalls', () => {
        it('should return true when tool calls are present', () => {
            const content = 'Some text <tool>testTool:{"param": "value"}</tool>';
            expect(parser.hasToolCalls(content)).toBe(true);
        });

        it('should return false when no tool calls are present', () => {
            const content = 'Just some regular text';
            expect(parser.hasToolCalls(content)).toBe(false);
        });
    });
}); 