/**
 * Exercises the published ESM declaration graph with skipLibCheck disabled.
 * Fails if dist is missing modules or uses unresolvable import specifiers.
 */
import type { LLMCaller } from '../dist/esm/core/caller/LLMCaller.js';
import type { ProviderAdapter } from '../dist/esm/adapters/types.js';
import type { StreamChunk, ToolCallChunk } from '../dist/esm/core/streaming/types.js';
import type { UniversalChatResponse } from '../dist/esm/interfaces/UniversalInterfaces.js';
import type { UsageTrackingProcessor } from '../dist/esm/core/streaming/processors/UsageTrackingProcessor.js';

export type Verification = [LLMCaller, ProviderAdapter, StreamChunk, ToolCallChunk, UniversalChatResponse, UsageTrackingProcessor];
