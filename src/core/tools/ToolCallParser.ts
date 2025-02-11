import { ParsedToolCall, ToolCallParserOptions, ToolCallParserResult } from './types';

export class ToolCallParser {
    private readonly toolCallPattern: RegExp;

    constructor(options?: ToolCallParserOptions) {
        this.toolCallPattern = options?.toolCallPattern ?? /<tool>([^:]+):([^<]+)<\/tool>/g;
    }

    /**
     * Parses the response content for tool calls
     * @param content - The response content to parse
     * @returns ToolCallParserResult containing parsed tool calls and resubmission flag
     */
    public parse(content: string): ToolCallParserResult {
        const toolCalls: ParsedToolCall[] = [];
        const matches = content.matchAll(this.toolCallPattern);

        for (const match of matches) {
            const [, toolName, parametersStr] = match;

            if (!toolName) {
                continue;
            }

            let parameters: Record<string, unknown> = {};

            try {
                parameters = JSON.parse(parametersStr.trim());
            } catch (error) {
                console.warn(`Failed to parse parameters for tool ${toolName}:`, error);
            }

            toolCalls.push({
                toolName: toolName.trim(),
                parameters,
            });
        }

        return {
            toolCalls,
            requiresResubmission: toolCalls.length > 0,
        };
    }

    /**
     * Checks if the content contains any tool calls
     * @param content - The content to check
     * @returns boolean indicating if tool calls were found
     */
    public hasToolCalls(content: string): boolean {
        return this.toolCallPattern.test(content);
    }
} 