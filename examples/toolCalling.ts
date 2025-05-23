import { LLMCaller } from '../src/index.ts';
import type { ToolDefinition } from '../src/types/tooling.ts';
import { HistoryManager } from '../src/core/history/HistoryManager.ts';

async function main() {


    // Define tools
    const weatherTool: ToolDefinition = {
        name: 'get_weather',
        description: 'Get the current weather for a location',
        parameters: {
            type: 'object',
            properties: {
                location: {
                    type: 'string',
                    description: 'The city and country, e.g. "London, UK"'
                }
            },
            required: ['location']
        },
        callFunction: async <TParams extends Record<string, unknown>, TResponse>(params: TParams): Promise<TResponse> => {
            // Simulate API call
            console.log('get_weather called with params:', params);
            const result = {
                temperature: 20,
                conditions: 'sunny',
                humidity: 65
            } as TResponse;
            console.log('Result:', result);
            return result;
        }
    };

    // Initialize LLMCaller with OpenAI, you can pass tools in the constructor
    const caller = new LLMCaller('openai', 'gpt-4o-mini', 'You are a helpful assistant that can call tools.', {
        tools: [weatherTool]
    });


    const timeTool: ToolDefinition = {
        name: 'get_time',
        description: 'Get the current time for a location',
        parameters: {
            type: 'object',
            properties: {
                location: {
                    type: 'string',
                    description: 'The city and country, e.g. "Tokyo, Japan"'
                }
            },
            required: ['location']
        },
        callFunction: async <TParams extends Record<string, unknown>, TResponse>(params: TParams): Promise<TResponse> => {
            // Simulate API call
            console.log('get_time called with params:', params);
            const result = {
                time: new Date().toLocaleTimeString('en-US')
            } as TResponse;
            console.log('Result:', result);
            return result;
        }
    };

    const calculateTool: ToolDefinition = {
        name: 'calculate',
        description: 'Perform a calculation',
        parameters: {
            type: 'object',
            properties: {
                expression: {
                    type: 'string',
                    description: 'The mathematical expression to evaluate, for example, 0.2 * 100'
                }
            },
            required: ['expression']
        },
        callFunction: async <TParams extends Record<string, unknown>, TResponse>(params: TParams): Promise<TResponse> => {
            // Simulate calculation
            console.log('calculate called with params:', params);
            const expression = params.expression as string;
            const result = {
                result: eval(expression)
            } as TResponse;
            console.log('Result:', result);
            return result;
        }
    };

    // You can also add tools later using the addTools method
    caller.addTools([timeTool]);

    // 1. Basic Tool Call
    console.log('1. Basic Tool Call');
    console.log('------------------');
    const weatherResponse = await caller.call(
        'What\'s the weather like in San Francisco?'
    );
    console.log('Response:', weatherResponse);
    console.log(caller.getHistoricalMessages());

    // 2. Multi - Tool Call
    console.log('\n2. Multi-Tool Call');
    console.log('------------------');
    const multiToolResponse = await caller.call(
        'What\'s the weather in New York and what time is it there?',
        {
            tools: [weatherTool, timeTool],
            settings: {
                toolChoice: 'auto'
            }
        }
    );
    console.log('Response:', multiToolResponse);

    // 3. Calculation Tool Call
    console.log('\n3. Calculation Tool Call');
    console.log('------------------------');
    const calculationResponse = await caller.call(
        'Calculate 15% of 85',
        {
            tools: [weatherTool, calculateTool], // note that calculateTool was not added to the caller, but we can specify it here on individual level
            settings: {
                toolChoice: 'auto'
            }
        }
    );
    console.log('Response:', calculationResponse);

    // 4. Time Tool Call
    console.log('\n4. Time Tool Call');
    console.log('----------------');
    const timeResponse = await caller.call(
        'What time is it in Tokyo?',
        {
            tools: [timeTool],
            settings: {
                toolChoice: 'auto'
            }
        }
    );
    console.log('Response:', timeResponse);


    // 5. Tool Call Stream Demonstration
    console.log('\n5. Tool Call Stream Demonstration');
    console.log('---------------------------------------------------------------');
    console.log('Starting the stream - you\'ll see content as it arrives in real-time');

    let timeout: NodeJS.Timeout | null = null;

    try {
        const stream = await caller.stream(
            'What is the current time in Tokyo? write a haiku about the current time',
            {
                tools: [timeTool],
                settings: {
                    toolChoice: 'auto'
                }
            }
        );

        let toolCallDetected = false;
        let toolCallExecuted = false;
        let responseAfterTool = false;

        // Add a debugging wrapper around the stream to see all chunks
        for await (const chunk of stream) {
            // Handle content
            if (chunk.content) {
                process.stdout.write(chunk.content);
            }

            // Handle tool calls
            if (chunk.toolCalls?.length) {
                toolCallDetected = true;
                console.log('\n\nTool Call Detected:', JSON.stringify(chunk.toolCalls, null, 2));
            }

            // Track when we start getting a response after tool execution
            if (toolCallExecuted && chunk.content && !responseAfterTool) {
                responseAfterTool = true;
                console.log('\n\nContinuation response after tool execution:');
                // Reset the accumulated response to only track post-tool content
            }

            // Indicate completion if flagged
            if (chunk.isComplete) {
                console.log('\n\nStream completed');
                console.log(caller.getHistoricalMessages());
            }
        }
    } catch (error) {
        console.error('\nError processing stream:', error);
        throw error;
    } finally {
        // Clear the timeout when done
        if (timeout) {
            clearTimeout(timeout);
        }
    }

    // 6. Multi-Tool Call Stream Demonstration
    console.log('\n6. Multi-Tool Call Stream Demonstration');
    console.log('---------------------------------------------------------------');
    const multiToolStream = await caller.stream(
        'What is the current time and weather in Tokyo?',
        {
            tools: [timeTool, weatherTool],
            settings: {
                toolChoice: 'auto'
            }
        }
    );

    try {
        for await (const chunk of multiToolStream) {
            // Handle content
            if (chunk.content) {
                process.stdout.write(chunk.content);
            }

            // Handle tool calls
            if (chunk.toolCalls?.length) {
                console.log('\n\nTool Call:', JSON.stringify(chunk.toolCalls, null, 2));
            }

            // For the final chunk, write the complete content
            if (chunk.isComplete) {
                console.log('\n\nStream completed');
                console.log('Final accumulated content:', chunk.contentText);
                console.log('History:', caller.getHistoricalMessages());
            }
        }
    } catch (error) {
        console.error('\nError processing stream:', error);
        throw error;
    }
}

main().catch(console.error);