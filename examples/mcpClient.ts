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
import { LLMCaller } from '../src';
import type { MCPServersMap } from '../src/core/mcp/MCPConfigTypes';

async function main() {
    // Initialize the caller with OpenAI
    const caller = new LLMCaller('openai', 'fast', 'You are a helpful assistant that can use MCP servers.');

    // Define MCP servers map
    const mcpConfig: MCPServersMap = {
        // A local filesystem server (requires @modelcontextprotocol/server-filesystem)
        filesystem: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '.']
        }
    };

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
            },
            tools: [mcpConfig]
        }
    );

    console.log('\nLLM Response:');
    console.log(response[0].contentObject);

    // Additional LLM + MCP examples
    console.log('\nReading a specific file via MCP filesystem server...');
    const fileResponse = await caller.call(
        'Read the package.json file from the current directory and tell me its version number.',
        {
            tools: [mcpConfig]
        }
    );

    console.log('\nLLM Response (with extracted version):');
    console.log(fileResponse[0].content);

    // Clean up and disconnect from MCP server
    console.log('\nDisconnecting from MCP server...');
    await caller.disconnect();
    console.log('Disconnected successfully');

}

main().catch((err) => {
    console.error('Error in example:', err);
    process.exit(1);
}); 