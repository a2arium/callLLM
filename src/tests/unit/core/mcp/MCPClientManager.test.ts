import { jest } from '@jest/globals';
import { MCPClientManager } from '../../../../core/mcp/MCPClientManager';
import { MCPConnectionError, MCPToolCallError } from '../../../../core/mcp/MCPConfigTypes';
import type { MCPServerConfig } from '../../../../core/mcp/MCPConfigTypes';
import type { Transport } from '../../../../core/mcp/MCPTransportFactory';
import { MCPTransportFactory } from '../../../../core/mcp/MCPTransportFactory';

// Set a longer test timeout for all tests in this file
jest.setTimeout(30000);

// Mock the logger
jest.mock('../../../../utils/logger', () => ({
    logger: {
        createLogger: jest.fn().mockReturnValue({
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        }),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

// Type for mocked logger to use with requireMock
type MockedLogger = {
    logger: {
        createLogger: jest.Mock;
        debug: jest.Mock;
        info: jest.Mock;
        warn: jest.Mock;
        error: jest.Mock;
    }
};

// Mock the transport factory
jest.mock('../../../../core/mcp/MCPTransportFactory');

describe('MCPClientManager', () => {
    // Setup mocks with proper TypeScript typing
    const mockTransport = {
        start: jest.fn().mockImplementation(() => Promise.resolve()),
        send: jest.fn().mockImplementation(() => Promise.resolve()),
        close: jest.fn().mockImplementation(() => Promise.resolve()),
        onmessage: undefined as ((message: any) => void) | undefined,
        onclose: undefined as (() => void) | undefined,
        onerror: undefined as ((error: Error) => void) | undefined
    } as jest.Mocked<Transport>;

    // Mock the factory with proper typing
    (MCPTransportFactory.createTransport as jest.Mock).mockImplementation(() => Promise.resolve(mockTransport));

    let clientManager: MCPClientManager;

    beforeEach(() => {
        jest.clearAllMocks();
        clientManager = new MCPClientManager();
    });

    describe('connect', () => {
        const serverKey = 'test-server';
        const config: MCPServerConfig = { url: 'ws://localhost:1234' };

        it('should connect to the server and perform handshake', async () => {
            // Create handlers to trigger responses immediately
            const handleResponse = (message: any) => {
                if (message.method === 'initialize') {
                    // Respond to initialize message
                    setTimeout(() => {
                        mockTransport.onmessage?.({
                            jsonrpc: '2.0',
                            id: message.id,
                            result: { serverInfo: { name: 'Test Server', version: '1.0.0' } }
                        });
                    }, 0);
                } else if (message.method === 'tools/list') {
                    // Respond to tools/list message
                    setTimeout(() => {
                        mockTransport.onmessage?.({
                            jsonrpc: '2.0',
                            id: message.id,
                            result: { tools: [] }
                        });
                    }, 0);
                }
                return Promise.resolve();
            };

            // Set up mock implementation
            mockTransport.send.mockImplementation(handleResponse);

            await clientManager.connect(serverKey, config);

            expect(MCPTransportFactory.createTransport).toHaveBeenCalledWith(serverKey, config);
            expect(mockTransport.start).toHaveBeenCalled();
            expect(mockTransport.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    method: 'initialize'
                })
            );
        });

        it('should throw MCPConnectionError when connection fails', async () => {
            (MCPTransportFactory.createTransport as jest.Mock).mockImplementationOnce(() =>
                Promise.reject(new Error('Connection failed'))
            );

            await expect(clientManager.connect(serverKey, config)).rejects.toThrow(MCPConnectionError);
        });

        it('should not reconnect if already connected', async () => {
            // Set up mock implementation for this test
            mockTransport.send.mockImplementation((message: any) => {
                if (message.method === 'initialize') {
                    setTimeout(() => {
                        mockTransport.onmessage?.({
                            jsonrpc: '2.0',
                            id: message.id,
                            result: { serverInfo: { name: 'Test Server', version: '1.0.0' } }
                        });
                    }, 0);
                } else if (message.method === 'tools/list') {
                    setTimeout(() => {
                        mockTransport.onmessage?.({
                            jsonrpc: '2.0',
                            id: message.id,
                            result: { tools: [] }
                        });
                    }, 0);
                }
                return Promise.resolve();
            });

            // First connect
            await clientManager.connect(serverKey, config);

            // Reset mocks to check second call
            jest.clearAllMocks();

            // Try to connect again
            await clientManager.connect(serverKey, config);

            // Should not create transport again
            expect(MCPTransportFactory.createTransport).not.toHaveBeenCalled();
        });
    });

    describe('listTools', () => {
        const serverKey = 'test-server';
        const mockTools = [
            {
                name: 'test-tool-1',
                description: 'A test tool',
                parameters: {
                    type: 'object',
                    properties: {
                        param1: { type: 'string' }
                    },
                    required: ['param1']
                }
            }
        ];

        // Set up a connected client for each test
        async function setupConnectedClient() {
            // Mock the transport behavior for connection
            mockTransport.send.mockImplementation((message: any) => {
                if (message.method === 'initialize') {
                    setTimeout(() => {
                        mockTransport.onmessage?.({
                            jsonrpc: '2.0',
                            id: message.id,
                            result: { capabilities: { toolsApi: true } }
                        });
                    }, 0);
                } else if (message.method === 'tools/list') {
                    setTimeout(() => {
                        mockTransport.onmessage?.({
                            jsonrpc: '2.0',
                            id: message.id,
                            result: mockTools
                        });
                    }, 0);
                }
                return Promise.resolve();
            });

            // Connect the client
            await clientManager.connect(serverKey, { url: 'ws://localhost:1234' });
            jest.clearAllMocks();

            // Reset the mock for the next test
            mockTransport.send.mockClear();
        }

        it('should list tools for a server with prefixed names', async () => {
            await setupConnectedClient();

            // Set up a fresh mock for this test
            mockTransport.send.mockImplementation((message: any) => {
                if (message.method === 'tools/list') {
                    setTimeout(() => {
                        mockTransport.onmessage?.({
                            jsonrpc: '2.0',
                            id: message.id,
                            result: mockTools
                        });
                    }, 0);
                }
                return Promise.resolve();
            });

            const tools = await clientManager.listTools(serverKey);

            // The implementation prepends the serverKey to the tool name
            expect(tools).toHaveLength(1);
            expect(tools[0].name).toBe(`${serverKey}_test-tool-1`);
            expect(tools[0].description).toBe('A test tool');
            expect(tools[0].parameters).toEqual({
                type: 'object',
                properties: {
                    param1: { type: 'string' }
                },
                required: ['param1']
            });

            // Since we're using a cached result from setupConnectedClient, we don't want to check send
            // because we already cleared the mock after setupConnectedClient
        });

        it('should throw MCPConnectionError for non-connected server', async () => {
            await expect(clientManager.listTools('non-existent'))
                .rejects
                .toThrow(MCPConnectionError);
        });

        it('should cache tool list and reuse it', async () => {
            await setupConnectedClient();

            // First call should make the request
            mockTransport.send.mockImplementation((message: any) => {
                if (message.method === 'tools/list') {
                    setTimeout(() => {
                        mockTransport.onmessage?.({
                            jsonrpc: '2.0',
                            id: message.id,
                            result: mockTools
                        });
                    }, 0);
                }
                return Promise.resolve();
            });

            const tools1 = await clientManager.listTools(serverKey);

            // Clear mocks to verify second call doesn't make the request
            jest.clearAllMocks();

            // Second call should use cache
            const tools2 = await clientManager.listTools(serverKey);

            expect(tools1).toEqual(tools2);
            expect(mockTransport.send).not.toHaveBeenCalled();
        });

        it('should refresh cache on list_changed notification', async () => {
            await setupConnectedClient();

            // First call to populate cache
            mockTransport.send.mockImplementation((message: any) => {
                if (message.method === 'tools/list') {
                    setTimeout(() => {
                        mockTransport.onmessage?.({
                            jsonrpc: '2.0',
                            id: message.id,
                            result: mockTools
                        });
                    }, 0);
                }
                return Promise.resolve();
            });

            await clientManager.listTools(serverKey);

            // Set up updated tools
            const updatedTools = [
                {
                    name: 'updated-tool',
                    description: 'An updated tool',
                    parameters: {
                        type: 'object',
                        properties: {},
                        required: []
                    }
                }
            ];

            // Clear mocks
            jest.clearAllMocks();

            // Setup mock for updated tool list
            mockTransport.send.mockImplementation((message: any) => {
                if (message.method === 'tools/list') {
                    setTimeout(() => {
                        mockTransport.onmessage?.({
                            jsonrpc: '2.0',
                            id: message.id,
                            result: updatedTools
                        });
                    }, 0);
                }
                return Promise.resolve();
            });

            // Simulate list_changed notification
            mockTransport.onmessage?.({
                jsonrpc: '2.0',
                method: 'notifications/tools/list_changed'
            });

            // Next call should make a new request
            const tools = await clientManager.listTools(serverKey);

            // The implementation prepends the serverKey to the tool name
            expect(tools).toHaveLength(1);
            expect(tools[0].name).toBe(`${serverKey}_updated-tool`);
            expect(mockTransport.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    method: 'tools/list'
                })
            );
        });
    });

    // Example implementation for callTool test group
    describe('callTool', () => {
        const serverKey = 'test-server';
        const toolName = 'test-tool';
        const toolArgs = { param1: 'value1' };

        // Set up a connected client for each test
        async function setupConnectedClient() {
            // Mock the transport behavior for connection
            mockTransport.send.mockImplementation((message: any) => {
                if (message.method === 'initialize') {
                    setTimeout(() => {
                        mockTransport.onmessage?.({
                            jsonrpc: '2.0',
                            id: message.id,
                            result: { capabilities: { toolsApi: true } }
                        });
                    }, 0);
                } else if (message.method === 'tools/list') {
                    setTimeout(() => {
                        mockTransport.onmessage?.({
                            jsonrpc: '2.0',
                            id: message.id,
                            result: []
                        });
                    }, 0);
                }
                return Promise.resolve();
            });

            // Connect the client
            await clientManager.connect(serverKey, { url: 'ws://localhost:1234' });
            jest.clearAllMocks();
        }

        it('should call a tool and return its result', async () => {
            await setupConnectedClient();

            const expectedResult = { success: true, data: 'test result' };

            mockTransport.send.mockImplementation((message: any) => {
                if (message.method === 'tools/call') {
                    setTimeout(() => {
                        mockTransport.onmessage?.({
                            jsonrpc: '2.0',
                            id: message.id,
                            result: expectedResult
                        });
                    }, 0);
                }
                return Promise.resolve();
            });

            const result = await clientManager.callTool(serverKey, toolName, toolArgs, false);

            expect(result).toEqual(expectedResult);
            expect(mockTransport.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    method: 'tools/call',
                    params: {
                        name: toolName,
                        arguments: toolArgs
                    }
                })
            );
        });

        it('should throw MCPToolCallError for non-connected server', async () => {
            await expect(clientManager.callTool('non-existent', toolName, toolArgs, false))
                .rejects
                .toThrow(MCPToolCallError);
        });

        it('should handle errors from tool calls', async () => {
            await setupConnectedClient();

            mockTransport.send.mockImplementation((message: any) => {
                if (message.method === 'tools/call') {
                    setTimeout(() => {
                        mockTransport.onmessage?.({
                            jsonrpc: '2.0',
                            id: message.id,
                            error: {
                                code: -32000,
                                message: 'Tool execution failed'
                            }
                        });
                    }, 0);
                }
                return Promise.resolve();
            });

            await expect(clientManager.callTool(serverKey, toolName, toolArgs, false))
                .rejects
                .toThrow(MCPToolCallError);
        });

        it('should send stream parameter for streaming', async () => {
            await setupConnectedClient();

            let streamParamReceived = false;

            mockTransport.send.mockImplementation((message: any) => {
                if (message.method === 'tools/call') {
                    // Check if stream parameter is set
                    if (message.params && message.params.stream === true) {
                        streamParamReceived = true;
                    }

                    // Use Error.prototype.message instead of fail()
                    throw new Error('Exiting test early');
                }
                return Promise.resolve();
            });

            try {
                await clientManager.callTool(serverKey, toolName, toolArgs, true);
                // Use expect().toFail() instead of fail()
                expect('this line').toBe('never reached');
            } catch (err) {
                expect((err as Error).message).toBe('Exiting test early');
                expect(streamParamReceived).toBe(true);
            }
        });
    });

    // Fix for message handling tests
    describe('message handling', () => {
        const serverKey = 'test-server';

        // Set up a connected client for each test
        async function setupConnectedClient() {
            // Mock the transport behavior for connection
            mockTransport.send.mockImplementation((message: any) => {
                if (message.method === 'initialize') {
                    setTimeout(() => {
                        mockTransport.onmessage?.({
                            jsonrpc: '2.0',
                            id: message.id,
                            result: { capabilities: { toolsApi: true } }
                        });
                    }, 0);
                } else if (message.method === 'tools/list') {
                    setTimeout(() => {
                        mockTransport.onmessage?.({
                            jsonrpc: '2.0',
                            id: message.id,
                            result: []
                        });
                    }, 0);
                }
                return Promise.resolve();
            });

            // Connect the client
            await clientManager.connect(serverKey, { url: 'ws://localhost:1234' });
            jest.clearAllMocks();
        }

        it('should handle notifications/progress messages', async () => {
            await setupConnectedClient();

            mockTransport.onmessage?.({
                jsonrpc: '2.0',
                method: 'notifications/progress',
                params: { progress: 50 }
            });

            // Verify logger was called with proper typing
            const mockedLogger = jest.requireMock('../../../../utils/logger') as MockedLogger;
            expect(mockedLogger.logger.info)
                .toHaveBeenCalledWith(
                    expect.stringContaining('progress:'),
                    expect.objectContaining({ progress: 50 })
                );
        });

        it('should handle notifications/canceled messages', async () => {
            await setupConnectedClient();

            mockTransport.onmessage?.({
                jsonrpc: '2.0',
                method: 'notifications/canceled',
                params: { reason: 'User canceled' }
            });

            // Verify logger was called with proper typing
            const mockedLogger = jest.requireMock('../../../../utils/logger') as MockedLogger;
            expect(mockedLogger.logger.warn)
                .toHaveBeenCalledWith(
                    expect.stringContaining('canceled:'),
                    expect.objectContaining({ reason: 'User canceled' })
                );
        });
    });

    // Other test groups would follow similar patterns
});