import { LLMCaller } from '../src';

async function processRegularExample(caller: LLMCaller, message: string, data: any) {
    console.log('\nInput:', message);
    console.log('Data size (chars):', JSON.stringify(data).length);
    console.log('First 100 chars:', JSON.stringify(data).slice(0, 100) + '...');

    // TODO: Remove debugging logs after investigation
    console.log('\nDebug: Starting data processing...');
    console.log('Debug: Converting data to string...');
    const dataStr = JSON.stringify(data);
    console.log(`Debug: Data string length: ${dataStr.length} chars`);

    console.log('\nDebug: Calculating tokens...');
    // Get access to the internal TokenCalculator
    const tokenCalculator = (caller as any).tokenCalculator;
    const tokens = tokenCalculator.calculateTokens(dataStr);
    console.log(`Debug: Total tokens in data: ${tokens}`);

    console.log('\nDebug: Getting model info...');
    const modelInfo = caller.getModel('fast');
    console.log(`Debug: Model max tokens: ${modelInfo?.maxRequestTokens}`);

    console.log('\nResponse:');
    console.log('Debug: Calling LLM...');
    const responses = await caller.call({
        message,
        data,
        settings: {
            maxTokens: 1000
        }
    });

    console.log(`Debug: Received ${responses.length} responses`);

    // Print each response with its chunk information
    responses.forEach((response, index) => {
        console.log(`\n[Response ${index + 1}/${responses.length}]`);
        console.log(`Debug: Response metadata:`, JSON.stringify(response.metadata, null, 2));
        console.log(response.content);
    });
    console.log('\n');
}

async function processStreamExample(caller: LLMCaller, message: string, data: any) {
    console.log('\nInput:', message);
    console.log('Data size (chars):', JSON.stringify(data).length);
    console.log('First 100 chars:', JSON.stringify(data).slice(0, 100) + '...');

    // TODO: Remove debugging logs after investigation
    console.log('\nDebug: Starting stream processing...');
    console.log('Debug: Converting data to string...');
    const dataStr = JSON.stringify(data);
    console.log(`Debug: Data string length: ${dataStr.length} chars`);

    console.log('\nDebug: Calculating tokens...');
    const tokenCalculator = (caller as any).tokenCalculator;
    const tokens = tokenCalculator.calculateTokens(dataStr);
    console.log(`Debug: Total tokens in data: ${tokens}`);

    console.log('\nDebug: Getting model info...');
    const modelInfo = caller.getModel('fast');
    console.log(`Debug: Model max tokens: ${modelInfo?.maxRequestTokens}`);

    console.log('\nStreaming response:');
    console.log('Debug: Starting stream...');
    const stream = await caller.stream({
        message,
        data,
        endingMessage: 'Start with title "SECTION RESPONSE:"',
        settings: {
            maxTokens: 1000,
        }
    });

    let chunkCount = 0;
    for await (const chunk of stream) {
        chunkCount++;

        // Always show content incrementally
        process.stdout.write(chunk.content);

        // Could use chunk.contentText on the final chunk if needed
        // if (chunk.isComplete && chunk.contentText) {
        //     console.log("\nFull response text available in chunk.contentText");
        // }
    }
    console.log(`\nDebug: Stream complete. Processed ${chunkCount} chunks\n`);
}

async function main() {
    // Initialize with the default model
    const caller = new LLMCaller('openai', 'fast');

    // Update the gpt-4o-mini model to split data into roughly 3 parts
    // For 26,352 total tokens, we want each chunk to be ~8,800 tokens
    caller.updateModel('gpt-4o-mini', {
        maxRequestTokens: 9000,  // Slightly larger than chunk size to account for overhead
        maxResponseTokens: 1000
    });


    // Example 1: Large Text Data (Regular Call)
    console.log('\n=== Example 1: Large Text Data (Regular Call) ===');
    console.log('Debug: Creating text with 25 paragraphs, 10 sentences each');

    // Create a large text with multiple paragraphs
    const text = Array.from({ length: 25 }, (_, i) => {
        const sentences = Array.from({ length: 10 }, () =>
            'This is a detailed sentence that contains enough words to make the paragraph substantial and ensure we exceed token limits. ' +
            'Adding more content to each sentence to increase token count significantly. ' +
            'The more text we add, the more likely we are to see the splitting behavior in action.'
        ).join(' ');
        return `Paragraph ${i + 1}: ${sentences}`;
    }).join('\n\n');

    await processRegularExample(caller, 'Please analyze each section:', text);

    // Example 2: Large Array Data (Regular Call)
    console.log('\n=== Example 2: Array Data (Regular Call) ===');
    console.log('Debug: Creating array with 30 items');

    // Create an array of items with detailed descriptions
    const items = Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        title: `Item ${i + 1}`,
        description: 'This is a detailed description with enough text to make each item substantial. ' +
            'Adding more content to increase token count significantly. ' +
            'The more text we add, the more likely we are to see the splitting behavior in action.',
        metadata: {
            created: new Date(),
            category: `Category ${(i % 5) + 1}`,
            tags: Array.from({ length: 30 }, (_, j) => `tag${i}_${j}`),
            additionalInfo: {
                details: 'Adding more detailed information to increase the token count. ' +
                    'This helps demonstrate how the system handles large amounts of text. ' +
                    'The more content we add, the better we can see the splitting behavior.',
                extraData: {
                    field1: 'Additional field content to increase token count further. ' +
                        'This helps ensure we have enough text to demonstrate splitting.',
                    field2: 'Even more content in another field to maximize token usage. ' +
                        'This ensures we have plenty of text to work with.'
                }
            }
        }
    }));

    await processRegularExample(caller, 'Analyze these items:', items);

    // Example 3: Large object data split by properties (streaming)
    console.log('\n=== Example 3: Object Data (Streaming) ===');
    console.log('Debug: Creating object with 15 sections');

    const objectData = Object.fromEntries(
        Array.from({ length: 15 }, (_, i) => [
            `section${i + 1}`,
            {
                title: `Section ${i + 1}`,
                content: Array.from({ length: 30 }, () =>
                    'This is detailed content that contains substantial information for analysis. ' +
                    'Adding more descriptive text to ensure proper token count for splitting. ' +
                    'Each section needs to be large enough to demonstrate the splitting behavior. ' +
                    'Including additional context and details to make the content more comprehensive. ' +
                    'The more varied and detailed the text, the better we can see the splitting in action. '
                ).join(''),
                subsections: Array.from({ length: 8 }, (_, j) => ({
                    id: `${i + 1}.${j + 1}`,
                    title: `Subsection ${i + 1}.${j + 1}`,
                    details: Array.from({ length: 15 }, () =>
                        'Subsection content with extensive detail to contribute significantly to token count. ' +
                        'Each subsection contains enough information to make it substantial. ' +
                        'Adding varied content to ensure proper demonstration of splitting. ' +
                        'The subsection text helps build up the total token count effectively. ' +
                        'Including more context makes the splitting behavior more apparent. '
                    ).join(''),
                    metadata: {
                        type: `type_${(j % 3) + 1}`,
                        tags: Array.from({ length: 5 }, (_, k) => `tag_${i}_${j}_${k}`),
                        references: Array.from({ length: 3 }, (_, k) => ({
                            id: `ref_${i}_${j}_${k}`,
                            description: 'Reference description with enough detail to add to token count. ' +
                                'Making sure each reference contributes to the overall size effectively.'
                        }))
                    }
                }))
            }
        ])
    );

    // Add debug logs to show token count before streaming
    const tokenCalculator = (caller as any).tokenCalculator;
    const objectDataStr = JSON.stringify(objectData);
    console.log(`\nDebug: Object data size: ${objectDataStr.length} chars`);
    console.log(`Debug: Total tokens in object data: ${tokenCalculator.calculateTokens(objectDataStr)}`);
    console.log(`Debug: Model max tokens: ${caller.getModel('fast')?.maxRequestTokens}`);

    await processStreamExample(caller, 'Analyze these sections:', objectData);
}

main().catch(console.error); 