import { LLMCaller } from '../src/core/caller/LLMCaller';
import { Usage } from '../src/interfaces/UniversalInterfaces';

/**
 * Demonstration of reasoning capability in OpenAI's o-series models
 * 
 * This example showcases:
 * 1. Different reasoning effort levels (low, medium, high)
 * 2. Different types of tasks suited for each level
 * 3. Usage statistics including reasoning tokens
 */
async function main() {
    // Creates an LLMCaller with o3-mini, which supports the reasoning capability
    // Note: API key is automatically loaded from .env
    const caller = new LLMCaller('openai', 'o3-mini');

    try {
        // Example 1: Low Effort - Best for simple, factual questions
        // console.log('=== Example 1: Low Reasoning Effort ===');
        // console.log('Question: What would be the capital of Japan if it was not Tokyo?');

        // const lowEffortResponses = await caller.call(
        //     'What would be the capital of Japan if it was not Tokyo?',
        //     {
        //         settings: {
        //             reasoning: { effort: 'low' },
        //             maxTokens: 7000
        //         }
        //     }
        // );

        // const lowEffortUsage = lowEffortResponses[0].metadata?.usage as Usage;
        // const reasoningTokens = lowEffortUsage?.outputTokensBreakdown?.reasoning;

        // console.log('\nResponse:');
        // console.log(lowEffortResponses[0].content);
        // console.log('\nUsage Statistics:');
        // console.log('Total Tokens:', lowEffortUsage?.tokens.total);
        // console.log('Output Tokens:', lowEffortUsage?.tokens.output);
        // console.log('Reasoning Tokens:', reasoningTokens);
        // console.log('Percentage used for reasoning:',
        //     getReasPercentage(
        //         reasoningTokens,
        //         lowEffortUsage?.tokens.output
        //     )
        // );

        // console.log('\nDebug:');
        // console.log('Direct metadata.usage check:', JSON.stringify(lowEffortResponses[0].metadata?.usage, null, 2));
        // console.log('outputTokensBreakdown exists:', lowEffortResponses[0].metadata?.usage?.outputTokensBreakdown ? 'Yes' : 'No');
        // console.log('Raw outputTokensBreakdown:', JSON.stringify(lowEffortResponses[0].metadata?.usage?.outputTokensBreakdown, null, 2));

        // // Example 2: Medium Effort - Good for explanations and moderate complexity
        // console.log('\n\n=== Example 2: Medium Reasoning Effort (Default) ===');
        // console.log('Task: Explain quantum computing to a high school student');

        // const mediumResponses = await caller.call(
        //     'Explain quantum computing to a high school student',
        //     {
        //         settings: {
        //             reasoning: { effort: 'medium' },  // This is also the default if unspecified
        //             maxTokens: 300
        //         }
        //     }
        // );

        // const mediumEffortUsage = mediumResponses[0].metadata?.usage as Usage;
        // const mediumReasoningTokens = mediumEffortUsage?.outputTokensBreakdown?.reasoning;

        // console.log('\nResponse:');
        // console.log(mediumResponses[0].content);
        // console.log('\nUsage Statistics:');
        // console.log('Total Tokens:', mediumEffortUsage?.tokens.total);
        // console.log('Output Tokens:', mediumEffortUsage?.tokens.output);
        // console.log('Reasoning Tokens:', mediumReasoningTokens);
        // console.log('Percentage used for reasoning:',
        //     getReasPercentage(
        //         mediumReasoningTokens,
        //         mediumEffortUsage?.tokens.output
        //     )
        // );

        // // Example 3: High Effort - Best for complex problem solving
        // console.log('\n\n=== Example 3: High Reasoning Effort ===');
        // console.log('Problem: Develop a step-by-step algorithm for the Tower of Hanoi puzzle with 3 disks');

        // const highEffortResponses = await caller.call(
        //     'Develop a step-by-step algorithm for the Tower of Hanoi puzzle with 3 disks. Explain your thinking process.',
        //     {
        //         settings: {
        //             reasoning: { effort: 'high' },
        //             maxTokens: 8000
        //         }
        //     }
        // );

        // const highEffortUsage = highEffortResponses[0].metadata?.usage as Usage;
        // const highReasoningTokens = highEffortUsage?.outputTokensBreakdown?.reasoning;

        // console.log('\nResponse:');
        // console.log(highEffortResponses[0].content || '(No visible output, but reasoning was performed)');
        // console.log('\nUsage Statistics:');
        // console.log('Total Tokens:', highEffortUsage?.tokens.total);
        // console.log('Output Tokens:', highEffortUsage?.tokens.output);
        // console.log('Reasoning Tokens:', highReasoningTokens);
        // console.log('Percentage used for reasoning:',
        //     getReasPercentage(
        //         highReasoningTokens,
        //         highEffortUsage?.tokens.output
        //     )
        // );

        // Example 4: Streaming with reasoning
        console.log('\n\n=== Example 4: Streaming with High Reasoning Effort ===');
        console.log('Question: What would be the capital of Japan if it was not Tokyo?');

        console.log('\nStreaming Response:');
        const stream = await caller.stream(
            'Question: What would be the capital of Japan if it was not Tokyo?',
            {
                settings: {
                    reasoning: { effort: 'high' },
                    maxTokens: 5000
                }
            }
        );

        let lastUsage: Usage | undefined;

        for await (const chunk of stream) {
            if (!chunk.isComplete) {
                process.stdout.write(chunk.content);
            } else {
                lastUsage = chunk.metadata?.usage as Usage;
            }
        }


        console.log('\n\nStreaming Usage Statistics:');
        console.log('Total Tokens:', lastUsage?.tokens.total);
        console.log('Output Tokens:', lastUsage?.tokens.output);
        console.log('Reasoning Tokens:', lastUsage?.tokens.outputReasoning);
        console.log('Percentage used for reasoning:',
            getReasPercentage(
                lastUsage?.tokens.outputReasoning,
                lastUsage?.tokens.output
            )
        );

    } catch (error) {
        console.error('Error:', error);
    }
}

/**
 * Helper function to calculate percentage of output tokens used for reasoning
 */
function getReasPercentage(reasoningTokens: number | undefined, outputTokens: number | undefined): string {
    if (reasoningTokens === undefined || outputTokens === undefined) {
        return 'N/A';
    }

    // Handle case where output tokens are zero but reasoning tokens exist
    // This represents a case where all tokens were used for reasoning
    if (outputTokens === 0 && reasoningTokens > 0) {
        return '100% (all tokens used for reasoning)';
    }

    return ((reasoningTokens / outputTokens) * 100).toFixed(2) + '%';
}

// Run the examples
main().catch(console.error); 