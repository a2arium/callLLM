import { LLMCaller } from '../src/core/caller/LLMCaller.ts';
import { UsageData } from '../src/interfaces/UsageInterfaces.ts';
import { StreamPipeline } from '../src/core/streaming/StreamPipeline.ts';
import { ContentAccumulator } from '../src/core/streaming/processors/ContentAccumulator.ts';
import { ReasoningProcessor } from '../src/core/streaming/processors/ReasoningProcessor.ts';

/**
 * Demonstration of the ReasoningProcessor with OpenAI's o-series models
 * 
 * This example shows:
 * 1. How to manually set up a StreamPipeline with the ReasoningProcessor
 * 2. How to process a stream with reasoning content
 * 3. How to access accumulated reasoning after processing
 */
async function main() {
    // Create usage callback to log token usage
    const usageCallback = (usageData: UsageData) => {
        console.log(`Usage for caller ${usageData.callerId}:`, {
            costs: usageData.usage.costs,
            tokens: usageData.usage.tokens,
            timestamp: new Date(usageData.timestamp).toISOString()
        });
    };

    // Create a caller with a reasoning-capable model and enable reasoning
    const caller = new LLMCaller('openai', 'o3-mini', 'You are a helpful assistant.',
        {
            usageCallback
        }
    );

    // Set up a more complex reasoning task
    const taskPrompt = `Please analyze why electric vehicles might be better or worse than gasoline vehicles for the environment.`;

    // Initialize processors
    const contentAccumulator = new ContentAccumulator();
    const reasoningProcessor = new ReasoningProcessor();

    // Build a pipeline with our processors
    const pipeline = new StreamPipeline([contentAccumulator, reasoningProcessor]);

    console.log(`Sending prompt: "${taskPrompt}"`);
    console.log('Processing with reasoning enabled (effort: high, summary: detailed)...\n');

    // Call with reasoning enabled
    try {
        const stream = await caller.stream(taskPrompt, {
            settings: {
                reasoning: {
                    effort: 'high',
                    summary: 'detailed'
                },
                maxTokens: 5000
            },
            usageBatchSize: 50
        });

        console.log('Response:');
        let streamFinished = false;

        // Process the stream through our pipeline
        const processedStream = pipeline.processStream(stream);

        // Handle the processed stream
        for await (const chunk of processedStream) {
            // Print content
            if (chunk.content) {
                process.stdout.write(chunk.content);
            }

            // Check if stream is complete
            if (chunk.isComplete) {
                streamFinished = true;
            }
        }

        console.log('\n');

        if (streamFinished) {
            // Print reasoning information
            console.log('=== Final Accumulated Content ===');
            console.log(contentAccumulator.getAccumulatedContent());
            console.log('\n=== Reasoning Process ===');
            if (reasoningProcessor.hasReasoning()) {
                console.log(reasoningProcessor.getAccumulatedReasoning());
            } else {
                console.log('No reasoning content was provided by the model.');
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

main().catch(console.error); 