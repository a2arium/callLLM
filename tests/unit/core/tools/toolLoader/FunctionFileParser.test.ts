import { FunctionFileParser } from '../../../../../src/core/tools/toolLoader/FunctionFileParser';
import { ToolParsingError, ParsedFunctionMeta } from '../../../../../src/core/tools/toolLoader/types';
import path from 'path';
import { Project } from 'ts-morph';
import os from 'os';
import fs from 'fs/promises';

// Helper function to create a temporary file with given content
async function createTempFile(content: string, fileName: string = 'testTool.ts'): Promise<string> {
    // Use process.cwd() based temp directory for potentially better compatibility/permissions
    const tempDirParent = path.join(process.cwd(), 'temp-test-files');
    await fs.mkdir(tempDirParent, { recursive: true });
    const tempDir = await fs.mkdtemp(path.join(tempDirParent, 'callllm-test-'));
    const filePath = path.join(tempDir, fileName);
    await fs.writeFile(filePath, content);
    return filePath;
}

// Helper function to clean up temporary directory
async function cleanupTempDir(filePath: string): Promise<void> {
    if (!filePath) return;
    const tempDir = path.dirname(filePath);
    try {
        // Check if directory exists before attempting removal
        await fs.access(tempDir);
        await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error: any) {
        // Ignore errors if the directory doesn't exist (e.g., ENOENT)
        if (error.code !== 'ENOENT') {
            console.error(`Failed to cleanup temp dir ${tempDir}:`, error);
        }
    }
}

describe('FunctionFileParser', () => {
    let parser: FunctionFileParser;
    const createdFiles: string[] = []; // Track all created files for cleanup

    beforeEach(() => {
        parser = new FunctionFileParser();
    });

    afterEach(async () => {
        // Cleanup all files created during tests
        for (const filePath of createdFiles) {
            await cleanupTempDir(filePath);
        }
        createdFiles.length = 0; // Clear the array
        // Reset the parser's project/cache if necessary
        // parser = new FunctionFileParser(); // Re-creating might be safest
    });

    // Helper to manage created file paths
    const manageCleanup = (filePath: string) => {
        createdFiles.push(filePath);
        return filePath;
    };

    it('should correctly parse a function file with enum and string literal union parameters', async () => {
        const fileContent = `
// Get a random fact about a topic

export enum Topic {
    General = "general",
    Animal = "animal",
    Space = "space"
}

export type GetFactParams = {
    // The topic to get a fact about.
    topic: Topic;
    // The mood to get a fact in.
    mood?: 'funny' | 'serious' | 'inspiring';
}

// Get a random fact about a topic
export function toolFunction(params: GetFactParams): { fact: string; source?: string } {
    console.log(\`getFact tool called with topic: \${params.topic} and mood: \${params.mood}\`);
    return { fact: "The sky is blue.", source: "common knowledge" };
}
        `;
        const filePath = manageCleanup(await createTempFile(fileContent, 'getFact.ts'));
        const expectedSchema = {
            type: 'object',
            properties: {
                topic: {
                    type: 'string',
                    description: 'The topic to get a fact about.',
                    enum: ['general', 'animal', 'space']
                },
                mood: {
                    type: 'string',
                    description: 'The mood to get a fact in.',
                    enum: ['funny', 'serious', 'inspiring']
                }
            },
            required: ['topic']
        };

        const result = parser.parseFile(filePath);

        expect(result.name).toBe('getFact');
        expect(result.description).toBe('Get a random fact about a topic');
        expect(result.runtimePath).toBe(filePath);
        expect(result.schema.type).toEqual(expectedSchema.type);
        expect(result.schema.properties).toEqual(expectedSchema.properties);
        expect(result.schema.required?.sort()).toEqual(expectedSchema.required.sort());
    });

    it('should throw ToolParsingError if toolFunction is missing', async () => {
        const fileContent = `
// Just a regular file
export function someOtherFunction() { return 1; }
        `;
        const filePath = manageCleanup(await createTempFile(fileContent, 'noToolFunction.ts'));
        expect(() => parser.parseFile(filePath)).toThrow(ToolParsingError);
        expect(() => parser.parseFile(filePath)).toThrow(/Function 'toolFunction' not found/);
    });

    it('should throw ToolParsingError if function description is missing', async () => {
        const fileContent = `
export function toolFunction(params: { name: string }): string {
    return \`Hello, \${params.name}\`;
}
        `;
        const filePath = manageCleanup(await createTempFile(fileContent, 'noDescription.ts'));
        expect(() => parser.parseFile(filePath)).toThrow(ToolParsingError);
        expect(() => parser.parseFile(filePath)).toThrow(/No description found for function 'toolFunction'/);
    });

    it('should parse JSDoc descriptions for function and inline params', async () => {
        const fileContent = `
/**
 * Adds two numbers together.
 * @param params - The input parameters.
 * @param params.a - The first number.
 * @param params.b - The second number (optional).
 * @returns The sum of the two numbers.
 */
export function toolFunction(params: { a: number; b?: number }): { sum: number } {
    const b = params.b ?? 0;
    return { sum: params.a + b };
}
        `;
        const filePath = manageCleanup(await createTempFile(fileContent, 'addNumbers.ts'));
        const result = parser.parseFile(filePath);

        expect(result.name).toBe('addNumbers');
        expect(result.description).toBe('Adds two numbers together.');
        expect(result.schema.properties).toEqual({
            a: { type: 'number', description: 'The first number.' },
            b: { type: 'number', description: 'The second number (optional).' }
        });
        expect(result.schema.required?.sort()).toEqual(['a'].sort());
    });

    it('should parse standard comments for function and type properties', async () => {
        const fileContent = `
// Greets a person by name.

type GreetParams = {
    // The name of the person to greet.
    name: string;
    // An optional title.
    title?: string;
}

export function toolFunction(params: GreetParams): string {
    return \`Hello, \${params.title ? params.title + ' ' : ''}\${params.name}!\`;
}
        `;
        const filePath = manageCleanup(await createTempFile(fileContent, 'greetPerson.ts'));
        const result = parser.parseFile(filePath);

        expect(result.name).toBe('greetPerson');
        expect(result.description).toBe('Greets a person by name.');
        expect(result.schema.properties).toEqual({
            name: { type: 'string', description: 'The name of the person to greet.' },
            title: { type: 'string', description: 'An optional title.' }
        });
        expect(result.schema.required?.sort()).toEqual(['name'].sort());
    });

    it('should handle block comment for function description', async () => {
        const fileContent = `
/* Subtracts the second number from the first. */
export function toolFunction(params: { x: number; y: number }): number {
    return params.x - params.y;
}
        `;
        const filePath = manageCleanup(await createTempFile(fileContent, 'subtract.ts'));
        const result = parser.parseFile(filePath);
        expect(result.description).toBe('Subtracts the second number from the first.');
        expect(result.name).toBe('subtract');
    });

    it('should handle JSDoc comments on type properties', async () => {
        const fileContent = `
// Configures user settings.

type UserConfig = {
    /** The user\'s unique identifier. */
    userId: string;
    /** Notification preferences (optional). */
    notifications?: boolean;
}

export function toolFunction(params: UserConfig): { status: string } {
    return { status: 'Configured' };
}
        `;
        const filePath = manageCleanup(await createTempFile(fileContent, 'userConfig.ts'));
        const result = parser.parseFile(filePath);
        expect(result.description).toBe('Configures user settings.');
        expect(result.schema.properties).toEqual({
            userId: { type: 'string', description: "The user's unique identifier." },
            notifications: { type: 'boolean', description: 'Notification preferences (optional).' }
        });
        expect(result.schema.required?.sort()).toEqual(['userId'].sort());
    });

    it('should handle empty parameter list', async () => {
        const fileContent = `
// Returns the current date and time.
export function toolFunction(): string {
    return new Date().toISOString();
}
        `;
        const filePath = manageCleanup(await createTempFile(fileContent, 'getDate.ts'));
        const result = parser.parseFile(filePath);
        expect(result.description).toBe('Returns the current date and time.');
        expect(result.schema.properties).toEqual({});
        expect(result.schema.required).toBeUndefined(); // Or expect([]), depending on desired behavior
    });

    // Add more tests: complex types, different JSDoc formats, edge cases etc.
}); 