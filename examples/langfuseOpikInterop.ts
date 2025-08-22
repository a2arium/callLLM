import { LLMCaller } from '../src/core/caller/LLMCaller';

/**
 * Example demonstrating OpenTelemetry fixes for Langfuse & Opik integration
 * 
 * This example shows the corrected telemetry that addresses the three main issues:
 * 1. Token counts and costs not recognized
 * 2. Input/output not displayed in Langfuse
 * 3. LLM spans not recognized as GenAI calls
 * 
 * Prerequisites:
 * 1. Enable OpenTelemetry: CALLLLM_OTEL_ENABLED=true
 * 
 * 2. For Langfuse, set:
 * OTEL_EXPORTER_OTLP_ENDPOINT=https://cloud.langfuse.com/api/public/otel
 * OTEL_EXPORTER_OTLP_HEADERS=authorization=Basic <your-credentials>
 * 
 * 3. Or for Opik, set:
 * OTEL_EXPORTER_OTLP_ENDPOINT=https://www.comet.com/opik/api/v1/private/otel
 * OTEL_EXPORTER_OTLP_HEADERS=authorization=Bearer <your-api-key>
 * 
 * OpenTelemetry will automatically initialize when LLMCaller is created!
 */
async function langfuseOpikInteropExample() {
    console.log('🔍 Testing OpenTelemetry fixes for Langfuse & Opik integration...');
    console.log('📊 OpenTelemetry will auto-initialize when CALLLLM_OTEL_ENABLED=true');
    console.log('📊 This will create proper telemetry that both platforms can recognize.');

    const caller = new LLMCaller('openai', 'gpt-4', 'You are a helpful assistant that uses tools when needed.');

    try {
        console.log('\n1️⃣ Testing LLM Call Recognition & Token Tracking...');

        // This will create:
        // - CLIENT span named "openai.chat.completions" 
        // - Required attributes: gen_ai.operation.name=chat, gen_ai.system=openai
        // - Usage tokens: gen_ai.usage.input_tokens, gen_ai.usage.output_tokens (before span.end())
        // - AI SDK interop: ai.model.provider=openai, ai.usage.promptTokens, etc.
        // - Langfuse fallbacks: input.value, output.value
        const response = await caller.call('What is 15 + 27? Show your work.', {
            settings: {
                temperature: 0.7,
                maxTokens: 150
            }
        });

        console.log('✅ Response:', response[0]?.content);
        console.log('📈 Token info should now be visible in Langfuse/Opik!');

        console.log('\n2️⃣ Testing Multiple LLM Calls...');

        // Make another call to demonstrate conversation tracking
        const response2 = await caller.call('What is the capital of France?', {
            settings: { temperature: 0.3 }
        });

        console.log('✅ Second Response:', response2[0]?.content);
        console.log('🔧 Multiple calls should all be tracked with proper telemetry!');

        console.log('\n3️⃣ Testing Streaming with Proper Events...');

        // This will create:
        // - gen_ai.prompt events for each input message
        // - gen_ai.choice.chunk events for each streaming chunk
        // - Final gen_ai.choice event with completion
        // - All with proper content length and sequence tracking
        const stream = await caller.stream('Write a short haiku about programming.');

        console.log('📝 Streaming response:');
        let fullContent = '';
        for await (const chunk of stream) {
            if (chunk.content) {
                process.stdout.write(chunk.content);
                fullContent += chunk.content;
            }
        }

        console.log('\n✅ Streaming completed!');
        console.log('🌊 Each chunk should create proper telemetry events!');

        console.log('\n🎉 All tests completed!');
        console.log('');
        console.log('What you should see in Langfuse/Opik:');
        console.log('✅ LLM spans with proper names and CLIENT kind');
        console.log('✅ Token counts and costs displayed correctly');
        console.log('✅ Input/output content visible in UI');
        console.log('✅ Tool calls tracked as execute_tool spans');
        console.log('✅ Proper trace hierarchy and relationships');

    } catch (error) {
        console.error('❌ Error:', error);
        console.log('\nIf you see errors, check:');
        console.log('1. OTEL environment variables are set correctly');
        console.log('2. Network connectivity to Langfuse/Opik');
        console.log('3. Authentication credentials are valid');
    }
}

// Detailed trace structure this example creates:
/*

conversation.call (SERVER)
├── openai.chat.completions (CLIENT) ⭐ **Key Fix: CLIENT span with proper attributes**
│   ├── Attributes:
│   │   ├── gen_ai.operation.name: "chat" ⭐ **Critical for recognition**
│   │   ├── gen_ai.system: "openai"
│   │   ├── gen_ai.request.model: "gpt-4"
│   │   ├── gen_ai.usage.input_tokens: 25 ⭐ **Set before span.end()**
│   │   ├── gen_ai.usage.output_tokens: 45 ⭐ **Set before span.end()**
│   │   ├── ai.model.provider: "openai" ⭐ **AI SDK interop**
│   │   ├── ai.usage.promptTokens: 25 ⭐ **AI SDK interop**
│   │   ├── ai.response.text: "Response content" ⭐ **AI SDK interop**
│   │   ├── input.value: '{"messages":[...]}' ⭐ **Langfuse fallback**
│   │   └── output.value: "Response content" ⭐ **Langfuse fallback**
│   ├── Events:
│   │   ├── gen_ai.prompt: {role: "user", content: "...", sequence: 0} ⭐
│   │   └── gen_ai.choice: {content: "...", finish_reason: "stop"} ⭐
│   └── execute_tool calculate (CLIENT) ⭐ **Fixed naming convention**
│       ├── gen_ai.operation.name: "execute_tool" ⭐ **Critical for recognition**
│       ├── gen_ai.tool.name: "calculate"
│       └── gen_ai.tool.type: "function"
└── Summary attributes with totals

*/

if (require.main === module) {
    langfuseOpikInteropExample().catch(console.error);
}

export { langfuseOpikInteropExample };
