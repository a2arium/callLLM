import type {
    ModelInfo,
    JSONSchemaDefinition,
    ReasoningEffort,
    ResponseFormat,
    UniversalChatParams,
    UniversalChatResponse,
    UniversalMessage,
    Usage,
    RerankParams,
    RerankResponse
} from '../../interfaces/UniversalInterfaces.ts';
import { FinishReason } from '../../interfaces/UniversalInterfaces.ts';
import { ModelManager } from '../../core/models/ModelManager.ts';
import { SchemaSanitizer } from '../../core/schema/SchemaSanitizer.ts';
import { SchemaValidator } from '../../core/schema/SchemaValidator.ts';
import type { ToolCall, ToolDefinition } from '../../types/tooling.ts';
import { logger } from '../../utils/logger.ts';
import { SiliconFlowValidationError } from './errors.ts';
import {
    createSiliconFlowReasoningState,
    getSiliconFlowReasoningContent,
    type SiliconFlowChatCompletion,
    type SiliconFlowCreateParams,
    type SiliconFlowMessage,
    type SiliconFlowProviderOptions,
    type SiliconFlowTool,
    type SiliconFlowToolCall,
    type SiliconFlowRerankRequest,
    type SiliconFlowRerankResponse
} from './types.ts';

const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object';

export class SiliconFlowConverter {
    constructor(private readonly modelManager: ModelManager) {}

    convertToProviderRerankParams(model: string, params: RerankParams): SiliconFlowRerankRequest {
        const namespace = isRecord(params.providerOptions?.siliconflow)
            ? params.providerOptions.siliconflow
            : {};
        const reserved = new Set(['model', 'query', 'documents', 'top_n', 'return_documents']);
        const extra: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(namespace)) {
            if (!reserved.has(key)) extra[key] = value;
        }

        const maxChunks = extra.max_chunks_per_doc;
        if (maxChunks !== undefined && (!Number.isInteger(maxChunks) || (maxChunks as number) < 1)) {
            throw new SiliconFlowValidationError('max_chunks_per_doc must be a positive integer');
        }
        const overlap = extra.overlap_tokens;
        if (overlap !== undefined && (!Number.isInteger(overlap) || (overlap as number) < 0 || (overlap as number) > 80)) {
            throw new SiliconFlowValidationError('overlap_tokens must be an integer between 0 and 80');
        }
        if (
            (maxChunks !== undefined || overlap !== undefined) &&
            !['BAAI/bge-reranker-v2-m3', 'netease-youdao/bce-reranker-base_v1'].includes(model)
        ) {
            throw new SiliconFlowValidationError(`Chunking options are not supported by reranker model ${model}`);
        }

        return {
            ...extra,
            model,
            query: params.query,
            documents: params.documents,
            ...(params.topN !== undefined ? { top_n: params.topN } : {}),
            return_documents: false
        };
    }

    convertFromProviderRerankResponse(
        responseValue: unknown,
        model: string
    ): RerankResponse {
        if (!isRecord(responseValue) || !Array.isArray(responseValue.results)) {
            throw new SiliconFlowValidationError('SiliconFlow returned an invalid rerank response');
        }
        const response = responseValue as unknown as SiliconFlowRerankResponse;
        for (const result of response.results) {
            if (
                !isRecord(result) ||
                !Number.isInteger(result.index) ||
                typeof result.relevance_score !== 'number' ||
                !Number.isFinite(result.relevance_score)
            ) {
                throw new SiliconFlowValidationError('SiliconFlow returned an invalid rerank result');
            }
        }
        const input = this.numberValue(
            response.tokens?.input_tokens,
            this.numberValue(response.meta?.tokens?.input_tokens)
        );
        const output = this.numberValue(
            response.tokens?.output_tokens,
            this.numberValue(response.meta?.tokens?.output_tokens)
        );
        const measurements = [
            {
                name: 'searches',
                value: this.numberValue(response.meta?.billed_units?.search_units),
                unit: 'search',
                source: 'provider' as const
            },
            {
                name: 'classifications',
                value: this.numberValue(response.meta?.billed_units?.classifications),
                unit: 'classification',
                source: 'provider' as const
            }
        ].filter(measurement => measurement.value > 0);
        const modelInfo = this.modelManager.getModel(model);
        const pricing = modelInfo?.rerankPricing;
        const inputCost = pricing?.unit === 'token'
            ? input * pricing.price / pricing.per
            : input * (modelInfo?.inputPricePerMillion ?? 0) / 1_000_000;
        return {
            results: response.results.map(result => ({
                index: result.index,
                relevanceScore: result.relevance_score
            })),
            model,
            usage: {
                tokens: {
                    input: { total: input, cached: 0 },
                    output: { total: output, reasoning: 0 },
                    total: input + output
                },
                costs: {
                    input: { total: inputCost, cached: 0 },
                    output: { total: 0, reasoning: 0 },
                    total: inputCost,
                    unit: 'USD'
                },
                ...(measurements.length > 0 ? { measurements } : {})
            },
            metadata: {
                callId: typeof response.id === 'string' ? response.id : undefined,
                created: Date.now(),
                model
            }
        };
    }

    async convertToProviderParams(
        model: string,
        params: UniversalChatParams,
        options?: { stream?: boolean }
    ): Promise<SiliconFlowCreateParams> {
        const log = logger.createLogger({ prefix: 'SiliconFlowConverter.convertToProviderParams' });
        const providerParams: SiliconFlowCreateParams = {
            model,
            messages: this.mapMessages(params.messages),
            stream: options?.stream === true
        };

        const settings = params.settings;
        if (settings) {
            if (settings.temperature !== undefined) providerParams.temperature = settings.temperature;
            if (settings.topP !== undefined) providerParams.top_p = settings.topP;
            if (settings.maxTokens !== undefined) providerParams.max_tokens = settings.maxTokens;
            if (settings.frequencyPenalty !== undefined) providerParams.frequency_penalty = settings.frequencyPenalty;
            if (settings.presencePenalty !== undefined) providerParams.presence_penalty = settings.presencePenalty;
            if (settings.stop !== undefined) providerParams.stop = settings.stop;
            if (settings.n !== undefined) providerParams.n = settings.n;
            if (settings.user !== undefined) providerParams.user = settings.user;
            if (settings.logitBias !== undefined) providerParams.logit_bias = settings.logitBias;
            if (settings.toolChoice !== undefined) providerParams.tool_choice = settings.toolChoice;

            this.mapReasoningSettings(model, settings.reasoning?.effort, providerParams);
            this.mapVerbosity(model, settings.verbosity, settings.maxTokens, providerParams);

            const siliconflowOptions = settings.providerOptions?.siliconflow;
            if (isRecord(siliconflowOptions)) {
                Object.assign(
                    providerParams,
                    siliconflowOptions as SiliconFlowProviderOptions
                );
                providerParams.model = model;
                providerParams.messages = this.mapMessages(params.messages);
                providerParams.stream = options?.stream === true;
            }
        }

        if (params.tools?.length) {
            providerParams.tools = params.tools.map(tool => this.mapTool(tool));
        }

        if (
            (params.jsonSchema || this.isJsonMode(params.responseFormat)) &&
            this.supportsNativeJson(model)
        ) {
            // SiliconFlow documents JSON object mode, not JSON Schema constrained decoding.
            // The core prompt/validation pipeline carries the actual schema.
            providerParams.response_format = { type: 'json_object' };
        }

        if (params.jsonSchema && !this.hasFormatInstruction(params.messages)) {
            providerParams.messages = [
                this.createSchemaInstruction(params.jsonSchema.schema),
                ...providerParams.messages
            ];
        }

        if (options?.stream) {
            providerParams.stream_options = { include_usage: true };
        }

        log.debug('Provider params prepared:', providerParams);
        return providerParams;
    }

    convertFromProviderResponse(response: unknown): UniversalChatResponse {
        if (!isRecord(response) || !Array.isArray(response.choices) || response.choices.length === 0) {
            throw new SiliconFlowValidationError('SiliconFlow returned a response without choices');
        }

        const completion = response as unknown as SiliconFlowChatCompletion;
        const choice = completion.choices[0];
        const message = choice.message;
        const reasoning = typeof message.reasoning_content === 'string'
            ? message.reasoning_content
            : undefined;
        const toolCalls = this.mapProviderToolCalls(message.tool_calls);

        return {
            content: typeof message.content === 'string' ? message.content : null,
            reasoning,
            role: message.role || 'assistant',
            toolCalls,
            metadata: {
                finishReason: this.mapFinishReason(choice.finish_reason),
                created: completion.created,
                model: completion.model,
                provider: 'siliconflow',
                usage: this.mapUsage(completion.usage, completion.model),
                providerState: reasoning
                    ? createSiliconFlowReasoningState(reasoning)
                    : undefined
            }
        };
    }

    mapUsage(usageValue: unknown, model: string): Usage | undefined {
        if (!isRecord(usageValue)) return undefined;

        const input = this.numberValue(usageValue.prompt_tokens);
        const output = this.numberValue(usageValue.completion_tokens);
        const total = this.numberValue(usageValue.total_tokens, input + output);
        const promptDetails = isRecord(usageValue.prompt_tokens_details)
            ? usageValue.prompt_tokens_details
            : undefined;
        const completionDetails = isRecord(usageValue.completion_tokens_details)
            ? usageValue.completion_tokens_details
            : undefined;
        const cached = this.numberValue(promptDetails?.cached_tokens);
        const reasoning = this.numberValue(completionDetails?.reasoning_tokens);
        const modelInfo = this.modelManager.getModel(model);

        return {
            tokens: {
                input: { total: input, cached },
                output: { total: output, reasoning },
                total
            },
            costs: this.calculateCosts(input, cached, output, reasoning, modelInfo)
        };
    }

    mapFinishReason(reason: string | null | undefined): FinishReason {
        switch (reason) {
            case 'stop': return FinishReason.STOP;
            case 'length': return FinishReason.LENGTH;
            case 'tool_calls':
            case 'function_call':
                return FinishReason.TOOL_CALLS;
            case 'content_filter': return FinishReason.CONTENT_FILTER;
            default: return reason ? FinishReason.NULL : FinishReason.STOP;
        }
    }

    private mapMessages(messages: UniversalMessage[]): SiliconFlowMessage[] {
        return messages.map(message => {
            const mapped: SiliconFlowMessage = {
                role: this.mapRole(message.role),
                content: message.content || (message.toolCalls?.length ? null : '')
            };

            if (message.name) mapped.name = message.name;
            if (message.toolCallId) mapped.tool_call_id = message.toolCallId;
            if (message.toolCalls?.length) {
                mapped.tool_calls = message.toolCalls.map(toolCall =>
                    this.mapUniversalToolCall(toolCall)
                );
            }

            const reasoningContent = getSiliconFlowReasoningContent(
                message.metadata?.providerState
            );
            if (reasoningContent !== undefined && mapped.role === 'assistant') {
                mapped.reasoning_content = reasoningContent;
            }

            return mapped;
        });
    }

    private mapRole(role: UniversalMessage['role']): SiliconFlowMessage['role'] {
        if (role === 'developer') return 'system';
        if (role === 'function') return 'tool';
        return role;
    }

    private mapUniversalToolCall(
        toolCall: NonNullable<UniversalMessage['toolCalls']>[number]
    ): SiliconFlowToolCall {
        if ('function' in toolCall) {
            return {
                id: toolCall.id,
                type: 'function',
                function: {
                    name: toolCall.function.name,
                    arguments: toolCall.function.arguments
                }
            };
        }
        return {
            id: toolCall.id,
            type: 'function',
            function: {
                name: toolCall.name,
                arguments: JSON.stringify(toolCall.arguments)
            }
        };
    }

    private mapProviderToolCalls(
        toolCalls: SiliconFlowToolCall[] | undefined
    ): ToolCall[] | undefined {
        if (!toolCalls?.length) return undefined;
        return toolCalls.map(toolCall => ({
            id: toolCall.id,
            name: toolCall.function.name,
            arguments: this.parseArguments(toolCall.function.arguments)
        }));
    }

    private parseArguments(argumentsValue: string): Record<string, unknown> {
        try {
            const parsed: unknown = JSON.parse(argumentsValue);
            return isRecord(parsed) ? parsed : { value: parsed };
        } catch {
            return { rawArguments: argumentsValue };
        }
    }

    private mapTool(tool: ToolDefinition): SiliconFlowTool {
        if (!tool.name || !tool.parameters) {
            throw new SiliconFlowValidationError(
                `Invalid tool definition: ${tool.name || 'unnamed tool'}`
            );
        }

        const parameters = SchemaSanitizer.sanitize(
            tool.parameters as unknown as Record<string, unknown>,
            {
                addHintsToDescriptions: true,
                forceAllRequired: false,
                forceNoAdditionalProps: false,
                normalizeDefs: true,
                stripMetaKeys: true,
                stripCompositionKeywords: false
            }
        );

        return {
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description || undefined,
                parameters
            }
        };
    }

    private mapReasoningSettings(
        model: string,
        effort: ReasoningEffort | undefined,
        providerParams: SiliconFlowCreateParams
    ): void {
        if (!effort || !this.modelManager.getModel(model)?.capabilities?.reasoning) return;
        providerParams.enable_thinking = true;
        providerParams.thinking_budget = this.mapThinkingBudget(effort);
    }

    private mapThinkingBudget(effort: ReasoningEffort): number {
        switch (effort) {
            case 'minimal': return 512;
            case 'low': return 2048;
            case 'high': return 16384;
            default: return 8192;
        }
    }

    private mapVerbosity(
        model: string,
        verbosity: 'low' | 'medium' | 'high' | undefined,
        explicitMaxTokens: number | undefined,
        providerParams: SiliconFlowCreateParams
    ): void {
        if (!verbosity || explicitMaxTokens !== undefined) return;
        const modelInfo = this.modelManager.getModel(model);
        if (!modelInfo || modelInfo.capabilities?.reasoning) return;

        const ratios = { low: 0.25, medium: 0.5, high: 0.75 } as const;
        const minimums = { low: 256, medium: 512, high: 1024 } as const;
        providerParams.max_tokens = Math.min(
            modelInfo.maxResponseTokens,
            Math.max(minimums[verbosity], Math.floor(modelInfo.maxResponseTokens * ratios[verbosity]))
        );
    }

    private supportsNativeJson(model: string): boolean {
        const text = this.modelManager.getModel(model)?.capabilities?.output?.text;
        return typeof text === 'object' && text.textOutputFormats?.includes('json') === true;
    }

    private hasFormatInstruction(messages: UniversalMessage[]): boolean {
        return messages.some(message =>
            message.metadata?.isFormatInstruction === true ||
            message.content.startsWith('Format instructions:')
        );
    }

    private createSchemaInstruction(
        schemaDefinition: JSONSchemaDefinition
    ): SiliconFlowMessage {
        const schema = SchemaValidator.getSchemaObject(schemaDefinition);
        const sanitized = SchemaSanitizer.sanitize(
            schema as Record<string, unknown>,
            {
                addHintsToDescriptions: true,
                forceAllRequired: false,
                forceNoAdditionalProps: false,
                normalizeDefs: true,
                stripMetaKeys: true,
                stripCompositionKeywords: false
            }
        );
        return {
            role: 'system',
            content: `Return only a JSON object that matches this JSON Schema:\n${JSON.stringify(sanitized)}`
        };
    }

    private isJsonMode(format: ResponseFormat | undefined): boolean {
        return format === 'json' ||
            (typeof format === 'object' && format.type === 'json_object');
    }

    private calculateCosts(
        input: number,
        cached: number,
        output: number,
        reasoning: number,
        modelInfo: ModelInfo | undefined
    ): Usage['costs'] {
        if (!modelInfo) {
            return {
                input: { total: 0, cached: 0 },
                output: { total: 0, reasoning: 0 },
                total: 0,
                unit: 'USD'
            };
        }

        const cachedPrice = modelInfo.inputCachedPricePerMillion;
        const billableRegularInput = cachedPrice === undefined ? input : Math.max(0, input - cached);
        const regularInputCost = billableRegularInput * modelInfo.inputPricePerMillion / 1_000_000;
        const cachedCost = cachedPrice === undefined ? 0 : cached * cachedPrice / 1_000_000;
        const inputCost = regularInputCost + cachedCost;
        const outputCost = output * modelInfo.outputPricePerMillion / 1_000_000;
        const reasoningCost = reasoning * modelInfo.outputPricePerMillion / 1_000_000;

        return {
            input: { total: inputCost, cached: cachedCost },
            output: { total: outputCost, reasoning: reasoningCost },
            total: inputCost + outputCost,
            unit: 'USD'
        };
    }

    private numberValue(value: unknown, fallback = 0): number {
        return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    }
}
