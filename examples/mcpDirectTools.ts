import { z } from 'zod';
import type { MCPServerConfig, MCPServersMap, McpToolSchema } from '../src/core/mcp/MCPConfigTypes';
import { MCPServiceAdapter } from '../src/core/mcp/MCPServiceAdapter';

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
 * Run with specific server:
 *   yarn ts-node examples/mcpDirectTools.ts filesystem
 * 
 * For LLM-powered MCP tool usage, see examples/mcpClient.ts
 */

// Constants
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_SERVER = 'filesystem';

// Interfaces and Types
type RequestOptions = {
    timeout?: number;
    signal?: AbortSignal;
};

// Server configuration functions
function getServerConfigs(): MCPServersMap {
    return {
        // A local filesystem server
        filesystem: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
            env: {
                PATH: process.env.PATH || ''
            }
        },
        puppeteer: {
            "command": "docker",
            "args": [
                "run",
                "-i",
                "--rm",
                "--init",
                "-e",
                "DOCKER_CONTAINER=true",
                "mcp/puppeteer"
            ]
        },
        "skeet.build": {
            "url": "https://skeet.sh/ot/bec485d7744e8ecccc86f81561f4ef9ce32fad43ee3da1fc86073347887cdea9",
            "mode": "sse"  // Use SSE transport directly - more reliable for skeet.build
        }
        // Add more server configurations as needed
        // Example:
        // sqlite: {
        //   command: 'npx',
        //   args: ['-y', '@modelcontextprotocol/server-sqlite', 'path/to/db.sqlite'],
        //   env: { PATH: process.env.PATH || '' }
        // }
    };
}

// Helper functions
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

function printParameterDetails(schema: McpToolSchema): void {
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

        // Extract description from Zod schema properly
        let description = 'No description';

        // Check for description in the schema definition
        if (paramDef.description) {
            description = paramDef.description;
        } else if (paramDef._def && paramDef._def.description) {
            description = paramDef._def.description;
        }

        console.log(`  ${paramName}${isRequired ? ' (required)' : ''}:`);
        console.log(`    type: ${paramType}`);
        console.log(`    description: ${description}`);
    });
}

// Create default request options
function createRequestOptions(signal?: AbortSignal): RequestOptions {
    return {
        timeout: DEFAULT_TIMEOUT,
        ...(signal && { signal })
    };
}

// Core functionality modular functions
async function setupAdapter(): Promise<MCPServiceAdapter> {
    const mcpConfig = getServerConfigs();
    return new MCPServiceAdapter(mcpConfig);
}

async function connectToServer(
    adapter: MCPServiceAdapter,
    serverName: string
): Promise<void> {
    console.log(`Connecting to MCP server '${serverName}'...`);
    await adapter.connectToServer(serverName);
    console.log(`Successfully connected to '${serverName}'`);
}

async function listToolSchemas(
    adapter: MCPServiceAdapter,
    serverName: string
): Promise<McpToolSchema[]> {
    console.log(`\nFetching tool schemas for server '${serverName}'...`);
    try {
        const mcpSchemas = await adapter.getMcpServerToolSchemas(serverName);
        console.log(`\nFound ${mcpSchemas.length} tools:\n`);

        for (const schema of mcpSchemas) {
            console.log(`Tool: ${schema.name}`);
            console.log(`Description: ${schema.description}`);
            printParameterDetails(schema);
            console.log('-----------------------------------');
        }

        return mcpSchemas;
    } catch (error) {
        console.error('Failed to get schemas:', error);
        return [];
    }
}

async function executeReadFile(
    adapter: MCPServiceAdapter,
    serverName: string,
    filePath: string = 'package.json'
): Promise<void> {
    console.log(`\nDirectly calling ${serverName}.read_file with parameters...`);
    try {
        const requestOptions = createRequestOptions();
        const fileContent = await adapter.executeMcpTool(
            serverName,
            'read_file',
            { path: filePath },
            requestOptions
        );
        console.log(`Content of ${filePath} (first 300 chars):`);

        // Process the response format
        if (typeof fileContent === 'object' &&
            fileContent !== null &&
            'content' in fileContent &&
            Array.isArray(fileContent.content) &&
            fileContent.content.length > 0) {

            // Extract the text from the first chunk
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
        console.error(`Failed to directly call ${serverName}.read_file for ${filePath}:`, error);
    }
}

async function executeListDirectory(
    adapter: MCPServiceAdapter,
    serverName: string,
    dirPath: string = '.'
): Promise<void> {
    console.log(`\nDirectly calling ${serverName}.list_directory with parameters...`);
    try {
        // Create a request option with an AbortSignal
        const controller = new AbortController();
        const requestOptions = createRequestOptions(controller.signal);

        // Uncomment to test timeout/abort behavior
        // setTimeout(() => controller.abort(), 1); // Abort after 1ms

        const directoryContents = await adapter.executeMcpTool(
            serverName,
            'list_directory',
            {
                path: dirPath,
                // Example of including other parameters if the tool supports them
                // hidden: true, 
                // recursive: false
            },
            requestOptions
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
}

async function testServerResponsiveness(
    adapter: MCPServiceAdapter,
    serverName: string
): Promise<boolean> {
    return adapter.executeMcpTool(serverName, 'list_allowed_directories', {})
        .then(() => {
            console.log('Server is responsive, will attempt optional capabilities.');
            return true;
        })
        .catch(() => {
            console.log('Server appears to be having issues, skipping optional capabilities.');
            return false;
        });
}

async function testListResources(
    adapter: MCPServiceAdapter,
    serverName: string
): Promise<void> {
    console.log('\nAttempting to list resources (optional capability)...');
    try {
        const resources = await adapter.listResources(serverName);
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
}

async function testListResourceTemplates(
    adapter: MCPServiceAdapter,
    serverName: string
): Promise<void> {
    console.log('\nAttempting to list resource templates (optional capability)...');
    try {
        const templates = await adapter.listResourceTemplates(serverName);
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
}

async function testPrompts(
    adapter: MCPServiceAdapter,
    serverName: string
): Promise<void> {
    console.log('\nAttempting to list prompts (optional capability)...');
    try {
        const prompts = await adapter.listPrompts(serverName);
        console.log(`Found ${prompts.length} prompts`);

        if (prompts.length > 0) {
            // If we found prompts, try to get one
            const firstPrompt = prompts[0];
            console.log('First prompt:', firstPrompt);

            console.log(`\nAttempting to get prompt: ${firstPrompt.name}`);

            const promptResult = await adapter.getPrompt(serverName, {
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

async function testOptionalCapabilities(
    adapter: MCPServiceAdapter,
    serverName: string
): Promise<void> {
    console.log('\nChecking for resource capabilities...');
    try {
        const shouldTryResources = await testServerResponsiveness(adapter, serverName);

        if (shouldTryResources) {
            await testListResources(adapter, serverName);
            await testListResourceTemplates(adapter, serverName);
            await testPrompts(adapter, serverName);
        }
    } catch (error) {
        console.error('Error checking server capabilities:', error);
    }
}

async function disconnectServer(
    adapter: MCPServiceAdapter
): Promise<void> {
    console.log('\nDisconnecting from MCP server...');
    try {
        await adapter.disconnectAll();
        console.log('Disconnected successfully');
    } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
    }
}

// Main execution function
async function main(): Promise<void> {
    // Get server name from command line arguments or use default
    const serverName = process.argv[2] || DEFAULT_SERVER;

    if (!(serverName in getServerConfigs())) {
        console.error(`Error: Server '${serverName}' is not configured.`);
        console.log('Available servers:');
        Object.keys(getServerConfigs()).forEach(name => console.log(`- ${name}`));
        process.exit(1);
    }

    let mcpAdapter: MCPServiceAdapter | undefined;

    try {
        // Initialize the adapter
        mcpAdapter = await setupAdapter();

        // Connect to the selected server
        await connectToServer(mcpAdapter, serverName);

        // Get tool schemas
        const schemas = await listToolSchemas(mcpAdapter, serverName);

        // Execute some example tools
        if (serverName === 'filesystem') {
            await executeReadFile(mcpAdapter, serverName);
            await executeListDirectory(mcpAdapter, serverName);
        }

        // Test optional capabilities
        await testOptionalCapabilities(mcpAdapter, serverName);
    } catch (error) {
        console.error('Error in example:', error);
    } finally {
        // Disconnect
        if (mcpAdapter) {
            await disconnectServer(mcpAdapter);
        }
    }
}

// Entry point with error handling
if (require.main === module) {
    main().catch(error => {
        console.error('Error in example:', error);
        process.exit(1);
    });
}

// Export functions for potential reuse
export {
    setupAdapter,
    connectToServer,
    listToolSchemas,
    executeReadFile,
    executeListDirectory,
    testOptionalCapabilities,
    disconnectServer
};
