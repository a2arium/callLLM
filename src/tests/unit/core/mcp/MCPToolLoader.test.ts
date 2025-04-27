import { MCPToolLoader } from '../../../../core/mcp/MCPToolLoader';
import { MCPClientManager } from '../../../../core/mcp/MCPClientManager';
import type { MCPServersMap } from '../../../../core/mcp/MCPConfigTypes';

// Mock the MCPClientManager
jest.mock('../../../../core/mcp/MCPClientManager');

// Mock the logger
jest.mock('../../../../utils/logger', () => ({
    logger: {
        createLogger: jest.fn().mockReturnValue({
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        })
    }
}));

describe('MCPToolLoader', () => {
    let loader: MCPToolLoader;
    let mockClientManager: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Set up our mock manager
        mockClientManager = {
            connect: jest.fn(),
            listTools: jest.fn(),
            disconnectAll: jest.fn()
        };

        // Create a new instance with our mock manager
        loader = new MCPToolLoader(mockClientManager);
    });

    describe('constructor', () => {
        it('should create an instance with provided client manager', () => {
            expect(loader['clientManager']).toBe(mockClientManager);
        });

        it('should create a new client manager if not provided', () => {
            // Reset the constructor mock to return a new instance
            (MCPClientManager as jest.Mock).mockClear();

            const newLoader = new MCPToolLoader();
            expect(MCPClientManager).toHaveBeenCalled();
        });
    });

    describe('loadTools', () => {
        it('should return empty array if no servers provided', async () => {
            const tools = await loader.loadTools({});
            expect(tools).toEqual([]);
            expect(mockClientManager.connect).not.toHaveBeenCalled();
        });

        it('should return empty array if null servers provided', async () => {
            const tools = await loader.loadTools(null as unknown as MCPServersMap);
            expect(tools).toEqual([]);
            expect(mockClientManager.connect).not.toHaveBeenCalled();
        });

        it('should skip disabled servers', async () => {
            const servers: MCPServersMap = {
                'test-server': {
                    url: 'ws://localhost:1234',
                    disabled: true
                }
            };

            const tools = await loader.loadTools(servers);

            expect(tools).toEqual([]);
            expect(mockClientManager.connect).not.toHaveBeenCalled();
        });

        it('should connect to servers and load tools', async () => {
            const servers: MCPServersMap = {
                'server1': {
                    url: 'ws://localhost:1234'
                },
                'server2': {
                    url: 'ws://localhost:5678'
                }
            };

            // Setup tool responses
            const server1Tools = [
                { name: 'tool1', description: 'Server 1 Tool 1', parameters: { type: 'object', properties: {}, required: [] } }
            ];

            const server2Tools = [
                { name: 'tool2', description: 'Server 2 Tool 1', parameters: { type: 'object', properties: {}, required: [] } }
            ];

            mockClientManager.listTools.mockImplementation((serverKey: string) => {
                if (serverKey === 'server1') return Promise.resolve(server1Tools);
                if (serverKey === 'server2') return Promise.resolve(server2Tools);
                return Promise.resolve([]);
            });

            const tools = await loader.loadTools(servers);

            // Verify connect was called for each server
            expect(mockClientManager.connect).toHaveBeenCalledWith('server1', servers['server1']);
            expect(mockClientManager.connect).toHaveBeenCalledWith('server2', servers['server2']);
            expect(mockClientManager.connect).toHaveBeenCalledTimes(2);

            // Verify listTools was called for each server
            expect(mockClientManager.listTools).toHaveBeenCalledWith('server1');
            expect(mockClientManager.listTools).toHaveBeenCalledWith('server2');
            expect(mockClientManager.listTools).toHaveBeenCalledTimes(2);

            // Verify we got all the tools
            expect(tools).toHaveLength(2);
            expect(tools).toContainEqual(server1Tools[0]);
            expect(tools).toContainEqual(server2Tools[0]);
        });

        it('should handle connection errors and continue with other servers', async () => {
            const servers: MCPServersMap = {
                'server1': {
                    url: 'ws://localhost:1234'
                },
                'server2': {
                    url: 'ws://localhost:5678'
                }
            };

            // Setup server1 to fail connection
            const errorMessage = 'Connection failed';
            mockClientManager.connect.mockImplementation((serverKey: string) => {
                if (serverKey === 'server1') {
                    return Promise.reject(new Error(errorMessage));
                }
                return Promise.resolve();
            });

            // Setup server2 to return tools
            const server2Tools = [
                { name: 'tool2', description: 'Server 2 Tool 1', parameters: { type: 'object', properties: {}, required: [] } }
            ];

            mockClientManager.listTools.mockImplementation((serverKey: string) => {
                if (serverKey === 'server2') return Promise.resolve(server2Tools);
                return Promise.resolve([]);
            });

            // Mock console.error to prevent actual logging in tests
            const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => { });

            const tools = await loader.loadTools(servers);

            // Verify connect was called for each server
            expect(mockClientManager.connect).toHaveBeenCalledWith('server1', servers['server1']);
            expect(mockClientManager.connect).toHaveBeenCalledWith('server2', servers['server2']);
            expect(mockClientManager.connect).toHaveBeenCalledTimes(2);

            // Verify listTools was only called for server2
            expect(mockClientManager.listTools).toHaveBeenCalledWith('server2');
            expect(mockClientManager.listTools).toHaveBeenCalledTimes(1);

            // Verify we only got tools from server2
            expect(tools).toHaveLength(1);
            expect(tools).toContainEqual(server2Tools[0]);

            // Verify error was logged - now just checking the message
            expect(consoleErrorMock).toHaveBeenCalled();
            const callArgs = consoleErrorMock.mock.calls[0];
            expect(callArgs[0]).toBe(`Failed to load tools from MCP server "server1": ${errorMessage}`);

            // Clean up
            consoleErrorMock.mockRestore();
        });

        it('should filter out duplicate tool names', async () => {
            const servers: MCPServersMap = {
                'server1': {
                    url: 'ws://localhost:1234'
                },
                'server2': {
                    url: 'ws://localhost:5678'
                }
            };

            // Setup tool responses with duplicate names
            const server1Tools = [
                { name: 'unique1', description: 'Server 1 Unique', parameters: { type: 'object', properties: {}, required: [] } },
                { name: 'duplicate', description: 'Server 1 Duplicate', parameters: { type: 'object', properties: {}, required: [] } }
            ];

            const server2Tools = [
                { name: 'unique2', description: 'Server 2 Unique', parameters: { type: 'object', properties: {}, required: [] } },
                { name: 'duplicate', description: 'Server 2 Duplicate', parameters: { type: 'object', properties: {}, required: [] } }
            ];

            mockClientManager.listTools.mockImplementation((serverKey: string) => {
                if (serverKey === 'server1') return Promise.resolve(server1Tools);
                if (serverKey === 'server2') return Promise.resolve(server2Tools);
                return Promise.resolve([]);
            });

            const tools = await loader.loadTools(servers);

            // Verify we got only 3 tools (the 2 unique ones and 1 of the duplicates)
            expect(tools).toHaveLength(3);
            expect(tools).toContainEqual(server1Tools[0]); // unique1
            expect(tools).toContainEqual(server2Tools[0]); // unique2

            // Only one of the duplicate tools should be included (the first one)
            const duplicateTools = tools.filter(t => t.name === 'duplicate');
            expect(duplicateTools).toHaveLength(1);
            expect(duplicateTools[0].description).toBe('Server 1 Duplicate');
        });
    });

    describe('dispose', () => {
        it('should disconnect from all servers', async () => {
            await loader.dispose();
            expect(mockClientManager.disconnectAll).toHaveBeenCalledTimes(1);
        });
    });
}); 