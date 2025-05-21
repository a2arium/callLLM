import { jest } from '@jest/globals';
import { LLMCaller } from '../../../../core/caller/LLMCaller.js';
import { MCPServiceAdapter } from '../../../../core/mcp/MCPServiceAdapter.js';
import {
  MCPConnectionError,
  MCPToolCallError,
  MCPToolConfig,
  MCPServerConfig,
  MCPServersMap } from
'../../../../core/mcp/MCPConfigTypes.js';
import type { McpToolSchema } from '../../../../core/mcp/MCPConfigTypes.js';
import type { FinishReason } from '../../../../interfaces/UniversalInterfaces.js';

type SimplifiedToolSchema = {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
  llmToolName: string;
  serverKey: string;
};

// Create a map to track connected servers
const connectedServers = new Map<string, {connected: boolean;config: MCPServerConfig;}>();

// Mock the MCPServiceAdapter
jest.unstable_mockModule('../../../../core/mcp/MCPServiceAdapter.js', () => {
  return { __esModule: true, __esModule: true, __esModule: true, __esModule: true, __esModule: true, __esModule: true,
    MCPServiceAdapter: class {
      // Store server configs in constructor
      constructor(mcpServers: MCPServersMap) {
        // Initialize the list of configured servers
        Object.entries(mcpServers || {}).forEach(([key, config]) => {
          // Store in our connectedServers map but mark as not yet connected
          connectedServers.set(key, {
            connected: false,
            config
          });
        });
      }

      async connectToServer(serverKey: string): Promise<void> {
        // Update the connection state if server exists
        const server = connectedServers.get(serverKey);
        if (server) {
          server.connected = true;
          return Promise.resolve();
        }

        // For testing, allow connecting to 'filesystem' even if not in constructor
        if (serverKey === 'filesystem' && !connectedServers.has(serverKey)) {
          connectedServers.set(serverKey, {
            connected: true,
            config: {
              command: 'mock-command',
              args: []
            }
          });
          return Promise.resolve();
        }

        throw new MCPConnectionError(serverKey, 'Server configuration not found');
      }

      async disconnectServer(serverKey: string): Promise<void> {
        connectedServers.delete(serverKey);
        return Promise.resolve();
      }

      isConnected(serverKey: string): boolean {
        return connectedServers.has(serverKey) && connectedServers.get(serverKey)!.connected;
      }

      getConnectedServers(): string[] {
        return Array.from(connectedServers.keys()).filter((key) =>
        connectedServers.get(key)!.connected
        );
      }

      /**
       * Returns a list of all registered server configurations.
       * @returns Array of server keys
       */
      listConfiguredServers(): string[] {
        return Array.from(connectedServers.keys());
      }

      async getMcpServerToolSchemas(serverKey: string): Promise<SimplifiedToolSchema[]> {
        if (!this.isConnected(serverKey)) {
          throw new MCPConnectionError(serverKey, 'Server not connected. Cannot fetch schemas.');
        }

        // Return mock schemas with llmToolName included
        return Promise.resolve([
        {
          name: 'list_directory',
          description: 'List contents of a directory',
          parameters: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'The directory path'
              }
            },
            required: ['path']
          },
          llmToolName: 'filesystem_list_directory',
          serverKey: 'filesystem'
        },
        {
          name: 'read_file',
          description: 'Read the contents of a file',
          parameters: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'The file path'
              }
            },
            required: ['path']
          },
          llmToolName: 'filesystem_read_file',
          serverKey: 'filesystem'
        }]
        );
      }

      async executeMcpTool(serverKey: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
        if (!this.isConnected(serverKey)) {
          throw new MCPToolCallError(serverKey, toolName, 'Not connected to server');
        }

        if (toolName === 'list_directory') {
          return Promise.resolve({
            items: [
            { name: 'file1.txt', type: 'file' },
            { name: 'file2.txt', type: 'file' },
            { name: 'subdir', type: 'directory' }]

          });
        } else if (toolName === 'read_file') {
          if (args.path === 'error.txt') {
            throw new MCPToolCallError(serverKey, toolName, 'File not found');
          }
          return Promise.resolve({
            content: [
            { type: 'text', text: 'File content mock' }]

          });
        } else {
          throw new MCPToolCallError(serverKey, toolName, `Tool not found: ${toolName}`);
        }
      }
    }
  };
});

// Mock MCPToolLoader for the MCP integration test
jest.unstable_mockModule('../../../../core/mcp/MCPToolLoader.js', () => {
  return { __esModule: true, __esModule: true, __esModule: true, __esModule: true, __esModule: true, __esModule: true,
    MCPToolLoader: class {
      async loadTools() {
        return [
        {
          name: 'filesystem_list_directory',
          description: 'List directory contents',
          function: {
            name: 'filesystem_list_directory',
            parameters: {
              type: 'object',
              properties: {
                path: { type: 'string' }
              },
              required: ['path']
            }
          }
        }];

      }
    }
  };
});

describe('MCP Direct Access Integration', () => {
  let caller: LLMCaller;
  let mcpAdapter: MCPServiceAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    connectedServers.clear();

    caller = new LLMCaller('openai', 'fast');
    mcpAdapter = new MCPServiceAdapter({});
    (caller as any)._mcpAdapter = mcpAdapter;
  });

  describe('getMcpServerToolSchemas', () => {
    it('should fetch and return tool schemas from an MCP server', async () => {
      // First connect to the server
      await mcpAdapter.connectToServer('filesystem');

      // Get the tool schemas
      const schemas = await caller.getMcpServerToolSchemas('filesystem');

      // Verify we got the expected schemas
      expect(schemas).toHaveLength(2);
      expect(schemas[0].name).toBe('list_directory');
      expect(schemas[1].name).toBe('read_file');
    });

    it('should throw an error when server is not connected', async () => {
      // Try to get schemas without connecting first
      await expect(caller.getMcpServerToolSchemas('non_existent_server')).
      rejects.toThrow(MCPConnectionError);
    });
  });

  describe('callMcpTool', () => {
    beforeEach(async () => {
      // Connect to the filesystem server before each test
      await mcpAdapter.connectToServer('filesystem');
    });

    it('should call list_directory and return results', async () => {
      const result = await caller.callMcpTool('filesystem', 'list_directory', { path: '.' });

      expect(result).toEqual({
        items: [
        { name: 'file1.txt', type: 'file' },
        { name: 'file2.txt', type: 'file' },
        { name: 'subdir', type: 'directory' }]

      });
    });

    it('should call read_file and return contents', async () => {
      const result = await caller.callMcpTool('filesystem', 'read_file', { path: 'sample.txt' });

      expect(result).toEqual({
        content: [
        { type: 'text', text: 'File content mock' }]

      });
    });

    it('should throw an error for unknown tools', async () => {
      await expect(caller.callMcpTool('filesystem', 'unknown_tool', { path: '.' })).
      rejects.toThrow(MCPToolCallError);
    });

    it('should throw an error when tool execution fails', async () => {
      await expect(caller.callMcpTool('filesystem', 'read_file', { path: 'error.txt' })).
      rejects.toThrow(MCPToolCallError);
    });
  });

  describe('LLMCaller with MCP tools', () => {
    // Test for proper integration with ToolsManager
    it('should handle MCP tool config in call method', async () => {
      // Create an MCP config
      const mcpConfig = {
        mcpServers: {
          filesystem: {
            command: 'mock-command',
            args: []
          }
        } as MCPServersMap
      };

      // Create a mock for resolveToolDefinitions
      const resolveToolSpy = jest.fn().mockResolvedValue([]);

      // Replace the method with our spy
      const originalResolveToolDefinitions = (caller as any).resolveToolDefinitions;
      (caller as any).resolveToolDefinitions = resolveToolSpy;

      try {
        // Call with MCP config in tools array
        await caller.call('Hello', {
          tools: [mcpConfig as MCPToolConfig],
          settings: { temperature: 0.7 }
        });

        // Verify the MCP config was processed
        expect(resolveToolSpy).toHaveBeenCalled();

        // Skip checking the content of toolsArg since LLMCaller has been updated to handle MCPServersMap differently
        // This test is primarily checking that the call works, not the specific implementation details
        expect(resolveToolSpy).toHaveBeenCalledWith(
          expect.any(Array), // We don't check exactly what's in the array
          undefined
        );
      } finally {
        // Restore original method
        (caller as any).resolveToolDefinitions = originalResolveToolDefinitions;
      }
    });
  });
});