/**
 * Image Handling Example
 * 
 * This example demonstrates how to use callLLM to:
 * 1. Make a simple text-only call
 * 2. Send an image with text for multimodal models
 */
import { LLMCaller } from '../src';
import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';


// Load environment variables
dotenv.config();

const usageCallback = (usageData: any) => {
    console.log("Usage data from callback:")
    console.log(usageData.usage);
};

async function runExamples() {
    // Initialize with a multimodal model
    const caller = new LLMCaller('openai', 'gpt-4.1-nano', 'You are a helpful assistant.',
        {
            usageCallback
            // historyMode: 'full'
        }
    );

    try {

        // console.log('Example 1: Image + text call\n');
        // // // File + text example with a public image URL
        // // console.log('Sending image URL:', "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg");
        //     const imageResponse = await caller.call("Analyze this image", {
        //         file: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg",
        //         imageDetail: "high"
        //     });

        //     console.log(`Response:`, imageResponse[0].content);
        //     console.log(imageResponse[0].metadata?.usage);


        // console.log('Example 2: Image and stream\n');

        // const stream = await caller.stream("Get the data from the table in the image", {
        //     file: path.join(__dirname, 'table.png'),
        //     imageDetail: "high",
        //     jsonSchema: {
        //         name: 'Animals',
        //         schema: z.object({
        //             animals: z.array(z.object({
        //                 type: z.string(),
        //                 name: z.string()
        //             }))
        //         })
        //     }
        // });

        // const stream = await caller.stream("Get the data from the table in the image", {
        //     file: path.join(__dirname, 'table.png'),
        //     imageDetail: "high",
        //     jsonSchema: {
        //         name: 'Animals',
        //         schema: z.object({
        //             animals: z.array(z.object({
        //                 type: z.string(),
        //                 name: z.string()
        //             }))
        //         })
        //     }
        // });

        // const stream = await caller.stream("Describe the image in details", {
        //     file: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg",
        // });

        // for await (const chunk of stream) {
        //     process.stdout.write(chunk.content);
        //     if (chunk.isComplete) {
        //         console.log(chunk.metadata?.usage);
        //     }
        // }

        // // Show messages being sent
        // const messages = caller.getHistoricalMessages();
        // console.log("Messages being sent to OpenAI:");
        // console.log(JSON.stringify(messages, null, 2));

        // console.log(`Response:`, imageResponse[0].content);

    } catch (error) {
        console.error('Error processing image:', error);
    }
}

// Run the examples
runExamples().catch(console.error); 