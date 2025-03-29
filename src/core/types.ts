import { UniversalMessage, UniversalChatSettings } from '../interfaces/UniversalInterfaces';

export { UniversalMessage };

export type SupportedProviders = 'openai' | 'anthropic' | 'google';

export type ToolParameterSchema = {
    type: string;
    description?: string;
    properties?: Record<string, ToolParameterSchema>;
    items?: ToolParameterSchema;
    required?: string[];
    [key: string]: unknown;
};

export type ToolParameters = {
    type: 'object';
    properties: Record<string, ToolParameterSchema>;
    required?: string[];
};

export type ToolDefinition = {
    name: string;
    description: string;
    parameters: ToolParameters;
    callFunction: <TParams extends Record<string, unknown>, TResponse>(params: TParams) => Promise<TResponse>;
    postCallLogic?: <TResponse>(rawResponse: TResponse) => Promise<string[]>;
};

export type ToolsManager = {
    getTool(name: string): ToolDefinition | undefined;
    addTool(tool: ToolDefinition): void;
    removeTool(name: string): void;
    updateTool(name: string, updated: Partial<ToolDefinition>): void;
    listTools(): ToolDefinition[];
};

export type ToolChoice =
    | 'none'
    | 'auto'
    | { type: 'function'; function: { name: string } };

export type UniversalChatParams = {
    model: string;
    provider: SupportedProviders;
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

export type ToolCall = {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
};
