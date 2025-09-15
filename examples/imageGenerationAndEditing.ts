/**
 * Image Generation and Editing Examples
 * 
 * This example demonstrates how to use callLLM to:
 * 1. Generate images using prompts
 * 2. Edit existing images
 * 3. Edit images with a mask
 * 4. Save generated images to file
 * 5. Get images as base64 data
 */
import { LLMCaller } from '../src/index.ts';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import type { UsageData } from '../src/interfaces/UsageInterfaces.ts';
import { getDirname } from '../src/utils/paths.ts';

// Get the directory name using the utility function
const __dirname = getDirname(import.meta.url);

// Load environment variables
dotenv.config();

// Ensure output directory exists
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Example usage callback
const usageCallback = (usageData: UsageData) => {
    console.log(`Usage for caller ${usageData.callerId}:`, JSON.stringify(usageData.usage, null, 2));
};

async function runExamples() {
    // Initialize with a model that supports image generation
    const caller = new LLMCaller('openai', 'gpt-image-1', '', { usageCallback });

    try {
        // console.log('\n===========================================');
        // console.log('Example 1: Generate an image and save to file');
        // console.log('===========================================\n');

        // const result1 = await caller.call({
        //     text: "A surreal mountain landscape image featuring floating islands, upside-down mountains, and unconventional flora. Include a dreamlike quality, pushing the boundaries of reality. Conjure a scene that has imaginative and otherworldly elements.",
        //     output: {
        //         image: {
        //             quality: "low",
        //             size: "1024x1024"
        //         }
        //     },
        //     outputPath: path.join(outputDir, 'mountain_landscape.png')
        // });


        // console.log('\nUsage data:');
        // console.log(JSON.stringify(result1[0].metadata?.usage, null, 2));


        // console.log('\n===========================================');
        // console.log('Example 2: Generate an image and get as base64');
        // console.log('===========================================\n');

        // const result2 = await caller.call({
        //     text: "A peaceful mountain landscape with a lake and forest",
        //     output: {
        //         image: {
        //             quality: "medium",
        //             size: "1024x1024"
        //         }
        //     }
        // });

        // console.log('Generated image returned as base64 data. Length:',
        //     result2[0].image?.data ? result2[0].image.data.length : 0);

        // console.log('\nUsage data:');
        // console.log(JSON.stringify(result2[0].metadata?.usage, null, 2));



        // console.log('\n===========================================');
        // console.log('Example 3: Edit an existing image');
        // console.log('===========================================\n');

        // try {
        //     // Use files array instead of file parameter
        //     const editResponse = await caller.call({
        //         text: "Add a small cabin to this landscape",
        //         files: [path.join(outputDir, 'mountain_landscape.png')], // Use files array instead of file
        //         output: {
        //             image: {
        //                 quality: "low"
        //             }
        //         },
        //         outputPath: path.join(outputDir, 'mountain_landscape_cabin.png')
        //     });

        //     console.log('Edited image saved to:', editResponse[0].metadata?.imageSavedPath);
        // } catch (error) {
        //     console.log('Editing example skipped or failed:',
        //         error instanceof Error ? error.message : String(error));
        // }

        console.log('\n===========================================');
        console.log('Example 4: Edit an image with a mask');
        console.log('===========================================\n');

        try {
            const maskEditResponse = await caller.call({
                text: "Replace the masked area with a lion's face",
                files: [path.join(__dirname, 'dogs.jpg')],
                mask: path.join(__dirname, 'mask.png'),
                output: {
                    image: {
                        quality: "low"
                    }
                },
                outputPath: path.join(outputDir, 'dogs_with_mask.png')
            });

            console.log('Masked edit image saved to:', maskEditResponse[0].metadata?.imageSavedPath);

            console.log(maskEditResponse[0].metadata?.usage);

        } catch (error) {
            console.log('Masked editing example skipped or failed:',
                error instanceof Error ? error.message : String(error));
        }

    } catch (error) {
        console.error('Error in image generation examples:',
            error instanceof Error ? error.message : String(error));
    }
}

// Run the examples
runExamples().catch(console.error); 