import type { ToolDefinition } from '../../../../types/tooling.js';
import type { MCPServerConfig } from '../../../../core/mcp/MCPConfigTypes.js';
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

// Define minimal transport interface for testing
interface MockTransport {
    start: () => Promise<void>;
    send: (message: any) => Promise<void>;
    close: () => Promise<void>;
    onmessage: ((data: Record<string, unknown>) => void) | null;
    onclose: (() => void) | null;
    onerror: ((error: Error) => void) | null;
}

/**
 * Creates a mock MCP tool definition for testing purposes
 */
export function createMockMCPTool(name = 'testMCPTool'): ToolDefinition {
    return {
        name,
        description: 'Mock MCP tool for testing',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Test query parameter'
                }
            },
            required: ['query']
        },
        origin: 'mcp',
        metadata: {
            originalName: 'test_mcp_function',
            server: 'test-server'
        }
    };
}

/**
 * Creates a mock MCP transport for testing purposes
 */
export function createMockMCPTransport(): {
    transport: Transport;
    mockSend: jest.Mock;
    triggerMessage: (message: Record<string, unknown>) => void;
    triggerClose: () => void;
    triggerError: (error: Error) => void;
} {
    // Use undefined instead of null for callback compatibility
    let onMessageCallback: any = undefined;
    let onCloseCallback: (() => void) | undefined = undefined;
    let onErrorCallback: ((error: Error) => void) | undefined = undefined;

    const mockSend = jest.fn().mockImplementation(() => Promise.resolve());

    const transport: any = {
        start: jest.fn().mockResolvedValue(undefined),
        send: mockSend,
        close: jest.fn().mockResolvedValue(undefined),
        get onmessage() {
            return onMessageCallback;
        },
        set onmessage(callback: any) {
            onMessageCallback = callback;
        },
        get onclose() {
            return onCloseCallback;
        },
        set onclose(callback: (() => void) | undefined) {
            onCloseCallback = callback;
        },
        get onerror() {
            return onErrorCallback;
        },
        set onerror(callback: ((error: Error) => void) | undefined) {
            onErrorCallback = callback;
        }
    };

    return {
        transport: transport as Transport,
        mockSend,
        triggerMessage: (message: Record<string, unknown>) => {
            if (onMessageCallback) onMessageCallback(message);
        },
        triggerClose: () => {
            if (onCloseCallback) onCloseCallback();
        },
        triggerError: (error: Error) => {
            if (onErrorCallback) onErrorCallback(error);
        }
    };
} 