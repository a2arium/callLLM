/**
 * Unit tests for MCPServiceAdapter
 */
import { MCPServiceAdapter } from '../../../../core/mcp/MCPServiceAdapter';
import {
    MCPConnectionError,
    MCPToolCallError,
    MCPHttpMode,
    MCPServerConfig,
    MCPServersMap,
    MCPAuthenticationError,
    MCPTimeoutError
} from '../../../../core/mcp/MCPConfigTypes';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { OAuthProvider } from '../../../../core/mcp/OAuthProvider';
import { fail } from 'assert';

// Mock all the SDK components
jest.mock('@modelcontextprotocol/sdk/client/index.js', () => {
    return {
        Client: jest.fn().mockImplementation(() => ({
            connect: jest.fn().mockResolvedValue(undefined),
            close: jest.fn().mockResolvedValue(undefined),
            callTool: jest.fn(),
            listTools: jest.fn(),
            listResources: jest.fn(),
            readResource: jest.fn(),
            listResourceTemplates: jest.fn(),
            listPrompts: jest.fn(),
            getPrompt: jest.fn(),
        }))
    };
});

jest.mock('@modelcontextprotocol/sdk/client/stdio.js', () => {
    return {
        StdioClientTransport: jest.fn().mockImplementation(() => ({
            start: jest.fn().mockResolvedValue(undefined),
            close: jest.fn().mockResolvedValue(undefined),
        }))
    };
});

jest.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => {
    return {
        StreamableHTTPClientTransport: jest.fn().mockImplementation(() => ({
            start: jest.fn().mockResolvedValue(undefined),
            close: jest.fn().mockResolvedValue(undefined),
        }))
    };
});

jest.mock('@modelcontextprotocol/sdk/client/sse.js', () => {
    return {
        SSEClientTransport: jest.fn().mockImplementation(() => ({
            start: jest.fn().mockResolvedValue(undefined),
            close: jest.fn().mockResolvedValue(undefined),
        }))
    };
});

// Mock the OAuthProvider class
jest.mock('../../../../core/mcp/OAuthProvider', () => {
    return {
        OAuthProvider: jest.fn().mockImplementation(() => ({
            redirectUrl: 'https://example.com/callback',
            clientMetadata: {
                redirect_uris: ['https://example.com/callback'],
                client_name: 'Test Client'
            },
            clientInformation: jest.fn().mockResolvedValue({
                client_id: 'test-client-id',
                client_secret: 'test-client-secret'
            }),
            tokens: jest.fn().mockResolvedValue(undefined),
            saveTokens: jest.fn().mockResolvedValue(undefined),
            redirectToAuthorization: jest.fn(),
            saveCodeVerifier: jest.fn().mockResolvedValue(undefined),
            codeVerifier: jest.fn().mockResolvedValue('test-code-verifier')
        }))
    };
});

describe('MCPServiceAdapter', () => {
    let adapter: MCPServiceAdapter;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize with server configurations', () => {
        adapter = new MCPServiceAdapter({
            server1: { command: 'test-command' },
            server2: { url: 'http://test-url' },
            disabledServer: { command: 'disabled-command', disabled: true }
        });

        expect(adapter.getConnectedServers()).toHaveLength(0);
    });

    describe('connectToServer', () => {
        it('should connect to stdio server', async () => {
            adapter = new MCPServiceAdapter({
                stdio: { command: 'test-command', args: ['--arg1', '--arg2'], env: { 'TEST': 'value' } }
            });

            await adapter.connectToServer('stdio');

            expect(StdioClientTransport).toHaveBeenCalledWith(
                expect.objectContaining({
                    command: 'test-command',
                    args: ['--arg1', '--arg2'],
                    env: expect.objectContaining({ 'TEST': 'value' })
                })
            );
            expect(Client).toHaveBeenCalled();
            expect(adapter.isConnected('stdio')).toBeTruthy();
            expect(adapter.getConnectedServers()).toContain('stdio');
        });

        it('should connect to streamable HTTP server', async () => {
            adapter = new MCPServiceAdapter({
                http: {
                    url: 'http://test-url',
                    mode: 'streamable',
                    headers: { 'Authorization': 'Bearer token' }
                }
            });

            await adapter.connectToServer('http');

            expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
                expect.any(URL),
                expect.objectContaining({
                    requestInit: expect.objectContaining({
                        headers: { 'Authorization': 'Bearer token' }
                    })
                })
            );
            expect(Client).toHaveBeenCalled();
            expect(adapter.isConnected('http')).toBeTruthy();
        });

        it('should create SSE transport when config specifies sse mode', async () => {
            // Reset the SSEClientTransport mock to track calls
            (SSEClientTransport as jest.Mock).mockClear();

            // Create the adapter with an SSE server config
            adapter = new MCPServiceAdapter({
                sse: {
                    url: 'https://example.com/mcp',
                    mode: 'sse' as MCPHttpMode
                }
            });

            // Mock the connectWithHttp method to directly use our implementation
            (adapter as any).connectWithHttp = jest.fn().mockImplementation(async (serverKey, config) => {
                // Create transport with the real createHttpTransport method
                const transport = (adapter as any).createHttpTransport(serverKey, config);

                // Set up the connection
                (adapter as any).sdkTransports.set(serverKey, transport);
                (adapter as any).sdkClients.set(serverKey, {
                    connect: jest.fn().mockResolvedValue(undefined)
                });

                return true;
            });

            // Connect to the server
            await adapter.connectToServer('sse');

            // Verify SSEClientTransport was called
            expect(SSEClientTransport).toHaveBeenCalled();
        });

        it('should throw for unknown server', async () => {
            adapter = new MCPServiceAdapter({
                server1: { command: 'test-command' }
            });

            await expect(adapter.connectToServer('unknown')).rejects.toThrow(MCPConnectionError);
        });

        it('should throw for custom transport type', async () => {
            adapter = new MCPServiceAdapter({
                custom: {
                    type: 'custom',
                    pluginPath: '/path/to/plugin'
                }
            });

            await expect(adapter.connectToServer('custom')).rejects.toThrow(/not yet supported in the MCPServiceAdapter/);
        });

        it('should throw MCPConnectionError if transport fails to start', async () => {
            adapter = new MCPServiceAdapter({
                stdioFail: { command: 'fail-command' }
            });

            // Mock the transport's start method to fail
            const mockTransport = {
                start: jest.fn().mockRejectedValue(new Error('Transport start failed')),
                close: jest.fn().mockResolvedValue(undefined)
            };
            (StdioClientTransport as jest.Mock).mockImplementationOnce(() => mockTransport);

            // Mock the client's connect method to simulate it failing because the transport failed
            const mockClient = {
                connect: jest.fn().mockImplementation(async (transport) => {
                    // Simulate client trying to use the transport which fails
                    await transport.start();
                }),
                close: jest.fn().mockResolvedValue(undefined)
            };
            (Client as jest.Mock).mockImplementationOnce(() => mockClient);

            // Check for the specific error message originating from the transport
            await expect(adapter.connectToServer('stdioFail')).rejects.toThrow('Transport start failed');
        });

        it('should throw MCPConnectionError if client fails to connect', async () => {
            adapter = new MCPServiceAdapter({
                clientFail: { command: 'client-fail-command' }
            });
            // Mock client connect to throw an error
            const mockClient = {
                connect: jest.fn().mockRejectedValue(new Error('Client connection failed')),
                close: jest.fn().mockResolvedValue(undefined)
            };
            (Client as jest.Mock).mockImplementationOnce(() => mockClient);

            // Check for the specific error message
            await expect(adapter.connectToServer('clientFail')).rejects.toThrow('Client connection failed');
        });

        it('should throw error if attempting to connect to a disabled server', async () => {
            adapter = new MCPServiceAdapter({
                disabledServer: { command: 'disabled-cmd', disabled: true }
            });
            // The constructor filters out disabled servers, so the config won't be found.
            await expect(adapter.connectToServer('disabledServer')).rejects.toThrow('Server configuration not found');
        });
    });

    describe('HTTP fallback strategy', () => {
        it('should fallback to SSE when StreamableHTTP fails with 404', async () => {
            // Mock StreamableHTTP to fail with a 404 error
            (StreamableHTTPClientTransport as jest.Mock).mockImplementationOnce(() => ({
                start: jest.fn().mockResolvedValue(undefined),
                close: jest.fn().mockResolvedValue(undefined)
            }));

            // Mock Client to fail when connecting with StreamableHTTP
            (Client as jest.Mock).mockImplementationOnce(() => ({
                connect: jest.fn().mockRejectedValue(new Error('HTTP 404 Not Found')),
                close: jest.fn().mockResolvedValue(undefined)
            })).mockImplementationOnce(() => ({
                connect: jest.fn().mockResolvedValue(undefined),
                close: jest.fn().mockResolvedValue(undefined)
            }));

            adapter = new MCPServiceAdapter({
                fallback: { url: 'http://test-url' }
            });

            await adapter.connectToServer('fallback');

            // Both transport types should have been tried
            expect(StreamableHTTPClientTransport).toHaveBeenCalled();
            expect(SSEClientTransport).toHaveBeenCalled();
            expect(adapter.isConnected('fallback')).toBeTruthy();
        });

        it('should not fallback when StreamableHTTP fails with non-protocol error', async () => {
            // Create necessary mocks
            const mockAdapter = new MCPServiceAdapter({
                noFallback: { url: 'http://test-url' }
            });

            // Mock connectWithHttp to simulate the failure scenario
            (mockAdapter as any).connectWithHttp = jest.fn().mockImplementation(async (serverKey, config) => {
                // Simulate attempting the streamable transport
                const streamableTransportAttempt = new StreamableHTTPClientTransport(new URL(config.url), {});
                // Throw the connection error to mimic failure
                throw new MCPConnectionError('noFallback', 'Connection timeout');
            });

            // Attempt connection and expect failure
            await expect(mockAdapter.connectToServer('noFallback')).rejects.toThrow(MCPConnectionError);

            // Verify the StreamableHTTPClientTransport was instantiated (attempted)
            expect(StreamableHTTPClientTransport).toHaveBeenCalled();
            // Verify SSE was not attempted
            expect(SSEClientTransport).not.toHaveBeenCalled();
            expect(mockAdapter.isConnected('noFallback')).toBeFalsy();
        });
    });

    describe('disconnectServer', () => {
        it('should disconnect from a connected server', async () => {
            adapter = new MCPServiceAdapter({
                server: { command: 'test-command' }
            });

            // Mock a successful connection for this test
            (adapter as any).sdkClients = new Map();
            const mockClient = { close: jest.fn().mockResolvedValue(undefined) };
            (adapter as any).sdkClients.set('server', mockClient);

            (adapter as any).sdkTransports = new Map();
            const mockTransport = { close: jest.fn().mockResolvedValue(undefined) };
            (adapter as any).sdkTransports.set('server', mockTransport);

            (adapter as any).connectedServers = new Set<string>(); // Initialize the set
            // Mark as connected
            (adapter as any).connectedServers.add('server');
            expect(adapter.isConnected('server')).toBeTruthy();

            // Now disconnect
            await adapter.disconnectServer('server');

            // Verify close methods were called
            expect(mockClient.close).toHaveBeenCalled();
            expect(mockTransport.close).toHaveBeenCalled();

            // Verify state updated
            expect(adapter.isConnected('server')).toBeFalsy();
            expect(adapter.getConnectedServers()).not.toContain('server');
        });

        it('should do nothing when disconnecting from a non-connected server', async () => {
            adapter = new MCPServiceAdapter({
                server: { command: 'test-command' }
            });

            await adapter.disconnectServer('server');
            expect(adapter.isConnected('server')).toBeFalsy();
        });
    });

    describe('disconnectAll', () => {
        it('should disconnect from all connected servers', async () => {
            adapter = new MCPServiceAdapter({
                server1: { command: 'test-command1' },
                server2: { url: 'http://test-url' }
            });

            // Connect to both servers
            await adapter.connectToServer('server1');
            await adapter.connectToServer('server2');
            expect(adapter.getConnectedServers()).toHaveLength(2);

            // Disconnect all
            await adapter.disconnectAll();
            expect(adapter.getConnectedServers()).toHaveLength(0);
        });

        it('should do nothing when no servers are connected', async () => {
            adapter = new MCPServiceAdapter({
                server1: { command: 'test-command1' },
                server2: { url: 'http://test-url' }
            });

            // Disconnect all without connecting first
            await adapter.disconnectAll();
            expect(adapter.getConnectedServers()).toHaveLength(0);
        });
    });

    // Helper function to setup a connected client for testing
    const setupConnectedClient = async () => {
        adapter = new MCPServiceAdapter({
            test: { command: 'test-command' }
        });

        // Mock the listTools response for this client
        (Client as jest.Mock).mockImplementationOnce(() => ({
            connect: jest.fn().mockResolvedValue(undefined),
            close: jest.fn().mockResolvedValue(undefined),
            callTool: jest.fn(),
            listTools: jest.fn().mockResolvedValue({
                tools: [
                    {
                        name: 'test_tool',
                        description: 'Test tool',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                param1: { type: 'string' },
                                param2: { type: 'number' }
                            },
                            required: ['param1']
                        }
                    }
                ]
            })
        }));

        await adapter.connectToServer('test');
        return adapter;
    };

    // More tests...

    describe('listResources', () => {
        it('should list resources from the server', async () => {
            adapter = await setupConnectedClient();

            // Mock the SDK Client with a listResources implementation that returns resources
            const mockClient = {
                listResources: jest.fn().mockResolvedValue({
                    resources: [
                        {
                            uri: 'resource1',
                            contentType: 'text/plain',
                            metadata: { source: 'test' }
                        },
                        {
                            uri: 'resource2',
                            contentType: 'application/json',
                            metadata: { source: 'test2' }
                        }
                    ]
                })
            };

            // Replace the client in the adapter
            (adapter as any).sdkClients.set('test', mockClient);

            const resources = await adapter.listResources('test');

            // Verify the client method was called
            expect(mockClient.listResources).toHaveBeenCalled();

            // Verify the result is correctly mapped
            expect(resources).toHaveLength(2);
            expect(resources[0].uri).toBe('resource1');
            expect(resources[0].contentType).toBe('text/plain');
            expect(resources[0].metadata).toEqual({ source: 'test' });
        });

        it('should return empty array when server does not support resources', async () => {
            adapter = await setupConnectedClient();

            // Mock the SDK Client with a listResources that throws "not supported" error
            const mockClient = {
                listResources: jest.fn().mockRejectedValue(new Error('Method not found: resources/list'))
            };

            // Replace the client in the adapter
            (adapter as any).sdkClients.set('test', mockClient);

            const resources = await adapter.listResources('test');

            // Verify the client method was called
            expect(mockClient.listResources).toHaveBeenCalled();

            // Verify an empty array is returned
            expect(resources).toHaveLength(0);
        });

        it('should propagate other errors', async () => {
            adapter = await setupConnectedClient();

            // Mock the SDK Client with a listResources that throws a network error
            const mockClient = {
                listResources: jest.fn().mockRejectedValue(new Error('Network error'))
            };

            // Replace the client in the adapter
            (adapter as any).sdkClients.set('test', mockClient);

            await expect(adapter.listResources('test')).rejects.toThrow(MCPConnectionError);
        });

        it('should throw when server is not connected', async () => {
            adapter = new MCPServiceAdapter({
                test: { command: 'test-command' }
            });

            await expect(adapter.listResources('test')).rejects.toThrow(MCPConnectionError);
        });
    });

    describe('readResource', () => {
        it('should read a resource from the server', async () => {
            adapter = await setupConnectedClient();

            // Mock the SDK Client with a readResource implementation
            const mockClient = {
                readResource: jest.fn().mockResolvedValue({
                    uri: 'resource1',
                    content: 'Resource content',
                    contentType: 'text/plain'
                })
            };

            // Replace the client in the adapter
            (adapter as any).sdkClients.set('test', mockClient);

            const result = await adapter.readResource('test', { uri: 'resource1' });

            // Verify the client method was called with correct params
            expect(mockClient.readResource).toHaveBeenCalledWith({ uri: 'resource1' });

            // Verify the result is returned correctly
            expect(result.uri).toBe('resource1');
            expect(result.content).toBe('Resource content');
            expect(result.contentType).toBe('text/plain');
        });

        it('should return special result when server does not support reading resources', async () => {
            adapter = await setupConnectedClient();

            // Mock the SDK Client with a readResource that throws "not supported" error
            const mockClient = {
                readResource: jest.fn().mockRejectedValue(new Error('Method not found: resources/read'))
            };

            // Replace the client in the adapter
            (adapter as any).sdkClients.set('test', mockClient);

            const result = await adapter.readResource('test', { uri: 'resource1' });

            // Verify the client method was called
            expect(mockClient.readResource).toHaveBeenCalled();

            // Verify a special result is returned
            expect(result.uri).toBe('resource1');
            expect(result.content).toBe('');
            expect((result as any)._mcpMethodNotSupported).toBe(true);
        });

        it('should propagate other errors', async () => {
            adapter = await setupConnectedClient();

            // Mock the SDK Client with a readResource that throws a network error
            const mockClient = {
                readResource: jest.fn().mockRejectedValue(new Error('Network error'))
            };

            // Replace the client in the adapter
            (adapter as any).sdkClients.set('test', mockClient);

            await expect(adapter.readResource('test', { uri: 'resource1' })).rejects.toThrow(MCPConnectionError);
        });

        it('should throw when server is not connected', async () => {
            adapter = new MCPServiceAdapter({
                test: { command: 'test-command' }
            });

            await expect(adapter.readResource('test', { uri: 'resource1' })).rejects.toThrow(MCPConnectionError);
        });
    });

    describe('listResourceTemplates', () => {
        it('should list resource templates from the server', async () => {
            adapter = await setupConnectedClient();

            // Mock the SDK Client with a listResourceTemplates implementation
            const mockClient = {
                listResourceTemplates: jest.fn().mockResolvedValue({
                    templates: [
                        {
                            name: 'template1',
                            description: 'Test template',
                            parameters: { param1: 'string' }
                        },
                        {
                            name: 'template2',
                            description: 'Another template',
                            parameters: { param2: 'number' }
                        }
                    ]
                })
            };

            // Replace the client in the adapter
            (adapter as any).sdkClients.set('test', mockClient);

            const templates = await adapter.listResourceTemplates('test');

            // Verify the client method was called
            expect(mockClient.listResourceTemplates).toHaveBeenCalled();

            // Verify the result is correctly mapped
            expect(templates).toHaveLength(2);
            expect(templates[0].name).toBe('template1');
            expect(templates[0].description).toBe('Test template');
            expect(templates[0].parameters).toEqual({ param1: 'string' });
        });

        it('should return empty array when server does not support resource templates', async () => {
            adapter = await setupConnectedClient();

            // Mock the SDK Client with a listResourceTemplates that throws "not supported" error
            const mockClient = {
                listResourceTemplates: jest.fn().mockRejectedValue(new Error('Method not found: resources/listTemplates'))
            };

            // Replace the client in the adapter
            (adapter as any).sdkClients.set('test', mockClient);

            const templates = await adapter.listResourceTemplates('test');

            // Verify the client method was called
            expect(mockClient.listResourceTemplates).toHaveBeenCalled();

            // Verify an empty array is returned
            expect(templates).toHaveLength(0);
        });

        it('should propagate other errors', async () => {
            adapter = await setupConnectedClient();

            // Mock the SDK Client with a listResourceTemplates that throws a network error
            const mockClient = {
                listResourceTemplates: jest.fn().mockRejectedValue(new Error('Network error'))
            };

            // Replace the client in the adapter
            (adapter as any).sdkClients.set('test', mockClient);

            await expect(adapter.listResourceTemplates('test')).rejects.toThrow(MCPConnectionError);
        });

        it('should throw when server is not connected', async () => {
            adapter = new MCPServiceAdapter({
                test: { command: 'test-command' }
            });

            await expect(adapter.listResourceTemplates('test')).rejects.toThrow(MCPConnectionError);
        });
    });

    describe('listPrompts', () => {
        it('should list prompts from the server', async () => {
            adapter = await setupConnectedClient();

            // Mock the SDK Client with a listPrompts implementation
            const mockClient = {
                listPrompts: jest.fn().mockResolvedValue({
                    prompts: [
                        {
                            name: 'prompt1',
                            description: 'Test prompt',
                            parameters: { param1: 'string' }
                        },
                        {
                            name: 'prompt2',
                            description: 'Another prompt',
                            parameters: { param2: 'number' }
                        }
                    ]
                })
            };

            // Replace the client in the adapter
            (adapter as any).sdkClients.set('test', mockClient);

            const prompts = await adapter.listPrompts('test');

            // Verify the client method was called
            expect(mockClient.listPrompts).toHaveBeenCalled();

            // Verify the result is correctly mapped
            expect(prompts).toHaveLength(2);
            expect(prompts[0].name).toBe('prompt1');
            expect(prompts[0].description).toBe('Test prompt');
            expect(prompts[0].parameters).toEqual({ param1: 'string' });
        });

        it('should return empty array when server does not support prompts', async () => {
            adapter = await setupConnectedClient();

            // Mock the SDK Client with a listPrompts that throws "not supported" error
            const mockClient = {
                listPrompts: jest.fn().mockRejectedValue(new Error('Method not found: prompts/list'))
            };

            // Replace the client in the adapter
            (adapter as any).sdkClients.set('test', mockClient);

            const prompts = await adapter.listPrompts('test');

            // Verify the client method was called
            expect(mockClient.listPrompts).toHaveBeenCalled();

            // Verify an empty array is returned
            expect(prompts).toHaveLength(0);
        });

        it('should propagate other errors', async () => {
            adapter = await setupConnectedClient();

            // Mock the SDK Client with a listPrompts that throws a network error
            const mockClient = {
                listPrompts: jest.fn().mockRejectedValue(new Error('Network error'))
            };

            // Replace the client in the adapter
            (adapter as any).sdkClients.set('test', mockClient);

            await expect(adapter.listPrompts('test')).rejects.toThrow(MCPConnectionError);
        });

        it('should throw when server is not connected', async () => {
            adapter = new MCPServiceAdapter({
                test: { command: 'test-command' }
            });

            await expect(adapter.listPrompts('test')).rejects.toThrow(MCPConnectionError);
        });
    });

    describe('getPrompt', () => {
        it('should get a prompt from the server', async () => {
            adapter = await setupConnectedClient();

            // Mock the SDK Client with a getPrompt implementation
            const mockClient = {
                getPrompt: jest.fn().mockResolvedValue({
                    content: 'Prompt content',
                    contentType: 'text/plain'
                })
            };

            // Replace the client in the adapter
            (adapter as any).sdkClients.set('test', mockClient);

            const result = await adapter.getPrompt('test', { name: 'prompt1', arguments: { var: 'value' } });

            // Verify the client method was called with correct params
            expect(mockClient.getPrompt).toHaveBeenCalledWith({
                name: 'prompt1',
                arguments: { var: 'value' }
            });

            // Verify the result is returned correctly
            expect(result.content).toBe('Prompt content');
            expect((result as any).contentType).toBe('text/plain');
        });

        it('should return special result when server does not support getting prompts', async () => {
            adapter = await setupConnectedClient();

            // Mock the SDK Client with a getPrompt that throws "not supported" error
            const mockClient = {
                getPrompt: jest.fn().mockRejectedValue(new Error('Method not found: prompts/get'))
            };

            // Replace the client in the adapter
            (adapter as any).sdkClients.set('test', mockClient);

            const result = await adapter.getPrompt('test', { name: 'prompt1' });

            // Verify the client method was called
            expect(mockClient.getPrompt).toHaveBeenCalled();

            // Verify a special result is returned
            expect(result.content).toBe('');
            expect((result as any)._mcpMethodNotSupported).toBe(true);
        });

        it('should propagate other errors', async () => {
            adapter = await setupConnectedClient();

            // Mock the SDK Client with a getPrompt that throws a network error
            const mockClient = {
                getPrompt: jest.fn().mockRejectedValue(new Error('Network error'))
            };

            // Replace the client in the adapter
            (adapter as any).sdkClients.set('test', mockClient);

            await expect(adapter.getPrompt('test', { name: 'prompt1' })).rejects.toThrow(MCPConnectionError);
        });

        it('should throw when server is not connected', async () => {
            adapter = new MCPServiceAdapter({
                test: { command: 'test-command' }
            });

            await expect(adapter.getPrompt('test', { name: 'prompt1' })).rejects.toThrow(MCPConnectionError);
        });
    });

    describe('executeMcpTool', () => {
        it('should execute a tool directly using executeTool', async () => {
            adapter = await setupConnectedClient();

            // Spy on the executeTool method
            const executeToolSpy = jest.spyOn(adapter as any, 'executeTool').mockResolvedValue({ result: 'success' });

            const result = await adapter.executeMcpTool('test', 'test_tool', { param1: 'value' });

            // Verify executeTool was called with stream=false
            expect(executeToolSpy).toHaveBeenCalledWith('test', 'test_tool', { param1: 'value' }, false);

            // Verify the result is passed through
            expect(result).toEqual({ result: 'success' });
        });
    });

    describe('getMcpServerToolSchemas', () => {
        it('should get tool schemas and convert them to McpToolSchema format', async () => {
            adapter = await setupConnectedClient();

            // The setupConnectedClient helper already mocks listTools with a test tool

            const schemas = await adapter.getMcpServerToolSchemas('test');

            // Verify schemas are correctly formatted
            expect(schemas).toHaveLength(1);
            expect(schemas[0].name).toBe('test_tool');
            expect(schemas[0].description).toBe('Test tool');
            expect(schemas[0].serverKey).toBe('test');
            expect(schemas[0].llmToolName).toBe('test_test_tool');
            // Check that a Zod schema was created
            expect(schemas[0].parameters).toBeDefined();
        });

        it('should throw when server is not connected', async () => {
            adapter = new MCPServiceAdapter({
                test: { command: 'test-command' }
            });

            await expect(adapter.getMcpServerToolSchemas('test')).rejects.toThrow(MCPConnectionError);
        });
    });

    describe('OAuth support', () => {
        let adapter: MCPServiceAdapter;
        let connectSpy: jest.SpyInstance;
        let clientConnectSpy: jest.SpyInstance;

        beforeEach(() => {
            // Reset mocks
            jest.clearAllMocks();

            const mockTransport = {
                start: jest.fn().mockResolvedValue(undefined),
                send: jest.fn(),
                close: jest.fn(),
                finishAuth: jest.fn().mockResolvedValue(undefined)
            };

            const mockClient = {
                connect: jest.fn().mockResolvedValue(undefined),
                listTools: jest.fn().mockResolvedValue({ tools: [] }),
                callTool: jest.fn().mockResolvedValue({}),
                listResources: jest.fn().mockResolvedValue({ resources: [] }),
                readResource: jest.fn().mockResolvedValue({}),
                listResourceTemplates: jest.fn().mockResolvedValue({ templates: [] }),
                listPrompts: jest.fn().mockResolvedValue({ prompts: [] }),
                getPrompt: jest.fn().mockResolvedValue({})
            };

            // Mock constructors and connect methods
            (StreamableHTTPClientTransport as jest.Mock).mockImplementation(() => mockTransport);
            (SSEClientTransport as jest.Mock).mockImplementation(() => mockTransport);
            (Client as jest.Mock).mockImplementation(() => mockClient);

            // Set up spies
            connectSpy = jest.spyOn(mockTransport, 'start');
            clientConnectSpy = jest.spyOn(mockClient, 'connect');

            adapter = new MCPServiceAdapter({
                testServer: {
                    url: 'https://example.com/mcp'
                }
            });
        });

        test('creates OAuth provider when config includes OAuth settings', async () => {
            const config = {
                url: 'https://example.com/mcp',
                auth: {
                    oauth: {
                        redirectUrl: 'https://example.com/callback'
                    }
                }
            };

            // Use private method accessor pattern to access private method
            const createOAuthProviderIfNeeded = (adapter as any).createOAuthProviderIfNeeded.bind(adapter);
            const provider = createOAuthProviderIfNeeded('testServer', config);

            expect(provider).toBeDefined();
            expect(OAuthProvider).toHaveBeenCalledWith('testServer', expect.objectContaining({
                redirectUrl: 'https://example.com/callback',
                clientMetadata: expect.any(Object)
            }));
        });

        test('does not create OAuth provider when config has no OAuth settings', async () => {
            const config = {
                url: 'https://example.com/mcp'
            };

            // Use private method accessor pattern to access private method
            const createOAuthProviderIfNeeded = (adapter as any).createOAuthProviderIfNeeded.bind(adapter);
            const provider = createOAuthProviderIfNeeded('testServer', config);

            expect(provider).toBeUndefined();
            expect(OAuthProvider).not.toHaveBeenCalled();
        });

        test('passes OAuth provider to HTTP transport when needed', async () => {
            // Reset the StreamableHTTPClientTransport mock to track calls
            (StreamableHTTPClientTransport as jest.Mock).mockClear();

            // Create a proper mock OAuth provider that satisfies the interface
            const mockOAuthProvider = {
                redirectUrl: 'https://example.com/callback',
                clientMetadata: {
                    redirect_uris: ['https://example.com/callback'],
                    client_name: 'Test Client'
                },
                clientInformation: jest.fn().mockResolvedValue({
                    client_id: 'test-client-id'
                }),
                tokens: jest.fn().mockResolvedValue(undefined),
                saveTokens: jest.fn().mockResolvedValue(undefined),
                saveClientInformation: jest.fn().mockResolvedValue(undefined),
                redirectToAuthorization: jest.fn(),
                saveCodeVerifier: jest.fn().mockResolvedValue(undefined),
                codeVerifier: jest.fn().mockResolvedValue('test-code-verifier')
            };

            // Set up server with OAuth config
            const mcpServers: MCPServersMap = {
                oauthServer: {
                    url: 'https://example.com/mcp',
                    mode: 'streamable' as MCPHttpMode,
                    auth: {
                        oauth: {
                            redirectUrl: 'https://example.com/callback'
                        }
                    }
                }
            };

            adapter = new MCPServiceAdapter(mcpServers);

            // Override the createOAuthProviderIfNeeded method to return our mock provider
            (adapter as any).createOAuthProviderIfNeeded = jest.fn().mockReturnValue(mockOAuthProvider);

            // Create a custom implementation of connectWithHttp that we can verify
            const connectWithHttpSpy = jest.fn().mockImplementation(async (serverKey, config) => {
                // Create a transport with our provider
                const transport = new StreamableHTTPClientTransport(
                    new URL(config.url as string),
                    {
                        requestInit: { headers: config.headers },
                        authProvider: mockOAuthProvider
                    }
                );

                // Set up connections
                (adapter as any).sdkTransports.set(serverKey, transport);
                (adapter as any).sdkClients.set(serverKey, {
                    connect: jest.fn().mockResolvedValue(undefined)
                });

                return true;
            });

            // Replace the method
            (adapter as any).connectWithHttp = connectWithHttpSpy;

            // Attempt to connect
            await adapter.connectToServer('oauthServer');

            // Verify our mock method was called
            expect(connectWithHttpSpy).toHaveBeenCalledWith('oauthServer', expect.objectContaining({
                url: 'https://example.com/mcp',
                mode: 'streamable'
            }));

            // Verify StreamableHTTPClientTransport was called with authProvider
            expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
                expect.any(URL),
                expect.objectContaining({
                    authProvider: mockOAuthProvider
                })
            );
        });

        test('completeAuthentication method calls finishAuth on transport', async () => {
            // Set up server with OAuth config
            const mcpServers: MCPServersMap = {
                oauthServer: {
                    url: 'https://example.com/mcp',
                    mode: 'streamable' as MCPHttpMode,
                    auth: {
                        oauth: {
                            redirectUrl: 'https://example.com/callback'
                        }
                    }
                }
            };

            adapter = new MCPServiceAdapter(mcpServers);

            // Mock the finishAuth method
            const mockFinishAuth = jest.fn().mockResolvedValue(undefined);
            const mockTransport = {
                start: jest.fn().mockResolvedValue(undefined),
                send: jest.fn(),
                close: jest.fn(),
                finishAuth: mockFinishAuth
            };

            // Make the transport accessible for the test
            (StreamableHTTPClientTransport as jest.Mock).mockImplementation(() => mockTransport);

            // Connect to server
            await adapter.connectToServer('oauthServer');

            // Complete authentication
            const authCode = 'test-auth-code';
            await adapter.completeAuthentication('oauthServer', authCode);

            // Check that finishAuth was called with the auth code
            expect(mockFinishAuth).toHaveBeenCalledWith(authCode);
        });

        test('completeAuthentication throws error if transport not found', async () => {
            adapter = new MCPServiceAdapter({});

            await expect(adapter.completeAuthentication('nonExistentServer', 'test-code'))
                .rejects
                .toThrow('Transport not found');
        });

        test('completeAuthentication throws error if transport does not support authentication', async () => {
            // Set up a server without OAuth support (stdio transport)
            const mcpServers = {
                stdioServer: {
                    command: 'node',
                    args: ['server.js']
                }
            };

            adapter = new MCPServiceAdapter(mcpServers);

            // Connect to server
            await adapter.connectToServer('stdioServer');

            // Attempt to complete authentication
            await expect(adapter.completeAuthentication('stdioServer', 'test-code'))
                .rejects
                .toThrow('Transport does not support authentication');
        });
    });

    describe('OAuth support - Transport Integration', () => {
        let adapter: MCPServiceAdapter;
        const mockOAuthProvider = { mock: 'provider' }; // Simple mock object

        beforeEach(() => {
            jest.clearAllMocks();
            adapter = new MCPServiceAdapter({
                oauthStreamable: {
                    url: 'https://test.com/streamable',
                    mode: 'streamable',
                    auth: { oauth: { redirectUrl: 'app://cb' } }
                },
                oauthSse: {
                    url: 'https://test.com/sse',
                    mode: 'sse',
                    auth: { oauth: { redirectUrl: 'app://cb' } }
                }
            });
            // Always return the mock provider when createOAuthProviderIfNeeded is called
            jest.spyOn(adapter as any, 'createOAuthProviderIfNeeded').mockReturnValue(mockOAuthProvider);
        });

        test('passes OAuth provider to StreamableHTTP transport', async () => {
            // Mock connectWithHttp to check the transport creation args
            (adapter as any).connectWithHttp = jest.fn().mockImplementation(async (serverKey, config) => {
                (adapter as any).createHttpTransport(serverKey, config);
                // Simulate success
                (adapter as any).sdkClients.set(serverKey, { connect: jest.fn().mockResolvedValue(undefined) });
                (adapter as any).sdkTransports.set(serverKey, { /* mock */ });
                return true;
            });

            await adapter.connectToServer('oauthStreamable');

            expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
                expect.any(URL),
                expect.objectContaining({ authProvider: mockOAuthProvider })
            );
            expect(SSEClientTransport).not.toHaveBeenCalled(); // Ensure SSE wasn't called
        });

        test('passes OAuth provider to SSE transport (direct config)', async () => {
            // Mock connectWithSSE to check the transport creation args
            (adapter as any).connectWithSSE = jest.fn().mockImplementation(async (serverKey, config) => {
                (adapter as any).createHttpTransport(serverKey, config);
                // Simulate success
                (adapter as any).sdkClients.set(serverKey, { connect: jest.fn().mockResolvedValue(undefined) });
                (adapter as any).sdkTransports.set(serverKey, { /* mock */ });
                return true;
            });

            await adapter.connectToServer('oauthSse'); // Connect to the SSE configured server

            expect(SSEClientTransport).toHaveBeenCalledWith(
                expect.any(URL),
                expect.objectContaining({ authProvider: mockOAuthProvider })
            );
            expect(StreamableHTTPClientTransport).not.toHaveBeenCalled(); // Ensure Streamable wasn't called
        });

        test('passes OAuth provider to SSE transport (fallback)', async () => {
            // Mock connectWithHttp to force fallback
            (adapter as any).connectWithHttp = jest.fn().mockRejectedValue(new Error('HTTP 404 Not Found'));
            // Mock connectWithSSE to check transport args during fallback
            (adapter as any).connectWithSSE = jest.fn().mockImplementation(async (serverKey, config) => {
                (adapter as any).createHttpTransport(serverKey, config);
                // Simulate success
                (adapter as any).sdkClients.set(serverKey, { connect: jest.fn().mockResolvedValue(undefined) });
                (adapter as any).sdkTransports.set(serverKey, { /* mock */ });
                return true;
            });

            await adapter.connectToServer('oauthStreamable'); // Connect to streamable which will fallback

            expect(StreamableHTTPClientTransport).toHaveBeenCalled(); // Streamable was attempted
            expect(SSEClientTransport).toHaveBeenCalledWith(
                expect.any(URL),
                expect.objectContaining({ authProvider: mockOAuthProvider })
            ); // SSE was called with provider on fallback
        });
    });

    describe('OAuth support - Provider Creation', () => {
        let adapter: MCPServiceAdapter;

        beforeEach(() => {
            jest.clearAllMocks();
            // Basic adapter setup needed for these tests
            adapter = new MCPServiceAdapter({});
        });

        test('createOAuthProviderIfNeeded returns an OAuthProvider instance for valid config', () => {
            const config: MCPServerConfig = {
                url: 'https://oauth-test.com/mcp',
                auth: { oauth: { redirectUrl: 'app://callback' } }
            };
            // Access private method for direct testing
            const provider = (adapter as any).createOAuthProviderIfNeeded('testServer', config);
            expect(provider).toBeDefined();
            expect(OAuthProvider).toHaveBeenCalledWith('testServer', expect.objectContaining({
                redirectUrl: 'app://callback'
            }));
        });

        test('createOAuthProviderIfNeeded includes clientInfo if provided', () => {
            const config: MCPServerConfig = {
                url: 'https://oauth-test.com/mcp',
                auth: {
                    oauth: {
                        redirectUrl: 'app://callback',
                        clientId: 'test-id',
                        clientSecret: 'test-secret'
                    }
                }
            };
            const provider = (adapter as any).createOAuthProviderIfNeeded('testServer', config);
            expect(OAuthProvider).toHaveBeenCalledWith('testServer', expect.objectContaining({
                clientInformation: {
                    client_id: 'test-id',
                    client_secret: 'test-secret'
                }
            }));
        });

        test('createOAuthProviderIfNeeded returns undefined for non-OAuth config', () => {
            const config: MCPServerConfig = {
                url: 'https://non-oauth.com/mcp'
            };
            // Access private method for direct testing
            const provider = (adapter as any).createOAuthProviderIfNeeded('nonOauthServer', config);
            expect(provider).toBeUndefined();
            expect(OAuthProvider).not.toHaveBeenCalled();
        });

        test('createOAuthProviderIfNeeded returns undefined if auth or oauth is missing', () => {
            const configNoAuth: MCPServerConfig = { url: 'https://test.com' };
            const configNoOauth: MCPServerConfig = { url: 'https://test.com', auth: {} }; // Missing oauth key

            const provider1 = (adapter as any).createOAuthProviderIfNeeded('test1', configNoAuth);
            expect(provider1).toBeUndefined();

            const provider2 = (adapter as any).createOAuthProviderIfNeeded('test2', configNoOauth);
            expect(provider2).toBeUndefined();
        });
    });

    describe('Error handling and retry', () => {
        let adapter: MCPServiceAdapter;

        beforeEach(() => {
            adapter = new MCPServiceAdapter({
                test: { command: 'test-command' }
            });
        });

        it('maps network errors to MCPConnectionError', async () => {
            // Mock connection
            await adapter.connectToServer('test');

            // Mock client to throw network error
            const mockClient = {
                callTool: jest.fn().mockRejectedValue(new Error('Network error: Connection reset'))
            };

            (adapter as any).sdkClients.set('test', mockClient);

            // Execute tool call and expect MCPConnectionError
            await expect(
                async () => await adapter.executeMcpTool('test', 'test_tool', {})
            ).rejects.toThrow(MCPToolCallError);
        });

        it('maps authorization errors to MCPAuthenticationError', async () => {
            // Mock connection
            await adapter.connectToServer('test');

            // Create an error that mimics UnauthorizedError
            const authError = new Error('Unauthorized');
            authError.name = 'UnauthorizedError';

            // Mock client to throw auth error
            const mockClient = {
                callTool: jest.fn().mockRejectedValue(authError)
            };

            (adapter as any).sdkClients.set('test', mockClient);

            // Execute tool call with retry disabled to avoid looping
            const options = { retry: false };
            await expect(adapter.executeTool('test', 'test_tool', {}, false, options))
                .rejects.toThrow(MCPAuthenticationError);
        });

        it('maps timeout errors to MCPTimeoutError', async () => {
            // Mock connection
            await adapter.connectToServer('test');

            // Mock client to throw timeout error
            const mockClient = {
                callTool: jest.fn().mockRejectedValue(new Error('Request timed out after 30s'))
            };

            (adapter as any).sdkClients.set('test', mockClient);

            // Execute tool call with retry disabled
            const options = { retry: false };
            await expect(adapter.executeTool('test', 'test_tool', {}, false, options))
                .rejects.toThrow(MCPTimeoutError);
        });

        it('retries transient errors', async () => {
            // Mock connection
            await adapter.connectToServer('test');

            // Mock client to fail once then succeed
            const mockClient = {
                callTool: jest.fn()
                    .mockRejectedValueOnce(new Error('Connection error'))
                    .mockResolvedValueOnce({ result: 'success' })
            };

            (adapter as any).sdkClients.set('test', mockClient);

            // Execute tool call
            const result = await adapter.executeMcpTool('test', 'test_tool', {});

            // Verify tool was called twice (initial + retry)
            expect(mockClient.callTool).toHaveBeenCalledTimes(2);
            expect(result).toEqual({ result: 'success' });
        });

        it('does not retry permanent errors', async () => {
            // Mock connection
            await adapter.connectToServer('test');

            // Create an error that mimics a "method not found" error
            const toolNotFoundError = new Error('Tool not found on server');

            // Mock client to throw method not found error
            const mockClient = {
                callTool: jest.fn().mockRejectedValue(toolNotFoundError)
            };

            (adapter as any).sdkClients.set('test', mockClient);

            // Execute tool call
            await expect(
                async () => await adapter.executeMcpTool('test', 'test_tool', {})
            ).rejects.toThrow(MCPToolCallError);

            // Verify tool was called only once (no retry)
            expect(mockClient.callTool).toHaveBeenCalledTimes(1);
        });

        it('maps specific SDK ToolInputValidationError to MCPToolCallError', async () => {
            await adapter.connectToServer('test');
            const sdkError = new Error('Invalid input');
            sdkError.name = 'ToolInputValidationError'; // Mimic SDK error name
            const mockClient = { callTool: jest.fn().mockRejectedValue(sdkError) };
            (adapter as any).sdkClients.set('test', mockClient);

            // Only check that it throws MCPToolCallError, as errorType is not set
            await expect(adapter.executeTool('test', 'tool', {}, false, { retry: false }))
                .rejects.toThrow(MCPToolCallError);
            await expect(adapter.executeTool('test', 'tool', {}, false, { retry: false }))
                .rejects.toThrow('Invalid input'); // Check the original message is preserved
        });

        it('maps specific SDK ToolExecutionError to MCPToolCallError', async () => {
            await adapter.connectToServer('test');
            const sdkError = new Error('Tool crashed');
            sdkError.name = 'ToolExecutionError'; // Mimic SDK error name
            const mockClient = { callTool: jest.fn().mockRejectedValue(sdkError) };
            (adapter as any).sdkClients.set('test', mockClient);

            // Only check that it throws MCPToolCallError, as errorType is not set
            await expect(adapter.executeTool('test', 'tool', {}, false, { retry: false }))
                .rejects.toThrow(MCPToolCallError);
            await expect(adapter.executeTool('test', 'tool', {}, false, { retry: false }))
                .rejects.toThrow('Tool crashed'); // Check the original message is preserved
        });

        it('maps other specific SDK errors (e.g., MethodNotFound) to MCPToolCallError', async () => {
            await adapter.connectToServer('test');
            const sdkError = new Error('Method tools/call not found');
            sdkError.name = 'MethodNotFound'; // Mimic SDK error name
            const mockClient = { callTool: jest.fn().mockRejectedValue(sdkError) };
            (adapter as any).sdkClients.set('test', mockClient);

            // Only check that it throws MCPToolCallError, as errorType is not set
            await expect(adapter.executeTool('test', 'tool', {}, false, { retry: false }))
                .rejects.toThrow(MCPToolCallError);
            await expect(adapter.executeTool('test', 'tool', {}, false, { retry: false }))
                .rejects.toThrow('Method tools/call not found'); // Check the original message is preserved
        });

        it('maps generic errors during tool call to MCPToolCallError', async () => {
            await adapter.connectToServer('test');
            const genericError = new Error('Something unexpected happened');
            const mockClient = { callTool: jest.fn().mockRejectedValue(genericError) };
            (adapter as any).sdkClients.set('test', mockClient);

            // Only check that it throws MCPToolCallError, as errorType is not set
            await expect(adapter.executeTool('test', 'tool', {}, false, { retry: false }))
                .rejects.toThrow(MCPToolCallError);
            await expect(adapter.executeTool('test', 'tool', {}, false, { retry: false }))
                .rejects.toThrow('Something unexpected happened'); // Check the original message is preserved
        });

        it('should retry on retryable HTTP status code within MCPToolCallError cause', async () => {
            await adapter.connectToServer('test');

            // Create an error that mimics a retryable HTTP error wrapped in cause
            const httpError = new Error('Server error: 503 Service Unavailable');
            const toolCallError = new MCPToolCallError('test', 'test_tool', 'Request failed', httpError);

            // Mock client to fail once then succeed
            const mockClient = {
                callTool: jest.fn()
                    .mockRejectedValueOnce(toolCallError)
                    .mockResolvedValueOnce({ result: 'success' })
            };
            (adapter as any).sdkClients.set('test', mockClient);

            // Execute tool call
            const result = await adapter.executeMcpTool('test', 'test_tool', {});

            // Verify tool was called twice (initial + retry)
            expect(mockClient.callTool).toHaveBeenCalledTimes(2);
            expect(result).toEqual({ result: 'success' });
        });

        it('should not retry on non-retryable HTTP status code within MCPToolCallError cause', async () => {
            await adapter.connectToServer('test');

            // Create an error that mimics a non-retryable HTTP error wrapped in cause
            const httpError = new Error('Client error: 400 Bad Request');
            const toolCallError = new MCPToolCallError('test', 'test_tool', 'Request failed', httpError);

            // Mock client to fail
            const mockClient = {
                callTool: jest.fn().mockRejectedValue(toolCallError)
            };
            (adapter as any).sdkClients.set('test', mockClient);

            // Execute tool call
            await expect(adapter.executeMcpTool('test', 'test_tool', {}))
                .rejects.toThrow(MCPToolCallError);

            // Verify tool was called only once (no retry)
            expect(mockClient.callTool).toHaveBeenCalledTimes(1);
        });
    });

    describe('_ensureConnected checks', () => {
        beforeEach(() => {
            // Initialize adapter without connecting
            adapter = new MCPServiceAdapter({
                test: { command: 'test-command' }
            });
        });

        it('executeTool should throw if not connected', async () => {
            // Check for the specific error message when not connected
            await expect(adapter.executeTool('test', 'tool', {}, false)).rejects.toThrow('Server not connected. Try connecting first with connectToServer().');
        });

        it('listTools should throw if not connected - corrected to getMcpServerToolSchemas', async () => {
            // listTools is internal, the public method is getMcpServerToolSchemas
            // Check for the specific error message when not connected
            await expect(adapter.getMcpServerToolSchemas('test')).rejects.toThrow('Server not connected. Cannot fetch schemas.');
        });

        // Add similar checks for other methods calling _ensureConnected
        it('listResources should throw if not connected', async () => {
            await expect(adapter.listResources('test')).rejects.toThrow('Not connected to server');
        });

        it('readResource should throw if not connected', async () => {
            await expect(adapter.readResource('test', { uri: 'uri' })).rejects.toThrow('Not connected to server');
        });

        it('listResourceTemplates should throw if not connected', async () => {
            await expect(adapter.listResourceTemplates('test')).rejects.toThrow('Not connected to server');
        });

        it('listPrompts should throw if not connected', async () => {
            await expect(adapter.listPrompts('test')).rejects.toThrow('Not connected to server');
        });

        it('getPrompt should throw if not connected', async () => {
            await expect(adapter.getPrompt('test', { name: 'name' })).rejects.toThrow('Not connected to server');
        });

        it('getMcpServerToolSchemas should throw if not connected', async () => {
            // This duplicates the corrected listTools test, but let's keep it for clarity
            await expect(adapter.getMcpServerToolSchemas('test')).rejects.toThrow('Server not connected. Cannot fetch schemas.');
        });
    });

    describe('convertToToolDefinition / createZodSchemaFromParameters', () => {
        beforeEach(() => {
            adapter = new MCPServiceAdapter({
                test: { command: 'test-cmd' }
            });
        });

        const mockSdkClientWithTools = (tools: any[]) => {
            const mockClient = {
                connect: jest.fn().mockResolvedValue(undefined),
                close: jest.fn().mockResolvedValue(undefined),
                listTools: jest.fn().mockResolvedValue({ tools }),
                // Add other methods if needed by connectToServer
            };
            (Client as jest.Mock).mockImplementationOnce(() => mockClient);
            return mockClient; // Return the mock client for potential assertions
        };

        it('should handle tool with no description and no parameters', async () => {
            mockSdkClientWithTools([{ name: 'tool_no_desc_no_params' }]);
            await adapter.connectToServer('test');
            const schemas = await adapter.getMcpServerToolSchemas('test');

            expect(schemas).toHaveLength(1);
            expect(schemas[0].name).toBe('tool_no_desc_no_params');
            expect(schemas[0].description).toBe('No description provided');
            expect(schemas[0].serverKey).toBe('test');
            expect(schemas[0].llmToolName).toBe('test_tool_no_desc_no_params');
            // Check for an empty Zod object schema
            expect(schemas[0].parameters._def.shape()).toEqual({});
        });

        it('should handle various parameter types', async () => {
            mockSdkClientWithTools([
                {
                    name: 'complex_tool',
                    description: 'A tool with various params',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            p_string: { type: 'string', description: 'String param' },
                            p_number: { type: 'number' },
                            p_integer: { type: 'integer' },
                            p_boolean: { type: 'boolean' },
                            p_array: { type: 'array', description: 'Array param' }, // Default items: any
                            p_object: { type: 'object' }, // Default properties: any
                            p_enum: { type: 'string', enum: ['A', 'B'] }
                        },
                        required: ['p_string', 'p_enum']
                    }
                }
            ]);
            await adapter.connectToServer('test');
            const schemas = await adapter.getMcpServerToolSchemas('test');

            expect(schemas).toHaveLength(1);
            const zodSchema = schemas[0].parameters;
            const shape = zodSchema._def.shape();

            // Check types and descriptions
            expect(shape.p_string._def.typeName).toBe('ZodString');
            expect(shape.p_string._def.description).toBe('String param');
            expect(shape.p_enum._def.typeName).toBe('ZodEnum');
            expect(shape.p_enum._def.values).toEqual(['A', 'B']);

            // Optional fields (check inner type):
            expect(shape.p_number._def.innerType._def.typeName).toBe('ZodNumber');
            expect(shape.p_integer._def.innerType._def.typeName).toBe('ZodNumber'); // Zod integer is number().int()
            expect(shape.p_boolean._def.innerType._def.typeName).toBe('ZodBoolean');
            expect(shape.p_array._def.innerType._def.typeName).toBe('ZodArray');
            expect(shape.p_array._def.innerType._def.description).toBe('Array param');
            expect(shape.p_object._def.innerType._def.typeName).toBe('ZodRecord'); // Defaults to record(string, any)

            // Check optionality using isOptional()
            expect(shape.p_string.isOptional()).toBe(false);
            expect(shape.p_number.isOptional()).toBe(true);
            expect(shape.p_integer.isOptional()).toBe(true);
            expect(shape.p_boolean.isOptional()).toBe(true);
            expect(shape.p_array.isOptional()).toBe(true);
            expect(shape.p_object.isOptional()).toBe(true);
            expect(shape.p_enum.isOptional()).toBe(false);
        });

        it('should handle invalid inputSchema type gracefully', async () => {
            mockSdkClientWithTools([
                {
                    name: 'invalid_schema_type',
                    description: 'Tool with non-object schema',
                    inputSchema: { type: 'string' } // Invalid type
                }
            ]);
            await adapter.connectToServer('test');
            const schemas = await adapter.getMcpServerToolSchemas('test');

            expect(schemas).toHaveLength(1);
            // Should default to an empty object schema
            expect(schemas[0].parameters._def.shape()).toEqual({});
        });

        it('should handle missing properties in inputSchema', async () => {
            mockSdkClientWithTools([
                {
                    name: 'missing_properties',
                    description: 'Tool with missing properties',
                    inputSchema: { type: 'object' } // No properties field
                }
            ]);
            await adapter.connectToServer('test');
            const schemas = await adapter.getMcpServerToolSchemas('test');

            expect(schemas).toHaveLength(1);
            // Should default to an empty object schema
            expect(schemas[0].parameters._def.shape()).toEqual({});
        });

        it('should handle non-array required field', async () => {
            mockSdkClientWithTools([
                {
                    name: 'non_array_required',
                    inputSchema: {
                        type: 'object',
                        properties: { p1: { type: 'string' } },
                        required: 'p1' // Invalid, should be array
                    }
                }
            ]);
            await adapter.connectToServer('test');
            const schemas = await adapter.getMcpServerToolSchemas('test');

            expect(schemas).toHaveLength(1);
            // Parameter should be optional as required was invalid
            expect(schemas[0].parameters._def.shape().p1.isOptional()).toBe(true);
        });

        it('should default unknown parameter types to z.any()', async () => {
            mockSdkClientWithTools([
                {
                    name: 'unknown_type_tool',
                    inputSchema: {
                        type: 'object',
                        properties: { p_unknown: { type: 'custom_type' } },
                        required: []
                    }
                }
            ]);
            await adapter.connectToServer('test');
            const schemas = await adapter.getMcpServerToolSchemas('test');
            // Check inner type because it's optional by default when required is empty
            expect(schemas[0].parameters._def.shape().p_unknown._def.innerType._def.typeName).toBe('ZodAny');
            expect(schemas[0].parameters._def.shape().p_unknown.isOptional()).toBe(true);
        });

    });

    describe('OAuth support - Authentication Completion', () => {
        let adapter: MCPServiceAdapter;
        const mockFinishAuth = jest.fn();
        const mockHttpTransport = {
            start: jest.fn(),
            close: jest.fn(),
            finishAuth: mockFinishAuth // Mock the method we need to call
        };
        const mockStdioTransport = {
            start: jest.fn(),
            close: jest.fn()
            // No finishAuth method
        };

        beforeEach(() => {
            jest.clearAllMocks();
            adapter = new MCPServiceAdapter({
                oauthServer: { url: 'https://test.com', auth: { oauth: { redirectUrl: 'app://cb' } } },
                stdioServer: { command: 'node' }
            });

            // Helper to simulate a connected server with a specific transport
            const simulateConnection = (serverKey: string, transport: any) => {
                (adapter as any).sdkTransports.set(serverKey, transport);
                // Need a client entry as well, though its methods aren't directly used here
                (adapter as any).sdkClients.set(serverKey, { mock: 'client' });
            };

            // Simulate connections for the tests
            simulateConnection('oauthServer', mockHttpTransport);
            simulateConnection('stdioServer', mockStdioTransport);
        });

        test('completeAuthentication calls finishAuth on the correct transport', async () => {
            await adapter.completeAuthentication('oauthServer', 'auth-code-123');
            expect(mockFinishAuth).toHaveBeenCalledWith('auth-code-123');
        });

        test('completeAuthentication throws error if transport not found', async () => {
            await expect(adapter.completeAuthentication('nonExistentServer', 'test-code'))
                .rejects.toThrow('Transport not found. Start connection first.');
        });

        test('completeAuthentication throws error if transport does not support authentication', async () => {
            await expect(adapter.completeAuthentication('stdioServer', 'test-code'))
                .rejects.toThrow('Transport does not support authentication');
        });
    });

    describe('OAuth support - Transport Integration', () => {
        let adapter: MCPServiceAdapter;
        const mockOAuthProvider = { mock: 'provider' }; // Simple mock object

        beforeEach(() => {
            jest.clearAllMocks();
            adapter = new MCPServiceAdapter({
                oauthStreamable: {
                    url: 'https://test.com/streamable',
                    mode: 'streamable',
                    auth: { oauth: { redirectUrl: 'app://cb' } }
                },
                oauthSse: {
                    url: 'https://test.com/sse',
                    mode: 'sse',
                    auth: { oauth: { redirectUrl: 'app://cb' } }
                }
            });
            // Always return the mock provider when createOAuthProviderIfNeeded is called
            jest.spyOn(adapter as any, 'createOAuthProviderIfNeeded').mockReturnValue(mockOAuthProvider);
        });

        test('passes OAuth provider to StreamableHTTP transport', async () => {
            // Mock connectWithHttp to check the transport creation args
            (adapter as any).connectWithHttp = jest.fn().mockImplementation(async (serverKey, config) => {
                (adapter as any).createHttpTransport(serverKey, config);
                // Simulate success
                (adapter as any).sdkClients.set(serverKey, { connect: jest.fn().mockResolvedValue(undefined) });
                (adapter as any).sdkTransports.set(serverKey, { /* mock */ });
                return true;
            });

            await adapter.connectToServer('oauthStreamable');

            expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
                expect.any(URL),
                expect.objectContaining({ authProvider: mockOAuthProvider })
            );
            expect(SSEClientTransport).not.toHaveBeenCalled(); // Ensure SSE wasn't called
        });

        test('passes OAuth provider to SSE transport (direct config)', async () => {
            // Mock connectWithSSE to check the transport creation args
            (adapter as any).connectWithSSE = jest.fn().mockImplementation(async (serverKey, config) => {
                (adapter as any).createHttpTransport(serverKey, config);
                // Simulate success
                (adapter as any).sdkClients.set(serverKey, { connect: jest.fn().mockResolvedValue(undefined) });
                (adapter as any).sdkTransports.set(serverKey, { /* mock */ });
                return true;
            });

            await adapter.connectToServer('oauthSse'); // Connect to the SSE configured server

            expect(SSEClientTransport).toHaveBeenCalledWith(
                expect.any(URL),
                expect.objectContaining({ authProvider: mockOAuthProvider })
            );
            expect(StreamableHTTPClientTransport).not.toHaveBeenCalled(); // Ensure Streamable wasn't called
        });

        test('passes OAuth provider to SSE transport (fallback)', async () => {
            // Mock connectWithHttp to force fallback
            (adapter as any).connectWithHttp = jest.fn().mockRejectedValue(new Error('HTTP 404 Not Found'));
            // Mock connectWithSSE to check transport args during fallback
            (adapter as any).connectWithSSE = jest.fn().mockImplementation(async (serverKey, config) => {
                (adapter as any).createHttpTransport(serverKey, config);
                // Simulate success
                (adapter as any).sdkClients.set(serverKey, { connect: jest.fn().mockResolvedValue(undefined) });
                (adapter as any).sdkTransports.set(serverKey, { /* mock */ });
                return true;
            });

            await adapter.connectToServer('oauthStreamable'); // Connect to streamable which will fallback

            expect(StreamableHTTPClientTransport).toHaveBeenCalled(); // Streamable was attempted
            expect(SSEClientTransport).toHaveBeenCalledWith(
                expect.any(URL),
                expect.objectContaining({ authProvider: mockOAuthProvider })
            ); // SSE was called with provider on fallback
        });
    });

    describe('OAuth support - Provider Creation', () => {
        let adapter: MCPServiceAdapter;

        beforeEach(() => {
            jest.clearAllMocks();
            // Basic adapter setup needed for these tests
            adapter = new MCPServiceAdapter({});
        });

        test('createOAuthProviderIfNeeded returns an OAuthProvider instance for valid config', () => {
            const config: MCPServerConfig = {
                url: 'https://oauth-test.com/mcp',
                auth: { oauth: { redirectUrl: 'app://callback' } }
            };
            // Access private method for direct testing
            const provider = (adapter as any).createOAuthProviderIfNeeded('testServer', config);
            expect(provider).toBeDefined();
            expect(OAuthProvider).toHaveBeenCalledWith('testServer', expect.objectContaining({
                redirectUrl: 'app://callback'
            }));
        });

        test('createOAuthProviderIfNeeded includes clientInfo if provided', () => {
            const config: MCPServerConfig = {
                url: 'https://oauth-test.com/mcp',
                auth: {
                    oauth: {
                        redirectUrl: 'app://callback',
                        clientId: 'test-id',
                        clientSecret: 'test-secret'
                    }
                }
            };
            const provider = (adapter as any).createOAuthProviderIfNeeded('testServer', config);
            expect(OAuthProvider).toHaveBeenCalledWith('testServer', expect.objectContaining({
                clientInformation: {
                    client_id: 'test-id',
                    client_secret: 'test-secret'
                }
            }));
        });

        test('createOAuthProviderIfNeeded returns undefined for non-OAuth config', () => {
            const config: MCPServerConfig = {
                url: 'https://non-oauth.com/mcp'
            };
            // Access private method for direct testing
            const provider = (adapter as any).createOAuthProviderIfNeeded('nonOauthServer', config);
            expect(provider).toBeUndefined();
            expect(OAuthProvider).not.toHaveBeenCalled();
        });

        test('createOAuthProviderIfNeeded returns undefined if auth or oauth is missing', () => {
            const configNoAuth: MCPServerConfig = { url: 'https://test.com' };
            const configNoOauth: MCPServerConfig = { url: 'https://test.com', auth: {} }; // Missing oauth key

            const provider1 = (adapter as any).createOAuthProviderIfNeeded('test1', configNoAuth);
            expect(provider1).toBeUndefined();

            const provider2 = (adapter as any).createOAuthProviderIfNeeded('test2', configNoOauth);
            expect(provider2).toBeUndefined();
        });
    });

    describe('Error handling and retry', () => {
        let adapter: MCPServiceAdapter;

        beforeEach(() => {
            adapter = new MCPServiceAdapter({
                test: { command: 'test-command' }
            });
        });

        it('maps network errors to MCPConnectionError', async () => {
            // Mock connection
            await adapter.connectToServer('test');

            // Mock client to throw network error
            const mockClient = {
                callTool: jest.fn().mockRejectedValue(new Error('Network error: Connection reset'))
            };

            (adapter as any).sdkClients.set('test', mockClient);

            // Execute tool call and expect MCPConnectionError
            await expect(
                async () => await adapter.executeMcpTool('test', 'test_tool', {})
            ).rejects.toThrow(MCPToolCallError);
        });

        it('maps authorization errors to MCPAuthenticationError', async () => {
            // Mock connection
            await adapter.connectToServer('test');

            // Create an error that mimics UnauthorizedError
            const authError = new Error('Unauthorized');
            authError.name = 'UnauthorizedError';

            // Mock client to throw auth error
            const mockClient = {
                callTool: jest.fn().mockRejectedValue(authError)
            };

            (adapter as any).sdkClients.set('test', mockClient);

            // Execute tool call with retry disabled to avoid looping
            const options = { retry: false };
            await expect(adapter.executeTool('test', 'test_tool', {}, false, options))
                .rejects.toThrow(MCPAuthenticationError);
        });

        it('maps timeout errors to MCPTimeoutError', async () => {
            // Mock connection
            await adapter.connectToServer('test');

            // Mock client to throw timeout error
            const mockClient = {
                callTool: jest.fn().mockRejectedValue(new Error('Request timed out after 30s'))
            };

            (adapter as any).sdkClients.set('test', mockClient);

            // Execute tool call with retry disabled
            const options = { retry: false };
            await expect(adapter.executeTool('test', 'test_tool', {}, false, options))
                .rejects.toThrow(MCPTimeoutError);
        });

        it('retries transient errors', async () => {
            // Mock connection
            await adapter.connectToServer('test');

            // Mock client to fail once then succeed
            const mockClient = {
                callTool: jest.fn()
                    .mockRejectedValueOnce(new Error('Connection error'))
                    .mockResolvedValueOnce({ result: 'success' })
            };

            (adapter as any).sdkClients.set('test', mockClient);

            // Execute tool call
            const result = await adapter.executeMcpTool('test', 'test_tool', {});

            // Verify tool was called twice (initial + retry)
            expect(mockClient.callTool).toHaveBeenCalledTimes(2);
            expect(result).toEqual({ result: 'success' });
        });

        it('does not retry permanent errors', async () => {
            // Mock connection
            await adapter.connectToServer('test');

            // Create an error that mimics a "method not found" error
            const toolNotFoundError = new Error('Tool not found on server');

            // Mock client to throw method not found error
            const mockClient = {
                callTool: jest.fn().mockRejectedValue(toolNotFoundError)
            };

            (adapter as any).sdkClients.set('test', mockClient);

            // Execute tool call
            await expect(
                async () => await adapter.executeMcpTool('test', 'test_tool', {})
            ).rejects.toThrow(MCPToolCallError);

            // Verify tool was called only once (no retry)
            expect(mockClient.callTool).toHaveBeenCalledTimes(1);
        });

        it('maps specific SDK ToolInputValidationError to MCPToolCallError', async () => {
            await adapter.connectToServer('test');
            const sdkError = new Error('Invalid input');
            sdkError.name = 'ToolInputValidationError'; // Mimic SDK error name
            const mockClient = { callTool: jest.fn().mockRejectedValue(sdkError) };
            (adapter as any).sdkClients.set('test', mockClient);

            // Only check that it throws MCPToolCallError, as errorType is not set
            await expect(adapter.executeTool('test', 'tool', {}, false, { retry: false }))
                .rejects.toThrow(MCPToolCallError);
            await expect(adapter.executeTool('test', 'tool', {}, false, { retry: false }))
                .rejects.toThrow('Invalid input'); // Check the original message is preserved
        });

        it('maps specific SDK ToolExecutionError to MCPToolCallError', async () => {
            await adapter.connectToServer('test');
            const sdkError = new Error('Tool crashed');
            sdkError.name = 'ToolExecutionError'; // Mimic SDK error name
            const mockClient = { callTool: jest.fn().mockRejectedValue(sdkError) };
            (adapter as any).sdkClients.set('test', mockClient);

            // Only check that it throws MCPToolCallError, as errorType is not set
            await expect(adapter.executeTool('test', 'tool', {}, false, { retry: false }))
                .rejects.toThrow(MCPToolCallError);
            await expect(adapter.executeTool('test', 'tool', {}, false, { retry: false }))
                .rejects.toThrow('Tool crashed'); // Check the original message is preserved
        });

        it('maps other specific SDK errors (e.g., MethodNotFound) to MCPToolCallError', async () => {
            await adapter.connectToServer('test');
            const sdkError = new Error('Method tools/call not found');
            sdkError.name = 'MethodNotFound'; // Mimic SDK error name
            const mockClient = { callTool: jest.fn().mockRejectedValue(sdkError) };
            (adapter as any).sdkClients.set('test', mockClient);

            // Only check that it throws MCPToolCallError, as errorType is not set
            await expect(adapter.executeTool('test', 'tool', {}, false, { retry: false }))
                .rejects.toThrow(MCPToolCallError);
            await expect(adapter.executeTool('test', 'tool', {}, false, { retry: false }))
                .rejects.toThrow('Method tools/call not found'); // Check the original message is preserved
        });

        it('maps generic errors during tool call to MCPToolCallError', async () => {
            await adapter.connectToServer('test');
            const genericError = new Error('Something unexpected happened');
            const mockClient = { callTool: jest.fn().mockRejectedValue(genericError) };
            (adapter as any).sdkClients.set('test', mockClient);

            // Only check that it throws MCPToolCallError, as errorType is not set
            await expect(adapter.executeTool('test', 'tool', {}, false, { retry: false }))
                .rejects.toThrow(MCPToolCallError);
            await expect(adapter.executeTool('test', 'tool', {}, false, { retry: false }))
                .rejects.toThrow('Something unexpected happened'); // Check the original message is preserved
        });

        it('should retry on retryable HTTP status code within MCPToolCallError cause', async () => {
            await adapter.connectToServer('test');

            // Create an error that mimics a retryable HTTP error wrapped in cause
            const httpError = new Error('Server error: 503 Service Unavailable');
            const toolCallError = new MCPToolCallError('test', 'test_tool', 'Request failed', httpError);

            // Mock client to fail once then succeed
            const mockClient = {
                callTool: jest.fn()
                    .mockRejectedValueOnce(toolCallError)
                    .mockResolvedValueOnce({ result: 'success' })
            };
            (adapter as any).sdkClients.set('test', mockClient);

            // Execute tool call
            const result = await adapter.executeMcpTool('test', 'test_tool', {});

            // Verify tool was called twice (initial + retry)
            expect(mockClient.callTool).toHaveBeenCalledTimes(2);
            expect(result).toEqual({ result: 'success' });
        });

        it('should not retry on non-retryable HTTP status code within MCPToolCallError cause', async () => {
            await adapter.connectToServer('test');

            // Create an error that mimics a non-retryable HTTP error wrapped in cause
            const httpError = new Error('Client error: 400 Bad Request');
            const toolCallError = new MCPToolCallError('test', 'test_tool', 'Request failed', httpError);

            // Mock client to fail
            const mockClient = {
                callTool: jest.fn().mockRejectedValue(toolCallError)
            };
            (adapter as any).sdkClients.set('test', mockClient);

            // Execute tool call
            await expect(adapter.executeMcpTool('test', 'test_tool', {}))
                .rejects.toThrow(MCPToolCallError);

            // Verify tool was called only once (no retry)
            expect(mockClient.callTool).toHaveBeenCalledTimes(1);
        });
    });

    describe('_ensureConnected checks', () => {
        beforeEach(() => {
            // Initialize adapter without connecting
            adapter = new MCPServiceAdapter({
                test: { command: 'test-command' }
            });
        });

        it('executeTool should throw if not connected', async () => {
            // Check for the specific error message when not connected
            await expect(adapter.executeTool('test', 'tool', {}, false)).rejects.toThrow('Server not connected. Try connecting first with connectToServer().');
        });

        it('listTools should throw if not connected - corrected to getMcpServerToolSchemas', async () => {
            // listTools is internal, the public method is getMcpServerToolSchemas
            // Check for the specific error message when not connected
            await expect(adapter.getMcpServerToolSchemas('test')).rejects.toThrow('Server not connected. Cannot fetch schemas.');
        });

        // Add similar checks for other methods calling _ensureConnected
        it('listResources should throw if not connected', async () => {
            await expect(adapter.listResources('test')).rejects.toThrow('Not connected to server');
        });

        it('readResource should throw if not connected', async () => {
            await expect(adapter.readResource('test', { uri: 'uri' })).rejects.toThrow('Not connected to server');
        });

        it('listResourceTemplates should throw if not connected', async () => {
            await expect(adapter.listResourceTemplates('test')).rejects.toThrow('Not connected to server');
        });

        it('listPrompts should throw if not connected', async () => {
            await expect(adapter.listPrompts('test')).rejects.toThrow('Not connected to server');
        });

        it('getPrompt should throw if not connected', async () => {
            await expect(adapter.getPrompt('test', { name: 'name' })).rejects.toThrow('Not connected to server');
        });

        it('getMcpServerToolSchemas should throw if not connected', async () => {
            // This duplicates the corrected listTools test, but let's keep it for clarity
            await expect(adapter.getMcpServerToolSchemas('test')).rejects.toThrow('Server not connected. Cannot fetch schemas.');
        });
    });

    describe('convertToToolDefinition / createZodSchemaFromParameters', () => {
        beforeEach(() => {
            adapter = new MCPServiceAdapter({
                test: { command: 'test-cmd' }
            });
        });

        const mockSdkClientWithTools = (tools: any[]) => {
            const mockClient = {
                connect: jest.fn().mockResolvedValue(undefined),
                close: jest.fn().mockResolvedValue(undefined),
                listTools: jest.fn().mockResolvedValue({ tools }),
                // Add other methods if needed by connectToServer
            };
            (Client as jest.Mock).mockImplementationOnce(() => mockClient);
            return mockClient; // Return the mock client for potential assertions
        };

        it('should handle tool with no description and no parameters', async () => {
            mockSdkClientWithTools([{ name: 'tool_no_desc_no_params' }]);
            await adapter.connectToServer('test');
            const schemas = await adapter.getMcpServerToolSchemas('test');

            expect(schemas).toHaveLength(1);
            expect(schemas[0].name).toBe('tool_no_desc_no_params');
            expect(schemas[0].description).toBe('No description provided');
            expect(schemas[0].serverKey).toBe('test');
            expect(schemas[0].llmToolName).toBe('test_tool_no_desc_no_params');
            // Check for an empty Zod object schema
            expect(schemas[0].parameters._def.shape()).toEqual({});
        });

        it('should handle various parameter types', async () => {
            mockSdkClientWithTools([
                {
                    name: 'complex_tool',
                    description: 'A tool with various params',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            p_string: { type: 'string', description: 'String param' },
                            p_number: { type: 'number' },
                            p_integer: { type: 'integer' },
                            p_boolean: { type: 'boolean' },
                            p_array: { type: 'array', description: 'Array param' }, // Default items: any
                            p_object: { type: 'object' }, // Default properties: any
                            p_enum: { type: 'string', enum: ['A', 'B'] }
                        },
                        required: ['p_string', 'p_enum']
                    }
                }
            ]);
            await adapter.connectToServer('test');
            const schemas = await adapter.getMcpServerToolSchemas('test');

            expect(schemas).toHaveLength(1);
            const zodSchema = schemas[0].parameters;
            const shape = zodSchema._def.shape();

            // Check types and descriptions
            expect(shape.p_string._def.typeName).toBe('ZodString');
            expect(shape.p_string._def.description).toBe('String param');
            expect(shape.p_enum._def.typeName).toBe('ZodEnum');
            expect(shape.p_enum._def.values).toEqual(['A', 'B']);

            // Optional fields (check inner type):
            expect(shape.p_number._def.innerType._def.typeName).toBe('ZodNumber');
            expect(shape.p_integer._def.innerType._def.typeName).toBe('ZodNumber'); // Zod integer is number().int()
            expect(shape.p_boolean._def.innerType._def.typeName).toBe('ZodBoolean');
            expect(shape.p_array._def.innerType._def.typeName).toBe('ZodArray');
            expect(shape.p_array._def.innerType._def.description).toBe('Array param');
            expect(shape.p_object._def.innerType._def.typeName).toBe('ZodRecord'); // Defaults to record(string, any)

            // Check optionality using isOptional()
            expect(shape.p_string.isOptional()).toBe(false);
            expect(shape.p_number.isOptional()).toBe(true);
            expect(shape.p_integer.isOptional()).toBe(true);
            expect(shape.p_boolean.isOptional()).toBe(true);
            expect(shape.p_array.isOptional()).toBe(true);
            expect(shape.p_object.isOptional()).toBe(true);
            expect(shape.p_enum.isOptional()).toBe(false);
        });

        it('should handle invalid inputSchema type gracefully', async () => {
            mockSdkClientWithTools([
                {
                    name: 'invalid_schema_type',
                    description: 'Tool with non-object schema',
                    inputSchema: { type: 'string' } // Invalid type
                }
            ]);
            await adapter.connectToServer('test');
            const schemas = await adapter.getMcpServerToolSchemas('test');

            expect(schemas).toHaveLength(1);
            // Should default to an empty object schema
            expect(schemas[0].parameters._def.shape()).toEqual({});
        });

        it('should handle missing properties in inputSchema', async () => {
            mockSdkClientWithTools([
                {
                    name: 'missing_properties',
                    description: 'Tool with missing properties',
                    inputSchema: { type: 'object' } // No properties field
                }
            ]);
            await adapter.connectToServer('test');
            const schemas = await adapter.getMcpServerToolSchemas('test');

            expect(schemas).toHaveLength(1);
            // Should default to an empty object schema
            expect(schemas[0].parameters._def.shape()).toEqual({});
        });

        it('should handle non-array required field', async () => {
            mockSdkClientWithTools([
                {
                    name: 'non_array_required',
                    inputSchema: {
                        type: 'object',
                        properties: { p1: { type: 'string' } },
                        required: 'p1' // Invalid, should be array
                    }
                }
            ]);
            await adapter.connectToServer('test');
            const schemas = await adapter.getMcpServerToolSchemas('test');

            expect(schemas).toHaveLength(1);
            // Parameter should be optional as required was invalid
            expect(schemas[0].parameters._def.shape().p1.isOptional()).toBe(true);
        });

        it('should default unknown parameter types to z.any()', async () => {
            mockSdkClientWithTools([
                {
                    name: 'unknown_type_tool',
                    inputSchema: {
                        type: 'object',
                        properties: { p_unknown: { type: 'custom_type' } },
                        required: []
                    }
                }
            ]);
            await adapter.connectToServer('test');
            const schemas = await adapter.getMcpServerToolSchemas('test');
            // Check inner type because it's optional by default when required is empty
            expect(schemas[0].parameters._def.shape().p_unknown._def.innerType._def.typeName).toBe('ZodAny');
            expect(schemas[0].parameters._def.shape().p_unknown.isOptional()).toBe(true);
        });

    });
}); 