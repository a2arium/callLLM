import fs from 'fs';
import path from 'path';
import { FunctionFileParser } from './FunctionFileParser';
import { ParsedFunctionMeta, ToolParsingError } from './types';
import type { ToolDefinition } from '../../../types/tooling';
import { logger } from '../../../utils/logger';

/**
 * Manages a folder of tool function files
 */
export class ToolsFolderLoader {
    private functionFileParser: FunctionFileParser;
    private toolsDir: string;
    private fileCache: Map<string, ParsedFunctionMeta>;
    private toolDefinitionCache: Map<string, Promise<ToolDefinition>>;
    private log = logger.createLogger({ prefix: 'ToolsFolderLoader' });

    constructor(toolsDir: string) {
        this.toolsDir = path.resolve(toolsDir);
        this.functionFileParser = new FunctionFileParser();
        this.fileCache = new Map<string, ParsedFunctionMeta>();
        this.toolDefinitionCache = new Map<string, Promise<ToolDefinition>>();

        // Validate the directory exists
        if (!fs.existsSync(this.toolsDir)) {
            throw new Error(`Tools directory not found: ${this.toolsDir}`);
        }

        if (!fs.statSync(this.toolsDir).isDirectory()) {
            throw new Error(`Path is not a directory: ${this.toolsDir}`);
        }

        this.log.debug(`Initializing tool folder loader for directory: ${this.toolsDir}`);

        // Scan the directory to build the initial cache
        this.scanDirectory();
    }

    /**
     * Scans the tools directory to build the file cache
     */
    private scanDirectory(): void {
        try {
            const files = fs.readdirSync(this.toolsDir);

            // Handle null or undefined results
            if (!files) {
                this.log.warn(`No files found in directory: ${this.toolsDir}`);
                return;
            }

            // Process only TypeScript files
            const tsFiles = files.filter(file => file.endsWith('.ts'));

            this.log.debug(`Found ${tsFiles.length} TypeScript files in ${this.toolsDir}: ${tsFiles.join(', ')}`);

            // Parse each file (doesn't import them yet)
            for (const file of tsFiles) {
                try {
                    const filePath = path.join(this.toolsDir, file);
                    this.log.debug(`Parsing file: ${filePath}`);
                    const metadata = this.functionFileParser.parseFile(filePath);
                    const toolName = path.basename(file, '.ts');
                    this.log.debug(`Successfully parsed tool '${toolName}' from file ${file}`);
                    this.fileCache.set(toolName, metadata);
                }
                catch (error) {
                    // Log parsing errors but don't stop processing
                    this.log.warn(`Error parsing tool file ${file}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }

            const availableTools = Array.from(this.fileCache.keys());
            this.log.debug(`Successfully cached ${this.fileCache.size} tool function files. Available tools: ${availableTools.join(', ')}`);
        }
        catch (error) {
            this.log.error(`Error scanning tools directory: ${error instanceof Error ? error.message : String(error)}`);
            throw new Error(`Failed to scan tools directory: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Gets a list of all available tool names in the folder
     * @returns Array of tool names
     */
    public getAvailableTools(): string[] {
        return Array.from(this.fileCache.keys());
    }

    /**
     * Validates that a tool exists in the folder
     * @param name - The name of the tool
     * @returns True if the tool exists, false otherwise
     */
    public hasToolFunction(name: string): boolean {
        return this.fileCache.has(name);
    }

    /**
     * Gets a tool definition from the folder
     * @param name - The name of the tool to get
     * @returns A promise resolving to the ToolDefinition
     * @throws Error if the tool is not found
     */
    public async getTool(name: string): Promise<ToolDefinition> {
        this.log.debug(`Getting tool: ${name}`);

        // Check cache first
        const cachedTool = this.toolDefinitionCache.get(name);
        if (cachedTool) {
            this.log.debug(`Found cached tool definition for '${name}'`);
            return cachedTool;
        }

        // Check if the file exists
        if (!this.hasToolFunction(name)) {
            const availableTools = this.getAvailableTools();
            this.log.error(`Tool function '${name}' not found in directory: ${this.toolsDir}. Available tools: ${availableTools.join(', ')}`);
            throw new Error(`Tool function '${name}' not found in directory: ${this.toolsDir}. Available tools: ${availableTools.join(', ')}`);
        }

        this.log.debug(`Creating tool definition for '${name}'`);

        // Create a promise for the tool definition
        const toolPromise = this.createToolDefinition(name);

        // Cache the promise
        this.toolDefinitionCache.set(name, toolPromise);

        return toolPromise;
    }

    /**
     * Gets all tools in the folder as ToolDefinitions
     * @returns A promise resolving to an array of ToolDefinitions
     */
    public async getAllTools(): Promise<ToolDefinition[]> {
        const toolNames = this.getAvailableTools();
        const toolPromises = toolNames.map(name => this.getTool(name));
        return Promise.all(toolPromises);
    }

    /**
     * Creates a ToolDefinition for a given tool function
     * @param name - The name of the tool function
     * @returns A promise resolving to the ToolDefinition
     */
    /* istanbul ignore next */
    private async createToolDefinition(name: string): Promise<ToolDefinition> {
        try {
            const metadata = this.fileCache.get(name);
            if (!metadata) {
                throw new Error(`Tool function metadata for '${name}' not found`);
            }

            // Create the tool definition with a wrapper for the callFunction
            const toolDefinition: ToolDefinition = {
                name: metadata.name,
                description: metadata.description,
                parameters: metadata.schema,
                callFunction: async <TParams extends Record<string, unknown>, TResponse>(
                    params: TParams
                ): Promise<TResponse> => {
                    try {
                        /* istanbul ignore next */
                        // The following dynamic import code is difficult to test in Jest
                        // and requires special environment setup
                        {
                            // Dynamically import the module
                            const modulePath = metadata.runtimePath;
                            // Use dynamic import() to load the module
                            const module = await import(modulePath);

                            // Get the toolFunction from the module
                            const { toolFunction } = module;

                            if (typeof toolFunction !== 'function') {
                                throw new Error(`Tool function '${name}' is not a function`);
                            }

                            // Call the function with the provided parameters
                            const result = await toolFunction(params);
                            return result as TResponse;
                        }
                    } catch (error) {
                        this.log.error(`Error executing tool function '${name}': ${error instanceof Error ? error.message : String(error)}`);
                        throw new Error(`Failed to execute tool function '${name}': ${error instanceof Error ? error.message : String(error)}`);
                    }
                }
            };

            return toolDefinition;
        } catch (error) {
            this.log.error(`Error creating tool definition for '${name}': ${error instanceof Error ? error.message : String(error)}`);
            throw new Error(`Failed to create tool definition for '${name}': ${error instanceof Error ? error.message : String(error)}`);
        }
    }
} 