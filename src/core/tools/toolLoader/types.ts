import type { ToolDefinition } from '../../../types/tooling';

export type ExtractedJsonSchema = {
    type: 'object';
    properties: Record<string, {
        type: 'string' | 'number' | 'boolean' | 'array' | 'object';
        description: string;
        enum?: string[];
    }>;
    required?: string[];
};

export type ParsedFunctionMeta = {
    name: string;            // file name (pascalCase/whatever)
    description: string;     // extracted from leading comments/JSDoc
    schema: ExtractedJsonSchema;
    runtimePath: string;     // absolute path used for dynamic import
};

export type StringOrDefinition = string | ToolDefinition;

export class ToolParsingError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ToolParsingError';
    }
} 