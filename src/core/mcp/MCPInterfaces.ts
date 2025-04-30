/**
 * Type definitions for MCP server interfaces
 */

/**
 * Options for MCP SDK requests
 */
export type MCPRequestOptions = {
    /** Timeout in milliseconds */
    timeout?: number;
    /** Whether to retry on transient errors. Defaults to true. */
    retry?: boolean;
};

/**
 * Represents a resource in an MCP server
 */
export type Resource = {
    /** URI of the resource */
    uri: string;
    /** MIME type of the resource */
    contentType: string;
    /** Additional metadata about the resource */
    metadata?: Record<string, unknown>;
};

/**
 * Parameters for reading a resource
 */
export type ReadResourceParams = {
    /** URI of the resource to read */
    uri: string;
};

/**
 * Result of reading a resource
 */
export type ReadResourceResult = {
    /** URI of the resource */
    uri: string;
    /** Content of the resource */
    content: string;
    /** MIME type of the resource */
    contentType?: string;
    /** Flag indicating the method is not supported */
    _mcpMethodNotSupported?: boolean;
};

/**
 * Represents a resource template in an MCP server
 */
export type ResourceTemplate = {
    /** Name of the template */
    name: string;
    /** Description of the template */
    description?: string;
    /** Parameters for the template */
    parameters?: Record<string, unknown>;
};

/**
 * Represents a prompt in an MCP server
 */
export type Prompt = {
    /** Name of the prompt */
    name: string;
    /** Description of the prompt */
    description?: string;
    /** Parameters for the prompt */
    parameters?: Record<string, unknown>;
};

/**
 * Parameters for getting a prompt
 */
export type GetPromptParams = {
    /** Name of the prompt to get */
    name: string;
    /** Arguments to pass to the prompt */
    arguments?: Record<string, unknown>;
};

/**
 * Result of getting a prompt
 */
export type GetPromptResult = {
    /** Content of the prompt */
    content: string;
    /** MIME type of the prompt content */
    contentType?: string;
    /** Flag indicating the method is not supported */
    _mcpMethodNotSupported?: boolean;
}; 