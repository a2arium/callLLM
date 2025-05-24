import { LLMCaller } from '../../src/core/caller/LLMCaller.ts';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { getDirname } from '../../src/utils/paths.ts';
import type { HistoryMode } from '../../src/interfaces/UniversalInterfaces.ts';

// Get the directory of this file
const __dirname = getDirname(import.meta.url);

// Path to the websiteContent.md file
const websiteContentPath = path.resolve(__dirname, './websiteContent.md');

// Load the website content as a string
const websiteContent = {
    content: fs.readFileSync(websiteContentPath, 'utf-8')
};

// Define the schema for events
const websiteEvents = z.array(z.object({
    title: z.string().describe('The name of the event'),
    description: z.string().describe('The description of the event'),
    date: z.string().describe('The date of the event in format YYYY-MM-DD'),
    time: z.string().describe('The time of the event in format HH:MM (24 hours format)'),
    duration: z.string().describe('The duration of the event, format HH:MM, leave empty if not provided'),
    auditorium: z.string().describe('The location of the event in the venue, such as room or auditorium, leave empty if not provided'),
    prices: z.array(z.number()).describe('The prices of the event, leave empty if not provided'),
    link: z.string().describe('The link to the detailed event page, leave empty if not provided'),
    image: z.string().describe('The URL of the image of the event, leave empty if not provided'),
    isSoldOut: z.boolean().describe('If mentioned in the content that the event is sold out, provide true, otherwise false'),
    comments: z.array(z.string()).describe('Any additional comments of the event, leave empty if not provided'),
}));

const websiteContentSchema = z.object({
    events: websiteEvents,
    moreEvents: z.boolean().describe('Whether there are more events on the page than you return (i.e. not all events are captured), if so, provide true, otherwise false'),
});

const ANALYSIS_PROMPT = `Analyze the following website content about the event and provide structured output with details about the event. \nContent is prosented in format line number: content line. If content is not enough, provide an empty array. \nIf you cannot capture all events, provide most of what you can from top of the page.`;

// Define agent-specific LLM configuration
const llmAgentConfig = {
    provider: 'openai',
    modelAliasOrName: 'fast',
    systemPrompt: 'You are an AI assistant that provides concise, accurate responses.',
    historyMode: 'stateless'
};

async function main() {
    // Initialize the LLMCaller with the agent config
    const caller = new LLMCaller(
        llmAgentConfig.provider as 'openai',
        llmAgentConfig.modelAliasOrName,
        llmAgentConfig.systemPrompt,
        {
            historyMode: llmAgentConfig.historyMode as HistoryMode,
            maxIterations: 60  // Increase to handle more chunks temporarily
        }
    );

    console.log('websiteContent.content length: ', websiteContent.content.length);

    // Start timing
    const startTime = Date.now();

    // Call the LLM with the analysis prompt and website content
    const chunkedResponses = await caller.call(
        ANALYSIS_PROMPT,
        {
            data: websiteContent.content,
            jsonSchema: {
                name: 'websiteContent',
                schema: websiteContentSchema,
            },
            settings: {
                temperature: 0.9
            },
            maxCharsPerChunk: 10000
        }
    );

    // End timing
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log(`\n🚀 Processing completed in ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log(`📊 Processed ${chunkedResponses.length} chunks in parallel`);

    // Output the result
    console.log('\n--- Website Content Analysis Result ---\n');
    for (const [i, response] of chunkedResponses.entries()) {
        console.log(`Response ${i + 1}:`);
        if (response.contentObject) {
            console.dir(response.contentObject, { depth: null });
        } else {
            console.log(response.content);
        }
        if (response.metadata) {
            console.log('Metadata:', response.metadata);
        }
        console.log('---\n');
    }
}

main().catch((err) => {
    console.error('Error during website content analysis:', err);
}); 