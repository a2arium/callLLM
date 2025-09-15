import { LLMCaller } from '../src/core/caller/LLMCaller.ts';
import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define a Zod schema
const UserSchema = z.object({
    name: z.string().describe("The full name of the user. First name should start with A, Last name should start with W"),
    age: z.number(),
    interests: z.array(z.string())
});

async function main() {
    // Initialize the caller with OpenAI
    const caller = new LLMCaller(
        'openai',
        'fast',
        'You are a helpful assistant.'
    );

    try {
        // Example 1: Using Zod schema(recommended approach with properties at root level)
        console.log('\nExample 1: Using Zod schema for structured output');
        const response1 = await caller.call(
            'Generate a profile for a fictional user who loves technology',
            {
                jsonSchema: {
                    name: 'UserProfile',
                    schema: UserSchema
                },
                settings: {
                    temperature: 0.7
                }
            }
        );
        console.log('\nStructured Response:');
        console.log(JSON.stringify(response1[0].contentObject, null, 2));

        // Example 2: Using raw JSON Schema(recommended approach with properties at root level)
        console.log('\nExample 2: Using raw JSON Schema + force prompt enhancement mode');
        const recipeSchema = {
            type: 'object',
            properties: {
                name: { type: 'string' },
                preparationTime: { type: 'number' },
                difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
                ingredients: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            item: { type: 'string' },
                            amount: { type: 'string' }
                        },
                        required: ['item', 'amount']
                    }
                },
                steps: {
                    type: 'array',
                    items: { type: 'string' }
                }
            },
            required: ['name', 'preparationTime', 'difficulty', 'ingredients', 'steps']
        };
        const response2 = await caller.call(
            'Generate a recipe for a vegetarian pasta dish',
            {
                jsonSchema: {
                    name: 'Recipe',
                    schema: JSON.stringify(recipeSchema)
                },
                responseFormat: 'json',
                settings: {
                    jsonMode: 'force-prompt',
                    temperature: 0.7
                }
            }
        );
        console.log('\nJSON Schema Response:');
        console.log(JSON.stringify(response2[0].contentObject, null, 2));

        // Example 3: Simple JSON mode without schema (recommended approach with properties at root level)
        console.log('\nExample 3: Simple JSON mode without schema');
        const response3 = await caller.call(
            'List 3 programming languages and their main use cases',
            {
                responseFormat: 'json',
                settings: {
                    temperature: 0.7
                }
            }
        );
        console.log('\nParsed object:');
        console.log(JSON.stringify(response3[0].contentObject, null, 2));

        // Example 4: Streaming JSON with schema (recommended approach with properties at root level)
        console.log('\nExample 4: Streaming JSON with schema');
        const stream = await caller.stream(
            'Generate a profile for a fictional user named Bob who loves sports',
            {
                jsonSchema: {
                    name: 'UserProfile',
                    schema: UserSchema
                },
                responseFormat: 'json',
                settings: {
                    temperature: 0.7
                }
            }
        );
        console.log('\nStreaming Response:');
        for await (const chunk of stream) {
            // For non-complete chunks, show them incrementally
            if (!chunk.isComplete) {
                process.stdout.write(chunk.content);
            } else {
                // For the complete final chunk, we have two properties available:
                // 1. contentText - The complete accumulated text of the response
                // 2. contentObject - The parsed JSON object (when using JSON mode)
                // When streaming JSON responses, contentText contains the raw JSON string
                console.log("\n\nFinal raw JSON (length: " + (chunk.contentText?.length || 0) + "):");
                console.log(chunk.contentText);
                // When streaming JSON responses, contentObject contains the parsed object
                console.log("\nFinal contentObject (parsed JSON):");
                try {
                    console.log(JSON.stringify(chunk.contentObject, null, 2));

                } catch (err) {
                    console.log(chunk.contentObject);
                    console.log("\nError stringifying contentObject:", err);
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

main().catch(console.error); 