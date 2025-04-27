import { z } from 'zod';

/**
 * Example: Using an MCP filesystem server with LLMCaller
 *
 * Run with:
 *   yarn ts-node examples/mcpClient.ts
 */
import { LLMCaller } from '../src';
import type { MCPServersMap } from '../src/core/mcp/MCPConfigTypes';

async function main() {
    // Initialize the caller with OpenAI
    const caller = new LLMCaller('openai', 'fast', 'You are a helpful assistant that can use MCP servers.');

    // Define MCP servers map
    const mcpConfig: { mcpServers: MCPServersMap } = {
        mcpServers: {
            // A local filesystem server (requires @modelcontextprotocol/server-filesystem)
            filesystem: {
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-filesystem', '.']
            }
        }
    };

    // Use the MCP server as a tool in a call
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
}

main().catch((err) => {
    console.error('Error in example:', err);
    process.exit(1);
}); 