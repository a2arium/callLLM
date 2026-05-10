# Tool Calling and MCP

Tools let the model ask your application to do work: look up data, call an API, run a calculation, or interact with an MCP server.

`callllm` supports three tool sources:

- explicit `ToolDefinition` objects
- function folders
- Model Context Protocol (MCP) servers

## Local Tool Definition

```ts
import { LLMCaller, type ToolDefinition } from 'callllm';

const getInvoice: ToolDefinition = {
  name: 'get_invoice',
  description: 'Fetch an invoice by id.',
  parameters: {
    type: 'object',
    properties: {
      invoiceId: { type: 'string', description: 'The invoice id.' }
    },
    required: ['invoiceId']
  },
  callFunction: async ({ invoiceId }) => ({
    invoiceId,
    status: 'paid',
    total: 129.5
  })
};

const caller = new LLMCaller('openai', 'gpt-5-mini', 'You answer billing questions.', {
  tools: [getInvoice]
});

const response = await caller.call('Was invoice INV-100 paid?', {
  settings: { toolChoice: 'auto' }
});

console.log(response[0].content);
```

The tool schema is sent to the model. When the model calls the tool, `callllm` executes `callFunction`, adds the tool result to the conversation, and continues the model response.

## Call-Level Tools

Constructor tools are available by default. Call-level tools are available only for that request:

```ts
await caller.call('Calculate 15% of 85.', {
  tools: [calculateTool],
  settings: { toolChoice: 'auto' }
});
```

You can mix tool sources in one request:

```ts
await caller.call('Check the weather and then read the configured project file.', {
  tools: [weatherTool, 'readProjectFile', mcpServers],
  toolsDir: './tools',
  settings: { toolChoice: 'auto' }
});
```

String tool names are loaded from `toolsDir`. Explicit tool objects and MCP server maps do not require `toolsDir`.

## Tool Choice

```ts
settings: {
  toolChoice: 'auto'
}
```

Supported values:

- `none`: do not call tools
- `auto`: let the model decide
- `{ type: 'function', function: { name: 'tool_name' } }`: force a specific tool

## Streaming Tools

```ts
for await (const chunk of caller.stream('Look up invoice INV-100.', {
  tools: [getInvoice],
  settings: { toolChoice: 'auto' }
})) {
  if (chunk.content) process.stdout.write(chunk.content);
  if (chunk.toolCalls?.length) console.log('Tool calls:', chunk.toolCalls);
}
```

Model selection requires streaming tool-call support when you stream with tools.

## Function Folders

Function folders let you keep tools as separate TypeScript files and load them by name:

```ts
const caller = new LLMCaller('openai', 'gpt-5-mini', 'You can use tools.', {
  toolsDir: './tools'
});

await caller.addTools(['getWeather', 'getTime']);
```

See [Function folders](function-folders.md).

## MCP Servers

MCP lets you expose external tool servers to the model.

```ts
import { LLMCaller, type MCPServersMap } from 'callllm';

const mcpServers: MCPServersMap = {
  filesystem: {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '.']
  },
  remoteApi: {
    url: 'https://mcp.example.com',
    headers: {
      Authorization: 'Bearer ${MY_SERVICE_TOKEN}'
    }
  }
};

const caller = new LLMCaller('openai', 'fast');

const response = await caller.call('List the files in the current directory.', {
  tools: [mcpServers],
  settings: { toolChoice: 'auto' }
});
```

MCP server tools are discovered and converted into model tools. Tool names are namespaced to avoid collisions.

Environment variable placeholders such as `${MY_SERVICE_TOKEN}` are resolved from `process.env` before connection. Missing variables resolve to an empty string, so production apps should validate required environment before creating the caller.

Model-invoked MCP tool calls use a 60 second client-side timeout by default. Set `MCP_TOOL_CALL_TIMEOUT_MS` for long-running tools. Direct calls can also pass a per-call timeout. See [MCP tool call timeout](../reference/mcp.md#tool-call-timeout).

## Direct MCP Calls

Use direct MCP calls when you want deterministic tool execution without asking the model:

```ts
await caller.addTools([mcpServers]);
await caller.connectToMcpServer('filesystem');

const result = await caller.callMcpTool('filesystem', 'read_file', {
  path: 'package.json'
});

await caller.disconnectMcpServers();
```

See [MCP reference](../reference/mcp.md).

## Manual Tool Results

Most applications let `callllm` execute tools automatically. Use `addToolResult()` only when you are manually coordinating a provider tool call:

```ts
caller.addToolResult(
  'call_123',
  JSON.stringify({ status: 'paid' }),
  'get_invoice'
);
```

The `toolCallId` must match the exact id emitted by the model. If the tool failed, pass `true` as the fourth argument so the model receives an error result:

```ts
caller.addToolResult('call_123', 'Invoice service timed out.', 'get_invoice', true);
```

## Tool Safety

Tool calls are application code. Treat tool arguments as untrusted input:

- validate parameters in `callFunction`
- return structured, concise tool results
- choose clear tool names and descriptions; the model uses them to decide whether to call the tool
- enforce authorization inside tools
- handle tool errors and return useful failure messages when the model can recover
- avoid passing raw secrets to the model
- cap tool iteration with `maxIterations`
- use MCP timeouts for long-running tools
- log tool calls and errors through telemetry
