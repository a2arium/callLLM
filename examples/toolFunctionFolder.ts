import { LLMCaller } from '../src/index.js';
import * as path from 'path';
import { getDirname } from '../src/utils/paths.js';

// Get the directory name using the utility function
const __dirname = getDirname();

const toolsDir = path.resolve(__dirname, './functions');

async function main() {
    try {
        console.log('Tool Folder Example');
        console.log('===========================\n');

        // Initialize LLMCaller with tools directory
        const caller = new LLMCaller(
            'openai',
            'fast',
            'You are a helpful assistant that can call tools.',
            { toolsDir }
        );

        // 1. Basic tool call example:
        console.log('1. Basic tool call example:');
        console.log('------------------------------------------');
        try {
            const weatherResult = await caller.call(
                "What's the weather like in Paris?",
                {
                    tools: ["getWeather"]
                }
            );
            console.log('Weather result:', weatherResult);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error in basic tool call example:', errorMessage);
        }

        // 2. Multiple function calls example:
        console.log('\n2. Multiple tool calls example:');
        console.log('------------------------------------------');
        try {
            const multiToolResult = await caller.call(
                "What time is it in New York and what's the weather like in Miami?",
                {
                    tools: ["getWeather", "getTime"]
                }
            );
            console.log('Multi-tool result:', multiToolResult);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error in multiple tool calls example:', errorMessage);
        }

        // 3. Using enums:
        console.log('\n3. Using enums:');
        console.log('------------------------------------------');
        try {
            const factResult = await caller.call(
                "Give me a fact about space.",
                {
                    tools: ["getFact"]
                }
            );
            console.log('Fact result:', factResult);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error in enums example:', errorMessage);
        }

        // 4. Streaming tool call example:
        console.log('\n4. Streaming tool call example:');
        console.log('------------------------------------------');
        try {
            const stream = await caller.stream(
                "What time is it in London? Write a haiku about it.",
                {
                    tools: ["getTime"]
                }
            );

            console.log('Streaming response:');
            for await (const chunk of stream) {
                process.stdout.write(chunk.content || '');
            }
            console.log('\n');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error in streaming tool call example:', errorMessage);
        }

        // 5. Using getFact with explicit topic parameter:
        console.log('\n5. Using getFact with explicit topic parameter:');
        console.log('------------------------------------------');
        try {
            const factResult = await caller.call(
                "Can you give me a fact about animals?",
                {
                    tools: ["getFact"]
                }
            );
            console.log('Animal fact result:', factResult);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error in explicit getFact example:', errorMessage);
        }

        console.log('\nExample completed successfully!');
    } catch (error) {
        console.error('Error:', error);
    }
}

main().catch(console.error); 