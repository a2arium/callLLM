import type { Scenario } from '../types.ts';
import { simpleChat } from './simpleChat.ts';
import { streamingChat } from './streaming.ts';
import { jsonOutput } from './jsonOutput.ts';
import { toolCalling } from './tools.ts';
import { imageGenerate } from './images.ts';
import { jsonRawSchema } from './jsonRawSchema.ts';
import { reasoningScenario } from './reasoning.ts';
import { usageTracking } from './usageTracking.ts';
import { embeddingsScenario } from './embeddings.ts';
import { toolFolderScenario } from './toolFolder.ts';
import { imageMaskedEdit } from './imageMaskedEdit.ts';
import { historyDynamic } from './historyDynamic.ts';
import { streamingTools } from './streamingTools.ts';
import { streamingJson } from './streamingJson.ts';

export const allScenarios: Scenario[] = [
    simpleChat,
    streamingChat,
    jsonOutput,
    jsonRawSchema,
    toolCalling,
    toolFolderScenario,
    imageGenerate,
    imageMaskedEdit,
    reasoningScenario,
    usageTracking,
    embeddingsScenario,
    historyDynamic,
    streamingTools,
    streamingJson
];


