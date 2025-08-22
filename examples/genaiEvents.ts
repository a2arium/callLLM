import { LLMCaller } from '../src/core/caller/LLMCaller';

/**
 * Example demonstrating OpenTelemetry GenAI events (gen_ai.prompt and gen_ai.choice)
 * Following the latest OpenTelemetry GenAI semantic conventions
 * 
 * Prerequisites:
 * - Set CALLLLM_OTEL_ENABLED=true to enable automatic OpenTelemetry initialization
 * - Optionally configure OTEL_EXPORTER_OTLP_ENDPOINT for external exporters
 */
async function genAIEventsExample() {
    const caller = new LLMCaller('openai', 'gpt-4', 'You are a helpful assistant.');

    console.log('🔍 Starting LLM call with GenAI event telemetry...');

    try {
        // This will emit:
        // 1. gen_ai.prompt events for each input message with sequence numbers
        // 2. gen_ai.choice events for the response with proper semantic conventions
        const response = await caller.call('What is the capital of France?', {
            temperature: 0.7
        });

        console.log('✅ Response:', response.content);

        console.log('\n🌊 Starting streaming call with GenAI chunk events...');

        // This will emit:
        // 1. gen_ai.prompt events for input messages  
        // 2. gen_ai.choice.chunk events for each streaming chunk
        // 3. Final gen_ai.choice event when streaming completes
        const stream = await caller.stream('Tell me a short story about Paris.');

        let fullContent = '';
        for await (const chunk of stream) {
            if (chunk.content) {
                process.stdout.write(chunk.content);
                fullContent += chunk.content;
            }

            // Each chunk triggers a gen_ai.choice.chunk event with:
            // - gen_ai.choice.content: chunk content
            // - gen_ai.choice.chunk.sequence: chunk number
            // - gen_ai.choice.chunk.has_content: boolean
            // - gen_ai.choice.chunk.is_complete: boolean
            // - gen_ai.choice.finish_reason: 'incomplete' or actual reason
        }

        console.log('\n✅ Streaming completed!');
        console.log(`📊 Total content length: ${fullContent.length} characters`);

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Event Structure Examples:
/*

## gen_ai.prompt Events (emitted for each input message):
{
  'gen_ai.prompt.role': 'user',
  'gen_ai.prompt.content': 'What is the capital of France?',
  'gen_ai.prompt.content.length': 29,
  'gen_ai.prompt.sequence': 0
}

## gen_ai.choice Events (non-streaming):
{
  'gen_ai.choice.content': 'The capital of France is Paris.',
  'gen_ai.choice.content.length': 30,
  'gen_ai.choice.index': 0,
  'gen_ai.choice.finish_reason': 'stop'
}

## gen_ai.choice.chunk Events (streaming):
{
  'gen_ai.choice.content': 'Paris',
  'gen_ai.choice.content.length': 5,
  'gen_ai.choice.index': 0,
  'gen_ai.choice.chunk.sequence': 3,
  'gen_ai.choice.chunk.has_content': true,
  'gen_ai.choice.chunk.is_complete': false,
  'gen_ai.choice.finish_reason': 'incomplete'
}

## Trace Structure:
conversation.call (SERVER)
├── gen_ai.prompt events (individual messages)
├── openai.chat.completions (CLIENT)  
│   ├── gen_ai.choice events (response)
│   └── gen_ai.usage.* attributes (tokens, cost)
└── conversation summary attributes

*/

if (require.main === module) {
    genAIEventsExample().catch(console.error);
}

export { genAIEventsExample };
