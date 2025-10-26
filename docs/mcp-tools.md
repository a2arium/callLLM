# MCP Server Tools

The Model Context Protocol (MCP) allows callllm to use tools provided by external servers. This enables powerful capabilities like file system access, web browsing, API calls, and more.

## Basic Usage

The primary way to use MCP servers is through LLM interaction. In addition to function folders and explicit `ToolDefinition` objects, you can pass MCP server configurations:

```typescript
import { LLMCaller } from 'callllm';
import type { MCPServersMap } from 'callllm';

// MCP server configuration
const mcpConfig: MCPServersMap = {
  filesystem: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '.']
  }
};

// Initialize caller
const caller = new LLMCaller('openai', 'fast');

// Use MCP servers as tools in a call
const response = await caller.call("List the files in the current directory", {
  tools: [mcpConfig]  // Pass the MCP config
});
```

The LLM will automatically discover the available tools from the MCP server and use them appropriately based on the user's request.

## Direct Access Methods

While LLM interaction is the primary method for using MCP tools, `LLMCaller` also implements the `MCPDirectAccess` interface which provides supplementary methods for special cases where you need to:

1. Get information about available tools programmatically
2. Call a specific tool directly without LLM involvement
3. Handle tool responses in a specific way

The `MCPDirectAccess` interface provides two supplementary methods:

```typescript
interface MCPDirectAccess {
  // Get schema information about available tools
  getMcpServerToolSchemas(serverName: string): Promise<McpToolSchema[]>;
  
  // Call a specific tool directly
  callMcpTool(serverName: string, toolName: string, parameters: Record<string, any>): Promise<any>;
}
```

### Using Direct Access

You can leverage the direct access calls to MCP servers whenever it's needed:

```typescript
import { LLMCaller } from 'callllm';
import type { MCPServersMap } from 'callllm';

// Initialize LLMCaller and set up MCP for LLM usage
const caller = new LLMCaller('openai', 'fast');

// Define your MCP server configuration
const mcpConfig: MCPServersMap = {
  filesystem: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '.']
  }
};

// Add the MCP configuration to the caller
await caller.addTools([mcpConfig]);

// Explicitly connect to the server for direct access
// You can uee 'connectToMcpServer' to preconnect to servers prior to calling any tools, as well
await caller.connectToMcpServer('filesystem');

// Now you can access the tools directly
const result = await caller.callMcpTool('filesystem', 'read_file', { path: 'package.json' });

// You can also use this server in LLM calls without reconnecting to it, since it's already connected with connectToMcpServer
const response = await caller.call('Read the README.md file and summarize it');

// Clean up when done
await caller.disconnectMcpServers();
```

The implementation   efficiently reuses connections and avoids redundant server startups. When you:

1. Call `addTools([mcpConfig])` - Saves the configuration for future use
2. Call `connectToMcpServer('filesystem')` - Establishes a connection if not already connected
3. Call `call(...)` - Reuses the existing connection without needing to reconnect

This prevents duplicate server instances when using direct MCP tool calls together with LLM calls.

For more advanced cases where you need explicit connection management:

```typescript
import { LLMCaller, MCPServiceAdapter } from 'callllm';
import type { MCPServersMap } from 'callllm';

const mcpConfig: MCPServersMap = {
  filesystem: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '.']
  }
};

// Create and initialize the MCP service adapter with the SDK
const adapter = new MCPServiceAdapter(mcpConfig);

// Explicitly connect to a server
await adapter.connectToServer('filesystem');

// Initialize an LLMCaller and set its MCP adapter
const caller = new LLMCaller('openai', 'fast');
(caller as any)._mcpAdapter = adapter;

// Now you can make direct tool calls
const schemas = await caller.getMcpServerToolSchemas('filesystem');
const result = await caller.callMcpTool('filesystem', 'read_file', { path: 'package.json' });

// Clean up when done
await adapter.disconnectAll();
```

### Working with Tool Schemas

You can inspect available tools programmatically using `getMcpServerToolSchemas`:

```typescript
const schemas = await caller.getMcpServerToolSchemas('filesystem');

// Log all available tools
schemas.forEach(schema => {
  console.log(`Tool: ${schema.name}`);
  console.log(`Description: ${schema.description}`);
  console.log(`Parameters:`, schema.parameters);
});

// Find a specific tool by name
const listDirSchema = schemas.find(s => s.name === 'list_directory');
if (listDirSchema) {
  // Use schema.parameters to get Zod validation schema for the tool
  // This can be used to validate parameters before calling the tool
}
```

### Calling Tools Directly

Use the `callMcpTool` method to execute specific tools:

```typescript
// Basic file reading
const fileContent = await caller.callMcpTool(
  'filesystem',  // server name
  'read_file',   // tool name (the original name from the MCP server, not the LLM tool name)
  { path: 'package.json' }  // parameters
);
  

### Error Handling

Handle potential errors when working with MCP tools:

```typescript
import { 
  MCPConnectionError, 
  MCPToolCallError, 
  MCPAuthenticationError 
} from 'callllm/core';

try {
  const result = await caller.callMcpTool('filesystem', 'read_file', { path: 'non_existent_file.txt' });
  console.log('Success:', result);
} catch (error) {
  // Check for specific error types
  if (error instanceof MCPConnectionError) {
    console.error('Connection to MCP server failed:', error.message);
  } else if (error instanceof MCPToolCallError) {
    console.error('Tool call failed:', error.message);
  } else if (error instanceof MCPAuthenticationError) {
    console.error('Authentication failed:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## MCP SDK Integration

CallLLM uses the official MCP SDK to connect to MCP servers. The implementation supports:

1. Multiple transport types:
   - **stdio** - For local server processes
   - **http** - With both Streamable HTTP and SSE (Server-Sent Events) modes
   - Future support for custom transports

2. Authentication methods:
   - **Basic auth** - Username/password authentication
   - **Bearer token** - Simple token-based auth
   - **OAuth** - For more secure integrations

3. Automatic fallback strategies:
   - Streamable HTTP to SSE fallback if the server doesn't support Streamable HTTP
   - Automatic retry mechanisms for transient failures

4. Error categorization:
   - `MCPConnectionError` - For connection issues
   - `MCPToolCallError` - For tool execution failures
   - `MCPAuthenticationError` - For auth-related issues
   - `MCPTimeoutError` - For timeout issues

### Transport Configuration Examples

```typescript
import type { MCPServersMap } from 'callllm';

// Stdio transport (local process)
const mcpConfig: MCPServersMap = {
  filesystem: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
    env: { 'DEBUG': 'true' }  // Optional environment variables
  }
};

// HTTP transport with Streamable HTTP mode
const mcpHttpConfig: MCPServersMap = {
  remoteServer: {
    url: 'https://api.example.com/mcp',
    type: 'http',  // Explicitly specify transport type
    mode: 'streamable',  // Use streamable HTTP mode
    headers: {  // Optional headers
      'Authorization': 'Bearer your-token'
    }
  }
};

// HTTP transport with SSE mode and OAuth
const mcpOAuthConfig: MCPServersMap = {
  oauthServer: {
    url: 'https://api.secure.example.com/mcp',
    type: 'http',
    mode: 'sse',  // Use SSE mode
    auth: {  // Authentication configuration
      provider: oauthProvider  // OAuthProvider instance
    }
  }
};
```

### HTTP Transport Modes

When connecting to MCP servers over HTTP, two transport modes are available:

- **streamable** - Uses HTTP streaming with chunked transfer encoding. This is the default mode when not specified.
- **sse** - Uses Server-Sent Events (SSE) for event streaming.

#### Mode Selection and Fallback Behavior

By default, the adapter will:

1. Use 'streamable' mode if no mode is specified
2. Try connecting with Streamable HTTP first
3. If Streamable HTTP fails (due to protocol mismatch, HTTP errors, or timeouts), fall back to SSE transport

Setting `mode: 'sse'` explicitly:
- Bypasses the Streamable HTTP attempt completely
- Connects directly with SSE transport
- Avoids waiting for timeouts when the server only supports SSE

#### When to use each mode:

- **streamable** - Use for newer MCP servers that support HTTP streaming. This is generally more efficient for large data transfers.
- **sse** - Use for:
  - MCP servers that only support SSE protocol
  - When experiencing timeouts with Streamable HTTP (like with the skeet.build server)
  - When you've verified SSE works more reliably in your environment

For example, if you know a server requires SSE mode:

```typescript
import type { MCPServersMap } from 'callllm';

const config: MCPServersMap = {
  knownSseServer: {
    url: 'https://api.example.com/mcp',
    mode: 'sse'  // Skip StreamableHTTP and use SSE directly
  }
};
```

This configuration will connect directly via SSE without trying StreamableHTTP first, avoiding the timeout delay.

### HTTP Transport Troubleshooting

#### Common Connection Issues

1. **Timeouts**

   If you encounter timeout errors when connecting to an MCP server:
   
   ```
   MCPConnectionError: Failed to connect to MCP server: Request timed out
   ```
   
   Solution options:
   - Set `mode: 'sse'` to bypass the StreamableHTTP attempt
   - Check if the server is available and responding
   - Verify network connectivity between your client and the server
   - If behind corporate proxies or firewalls, check if streaming protocols are allowed

2. **Protocol Compatibility**

   Different MCP servers implement different transport protocols:
   
   - Some only support StreamableHTTP
   - Some only support SSE
   - Some support both but prefer one
   
   When first connecting to a new server, you may need to experiment with the mode setting to find the most reliable option.

3. **Authentication Failures**

   If authentication is failing:
   
   ```
   MCPAuthenticationError: Authentication required for server
   ```
   
   Ensure you've configured the appropriate auth method in your server config:
   
   ```typescript
   {
     // Bearer token auth
     headers: {
       "Authorization": "Bearer ${MY_TOKEN}" // Will be replaced with env var
     }
     
     // Or OAuth
     auth: {
       oauth: {
         redirectUrl: "http://localhost:3000/callback",
         clientId: "my-client-id"
       }
     }
   }
   ```

## Complete Examples

See the following example files for complete working implementations:

- [`examples/mcpClient.ts`](../examples/mcpClient.ts) - Using MCP with LLM interpretation
- [`examples/mcpDirectTools.ts`](../examples/mcpDirectTools.ts) - Using MCP tools directly

## Running the Examples

To run the examples:

```bash
# Install the MCP filesystem server
yarn add -D @modelcontextprotocol/server-filesystem

# Run the LLM-based example
yarn ts-node examples/mcpClient.ts

# Run the direct tool call example
yarn ts-node examples/mcpDirectTools.ts

```

## Available MCP Servers

Here are some useful MCP servers you can use:

- `@modelcontextprotocol/server-filesystem`: File system access
- `@modelcontextprotocol/server-process`: Process execution
- `@modelcontextprotocol/server-http`: HTTP requests

Install these packages as development dependencies to use them in your project.

## Custom MCP Servers

You can also create your own MCP servers following the Model Context Protocol specification. See the [MCP documentation](https://github.com/contextscript/modelcontextprotocol) for more details.

## Type Definitions

### MCPServersMap

Configuration for MCP servers:

```typescript
type MCPServersMap = Record<string, MCPServerConfig>;

type MCPServerConfig = {
  // Command to spawn for stdio transport
  command?: string;
  
  // Arguments for the command
  args?: string[];
  
  // URL for HTTP transport (alternative to command+args)
  url?: string;
  
  // Transport type (inferred if not specified)
  type?: 'stdio' | 'http' | 'custom';
  
  // HTTP mode (for HTTP transport)
  mode?: 'streamable' | 'sse';
  
  // Headers for HTTP transport
  headers?: Record<string, string>;
  
  // Authentication configuration
  auth?: MCPAuthConfig;
  
  // Environment variables (for stdio transport)
  env?: Record<string, string>;
  
  // Disable this server
  disabled?: boolean;
  
  // Additional configuration options
  // See MCPConfigTypes.ts for full details
};
```

### MCPToolSchema

Schema information for MCP tools:

```typescript
type McpToolSchema = {
  // Original name of the tool on the MCP server
  name: string;
  
  // Combined name used for LLM tool calling
  llmToolName: string;
  
  // Tool description
  description: string;
  
  // Zod schema for the tool's parameters
  parameters: z.ZodObject<any>;
  
  // Server key for this tool
  serverKey: string;
};
```

