import { LLMCaller } from '../src';
import type { ToolDefinition } from '../src/core/types';

async function main() {
    // Initialize LLMCaller with OpenAI
    const caller = new LLMCaller('openai', 'gpt-4o');

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
            console.log('get_weather', params);
            const result = {
                temperature: 20,
                conditions: 'sunny',
                humidity: 65
            } as TResponse;
            console.log('Result:', result);
            return result;
        }
    };

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
            console.log('get_time', params);
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
            console.log('calculate', params);
            const expression = params.expression as string;
            const result = {
                result: eval(expression)
            } as TResponse;
            console.log('Result:', result);
            return result;
        }
    };

    // Add tools to the caller
    caller.addTool(weatherTool);
    caller.addTool(timeTool);
    caller.addTool(calculateTool);

    // 1. Basic Tool Call
    console.log('1. Basic Tool Call');
    console.log('------------------');
    const weatherResponse = await caller.chatCall({
        message: 'What\'s the weather like in San Francisco?',
        settings: {
            tools: [weatherTool],
            toolChoice: 'auto'
        }
    });
    console.log('Response:', weatherResponse);

    // // 2. Multi-Tool Call
    // console.log('\n2. Multi-Tool Call');
    // console.log('------------------');
    // const multiToolResponse = await caller.chatCall({
    //     message: 'What\'s the weather in New York and what time is it there?',
    //     settings: {
    //         tools: [weatherTool, timeTool],
    //         toolChoice: 'auto'
    //     }
    // });
    // console.log('Response:', multiToolResponse);

    // // 3. Calculation Tool Call
    // console.log('\n3. Calculation Tool Call');
    // console.log('------------------------');
    // const calculationResponse = await caller.chatCall({
    //     message: 'Calculate 15% of 85',
    //     settings: {
    //         tools: [calculateTool],
    //         toolChoice: 'auto'
    //     }
    // });
    // console.log('Response:', calculationResponse);

    // // 4. Time Tool Call
    // console.log('\n4. Time Tool Call');
    // console.log('----------------');
    // const timeResponse = await caller.chatCall({
    //     message: 'What time is it in Tokyo?',
    //     settings: {
    //         tools: [timeTool],
    //         toolChoice: 'auto'
    //     }
    // });
    // console.log('Response:', timeResponse);

    // 5. Tool Call Stream Demonstration
    // console.log('\n5. Tool Call Stream Demonstration');
    // console.log('---------------------------------------------------------------');
    // const stream = await caller.streamCall({
    //     message: 'What is the current time in Tokyo?',
    //     settings: {
    //         tools: [timeTool],
    //         toolChoice: 'auto',
    //         stream: true
    //     }
    // });

    // try {
    //     for await (const chunk of stream) {
    //         // Handle content
    //         if (chunk.content) {
    //             process.stdout.write(chunk.content);
    //         }

    //         // Handle tool calls
    //         if (chunk.toolCalls?.length) {
    //             console.log('\nTool Calls:', JSON.stringify(chunk.toolCalls, null, 2));
    //         }

    //         // Indicate completion if flagged
    //         if (chunk.isComplete) {
    //             if (chunk.content) {
    //                 console.log('\nFinal response:', chunk.content);
    //             }
    //             console.log('\nStream completed');
    //         }
    //     }
    // } catch (error) {
    //     console.error('\nError processing stream:', error);
    //     throw error;
    // }

    // // 6. Multi-Tool Call Stream Demonstration
    // console.log('\n6. Multi-Tool Call Stream Demonstration');
    // console.log('---------------------------------------------------------------');
    // const multiToolStream = await caller.streamCall({
    //     message: 'What is the current time and weather in Tokyo?',
    //     settings: {
    //         tools: [timeTool, weatherTool],
    //         toolChoice: 'auto',
    //         stream: true
    //     }
    // });

    // try {
    //     for await (const chunk of multiToolStream) {
    //         // Handle content
    //         if (chunk.content) {
    //             process.stdout.write(chunk.content);
    //         }

    //         // Handle tool calls
    //         if (chunk.toolCalls?.length) {
    //             console.log('\nTool Calls:', JSON.stringify(chunk.toolCalls, null, 2));
    //         }

    //         // Indicate completion if flagged
    //         if (chunk.isComplete) {
    //             if (chunk.content) {
    //                 console.log('\nFinal response:', chunk.content);
    //             }
    //             console.log('\nStream completed');
    //         }
    //     }
    // } catch (error) {
    //     console.error('\nError processing stream:', error);
    //     throw error;
    // }
}

main().catch(console.error);