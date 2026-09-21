import fs from 'fs';
import path from 'path';
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
    RerankResponse,
    ImageSource,
    EvaluateParams,
    EvaluateResponse,
    EvaluateAnswers,
    EvaluateAnswer,
    EvaluateQuestion,
    EvaluateQuestions
} from '../../interfaces/UniversalInterfaces.ts';
import { FinishReason } from '../../interfaces/UniversalInterfaces.ts';
import { ModelManager } from '../../core/models/ModelManager.ts';
import { SchemaSanitizer } from '../../core/schema/SchemaSanitizer.ts';
import { SchemaValidator } from '../../core/schema/SchemaValidator.ts';
import type { ToolCall, ToolDefinition } from '../../types/tooling.ts';
import { logger } from '../../utils/logger.ts';
import { VercelValidationError } from './errors.ts';
import {
    createVercelReasoningState,
    getVercelReasoningContent,
    type VercelChatCompletion,
    type VercelContentPart,
    type VercelCreateParams,
    type VercelEvaluateRequest,
    type VercelEvaluateResponse,
    type VercelGatewayProviderOptions,
    type VercelMessage,
    type VercelRerankRequest,
    type VercelRerankResponse,
    type VercelTool,
    type VercelToolCall
} from './types.ts';

const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object';

export function parseFileReferences(content: string): Array<{ placeholder: string; path: string }> {
    const regex = /<file:(.*?)>/g;
    const references: Array<{ placeholder: string; path: string }> = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
        references.push({ placeholder: match[0], path: match[1] });
    }
    return references;
}

export class VercelConverter {
    constructor(private readonly modelManager: ModelManager) {}

    async convertToProviderParams(
        model: string,
        params: UniversalChatParams,
        options?: { stream?: boolean }
    ): Promise<VercelCreateParams> {
        const log = logger.createLogger({ prefix: 'VercelConverter.convertToProviderParams' });
        const providerParams: VercelCreateParams = {
            model,
            messages: await this.mapMessages(params.messages),
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

            const gatewayOptions = settings.providerOptions?.gateway;
            if (isRecord(gatewayOptions)) {
                providerParams.providerOptions = {
                    gateway: gatewayOptions as VercelGatewayProviderOptions
                };
            }
        }

        if (params.tools?.length) {
            providerParams.tools = params.tools.map(tool => this.mapTool(tool));
        }

        this.mapJsonMode(model, params, providerParams);

        if (options?.stream) {
            providerParams.stream_options = { include_usage: true };
        }

        log.debug('Provider params prepared:', providerParams);
        return providerParams;
    }

    convertFromProviderResponse(response: unknown): UniversalChatResponse {
        if (!isRecord(response) || !Array.isArray(response.choices) || response.choices.length === 0) {
            throw new VercelValidationError('Vercel AI Gateway returned a response without choices');
        }

        const completion = response as unknown as VercelChatCompletion;
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
                provider: 'vercel',
                usage: this.mapUsage(completion.usage, completion.model),
                providerState: reasoning
                    ? createVercelReasoningState(reasoning)
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

    private async mapMessages(messages: UniversalMessage[]): Promise<VercelMessage[]> {
        const mapped: VercelMessage[] = [];
        for (const message of messages) {
            mapped.push(await this.mapMessage(message));
        }
        return mapped;
    }

    private async mapMessage(message: UniversalMessage): Promise<VercelMessage> {
        const mapped: VercelMessage = {
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

        const reasoningContent = getVercelReasoningContent(
            message.metadata?.providerState
        );
        if (reasoningContent !== undefined && mapped.role === 'assistant') {
            mapped.reasoning_content = reasoningContent;
        }

        if (typeof message.content === 'string' && message.content.includes('<file:')) {
            mapped.content = await this.mapContentWithFiles(message.content);
        }

        return mapped;
    }

    private async mapContentWithFiles(content: string): Promise<string | VercelContentPart[]> {
        const fileReferences = parseFileReferences(content);
        if (fileReferences.length === 0) return content;

        const parts: VercelContentPart[] = [];
        let cursor = 0;
        for (const reference of fileReferences) {
            const index = content.indexOf(reference.placeholder, cursor);
            if (index > cursor) {
                const text = content.slice(cursor, index).trim();
                if (text) parts.push({ type: 'text', text });
            }
            parts.push({
                type: 'image_url',
                image_url: {
                    url: await this.resolveImageUrl(reference.path),
                    detail: 'auto'
                }
            });
            cursor = index + reference.placeholder.length;
        }
        const trailing = content.slice(cursor).trim();
        if (trailing) parts.push({ type: 'text', text: trailing });

        return parts.length === 1 && parts[0].type === 'image_url'
            ? parts
            : parts.length > 0 ? parts : content;
    }

    private async resolveImageUrl(filePath: string): Promise<string> {
        if (filePath.startsWith('data:') || filePath.startsWith('http://') || filePath.startsWith('https://')) {
            return filePath;
        }
        if (process.env.TEST_MODE === 'true') {
            return 'data:image/png;base64,TEST_MODE_PLACEHOLDER';
        }
        try {
            const fileContent = await fs.promises.readFile(filePath);
            const mimeType = this.mimeFromPath(filePath);
            return `data:${mimeType};base64,${fileContent.toString('base64')}`;
        } catch (error) {
            throw new VercelValidationError(
                `Failed to read image file: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    private mimeFromPath(filePath: string): string {
        const fileExt = path.extname(filePath).toLowerCase();
        if (['.jpg', '.jpeg'].includes(fileExt)) return 'image/jpeg';
        if (fileExt === '.png') return 'image/png';
        if (fileExt === '.gif') return 'image/gif';
        if (fileExt === '.webp') return 'image/webp';
        return 'application/octet-stream';
    }

    convertToProviderRerankParams(model: string, params: RerankParams): VercelRerankRequest {
        return {
            model,
            query: params.query,
            documents: params.documents,
            ...(params.topN !== undefined ? { top_n: params.topN } : {})
        };
    }

    convertFromProviderRerankResponse(
        responseValue: unknown,
        model: string
    ): RerankResponse {
        if (!isRecord(responseValue) || !Array.isArray(responseValue.results)) {
            throw new VercelValidationError('Vercel AI Gateway returned an invalid rerank response');
        }
        const response = responseValue as unknown as VercelRerankResponse;
        for (const result of response.results) {
            if (
                !isRecord(result) ||
                !Number.isInteger(result.index) ||
                typeof result.relevance_score !== 'number' ||
                !Number.isFinite(result.relevance_score)
            ) {
                throw new VercelValidationError('Vercel AI Gateway returned an invalid rerank result');
            }
        }

        const modelInfo = this.modelManager.getModel(model);
        const searchUnits = this.numberValue(response.meta?.billed_units?.search_units, 1);
        const inputTokens = this.numberValue(response.meta?.tokens?.input_tokens);
        const outputTokens = this.numberValue(response.meta?.tokens?.output_tokens);
        const pricing = modelInfo?.rerankPricing;
        let totalCost = 0;
        if (pricing?.unit === 'document') {
            totalCost = searchUnits * pricing.price / pricing.per;
        } else if (pricing?.unit === 'token') {
            totalCost = inputTokens * pricing.price / pricing.per;
        } else if (modelInfo) {
            totalCost = inputTokens * modelInfo.inputPricePerMillion / 1_000_000;
        }

        return {
            results: response.results.map(result => ({
                index: result.index,
                relevanceScore: result.relevance_score
            })),
            model,
            usage: {
                tokens: {
                    input: { total: inputTokens || searchUnits, cached: 0 },
                    output: { total: outputTokens, reasoning: 0 },
                    total: (inputTokens || searchUnits) + outputTokens
                },
                costs: {
                    input: { total: totalCost, cached: 0 },
                    output: { total: 0, reasoning: 0 },
                    total: totalCost,
                    unit: 'USD'
                },
                ...(searchUnits > 0 ? {
                    measurements: [{
                        name: 'searches',
                        value: searchUnits,
                        unit: 'search',
                        source: 'provider' as const
                    }]
                } : {})
            },
            metadata: {
                callId: typeof response.id === 'string' ? response.id : undefined,
                created: Date.now(),
                model,
                provider: 'vercel'
            }
        };
    }

    convertToProviderEvaluateParams(model: string, params: EvaluateParams): VercelEvaluateRequest {
        const request: VercelEvaluateRequest = {
            model,
            state: params.state,
            questions: this.mapEvaluateQuestionsForProvider(params.questions)
        };
        const gatewayOptions = params.providerOptions?.gateway;
        if (isRecord(gatewayOptions)) {
            request.providerOptions = {
                gateway: gatewayOptions as VercelGatewayProviderOptions
            };
        } else if (params.providerOptions) {
            request.providerOptions = params.providerOptions as VercelEvaluateRequest['providerOptions'];
        }
        return request;
    }

    convertFromProviderEvaluateResponse(
        responseValue: unknown,
        model: string,
        questions: EvaluateQuestions
    ): EvaluateResponse {
        if (!isRecord(responseValue) || !isRecord(responseValue.answers)) {
            throw new VercelValidationError('Vercel AI Gateway returned an invalid evaluate response');
        }
        const response = responseValue as unknown as VercelEvaluateResponse;
        const answers = this.mapEvaluateAnswersFromProvider(response.answers ?? {}, questions);
        const usageRecord = isRecord(response.usage) ? response.usage : undefined;
        const inputTokens = this.numberValue(
            usageRecord?.inputTokens ?? usageRecord?.input_tokens
        );
        const outputTokens = this.numberValue(
            usageRecord?.outputTokens ?? usageRecord?.output_tokens
        );
        const modelInfo = this.modelManager.getModel(model);
        const inputCost = modelInfo
            ? inputTokens * modelInfo.inputPricePerMillion / 1_000_000
            : 0;
        const outputCost = modelInfo
            ? outputTokens * modelInfo.outputPricePerMillion / 1_000_000
            : 0;

        return {
            answers,
            model: typeof response.model === 'string' ? response.model : model,
            usage: {
                tokens: {
                    input: { total: inputTokens, cached: 0 },
                    output: { total: outputTokens, reasoning: 0 },
                    total: inputTokens + outputTokens
                },
                costs: {
                    input: { total: inputCost, cached: 0 },
                    output: { total: outputCost, reasoning: 0 },
                    total: inputCost + outputCost,
                    unit: 'USD'
                }
            },
            metadata: {
                created: Date.now(),
                model: typeof response.model === 'string' ? response.model : model,
                provider: 'vercel',
                ...(response.providerMetadata || response.provider_metadata
                    ? {
                        providerState: {
                            gateway: response.providerMetadata ?? response.provider_metadata
                        }
                    }
                    : {})
            }
        };
    }

    private mapEvaluateQuestionsForProvider(
        questions: EvaluateQuestions
    ): Record<string, unknown> {
        const mapped: Record<string, unknown> = {};
        for (const [key, question] of Object.entries(questions)) {
            mapped[key] = this.mapEvaluateQuestionForProvider(question);
        }
        return mapped;
    }

    private mapEvaluateQuestionForProvider(question: EvaluateQuestion): Record<string, unknown> {
        if (question.type === 'boolean') {
            return {
                type: 'boolean',
                instructions: question.instructions,
                ...(question.criteria ? { criteria: question.criteria } : {})
            };
        }
        if (question.type === 'choice') {
            return {
                type: 'choice',
                instructions: question.instructions,
                criteria: question.criteria
            };
        }
        return {
            type: 'score',
            instructions: question.instructions,
            criteria: [...question.criteria]
        };
    }

    private mapEvaluateAnswersFromProvider(
        answersValue: Record<string, unknown>,
        questions: EvaluateQuestions
    ): EvaluateAnswers {
        const answers: EvaluateAnswers = {};
        for (const key of Object.keys(questions)) {
            const raw = answersValue[key];
            if (!isRecord(raw)) {
                throw new VercelValidationError(`Vercel evaluate response missing answer for '${key}'`);
            }
            answers[key] = this.mapEvaluateAnswerFromProvider(key, questions[key], raw);
        }
        return answers;
    }

    private mapEvaluateAnswerFromProvider(
        key: string,
        question: EvaluateQuestion,
        raw: Record<string, unknown>
    ): EvaluateAnswer {
        const type = typeof raw.type === 'string' ? raw.type : question.type;

        // TypeSafe noul alias → universal boolean
        if (type === 'noul' || (type === 'boolean' && question.type === 'boolean')) {
            const probability = typeof raw.probability === 'number'
                ? raw.probability
                : typeof raw.noul === 'number'
                    ? raw.noul
                    : undefined;
            if (typeof probability !== 'number' || !Number.isFinite(probability)) {
                throw new VercelValidationError(`Invalid boolean/noul answer for '${key}'`);
            }
            return { type: 'boolean', probability };
        }

        if (type === 'choice' && question.type === 'choice') {
            if (typeof raw.choice !== 'string') {
                throw new VercelValidationError(`Invalid choice answer for '${key}'`);
            }
            const probabilities = isRecord(raw.probabilities)
                ? Object.fromEntries(
                    Object.entries(raw.probabilities).filter((entry): entry is [string, number] =>
                        typeof entry[1] === 'number'
                    )
                )
                : undefined;
            if (!probabilities) {
                throw new VercelValidationError(`Choice answer '${key}' missing probabilities`);
            }
            return {
                type: 'choice',
                choice: raw.choice,
                probabilities,
                ...(typeof raw.confidence === 'number' ? { confidence: raw.confidence } : {})
            };
        }

        if (type === 'score' && question.type === 'score') {
            if (typeof raw.score !== 'number' || !Number.isFinite(raw.score)) {
                throw new VercelValidationError(`Invalid score answer for '${key}'`);
            }
            const probabilities = isRecord(raw.probabilities)
                ? Object.fromEntries(
                    Object.entries(raw.probabilities).filter((entry): entry is [string, number] =>
                        typeof entry[1] === 'number'
                    )
                )
                : undefined;
            if (!probabilities) {
                throw new VercelValidationError(`Score answer '${key}' missing probabilities`);
            }
            const legend = isRecord(raw.legend)
                ? Object.fromEntries(
                    Object.entries(raw.legend).filter((entry): entry is [string, string] =>
                        typeof entry[1] === 'string'
                    )
                )
                : undefined;
            return {
                type: 'score',
                score: raw.score,
                probabilities,
                ...(legend ? { legend } : {}),
                ...(typeof raw.confidence === 'number' ? { confidence: raw.confidence } : {})
            };
        }

        throw new VercelValidationError(`Unsupported evaluate answer type for '${key}': ${type}`);
    }

    parseSize(size: string | undefined): { width: number; height: number } {
        if (!size || !size.includes('x')) return { width: 1024, height: 1024 };
        const [widthText, heightText] = size.split('x');
        const width = Number(widthText);
        const height = Number(heightText);
        return {
            width: Number.isFinite(width) && width > 0 ? width : 1024,
            height: Number.isFinite(height) && height > 0 ? height : 1024
        };
    }

    imageSourceToFilePathOrUrl(source: ImageSource): string {
        if (source.type === 'url') return source.url;
        if (source.type === 'file_path') return source.path;
        if (source.type === 'base64') {
            return `data:${source.mime || 'image/png'};base64,${source.data}`;
        }
        throw new VercelValidationError('Unsupported image source type');
    }

    private mapRole(role: UniversalMessage['role']): VercelMessage['role'] {
        if (role === 'developer') return 'system';
        if (role === 'function') return 'tool';
        return role;
    }

    private mapUniversalToolCall(
        toolCall: NonNullable<UniversalMessage['toolCalls']>[number]
    ): VercelToolCall {
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
        toolCalls: VercelToolCall[] | undefined
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

    private mapTool(tool: ToolDefinition): VercelTool {
        if (!tool.name || !tool.parameters) {
            throw new VercelValidationError(
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
        providerParams: VercelCreateParams
    ): void {
        if (!effort || !this.modelManager.getModel(model)?.capabilities?.reasoning) return;
        // Project accepts "minimal"; AI Gateway Chat Completions commonly use low/medium/high.
        providerParams.reasoning_effort = effort === 'minimal' ? 'low' : effort;
    }

    private mapVerbosity(
        model: string,
        verbosity: 'low' | 'medium' | 'high' | undefined,
        explicitMaxTokens: number | undefined,
        providerParams: VercelCreateParams
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

    private mapJsonMode(
        model: string,
        params: UniversalChatParams,
        providerParams: VercelCreateParams
    ): void {
        const wantsJson = Boolean(params.jsonSchema) || this.isJsonMode(params.responseFormat);
        if (!wantsJson) return;

        const modelInfo = this.modelManager.getModel(model);
        const textCaps = modelInfo?.capabilities?.output?.text;
        const structuredOutputs = typeof textCaps === 'object' && textCaps.structuredOutputs === true;
        const supportsJson = typeof textCaps === 'object'
            && textCaps.textOutputFormats?.includes('json') === true;

        if (params.jsonSchema && structuredOutputs) {
            const schema = SchemaValidator.getSchemaObject(params.jsonSchema.schema);
            const sanitized = SchemaSanitizer.sanitize(
                schema as Record<string, unknown>,
                {
                    addHintsToDescriptions: true,
                    forceAllRequired: true,
                    forceNoAdditionalProps: true,
                    normalizeDefs: true,
                    stripMetaKeys: true,
                    stripCompositionKeywords: false
                }
            );
            providerParams.response_format = {
                type: 'json_schema',
                json_schema: {
                    name: params.jsonSchema.name || 'response',
                    schema: sanitized,
                    strict: true
                }
            };
            return;
        }

        if (supportsJson) {
            providerParams.response_format = { type: 'json_object' };
        }

        if (params.jsonSchema && !this.hasFormatInstruction(params.messages)) {
            providerParams.messages = [
                this.createSchemaInstruction(params.jsonSchema.schema),
                ...providerParams.messages
            ];
        }
    }

    private hasFormatInstruction(messages: UniversalMessage[]): boolean {
        return messages.some(message =>
            message.metadata?.isFormatInstruction === true ||
            message.content.startsWith('Format instructions:')
        );
    }

    private createSchemaInstruction(
        schemaDefinition: JSONSchemaDefinition
    ): VercelMessage {
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
