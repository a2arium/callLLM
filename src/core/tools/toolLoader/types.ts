import type { ToolDefinition } from '../../../types/tooling';
import type { MCPServersMap } from '../../mcp/MCPConfigTypes';

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

/**
 * Definition of what can be provided in the tools array:
 * - string: Name of a function in the toolsDir
 * - ToolDefinition: Full tool definition object
 * - MCPServersMap: Configuration for MCP servers
 */
export type StringOrDefinition = string | ToolDefinition | MCPServersMap;

export class ToolParsingError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ToolParsingError';
    }
} 