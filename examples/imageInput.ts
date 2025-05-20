/**
 * Image Input Example
 * 
 * This example demonstrates how to use callLLM to:
 * 1. Send an image with text for multimodal models
 * 2. Use multiple images in a single query
 * 3. Stream responses with image inputs
 * 4. Use JSON output format with image inputs
 */
import { LLMCaller } from '../src/index.js';
import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';
import { getDirname } from '../src/utils/paths.js';

// Get the directory name using the utility function
const __dirname = getDirname();

// Load environment variables
dotenv.config();

async function runExamples() {
    // Initialize with a multimodal model
    const caller = new LLMCaller('openai', 'gpt-4.1-nano', 'You are a helpful assistant.');

    try {
        console.log('\n\n=========================================');
        console.log('Example 1: Image + text call with URL');
        console.log('=========================================\n');

        // URL + text example with a public image URL
        const imageResponse = await caller.call({
            text: "Analyze this image",
            file: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg",
            input: {
                image: {
                    detail: "high"
                }
            }
        });

        console.log(`Response:`, imageResponse[0].content);
        console.log(`Usage:`, imageResponse[0].metadata?.usage);

        console.log('\n\n=========================================');
        console.log('Example 2: Local image with JSON output');
        console.log('=========================================\n');

        const stream = await caller.stream({
            text: "Get the data from the table in the image",
            file: path.join(__dirname, 'table.png'),
            input: {
                image: {
                    detail: "high"
                }
            },
            jsonSchema: {
                name: 'Animals',
                schema: z.object({
                    animals: z.array(z.object({
                        type: z.string(),
                        name: z.string()
                    }))
                })
            }
        });

        for await (const chunk of stream) {
            process.stdout.write(chunk.content);
            if (chunk.isComplete) {
                console.log('\n');
                console.log('Final usage:', chunk.metadata?.usage);
            }
        }

        console.log('\n\n=========================================');
        console.log('Example 3: Multiple images using file paths');
        console.log('=========================================\n');

        const imageResponseCompare = await caller.call({
            files: [
                path.join(__dirname, 'dogs.jpg'),
                "https://upload.wikimedia.org/wikipedia/commons/6/6e/Golde33443.jpg"
            ],
            text: "Compare these two dog images and tell me their breeds and differences.",
            input: {
                image: {
                    detail: "auto" // Automatically determine detail level
                }
            }
        });

        console.log(`Response:`, imageResponseCompare[0].content);

    } catch (error) {
        console.error('Error processing image:', error);
    }
}

// Run the examples
runExamples().catch(console.error); 