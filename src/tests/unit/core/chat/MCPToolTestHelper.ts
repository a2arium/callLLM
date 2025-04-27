import type { ToolDefinition } from '../../../../types/tooling';
import type { MCPTransportType, MCPServerConfig } from '../../../../core/mcp/MCPConfigTypes';
import { MCPTransportFactory } from '../../../../core/mcp/MCPTransportFactory';

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
    transport: MCPTransportType;
    mockSend: jest.Mock;
    triggerMessage: (message: Record<string, unknown>) => void;
    triggerClose: () => void;
    triggerError: (error: Error) => void;
} {
    let onMessageCallback: ((data: Record<string, unknown>) => void) | null = null;
    let onCloseCallback: (() => void) | null = null;
    let onErrorCallback: ((error: Error) => void) | null = null;

    const mockSend = jest.fn().mockImplementation(() => Promise.resolve());

    const transport: MCPTransportType = {
        start: jest.fn().mockResolvedValue(undefined),
        send: mockSend,
        close: jest.fn().mockResolvedValue(undefined),
        get onmessage() {
            return onMessageCallback;
        },
        set onmessage(callback: ((data: Record<string, unknown>) => void) | null) {
            onMessageCallback = callback;
        },
        get onclose() {
            return onCloseCallback;
        },
        set onclose(callback: (() => void) | null) {
            onCloseCallback = callback;
        },
        get onerror() {
            return onErrorCallback;
        },
        set onerror(callback: ((error: Error) => void) | null) {
            onErrorCallback = callback;
        }
    };

    return {
        transport,
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

/**
 * Patches the MCPTransportFactory to return a mock transport
 */
export function patchMCPTransportFactory(): {
    restore: () => void;
    mockTransport: ReturnType<typeof createMockMCPTransport>;
} {
    const mockTransport = createMockMCPTransport();

    const original = MCPTransportFactory.createTransport;
    MCPTransportFactory.createTransport = jest.fn().mockImplementation(
        (serverKey: string, config: MCPServerConfig) => {
            return Promise.resolve(mockTransport.transport);
        }
    );

    return {
        restore: () => {
            MCPTransportFactory.createTransport = original;
        },
        mockTransport
    };
} 