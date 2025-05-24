import { LLMCaller } from '../src/core/caller/LLMCaller.ts';
import type { EmbeddingCallOptions } from '../src/interfaces/UniversalInterfaces.ts';

/**
 * Example demonstrating embedding generation with the LLM Caller
 */
async function embeddingExample() {
    console.log('🚀 Starting Embedding Example...\n');

    // Initialize LLM Caller with OpenAI
    const llm = new LLMCaller(
        'openai',
        'text-embedding-3-small',
        'You are a helpful assistant.'
    );

    try {
        // Example 1: Single text embedding
        console.log('📝 Example 1: Single Text Embedding');
        const singleEmbedding = await llm.embeddings({
            input: 'Hello, this is a test sentence for embedding generation.',
            model: 'text-embedding-3-small'
        });

        console.log(`✅ Generated embedding with ${singleEmbedding.embeddings[0].embedding.length} dimensions`);
        console.log(`💰 Cost: $${singleEmbedding.usage.costs.total.toFixed(6)}`);
        console.log(`🔢 Tokens used: ${singleEmbedding.usage.tokens.total}\n`);

        // Example 2: Batch text embeddings
        console.log('📚 Example 2: Batch Text Embeddings');
        const batchEmbeddings = await llm.embeddings({
            input: [
                'The quick brown fox jumps over the lazy dog.',
                'Machine learning is a subset of artificial intelligence.',
                'Embeddings represent text as dense vectors in high-dimensional space.'
            ],
            model: 'text-embedding-3-small'
        });

        console.log(`✅ Generated ${batchEmbeddings.embeddings.length} embeddings`);
        console.log(`💰 Total cost: $${batchEmbeddings.usage.costs.total.toFixed(6)}`);
        console.log(`🔢 Total tokens used: ${batchEmbeddings.usage.tokens.total}\n`);

        // Example 3: Model consistency importance (instead of aliases)
        console.log('🎯 Example 3: Model Consistency (No Aliases)');
        console.log('📌 Important: Always use the same specific model for indexing and querying!');

        const consistentEmbedding = await llm.embeddings({
            input: 'This example shows why you must use specific model names.',
            model: 'text-embedding-3-small' // ✅ Always use specific model names
        });

        console.log(`✅ Generated embedding using specific model: ${consistentEmbedding.model}`);
        console.log(`💰 Cost: $${consistentEmbedding.usage.costs.total.toFixed(6)}`);
        console.log(`⚠️  Never use aliases like 'small', 'large' for embeddings - use exact model names!\n`);

        // Example 4: Custom dimensions
        console.log('📐 Example 4: Custom Dimensions');
        const customDimEmbedding = await llm.embeddings({
            input: 'This embedding will have custom dimensions.',
            model: 'text-embedding-3-small',
            dimensions: 512 // Smaller dimension size
        });

        console.log(`✅ Generated embedding with ${customDimEmbedding.embeddings[0].embedding.length} dimensions`);
        console.log(`💰 Cost: $${customDimEmbedding.usage.costs.total.toFixed(6)}\n`);

        // Example 5: Usage tracking with callback
        console.log('📊 Example 5: Usage Tracking with Callback');
        let callbackCount = 0;
        const embeddingWithCallback = await llm.embeddings({
            input: 'This example demonstrates detailed usage tracking.',
            model: 'text-embedding-3-small',
            usageCallback: async (usageData) => {
                callbackCount++;
                console.log(`📈 Usage callback triggered (call #${callbackCount}):`);
                console.log(`   📝 Input tokens: ${usageData.usage.tokens.input.total}`);
                console.log(`   📤 Output tokens: ${usageData.usage.tokens.output.total}`);
                console.log(`   🔢 Total tokens: ${usageData.usage.tokens.total}`);
                console.log(`   💵 Input cost: $${usageData.usage.costs.input.total.toFixed(8)}`);
                console.log(`   💸 Output cost: $${usageData.usage.costs.output.total.toFixed(8)}`);
                console.log(`   💰 Total cost: $${usageData.usage.costs.total.toFixed(8)}`);
                console.log(`   🏷️  Caller ID: ${usageData.callerId}`);
                console.log(`   ⏰ Timestamp: ${new Date().toISOString()}`);
            }
        });

        console.log(`✅ Embedding generated with detailed usage tracking\n`);

        // Example 6: Accumulated usage tracking across multiple calls
        console.log('📈 Example 6: Accumulated Usage Tracking');
        let totalTokens = 0;
        let totalCost = 0;
        let totalCalls = 0;

        const usageTracker = async (usageData: any) => {
            totalCalls++;
            totalTokens += usageData.usage.tokens.total;
            totalCost += usageData.usage.costs.total;

            console.log(`   📊 Call ${totalCalls}: ${usageData.usage.tokens.total} tokens, $${usageData.usage.costs.total.toFixed(8)}`);
        };

        // Make multiple embedding calls with accumulated tracking
        const texts = [
            'First embedding call for accumulation test.',
            'Second embedding call to track total usage.',
            'Third and final call to demonstrate usage accumulation.'
        ];

        for (let i = 0; i < texts.length; i++) {
            await llm.embeddings({
                input: texts[i],
                model: 'text-embedding-3-small',
                usageCallback: usageTracker
            });
        }

        console.log(`\n📋 Total Accumulated Usage:`);
        console.log(`   🔢 Total calls: ${totalCalls}`);
        console.log(`   📝 Total tokens: ${totalTokens}`);
        console.log(`   💰 Total cost: $${totalCost.toFixed(8)}`);
        console.log(`   📊 Average tokens per call: ${(totalTokens / totalCalls).toFixed(1)}`);
        console.log(`   💵 Average cost per call: $${(totalCost / totalCalls).toFixed(8)}\n`);

        // Example 7: Batch processing with usage callback
        console.log('🔄 Example 7: Batch Processing with Usage Callback');
        const batchUsageCallback = await llm.embeddings({
            input: [
                'First text in batch processing example.',
                'Second text to demonstrate batch usage tracking.',
                'Third text showing how callbacks work with multiple inputs.',
                'Fourth and final text in this batch processing demonstration.'
            ],
            model: 'text-embedding-3-small',
            usageCallback: async (usageData) => {
                console.log(`📈 Batch usage callback triggered:`);
                console.log(`   📦 Batch size: 4 texts`);
                console.log(`   📝 Total input tokens: ${usageData.usage.tokens.input.total}`);
                console.log(`   📤 Total output tokens: ${usageData.usage.tokens.output.total}`);
                console.log(`   🔢 Total tokens: ${usageData.usage.tokens.total}`);
                console.log(`   💰 Total batch cost: $${usageData.usage.costs.total.toFixed(8)}`);
                console.log(`   🧮 Cost per text: $${(usageData.usage.costs.total / 4).toFixed(8)}`);
                console.log(`   📊 Tokens per text: ${(usageData.usage.tokens.total / 4).toFixed(1)}`);
            }
        });

        console.log(`✅ Generated ${batchUsageCallback.embeddings.length} embeddings with batch usage tracking\n`);

        // Example 8: Check embedding capabilities
        console.log('🔍 Example 8: Check Embedding Capabilities');
        const capabilities = llm.checkEmbeddingCapabilities('text-embedding-3-small');
        console.log(`✅ Model capabilities:`, {
            supported: capabilities.supported,
            maxInputLength: capabilities.maxInputLength,
            dimensions: capabilities.dimensions,
            defaultDimensions: capabilities.defaultDimensions,
            encodingFormats: capabilities.encodingFormats
        });

        // Example 9: List available embedding models
        console.log('\n📋 Example 9: Available Embedding Models');
        const availableModels = llm.getAvailableEmbeddingModels();
        console.log(`✅ Available embedding models:`, availableModels);

    } catch (error) {
        console.error('❌ Error in embedding example:', error);
    }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
    embeddingExample().catch(console.error);
}

export { embeddingExample }; 