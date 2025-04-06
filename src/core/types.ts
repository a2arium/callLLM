import { UniversalMessage, UniversalChatSettings } from '../interfaces/UniversalInterfaces';
import {
    ToolDefinition,
    ToolParameters,
    ToolParameterSchema,
    ToolCall
} from '../types/tooling';
import { RegisteredProviders } from '../adapters';

export {
    UniversalMessage,
    ToolDefinition,
    ToolParameters,
    ToolParameterSchema,
    ToolCall
};

export type ToolChoice =
    | 'none'
    | 'auto'
    | { type: 'function'; function: { name: string } };

export type UniversalChatParams = {
    model: string;
    provider: RegisteredProviders;
    messages: Array<{
        role: string;
        content: string;
    }>;
    temperature?: number;
    maxTokens?: number;
    tools?: ToolDefinition[];
    toolChoice?: ToolChoice;
    responseFormat?: {
        type: 'text' | 'json_object';
        schema?: Record<string, unknown>;
    };
};

export type ToolCallResponse = {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
};

export type ToolsManager = {
    getTool(name: string): ToolDefinition | undefined;
    addTool(tool: ToolDefinition): void;
    addTools(tools: ToolDefinition[]): void;
    removeTool(name: string): void;
    updateTool(name: string, updated: Partial<ToolDefinition>): void;
    listTools(): ToolDefinition[];
};

export type UsageData = {
    provider: RegisteredProviders;
    // ... rest of type definition ...
};
