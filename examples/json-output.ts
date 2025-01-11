import { LLMCaller } from '../src/core/LLMCaller';
import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
    // Initialize the caller with OpenAI
    const caller = new LLMCaller('openai', 'gpt-4o-mini', 'You are a helpful assistant.');

    // Define a Zod schema for user information
    const UserSchema = z.object({
        name: z.string(),
        age: z.number(),
        email: z.string(),
        interests: z.array(z.string()),
        address: z.object({
            street: z.string(),
            city: z.string(),
            country: z.string()
        })
    });

    try {
        // Example 1: Using Zod schema
        console.log('\nExample 1: Using Zod schema for structured output');
        const response1 = await caller.chatCall<typeof UserSchema>({
            message: 'Generate a profile for a fictional user named Alice who loves technology',
            settings: {
                temperature: 0.7,
                jsonSchema: {
                    name: 'UserProfile',
                    schema: UserSchema
                },
                responseFormat: 'json'
            }
        });

        console.log('\nStructured Response:');
        console.log(JSON.stringify(response1.content, null, 2));
        console.log('\nValidation: The response is guaranteed to match the schema');
        console.log('Type safety: response.content is fully typed');

        // Example 2: Using raw JSON Schema
        console.log('\nExample 2: Using raw JSON Schema');
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

        const response2 = await caller.chatCall({
            message: 'Generate a recipe for a vegetarian pasta dish',
            settings: {
                temperature: 0.7,
                jsonSchema: {
                    name: 'Recipe',
                    schema: JSON.stringify(recipeSchema)
                },
                responseFormat: 'json'
            }
        });

        console.log('\nJSON Schema Response:');
        console.log(JSON.stringify(response2.content, null, 2));

        // Example 3: Simple JSON mode without schema
        console.log('\nExample 3: Simple JSON mode without schema');
        const response3 = await caller.chatCall({
            message: 'List 3 programming languages and their main use cases',
            settings: {
                responseFormat: 'json'
            }
        });

        console.log('\nBasic JSON Response:');
        console.log(JSON.stringify(response3.content, null, 2));

        // Example 4: Streaming JSON with schema
        console.log('\nExample 4: Streaming JSON with schema');
        const stream = await caller.streamCall<typeof UserSchema>({
            message: 'Generate a profile for a fictional user named Bob who loves sports',
            settings: {
                temperature: 0.7,
                jsonSchema: {
                    name: 'UserProfile',
                    schema: UserSchema
                },
                responseFormat: 'json'
            }
        });

        console.log('\nStreaming Response:');
        for await (const chunk of stream) {
            if (chunk.isComplete) {
                console.log("\nFinal structured data:");
                console.log(JSON.stringify(chunk.content, null, 2));
            } else {
                process.stdout.write(chunk.content);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

main(); 