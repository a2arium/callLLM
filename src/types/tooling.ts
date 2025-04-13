/*
 TODO: Move from here or move all types here
 Consolidated tooling types for the callllm project.

 This file provides all tool-related type definitions such as:
  - ToolDefinition, ToolCall
  - ParsedToolCall, ToolCallParserOptions, ToolCallParserResult
  - Custom error classes: ToolError, ToolIterationLimitError, ToolNotFoundError, ToolExecutionError

 All types are defined using 'type' where applicable to ensure strict type safety.
*/

// Copied from src/core/types.ts and adapted
export type ToolParameterSchema = {
    type: string; // e.g., 'string', 'number', 'boolean', 'object', 'array'
    description?: string;
    enum?: string[]; // For string types
    properties?: Record<string, ToolParameterSchema>; // For object type
    items?: ToolParameterSchema; // For array type
    required?: string[]; // For object type
    // Allow other JSON Schema properties
    [key: string]: unknown;
};

// Copied from src/core/types.ts
export type ToolParameters = {
    type: 'object'; // Tools always expect an object wrapper
    properties: Record<string, ToolParameterSchema>;
    required?: string[];
    additionalProperties?: boolean;  // Whether to allow additional properties not defined in the schema
};

// Updated ToolDefinition using ToolParameters
export type ToolDefinition = {
    name: string;
    description: string;
    parameters: ToolParameters; // Use the stricter, object-based parameters type
    callFunction?: <TParams extends Record<string, unknown>, TResponse = unknown>(
        params: TParams
    ) => Promise<TResponse>; // Keep generic default
    handler?: (args: any) => Promise<any>; // Added for backward compatibility with older code
    postCallLogic?: (rawResult: unknown) => Promise<string[]>; // Use unknown for flexibility
};

export type ToolCall = {
    id?: string; // ID provided by the model (e.g., OpenAI)
    name: string;
    arguments: Record<string, unknown>; // Parsed arguments object
    result?: string; // Stringified result after execution
    error?: string; // Error message if execution failed
    executionReady?: boolean; // Flag indicating this tool call is ready for execution
};


export type ToolsManager = {
    getTool(name: string): ToolDefinition | undefined;
    addTool(tool: ToolDefinition): void;
    addTools(tools: ToolDefinition[]): void;
    removeTool(name: string): void;
    updateTool(name: string, updated: Partial<ToolDefinition>): void;
    listTools(): ToolDefinition[];
};

export type ToolChoice =
    | 'none'
    | 'auto'
    | { type: 'function'; function: { name: string } };


export type ToolCallResponse = {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
};


// TODO: we shouldn't have it in types folder
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
        super(`Tool \"${toolName}\" not found`);
        this.name = "ToolNotFoundError";
    }
}

export class ToolExecutionError extends ToolError {
    constructor(toolName: string, errorMessage: string) {
        super(`Execution of tool \"${toolName}\" failed: ${errorMessage}`);
        this.name = "ToolExecutionError";
    }
} 