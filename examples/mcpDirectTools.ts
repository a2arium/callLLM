import { z } from 'zod';

/**
 * Example: Directly using MCP tools without an LLM
 * 
 * This example demonstrates how to use MCP tools directly without LLM involvement.
 * You can call specific MCP tools with explicit parameters and get direct results.
 *
 * Run with:
 *   yarn ts-node examples/mcpDirectTools.ts
 * 
 * For LLM-powered MCP tool usage, see examples/mcpClient.ts
 */
import { LLMCaller } from '../src';
import type { MCPServersMap } from '../src/core/mcp/MCPConfigTypes';
import { MCPClientManager } from '../src/core/mcp/MCPClientManager';

async function main() {
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

    // Create and initialize the MCP manager for direct tool calls
    const mcpManager = new MCPClientManager();

    // Connect to the filesystem server
    await mcpManager.connect('filesystem', mcpConfig.mcpServers.filesystem);
    console.log('Successfully connected to filesystem MCP server');

    // Initialize an LLMCaller (we need this to access the MCP methods)
    const caller = new LLMCaller('openai', 'fast');

    // Provide the MCPClientManager instance to LLMCaller
    // This would usually be done with a proper setter method, but for this example we'll set it directly
    (caller as any)._mcpClientManager = mcpManager;

    // Example: Get tool schemas for the filesystem server
    console.log('\nFetching tool schemas for filesystem server...');
    try {
        const filesystemSchemas = await caller.getMcpServerToolSchemas('filesystem');
        console.log(`Found ${filesystemSchemas.length} schemas:`);
        console.log(filesystemSchemas);
    } catch (error) {
        console.error('Failed to get filesystem schemas:', error);
    }

    // Example: Directly execute the filesystem.read_file tool
    console.log('\nDirectly calling filesystem.read_file...');
    const filePathToRead = 'package.json'; // Example file
    try {
        const fileContent = await caller.callMcpTool(
            'filesystem',
            'read_file',
            { path: filePathToRead }
        );
        console.log(`Content of ${filePathToRead} (first 300 chars):`);

        // Process the MCP filesystem server's actual response format
        // The content is returned as an array of chunks, each with a type and text
        if (typeof fileContent === 'object' &&
            fileContent !== null &&
            'content' in fileContent &&
            Array.isArray(fileContent.content) &&
            fileContent.content.length > 0) {

            // Extract the text from the first chunk (or combine all chunks if needed)
            const firstChunk = fileContent.content[0];
            if (typeof firstChunk === 'object' && firstChunk && 'text' in firstChunk) {
                const text = firstChunk.text as string;
                console.log(text.substring(0, 300) + '...');
            } else {
                console.log('Unexpected chunk format:', firstChunk);
            }
        } else {
            console.log('Unexpected result format:', fileContent);
        }
    } catch (error) {
        console.error(`Failed to directly call filesystem.read_file for ${filePathToRead}:`, error);
    }

    // Example: List directory contents directly
    console.log('\nDirectly calling filesystem.list_directory...');
    try {
        const directoryContents = await caller.callMcpTool(
            'filesystem',
            'list_directory',
            { path: '.' }
        );
        console.log('Directory contents:', directoryContents);
    } catch (error) {
        console.error('Failed to list directory:', error);
    }

    // Clean up MCP connections
    await mcpManager.disconnectAll();
}

main().catch((err) => {
    console.error('Error in example:', err);
    process.exit(1);
});
