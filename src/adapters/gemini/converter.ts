import type { UniversalChatParams, UniversalChatResponse, UniversalMessage, ResponseFormat, Usage, ReasoningEffort } from '../../interfaces/UniversalInterfaces.ts';
import { FinishReason } from '../../interfaces/UniversalInterfaces.ts';
import type { ToolDefinition, ToolCall } from '../../types/tooling.ts';
import { logger } from '../../utils/logger.ts';
import { ModelManager } from '../../core/models/ModelManager.ts';
import { SchemaValidator } from '../../core/schema/SchemaValidator.ts';
import { SchemaSanitizer } from '../../core/schema/SchemaSanitizer.ts';
import type { FunctionDeclaration } from '@google/genai';
import { getMimeTypeFromExtension } from '../../core/file-data/fileData.ts';
import { TokenCalculator } from '../../core/models/TokenCalculator.ts';
import type {
    GeminiContent,
    GeminiGenerateParams,
    GeminiResponse,
} from './types.ts';

export class GeminiConverter {
    constructor(private modelManager: ModelManager) {}

    async convertToProviderParams(model: string, params: UniversalChatParams, _opts?: { stream?: boolean }): Promise<GeminiGenerateParams> {
        const log = logger.createLogger({ prefix: 'GeminiConverter.convertToProviderParams' });
        const { messages, settings, responseFormat, jsonSchema, tools, systemMessage } = params;

        const config: Record<string, unknown> = {};
        const geminiContents: GeminiContent[] = [];

        // Handle system message
        const systemParts = this.extractSystemMessage(messages, systemMessage);
        if (systemParts) {
            config.systemInstruction = systemParts;
        }

        // Map messages
        for (const msg of messages) {
            if (msg.role === 'system' || msg.role === 'developer') continue;
            const contents = await this.mapMessage(msg);
            if (contents) {
                geminiContents.push(...contents);
            }
        }

        // Map settings
        if (settings) {
            if (settings.temperature !== undefined) config.temperature = settings.temperature;
            if (settings.topP !== undefined) config.topP = settings.topP;
            if (settings.maxTokens !== undefined) config.maxOutputTokens = settings.maxTokens;
            if (settings.stop !== undefined) {
                config.stopSequences = Array.isArray(settings.stop) ? settings.stop : [settings.stop];
            }
            if (settings.presencePenalty !== undefined) config.presencePenalty = settings.presencePenalty;
            if (settings.frequencyPenalty !== undefined) config.frequencyPenalty = settings.frequencyPenalty;

            // Reasoning / thinking
            const effort = settings.reasoning?.effort;
            if (effort) {
                config.thinkingConfig = {
                    includeThoughts: true,
                };
            }

            // Verbosity mapping
            if (settings.verbosity && !settings.maxTokens) {
                config.maxOutputTokens = this.mapVerbosityToMaxTokens(settings.verbosity);
            }

            // Provider options passthrough
            if (settings.providerOptions) {
                Object.assign(config, settings.providerOptions);
            }
        }

        // Map JSON schema / response format
        if (jsonSchema) {
            const raw = SchemaValidator.getSchemaObject(jsonSchema.schema);
            const sanitized = SchemaSanitizer.sanitize(raw as Record<string, unknown>, {
                addHintsToDescriptions: true,
                normalizeDefs: true,
                stripMetaKeys: true,
            });
            config.responseMimeType = 'application/json';
            config.responseJsonSchema = sanitized;
            log.debug('Set responseJsonSchema with sanitized schema');
        } else if (this.isJsonMode(responseFormat)) {
            config.responseMimeType = 'application/json';
        }

        // Map tools
        if (tools && tools.length > 0) {
            const functionDeclarations: FunctionDeclaration[] = tools.map((t: ToolDefinition) => {
                if (!t.name) {
                    throw new Error('Tool name is required');
                }
                const decl: FunctionDeclaration = {
                    name: t.name,
                    description: t.description || undefined,
                };

                if (t.parameters) {
                    const rawParams = t.parameters as Record<string, unknown>;
                    const sanitizedParams = SchemaSanitizer.sanitize(rawParams, {
                        addHintsToDescriptions: true,
                        normalizeDefs: true,
                        stripMetaKeys: true,
                    });
                    decl.parametersJsonSchema = sanitizedParams;
                }

                return decl;
            });

            config.tools = [{ functionDeclarations }];
            log.debug(`Mapped ${functionDeclarations.length} tool declarations`);
        }

        const result: GeminiGenerateParams = {
            model,
            contents: geminiContents,
            ...(Object.keys(config).length > 0 ? { config } : {}),
        };

        log.debug('Converted provider params:', { model, contentCount: geminiContents.length, hasConfig: Object.keys(config).length > 0 });
        return result;
    }

    convertFromProviderResponse(resp: GeminiResponse, model?: string): UniversalChatResponse {
        const log = logger.createLogger({ prefix: 'GeminiConverter.convertFromProviderResponse' });

        const candidates = resp.candidates ?? [];
        const firstCandidate = candidates[0];
        const content = firstCandidate?.content;
        const parts = content?.parts ?? [];

        let textContent: string | null = null;
        let reasoning: string | undefined;
        const toolCalls: ToolCall[] = [];
        const toolResultMessages: UniversalMessage[] = [];
        let generatedImage: UniversalChatResponse['image'] = undefined;

        // Collect thought signatures from parts for round-tripping
        const thoughtSignatures: Array<{ partIndex: number; signature: string }> = [];
        const rawParts: Array<Record<string, unknown>> = [];

        let finishReason = this.mapFinishReason(firstCandidate?.finishReason);

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];

            // Store raw part for potential round-tripping
            rawParts.push(part as unknown as Record<string, unknown>);

            // Collect thought signatures
            if ((part as Record<string, unknown>).thoughtSignature) {
                thoughtSignatures.push({
                    partIndex: i,
                    signature: (part as Record<string, unknown>).thoughtSignature as string,
                });
            }

            // Thought/reasoning parts
            if (part.thought && part.text) {
                reasoning = (reasoning ?? '') + part.text;
                continue;
            }

            // Text parts
            if (part.text !== undefined && part.text !== null) {
                textContent = (textContent ?? '') + part.text;
            }

            // Function call parts
            if (part.functionCall) {
                const fc = part.functionCall;
                toolCalls.push({
                    id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    name: fc.name ?? '',
                    arguments: (fc.args ?? {}) as Record<string, unknown>,
                });
                finishReason = FinishReason.TOOL_CALLS;
            }

            // Function response parts
            if (part.functionResponse) {
                toolResultMessages.push({
                    role: 'tool',
                    content: JSON.stringify(part.functionResponse.response ?? {}),
                    name: part.functionResponse.name,
                });
            }

            // Inline data (generated images/audio)
            if (part.inlineData) {
                const blob = part.inlineData;
                if (blob.mimeType?.startsWith('image/')) {
                    generatedImage = {
                        data: blob.data ?? '',
                        dataSource: 'base64',
                        mime: blob.mimeType,
                        width: 0,
                        height: 0,
                        operation: 'generate',
                    };
                }
            }
        }

        // If we have tool calls, content should be null
        if (toolCalls.length > 0) {
            textContent = null;
        }

        const universal: UniversalChatResponse = {
            content: textContent,
            reasoning,
            role: 'assistant',
            image: generatedImage,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            messages: toolResultMessages.length > 0 ? toolResultMessages : undefined,
            metadata: {
                finishReason,
                model: resp.modelVersion,
                usage: this.mapUsage(resp.usageMetadata as Record<string, unknown> | undefined, model),
                // Store raw Gemini parts with thought signatures for round-tripping
                ...(rawParts.length > 0 ? { rawGeminiParts: rawParts } : {}),
                ...(thoughtSignatures.length > 0 ? { thoughtSignatures } : {}),
            },
        };

        log.debug('Converted universal response:', {
            hasContent: textContent !== null,
            hasReasoning: Boolean(reasoning),
            hasImage: Boolean(generatedImage),
            toolCallCount: toolCalls.length,
            finishReason,
        });
        return universal;
    }

    private extractSystemMessage(messages: UniversalMessage[], systemMessage?: string): string | undefined {
        const systemParts: string[] = [];
        for (const msg of messages) {
            if (msg.role === 'system' || msg.role === 'developer') {
                systemParts.push(msg.content);
            }
        }
        if (systemMessage) {
            systemParts.push(systemMessage);
        }
        return systemParts.length > 0 ? systemParts.join('\n\n') : undefined;
    }

    private async mapMessage(msg: UniversalMessage): Promise<GeminiContent[] | null> {
        const results: GeminiContent[] = [];

        if (msg.role === 'tool') {
            // Tool results -> function response part
            results.push({
                role: 'user',
                parts: [{
                    functionResponse: {
                        name: msg.name ?? 'unknown',
                        response: {
                            output: msg.content,
                        },
                    },
                }],
            });
            return results;
        }

        const geminiRole: 'user' | 'model' = msg.role === 'assistant' ? 'model' : 'user';

        const parts: Array<Record<string, unknown>> = [];

        // If the assistant message has tool calls, map them as function call parts
        if (msg.toolCalls && msg.toolCalls.length > 0) {
            // Check if we have raw Gemini parts with thought signatures stored in metadata
            const rawParts = (msg.metadata as Record<string, unknown>)?.rawGeminiParts as Array<Record<string, unknown>> | undefined;
            if (rawParts && rawParts.length > 0) {
                // Use the raw parts directly to preserve thought signatures
                results.push({ role: geminiRole, parts: rawParts } as GeminiContent);
                return results;
            }

            for (const tc of msg.toolCalls) {
                // Handle both ToolCall format (name/arguments direct) and OpenAI format (function.name/arguments)
                const tcName = 'name' in tc ? tc.name : '';
                const tcArgs = 'arguments' in tc
                    ? (tc.arguments as Record<string, unknown>)
                    : {};
                parts.push({
                    functionCall: {
                        name: tcName,
                        args: tcArgs,
                    },
                });
            }
            results.push({ role: geminiRole, parts } as GeminiContent);
            return results;
        }

        // Handle file placeholders in message content
        if (msg.content) {
            const fileRefs = this.parseFileReferences(msg.content);
            if (fileRefs.length > 0) {
                // If the entire content is a single file reference, emit just the file part
                if (fileRefs.length === 1 && fileRefs[0].full === msg.content.trim()) {
                    const filePart = await this.resolveFileReference(fileRefs[0].path);
                    if (filePart) {
                        parts.push(filePart);
                    }
                } else {
                    // Mixed text + file references
                    let remaining = msg.content;
                    for (const ref of fileRefs) {
                        const beforeText = remaining.substring(0, remaining.indexOf(ref.full)).trim();
                        if (beforeText) {
                            parts.push({ text: beforeText });
                        }
                        const filePart = await this.resolveFileReference(ref.path);
                        if (filePart) {
                            parts.push(filePart);
                        }
                        remaining = remaining.substring(remaining.indexOf(ref.full) + ref.full.length);
                    }
                    if (remaining.trim()) {
                        parts.push({ text: remaining.trim() });
                    }
                }
            } else {
                // Regular text content
                parts.push({ text: msg.content });
            }
        }

        if (parts.length === 0) return null;

        results.push({ role: geminiRole, parts } as GeminiContent);
        return results;
    }

    /**
     * Parse <file:...> placeholders from message content
     */
    private parseFileReferences(content: string): Array<{ full: string; path: string }> {
        const refs: Array<{ full: string; path: string }> = [];
        const regex = /<file:(.*?)>/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            refs.push({ full: match[0], path: match[1] });
        }
        return refs;
    }

    /**
     * Resolve a file reference path to a Gemini Part (inlineData or fileData)
     */
    private async resolveFileReference(filePath: string): Promise<Record<string, unknown> | null> {
        // Data URI: data:mime/type;base64,base64data
        if (filePath.startsWith('data:')) {
            const match = filePath.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
                return {
                    inlineData: {
                        mimeType: match[1],
                        data: match[2],
                    },
                };
            }
            return null;
        }

        // URL: https://... or http://...
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
            const mimeFromUrl = this.guessMimeFromUrl(filePath);
            return {
                fileData: {
                    fileUri: filePath,
                    mimeType: mimeFromUrl,
                },
            };
        }

        // Local file path: read the file and send as inlineData
        try {
            const fs = await import('fs/promises');
            const pathModule = await import('path');
            const resolved = pathModule.resolve(filePath);
            const buffer = await fs.readFile(resolved);
            const base64Data = buffer.toString('base64');
            const mime = getMimeTypeFromExtension(filePath);
            return {
                inlineData: {
                    mimeType: mime,
                    data: base64Data,
                },
            };
        } catch (err) {
            // If file can't be read, return null (will be skipped)
            return null;
        }
    }

    private guessMimeFromUrl(url: string): string {
        const pathPart = url.split('?')[0].split('#')[0];
        const ext = pathPart.includes('.') ? pathPart.split('.').pop()!.toLowerCase() : '';
        const mimeMap: Record<string, string> = {
            jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
            gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
            mp3: 'audio/mp3', wav: 'audio/wav', ogg: 'audio/ogg',
            mp4: 'video/mp4', webm: 'video/webm', avi: 'video/avi',
            pdf: 'application/pdf',
        };
        return mimeMap[ext] ?? 'application/octet-stream';
    }

    private isJsonMode(format: ResponseFormat | undefined): boolean {
        if (!format) return false;
        if (format === 'json') return true;
        if (typeof format === 'object' && 'type' in format && (format as Record<string, unknown>).type === 'json_object') return true;
        return false;
    }

    private mapThinkingLevel(effort: ReasoningEffort): string {
        if (effort === 'minimal') return 'MINIMAL';
        if (effort === 'low') return 'LOW';
        if (effort === 'high') return 'HIGH';
        return 'MEDIUM';
    }

    private mapVerbosityToMaxTokens(verbosity: 'low' | 'medium' | 'high'): number {
        switch (verbosity) {
            case 'low': return 256;
            case 'medium': return 1024;
            case 'high': return 4096;
        }
    }

    private mapFinishReason(reason: string | undefined): FinishReason {
        if (!reason) return FinishReason.STOP;
        switch (reason) {
            case 'STOP': return FinishReason.STOP;
            case 'MAX_TOKENS': return FinishReason.LENGTH;
            case 'SAFETY': return FinishReason.CONTENT_FILTER;
            case 'RECITATION': return FinishReason.CONTENT_FILTER;
            default: return FinishReason.NULL;
        }
    }

    private mapUsage(usageMeta: Record<string, unknown> | undefined, model?: string): Usage | undefined {
        if (!usageMeta || typeof usageMeta !== 'object') return undefined;

        const meta = usageMeta as Record<string, number | unknown>;
        const inputTokens = typeof meta.promptTokenCount === 'number' ? meta.promptTokenCount : 0;
        const outputTokens = typeof meta.candidatesTokenCount === 'number' ? meta.candidatesTokenCount : 0;
        const thinkingTokens = typeof meta.thoughtsTokenCount === 'number' ? meta.thoughtsTokenCount : 0;
        const cachedTokens = typeof meta.cachedContentTokenCount === 'number' ? meta.cachedContentTokenCount : 0;
        const totalTokens = typeof meta.totalTokenCount === 'number' ? meta.totalTokenCount : inputTokens + outputTokens + thinkingTokens;

        // Compute costs from model pricing
        let costs: Usage['costs'] = {
            input: { total: 0, cached: 0 },
            output: { total: 0, reasoning: 0 },
            total: 0,
            unit: 'USD',
        };

        if (model) {
            const modelInfo = this.modelManager.getModel(model);
            if (modelInfo) {
                const tokenCalc = new TokenCalculator();
                costs = tokenCalc.calculateUsage(
                    inputTokens,
                    outputTokens,
                    modelInfo.inputPricePerMillion ?? 0,
                    modelInfo.outputPricePerMillion ?? 0,
                    cachedTokens,
                    modelInfo.inputCachedPricePerMillion,
                    thinkingTokens,
                );
            }
        }

        const usage: Usage = {
            tokens: {
                input: {
                    total: inputTokens,
                    cached: cachedTokens,
                },
                output: {
                    total: outputTokens,
                    reasoning: thinkingTokens,
                },
                total: totalTokens,
            },
            costs,
        };
        return usage;
    }

    minimalConvert(_ev: unknown): { content: string; role: string; isComplete: boolean } {
        return { content: '', role: 'assistant', isComplete: false };
    }
}
