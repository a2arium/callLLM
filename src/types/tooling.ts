/*
 Consolidated tooling types for the callllm project.

 This file provides all tool-related type definitions such as:
  - ToolDefinition, ToolCall
  - ParsedToolCall, ToolCallParserOptions, ToolCallParserResult
  - Custom error classes: ToolError, ToolIterationLimitError, ToolNotFoundError, ToolExecutionError

 All types are defined using 'type' where applicable to ensure strict type safety.
*/

export type ToolDefinition = {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: Record<string, unknown>;
        required?: string[];
    };
    callFunction: <TParams extends Record<string, unknown>, TResponse = unknown>(
        params: TParams
    ) => Promise<TResponse>;
    postCallLogic?: (rawResult: unknown) => Promise<string[]>;
};

export type ToolCall = {
    id?: string;  // Optional ID for the tool call
    name: string;
    parameters: Record<string, unknown>;
    result?: string;
    error?: string;
};

export type ParsedToolCall = {
    toolName: string;
    parameters: Record<string, unknown>;
};

export type ToolCallParserOptions = {
    toolCallPattern?: RegExp;
};

export type ToolCallParserResult = {
    toolCalls: ParsedToolCall[];
    requiresResubmission: boolean;
};

export class ToolError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ToolError";
    }
}

export class ToolIterationLimitError extends ToolError {
    constructor(limit: number) {
        super(`Tool iteration limit of ${limit} exceeded`);
        this.name = "ToolIterationLimitError";
    }
}

export class ToolNotFoundError extends ToolError {
    constructor(toolName: string) {
        super(`Tool ${toolName} not found`);
        this.name = "ToolNotFoundError";
    }
}

export class ToolExecutionError extends ToolError {
    constructor(toolName: string, errorMessage: string) {
        super(`Execution of tool ${toolName} failed: ${errorMessage}`);
        this.name = "ToolExecutionError";
    }
} 