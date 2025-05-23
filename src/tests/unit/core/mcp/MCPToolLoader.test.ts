import { jest, beforeAll } from '@jest/globals';
/**
 * Unit tests for MCPToolLoader
 */
import { MCPToolLoader } from '../../../../core/mcp/MCPToolLoader.ts';
// Declare variables for modules to be dynamically imported
let MCPServiceAdapter;
import { MCPConnectionError } from '../../../../core/mcp/MCPConfigTypes.ts';
import type { ToolDefinition } from '../../../../types/tooling.ts';
import type { MCPServiceAdapter as ActualMCPServiceAdapterType } from '../../../../core/mcp/MCPServiceAdapter.ts';

// Mock the MCPServiceAdapter class
jest.unstable_mockModule('@/core/mcp/MCPServiceAdapter.ts', () => {
  return {
    __esModule: true,
    MCPServiceAdapter: jest.fn().mockImplementation(() => ({
      connectToServer: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      getServerTools: jest.fn<() => Promise<ToolDefinition[]>>().mockResolvedValue([]),
      disconnectAll: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
    }))
  };
});

// Dynamically import modules after mocks are set up
beforeAll(async () => {
  const MCPServiceAdapterModule = await import('../../../../core/mcp/MCPServiceAdapter.ts');
  MCPServiceAdapter = MCPServiceAdapterModule.MCPServiceAdapter;
});


describe('MCPToolLoader', () => {
  let loader: MCPToolLoader;
  let mockAdapter: jest.Mocked<ActualMCPServiceAdapterType>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdapter = new MCPServiceAdapter({}) as jest.Mocked<ActualMCPServiceAdapterType>;
    loader = new MCPToolLoader(mockAdapter);
  });

  it('should return empty array for empty or undefined servers', async () => {
    // Test with undefined mcpServers
    let tools = await loader.loadTools(undefined as any);
    expect(tools).toEqual([]);

    // Test with empty mcpServers
    tools = await loader.loadTools({});
    expect(tools).toEqual([]);

    // Verify no adapter methods were called
    expect(mockAdapter.connectToServer).not.toHaveBeenCalled();
    expect(mockAdapter.getServerTools).not.toHaveBeenCalled();
  });

  it('should skip disabled servers', async () => {
    const mcpServers = {
      enabled: { url: 'http://enabled-server' },
      disabled: { url: 'http://disabled-server', disabled: true }
    };

    await loader.loadTools(mcpServers);

    // Verify only the enabled server was connected to
    expect(mockAdapter.connectToServer).toHaveBeenCalledTimes(1);
    expect(mockAdapter.connectToServer).toHaveBeenCalledWith('enabled');
    expect(mockAdapter.connectToServer).not.toHaveBeenCalledWith('disabled');

    // Verify getServerTools was only called for the enabled server
    expect(mockAdapter.getServerTools).toHaveBeenCalledTimes(1);
    expect(mockAdapter.getServerTools).toHaveBeenCalledWith('enabled');
  });

  it('should continue processing if one server fails', async () => {
    const mcpServers = {
      server1: { url: 'http://server1' },
      server2: { url: 'http://server2' }
    };

    // Make server1 fail on connectToServer
    mockAdapter.connectToServer.mockImplementation(async (key: string) => {
      if (key === 'server1') {
        throw new MCPConnectionError('server1', 'Connection failed');
      }
      // Implicitly returns Promise.resolve(undefined) for other keys
    });

    await loader.loadTools(mcpServers);

    // Verify both servers were attempted
    expect(mockAdapter.connectToServer).toHaveBeenCalledTimes(2);

    // Verify getServerTools was only called for the server that connected
    expect(mockAdapter.getServerTools).toHaveBeenCalledTimes(1);
    expect(mockAdapter.getServerTools).toHaveBeenCalledWith('server2');
  });

  it('should deduplicate tools with the same name', async () => {
    const mcpServers = {
      server1: { url: 'http://server1' },
      server2: { url: 'http://server2' }
    };

    // Define mock tools with duplicate names
    const server1Tools: ToolDefinition[] = [
      {
        name: 'duplicate_tool',
        description: 'Tool from server1',
        parameters: { type: 'object', properties: {} },
        origin: 'mcp',
        metadata: { serverKey: 'server1' }
      },
      {
        name: 'unique_tool1',
        description: 'Unique tool from server1',
        parameters: { type: 'object', properties: {} },
        origin: 'mcp',
        metadata: { serverKey: 'server1' }
      }];


    const server2Tools: ToolDefinition[] = [
      {
        name: 'duplicate_tool', // Same name as a tool from server1
        description: 'Tool from server2',
        parameters: { type: 'object', properties: {} },
        origin: 'mcp',
        metadata: { serverKey: 'server2' }
      },
      {
        name: 'unique_tool2',
        description: 'Unique tool from server2',
        parameters: { type: 'object', properties: {} },
        origin: 'mcp',
        metadata: { serverKey: 'server2' }
      }];


    // Set up mock responses
    mockAdapter.getServerTools.mockImplementation(async (key: string) => {
      if (key === 'server1') return server1Tools;
      if (key === 'server2') return server2Tools;
      return [];
    });
    // connectToServer will use its default mockResolvedValue(undefined) from the module mock, which is fine here.

    const tools = await loader.loadTools(mcpServers);

    // Verify deduplication - should keep first instance of duplicate
    expect(tools).toHaveLength(3); // 3 unique names out of 4 tools
    expect(tools.filter((t) => t.name === 'duplicate_tool')).toHaveLength(1);
    expect(tools.filter((t) => t.name === 'unique_tool1')).toHaveLength(1);
    expect(tools.filter((t) => t.name === 'unique_tool2')).toHaveLength(1);

    // Verify the first duplicate is kept (from server1);
    const duplicateTool = tools.find((t) => t.name === 'duplicate_tool');
    expect(duplicateTool?.metadata?.serverKey).toBe('server1');
  });

  it('should dispose by calling disconnectAll on the adapter', async () => {
    await loader.dispose();
    expect(mockAdapter.disconnectAll).toHaveBeenCalledTimes(1);
  });
});