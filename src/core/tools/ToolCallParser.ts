import { ParsedToolCall, ToolCallParserOptions, ToolCallParserResult } from '../../types/tooling';

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
        // Ensure content is a string
        if (typeof content !== 'string') {
            try {
                content = JSON.stringify(content);
            } catch (error) {
                console.warn('ToolCallParser: Failed to stringify content', error);
                content = '';
            }
        }

        const toolCalls: ParsedToolCall[] = [];
        let matches: IterableIterator<RegExpMatchArray>;
        if (typeof content.matchAll === 'function') {
            matches = content.matchAll(this.toolCallPattern);
        } else {
            // Fallback using RegExp.exec in a loop for environments without String.prototype.matchAll
            const re = new RegExp(this.toolCallPattern.source, this.toolCallPattern.flags);
            matches = (function* () {
                let match;
                while ((match = re.exec(content)) !== null) {
                    yield match;
                }
            })();
        }

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