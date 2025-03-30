import { LLMCaller } from '../src';
import type { ToolDefinition } from '../src/core/types';
import { HistoryManager } from '../src/core/history/HistoryManager';

async function main() {
    // Create a history manager
    const historyManager = new HistoryManager('You are a helpful assistant that can call tools.');

    // Initialize LLMCaller with OpenAI
    const caller = new LLMCaller('openai', 'gpt-4o-mini', 'You are a helpful assistant that can call tools.', {
        historyManager
    });

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

    // 1. Basic Tool Call (recommended approach with tools at root level)
    console.log('1. Basic Tool Call');
    console.log('------------------');
    const weatherResponse = await caller.call(
        'What\'s the weather like in San Francisco?',
        {
            tools: [weatherTool],
            settings: {
                toolChoice: 'auto'
            }
        }
    );
    console.log('Response:', weatherResponse);
    console.log(caller.getHistoricalMessages());

    // 2. Multi-Tool Call (recommended approach with tools at root level)
    console.log('\n2. Multi-Tool Call');
    console.log('------------------');
    try {
        // Debug: Log the complete history before the API call
        console.log('\n=== Message History Before Multi-Tool Call ===');
        const historyBefore = caller.getHistoricalMessages();
        historyBefore.forEach((msg, i) => {
            console.log(`Message ${i + 1} - Role: ${msg.role}`);
            if (msg.toolCalls) {
                console.log(`  Tool Calls: ${JSON.stringify(msg.toolCalls.map(tc => tc.id || 'unknown'))}`);
            }
            if (msg.toolCallId) {
                console.log(`  Tool Call ID: ${msg.toolCallId}`);
            }
        });
        console.log('=== End Message History ===\n');

        const multiToolResponses = await caller.call(
            'What\'s the weather in New York and what time is it there?',
            {
                tools: [weatherTool, timeTool],
                settings: {
                    toolChoice: 'auto'
                }
            }
        );

        // Debug: Log the response with tool calls
        console.log('\n=== Tool Call Response ===');
        if (multiToolResponses[0].toolCalls) {
            console.log(`Tool Calls in Response: ${JSON.stringify(multiToolResponses[0].toolCalls.map(tc => ({ id: tc.id, name: tc.name })))}`);
        }
        console.log('=== End Tool Call Response ===\n');

        const multiToolResponse = multiToolResponses[0]; // Get the first response from the array
        console.log('Response:', multiToolResponse);

        // Check if there are tool calls that need responses
        if (multiToolResponse.toolCalls && multiToolResponse.toolCalls.length > 0) {
            // Process each tool call and add results to history
            for (const toolCall of multiToolResponse.toolCalls) {
                let result;
                if (toolCall.name === 'get_weather') {
                    result = await weatherTool.callFunction(toolCall.arguments);
                } else if (toolCall.name === 'get_time') {
                    result = await timeTool.callFunction(toolCall.arguments);
                }

                // Add the tool result with the exact toolCallId from the response
                if (result) {
                    // Ensure we use the exact toolCallId from the API response
                    // This is critical for OpenAI to match tool calls with their responses
                    if (!toolCall.id) {
                        console.warn('Tool call missing ID - this may cause message history issues');
                        continue;
                    }

                    caller.addToolResult(
                        toolCall.id,
                        JSON.stringify(result),
                        toolCall.name || 'unknown_tool' // Provide a default if name is undefined
                    );
                }
            }

            // Debug: Log the history after adding tool results
            console.log('\n=== Message History After Adding Tool Results ===');
            const historyAfter = caller.getHistoricalMessages();
            historyAfter.forEach((msg, i) => {
                console.log(`Message ${i + 1} - Role: ${msg.role}`);
                if (msg.toolCalls) {
                    console.log(`  Tool Calls: ${JSON.stringify(msg.toolCalls.map(tc => tc.id || 'unknown'))}`);
                }
                if (msg.toolCallId) {
                    console.log(`  Tool Call ID: ${msg.toolCallId}`);
                }
            });
            console.log('=== End Message History ===\n');

            // Get final response after tool execution
            const finalResponses = await caller.call(
                'What did you find about the weather and time in New York?',
                {
                    tools: [weatherTool, timeTool],
                    settings: {
                        toolChoice: 'auto'
                    }
                }
            );
            const finalResponse = finalResponses[0]; // Get the first response from the array
            console.log('Final Response after tool execution:', finalResponse);
        }
    } catch (error) {
        console.error('Error in Multi-Tool Call:', error);
    }

    // 3. Calculation Tool Call (recommended approach with tools at root level)
    console.log('\n3. Calculation Tool Call');
    console.log('------------------------');

    const calculationResponse = await caller.call(
        'Calculate 15% of 85',
        {
            tools: [calculateTool],
            settings: {
                toolChoice: 'auto'
            }
        }
    );
    console.log('Response:', calculationResponse);

    // 4. Time Tool Call (recommended approach with tools at root level)
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

    // 5. Tool Call Stream Demonstration (recommended approach with tools at root level)
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
                    toolChoice: 'auto',
                    stream: true
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

    // 6. Multi-Tool Call Stream Demonstration (recommended approach with tools at root level)
    console.log('\n6. Multi-Tool Call Stream Demonstration');
    console.log('---------------------------------------------------------------');
    const multiToolStream = await caller.stream(
        'What is the current time and weather in Tokyo?',
        {
            tools: [timeTool, weatherTool],
            settings: {
                toolChoice: 'auto',
                stream: true
            }
        }
    );

    try {
        for await (const chunk of multiToolStream) {
            // Handle content
            if (chunk.content) {
                // For non-complete chunks, write incrementally
                if (!chunk.isComplete) {
                    process.stdout.write(chunk.content);
                }
            }

            // Handle tool calls
            if (chunk.toolCalls?.length) {
                console.log('\nTool Call:', JSON.stringify(chunk.toolCalls, null, 2));
            }

            // For the final chunk, write the complete content
            if (chunk.isComplete) {
                // When the stream is complete:
                // chunk.contentText contains the complete accumulated text response
                console.log('\n\nComplete response text:');
                console.log(chunk.contentText);

                console.log('\nStream completed');
            }
        }
    } catch (error) {
        console.error('\nError processing stream:', error);
    }
}

// Run the example
main().catch(console.error);