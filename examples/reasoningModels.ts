import { LLMCaller } from '../src/core/caller/LLMCaller';
import { Usage } from '../src/interfaces/UniversalInterfaces';
import { UsageData } from '../src/interfaces/UsageInterfaces';

/**
 * Demonstration of reasoning capability in OpenAI's o-series models
 * 
 * This example showcases:
 * 1. Different reasoning effort levels (low, medium, high)
 * 2. Different types of tasks suited for each level
 * 3. Usage statistics including reasoning tokens
 * 4. Reasoning summaries
 */
async function main() {
    // Creates an LLMCaller with o3-mini, which supports the reasoning capability

    const usageCallback = (usageData: UsageData) => {
        console.log(`Usage for caller ${usageData.callerId}:`, {
            costs: usageData.usage.costs,
            tokens: usageData.usage.tokens,
            timestamp: new Date(usageData.timestamp).toISOString()
        });
    };

    // Note: API key is automatically loaded from .env
    const caller = new LLMCaller('openai', 'o3-mini', 'You are a helpful assistant.',
        {
            usageCallback
        }
    );

    try {
        // Example 1: Low Effort - Best for simple, factual questions
        console.log('=== Example 1: Low Reasoning Effort ===');
        console.log('Question: What would be the capital of Japan if it was not Tokyo?');

        const lowEffortResponses = await caller.call(
            'What would be the capital of Japan if it was not Tokyo?',
            {
                settings: {
                    reasoning: { effort: 'low' },
                    maxTokens: 7000
                }
            }
        );

        const lowEffortUsage = lowEffortResponses[0].metadata?.usage as Usage;
        const reasoningTokens = lowEffortUsage?.tokens.output.reasoning;

        console.log('\nResponse:');
        console.log(lowEffortResponses[0].content);
        console.log('\nUsage Statistics:');
        console.log('Total Tokens:', lowEffortUsage?.tokens.total);
        console.log('Output Tokens:', lowEffortUsage?.tokens.output.total);
        console.log('Reasoning Tokens:', reasoningTokens);
        console.log('Percentage used for reasoning:',
            getReasPercentage(
                reasoningTokens,
                lowEffortUsage?.tokens.output.total
            )
        );

        // Example 2: Medium Effort with Reasoning Summary - Good for explanations and moderate complexity
        console.log('\n\n=== Example 2: Medium Reasoning Effort with Summary ===');
        console.log('Task: Explain quantum computing to a high school student');

        const mediumResponses = await caller.call(
            'Explain quantum computing to a high school student',
            {
                settings: {
                    reasoning: {
                        effort: 'medium',
                        summary: 'auto' // Request reasoning summary
                    },
                    maxTokens: 5000
                }
            }
        );

        const mediumEffortUsage = mediumResponses[0].metadata?.usage as Usage;
        const mediumReasoningTokens = mediumEffortUsage?.tokens.output.reasoning;

        console.log('\nResponse:');
        console.log(mediumResponses[0].content);

        // Display reasoning summary if available
        if (mediumResponses[0].reasoning) {
            console.log('\nReasoning Summary:');
            console.log(mediumResponses[0].reasoning);
        }

        console.log('\nUsage Statistics:');
        console.log('Total Tokens:', mediumEffortUsage?.tokens.total);
        console.log('Output Tokens:', mediumEffortUsage?.tokens.output.total);
        console.log('Reasoning Tokens:', mediumReasoningTokens);
        console.log('Percentage used for reasoning:',
            getReasPercentage(
                mediumReasoningTokens,
                mediumEffortUsage?.tokens.output.total
            )
        );

        // Example 3: High Effort - Best for complex problem solving
        console.log('\n\n=== Example 3: High Reasoning Effort with Detailed Summary ===');
        console.log('Problem: Develop a step-by-step algorithm for the Tower of Hanoi puzzle with 3 disks');

        const highEffortResponses = await caller.call(
            'Develop a step-by-step algorithm for the Tower of Hanoi puzzle with 3 disks. Explain your thinking process.',
            {
                settings: {
                    reasoning: {
                        effort: 'high',
                        summary: 'detailed' // Request detailed reasoning summary
                    },
                    maxTokens: 8000
                }
            }
        );

        const highEffortUsage = highEffortResponses[0].metadata?.usage as Usage;
        const highReasoningTokens = highEffortUsage?.tokens.output.reasoning;

        console.log('\nResponse:');
        console.log(highEffortResponses[0].content || '(No visible output, but reasoning was performed)');

        // Display reasoning summary if available
        if (highEffortResponses[0].reasoning) {
            console.log('\nReasoning Summary:');
            console.log(highEffortResponses[0].reasoning);
        }

        console.log('\nUsage Statistics:');
        console.log('Total Tokens:', highEffortUsage?.tokens.total);
        console.log('Output Tokens:', highEffortUsage?.tokens.output.total);
        console.log('Reasoning Tokens:', highReasoningTokens);
        console.log('Percentage used for reasoning:',
            getReasPercentage(
                highReasoningTokens,
                highEffortUsage?.tokens.output.total
            )
        );

        // Example 4: Streaming with reasoning summary
        console.log('\n\n=== Example 4: Streaming with High Reasoning Effort and Summary ===');
        console.log('Question: What would be the capital of Japan if it was not Tokyo? (with reasoning)');

        console.log('\nStreaming Response:');
        const stream = await caller.stream(
            'Question: What would be the capital of Japan if it was not Tokyo? Provide detailed explanation, why you think so.',
            {
                settings: {
                    reasoning: {
                        effort: 'high',
                        summary: 'auto' // Request reasoning summary
                    },
                    maxTokens: 5000
                },
                usageBatchSize: 50
            }
        );

        let lastChunk;
        for await (const chunk of stream) {
            if (chunk.isFirstContentChunk) {
                console.log('\n\n=== CONTENT START ===');
            }
            if (chunk.content) process.stdout.write(chunk.content);

            if (chunk.isFirstReasoningChunk) {
                console.log('\n\n=== REASONING START ===');
            }
            if (chunk.reasoning) process.stdout.write(chunk.reasoning);
            if (chunk.isComplete) {
                lastChunk = chunk;
            }
        }

        // Display final reasoning summary if available
        if (lastChunk) {
            if (lastChunk.reasoning) {
                console.log('\n=== FINAL REASONING SUMMARY ===');
                console.log(lastChunk.reasoning);
            }
            if (lastChunk.content) {
                console.log('\n=== FINAL CONTENT ===');
                console.log(lastChunk.content);
            }
        }

        console.log('\n\nStreaming Usage Statistics:');
        console.log('Total Tokens:', lastChunk?.metadata?.usage?.tokens.total);
        console.log('Output Tokens:', lastChunk?.metadata?.usage?.tokens.output.total);
        console.log('Reasoning Tokens:', lastChunk?.metadata?.usage?.tokens.output.reasoning);
        console.log('Percentage used for reasoning:',
            getReasPercentage(
                lastChunk?.metadata?.usage?.tokens.output.reasoning,
                lastChunk?.metadata?.usage?.tokens.output.total
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