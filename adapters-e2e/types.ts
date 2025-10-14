import type { LLMCaller } from '../src/core/caller/LLMCaller.ts';
import type { RegisteredProviders } from '../src/adapters/index.ts';
import type { Usage } from '../src/interfaces/UniversalInterfaces.ts';
import type { CapabilityRequirement } from '../src/core/models/ModelSelector.ts';

export type ScenarioResult = {
    outputText?: string;
    contentObject?: unknown;
    strictContentObject?: unknown;
    streamed?: boolean;
    usage?: Usage;
    metadata?: Record<string, unknown>;
};

export type Judgement = {
    pass: boolean;
    score: number; // 0..1
    reason: string;
};

export type ScenarioContext = {
    provider: RegisteredProviders;
    model: string;
    caller: LLMCaller;
};

export type Scenario = {
    id: string;
    title: string;
    requirements: CapabilityRequirement;
    run: (ctx: ScenarioContext) => Promise<ScenarioResult>;
    judge?: (ctx: ScenarioContext, result: ScenarioResult) => Promise<Judgement>;
};


