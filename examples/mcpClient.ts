import { z } from 'zod';

/**
 * Example: Using an MCP filesystem server with LLMCaller
 *
 * This example demonstrates how to use MCP tools with an LLM.
 * The LLM interprets your natural language request and calls the appropriate MCP tool.
 *
 * Run with:
 *   yarn ts-node examples/mcpClient.ts
 * 
 * For direct tool calls without LLM involvement, see examples/mcpDirectTools.ts
 */
import { LLMCaller } from '../src.js';
import type { MCPServersMap } from '../src/core/mcp/MCPConfigTypes.js';

async function main() {

    // Define MCP servers map
    const mcpConfig: MCPServersMap = {
        // A local filesystem server (requires @modelcontextprotocol/server-filesystem)
        filesystem: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '.']
        }
    };

    // Initialize the caller with OpenAI
    const caller = new LLMCaller(
        'openai',
        'fast',
        'You are a helpful assistant that can use MCP servers.',
        {
            tools: [mcpConfig]
        }
    );

    // Use the MCP server as a tool in a LLM call
    console.log('Listing current directory via MCP filesystem server...');
    const response = await caller.call(
        'List the files and folders in the current directory.',
        {
            jsonSchema: {
                name: 'FolderContents',
                schema: z.object({
                    folders: z.array(z.string()),
                    files: z.array(z.string())
                })
            }
        }
    );

    console.log('\nLLM Response:');
    console.log(response[0].contentObject);


    console.log('Directly reading package.json file...');
    const result = await caller.callMcpTool('filesystem', 'read_file', { path: 'package.json' });
    console.log('Direct MCP call result:', result);

    // // Additional LLM + MCP examples - removing the redundant tools parameter since we already added tools
    // console.log('\nReading a specific file via MCP filesystem server using stream...');
    const fileResponse = await caller.stream(
        'Read the package.json file from the current directory and tell me its version number.',
        { tools: [mcpConfig] }
    );

    for await (const chunk of fileResponse) {
        process.stdout.write(chunk.content);
    }


    // Clean up and disconnect from MCP servers
    console.log('\nDisconnecting from MCP servers...');
    await caller.disconnectMcpServers();
    console.log('Disconnected successfully');
}

main().catch((err) => {
    console.error('Error in example:', err);
    process.exit(1);
}); 