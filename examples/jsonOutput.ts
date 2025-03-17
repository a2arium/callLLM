import { LLMCaller } from '../src/core/caller/LLMCaller';
import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
    // Initialize the caller with OpenAI
    const caller = new LLMCaller(
        'openai',
        'cheap',
        'You are a helpful assistant.'
    );

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
        // // Example 1: Using Zod schema
        // console.log('\nExample 1: Using Zod schema for structured output');
        // const response1 = await caller.chatCall({
        //     message: 'Generate a profile for a fictional user named Alice who loves technology',
        //     settings: {
        //         temperature: 0.7,
        //         jsonSchema: {
        //             name: 'UserProfile',
        //             schema: UserSchema
        //         },
        //         responseFormat: 'json'
        //     }
        // });

        // console.log('\nStructured Response:');
        // console.log(JSON.stringify(response1.contentObject, null, 2));


        // // Example 2: Using raw JSON Schema
        // console.log('\nExample 2: Using raw JSON Schema');
        // const recipeSchema = {
        //     type: 'object',
        //     properties: {
        //         name: { type: 'string' },
        //         preparationTime: { type: 'number' },
        //         difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
        //         ingredients: {
        //             type: 'array',
        //             items: {
        //                 type: 'object',
        //                 properties: {
        //                     item: { type: 'string' },
        //                     amount: { type: 'string' }
        //                 },
        //                 required: ['item', 'amount']
        //             }
        //         },
        //         steps: {
        //             type: 'array',
        //             items: { type: 'string' }
        //         }
        //     },
        //     required: ['name', 'preparationTime', 'difficulty', 'ingredients', 'steps']
        // };

        // const response2 = await caller.chatCall({
        //     message: 'Generate a recipe for a vegetarian pasta dish',
        //     settings: {
        //         temperature: 0.7,
        //         jsonSchema: {
        //             name: 'Recipe',
        //             schema: JSON.stringify(recipeSchema)
        //         },
        //         responseFormat: 'json'
        //     }
        // });

        // console.log('\nJSON Schema Response:');
        // console.log(JSON.stringify(response2.contentObject, null, 2));

        // // Example 3: Simple JSON mode without schema
        // console.log('\nExample 3: Simple JSON mode without schema');
        // const response3 = await caller.chatCall({
        //     message: 'List 3 programming languages and their main use cases',
        //     settings: {
        //         temperature: 0.7,
        //         responseFormat: 'json'
        //     }
        // });

        // console.log('\nParsed object:');
        // console.log(JSON.stringify(response3.contentObject, null, 2));

        // Example 4: Streaming JSON with schema
        console.log('\nExample 4: Streaming JSON with schema');
        const stream = await caller.streamCall({
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
        let accumulatedContent = '';

        for await (const chunk of stream) {
            // Track all received content
            accumulatedContent += chunk.content;

            if (chunk.isComplete) {
                console.log("\nFinal raw JSON (hex representation to show any invisible characters):");
                console.log(accumulatedContent.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' '));

                console.log("\nFinal raw JSON (length: " + accumulatedContent.length + "):");
                console.log(accumulatedContent);

                console.log("\nFinal contentObject:");
                try {
                    console.log(JSON.stringify(chunk.contentObject, null, 2));
                } catch (err) {
                    console.log(chunk.contentObject);
                    console.log("\nError stringifying contentObject:", err);
                }

                console.log("\nContentObject type:", typeof chunk.contentObject);
                console.log("\nIs null or undefined:", chunk.contentObject === null || chunk.contentObject === undefined);

                // Look for duplicate content
                const halfLength = Math.floor(accumulatedContent.length / 2);
                if (halfLength > 0) {
                    const firstHalf = accumulatedContent.substring(0, halfLength);
                    const secondHalf = accumulatedContent.substring(halfLength);
                    console.log("\nIs content duplicated?", firstHalf === secondHalf);

                    // Try parsing just the first half
                    try {
                        const parsed = JSON.parse(firstHalf);
                        console.log("\nFirst half parsed successfully:", parsed);
                    } catch (err) {
                        console.log("\nFirst half parse error:", err);
                    }
                }

                // Try directly accessing properties
                if (chunk.contentObject) {
                    try {
                        // Use type assertion to access properties
                        const typedObject = chunk.contentObject as {
                            name?: string;
                            age?: number;
                        };
                        console.log("\nName:", typedObject.name);
                        console.log("Age:", typedObject.age);
                    } catch (err) {
                        console.log("\nProperty access error:", err);
                    }
                }
            } else {
                process.stdout.write(chunk.content);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

main(); 