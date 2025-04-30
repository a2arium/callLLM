import { z } from 'zod';
import { LLMCaller } from '../src/core/caller/LLMCaller';

/**
 * Example: Directly using MCP tools without an LLM
 * 
 * This example demonstrates how to use MCP tools directly without LLM involvement.
 * You can call specific MCP tools with explicit parameters and get direct results.
 * It also shows how to use resources, prompts, and request options.
 *
 * Run with:
 *   yarn ts-node examples/mcpDirectTools.ts
 * 
 * For LLM-powered MCP tool usage, see examples/mcpClient.ts
 */
import type { MCPServerConfig, MCPServersMap, McpToolSchema } from '../src/core/mcp/MCPConfigTypes';
import { MCPServiceAdapter } from '../src/core/mcp/MCPServiceAdapter';

// Optional timeout for API requests (30 seconds)
const DEFAULT_TIMEOUT = 30000;

// Helper function to wait for a specific amount of time
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    let mcpAdapter: MCPServiceAdapter | undefined;

    try {
        // Define MCP servers map
        const mcpConfig: MCPServersMap = {
            // A local filesystem server (requires @modelcontextprotocol/server-filesystem)
            filesystem: {
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
                env: {
                    // Pass the current PATH environment variable to the child process
                    PATH: process.env.PATH || ''
                }
            }
        };

        // Create and initialize the MCP adapter for direct tool calls
        mcpAdapter = new MCPServiceAdapter(mcpConfig);

        // Connect to the filesystem server
        console.log('Connecting to MCP server...');
        await mcpAdapter.connectToServer('filesystem');

        console.log('Successfully connected to MCP server');

        // Create request options with timeout
        const requestOptions = {
            timeout: DEFAULT_TIMEOUT
        };

        // Helper to print parameters from schema
        function printParameterDetails(schema: McpToolSchema) {
            const zodSchema = schema.parameters;
            if (!zodSchema || typeof zodSchema.shape !== 'object' || !zodSchema.shape) {
                console.log('No parameter information available or schema shape is invalid.');
                return;
            }

            const shape = zodSchema.shape;
            const properties = Object.keys(shape);

            if (properties.length === 0) {
                console.log('Tool has no parameters defined.');
                return;
            }

            console.log('\nParameters:');
            properties.forEach(paramName => {
                const paramDef = shape[paramName];
                const isRequired = !paramDef.isOptional();
                const paramType = paramDef._def.typeName;
                const description = paramDef.description || 'No description';

                console.log(`  ${paramName}${isRequired ? ' (required)' : ''}:`);
                console.log(`    type: ${paramType}`);
                console.log(`    description: ${description}`);
            });
        }

        // Example: Get tool schemas for the filesystem server
        console.log('\nFetching tool schemas for server...');
        try {
            const mcpSchemas = await mcpAdapter.getMcpServerToolSchemas('filesystem');
            console.log(`\nFound ${mcpSchemas.length} tools:\n`);

            for (const schema of mcpSchemas) {
                console.log(`Tool: ${schema.name}`);
                console.log(`Description: ${schema.description}`);
                printParameterDetails(schema);
                console.log('-----------------------------------');
            }
        } catch (error) {
            console.error('Failed to get schemas:', error);
        }

        // Example: Directly execute the filesystem.read_file tool with parameters
        console.log('\nDirectly calling filesystem.read_file with proper parameters...');
        const filePathToRead = 'package.json'; // Example file
        try {
            // Using the executeMcpTool method
            const fileContent = await mcpAdapter.executeMcpTool(
                'filesystem',
                'read_file',
                { path: filePathToRead },
                requestOptions
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

        // Example: List directory contents directly with parameters and request options
        console.log('\nDirectly calling filesystem.list_directory with parameters...');
        try {
            // Create a request option with an AbortSignal
            const controller = new AbortController();
            const abortableRequestOptions = {
                ...requestOptions,
                signal: controller.signal
            };

            // Uncomment to test timeout/abort behavior
            // setTimeout(() => controller.abort(), 1); // Abort after 1ms

            const directoryContents = await mcpAdapter.executeMcpTool(
                'filesystem',
                'list_directory',
                {
                    path: '.',
                    // Example of including other parameters if the tool supports them
                    // hidden: true, 
                    // recursive: false
                },
                abortableRequestOptions
            );

            console.log('Directory contents (first 5 entries):');
            if (Array.isArray(directoryContents)) {
                console.log(directoryContents.slice(0, 5));
            } else {
                console.log(directoryContents);
            }
        } catch (error) {
            console.error('Failed to list directory:', error);
        }

        // Example: List resources (if server supports resources)
        console.log('\nChecking for resource capabilities...');
        try {
            // A more graceful approach to checking capabilities
            const shouldTryResources = await mcpAdapter.executeMcpTool('filesystem', 'list_allowed_directories', {})
                .then(() => {
                    // If we successfully called a filesystem tool, the server is responsive
                    console.log('Server is responsive, will attempt optional capabilities.');
                    return true;
                })
                .catch(() => {
                    console.log('Server appears to be having issues, skipping optional capabilities.');
                    return false;
                });

            if (shouldTryResources) {
                console.log('\nAttempting to list resources (optional capability)...');
                try {
                    const resources = await mcpAdapter.listResources('filesystem');
                    console.log(`Found ${resources.length} resources`);

                    if (resources.length > 0) {
                        console.log('First resource:', resources[0]);
                    }
                } catch (error) {
                    if (error instanceof Error && error.message.includes('Method not found')) {
                        console.log('Resource listing not supported by this server type.');
                    } else {
                        console.log('Resource listing failed:', error instanceof Error ? error.message : String(error));
                    }
                }

                // Example: List resource templates (if server supports them)
                console.log('\nAttempting to list resource templates (optional capability)...');
                try {
                    const templates = await mcpAdapter.listResourceTemplates('filesystem');
                    console.log(`Found ${templates.length} resource templates`);

                    if (templates.length > 0) {
                        console.log('First template:', templates[0]);
                    }
                } catch (error) {
                    if (error instanceof Error && error.message.includes('Method not found')) {
                        console.log('Resource templates not supported by this server type.');
                    } else {
                        console.log('Resource templates listing failed:', error instanceof Error ? error.message : String(error));
                    }
                }

                // Example: List prompts (if server supports prompts)
                console.log('\nAttempting to list prompts (optional capability)...');
                try {
                    const prompts = await mcpAdapter.listPrompts('filesystem');
                    console.log(`Found ${prompts.length} prompts`);

                    if (prompts.length > 0) {
                        // If we found prompts, try to get one
                        const firstPrompt = prompts[0];
                        console.log('First prompt:', firstPrompt);

                        console.log(`\nAttempting to get prompt: ${firstPrompt.name}`);

                        const promptResult = await mcpAdapter.getPrompt('filesystem', {
                            name: firstPrompt.name
                        });

                        console.log('Prompt result:', promptResult);
                    }
                } catch (error) {
                    if (error instanceof Error && error.message.includes('Method not found')) {
                        console.log('Prompts not supported by this server type.');
                    } else {
                        console.log('Prompts listing failed:', error instanceof Error ? error.message : String(error));
                    }
                }
            }
        } catch (error) {
            console.error('Error checking server capabilities:', error);
        }
    } catch (error) {
        console.error('Error in example:', error);
    } finally {
        // Clean up
        if (mcpAdapter) {
            console.log('\nDisconnecting from MCP server...');
            try {
                await mcpAdapter.disconnectAll();
                console.log('Disconnected successfully');
                process.exit(0);
            } catch (cleanupError) {
                console.error('Error during cleanup:', cleanupError);
            }
        }
    }
}

// Execute the example
main().catch(error => {
    console.error('Error in example:', error);
    process.exit(1);
});
