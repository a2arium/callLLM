import dotenv from 'dotenv';
dotenv.config();

import { getRegisteredProviders, type RegisteredProviders } from '../src/adapters/index.ts';
import { LLMCaller } from '../src/core/caller/LLMCaller.ts';
import type { CapabilityRequirement } from '../src/core/models/ModelSelector.ts';
import { allScenarios } from './scenarios/index.ts';
import { resolveApiKey } from './providerConfig.ts';
import path from 'path';
import { getDirname } from '../src/utils/paths.ts';

const __dirname = getDirname(import.meta.url);

type RunOpts = {
    onlyProviders?: string[];
    onlyScenarios?: string[];
    judgeProvider?: RegisteredProviders;
    judgeModelAlias?: string;
    toolsFilter?: string[];
    onlyModels?: string[];
    allModels?: boolean;
};

function parseArgs(): RunOpts {
    const args = process.argv.slice(2);
    const getVal = (k: string) => {
        const idx = args.findIndex(a => a.startsWith(`--${k}=`));
        return idx >= 0 ? args[idx].split('=')[1] : undefined;
    };
    // Support both --providers and --provider
    const onlyProviders = (getVal('providers') || getVal('provider'))?.split(',').map(s => s.trim());
    const onlyScenarios = getVal('scenarios')?.split(',').map(s => s.trim());
    const judgeProvider = getVal('judgeProvider') as RegisteredProviders | undefined;
    const judgeModelAlias = getVal('judgeModelAlias') ?? 'premium';
    const toolsFilter = getVal('tools')?.split(',').map(s => s.trim());
    const onlyModels = getVal('models')?.split(',').map(s => s.trim());
    const allModels = args.includes('--all-models') || args.includes('--allModels');
    return { onlyProviders, onlyScenarios, judgeProvider, judgeModelAlias, toolsFilter, onlyModels, allModels };
}

async function resolveModelOrSkip(caller: LLMCaller, alias: string, req: CapabilityRequirement): Promise<string | null> {
    try {
        const modelInfo = caller.getModel(alias, req);
        return modelInfo?.name ?? null;
    } catch {
        return null;
    }
}

async function run() {
    const opts = parseArgs();
    const providers = getRegisteredProviders()
        .filter(p => !opts.onlyProviders || opts.onlyProviders.includes(p));

    const scenarios = allScenarios
        .filter(s => !opts.onlyScenarios || opts.onlyScenarios.includes(s.id));

    if (providers.length === 0) {
        console.log('No providers registered. Add adapters in src/adapters/index.ts');
        process.exit(1);
    }

    // Expose tools filter to scenarios that read from env (e.g., tool-folder)
    if (opts.toolsFilter && opts.toolsFilter.length > 0) {
        process.env.E2E_TOOLS = opts.toolsFilter.join(',');
    } else {
        delete process.env.E2E_TOOLS;
    }

    const results: Array<{ provider: string; scenario: string; pass: boolean; score: number; reason: string; cost?: number }> = [];

    for (const provider of providers as RegisteredProviders[]) {
        const apiKey = resolveApiKey(provider);

        for (const scenario of scenarios) {
            const selectorCaller = new LLMCaller(provider, 'cheap', 'You are a helpful assistant.', { apiKey });

            // Build the list of models to run for this provider
            let modelsToTest: string[] = [];
            if (opts.onlyModels && opts.onlyModels.length > 0) {
                modelsToTest = opts.onlyModels;
            } else if (opts.allModels) {
                try {
                    modelsToTest = selectorCaller.getAvailableModels().map(m => m.name);
                } catch {
                    modelsToTest = [];
                }
            } else {
                // Existing behavior: pick a single model via aliases and scenario requirements
                const preference: string[] = ['cheap', 'fast', 'balanced', 'premium'];
                let modelName: string | null = null;
                for (const alias of preference) {
                    modelName = await resolveModelOrSkip(selectorCaller, alias, scenario.requirements);
                    if (modelName) break;
                }
                // Special handling for streaming: prefer non-reasoning models when available
                if (scenario.id === 'streaming-chat') {
                    try {
                        const models = selectorCaller.getAvailableModels();
                        const candidates = models.filter(m => {
                            const caps = m.capabilities || { output: { text: { textOutputFormats: ['text'] } } as any } as any;
                            const textCap = caps.output?.text;
                            const supportsText = textCap !== false;
                            const supportsStreaming = Boolean(caps.streaming);
                            const isReasoning = Boolean(caps.reasoning);
                            return supportsText && supportsStreaming && !isReasoning;
                        });
                        if (candidates.length > 0) {
                            const fastest = candidates.reduce((a, b) => (a.characteristics.outputSpeed > b.characteristics.outputSpeed ? a : b));
                            modelName = fastest.name;
                        }
                    } catch { }
                }
                if (!modelName) {
                    console.log(`[skip] ${provider} lacks models for scenario '${scenario.id}'`);
                    continue;
                }
                modelsToTest = [modelName];
            }

            for (const modelName of modelsToTest) {
                // Provide testId, usageCallback, and toolsDir (when needed)
                const testId = `${scenario.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                const usageEvents: any[] = [];
                const constructorOpts: any = {
                    apiKey,
                    callerId: testId,
                    usageCallback: (usageData: any) => {
                        usageEvents.push(usageData);
                    }
                };
                if (scenario.id === 'tool-folder') {
                    constructorOpts.toolsDir = path.join(__dirname, '../examples/functions');
                }
                const caller = new LLMCaller(provider, modelName, 'You are a helpful assistant.', constructorOpts);
                // Log model capability summary for visibility
                try {
                    const mi = caller.getModel(modelName);
                    const caps: any = mi?.capabilities || {};
                    const formats = caps?.output?.text?.textOutputFormats || (caps?.output?.text === true ? ['text'] : []);
                    console.log(`\n--- Running '${scenario.title}' on ${provider} • model='${modelName}' • caps(stream=${Boolean(caps.streaming)}, reasoning=${Boolean(caps.reasoning)}, formats=${formats.join(',')}) ---`);
                } catch {
                    console.log(`\n--- Running '${scenario.title}' on ${provider} • model='${modelName}' ---`);
                }

                // If scenario needs images, ensure provider implements image interface
                const needsImages = Boolean(scenario.requirements.imageOutput?.required || scenario.requirements.imageInput?.required);
                const pm: any = (caller as any)["providerManager"];
                if (needsImages && pm && typeof pm.supportsImageGeneration === 'function' && !pm.supportsImageGeneration()) {
                    console.log(`[skip] ${provider} provider doesn’t support image API for '${scenario.id}'`);
                    continue;
                }

                try {
                    const started = Date.now();
                    const res = await scenario.run({ provider, model: modelName, caller });
                    const durationMs = Date.now() - started;

                    let pass = true, score = 1, reason = 'No judge provided';
                    if (scenario.judge) {
                        const j = await scenario.judge({ provider, model: modelName, caller }, res);
                        pass = j.pass; score = j.score; reason = j.reason;
                    }

                    const totalCost = res.usage?.costs?.total;
                    results.push({ provider, scenario: scenario.id, pass, score, reason, cost: totalCost });

                    const status = pass ? 'PASS' : 'FAIL';
                    const preview = (res.outputText ?? '').slice(0, 160).replace(/\s+/g, ' ');
                    const chunkInfo = res.metadata && (res.metadata as any).chunkCount ? ` • chunks=${(res.metadata as any).chunkCount}` : '';
                    const timeoutInfo = res.metadata && (res.metadata as any).timeout ? ` • timeout=true` : '';
                    const jsonKeys = res.contentObject && typeof res.contentObject === 'object' ? ` • keys=${Object.keys(res.contentObject as Record<string, unknown>).join(',')}` : '';
                    const imageInfo = res.metadata && ((res.metadata as any).imageSavedPath || (res.metadata as any).hasData) ? ` • image=${(res.metadata as any).imageSavedPath ? 'file' : 'base64'}` : '';
                    const tokenInfo = res.usage?.tokens ? ` • tokens(in=${res.usage.tokens.input?.total ?? 0},out=${res.usage.tokens.output?.total ?? 0})` : '';
                    const cbInfo = ` • usageCallbacks=${usageEvents.length}`;
                    console.log(`[${status}] ${provider} • ${scenario.title} (${durationMs}ms) • testId=${testId} • score=${score.toFixed(2)} • cost=${totalCost ?? 0}${chunkInfo}${timeoutInfo}${jsonKeys}${imageInfo}${tokenInfo}${cbInfo}`);
                    console.log(`RESULT: ${pass ? 'PASSED' : 'FAILED'} • testId=${testId}`);
                    if (reason) {
                        console.log(`judge: ${reason}`);
                    }
                    if (preview) {
                        console.log(`preview: ${preview}${(res.outputText ?? '').length > 160 ? '…' : ''}`);
                    }
                } catch (err) {
                    console.log(`[ERROR] ${provider} • ${scenario.title}:`, err instanceof Error ? err.message : String(err));
                    results.push({ provider, scenario: scenario.id, pass: false, score: 0, reason: 'Exception' });
                }
            }
        }
    }

    const passed = results.filter(r => r.pass).length;
    const total = results.length;
    console.log(`\nCompleted: ${passed}/${total} passed`);

    if (process.env.OUTPUT_JSON) {
        console.log(JSON.stringify({ results }, null, 2));
    }
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});


