export type ParsedToolCall = {
    toolName: string;
    parameters: Record<string, unknown>;
};

export type ToolCallParserResult = {
    toolCalls: ParsedToolCall[];
    requiresResubmission: boolean;
};

export type ToolCallParserOptions = {
    /**
     * Custom regex pattern for tool call detection.
     * Defaults to <tool>([^:]+):([^<]+)</tool>
     */
    toolCallPattern?: RegExp;
};

/**
 * Base class for all tool-related errors
 */
export class ToolError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ToolError';
    }
}

/**
 * Error thrown when tool execution iteration limit is exceeded
 */
export class ToolIterationLimitError extends ToolError {
    constructor(limit: number) {
        super(`Tool call iteration limit (${limit}) exceeded`);
        this.name = 'ToolIterationLimitError';
    }
}

/**
 * Error thrown when a tool is not found
 */
export class ToolNotFoundError extends ToolError {
    constructor(toolName: string) {
        super(`Tool '${toolName}' not found`);
        this.name = 'ToolNotFoundError';
    }
}

/**
 * Error thrown when tool execution fails
 */
export class ToolExecutionError extends ToolError {
    constructor(toolName: string, cause: unknown) {
        super(`Error executing tool '${toolName}': ${cause instanceof Error ? cause.message : String(cause)}`);
        this.name = 'ToolExecutionError';
    }
} 